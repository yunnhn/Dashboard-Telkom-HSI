<?php

namespace App\Http\Controllers;

use App\Models\DocumentData; // Untuk Datin & Galaksi
use App\Models\SpmkMom;      // Untuk JT (Asumsi dari ReportJTController)
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;

class DataUpdateController extends Controller
{
    public function updateStatus(Request $request)
    {
        // 1. Otorisasi (Pastikan hanya admin)
        // Ganti 'admin' dengan nama role Anda yang sebenarnya
        if (Auth::user()->role !== 'admin') {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        // 2. Validasi Input
        $validated = $request->validate([
            'type' => ['required', 'string', Rule::in(['datin', 'jt', 'galaksi'])],
            'identifier' => 'required|string|max:100', // Ini bisa order_id atau ihld
            'field' => 'required|string|max:100',      // Kolom yg diupdate (misal: 'milestone')
            'new_status' => 'required|string|max:255',
        ]);

        $type = $validated['type'];
        $id = $validated['identifier'];
        $field = $validated['field'];
        $status = $validated['new_status'];
        $success = false;

        try {
            // 3. Logika Update berdasarkan Tipe
            switch ($type) {
                case 'datin':
                case 'galaksi':
                    // Asumsi Datin & Galaksi pakai tabel dan ID yang sama
                    $order = DocumentData::where('order_id', $id)->first();
                    if ($order) {
                        $order->{$field} = $status; // Update kolom dinamis
                        $order->save();
                        $success = true;
                    }
                    break;

                case 'jt':
                    // Asumsi JT pakai 'id_i_hld' sebagai identifier unik
                    // dan model 'SpmkMom' (dari ReportJTController)
                    $project = SpmkMom::where('id_i_hld', $id)->first();
                    if ($project) {
                        $project->{$field} = $status; // misal: 'status_tomps'
                        $project->save();
                        $success = true;
                    }
                    break;
            }

            if ($success) {
                return response()->json(['message' => 'Status berhasil diperbarui!']);
            } else {
                return response()->json(['error' => 'Data tidak ditemukan'], 404);
            }
        } catch (\Exception $e) {
            return response()->json(['error' => 'Gagal memperbarui: '.$e->getMessage()], 500);
        }
    }
}
