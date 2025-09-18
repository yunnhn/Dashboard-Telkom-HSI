<?php

namespace App\Http\Controllers;

use App\Models\DocumentData;
use App\Models\OrderProduct; // Import yang hilang
use Illuminate\Database\Eloquent\ModelNotFoundException; // Import untuk error handling
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Redirect;

class ManualUpdateController extends Controller
{
    /**
     * Memperbarui status_wfm menjadi 'done close bima' untuk order_id tertentu.
     */
    public function complete(Request $request, $order_id)
    {
        try {
            // Gunakan findOrFail untuk keamanan, langsung error jika tidak ada
            // Ini bekerja karena Model DocumentData sudah kita perbaiki
            $document = DocumentData::findOrFail($order_id);

            // PERBAIKAN LOGIKA: Mengubah kolom yang benar
            $document->status_wfm = 'done close bima'; // Ini sudah benar
            $document->order_status_n = 'Complete'; // Tambahkan ini untuk konsistensi
            $document->milestone = 'Completed Manually'; // Tambahkan milestone baru
            $document->save(); // save() akan update `updated_at` secara otomatis

            return Redirect::back()->with('success', "Order ID {$order_id} berhasil ditandai sebagai Selesai.");
        } catch (ModelNotFoundException $e) {
            Log::warning("Gagal menandai selesai, Order ID {$order_id} tidak ditemukan.");
            return Redirect::back()->with('error', "Order ID {$order_id} tidak ditemukan.");
        }
    }

    /**
     * Menghapus data order dari tabel document_data dan order_products.
     */
    public function cancel(Request $request, $order_id)
    {
        try {
            DB::transaction(function () use ($order_id) {
                // Pastikan data ada sebelum mencoba menghapus relasi
                $document = DocumentData::findOrFail($order_id);

                // 1. Hapus semua produk dari tabel relasi
                OrderProduct::where('order_id', $order_id)->delete();

                // 2. Hapus data utama
                $document->delete();
            });

            return Redirect::back()->with('success', "Order ID {$order_id} berhasil dibatalkan dan dihapus.");
        } catch (ModelNotFoundException $e) {
            Log::warning("Gagal membatalkan, Order ID {$order_id} tidak ditemukan.");
            return Redirect::back()->with('error', "Order ID {$order_id} tidak ditemukan.");
        } catch (\Exception $e) {
            Log::error("Gagal membatalkan order {$order_id}: " . $e->getMessage());
            return Redirect::back()->with('error', "Terjadi kesalahan saat membatalkan Order ID {$order_id}.");
        }
    }
}
