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
use Illuminate\Support\Facades\File; // Tambahan untuk manipulasi file/folder
use ZipArchive; // Tambahan untuk membuka ZIP

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
        $allowedWitels = ['BALI', 'JATIM BARAT', 'JATIM TIMUR', 'SURAMADU', 'NUSA TENGGARA', 'JAWA TIMUR'];

        $query = HsiData::query()->whereIn('witel', $allowedWitels);

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
        return Inertia::render('Admin/ReportHsi', [
            'hsiData' => $data, // Data Tabel (Pagination)
            'filters' => $request->only(['search']),
        ]);
    }

    /**
     * IMPORT DATA (SUPPORT EXCEL & ZIP BESAR)
     */
    public function store(Request $request)
    {
        // 1. Validasi File (Izinkan Excel & Zip, Max 2GB)
        $request->validate([
            'file' => 'required|mimes:xlsx,xls,csv,zip|max:2048000', // 2048 MB = 2 GB
            'date_format' => 'nullable|in:m/d/Y,d/m/Y,Y-m-d',  // Pilihan format tanggal
        ]);

        // Naikkan limit server khusus untuk proses ini
        ini_set('memory_limit', '2048M');
        set_time_limit(3600); // 1 Jam

        try {
            $dateFormat = $request->input('date_format', 'm/d/Y'); 
            $file = $request->file('file');
            $extension = $file->getClientOriginalExtension();
            $realPath = $file->getPathname();

            // === LOGIC IMPORT ZIP ===
            if ($extension === 'zip') {
                $zip = new ZipArchive;
                if ($zip->open($realPath) === TRUE) {
                    // Buat folder temporary unik agar tidak bentrok antar user
                    $extractPath = storage_path('app/temp_import_admin/' . uniqid());
                    
                    // Pastikan folder ada
                    if (!File::exists($extractPath)) {
                        File::makeDirectory($extractPath, 0755, true);
                    }

                    $zip->extractTo($extractPath);
                    $zip->close();

                    // Cari file Excel/CSV di dalam folder hasil ekstrak
                    $files = File::allFiles($extractPath);
                    $targetFile = null;
                    
                    foreach ($files as $f) {
                        if (in_array(strtolower($f->getExtension()), ['xlsx', 'xls', 'csv'])) {
                            $targetFile = $f;
                            break; // Ambil file excel pertama yang ketemu
                        }
                    }

                    if (!$targetFile) {
                        // Bersihkan jika gagal
                        File::deleteDirectory($extractPath);
                        return redirect()->back()->with('error', 'File ZIP tidak berisi file Excel (.xlsx/.xls) atau CSV yang valid.');
                    }

                    // Lakukan Import
                    Excel::import(new HsiDataImport($dateFormat), $targetFile->getPathname());

                    // Hapus folder temp setelah selesai
                    File::deleteDirectory($extractPath);
                    
                } else {
                    return redirect()->back()->with('error', 'Gagal mengekstrak file ZIP.');
                }
            } 
            // === LOGIC IMPORT EXCEL BIASA ===
            else {
                Excel::import(new HsiDataImport($dateFormat), $file);
            }

            return redirect()->back()->with('success', 'Import Berhasil! Format Tanggal: ' . $dateFormat);

        } catch (\Exception $e) {
            // Bersihkan folder temp jika terjadi error di tengah jalan (opsional, tapi baik untuk maintenance)
            // if (isset($extractPath) && File::exists($extractPath)) { File::deleteDirectory($extractPath); }

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