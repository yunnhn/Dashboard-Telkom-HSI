<?php

namespace App\Jobs;

use App\Models\SosDataRaw;
use Illuminate\Bus\Batchable;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Carbon\Carbon;
use PhpOffice\PhpSpreadsheet\Shared\Date as ExcelDate;

class ProcessSOSImport implements ShouldQueue
{
    use Batchable;
    use Dispatchable;
    use InteractsWithQueue;
    use Queueable;
    use SerializesModels;

    public int $timeout = 7200; // 2 Jam
    public $path;

    private static $allowedProducts = [
        'ASTINet',
        'MPLS VPN IP Node',
        'Telkom Metro Node',
        'Wifi VAS',
        'Wifi Managed Service',
        'SIP Trunking',
        'IP Transit',
        'Wifi Managed Service Lite',
        'CNDC (NeuCentrIX)',
        'Wifi Basic',
        'VPN Lite',
        'Wifi_Bisnis_Discontinue',
        'VPN Instan',
        'DDoS Protection',
        'VPN Backhaul',
        'IP Transit NeuCentrIX',
        'VPN FR',
        'NeuCentrIX Interconnect Node',
    ];

    private static array $dateColumns = [
    'li_status_date',
    'li_billing_start_date',
    'order_created_date',
    'agree_start_date',
    'agree_end_date',
    'li_created_date',

    // Opsional (kalau ada di header Anda)
    'li_billdate',
    'billcom_date',
    'product_activation_date',
];

    private function normalizeExcelDateSmart($value): ?string
{
        if ($value === null) return null;

        $raw = trim((string) $value);

        if ($raw === '' || $raw === '-' || strtoupper($raw) === '#N/A') {
        return null;
        }

    // 1) Buang semua titik & koma, meniru Python Anda
        $clean = preg_replace('/[.,]/', '', $raw);

    // 2) Jika numerik → smart scale + excel date
        if (is_numeric($clean)) {
            $num = (float) $clean;

        // Smart scale: angka excel date normal itu 36k–55k; jika "jutaan" → bagi 10000
            if ($num > 300000) {
                $num = $num / 10000;
                }

        // Batas aman excel date
            if ($num > 0 && $num < 100000) {
                try {
                    return ExcelDate::excelToDateTimeObject($num)->format('Y-m-d H:i:s');
                } catch (\Throwable $e) {
                // lanjut coba parse biasa
                }
            }
        }

    // 3) Jika bukan excel numeric, coba parse string tanggal
        try {
            return Carbon::parse($raw)->format('Y-m-d H:i:s');
        } catch (\Throwable $e) {
            return null;
        }
    }


    public function __construct($path)
    {
        $this->path = $path;
    }

