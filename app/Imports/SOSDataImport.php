<?php

namespace App\Imports;

use App\Models\SosData;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\SkipsEmptyRows;
use Maatwebsite\Excel\Concerns\ToCollection;
use Maatwebsite\Excel\Concerns\WithChunkReading;
use Maatwebsite\Excel\Concerns\WithHeadingRow;
use PhpOffice\PhpSpreadsheet\Shared\Date;

// [PERUBAHAN] Ganti OnEachRow dengan ToCollection
class SOSDataImport implements ToCollection, WithHeadingRow, WithChunkReading, SkipsEmptyRows
{
    // Kita tidak lagi memerlukan tracking progress manual karena akan lebih cepat
    // Namun, jika Anda masih ingin, logika lama bisa ditambahkan kembali dengan sedikit penyesuaian.

    public function chunkSize(): int
    {
        // Proses 1000 baris dalam satu batch/chunk
        return 1000;
    }

    /**
     * [PERUBAHAN] Method ini akan menerima satu "chunk" data sebagai Collection,
     * bukan satu baris per satu.
     */
    public function collection(Collection $rows)
    {
        $dataToUpsert = [];

        // Fungsi helper untuk parsing tanggal secara aman
        $parseDate = function ($date) {
            if (empty($date)) {
                return null;
            }
            try {
                return is_numeric($date)
                    ? Carbon::instance(Date::excelToDateTimeObject($date))
                    : Carbon::parse($date);
            } catch (\Exception $e) {
                return null;
            }
        };

        foreach ($rows as $row) {
            // ===================================================================
            // [FILTER] Logika filter Anda tetap sama
            // ===================================================================
            $billRegion = strtoupper(trim($row['bill_region'] ?? ''));
            if (!in_array($billRegion, ['BB REGIONAL 3', 'B2B REGIONAL 3'])) {
                continue; // Lanjut ke baris berikutnya jika tidak cocok
            }

            $kategori = strtoupper(trim($row['kategori'] ?? ''));
            if ($kategori === 'BILLING COMPLETED') {
                continue;
            }

            $productName = trim($row['li_product_name'] ?? '');
            $allowedProducts = [
                'ASTINet', 'MPLS VPN IP Node', 'Telkom Metro Node', 'Wifi VAS', 'Wifi Managed Service',
                'SIP Trunking', 'IP Transit', 'Wifi Managed Service Lite', 'CNDC (NeuCentrIX)', 'Wifi Basic',
                'VPN Lite', 'Wifi_Bisnis_Discontinue', 'VPN Instan', 'DDoS', 'Protection', 'VPN Backhaul',
                'IP Transit NeuCentrIX', 'VPN FR', 'NeuCentrIX Interconnect Node',
            ];
            if (!in_array($productName, $allowedProducts)) {
                continue;
            }

            // [PERUBAHAN] Kumpulkan data ke dalam array, jangan langsung ke DB
            $dataToUpsert[] = [
                'nipnas' => $row['nipnas'] ?? null,
                'standard_name' => $row['standard_name'] ?? null,
                'order_id' => $row['order_id'] ?? null,
                'order_subtype' => $row['order_subtype'] ?? null,
                'order_description' => $row['order_description'] ?? null,
                'segmen' => $row['segmen'] ?? null,
                'sub_segmen' => $row['sub_segmen'] ?? null,
                'cust_city' => $row['custcity'] ?? null,
                'cust_witel' => $row['cust_witel'] ?? null,
                'serv_city' => $row['servcity'] ?? null,
                'service_witel' => $row['service_witel'] ?? null,
                'bill_witel' => $row['bill_witel'] ?? null,
                'li_product_name' => $row['li_product_name'] ?? null,
                'li_billdate' => $parseDate($row['li_billdate'] ?? null),
                'li_milestone' => $row['li_milestone'] ?? null,
                'kategori' => $row['kategori'] ?? null,
                'li_status' => $row['li_status'] ?? null,
                'li_status_date' => $parseDate($row['li_status_date'] ?? null),
                'is_termin' => $row['is_termin'] ?? null,
                'biaya_pasang' => is_numeric($row['biaya_pasang']) ? $row['biaya_pasang'] : 0,
                'hrg_bulanan' => is_numeric($row['hrg_bulanan']) ? $row['hrg_bulanan'] : 0,
                'revenue' => is_numeric($row['revenue']) ? $row['revenue'] : 0,
                'order_created_date' => $parseDate($row['order_created_date'] ?? null),
                'agree_type' => $row['agree_type'] ?? null,
                'agree_start_date' => $parseDate($row['agree_start_date'] ?? null),
                'agree_end_date' => $parseDate($row['agree_end_date'] ?? null),
                'lama_kontrak_hari' => is_numeric($row['lama_kontrak_hari']) ? $row['lama_kontrak_hari'] : 0,
                'amortisasi' => $row['amortisasi'] ?? null,
                'action_cd' => $row['action_cd'] ?? null,
                'kategori_umur' => $row['kategori_umur'] ?? null,
                'umur_order' => is_numeric($row['umur_order']) ? $row['umur_order'] : 0,
                // [PENTING] Tambahkan created_at dan updated_at agar Eloquent tidak error
                'created_at' => now(),
                'updated_at' => now(),
            ];
        }

        if (!empty($dataToUpsert)) {
            // [PERUBAHAN UTAMA] Jalankan satu query upsert untuk semua data dalam chunk
            SosData::upsert(
                $dataToUpsert,
                ['order_id'], // Kolom unik untuk dicocokkan
                [ // Kolom-kolom yang akan di-update jika data sudah ada
                    'nipnas', 'standard_name', 'order_subtype', 'order_description', 'segmen', 'sub_segmen',
                    'cust_city', 'cust_witel', 'serv_city', 'service_witel', 'bill_witel', 'li_product_name',
                    'li_billdate', 'li_milestone', 'kategori', 'li_status', 'li_status_date', 'is_termin',
                    'biaya_pasang', 'hrg_bulanan', 'revenue', 'order_created_date', 'agree_type', 'agree_start_date',
                    'agree_end_date', 'lama_kontrak_hari', 'amortisasi', 'action_cd', 'kategori_umur', 'umur_order', 'updated_at',
                ]
            );
        }
    }
}
