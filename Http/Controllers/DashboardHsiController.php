<?php

namespace App\Http\Controllers;

use Inertia\Inertia;
use App\Models\HsiData;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardHsiController extends Controller
{
    public function index(Request $request)
    {
        $query = HsiData::query();

        // Filter Witel jika dipilih
        if ($request->has('witel') && $request->witel != '') {
            $query->where('witel', $request->witel);
        }

        // --- DATA UNTUK GAMBAR 1 (Bar Chart: Order per Witel) ---
        $dataChart1 = (clone $query)
            ->select('witel', DB::raw('count(*) as total'))
            ->groupBy('witel')
            ->orderBy('total', 'desc')
            ->get()
            ->map(function ($item) {
                return ['name' => $item->witel, 'value' => $item->total];
            });

        // --- DATA UNTUK GAMBAR 2 (Pie Chart: Status Order) ---
        $dataChart2 = (clone $query)
            ->select('status', DB::raw('count(*) as total'))
            ->groupBy('status')
            ->get()
            ->map(function ($item) {
                return ['name' => $item->status ?? 'Unknown', 'value' => $item->total];
            });

        // --- DATA UNTUK GAMBAR 3 (Bar Chart: Jenis Layanan/Produk) ---
        $dataChart3 = (clone $query)
            ->select('jenis_layanan', DB::raw('count(*) as total')) // Pastikan kolom 'jenis_layanan' ada di DB
            ->groupBy('jenis_layanan')
            ->orderBy('total', 'desc')
            ->limit(10)
            ->get()
            ->map(function ($item) {
                return ['name' => $item->jenis_layanan ?? 'Others', 'value' => $item->total];
            });

        // List Witel untuk Dropdown Filter
        $witels = HsiData::select('witel')->distinct()->orderBy('witel')->pluck('witel');

        return Inertia::render('DashboardHSI', [
            'chart1' => $dataChart1,
            'chart2' => $dataChart2,
            'chart3' => $dataChart3,
            'witels' => $witels,
            'selectedWitel' => $request->witel,
        ]);
    }
}