    public function handle(): void
    {
        if ($this->batch() && $this->batch()->cancelled()) {
            return;
        }

        $currentBatchId = $this->batch()->id;
        Cache::put('import_progress_'.$currentBatchId, 5, now()->addHour());
        $originalFilePath = Storage::disk('local')->path($this->path);
        $filePathToImport = $originalFilePath;
        $tempCsvPath = null;
        $isZip = false;

        try {
            $fileExtension = strtolower(pathinfo($originalFilePath, PATHINFO_EXTENSION));

            if ($fileExtension === 'zip') {
                $isZip = true;
                Log::info("Batch [{$currentBatchId}]: File ZIP terdeteksi. Mengekstrak...");
                $zip = new \ZipArchive();
                if ($zip->open($originalFilePath) !== true) {
                    throw new \Exception('Gagal membuka file ZIP.');
                }
                $firstFileName = $zip->getNameIndex(0);
                if (!$firstFileName) {
                    $zip->close();
                    throw new \Exception('File ZIP kosong.');
                }

                $tempCsvDirectory = sys_get_temp_dir();
                $tempCsvPath = $tempCsvDirectory.DIRECTORY_SEPARATOR.'unzipped_'.$currentBatchId.'.csv';

                if (!$zip->extractTo($tempCsvDirectory, $firstFileName)) {
                    $zip->close();
                    throw new \Exception('Gagal mengekstrak file dari ZIP.');
                }
                $zip->close();

                $extractedOriginalPath = $tempCsvDirectory.DIRECTORY_SEPARATOR.$firstFileName;

                if (file_exists($tempCsvPath)) {
                    @unlink($tempCsvPath);
                }
                if (!@rename($extractedOriginalPath, $tempCsvPath)) {
                    throw new \Exception("Gagal me-rename file hasil ekstrak ke {$tempCsvPath}");
                }

                $filePathToImport = $tempCsvPath;
                Cache::put('import_progress_'.$currentBatchId, 10, now()->addHour());
                Log::info("Batch [{$currentBatchId}]: Ekstrak ZIP selesai. File CSV baru: ".$filePathToImport);
            }

            Log::info("Batch [{$currentBatchId}]: Memulai Manual Parsing & Filtering ke sos_data_raw...");
            Cache::put('import_progress_'.$currentBatchId, 15, now()->addHour());

            $fileHandle = fopen($filePathToImport, 'r');
            if (!$fileHandle) {
                throw new \Exception("Gagal membuka file CSV: {$filePathToImport}");
            }

            $headerLine = fgets($fileHandle);
            $headerLine = trim($headerLine, "\xEF\xBB\xBF");
            $header = str_getcsv($headerLine, ',');

            if (!$header) {
                fclose($fileHandle);
                throw new \Exception('Gagal membaca header dari file CSV.');
            }

            $header = array_map('trim', $header);
            $dbColumns = array_map('strtolower', $header);

            $billRegionIdx = array_search('BILL_REGION', $header);
            $kategoriIdx = array_search('KATEGORI', $header);
            $productIdx = array_search('LI_PRODUCT_NAME', $header);

            if ($billRegionIdx === false || $kategoriIdx === false || $productIdx === false) {
                fclose($fileHandle);
                Log::error('Header CSV tidak lengkap. Ditemukan: '.implode(', ', $header));
                throw new \Exception("Header CSV tidak lengkap. Pastikan 'BILL_REGION', 'KATEGORI', dan 'LI_PRODUCT_NAME' ada.");
            }

            $dataToInsert = [];
            $rowCount = 0;
            $passedCount = 0;
            $now = now()->toDateTimeString();

            $totalFileSize = filesize($filePathToImport);

            while (($row = fgetcsv($fileHandle, 0, ',')) !== false) {
                ++$rowCount;

                foreach ($row as $key => $value) {
                    if (is_string($value)) {
                        $row[$key] = mb_convert_encoding($value, 'UTF-8', 'UTF-8');
                    }
                }

                if (count($row) !== count($header)) {
                    Log::warning("Batch [{$currentBatchId}]: Melewati baris {$rowCount}. Jumlah kolom tidak cocok. Header: ".count($header).', Baris: '.count($row));
                    continue;
                }

                $billRegion = strtoupper(trim($row[$billRegionIdx] ?? ''));
                $kategori = strtoupper(trim($row[$kategoriIdx] ?? ''));
                $productName = trim($row[$productIdx] ?? '');

                $isRegionOK = in_array($billRegion, ['BB REGIONAL 3', 'B2B REGIONAL 3']);
                $isKategoriOK = $kategori !== 'BILLING COMPLETED';
                $isProductOK = in_array($productName, self::$allowedProducts);

                if ($isRegionOK && $isKategoriOK && $isProductOK) {
                    ++$passedCount;

                    // Gabungkan Header (Key) dengan Row (Value)
                    $insertRow = array_combine($dbColumns, $row);

                    // ============================================================
                    // [FIX] SANITASI KOLOM KOSONG (GHOST COLUMNS)
                    // ============================================================
                    // Buang kolom yang key-nya kosong string ("") atau null.
                    // Ini mengatasi error SQLSTATE[42S22]: Unknown column ''
                    if (isset($insertRow[''])) {
                        unset($insertRow['']);
                    }
                    unset($insertRow[null]); // Jaga-jaga
                    unset($insertRow['progress']); // Bersihkan kolom progress jika ada
                    // ============================================================

                    $insertRow['batch_id'] = $currentBatchId;
                    $insertRow['created_at'] = $now;
                    $insertRow['updated_at'] = $now;

                    foreach ($insertRow as $key => $value) {
                        if ($value === '') {
                            $insertRow[$key] = null;
                        }
                    }

                    $dataToInsert[] = $insertRow;
                }

                if ($rowCount % 5000 === 0) {
                    $percentReadFile = ($totalFileSize > 0) ? (ftell($fileHandle) / $totalFileSize) * 55 : 0;
                    Cache::put('import_progress_'.$currentBatchId, 15 + $percentReadFile, now()->addHour());
                }

                if (count($dataToInsert) >= 500) {
                    Log::info("Batch [{$currentBatchId}]: Memasukkan 500 baris (Total dibaca: {$rowCount}, Total lolos: {$passedCount})...");
                    SosDataRaw::insert($dataToInsert);
                    $dataToInsert = [];
                }
            }

            if (!empty($dataToInsert)) {
                Log::info("Batch [{$currentBatchId}]: Memasukkan sisa ".count($dataToInsert).' baris...');
                SosDataRaw::insert($dataToInsert);
            }

            fclose($fileHandle);
            Cache::put('import_progress_'.$currentBatchId, 70, now()->addHour());
            Log::info("Batch [{$currentBatchId}]: Impor mentah SELESAI. Total dibaca: {$rowCount}. Total di-insert: {$passedCount}. Memulai pemrosesan SQL...");

            $this->processNewPos($currentBatchId);
            Cache::put('import_progress_'.$currentBatchId, 80, now()->addHour());
            Log::info("Batch [{$currentBatchId}]: Pemrosesan ListPo SELESAI.");

            $this->processSosData($currentBatchId);
            Cache::put('import_progress_'.$currentBatchId, 95, now()->addHour());
            Log::info("Batch [{$currentBatchId}]: Pemrosesan SosData SELESAI.");

            SosDataRaw::where('batch_id', $currentBatchId)->delete();
            Log::info("Batch [{$currentBatchId}]: Data mentah dibersihkan.");

            Cache::put('import_progress_'.$currentBatchId, 100, now()->addHour());
            Log::info("Batch [{$currentBatchId}]: SEMUA PROSES SELESAI.");
        } catch (\Throwable $e) {
            Cache::put('import_progress_'.$currentBatchId, -1, now()->addHour());
            Log::error('Import Gagal di dalam Job: '.$e->getMessage(), ['trace' => $e->getTraceAsString()]);
            Cache::put('import_progress_'.$this->batch()->id, -1, now()->addHour());
            if ($this->batch()) {
                $this->batch()->cancel();
            }
            SosDataRaw::where('batch_id', $currentBatchId)->delete();
            throw $e;
        } finally {
            Storage::disk('local')->delete($this->path);
            if ($tempCsvPath && file_exists($tempCsvPath)) {
                @unlink($tempCsvPath);
            }
            if ($isZip && isset($extractedOriginalPath) && file_exists($extractedOriginalPath)) {
                @unlink($extractedOriginalPath);
            }
        }
    }

