<?php

namespace App\Imports;

use App\Models\DocumentData;
use App\Traits\CalculatesProductPrice;
use Maatwebsite\Excel\Concerns\OnEachRow;
use Maatwebsite\Excel\Concerns\WithStartRow;
use Maatwebsite\Excel\Row;
use Illuminate\Support\Facades\Log;
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
                    // Kurangi baris header dari total
                    $this->totalRows = $totalRows[array_key_first($totalRows)] - $this->startRow() + 1;
                }
            },
            AfterChunk::class => function(AfterChunk $event) {
                // LANGKAH 3: Gunakan properti $rowsProcessed yang sudah kita hitung
                $percentage = ($this->totalRows > 0)
                    ? round(($this->rowsProcessed / $this->totalRows) * 100)
                    : 0;

                // Pastikan persentase tidak lebih dari 100
                $percentage = min($percentage, 100);

                Cache::put('import_progress_' . $this->batchId, $percentage, 600);
            },
        ];
    }

    // Tentukan ukuran chunk, misalnya 200 baris per proses
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

        // 1. Ambil semua data mentah dari baris Excel terlebih dahulu
        $productValue = $rowData[0] ?? null;
        $milestoneValue = $rowData[24] ?? null;
        $segmenN = $rowData[36] ?? null;
        $segment = (in_array($segmenN, ['RBS', 'SME'])) ? 'SME' : 'LEGS';
        $witel = $rowData[7] ?? null;
        $layanan = $rowData[23] ?? null;

        if (in_array($productValue, ['kidi', 'bigbox'])) {
            return; // Hentikan proses untuk baris ini dan lanjut ke baris berikutnya
        }

        // Filter untuk witel yang tidak diinginkan
        if (stripos($witel, 'JATENG') !== false) {
            return;
        }

        // Filter untuk product pijar mahir yang tidak diinginkan
        if (str_contains($layanan, 'mahir') && !str_contains($productValue, '-')) {
            return; // Lewati baris ini dan jangan proses ke database
        }

        // 2. Cari data lama (jika ada) di database
        $existingRecord = DocumentData::where('order_id', $orderId)->first();

        // 3. Logika final untuk menentukan net_price dengan prioritas
        $excelNetPrice = is_numeric($rowData[26] ?? null) ? (float) $rowData[26] : 0;

        if ($excelNetPrice > 0) {
            $netPrice = $excelNetPrice;
        } elseif ($existingRecord && $existingRecord->net_price > 0) {
            $netPrice = $existingRecord->net_price;
        } elseif ($excelNetPrice = 0) {
            $netPrice = $this->calculatePrice($productValue, $segment, $witel);
        } else {
            $netPrice = $this->calculatePrice($productValue, $segment, $witel);
        }

        $parseDate = function($date) {
            if (empty($date)) return null;
            if (is_numeric($date)) return Carbon::createFromTimestamp(($date - 25569) * 86400)->format('Y-m-d H:i:s');
            try { return Carbon::parse($date)->format('Y-m-d H:i:s'); } catch (\Exception $e) { return null; }
        };

        $milestoneValue = $rowData[24] ?? null;

        if ($milestoneValue && stripos($milestoneValue, 'QC') !== false) {
            $status_wfm = '';
        } else {
            $status_wfm = 'in progress';
            $doneMilestones = ['completed', 'complete', 'baso started', 'fulfill billing complete'];
            if ($milestoneValue && in_array(strtolower(trim($milestoneValue)), $doneMilestones)) {
                $status_wfm = 'done close bima';
            }
        }

        $newData = [
            'batch_id'           => $this->batchId,
            'order_id'           => $orderId,
            'product'            => $productValue,
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
            $newData['previous_milestone'] = null; // Pastikan null untuk record baru
        }

        DocumentData::updateOrCreate(
            ['order_id' => $orderId], // Kondisi pencarian
            $newData                   // Data untuk di-update atau di-create
        );

        if ($productValue && str_contains($productValue, '-')) {
            // Hapus data bundle lama untuk order_id ini untuk memastikan data bersih
            \App\Models\OrderProduct::where('order_id', $orderId)->delete();

            // Pecah nama produk bundle berdasarkan tanda '-'
            $individualProducts = explode('-', $productValue);

            foreach ($individualProducts as $pName) {
                $pName = trim($pName);
                if (empty($pName)) continue;

                // Dapatkan harga template untuk setiap produk individual
                $individualPrice = $this->calculatePrice($pName, $segment, $witel);

                // Simpan setiap produk individual ke tabel order_products
                \App\Models\OrderProduct::create([
                    'order_id' => $orderId,
                    'product_name' => $pName,
                    'net_price' => $individualPrice,
                    // Isi kolom lain yang relevan dari data baris utama
                    'status_wfm' => $status_wfm,
                    'channel' => ($rowData[2] ?? null) === 'hsi' ? 'SC-One' : ($rowData[2] ?? null),
                ]);
            }
        }
    }
}
