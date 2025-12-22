<?php

namespace App\Http\Controllers;

use Inertia\Inertia;
use App\Models\HsiData;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Imports\HsiDataImport;        // <--- WAJIB: Import Class Import
use Maatwebsite\Excel\Facades\Excel;  // <--- WAJIB: Import Facade Excel

class DashboardHsiController extends Controller
{
    /**
     * Menampilkan Halaman Dashboard & Data Grafik
     */
    public function index(Request $request)
    {
        // 1. Ambil Input Tanggal dari Frontend
        $startDate = $request->input('start_date');
        $endDate = $request->input('end_date');

        // 2. Setup Dasar & Filter Witel
        $allowedWitels = ['BALI', 'JATIM BARAT', 'JATIM TIMUR', 'SURAMADU', 'NUSA TENGGARA'];
        
        // --- QUERY DASAR (BASE QUERY) ---
        // Kita siapkan query awal yang sudah difilter Witel
        $baseQuery = HsiData::query()->whereIn('witel', $allowedWitels);

        // --- FILTER TANGGAL TERAPKAN DI SINI (PENTING) ---
        // Menggunakan whereDate agar '2025-12-04' cocok dengan '2025-12-04 11:53:00'
        if ($startDate && $endDate) {
            $baseQuery->whereDate('order_date', '>=', $startDate)
                      ->whereDate('order_date', '<=', $endDate);
        }

        // --- CHART 1: SEBARAN REGIONAL ---
        $chart1 = (clone $baseQuery)
            ->select('witel as nama_witel', DB::raw("'Total' as product"), DB::raw('count(*) as total_amount'))
            ->groupBy('witel')->orderBy('total_amount', 'desc')->get()
            ->map(fn($item) => ['product' => $item->nama_witel, 'value' => $item->total_amount]);

        // --- CHART 2: KOMPOSISI STATUS ---
        $queryChart2 = (clone $baseQuery);
        if ($request->has('witel_status') && $request->witel_status != '') {
            $queryChart2->where('witel', $request->witel_status);
        }
        $chart2 = $queryChart2
            ->select(DB::raw("
                CASE 
                    WHEN status_resume LIKE '%PS%' OR status_resume LIKE '%COMPLETED%' THEN 'Completed'
                    WHEN status_resume LIKE '%CANCEL%' THEN 'Cancel'
                    ELSE 'Open'
                END as status_group
            "), DB::raw('count(*) as value'))
            ->groupBy('status_group')->get()->map(fn($i) => ['product' => $i->status_group, 'value' => $i->value]);

        // --- CHART 3: JENIS LAYANAN ---
        $queryChart3 = (clone $baseQuery);
        if ($request->has('witel_layanan') && $request->witel_layanan != '') {
            $queryChart3->where('witel', $request->witel_layanan);
        }
        $chart3 = $queryChart3
            ->select('type_layanan as sub_type', DB::raw("'Total' as product"), DB::raw('count(*) as total_amount'))
            ->groupBy('type_layanan')->orderBy('total_amount', 'desc')->limit(10)->get();

        // --- CHART 4: SEBARAN DATA PS ---
        $chart4 = (clone $baseQuery)
            ->where(function($q) {
                $q->where('type_trans', 'not like', '%REVOKE%')
                  ->where('type_trans', 'not like', '%CABUT%');
            })
            ->select('witel', DB::raw('count(*) as value'))
            ->groupBy('witel')->get()->map(fn($i) => ['product' => $i->witel, 'value' => $i->value]);


        // ==================================================================================
        // LOGIKA BARU: CHART 5 & 6 (DENGAN FILTER TANGGAL YANG KONSISTEN)
        // ==================================================================================
        
        $getPivotData = function ($filterCallback) use ($allowedWitels, $startDate, $endDate) {
            
            // Query baru khusus Pivot
            $query = HsiData::query()->whereIn('witel', $allowedWitels);

            // Apply Tanggal (SAMA PERSIS DENGAN ATAS)
            if ($startDate && $endDate) {
                $query->whereDate('order_date', '>=', $startDate)
                      ->whereDate('order_date', '<=', $endDate);
            }

            // Apply Kondisi Cancel
            $query->where($filterCallback);

            $rawData = $query->select(
                    'witel',
                    DB::raw("COALESCE(NULLIF(sub_error_code, ''), NULLIF(engineer_memo, ''), 'null') as reason"),
                    DB::raw('count(*) as total')
                )
                ->groupBy('witel', DB::raw("COALESCE(NULLIF(sub_error_code, ''), NULLIF(engineer_memo, ''), 'null')"))
                ->get();

            $allKeys = $rawData->pluck('reason')->unique()->filter()->values()->all();

            $chartData = collect($allowedWitels)->map(function ($witel) use ($rawData, $allKeys) {
                $item = ['name' => $witel];
                foreach ($allKeys as $key) $item[$key] = 0; 
                foreach ($rawData->where('witel', $witel) as $d) {
                    $key = $d->reason ?? 'null'; 
                    $item[$key] = $d->total;
                }
                return $item;
            });

            return ['data' => $chartData, 'keys' => $allKeys];
        };

        // Chart 5: Cancel by FCC
        $chart5 = $getPivotData(function($q) {
            $q->where('data_proses', 'like', '%FCC%');
        });

        // Chart 6: Cancel Biasa
        $chart6 = $getPivotData(function($q) {
            $q->where('data_proses', 'like', '%CANCEL%')
              ->where('data_proses', 'not like', '%FCC%');
        });

        // --- STATS ---
        $stats = [
            'total'     => (clone $baseQuery)->count(),
            'completed' => (clone $baseQuery)->where(fn($q) => $q->where('status_resume', 'like', '%PS%')->orWhere('status_resume', 'like', '%COMPLETED%'))->count(),
            'open'      => (clone $baseQuery)->where('status_resume', 'not like', '%PS%')->where('status_resume', 'not like', '%COMPLETED%')->where('status_resume', 'not like', '%CANCEL%')->count(),
        ];

        return Inertia::render('DashboardHSI', [
            'stats'         => $stats,
            'chart1'        => $chart1,
            'chart2'        => $chart2,
            'chart3'        => $chart3,
            'chart4'        => $chart4,
            'chart5Data'    => $chart5['data'],
            'chart5Keys'    => $chart5['keys'],
            'chart6Data'    => $chart6['data'],
            'chart6Keys'    => $chart6['keys'],
            'witels'        => $allowedWitels,
            'filters'       => $request->only(['start_date', 'end_date', 'witel_status', 'witel_layanan']),
        ]);
    }

    /**
     * FUNGSI IMPORT EXCEL DENGAN PILIHAN FORMAT TANGGAL
     */
    public function import(Request $request)
    {
        // 1. Validasi File DAN Format Tanggal
        $request->validate([
            'file' => 'required|mimes:xlsx,xls,csv',
            // Kita pastikan user memilih salah satu format yang valid (dikirim dari frontend)
            'date_format' => 'required|in:m/d/Y,d/m/Y,Y-m-d', 
        ]);

        try {
            // 2. Ambil Pilihan Format dari Frontend
            $userSelectedFormat = $request->input('date_format');

            // 3. Eksekusi Import
            // Kita kirim format pilihan user ($userSelectedFormat) ke dalam Import Class
            Excel::import(new HsiDataImport($userSelectedFormat), $request->file('file'));

            return redirect()->back()->with('success', 'Data berhasil diimport menggunakan format tanggal: ' . $userSelectedFormat);

        } catch (\Exception $e) {
            return redirect()->back()->with('error', 'Terjadi kesalahan saat import: ' . $e->getMessage());
        }
    }
}