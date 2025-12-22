<?php

namespace App\Http\Controllers;

use Inertia\Inertia;
use App\Models\HsiData;
use Illuminate\Http\Request;
use Carbon\Carbon; // <--- PASTIKAN INI ADA

class ReportHsiController extends Controller
{
    public function index(Request $request)
    {
        $startDate = $request->input('start_date');
        $endDate = $request->input('end_date');
        $allowedWitels = ['BALI', 'JATIM BARAT', 'JATIM TIMUR', 'SURAMADU', 'NUSA TENGGARA'];
        
        // --- LOGIKA FILTER TANGGAL TETAP DIPERTAHANKAN ---
        $thirtyDaysAgo = Carbon::now()->subDays(30); 

        $query = HsiData::query()
            ->select('witel', 'witel_old', 'status_resume', 'order_date') 
            ->whereIn('witel', $allowedWitels);

        if ($startDate && $endDate) {
            $query->whereDate('order_date', '>=', $startDate)
                  ->whereDate('order_date', '<=', $endDate);
        }

        $rawData = $query->get();

        $reportData = $rawData->groupBy('witel')->map(function ($regionItems, $regionName) use ($thirtyDaysAgo) {
            
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
                    
                    // --- PERHITUNGAN TETAP ADA (TAPI NANTI TIDAK DITAMPILKAN) ---
                    'open_more_30_days' => $items->filter(function($i) use ($isOpen, $thirtyDaysAgo) {
                        if (!$isOpen($i)) return false;
                        if (!$i->order_date) return false;
                        return Carbon::parse($i->order_date)->lt($thirtyDaysAgo);
                    })->count(),
                ];
            };

            $regionStats = $calculateStats($regionItems);

            $details = $regionItems->groupBy('witel_old')->map(function ($cityItems, $cityName) use ($calculateStats) {
                return array_merge(
                    ['name' => $cityName ?: 'LAIN-LAIN'],
                    $calculateStats($cityItems)
                );
            })->sortBy('name')->values();

            return [
                'region_name' => $regionName,
                'stats' => $regionStats,
                'details' => $details
            ];

        })->sortBy('region_name')->values();

        // Hitung Grand Total (Logic Tetap Ada)
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