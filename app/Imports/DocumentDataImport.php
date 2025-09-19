<?php

namespace App\Imports;

use App\Models\DocumentData;
use Maatwebsite\Excel\Concerns\ToModel;
use Maatwebsite\Excel\Concerns\WithStartRow;
use Carbon\Carbon;

class DocumentDataImport implements ToModel, WithStartRow
{
    /**
     * @return int
     */
    public function startRow(): int
    {
        return 2;
    }

    public function model(array $row)
    {
        $orderIdRaw = $row[9] ?? null;
        $namaProduk = $row[0] ?? null;
        $namaWitel  = $row[7] ?? null;
        $layanan    = $row[23] ?? null;

        if (
            empty($orderIdRaw) ||
            str_contains(strtolower($namaProduk ?? ''), 'kidi') ||
            str_contains(strtoupper($namaWitel ?? ''), 'JATENG') ||
            (str_contains(strtolower($layanan ?? ''), 'mahir') && !str_contains($namaProduk ?? '', '-'))
            ) {
                return null;
        }

        $parseDate = fn($date) => empty($date) ? null : Carbon::parse($date)->format('Y-m-d H:i:s');

        $orderId = is_string($orderIdRaw) && strtoupper(substr($orderIdRaw, 0, 2)) === 'SC'
            ? substr($orderIdRaw, 2) : $orderIdRaw;

        if (empty($orderId)) {
            return null;
        }

        $segmenN = $row[36] ?? null;
        $segment = (in_array($segmenN, ['RBS', 'SME'])) ? 'SME' : 'LEGS';

        $milestoneValue = $row[24] ?? null;

        $status_wfm = 'in progress';
        $doneMilestones = ['completed', 'complete', 'baso started', 'fulfill billing complete'];

        if ($milestoneValue && in_array(strtolower(trim($milestoneValue ?? '')), $doneMilestones)) {
            $status_wfm = 'done close bima';
        }

        $productValue = $row[0] ?? null;

        if (is_string($productValue) && strtolower(trim($productValue)) === 'null') {
            $productValue = null;
        }

        $channel = $row[2] ?? null;

        $dataToUpdate = [
            'product'           => $productValue,
            'channel'           => ($channel === 'hsi') ? 'SC-One' : $channel,
            'filter_produk'     => $row[3] ?? '',
            'witel_lama'        => $row[11] ?? null,
            'layanan'           => $layanan,
            'order_date'        => $parseDate($row[4] ?? null),
            'order_status'      => $row[5] ?? null,
            'order_sub_type'    => $row[6] ?? null,
            'order_status_n'    => $row[27] ?? null,
            'nama_witel'        => $namaWitel,
            'customer_name'     => $row[19] ?? null,
            'milestone'         => $milestoneValue,
            'segment'           => $segment,
            'tahun'             => $row[39] ?? null,
            'telda'             => $row[41] ?? null,
            'week'              => !empty($row[42]) ? Carbon::parse($row[42])->weekOfYear : null,
            'order_created_date'=> $parseDate($row[8] ?? null),
            'status_wfm'        => $status_wfm,
            'products_processed'=> false,
        ];

        $existingData = DocumentData::find($orderId);
        $excelNetPrice = trim($row[26] ?? '') !== '' ? (float) ($row[26]) : 0;

        if ($existingData && $existingData->net_price > 0) {
            $dataToUpdate['net_price'] = $existingData->net_price;
        } elseif ($excelNetPrice > 0) {
            $dataToUpdate['net_price'] = $excelNetPrice;
        } else {
            $tempOrderData = new DocumentData($dataToUpdate);
            $dataToUpdate['net_price'] = $this->calculateProductPrice($productValue ?? '', $tempOrderData);
        }

        DocumentData::updateOrCreate(['order_id' => $orderId], $dataToUpdate);

        return null;
    }

    private function calculateProductPrice(string $productName, DocumentData $order): int
    {
        // [PERBAIKAN] Menambahkan '?? ''' untuk menangani data order yang mungkin kosong
        $witel = strtoupper(trim($order->nama_witel ?? ''));
        $segment = strtoupper(trim($order->segment ?? ''));

        switch (strtolower(trim($productName))) {
            case 'netmonk':
                return ($segment === 'LEGS')
                    ? 26100
                    : (($witel === 'BALI') ? 26100 : 21600);
            case 'oca':
                return ($segment === 'LEGS')
                    ? 104000
                    : (($witel === 'NUSA TENGGARA') ? 104000 : 103950);
            case 'antares eazy':
                return 35000;
            case 'pijar sekolah':
                return 582750;
            default:
                return 0;
        }
    }
}
