<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\HsiData;
use Maatwebsite\Excel\Facades\Excel;
use App\Imports\HsiDataImport; // Pastikan ini ada
use Illuminate\Support\Facades\Schema;

class ReportHsiAdminController extends Controller
{
    public function index(Request $request)
    {
        $allowedWitels = ['BALI', 'JATIM BARAT', 'JATIM TIMUR', 'SURAMADU', 'NUSA TENGGARA'];

        $query = HsiData::query()->whereIn('witel', $allowedWitels);

        if ($request->has('search') && $request->search != '') {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('nomor_order', 'like', '%' . $search . '%')
                ->orWhere('speedy', 'like', '%' . $search . '%')
                ->orWhere('witel', 'like', '%' . $search . '%')
                ->orWhere('status_resume', 'like', '%' . $search . '%');
            });
        }

        $data = $query->latest()->paginate(10)->withQueryString();

        return Inertia::render('Admin/ReportHsi', [
            'hsiData' => $data,
            'filters' => $request->only(['search']),
        ]);
    }

    /**
     * IMPORT DENGAN PILIHAN FORMAT TANGGAL
     */
    public function store(Request $request)
    {
        $request->validate([
            'file' => 'required|mimes:xlsx,xls,csv|max:10240',
            'date_format' => 'nullable|in:m/d/Y,d/m/Y,Y-m-d', 
        ]);

        try {
            // PENTING: Default ke 'm/d/Y' (Format US/Excel Anda)
            // Jadi kalau dropdown belum dipilih, dia otomatis pakai logika Bulan Dulu
            $dateFormat = $request->input('date_format', 'm/d/Y'); 

            Excel::import(new HsiDataImport($dateFormat), $request->file('file'));

            return redirect()->back()->with('success', 'Import Berhasil dengan Format: ' . $dateFormat);
        } catch (\Exception $e) {
            return redirect()->back()->with('error', 'Gagal: ' . $e->getMessage());
        }
    }

    public function destroyAll()
    {
        try {
            Schema::disableForeignKeyConstraints();
            HsiData::truncate();
            Schema::enableForeignKeyConstraints();
            return redirect()->back()->with('success', 'Database BERHASIL dikosongkan!');
        } catch (\Exception $e) {
            return redirect()->back()->with('error', 'Gagal reset: ' . $e->getMessage());
        }
    }

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