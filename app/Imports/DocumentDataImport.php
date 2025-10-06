<?php

namespace App\Imports;

use App\Models\DocumentData;
use App\Models\OrderProduct;
use App\Traits\CalculatesProductPrice;
use Carbon\Carbon;
// use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Maatwebsite\Excel\Concerns\OnEachRow;
use Maatwebsite\Excel\Concerns\WithBatchInserts;
use Maatwebsite\Excel\Concerns\WithChunkReading;
use Maatwebsite\Excel\Concerns\WithEvents;
use Maatwebsite\Excel\Concerns\WithHeadingRow;
use Maatwebsite\Excel\Concerns\WithUpserts;
use Maatwebsite\Excel\Events\AfterImport;
use Maatwebsite\Excel\Events\BeforeImport;
use Maatwebsite\Excel\Row;

class DocumentDataImport implements OnEachRow, WithChunkReading, WithEvents, WithUpserts, WithHeadingRow
{
    use CalculatesProductPrice;

    private string $batchId;
    private int $totalRows = 0;
    private int $processedRows = 0;

    public function __construct(string $batchId)
    {
        $this->batchId = $batchId;
    }

    public function uniqueBy()
    {
        return 'order_id';
    }

    public function chunkSize(): int
    {
        return 500;
    }

    public function batchSize(): int
    {
        return 500;
    }

    public function registerEvents(): array
    {
        return [
            BeforeImport::class => function (BeforeImport $event) {
                $totalRows = $event->getReader()->getTotalRows();
                $worksheetName = array_key_first($totalRows);

                if (isset($totalRows[$worksheetName])) {
                    $this->totalRows = $totalRows[$worksheetName] - 1; // Kurangi 1 untuk header
                    Log::info("Batch [{$this->batchId}]: Ditemukan total {$this->totalRows} baris untuk diproses.");
                    // [MODIFIKASI] Set progres awal ke 0
                    Cache::put('import_progress_' . $this->batchId, 0, now()->addMinutes(30));
                } else {
                    Log::warning("Batch [{$this->batchId}]: Tidak dapat menghitung total baris.");
                }
            },
            // [DIHAPUS] Event AfterChunk dihapus karena kita pindahkan logikanya ke onRow

            // [TAMBAHAN] Event AfterImport untuk memastikan progres selesai 100%
            AfterImport::class => function (AfterImport $event) {
                Cache::put('import_progress_' . $this->batchId, 100, now()->addMinutes(30));
                Log::info("Batch [{$this->batchId}]: Import selesai, progres diatur ke 100%.");
            }
        ];
    }

