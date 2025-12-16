<?php

namespace App\Imports;

use App\Models\DocumentData;
use App\Models\OrderProduct;
use App\Models\UpdateLog;
use App\Traits\CalculatesProductPrice;
use Carbon\Carbon;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Maatwebsite\Excel\Concerns\OnEachRow;
use Maatwebsite\Excel\Concerns\SkipsEmptyRows;
use Maatwebsite\Excel\Concerns\WithChunkReading;
use Maatwebsite\Excel\Concerns\WithEvents;
use Maatwebsite\Excel\Concerns\WithHeadingRow;
use Maatwebsite\Excel\Events\AfterChunk;
use Maatwebsite\Excel\Events\AfterImport;
use Maatwebsite\Excel\Events\BeforeImport;
use Maatwebsite\Excel\Row;
use PhpOffice\PhpSpreadsheet\Shared\Date;

class DocumentDataImport implements OnEachRow, WithChunkReading, WithEvents, WithHeadingRow, SkipsEmptyRows
{
    use CalculatesProductPrice;

    private string $batchId;
    private bool $isFreshImport;
    private int $totalRows = 0;
    private int $processedRows = 0;
    private array $chunkOrderIds = [];
    private array $cleanedOrderIds = [];

    public function __construct(string $batchId, bool $isFreshImport)
    {
        $this->batchId = $batchId;
        $this->isFreshImport = $isFreshImport;
    }

    public function chunkSize(): int
    {
        return 200;
    }

    public function registerEvents(): array
    {
        return [
            BeforeImport::class => function (BeforeImport $event) {
                if (!$this->isFreshImport) {
                    DB::table('temp_upload_data')->truncate();
                }

                $totalRows = $event->getReader()->getTotalRows();
                $worksheetName = array_key_first($totalRows);

                if (isset($totalRows[$worksheetName])) {
                    $this->totalRows = $totalRows[$worksheetName] - 1;
                    Cache::put('import_progress_'.$this->batchId, 0, now()->addHour());
                }
            },

            AfterChunk::class => function (AfterChunk $event) {
                if (!$this->isFreshImport && !empty($this->chunkOrderIds)) {
                    DB::table('temp_upload_data')->insertOrIgnore($this->chunkOrderIds);
                    $this->chunkOrderIds = [];
                }
            },

            AfterImport::class => function (AfterImport $event) {
            },
        ];
    }

