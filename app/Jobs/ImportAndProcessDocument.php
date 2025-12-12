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
        Log::info("Batch [{$batchId}]: Job Import dimulai.");
        Cache::put('import_progress_'.$batchId, 5, now()->addHour());

        $originalFilePath = Storage::path($this->path);
        $extension = strtolower(pathinfo($originalFilePath, PATHINFO_EXTENSION));
        $csvPath = $originalFilePath;

        // DEKLARASI VARIABEL PENTING (Memperbaiki error Undefined variable)
        $isConverted = false;

        try {
            // 1. KONVERSI EXCEL KE CSV
            if (in_array($extension, ['xlsx', 'xls'])) {
                Log::info("Batch [{$batchId}]: Convert Excel ke CSV (Spout Mode)...");

                $tempCsvFile = tempnam(sys_get_temp_dir(), 'imp_').'.csv';

                // Buka Reader (Excel)
                $reader = ReaderEntityFactory::createReaderFromFile($originalFilePath);
                $reader->open($originalFilePath);

                // Buka Writer (CSV)
                $writer = WriterEntityFactory::createWriterToFile($tempCsvFile);
                $writer->openToFile($tempCsvFile);

                // Streaming baris per baris
                foreach ($reader->getSheetIterator() as $sheet) {
                    foreach ($sheet->getRowIterator() as $row) {
                        $cells = $row->getCells();
                        $rowData = [];
                        foreach ($cells as $cell) {
                            $rowData[] = $cell->getValue();
                        }
                        $writer->addRow(WriterEntityFactory::createRowFromArray($rowData));
                    }
                    break; // Hanya proses sheet pertama
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

            // Cek index untuk Filter Produk
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

                $orderId = (strtoupper(substr($rawOrderId, 0, 2)) === 'SC') ? substr($rawOrderId, 2) : $rawOrderId;

                // --- MAPPING DATA (LOGIKA BARU) ---
                $rawFilterProduct = trim($row[$idxFilterProduct] ?? '');
                $rawProductOld = $row[$idx['product + order id'] ?? $idx['product_order_id'] ?? -1]
                                 ?? $row[$idx['product'] ?? -1]
                                 ?? '';
                $productNameOldFull = trim($rawProductOld);

                $productValue = '';
                $isFromFilterProduct = false;

                if (!empty($rawFilterProduct)) {
                    $productValue = $rawFilterProduct;
                    $isFromFilterProduct = true;
                } else {
                    if (!empty($productNameOldFull)) {
                        $productValue = str_ends_with($productNameOldFull, (string) $orderId)
                           ? trim(substr($productNameOldFull, 0, -strlen((string) $orderId)))
                           : trim(str_replace((string) $orderId, '', $productNameOldFull));
                    }
                }

                $witel = trim($row[$idx['nama witel'] ?? $idx['nama_witel'] ?? -1] ?? '');
                $layanan = trim($row[$idx['layanan'] ?? -1] ?? '');

                // FILTER
                if (str_contains(strtolower($productValue), 'kidi')) continue;
                if (stripos($witel, 'JATENG') !== false) continue;
                if (!str_contains($productValue, '-') && stripos($productValue, 'pijar') !== false && stripos($layanan, 'mahir') !== false) continue;

                $segmentRaw = trim($row[$idx['segmen_n'] ?? -1] ?? '');
                $segment = (in_array($segmentRaw, ['RBS', 'SME'])) ? 'SME' : 'LEGS';

                // PRICE
                $netPrice = 0;
                $isTemplatePrice = 0;
                $excelNetPrice = floatval(preg_replace('/[^0-9.]/', '', $row[$idx['net price'] ?? $idx['net_price'] ?? -1] ?? 0));

                if ($excelNetPrice > 0) {
                    $netPrice = $excelNetPrice;
                } else {
                    $netPrice = $this->calculateFastPrice($productValue, $segment, $witel);
                    $isTemplatePrice = ($netPrice > 0) ? 1 : 0;
                }

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

                // DATA UTAMA
                $batchData[] = [
                    'batch_id' => $batchId,
                    'order_id' => $orderId,
                    'product' => $productValue,
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

                // DATA PRODUCT
                if (!$isFromFilterProduct && $productValue && str_contains($productValue, '-')) {
                    // Bundling Logic Lama
                    $individualProducts = explode('-', $productValue);
                    foreach ($individualProducts as $pName) {
                        $pName = trim($pName);
                        if (empty($pName)) continue;
                        if (stripos($pName, 'pijar') !== false && stripos($layanan, 'mahir') !== false) continue;

                        $batchProducts[] = [
                            'batch_id' => $batchId,
                            'order_id' => $orderId,
                            'product_name' => $pName,
                            'net_price' => $this->calculateFastPrice($pName, $segment, $witel),
                            'status_wfm' => $statusWfm,
                            'channel' => $channel,
                            'created_at' => now(),
                            'updated_at' => now(),
                        ];
                    }
                } else {
                    // Single Logic (Termasuk Filter Product)
                    $batchProducts[] = [
                        'batch_id' => $batchId,
                        'order_id' => $orderId,
                        'product_name' => $productValue,
                        'net_price' => $netPrice,
                        'status_wfm' => $statusWfm,
                        'channel' => $channel,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ];
                }

                // INSERT BATCH
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

            // INSERT SISA
            if (!empty($batchData)) {
                DB::table('temp_upload_data')->insert($batchData);
            }
            if (!empty($batchProducts)) {
                DB::table('temp_order_products')->insert($batchProducts);
            }

            fclose($handle);
            Cache::put('import_progress_'.$batchId, 90, now()->addHour());

            // 5. PROSES FINAL (Sinkronisasi ke Tabel Asli)
            $this->processSqlSync($batchId);

            Cache::put('import_progress_'.$batchId, 100, now()->addHour());
            Log::info("Batch [{$batchId}]: Import Selesai. Total: {$processedRows}");

        } catch (\Throwable $e) {
            $this->fail($e);
            if (isset($handle) && is_resource($handle)) {
                fclose($handle);
            }
            throw $e;
        } finally {
            // Error $isConverted sebelumnya terjadi di sini
            if ($isConverted && file_exists($csvPath)) {
                @unlink($csvPath);
            }
        }
    }

    private function processSqlSync($batchId)
    {
        DB::transaction(function () use ($batchId) {
            // 1. Cancel Logic (Tetap sama)
            DB::statement("
                UPDATE document_data d
                LEFT JOIN temp_upload_data t ON d.order_id = t.order_id
                SET d.status_wfm = 'done close cancel', d.updated_at = NOW()
                WHERE d.status_wfm = 'in progress' AND t.order_id IS NULL
            ");

            // 2. Insert Tabel Utama (Document Data)
            // PERUBAHAN: Menghapus bagian 'ON DUPLICATE KEY UPDATE'
            // Sekarang query ini akan SELALU INSERT baris baru, meskipun Order ID sama.
            DB::statement('
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
            ', [$batchId]);

            // 3. Hapus Produk Lama (Opsional - Tergantung kebutuhan)
            // Jika Anda ingin produk menumpuk sesuai order_id induknya yang sekarang duplikat,
            // logika ini mungkin perlu disesuaikan. Tapi untuk keamanan data bersih per batch:
            DB::statement("
                DELETE op FROM order_products op
                INNER JOIN temp_upload_data t ON op.order_id = t.order_id
                WHERE t.batch_id = ?
            ", [$batchId]);

            // 4. Insert Produk Baru
            DB::statement('
                INSERT INTO order_products (
                    order_id, product_name, net_price, channel, status_wfm, created_at, updated_at
                )
                SELECT
                    order_id, product_name, net_price, channel, status_wfm, NOW(), NOW()
                FROM temp_order_products
                WHERE batch_id = ?
            ', [$batchId]);
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
