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

        $temporaryTableName = 'temp_sos_import_'.Str::random(10);
        Log::info("Membuat tabel sementara: {$temporaryTableName}");

        $filePath = Storage::disk('local')->path($this->path);
        $filePath = str_replace('\\', '/', $filePath);

        try {
            // [FIX] Mengembalikan definisi kolom yang lengkap dan benar
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
                    INDEX `idx_order_id` (`order_id`)
                )
            ");

            Log::info("Memulai LOAD DATA INFILE dari: {$filePath}");

            $query = "
                LOAD DATA LOCAL INFILE '{$filePath}'
                INTO TABLE `{$temporaryTableName}`
                CHARACTER SET utf8mb4
                FIELDS TERMINATED BY ','
                ENCLOSED BY '\"'
                LINES TERMINATED BY '\\n'
                IGNORE 1 ROWS
            ";
            DB::connection()->getPdo()->exec($query);

            $tempRowCount = DB::table($temporaryTableName)->count();
            Log::info("Data berhasil dimuat ke tabel sementara. Jumlah baris: {$tempRowCount}");

            if ($tempRowCount === 0) {
                Log::warning('Tidak ada data yang dimuat ke tabel sementara. Proses dihentikan.');

                return;
            }

            Log::info('Memulai proses INSERT INTO ... SELECT ...');

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
                    STR_TO_DATE(NULLIF(li_billdate, ''), '%Y-%m-%d'),
                    li_milestone, kategori, li_status,
                    STR_TO_DATE(NULLIF(li_status_date, ''), '%Y-%m-%d'), is_termin,
                    COALESCE(NULLIF(biaya_pasang, ''), 0),
                    COALESCE(NULLIF(hrg_bulanan, ''), 0),
                    COALESCE(NULLIF(revenue, ''), 0),
                    STR_TO_DATE(NULLIF(order_created_date, ''), '%Y-%m-%d %H:%i:%s'),
                    agree_type,
                    STR_TO_DATE(NULLIF(agree_start_date, ''), '%Y-%m-%d'),
                    STR_TO_DATE(NULLIF(agree_end_date, ''), '%Y-%m-%d'),
                    COALESCE(NULLIF(lama_kontrak_hari, ''), 0),
                    amortisasi, action_cd, kategori_umur,
                    COALESCE(NULLIF(umur_order, ''), 0),
                    NOW(), NOW()
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
                    nipnas = VALUES(nipnas), standard_name = VALUES(standard_name), order_subtype = VALUES(order_subtype),
                    order_description = VALUES(order_description), segmen = VALUES(segmen), sub_segmen = VALUES(sub_segmen),
                    cust_city = VALUES(cust_city), cust_witel = VALUES(cust_witel), serv_city = VALUES(serv_city),
                    service_witel = VALUES(service_witel), bill_witel = VALUES(bill_witel), li_product_name = VALUES(li_product_name),
                    li_billdate = VALUES(li_billdate), li_milestone = VALUES(li_milestone), kategori = VALUES(kategori),
                    li_status = VALUES(li_status), li_status_date = VALUES(li_status_date), is_termin = VALUES(is_termin),
                    biaya_pasang = VALUES(biaya_pasang), hrg_bulanan = VALUES(hrg_bulanan), revenue = VALUES(revenue),
                    order_created_date = VALUES(order_created_date), agree_type = VALUES(agree_type), agree_start_date = VALUES(agree_start_date),
                    agree_end_date = VALUES(agree_end_date), lama_kontrak_hari = VALUES(lama_kontrak_hari), amortisasi = VALUES(amortisasi),
                    action_cd = VALUES(action_cd), kategori_umur = VALUES(kategori_umur), umur_order = VALUES(umur_order),
                    updated_at = NOW()
            ");

            Log::info("Proses INSERT/UPDATE selesai. Terdapat {$affectedRows} baris yang terpengaruh.");
        } catch (\Throwable $e) {
            Log::error('Error selama proses import: '.$e->getMessage());
            throw $e;
        } finally {
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