    public function onRow(Row $row)
    {
        ++$this->processedRows;

        // ... (Logika Cancel & Progress Bar Tetap Sama) ...
        $rowAsArray = $row->toArray();
        // Pembersihan Header yang mungkin terbaca sebagai data
        $checkHeader = $rowAsArray['order_id'] ?? $rowAsArray['product'] ?? null;
        $invalidKeywords = ['Order Id', 'Product', 'order_id', 'product', 'Net Price'];
        if (in_array($checkHeader, $invalidKeywords)) {
            return;
        }

        if ($this->processedRows % 10 === 0) {
            $batch = Bus::findBatch($this->batchId);
            if ($batch && $batch->cancelled()) {
                throw new \Exception('Import cancelled');
            }
        }

        if ($this->totalRows > 0) {
            $progress = ($this->processedRows >= $this->totalRows) ? 100 : round(($this->processedRows / $this->totalRows) * 100);
            if ($progress > Cache::get('import_progress_'.$this->batchId, 0)) {
                Cache::put('import_progress_'.$this->batchId, $progress, now()->addHour());
            }
        }

        // ... (Pemrosesan Data Utama) ...
        $orderIdRaw = $rowAsArray['order_id'] ?? null;
        if (empty($orderIdRaw)) {
            return;
        }

        $orderId = is_string($orderIdRaw) && strtoupper(substr($orderIdRaw, 0, 2)) === 'SC'
            ? substr($orderIdRaw, 2)
            : $orderIdRaw;

        if (empty($orderId)) {
            return;
        }

        if (!$this->isFreshImport) {
            $this->chunkOrderIds[] = ['order_id' => $orderId];
        }

        // =======================================================
        // LOGIKA PENENTUAN PRODUK (DIRECT DARI FILTER PRODUK)
        // =======================================================
        $filterProdukRaw = trim($rowAsArray['filter_produk'] ?? $rowAsArray['filter_product'] ?? '');

        // Logika Baru: Produk SELALU diambil dari kolom Filter Product
        // Abaikan logika split strip (-)
        $productValue = $filterProdukRaw;

        $layanan = trim($rowAsArray['layanan'] ?? '');

        // Filter Global (Tetap dipertahankan untuk membersihkan data sampah)
        if (in_array(strtolower($productValue), ['kidi'])) {
            return;
        }
        // Filter Pijar Mahir (Opsional, jika ingin dihapus silakan hapus baris ini)
        if (!str_contains($productValue, '-') && stripos($productValue, 'pijar') !== false && stripos($layanan, 'mahir') !== false) {
            return;
        }

        $witel = trim($rowAsArray['nama_witel'] ?? '');
        if (stripos($witel, 'JATENG') !== false) {
            return;
        }

        $segmenN = trim($rowAsArray['segmen_n'] ?? '');
        $segment = (in_array($segmenN, ['RBS', 'SME'])) ? 'SME' : 'LEGS';

        // Helper Date
        $parseDate = function ($date) {
            if (empty($date)) {
                return null;
            }
            try {
                if (is_numeric($date)) {
                    return Carbon::instance(Date::excelToDateTimeObject($date))->format('Y-m-d H:i:s');
                }

                return Carbon::parse($date)->format('Y-m-d H:i:s');
            } catch (\Exception $e) {
                return null;
            }
        };

        // Price Logic
        $channelRaw = trim($rowAsArray['channel'] ?? '');
        // Normalisasi nama channel (hsi -> SC-One)
        $channel = (strtolower($channelRaw) === 'hsi') ? 'SC-One' : $channelRaw;

        // =======================================================
        // PRICE LOGIC (CONDITIONAL BY CHANNEL)
        // =======================================================
        $netPrice = 0.0;
        $isTemplatePrice = false;
        $excelNetPriceRaw = $rowAsArray['net_price'] ?? null;

        // 1. Cek apakah ada harga valid di Excel
        if (is_numeric($excelNetPriceRaw) && (float) $excelNetPriceRaw > 0) {
            $netPrice = (float) $excelNetPriceRaw;
        }
        // 2. Jika Excel 0/Null, Cek Channel
        else {
            // Hanya hitung otomatis jika Channel adalah SC-One
            if (strcasecmp($channel, 'SC-One') === 0) {
                // Gunakan trait CalculatesProductPrice
                $netPrice = $this->calculatePrice($productValue, $segment, $witel);
                $isTemplatePrice = $netPrice > 0;
            } else {
                // Channel NCX / Lainnya: Biarkan 0
                $netPrice = 0;
            }
        }

        // Milestone Logic
        $existingRecord = DocumentData::where('order_id', $orderId)->first();
        $milestoneValue = trim($rowAsArray['milestone'] ?? '');
        $status_wfm = 'in progress';
        $doneMilestones = ['completed', 'complete', 'baso started', 'fulfill billing complete'];

        if ($milestoneValue && stripos($milestoneValue, 'QC') !== false) {
            $status_wfm = '';
        } elseif ($milestoneValue && in_array(strtolower($milestoneValue), $doneMilestones)) {
            $status_wfm = 'done close bima';
        }

        // Update Log (History)
        if ($existingRecord && $existingRecord->status_wfm !== $status_wfm) {
            UpdateLog::create([
                'order_id' => $orderId,
                'product_name' => $existingRecord->product_name ?? $existingRecord->product,
                'customer_name' => $existingRecord->customer_name,
                'nama_witel' => $existingRecord->nama_witel,
                'status_lama' => $existingRecord->status_wfm,
                'status_baru' => $status_wfm,
                'sumber_update' => 'Upload Data (Excel Import)',
            ]);
        }

        $weekValue = $rowAsArray['week'] ?? null;
        $parsedWeekDate = $parseDate($weekValue);

        // Save to DocumentData (Parent)
        $newData = [
            'batch_id' => $this->batchId,
            'order_id' => $orderId,
            'product' => $productValue,
            'net_price' => $netPrice,
            'is_template_price' => $isTemplatePrice,
            'milestone' => $milestoneValue,
            'segment' => $segment,
            'nama_witel' => $witel,
            'status_wfm' => $status_wfm,
            'products_processed' => false,
            'channel' => ($rowAsArray['channel'] ?? null) === 'hsi' ? 'SC-One' : ($rowAsArray['channel'] ?? null),
            'filter_produk' => $filterProdukRaw,
            'witel_lama' => $rowAsArray['witel'] ?? null,
            'layanan' => $layanan,
            'order_date' => $parseDate($rowAsArray['order_date'] ?? null),
            'order_status' => $rowAsArray['order_status'] ?? null,
            'order_sub_type' => $rowAsArray['order_subtype'] ?? null,
            'order_status_n' => $rowAsArray['order_status_n'] ?? null,
            'customer_name' => $rowAsArray['customer_name'] ?? null,
            'tahun' => $rowAsArray['tahun'] ?? null,
            'telda' => trim($rowAsArray['telda'] ?? ''),
            'week' => $parsedWeekDate ? Carbon::parse($parsedWeekDate)->weekOfYear : null,
            'order_created_date' => $parseDate($rowAsArray['order_created_date'] ?? null),
            'previous_milestone' => $existingRecord && $existingRecord->milestone !== $milestoneValue
                ? $existingRecord->milestone
                : ($existingRecord ? $existingRecord->previous_milestone : null),
        ];

        // Gunakan updateOrCreate agar data terupdate jika order_id sudah ada
        DocumentData::updateOrCreate(
            ['order_id' => $orderId],
            $newData
        );

        // Bersihkan Order Product lama untuk ID ini agar tidak duplikat
        if (!in_array($orderId, $this->cleanedOrderIds)) {
            OrderProduct::where('order_id', $orderId)->delete();
            $this->cleanedOrderIds[] = $orderId;
        }

        // =======================================================
        // LOGIKA ORDER PRODUCTS (DIRECT 1:1)
        // =======================================================
        // Logika split bundling dihapus total. Masukkan apa adanya.

        OrderProduct::create([
            'order_id' => $orderId,
            'product_name' => $productValue, // Sama persis dengan parent
            'net_price' => $netPrice,
            'status_wfm' => $status_wfm,
            'channel' => ($rowAsArray['channel'] ?? null) === 'hsi' ? 'SC-One' : ($rowAsArray['channel'] ?? null),
        ]);
    }
}