    private function processNewPos(string $batchId)
    {
        // (Kode processNewPos tetap sama seperti sebelumnya, tidak perlu diubah)
        // ... Salin isi method ini dari kode asli Anda jika belum ada di sini ...
        $sql = "
        INSERT INTO list_po (nipnas, po, segment, bill_city, witel, created_at, updated_at)
        SELECT
            DISTINCT raw.nipnas,
            CASE
                WHEN raw.bill_witel = 'BALI' THEN 'DIASTANTO'
                WHEN raw.bill_witel = 'SURAMADU' AND raw.segmen = 'Regional' THEN 'FERIZKA PARAMITHA'
                WHEN raw.bill_witel = 'SURAMADU' AND raw.segmen IN ('Private Service', 'State-Owned Enterprise Service', 'ENTERPRISE') THEN 'DWIEKA'
                WHEN raw.bill_witel = 'SURAMADU' AND raw.segmen = 'Government' THEN 'EKA SARI'
                WHEN (LOWER(raw.billcity) LIKE '%pasuruan%' OR LOWER(raw.billcity) LIKE '%probolinggo%' OR LOWER(raw.billcity) LIKE '%lumajang%') THEN 'I WAYAN KRISNA'
                WHEN (LOWER(raw.billcity) LIKE '%jember%' OR LOWER(raw.billcity) LIKE '%banyuwangi%' OR LOWER(raw.billcity) LIKE '%bondowoso%' OR LOWER(raw.billcity) LIKE '%situbondo%') THEN 'ILHAM MIFTAHUL'
                WHEN (LOWER(raw.billcity) LIKE '%gresik%' OR LOWER(raw.billcity) LIKE '%mojokerto%' OR LOWER(raw.billcity) LIKE '%sidoarjo%' OR LOWER(raw.billcity) LIKE '%jombang%') THEN 'IBRAHIM MUHAMMAD'
                WHEN (LOWER(raw.billcity) LIKE '%madiun%' OR LOWER(raw.billcity) LIKE '%ngawi%' OR LOWER(raw.billcity) LIKE '%bojonegoro%' OR LOWER(raw.billcity) LIKE '%tuban%' OR LOWER(raw.billcity) LIKE '%magetan%' OR LOWER(raw.billcity) LIKE '%ponorogo%') THEN 'ALFONSUS'
                WHEN (LOWER(raw.billcity) LIKE '%kediri%' OR LOWER(raw.billcity) LIKE '%nganjuk%' OR LOWER(raw.billcity) LIKE '%blitar%' OR LOWER(raw.billcity) LIKE '%trenggalek%' OR LOWER(raw.billcity) LIKE '%tulungagung%') THEN 'LUQMAN KURNIAWAN'
                WHEN (LOWER(raw.billcity) LIKE '%malang%' OR LOWER(raw.billcity) LIKE '%batu%' OR LOWER(raw.billcity) LIKE '%kepanjen%') THEN 'NURTRIA IMAN'
                WHEN (LOWER(raw.billcity) LIKE '%atambua%' OR LOWER(raw.billcity) LIKE '%ende%' OR LOWER(raw.billcity) LIKE '%kupang%' OR LOWER(raw.billcity) LIKE '%laboan bajo%' OR LOWER(raw.billcity) LIKE '%maumere%' OR LOWER(raw.billcity) LIKE '%waikabubak%' OR LOWER(raw.billcity) LIKE '%waingapu%' OR LOWER(raw.billcity) LIKE '%sikka%' OR LOWER(raw.billcity) LIKE '%ntt%' OR LOWER(raw.billcity) LIKE '%kefamenanu%' OR LOWER(raw.billcity) LIKE '%sabu raijua%' OR LOWER(raw.billcity) LIKE '%nagekeo%') THEN 'MARIA FRANSISKA'
                WHEN (LOWER(raw.billcity) LIKE '%bima%' OR LOWER(raw.billcity) LIKE '%sumbawa%' OR LOWER(raw.billcity) LIKE '%lombok%' OR LOWER(raw.billcity) LIKE '%mataram%' OR LOWER(raw.billcity) LIKE '%nusa tenggara barat%' OR LOWER(raw.billcity) LIKE '%dompu%' OR LOWER(raw.billcity) LIKE '%manggarai%') THEN 'ANDRE YANA'
                ELSE 'PO_TIDAK_TERDEFINISI'
            END AS po_name,
            raw.segmen,
            raw.billcity,
            CASE
                WHEN raw.bill_witel IN ('JATIM TIMUR', 'SIDOARJO') THEN 'JATIM TIMUR'
                WHEN raw.bill_witel IN ('JATIM BARAT', 'MALANG') THEN 'JATIM BARAT'
                WHEN raw.bill_witel = 'BALI' THEN 'BALI'
                WHEN raw.bill_witel = 'NUSA TENGGARA' THEN 'NUSA TENGGARA'
                WHEN raw.bill_witel = 'SURAMADU' THEN 'SURAMADU'
                ELSE 'RSO1'
            END AS witel_baru,
            NOW(), NOW()
        FROM sos_data_raw AS raw
        LEFT JOIN list_po AS lp ON raw.nipnas = lp.nipnas
        WHERE
            raw.batch_id = ?
            AND raw.nipnas IS NOT NULL
            AND lp.nipnas IS NULL
        GROUP BY raw.nipnas, po_name, raw.segmen, raw.billcity, witel_baru
        ";

        DB::statement($sql, [$batchId]);
    }

