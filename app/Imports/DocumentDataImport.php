<?php

namespace App\Imports;

use App\Models\DocumentData;
use App\Models\OrderProduct;
use App\Traits\CalculatesProductPrice;
use Maatwebsite\Excel\Concerns\OnEachRow;
use Maatwebsite\Excel\Concerns\WithStartRow;
use Maatwebsite\Excel\Row;
use Illuminate\Support\Facades\Cache;
use Maatwebsite\Excel\Concerns\WithChunkReading;
use Maatwebsite\Excel\Concerns\WithEvents;
use Maatwebsite\Excel\Events\AfterChunk;
use Maatwebsite\Excel\Events\BeforeImport;
use Maatwebsite\Excel\Concerns\WithUpserts;
use Carbon\Carbon;

class DocumentDataImport implements OnEachRow, WithStartRow, WithChunkReading, WithEvents, WithUpserts
{
    use CalculatesProductPrice;

    private $batchId;
    private $totalRows = 0;
    private int $rowsProcessed = 0;

    public function registerEvents(): array
    {
        return [
            BeforeImport::class => function(BeforeImport $event) {
                $totalRows = $event->getReader()->getTotalRows();
                if (isset($totalRows[array_key_first($totalRows)])) {
                    $this->totalRows = $totalRows[array_key_first($totalRows)] - $this->startRow() + 1;
                }
            },
            AfterChunk::class => function(AfterChunk $event) {
                $percentage = ($this->totalRows > 0)
                    ? round(($this->rowsProcessed / $this->totalRows) * 100)
                    : 0;
                $percentage = min($percentage, 100);
                Cache::put('import_progress_' . $this->batchId, $percentage, 600);
            },
        ];
    }

    public function chunkSize(): int
    {
        return 1000;
    }

    public function __construct(string $batchId)
    {
        $this->batchId = $batchId;
    }

    public function startRow(): int
    {
        return 2;
    }

    public function uniqueBy()
    {
        return 'order_id';
    }

