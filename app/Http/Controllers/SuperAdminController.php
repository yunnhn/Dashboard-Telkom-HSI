<?php

namespace App\Http\Controllers;

use App\Models\DocumentData;
use App\Models\JtData; // [BARU] Impor model JT
use App\Models\SosData; // [BARU] Impor model Datin/SOS
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Redirect;
use Inertia\Inertia;

class SuperAdminController extends Controller
{
    /**
     * [MODIFIKASI] Menampilkan halaman rollback batch untuk SEMUA sistem.
     */
    public function showRollbackPage()
    {
        // 1. Ambil batch untuk Digital Product
        $recentBatchesDP = DocumentData::select('batch_id', DB::raw('MAX(created_at) as last_upload_time'))
            ->whereNotNull('batch_id')
            ->groupBy('batch_id')
            ->orderBy('last_upload_time', 'desc')
            ->limit(20)
            ->get();

        // 2. Ambil batch untuk Analysis JT (spmk_mom)
        $recentBatchesJT = JtData::select('batch_id', DB::raw('MAX(created_at) as last_upload_time'))
            ->whereNotNull('batch_id')
            ->groupBy('batch_id')
            ->orderBy('last_upload_time', 'desc')
            ->limit(20)
            ->get();

        // 3. Ambil batch untuk Analysis Datin (sos_data)
        // Pastikan model 'SosData' Anda menunjuk ke tabel 'sos_data'
        $recentBatchesDatin = SosData::select('batch_id', DB::raw('MAX(created_at) as last_upload_time'))
            ->whereNotNull('batch_id')
            ->groupBy('batch_id')
            ->orderBy('last_upload_time', 'desc')
            ->limit(20)
            ->get();

        return Inertia::render('SuperAdmin/RollbackPage', [
            'recentBatches' => $recentBatchesDP,
            'recentBatchesJT' => $recentBatchesJT,
            'recentBatchesDatin' => $recentBatchesDatin,
        ]);
    }

    /**
     * Mengeksekusi rollback untuk Digital Product.
     * (Fungsi ini tetap sama).
     */
    public function executeRollback(Request $request)
    {
        // 1. Validasi input
        $validated = $request->validate([
            'batch_id' => 'required|string|exists:document_data,batch_id',
        ], [
            'batch_id.exists' => 'Batch ID ini tidak ditemukan di database Digital Product.',
        ]);

        $batchId = $validated['batch_id'];
        Log::warning('Super Admin ['.auth()->id()."] memulai rollback [Digital Product] untuk Batch ID: {$batchId}");

        try {
            DB::transaction(function () use ($batchId) {
                // Kumpulkan semua Order ID yang terkait dengan batch ini
                $orderIds = DB::table('document_data')
                                ->where('batch_id', $batchId)
                                ->pluck('order_id');

                if ($orderIds->isEmpty()) {
                    return; // Tidak ada yang perlu dihapus
                }

                // 1. Hapus dari tabel 'order_products' (data bundling)
                $deletedBundles = DB::table('order_products')->whereIn('order_id', $orderIds)->delete();
                Log::info("Rollback Batch [{$batchId}]: {$deletedBundles} baris dihapus dari order_products.");

                // 2. Hapus dari tabel 'update_logs'
                $deletedLogs = DB::table('update_logs')->whereIn('order_id', $orderIds)->delete();
                Log::info("Rollback Batch [{$batchId}]: {$deletedLogs} baris dihapus dari update_logs.");

                // 3. Hapus dari tabel 'document_data' (Tabel utama)
                $deletedDocs = DB::table('document_data')->where('batch_id', $batchId)->delete();
                Log::info("Rollback Batch [{$batchId}]: {$deletedDocs} baris dihapus dari document_data.");
            });

            return Redirect::back()->with('success', "Rollback (Digital Product) untuk Batch ID: {$batchId} berhasil. Semua data terkait telah dihapus.");
        } catch (\Exception $e) {
            Log::error("Gagal melakukan rollback batch [Digital Product] {$batchId}: ".$e->getMessage());

            return Redirect::back()->with('error', 'Gagal melakukan rollback. Silakan cek log sistem.');
        }
    }

    /**
     * [BARU] Mengeksekusi rollback untuk Analysis JT (spmk_mom).
     */
    public function executeRollbackJT(Request $request)
    {
        $validated = $request->validate([
            'batch_id' => 'required|string|exists:spmk_mom,batch_id', // Validasi ke spmk_mom
        ], [
            'batch_id.exists' => 'Batch ID ini tidak ditemukan di tabel JT (spmk_mom).',
        ]);

        $batchId = $validated['batch_id'];
        Log::warning('Super Admin ['.auth()->id()."] memulai rollback [Analysis JT] untuk Batch ID: {$batchId}");

        try {
            // Untuk JT, kita hanya perlu menghapus dari satu tabel
            $deletedRows = DB::table('spmk_mom')->where('batch_id', $batchId)->delete();

            Log::info("Rollback JT Batch [{$batchId}]: {$deletedRows} baris dihapus dari spmk_mom.");

            return Redirect::back()->with('success', "Rollback (Analysis JT) untuk Batch ID: {$batchId} berhasil. Total {$deletedRows} baris telah dihapus.");
        } catch (\Exception $e) {
            Log::error("Gagal melakukan rollback batch [Analysis JT] {$batchId}: ".$e->getMessage());

            return Redirect::back()->with('error', 'Gagal melakukan rollback. Silakan cek log sistem.');
        }
    }

    /**
     * [BARU] Mengeksekusi rollback untuk Analysis Datin (sos_data).
     */
    public function executeRollbackDatin(Request $request)
    {
        $validated = $request->validate([
            'batch_id' => 'required|string|exists:sos_data,batch_id', // Validasi ke sos_data
        ], [
            'batch_id.exists' => 'Batch ID ini tidak ditemukan di tabel Datin (sos_data).',
        ]);

        $batchId = $validated['batch_id'];
        Log::warning('Super Admin ['.auth()->id()."] memulai rollback [Analysis Datin] untuk Batch ID: {$batchId}");

        try {
            // Untuk Datin, kita hanya perlu menghapus dari satu tabel
            $deletedRows = DB::table('sos_data')->where('batch_id', $batchId)->delete();

            Log::info("Rollback Datin Batch [{$batchId}]: {$deletedRows} baris dihapus dari sos_data.");

            return Redirect::back()->with('success', "Rollback (Analysis Datin) untuk Batch ID: {$batchId} berhasil. Total {$deletedRows} baris telah dihapus.");
        } catch (\Exception $e) {
            Log::error("Gagal melakukan rollback batch [Analysis Datin] {$batchId}: ".$e->getMessage());

            return Redirect::back()->with('error', 'Gagal melakukan rollback. Silakan cek log sistem.');
        }
    }
}