    private function processSosData(string $batchId)
    {
        $sql = "
        INSERT INTO sos_data (
            nipnas, standard_name, order_id, order_subtype, order_description, segmen, sub_segmen,
            cust_city, cust_witel, serv_city, service_witel, bill_witel, bill_city, li_product_name,
            li_billdate, li_milestone, kategori, li_status, li_status_date, is_termin, biaya_pasang,
            hrg_bulanan, revenue, order_created_date, agree_type, agree_start_date, agree_end_date,
            lama_kontrak_hari, amortisasi, action_cd, kategori_umur, umur_order,
            po_name, tipe_order, segmen_baru, scalling1, scalling2, tipe_grup, witel_baru, kategori_baru,
            batch_id,
            created_at, updated_at
        )
        SELECT
            raw.nipnas, raw.standard_name, raw.order_id, raw.order_subtype, raw.order_description, raw.segmen, raw.sub_segmen,
            raw.custcity, raw.cust_witel, raw.servcity, raw.service_witel, raw.bill_witel, raw.billcity, raw.li_product_name,

            CAST(LEFT(NULLIF(raw.li_billdate, ''), 19) AS DATETIME) AS li_billdate,

            raw.li_milestone,
            raw.kategori,
            raw.li_status,

            CAST(LEFT(NULLIF(raw.li_status_date, ''), 19) AS DATETIME) AS li_status_date,

            raw.is_termin,
            CAST(IFNULL(NULLIF(raw.biaya_pasang, ''), 0) AS DECIMAL(15,2)),
            CAST(IFNULL(NULLIF(raw.hrg_bulanan, ''), 0) AS DECIMAL(15,2)),
            CAST(IFNULL(NULLIF(raw.revenue, ''), 0) AS DECIMAL(15,2)),

            CAST(LEFT(NULLIF(raw.order_created_date, ''), 19) AS DATETIME) AS order_created_date,

            raw.agree_type,

            CAST(LEFT(NULLIF(raw.agree_start_date, ''), 19) AS DATETIME) AS agree_start_date,
            CAST(LEFT(NULLIF(raw.agree_end_date, ''), 19) AS DATETIME) AS agree_end_date,

            -- [PERBAIKAN 1: GANTI INT KE SIGNED]
            CAST(IFNULL(NULLIF(raw.lama_kontrak_hari, ''), 0) AS SIGNED),

            CAST(IFNULL(NULLIF(raw.amortisasi, ''), 0) AS DECIMAL(15,2)),
            raw.action_cd, raw.kategori_umur,

            -- [PERBAIKAN 2: GANTI INT KE SIGNED]
            CAST(IFNULL(NULLIF(raw.umur_order, ''), 0) AS SIGNED),

            lp.po AS po_name,

            CASE raw.order_subtype
                WHEN 'Modify Price' THEN '4. MO' WHEN 'Modify' THEN '4. MO' WHEN 'Modify BA' THEN '4. MO' WHEN 'Renewal Agreement' THEN '4. MO' WHEN 'Modify Termin' THEN '4. MO'
                WHEN 'New Install' THEN '1. AO'
                WHEN 'Resume' THEN '5. RO'
                WHEN 'Suspend' THEN '2. SO'
                WHEN 'Disconnect' THEN '3. DO'
                ELSE '0'
            END AS tipe_order,

            CASE raw.segmen
                WHEN 'Government' THEN '2. GOV'
                WHEN 'State-Owned Enterprise Service' THEN '4. SOE' WHEN 'Enterprise' THEN '4. SOE'
                WHEN 'Private Service' THEN '3. PRIVATE'
                WHEN 'Regional' THEN '1. SME' WHEN 'Business' THEN '1. SME'
                ELSE '0'
            END AS segmen_baru,

            CAST(
                (
                    CASE
                        WHEN UPPER(raw.is_termin) = 'Y' THEN (CAST(IFNULL(NULLIF(raw.biaya_pasang, ''), 0) AS DECIMAL(15,2)) / 4) + CAST(IFNULL(NULLIF(raw.hrg_bulanan, ''), 0) AS DECIMAL(15,2))
                        ELSE
                            IF(CAST(IFNULL(NULLIF(raw.amortisasi, ''), 0) AS DECIMAL(15,2)) != 0,
                                CAST(IFNULL(NULLIF(raw.biaya_pasang, ''), 0) AS DECIMAL(15,2)) / CAST(IFNULL(NULLIF(raw.amortisasi, ''), 0) AS DECIMAL(15,2)),
                                0)
                            + CAST(IFNULL(NULLIF(raw.hrg_bulanan, ''), 0) AS DECIMAL(15,2))
                    END
                ) AS DECIMAL(15, 2)
            ) AS scalling1,

            CAST(
                (
                    (CASE
                        WHEN UPPER(raw.is_termin) = 'Y' THEN (CAST(IFNULL(NULLIF(raw.biaya_pasang, ''), 0) AS DECIMAL(15,2)) / 4) + CAST(IFNULL(NULLIF(raw.hrg_bulanan, ''), 0) AS DECIMAL(15,2))
                        ELSE
                            IF(CAST(IFNULL(NULLIF(raw.amortisasi, ''), 0) AS DECIMAL(15,2)) != 0,
                                CAST(IFNULL(NULLIF(raw.biaya_pasang, ''), 0) AS DECIMAL(15,2)) / CAST(IFNULL(NULLIF(raw.amortisasi, ''), 0) AS DECIMAL(15,2)),
                                0)
                            + CAST(IFNULL(NULLIF(raw.hrg_bulanan, ''), 0) AS DECIMAL(15,2))
                    END) / 1000
                ) AS DECIMAL(15, 2)
            ) AS scalling2,

            IF(raw.order_subtype IN ('New Install', 'Modify Price', 'Modify', 'Modify BA', 'Renewal Agreement', 'Modify Termin'), 'AOMO', 'SODORO') AS tipe_grup,

            CASE
                WHEN raw.bill_witel IN ('JATIM TIMUR', 'SIDOARJO') THEN 'JATIM TIMUR'
                WHEN raw.bill_witel IN ('JATIM BARAT', 'MALANG') THEN 'JATIM BARAT'
                WHEN raw.bill_witel = 'BALI' THEN 'BALI'
                WHEN raw.bill_witel = 'NUSA TENGGARA' THEN 'NUSA TENGGARA'
                WHEN raw.bill_witel = 'SURAMADU' THEN 'SURAMADU'
                ELSE 'RSO1'
            END AS witel_baru,

            CASE
                WHEN raw.kategori IN ('IN PROCESS', 'PROV. COMPLETE', '2. IN PROCESS')
                    THEN '2. IN PROCESS'

                WHEN raw.kategori IN ('READY TO BILL', '3. READY TO BILL')
                    THEN '3. READY TO BILL'

                WHEN raw.kategori IN ('PROVIDE ORDER', '1. PROVIDE ORDER')
                    THEN '1. PROVIDE ORDER'

                ELSE NULL
            END AS kategori_baru,

            ?,
            NOW(),
            NOW()

        FROM sos_data_raw AS raw
        LEFT JOIN list_po AS lp ON raw.nipnas = lp.nipnas
        WHERE
            raw.batch_id = ?

        ON DUPLICATE KEY UPDATE
            nipnas = VALUES(nipnas), standard_name = VALUES(standard_name), order_id = VALUES(order_id),
            order_subtype = VALUES(order_subtype), order_description = VALUES(order_description), segmen = VALUES(segmen),
            sub_segmen = VALUES(sub_segmen), cust_city = VALUES(cust_city), cust_witel = VALUES(cust_witel),
            serv_city = VALUES(serv_city), service_witel = VALUES(service_witel), bill_witel = VALUES(bill_witel),
            bill_city = VALUES(bill_city), li_product_name = VALUES(li_product_name), li_billdate = VALUES(li_billdate),
            li_milestone = VALUES(li_milestone), kategori = VALUES(kategori), li_status = VALUES(li_status),
            li_status_date = VALUES(li_status_date), is_termin = VALUES(is_termin), biaya_pasang = VALUES(biaya_pasang),
            hrg_bulanan = VALUES(hrg_bulanan), revenue = VALUES(revenue), order_created_date = VALUES(order_created_date),
            agree_type = VALUES(agree_type), agree_start_date = VALUES(agree_start_date), agree_end_date = VALUES(agree_end_date),
            lama_kontrak_hari = VALUES(lama_kontrak_hari), amortisasi = VALUES(amortisasi), action_cd = VALUES(action_cd),
            kategori_umur = VALUES(kategori_umur), umur_order = VALUES(umur_order),
            po_name = VALUES(po_name), tipe_order = VALUES(tipe_order), segmen_baru = VALUES(segmen_baru),
            scalling1 = VALUES(scalling1), scalling2 = VALUES(scalling2),
            tipe_grup = VALUES(tipe_grup),
            witel_baru = VALUES(witel_baru), kategori_baru = VALUES(kategori_baru),
            batch_id = VALUES(batch_id),
            updated_at = NOW();
        ";

        DB::statement($sql, [$batchId, $batchId]);
    }

    public function failed(\Throwable $exception): void
    {
        $batchId = $this->batch() ? $this->batch()->id : 'N/A';
        Cache::put('import_progress_'.$batchId, -1, now()->addHour());
        Log::error("Job ProcessSOSImport GAGAL (failed method) untuk Batch [{$batchId}]: ".$exception->getMessage());
        SosDataRaw::where('batch_id', $batchId)->delete();
    }
}
