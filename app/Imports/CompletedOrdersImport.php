<?php

namespace App\Imports;

use App\Models\CompletedOrder; // <-- Ganti model yang digunakan
use Maatwebsite\Excel\Concerns\ToCollection;
use Maatwebsite\Excel\Concerns\WithHeadingRow;
use Illuminate\Support\Facades\Log;

class CompletedOrdersImport implements ToCollection, WithHeadingRow
{
    public function collection($rows)
    {
        // Ambil semua order_id dari Excel, buang yang kosong
        $orderIds = collect($rows)->pluck('order_id')->filter()->unique()->all();

        if (empty($orderIds)) {
            Log::warning('Tidak ada order_id yang valid ditemukan di file order complete.');
            return;
        }

        // Siapkan data untuk dimasukkan ke tabel completed_orders
        $dataToInsert = array_map(function ($orderId) {
            return ['order_id' => $orderId];
        }, $orderIds);

        // Gunakan upsert: memasukkan data baru, mengabaikan jika order_id sudah ada.
        // Ini mencegah error jika file yang sama di-upload dua kali.
        CompletedOrder::upsert($dataToInsert, ['order_id']);

        Log::info('Berhasil mengimpor ' . count($dataToInsert) . ' order_id ke tabel sementara.');
    }
}
