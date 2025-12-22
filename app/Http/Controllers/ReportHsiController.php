<?php

namespace App\Http\Controllers;

use Inertia\Inertia;
use App\Models\HsiData;
use Illuminate\Http\Request;
use Carbon\Carbon;

class ReportHsiController extends Controller
{
    public function index(Request $request)
    {
        // 1. Setup Filter
        $startDate = $request->input('start_date');
        $endDate = $request->input('end_date');
        
        // Daftar Regional Utama (WITEL) yang diizinkan
        $allowedWitels = ['BALI', 'JATIM BARAT', 'JATIM TIMUR', 'SURAMADU', 'NUSA TENGGARA'];
        
        $thirtyDaysAgo = Carbon::now()->subDays(30);

        // 2. Ambil Data Mentah (Tambahkan kolom witel_old)
        $query = HsiData::query()
            ->select('witel', 'witel_old', 'status_resume', 'order_date') 
            ->whereIn('witel', $allowedWitels);

        if ($startDate && $endDate) {
            $query->whereDate('order_date', '>=', $startDate)
                  ->whereDate('order_date', '<=', $endDate);
        }

        $rawData = $query->get();

        // 3. LOGIKA AGREGASI BERTINGKAT (Regional -> Kota)
        // Grouping level 1: Berdasarkan Regional (WITEL)
        $reportData = $rawData->groupBy('witel')->map(function ($regionItems, $regionName) use ($thirtyDaysAgo) {
            
            // --- FUNGSI HITUNG (Reusable) ---
            $calculateStats = function($items) use ($thirtyDaysAgo) {
                $check = fn($i, $str) => str_contains(strtoupper($i->status_resume ?? ''), $str);
                $isPs = fn($i) => $check($i, 'PS') || $check($i, 'COMPLETED');
                $isCancel = fn($i) => $check($i, 'CANCEL');
                $isOpen = fn($i) => !$isPs($i) && !$isCancel($i);

                return [
                    'total_order' => $items->count(),
                    'total_ps' => $items->filter($isPs)->count(),
                    'total_cancel' => $items->filter($isCancel)->count(),
                    'total_open' => $items->filter($isOpen)->count(),
                    'open_more_30_days' => $items->filter(function($i) use ($isOpen, $thirtyDaysAgo) {
                        if (!$isOpen($i)) return false;
                        if (!$i->order_date) return false;
                        return Carbon::parse($i->order_date)->lt($thirtyDaysAgo);
                    })->count(),
                ];
            };

            // 1. Hitung Statistik Total untuk Regional ini (Header Biru)
            $regionStats = $calculateStats($regionItems);

            // 2. Grouping Level 2: Berdasarkan Kota (WITEL_OLD)
            $details = $regionItems->groupBy('witel_old')->map(function ($cityItems, $cityName) use ($calculateStats) {
                return array_merge(
                    ['name' => $cityName ?: 'LAIN-LAIN'], // Nama Kota
                    $calculateStats($cityItems) // Statistik Kota
                );
            })->sortBy('name')->values(); // Urutkan nama kota abjad

            return [
                'region_name' => $regionName,
                'stats' => $regionStats, // Data untuk baris biru
                'details' => $details    // Data untuk baris putih (anak-anaknya)
            ];

        })->sortBy('region_name')->values();

        // 4. Hitung Grand Total (Keseluruhan)
        // Kita bisa ambil dari rawData langsung biar cepat
        $checkGlobal = fn($i, $str) => str_contains(strtoupper($i->status_resume ?? ''), $str);
        $isPsGlobal = fn($i) => $checkGlobal($i, 'PS') || $checkGlobal($i, 'COMPLETED');
        $isCancelGlobal = fn($i) => $checkGlobal($i, 'CANCEL');
        $isOpenGlobal = fn($i) => !$isPsGlobal($i) && !$isCancelGlobal($i);

        $grandTotal = [
            'total_order' => $rawData->count(),
            'total_ps' => $rawData->filter($isPsGlobal)->count(),
            'total_cancel' => $rawData->filter($isCancelGlobal)->count(),
            'total_open' => $rawData->filter($isOpenGlobal)->count(),
            'open_more_30_days' => $rawData->filter(function($i) use ($isOpenGlobal, $thirtyDaysAgo) {
                if (!$isOpenGlobal($i)) return false;
                if (!$i->order_date) return false;
                return Carbon::parse($i->order_date)->lt($thirtyDaysAgo);
            })->count(),
        ];

        return Inertia::render('ReportHsi', [
            'reportData' => $reportData,
            'grandTotal' => $grandTotal,
            'filters' => $request->only(['start_date', 'end_date']),
        ]);
    }
}