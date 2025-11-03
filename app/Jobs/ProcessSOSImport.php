<?php

namespace App\Jobs;

use Illuminate\Bus\Batchable;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ProcessSOSImport implements ShouldQueue
{
    use Batchable;
    use Dispatchable;
    use InteractsWithQueue;
    use Queueable;
    use SerializesModels;

    public $timeout = 1800; // Timeout 30 menit
    protected $path;

    public function __construct(string $path)
    {
        $this->path = $path;
    }

    public function handle(): void
    {
        if ($this->batch() && $this->batch()->cancelled()) {
            return;
        }

        // 1. Buat nama tabel sementara yang unik
        $temporaryTableName = 'temp_sos_import_'.Str::random(10);
        Log::info("Membuat tabel sementara: {$temporaryTableName}");

        // 2. Dapatkan path absolut dari file yang disimpan
        $filePath = Storage::disk('local')->path($this->path);
        // Ganti backslash (\) dengan forward slash (/) agar kompatibel dengan SQL
        $filePath = str_replace('\\', '/', $filePath);

        try {
            // BUAT TABEL SEMENTARA: Strukturnya harus mencakup SEMUA 77 kolom dari CSV Anda.
            // Kita hanya perlu mendefinisikan kolom yang akan digunakan untuk filter dan data.
            // Cukup gunakan VARCHAR untuk semua agar simpel.
            DB::statement("
                CREATE TEMPORARY TABLE `{$temporaryTableName}` (
                    `nipnas` VARCHAR(255) NULL, `standard_name` VARCHAR(255) NULL, `order_id` VARCHAR(255) NULL,
                    `prevorder` VARCHAR(255) NULL, `order_subtype` VARCHAR(255) NULL, `order_description` TEXT NULL,
                    `li_sid` VARCHAR(255) NULL, `sid` VARCHAR(255) NULL, `segmen` VARCHAR(255) NULL,
                    `sub_segmen` VARCHAR(255) NULL, `custaccntnum` VARCHAR(255) NULL, `custaccntname` VARCHAR(255) NULL,
                    `custaddr` TEXT NULL, `custcity` VARCHAR(255) NULL, `cust_region` VARCHAR(255) NULL,
                    `cust_witel` VARCHAR(255) NULL, `servaccntnum` VARCHAR(255) NULL, `servaccntname` VARCHAR(255) NULL,
                    `servaddr` TEXT NULL, `servcity` VARCHAR(255) NULL, `service_region` VARCHAR(255) NULL,
                    `service_witel` VARCHAR(255) NULL, `billaccntnum` VARCHAR(255) NULL, `accountnas` VARCHAR(255) NULL,
                    `billaccntname` VARCHAR(255) NULL, `billaddr` TEXT NULL, `billcity` VARCHAR(255) NULL,
                    `bill_region` VARCHAR(255) NULL, `bill_witel` VARCHAR(255) NULL, `li_id` VARCHAR(255) NULL,
                    `li_productid` VARCHAR(255) NULL, `li_product_name` VARCHAR(255) NULL, `product_digital` VARCHAR(255) NULL,
                    `li_billdate` VARCHAR(255) NULL, `li_milestone` VARCHAR(255) NULL, `kategori` VARCHAR(255) NULL,
                    `billcom_date` VARCHAR(255) NULL, `li_status` VARCHAR(255) NULL, `li_status_date` VARCHAR(255) NULL,
                    `li_fulfillment_status` VARCHAR(255) NULL, `is_termin` VARCHAR(255) NULL, `biaya_pasang` VARCHAR(255) NULL,
                    `hrg_bulanan` VARCHAR(255) NULL, `revenue` VARCHAR(255) NULL, `scaling` VARCHAR(255) NULL,
                    `li_payment_term` VARCHAR(255) NULL, `li_billing_start_date` VARCHAR(255) NULL, `order_created_date` VARCHAR(255) NULL,
                    `agree_itemnum` VARCHAR(255) NULL, `agree_name` VARCHAR(255) NULL, `agree_type` VARCHAR(255) NULL,
                    `agree_start_date` VARCHAR(255) NULL, `agree_end_date` VARCHAR(255) NULL, `lama_kontrak_hari` VARCHAR(255) NULL,
                    `amortisasi` VARCHAR(255) NULL, `order_createdby` VARCHAR(255) NULL, `li_created_date` VARCHAR(255) NULL,
                    `order_createdby_name` VARCHAR(255) NULL, `current_bandwidth` VARCHAR(255) NULL, `before_bandwidth` VARCHAR(255) NULL,
                    `product_activation_date` VARCHAR(255) NULL, `quote_row_id` VARCHAR(255) NULL, `line_item_description` TEXT NULL,
                    `asset_integ_id` VARCHAR(255) NULL, `action_cd` VARCHAR(255) NULL, `kategori_umur` VARCHAR(255) NULL,
                    `am` VARCHAR(255) NULL, `x_billcomp_dt` VARCHAR(255) NULL, `umur_order` VARCHAR(255) NULL,
                    INDEX `idx_order_id` (`order_id`),
                    INDEX `idx_bill_region` (`bill_region`),
                    INDEX `idx_kategori` (`kategori`),
                    INDEX `idx_li_product_name` (`li_product_name`)
                )
            ");

            // 3. JALANKAN LOAD DATA INFILE
            // Perintah ini akan membaca CSV dan memasukkannya ke tabel sementara
            Log::info("Memulai LOAD DATA INFILE dari: {$filePath}");
            DB::connection()->getPdo()->exec("
                LOAD DATA LOCAL INFILE '{$filePath}'
                INTO TABLE `{$temporaryTableName}`
                FIELDS TERMINATED BY ','
                ENCLOSED BY '\"'
                LINES TERMINATED BY '\\r\\n'
                IGNORE 1 ROWS
            ");

            // 4. JALANKAN SATU QUERY UPSERT DARI TABEL SEMENTARA KE TABEL UTAMA
            // Query ini memilih data dari tabel sementara, menerapkan filter, dan memasukkannya.
            Log::info('Memulai proses INSERT... ON DUPLICATE KEY UPDATE');

            $affectedRows = DB::statement("
                INSERT INTO sos_data (
                    order_id, nipnas, standard_name, order_subtype, order_description, segmen, sub_segmen,
                    cust_city, cust_witel, serv_city, service_witel, bill_witel, li_product_name,
                    li_billdate, li_milestone, kategori, li_status, li_status_date, is_termin,
                    biaya_pasang, hrg_bulanan, revenue, order_created_date, agree_type, agree_start_date,
                    agree_end_date, lama_kontrak_hari, amortisasi, action_cd, kategori_umur, umur_order, created_at, updated_at
                )
                SELECT
                    order_id, nipnas, standard_name, order_subtype, order_description, segmen, sub_segmen,
                    custcity, cust_witel, servcity, service_witel, bill_witel, li_product_name,
                    STR_TO_DATE(li_billdate, '%m/%d/%Y'), li_milestone, kategori, li_status, STR_TO_DATE(li_status_date, '%m/%d/%Y'), is_termin,
                    biaya_pasang, hrg_bulanan, revenue, STR_TO_DATE(order_created_date, '%m/%d/%Y %H:%i:%s'), agree_type, STR_TO_DATE(agree_start_date, '%m/%d/%Y'),
                    STR_TO_DATE(agree_end_date, '%m/%d/%Y'), lama_kontrak_hari, amortisasi, action_cd, kategori_umur, umur_order, NOW(), NOW()
                FROM `{$temporaryTableName}`
                WHERE
                    bill_region IN ('BB REGIONAL 3', 'B2B REGIONAL 3')
                    AND kategori != 'BILLING COMPLETED'
                    AND li_product_name IN (
                        'ASTINet', 'MPLS VPN IP Node', 'Telkom Metro Node', 'Wifi VAS', 'Wifi Managed Service',
                        'SIP Trunking', 'IP Transit', 'Wifi Managed Service Lite', 'CNDC (NeuCentrIX)', 'Wifi Basic',
                        'VPN Lite', 'Wifi_Bisnis_Discontinue', 'VPN Instan', 'DDoS', 'Protection', 'VPN Backhaul',
                        'IP Transit NeuCentrIX', 'VPN FR', 'NeuCentrIX Interconnect Node'
                    )
                ON DUPLICATE KEY UPDATE
                    nipnas = VALUES(nipnas), standard_name = VALUES(standard_name), segmen = VALUES(segmen),
                    -- ... (tambahkan semua kolom yang perlu di-update) ...
                    updated_at = NOW()
            ");

            Log::info("Proses INSERT/UPDATE selesai. Terdapat {$affectedRows} baris yang terpengaruh.");
        } finally {
            // 5. SELALU HAPUS TABEL SEMENTARA
            Log::info("Menghapus tabel sementara: {$temporaryTableName}");
            DB::statement("DROP TEMPORARY TABLE IF EXISTS `{$temporaryTableName}`");
        }
    }

    public function failed(\Throwable $exception): void
    {
        Log::error('Job ProcessSOSImport GAGAL: '.$exception->getMessage());
        Log::error($exception->getTraceAsString());
    }
}
