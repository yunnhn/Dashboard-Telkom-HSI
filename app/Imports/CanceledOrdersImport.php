<?php

namespace App\Imports;

use App\Models\CanceledOrder;
use Illuminate\Support\Collection; // <-- Tambahkan ini
use Maatwebsite\Excel\Concerns\ToCollection;
use Maatwebsite\Excel\Concerns\WithHeadingRow;
use Illuminate\Support\Facades\Log;

class CanceledOrdersImport implements ToCollection, WithHeadingRow
{
    public function collection(Collection $rows)
    {
        $orderIds = $rows->pluck('order_id')->filter()->unique()->all();

        if (empty($orderIds)) {
            Log::warning('Tidak ada order_id yang valid ditemukan di file order cancel.');
            return;
        }

        $dataToInsert = array_map(function ($orderId) {
            return ['order_id' => $orderId, 'created_at' => now(), 'updated_at' => now()];
        }, $orderIds);

        // Gunakan upsert untuk efisiensi
        CanceledOrder::upsert($dataToInsert, ['order_id']);

        Log::info('Berhasil mengimpor ' . count($dataToInsert) . ' order_id cancel ke tabel sementara.');
    }
}
