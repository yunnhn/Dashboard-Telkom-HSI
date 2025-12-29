<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\HsiData;
use Maatwebsite\Excel\Facades\Excel;
use App\Imports\HsiDataImport;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

class ReportHsiAdminController extends Controller
{
    /**
     * HALAMAN ADMIN: LIST DATA, UPLOAD, & RESET
     * Menampilkan data mentah dengan Pagination & Search
     */
    public function index(Request $request)
    {
        // 1. Setup Konfigurasi Memori (Penting untuk data besar)
        set_time_limit(300);
        ini_set('memory_limit', '512M');

        // 2. Scope Wilayah (RSO 2)
        $query = HsiData::query();

        // 3. Fitur Pencarian Global
        if ($request->has('search') && $request->search != '') {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('order_id', 'like', "%{$search}%")      // Sesuaikan nama kolom DB
                  ->orWhere('track_id', 'like', "%{$search}%")    // Biasa dipakai utk SC ID/Speedy
                  ->orWhere('customer_name', 'like', "%{$search}%")
                  ->orWhere('witel', 'like', "%{$search}%")
                  ->orWhere('status_resume', 'like', "%{$search}%");
            });
        }

        // 4. Ambil Data (Paginate 10 per halaman)
        // Gunakan orderBy order_date agar data tanggal terbaru muncul di atas
        $data = $query->orderBy('order_date', 'desc') 
                      ->paginate(10)
                      ->withQueryString();

        // 5. Render ke Frontend Admin
        // Pastikan file: resources/js/Pages/Admin/ReportHsi.jsx ada
        return Inertia::render('Admin/ReportHsi', [
            'hsiData' => $data, // Data Tabel (Pagination)
            'filters' => $request->only(['search']),
        ]);
    }

    /**
     * IMPORT DATA EXCEL
     */
    public function store(Request $request)
    {
        $request->validate([
            'file' => 'required|mimes:xlsx,xls,csv|max:20480', // Max 20MB
            'date_format' => 'nullable|in:m/d/Y,d/m/Y,Y-m-d',  // Pilihan format tanggal
        ]);

        try {
            // Default format jika tidak dipilih user: m/d/Y (Format US/Excel Default)
            $dateFormat = $request->input('date_format', 'm/d/Y'); 

            // Pastikan Class HsiDataImport menerima constructor $dateFormat
            Excel::import(new HsiDataImport($dateFormat), $request->file('file'));

            return redirect()->back()->with('success', 'Import Berhasil. Format Tanggal: ' . $dateFormat);
        } catch (\Exception $e) {
            // Tangkap error detail untuk debugging
            return redirect()->back()->with('error', 'Gagal Import: ' . $e->getMessage());
        }
    }

    /**
     * HAPUS SEMUA DATA (RESET DATABASE)
     */
    public function destroyAll()
    {
        try {
            // Matikan Foreign Key Check agar Truncate lancar
            Schema::disableForeignKeyConstraints();
            HsiData::truncate();
            Schema::enableForeignKeyConstraints();

            return redirect()->back()->with('success', 'Database BERHASIL dikosongkan!');
        } catch (\Exception $e) {
            return redirect()->back()->with('error', 'Gagal reset database: ' . $e->getMessage());
        }
    }

    /**
     * HAPUS SATU DATA
     */
    public function destroy($id)
    {
        try {
            $data = HsiData::findOrFail($id);
            $data->delete();
            return redirect()->back()->with('success', 'Data berhasil dihapus.');
        } catch (\Exception $e) {
            return redirect()->back()->with('error', 'Gagal hapus data: ' . $e->getMessage());
        }
    }
}