    public function onRow(Row $row)
    {
        $this->processedRows++;

        // [FIX UTAMA] Logika update progres dipindahkan ke sini
        // Update setiap 50 baris agar tidak membebani cache, tapi tetap responsif
        if ($this->processedRows % 50 === 0 && $this->totalRows > 0) {
            $percentage = round(($this->processedRows / $this->totalRows) * 100);
            $percentage = min($percentage, 100); // Pastikan tidak pernah lebih dari 100
            Cache::put('import_progress_' . $this->batchId, $percentage, now()->addMinutes(30));
        }

        $rowAsArray = $row->toArray();

        // ===================================================================
        // SEMUA LOGIKA PEMROSESAN DATA ANDA DI BAWAH INI TIDAK DIUBAH
        // ===================================================================

        $orderIdRaw = $rowAsArray['order_id'] ?? null;
        if (empty($orderIdRaw)) return;
        $orderId = is_string($orderIdRaw) && strtoupper(substr($orderIdRaw, 0, 2)) === 'SC' ? substr($orderIdRaw, 2) : $orderIdRaw;
        if (empty($orderId)) return;

        $productWithOrderId = trim($rowAsArray['product_order_id'] ?? '');
        $productValue = '';
        if (!empty($productWithOrderId)) {
            if (str_ends_with($productWithOrderId, (string)$orderId)) {
                $productValue = trim(substr($productWithOrderId, 0, -strlen((string)$orderId)));
            } else {
                $productValue = trim(str_replace((string)$orderId, '', $productWithOrderId));
                Log::warning("Batch [{$this->batchId}]: Format 'Product + Order Id' tidak terduga untuk Order ID {$orderId}.");
            }
        }
        if (empty($productValue)) {
            Log::warning("Batch [{$this->batchId}]: Gagal mengekstrak nama produk untuk Order ID {$orderId}. Nilai kolom 'Product + Order Id' adalah '{$productWithOrderId}'.");
        }

        $layanan = trim($rowAsArray['layanan'] ?? '');
        $isPijarMahir = !empty($layanan) && stripos($layanan, 'mahir') !== false;
        if ($isPijarMahir) {
            if (str_contains($productValue, '-')) {
                $products = explode('-', $productValue);
                $validProducts = array_filter($products, fn($product) => stripos(trim($product), 'pijar') === false);
                if (empty($validProducts)) return;
                $productValue = implode('-', $validProducts);
            } else {
                return;
            }
        }
        if (in_array(strtolower($productValue), ['kidi'])) return;

        $milestoneValue = trim($rowAsArray['milestone'] ?? '');
        $segmenN = trim($rowAsArray['segmen_n'] ?? '');
        $segment = (in_array($segmenN, ['RBS', 'SME'])) ? 'SME' : 'LEGS';
        $witel = trim($rowAsArray['nama_witel'] ?? '');
        if (stripos($witel, 'JATENG') !== false) return;

        $existingRecord = DocumentData::where('order_id', $orderId)->first();
        $excelNetPrice = is_numeric($rowAsArray['net_price'] ?? null) ? (float) $rowAsArray['net_price'] : 0;
        if ($excelNetPrice > 0) {
            $netPrice = $excelNetPrice;
        } elseif ($existingRecord && $existingRecord->net_price > 0) {
            $netPrice = $existingRecord->net_price;
        } else {
            $netPrice = $this->calculatePrice($productValue, $segment, $witel);
        }

        $parseDate = function ($date) {
            if (empty($date)) return null;
            if (is_numeric($date)) return Carbon::createFromTimestamp(($date - 25569) * 86400)->format('Y-m-d H:i:s');
            try { return Carbon::parse($date)->format('Y-m-d H:i:s'); }
            catch (\Exception $e) { return null; }
        };

        $status_wfm = 'in progress';
        $doneMilestones = ['completed', 'complete', 'baso started', 'fulfill billing complete'];
        if ($milestoneValue && stripos($milestoneValue, 'QC') !== false) {
            $status_wfm = '';
        } elseif ($milestoneValue && in_array(strtolower($milestoneValue), $doneMilestones)) {
            $status_wfm = 'done close bima';
        }

        $newData = [
            'batch_id' => $this->batchId, 'order_id' => $orderId, 'product' => $productValue, 'net_price' => $netPrice,
            'milestone' => $milestoneValue, 'segment' => $segment, 'nama_witel' => $witel, 'status_wfm' => $status_wfm,
            'products_processed' => false, 'channel' => ($rowAsArray['channel'] ?? null) === 'hsi' ? 'SC-One' : ($rowAsArray['channel'] ?? null),
            'filter_produk' => $rowAsArray['filter_produk'] ?? null, 'witel_lama' => $rowAsArray['witel'] ?? null,
            'layanan' => $layanan, 'order_date' => $parseDate($rowAsArray['order_date'] ?? null),
            'order_status' => $rowAsArray['order_status'] ?? null, 'order_sub_type' => $rowAsArray['order_subtype'] ?? null,
            'order_status_n' => $rowAsArray['order_status_n'] ?? null, 'customer_name' => $rowAsArray['customer_name'] ?? null,
            'tahun' => $rowAsArray['tahun'] ?? null, 'telda' => trim($rowAsArray['telda'] ?? ''),
            'week' => !empty($rowAsArray['week']) ? Carbon::parse($rowAsArray['week'])->weekOfYear : null,
            'order_created_date' => $parseDate($rowAsArray['order_created_date'] ?? null),
            'previous_milestone' => $existingRecord && $existingRecord->milestone !== $milestoneValue ? $existingRecord->milestone : ($existingRecord ? $existingRecord->previous_milestone : null),
        ];

        DocumentData::updateOrCreate(['order_id' => $orderId], $newData);

        if ($productValue && str_contains($productValue, '-')) {
            OrderProduct::where('order_id', $orderId)->delete();
            $individualProducts = explode('-', $productValue);
            foreach ($individualProducts as $pName) {
                $pName = trim($pName);
                if (empty($pName)) continue;
                OrderProduct::create([
                    'order_id' => $orderId, 'product_name' => $pName, 'net_price' => $this->calculatePrice($pName, $segment, $witel),
                    'status_wfm' => $status_wfm, 'channel' => ($rowAsArray['channel'] ?? null) === 'hsi' ? 'SC-One' : ($rowAsArray['channel'] ?? null),
                ]);
            }
        }
    }
}