    public function onRow(Row $row)
    {
        $this->rowsProcessed++;
        $rowData = $row->toArray();

        $orderIdRaw = $rowData[9] ?? null;
        if (empty($orderIdRaw)) return;

        $orderId = is_string($orderIdRaw) && strtoupper(substr($orderIdRaw, 0, 2)) === 'SC' ? substr($orderIdRaw, 2) : $orderIdRaw;
        if (empty($orderId)) return;

        // Ambil data mentah dan bersihkan dari spasi
        $productValue = trim($rowData[0] ?? '');
        $layanan = trim($rowData[23] ?? '');

        // ======================== PERUBAHAN UTAMA DI SINI ========================
        // Cek apakah ini adalah layanan 'Pijar Mahir'
        $isPijarMahir = !empty($layanan) && stripos($layanan, 'mahir') !== false;

        if ($isPijarMahir) {
            // Jika ini adalah produk bundle (mengandung '-')
            if (str_contains($productValue, '-')) {
                // 1. Pecah produk menjadi array
                $products = explode('-', $productValue);

                // 2. Filter array, buang semua yang mengandung 'pijar'
                $validProducts = array_filter($products, function($product) {
                    return stripos(trim($product), 'pijar') === false;
                });

                // 3. Jika tidak ada produk valid yang tersisa, lewati baris ini
                if (empty($validProducts)) {
                    return;
                }

                // 4. Gabungkan kembali produk yang valid menjadi string
                $productValue = implode('-', $validProducts);

            } else {
                // Jika ini produk tunggal dan merupakan 'Pijar Mahir', lewati
                return;
            }
        }
        // =======================================================================

        // Filter untuk produk 'kidi'
        if (in_array(strtolower($productValue), ['kidi'])) {
            return;
        }

        $milestoneValue = trim($rowData[24] ?? '');
        $segmenN = trim($rowData[36] ?? '');
        $segment = (in_array($segmenN, ['RBS', 'SME'])) ? 'SME' : 'LEGS';
        $witel = trim($rowData[7] ?? '');

        // Filter untuk witel yang tidak diinginkan
        if (stripos($witel, 'JATENG') !== false) {
            return;
        }

        $existingRecord = DocumentData::where('order_id', $orderId)->first();
        $excelNetPrice = is_numeric($rowData[26] ?? null) ? (float) $rowData[26] : 0;

        if ($excelNetPrice > 0) {
            $netPrice = $excelNetPrice;
        } elseif ($existingRecord && $existingRecord->net_price > 0) {
            $netPrice = $existingRecord->net_price;
        } else {
            // Hitung harga berdasarkan productValue yang mungkin sudah diubah
            $netPrice = $this->calculatePrice($productValue, $segment, $witel);
        }

        $parseDate = function($date) {
            if (empty($date)) return null;
            if (is_numeric($date)) return Carbon::createFromTimestamp(($date - 25569) * 86400)->format('Y-m-d H:i:s');
            try { return Carbon::parse($date)->format('Y-m-d H:i:s'); } catch (\Exception $e) { return null; }
        };

        if ($milestoneValue && stripos($milestoneValue, 'QC') !== false) {
            $status_wfm = '';
        } else {
            $status_wfm = 'in progress';
            $doneMilestones = ['completed', 'complete', 'baso started', 'fulfill billing complete'];
            if ($milestoneValue && in_array(strtolower($milestoneValue), $doneMilestones)) {
                $status_wfm = 'done close bima';
            }
        }

        $newData = [
            'batch_id'           => $this->batchId,
            'order_id'           => $orderId,
            'product'            => $productValue, // Menggunakan productValue yang sudah bersih
            'net_price'          => $netPrice,
            'milestone'          => $milestoneValue,
            'previous_milestone' => null,
            'segment'            => $segment,
            'nama_witel'         => $witel,
            'status_wfm'         => $status_wfm,
            'products_processed' => false,
            'channel'            => ($rowData[2] ?? null) === 'hsi' ? 'SC-One' : ($rowData[2] ?? null),
            'filter_produk'      => $rowData[3] ?? null,
            'witel_lama'         => $rowData[11] ?? null,
            'layanan'            => $layanan,
            'order_date'         => $parseDate($rowData[4] ?? null),
            'order_status'       => $rowData[5] ?? null,
            'order_sub_type'     => $rowData[6] ?? null,
            'order_status_n'     => $rowData[27] ?? null,
            'customer_name'      => $rowData[18] ?? null,
            'tahun'              => $rowData[39] ?? null,
            'telda'              => $rowData[41] ?? null,
            'week'               => !empty($rowData[42]) ? Carbon::parse($rowData[42])->weekOfYear : null,
            'order_created_date' => $parseDate($rowData[8] ?? null),
        ];

        if ($existingRecord && $existingRecord->milestone !== $newData['milestone']) {
            $newData['previous_milestone'] = $existingRecord->milestone;
        } else if (!$existingRecord) {
            $newData['previous_milestone'] = null;
        }

        DocumentData::updateOrCreate(
            ['order_id' => $orderId],
            $newData
        );

        if ($productValue && str_contains($productValue, '-')) {
            OrderProduct::where('order_id', $orderId)->delete();
            $individualProducts = explode('-', $productValue);

            foreach ($individualProducts as $pName) {
                $pName = trim($pName);
                if (empty($pName)) continue;

                $individualPrice = $this->calculatePrice($pName, $segment, $witel);

                OrderProduct::create([
                    'order_id'     => $orderId,
                    'product_name' => $pName,
                    'net_price'    => $individualPrice,
                    'status_wfm'   => $status_wfm,
                    'channel'      => ($rowData[2] ?? null) === 'hsi' ? 'SC-One' : ($rowData[2] ?? null),
                ]);
            }
        }
    }
}

