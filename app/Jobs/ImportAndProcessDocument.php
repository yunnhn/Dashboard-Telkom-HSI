<?php

namespace App\Jobs;

use Carbon\Carbon;
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
use OpenSpout\Reader\Common\Creator\ReaderEntityFactory;
use OpenSpout\Writer\Common\Creator\WriterEntityFactory;
use PhpOffice\PhpSpreadsheet\Shared\Date;

class ImportAndProcessDocument implements ShouldQueue
{
    use Batchable;
    use Dispatchable;
    use InteractsWithQueue;
    use Queueable;
    use SerializesModels;

    public $timeout = 1200;
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

        $batchId = $this->batch() ? $this->batch()->id : uniqid();
        Log::info("Batch [{$batchId}]: Job Import dimulai (Mode: Direct Filter Product).");
        Cache::put('import_progress_'.$batchId, 5, now()->addHour());

        $originalFilePath = Storage::path($this->path);
        $extension = strtolower(pathinfo($originalFilePath, PATHINFO_EXTENSION));
        $csvPath = $originalFilePath;
        $isConverted = false;

        try {
            // 1. KONVERSI EXCEL KE CSV (Untuk performa baca data mentah)
            if (in_array($extension, ['xlsx', 'xls'])) {
                Log::info("Batch [{$batchId}]: Convert Excel ke CSV...");
                $tempCsvFile = tempnam(sys_get_temp_dir(), 'imp_').'.csv';

                $reader = ReaderEntityFactory::createReaderFromFile($originalFilePath);
                $reader->open($originalFilePath);

                $writer = WriterEntityFactory::createWriterToFile($tempCsvFile);
                $writer->openToFile($tempCsvFile);

                foreach ($reader->getSheetIterator() as $sheet) {
                    foreach ($sheet->getRowIterator() as $row) {
                        $cells = $row->getCells();
                        $rowData = [];
                        foreach ($cells as $cell) {
                            $rowData[] = $cell->getValue();
                        }
                        $writer->addRow(WriterEntityFactory::createRowFromArray($rowData));
                    }
                    break; // Hanya sheet pertama
                }

                $writer->close();
                $reader->close();

                $csvPath = $tempCsvFile;
                $isConverted = true;
            }

            // 2. BACA CSV
            $handle = fopen($csvPath, 'r');
            if (!$handle) {
                throw new \Exception('Gagal membuka file CSV.');
            }

            // 3. MAPPING HEADER
            $headerLine = fgets($handle);
            $headerLine = trim(preg_replace('/\x{FEFF}/u', '', $headerLine));
            $header = str_getcsv($headerLine, ',');
            $header = array_map(fn ($h) => strtolower(trim($h)), $header);
            $idx = array_flip($header);

            $idxOrderId = $idx['order id'] ?? $idx['order_id'] ?? null;
            if (is_null($idxOrderId)) {
                throw new \Exception("Kolom 'Order Id' tidak ditemukan di file.");
            }

            // Cek index untuk Filter Produk (KOLOM UTAMA)
            $idxFilterProduct = $idx['filter product'] ?? $idx['filter_produk'] ?? -1;

            // 4. BERSIHKAN TEMP TABLES
            DB::table('temp_upload_data')->truncate();
            DB::table('temp_order_products')->truncate();

            $batchData = [];
            $batchProducts = [];
            $processedRows = 0;

            while (($row = fgetcsv($handle, 0, ',')) !== false) {
                ++$processedRows;
                if (empty($row) || count($row) < 1) continue;

                $rawOrderId = $row[$idxOrderId] ?? null;
                if (!$rawOrderId || in_array(strtolower($rawOrderId), ['order id', 'order_id'])) continue;

                // Bersihkan Order ID (Hapus prefix SC jika ada)
                $orderId = (strtoupper(substr($rawOrderId, 0, 2)) === 'SC') ? substr($rawOrderId, 2) : $rawOrderId;

                // =======================================================
                // LOGIKA UTAMA: AMBIL LANGSUNG DARI FILTER PRODUCT
                // =======================================================
                $rawFilterProduct = trim($row[$idxFilterProduct] ?? '');

                // Jika kosong, kita biarkan kosong atau isi string kosong (sesuai instruksi "mengambil dari kolom product filter")
                $productValue = $rawFilterProduct;

                $witel = trim($row[$idx['nama witel'] ?? $idx['nama_witel'] ?? -1] ?? '');
                $layanan = trim($row[$idx['layanan'] ?? -1] ?? '');

                // Filter Data Sampah (Opsional: Bisa dihapus jika ingin memasukkan SEMUA data)
                if (str_contains(strtolower($productValue), 'kidi')) continue;
                if (stripos($witel, 'JATENG') !== false) continue;
                // Logika skip Pijar+Mahir lama kita retain untuk keamanan, tapi jika tidak perlu bisa dihapus
                if (!str_contains($productValue, '-') && stripos($productValue, 'pijar') !== false && stripos($layanan, 'mahir') !== false) continue;

                $segmentRaw = trim($row[$idx['segmen_n'] ?? -1] ?? '');
                $segment = (in_array($segmentRaw, ['RBS', 'SME'])) ? 'SME' : 'LEGS';

                $rawChannel = trim($row[$idx['channel'] ?? -1] ?? '');
                $channel = (strtolower($rawChannel) === 'hsi') ? 'SC-One' : $rawChannel;

                // =======================================================
                // PRICE LOGIC (CONDITIONAL BY CHANNEL)
                // =======================================================
                $netPrice = 0;
                $isTemplatePrice = 0;

                // Ambil harga dari Excel
                $rawPrice = $row[$idx['net price'] ?? $idx['net_price'] ?? -1] ?? 0;
                $excelNetPrice = floatval(preg_replace('/[^0-9.]/', '', $rawPrice));

                // 1. Prioritas Harga Excel
                if ($excelNetPrice > 0) {
                    $netPrice = $excelNetPrice;
                }
                // 2. Jika Excel 0, Cek Channel
                else {
                    // Hanya hitung otomatis jika Channel SC-One
                    if (strcasecmp($channel, 'SC-One') === 0) {
                        $netPrice = $this->calculateFastPrice($productValue, $segment, $witel);
                        $isTemplatePrice = ($netPrice > 0) ? 1 : 0;
                    } else {
                        // Channel NCX / Lainnya: Biarkan 0
                        $netPrice = 0;
                        $isTemplatePrice = 0;
                    }
                }

                // MILESTONE & STATUS WFM
                $milestone = trim($row[$idx['milestone'] ?? -1] ?? '');
                $statusWfm = 'in progress';
                if (stripos($milestone, 'QC') !== false) {
                    $statusWfm = '';
                } elseif (in_array(strtolower($milestone), ['completed', 'complete', 'baso started', 'fulfill billing complete'])) {
                    $statusWfm = 'done close bima';
                }

                $rawChannel = trim($row[$idx['channel'] ?? -1] ?? '');
                $channel = (strtolower($rawChannel) === 'hsi') ? 'SC-One' : $rawChannel;

                $orderDate = $this->parseDateFast($row[$idx['order date'] ?? $idx['order_date'] ?? -1] ?? null);
                $orderCreatedDate = $this->parseDateFast($row[$idx['order created date'] ?? $idx['order_created_date'] ?? -1] ?? null);

                // DATA PARENT (DOCUMENT DATA)
                $batchData[] = [
                    'batch_id' => $batchId,
                    'order_id' => $orderId,
                    'product' => $productValue, // Isi langsung dari Filter Product
                    'net_price' => $netPrice,
                    'is_template_price' => $isTemplatePrice,
                    'milestone' => $milestone,
                    'segment' => $segment,
                    'nama_witel' => $witel,
                    'status_wfm' => $statusWfm,
                    'customer_name' => trim($row[$idx['customer name'] ?? $idx['customer_name'] ?? -1] ?? ''),
                    'channel' => $channel,
                    'layanan' => $layanan,
                    'filter_produk' => $rawFilterProduct,
                    'witel_lama' => trim($row[$idx['witel'] ?? -1] ?? ''),
                    'order_status' => trim($row[$idx['order status'] ?? $idx['order_status'] ?? -1] ?? ''),
                    'order_sub_type' => trim($row[$idx['order subtype'] ?? $idx['order_subtype'] ?? -1] ?? ''),
                    'order_status_n' => trim($row[$idx['order_status_n'] ?? -1] ?? ''),
                    'tahun' => $row[$idx['tahun'] ?? -1] ?? null,
                    'telda' => trim($row[$idx['telda'] ?? -1] ?? ''),
                    'week' => $row[$idx['week'] ?? -1] ?? null,
                    'order_date' => $orderDate,
                    'order_created_date' => $orderCreatedDate,
                    'created_at' => now(),
                    'updated_at' => now(),
                ];

                // DATA CHILD (ORDER PRODUCTS)
                // Instruksi: Abaikan logika pemisahan bundling. Masukkan langsung 1:1.
                // Kita tetap isi tabel ini agar KPI di Controller (yang join ke tabel ini) tidak error/kosong.
                $batchProducts[] = [
                    'batch_id' => $batchId,
                    'order_id' => $orderId,
                    'product_name' => $productValue, // Langsung dari Filter Product, tanpa split
                    'net_price' => $netPrice,
                    'status_wfm' => $statusWfm,
                    'channel' => $channel,
                    'created_at' => now(),
                    'updated_at' => now(),
                ];

                // INSERT BATCH (Setiap 500 baris)
                if (count($batchData) >= 500) {
                    DB::table('temp_upload_data')->insert($batchData);
                    $batchData = [];

                    if (!empty($batchProducts)) {
                        DB::table('temp_order_products')->insert($batchProducts);
                        $batchProducts = [];
                    }
                    Cache::put('import_progress_'.$batchId, 50, now()->addHour());
                }
            }

            // INSERT SISA DATA
            if (!empty($batchData)) {
                DB::table('temp_upload_data')->insert($batchData);
            }
            if (!empty($batchProducts)) {
                DB::table('temp_order_products')->insert($batchProducts);
            }

            fclose($handle);
            Cache::put('import_progress_'.$batchId, 90, now()->addHour());

            // 5. PROSES FINAL (Sinkronisasi SQL ke Tabel Utama)
            $this->processSqlSync($batchId);

            Cache::put('import_progress_'.$batchId, 100, now()->addHour());
            Log::info("Batch [{$batchId}]: Import Selesai. Total Baris: {$processedRows}");

        } catch (\Throwable $e) {
            $this->fail($e);
            if (isset($handle) && is_resource($handle)) {
                fclose($handle);
            }
            throw $e;
        } finally {
            if ($isConverted && file_exists($csvPath)) {
                @unlink($csvPath);
            }
        }
    }

    private function processSqlSync($batchId)
    {
        DB::transaction(function () use ($batchId) {
            // ==============================================================================
            // TAHAP 1: SKENARIO ORDER HILANG (MISSING) -> CANCEL
            // ==============================================================================

            // 1.A. Catat ke History (UpdateLog) untuk yang hilang
            DB::statement("
                INSERT INTO update_logs (
                    order_id, product_name, customer_name, nama_witel,
                    status_lama, status_baru, sumber_update, created_at, updated_at
                )
                SELECT
                    d.order_id, d.product, d.customer_name, d.nama_witel,
                    d.status_wfm, 'done close cancel', 'System (Missing in Upload)', NOW(), NOW()
                FROM document_data d
                LEFT JOIN temp_upload_data t ON d.order_id = t.order_id
                WHERE d.status_wfm = 'in progress'
                  AND t.order_id IS NULL -- Order tidak ditemukan di file baru
            ");

            // 1.B. Update status di tabel utama (DocumentData) jadi Cancel
            DB::statement("
                UPDATE document_data d
                LEFT JOIN temp_upload_data t ON d.order_id = t.order_id
                SET d.status_wfm = 'done close cancel',
                    d.order_status_n = 'CANCEL',
                    d.milestone = 'System Cancelled (Missing in Upload)',
                    d.updated_at = NOW()
                WHERE d.status_wfm = 'in progress'
                  AND t.order_id IS NULL
            ");

            // 1.C. Sinkronisasi status cancel ke tabel anak (OrderProduct)
            DB::statement("
                UPDATE order_products op
                JOIN document_data d ON op.order_id = d.order_id
                SET op.status_wfm = 'done close cancel', op.updated_at = NOW()
                WHERE d.status_wfm = 'done close cancel'
                  AND d.milestone = 'System Cancelled (Missing in Upload)'
                  AND op.status_wfm = 'in progress'
            ");

            // ==============================================================================
            // TAHAP 2: SKENARIO ORDER ADA TAPI STATUS BERUBAH (UPDATE)
            // ==============================================================================

            // 2.A. Catat ke History (UpdateLog) jika status berubah (misal: in progress -> done close bima)
            // Kita join Inner Join karena datanya ada di dua tabel
            DB::statement("
                INSERT INTO update_logs (
                    order_id, product_name, customer_name, nama_witel,
                    status_lama, status_baru, sumber_update, created_at, updated_at
                )
                SELECT
                    d.order_id,
                    d.product,
                    d.customer_name,
                    d.nama_witel,
                    d.status_wfm,        -- Status Lama (dari DB)
                    t.status_wfm,        -- Status Baru (dari Excel)
                    'Upload Data Mentah',
                    NOW(),
                    NOW()
                FROM document_data d
                JOIN temp_upload_data t ON d.order_id = t.order_id
                WHERE d.status_wfm = 'in progress'      -- Hanya pantau yang aktif
                  AND d.status_wfm != t.status_wfm      -- Jika statusnya berbeda
                  AND t.status_wfm IS NOT NULL          -- Pastikan status baru valid
                  AND t.status_wfm != ''
            ");

            // ==============================================================================
            // TAHAP 3: SINKRONISASI DATA (UPSERT LOGIC)
            // ==============================================================================

            // 3.A. Hapus data lama di DocumentData yang Order ID-nya ada di file Excel baru.
            // Ini dilakukan agar kita bisa meng-insert data yang fresh (terupdate) tanpa duplikasi.
            // Data yang TIDAK ada di Excel (yang di-cancel di Tahap 1) TIDAK akan terhapus.
            DB::statement("
                DELETE d FROM document_data d
                INNER JOIN temp_upload_data t ON d.order_id = t.order_id
            ");

            // 3.B. Insert Data Baru dari Excel ke DocumentData
            DB::statement("
                INSERT INTO document_data (
                    batch_id, order_id, product, net_price, milestone, segment, nama_witel, status_wfm,
                    customer_name, channel, layanan, filter_produk, witel_lama, order_status,
                    order_sub_type, order_status_n, tahun, telda, week,
                    order_date, order_created_date, created_at, updated_at
                )
                SELECT
                    batch_id, order_id, product, net_price, milestone, segment, nama_witel, status_wfm,
                    customer_name, channel, layanan, filter_produk, witel_lama, order_status,
                    order_sub_type, order_status_n, tahun, telda, week,
                    order_date, order_created_date, NOW(), NOW()
                FROM temp_upload_data
                WHERE batch_id = ?
            ", [$batchId]);

            // ==============================================================================
            // TAHAP 4: SINKRONISASI PRODUK (ORDER PRODUCTS)
            // ==============================================================================

            // 4.A. Hapus produk lama yang order_id-nya sedang di-update
            DB::statement("
                DELETE op FROM order_products op
                INNER JOIN temp_upload_data t ON op.order_id = t.order_id
                WHERE t.batch_id = ?
            ", [$batchId]);

            // 4.B. Masukkan produk baru (1 Order = 1 Produk sesuai request)
            DB::statement("
                INSERT INTO order_products (
                    order_id, product_name, net_price, channel, status_wfm, created_at, updated_at
                )
                SELECT
                    order_id, product_name, net_price, channel, status_wfm, NOW(), NOW()
                FROM temp_order_products
                WHERE batch_id = ?
            ", [$batchId]);
        });
    }

    private function calculateFastPrice($productName, $segment, $witel)
    {
        $productName = strtolower(trim($productName));
        $witel = strtoupper(trim($witel));
        $segment = strtoupper(trim($segment));

        if (stripos($productName, 'netmonk') !== false) {
            return ($segment === 'LEGS') ? 26100 : (($witel === 'BALI') ? 26100 : 21600);
        }
        if (stripos($productName, 'oca') !== false) {
            return ($segment === 'LEGS') ? 104000 : (($witel === 'NUSA TENGGARA') ? 104000 : 103950);
        }
        if (stripos($productName, 'antares') !== false) {
            return 35000;
        }
        if (stripos($productName, 'pijar') !== false) {
            return 582750;
        }

        return 0;
    }

    private function parseDateFast($date)
    {
        if (empty($date) || $date == '-' || $date == '#N/A') {
            return null;
        }
        try {
            if (is_numeric($date)) {
                return Date::excelToDateTimeObject($date)->format('Y-m-d H:i:s');
            }

            return Carbon::parse($date)->format('Y-m-d H:i:s');
        } catch (\Exception $e) {
            return null;
        }
    }

    public function failed(\Throwable $exception): void
    {
        $batchId = $this->batch() ? $this->batch()->id : 'N/A';
        Log::error("Batch [{$batchId}]: GAGAL - ".$exception->getMessage());
        Cache::put('import_progress_'.$batchId, -1, now()->addHour());
    }
}
