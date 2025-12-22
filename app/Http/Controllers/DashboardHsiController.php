<?php

namespace App\Http\Controllers;

use Inertia\Inertia;
use App\Models\HsiData;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Imports\HsiDataImport;
use Maatwebsite\Excel\Facades\Excel;

class DashboardHsiController extends Controller
{
    // =================================================================
    // HALAMAN 1: DASHBOARD GRAFIK (OVERVIEW) + PETA SEBARAN
    // =================================================================
    public function index(Request $request)
    {
        $startDate = $request->input('start_date');
        $endDate = $request->input('end_date');
        $allowedWitels = ['BALI', 'JATIM BARAT', 'JATIM TIMUR', 'SURAMADU', 'NUSA TENGGARA'];
        
        // Base Query untuk filter tanggal & witel
        $baseQuery = HsiData::query()->whereIn('witel', $allowedWitels);

        if ($startDate && $endDate) {
            $baseQuery->whereDate('order_date', '>=', $startDate)
                      ->whereDate('order_date', '<=', $endDate);
        }

        // ---------------------------------------------------------
        // 1. DATA PETA (SPATIAL) - FIX COLUMN ERROR
        // ---------------------------------------------------------
        // Menggunakan get() tanpa select spesifik agar aman terhadap nama kolom (ORDER_ID vs order_id)
        $mapData = (clone $baseQuery)
            ->whereNotNull('gps_latitude')
            ->whereNotNull('gps_longitude')
            ->limit(3000) // Limit agar tidak crash
            ->get()
            ->map(function($item) {
                // Helper Cleaning Koordinat
                $clean = function($val, $type) {
                    if (!$val) return null;
                    $v = preg_replace('/[^0-9\.\-]/', '', str_replace(',', '.', $val)); 
                    $floatVal = (float)$v;
                    if ($type == 'lat') {
                        if ($floatVal < -90) $floatVal /= 100; elseif ($floatVal > 90) $floatVal = null; 
                    } else {
                        if ($floatVal > 10000) $floatVal /= 10000; elseif ($floatVal > 1000) $floatVal /= 10;
                    }
                    return $floatVal;
                };

                // Deteksi Nama Kolom Dinamis (Case Insensitive)
                $lat = $item->gps_latitude ?? $item->GPS_LATITUDE ?? null;
                $lng = $item->gps_longitude ?? $item->GPS_LONGITUDE ?? null;
                
                return [
                    'id'     => $item->order_id ?? $item->ORDER_ID ?? '-', 
                    'name'   => $item->customer_name ?? $item->CUSTOMER_NAME ?? 'No Name',
                    'witel'  => $item->witel ?? $item->WITEL,
                    'sto'    => $item->sto ?? $item->STO,
                    'status' => $item->status_resume ?? $item->STATUS_RESUME,
                    'lat'    => $clean($lat, 'lat'),
                    'lng'    => $clean($lng, 'lng'),
                ];
            })
            ->filter(fn($i) => $i['lat'] != null && $i['lng'] != null && $i['lat'] != 0 && $i['lng'] != 0)
            ->values();

        // ---------------------------------------------------------
        // 2. CHART & STATS (ORIGINAL FEATURES)
        // ---------------------------------------------------------

        // Chart 1: Pie Regional
        $chart1 = (clone $baseQuery)
            ->select('witel as nama_witel', DB::raw("'Total' as product"), DB::raw('count(*) as total_amount'))
            ->groupBy('witel')->orderBy('total_amount', 'desc')->get()
            ->map(fn($item) => ['product' => $item->nama_witel, 'value' => $item->total_amount]);

        // Chart 2: Pie Status (Dengan Filter Witel Status)
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

        // Chart 3: Layanan (Dengan Filter Witel Layanan)
        $queryChart3 = (clone $baseQuery);
        if ($request->has('witel_layanan') && $request->witel_layanan != '') {
            $queryChart3->where('witel', $request->witel_layanan);
        }
        $chart3 = $queryChart3
            ->select('type_layanan as sub_type', DB::raw("'Total' as product"), DB::raw('count(*) as total_amount'))
            ->groupBy('type_layanan')->orderBy('total_amount', 'desc')->limit(10)->get();

        // Chart 4: Sebaran PS
        $chart4 = (clone $baseQuery)
            ->where(function($q) {
                $q->where('type_trans', 'not like', '%REVOKE%')
                  ->where('type_trans', 'not like', '%CABUT%');
            })
            ->select('witel', DB::raw('count(*) as value'))
            ->groupBy('witel')->get()->map(fn($i) => ['product' => $i->witel, 'value' => $i->value]);

        // Helper untuk Chart 5 & 6 (Pivot Data) - INI FITUR LAMA YANG PENTING
        $getPivotData = function ($filterCallback) use ($allowedWitels, $startDate, $endDate) {
            $query = HsiData::query()->whereIn('witel', $allowedWitels);
            if ($startDate && $endDate) {
                $query->whereDate('order_date', '>=', $startDate)->whereDate('order_date', '<=', $endDate);
            }
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

        $chart5 = $getPivotData(fn($q) => $q->where('data_proses', 'like', '%FCC%'));
        $chart6 = $getPivotData(fn($q) => $q->where('data_proses', 'like', '%CANCEL%')->where('data_proses', 'not like', '%FCC%'));

        $stats = [
            'total'     => (clone $baseQuery)->count(),
            'completed' => (clone $baseQuery)->where(fn($q) => $q->where('status_resume', 'like', '%PS%')->orWhere('status_resume', 'like', '%COMPLETED%'))->count(),
            'open'      => (clone $baseQuery)->where('status_resume', 'not like', '%PS%')->where('status_resume', 'not like', '%COMPLETED%')->where('status_resume', 'not like', '%CANCEL%')->count(),
        ];

        return Inertia::render('DashboardHSI', [
            'stats'         => $stats,
            'mapData'       => $mapData, // <-- Data Peta
            'chart1'        => $chart1, 
            'chart2'        => $chart2, 
            'chart3'        => $chart3, 
            'chart4'        => $chart4,
            'chart5Data'    => $chart5['data'], 'chart5Keys' => $chart5['keys'],
            'chart6Data'    => $chart6['data'], 'chart6Keys' => $chart6['keys'],
            'witels'        => $allowedWitels,
            'filters'       => $request->only(['start_date', 'end_date', 'witel_status', 'witel_layanan']),
        ]);
    }

    // =================================================================
    // HALAMAN 2: FLOW PROCESS HSI (LOGIC TERBARU & BENAR)
    // =================================================================
    public function flow(Request $request)
    {
        $selectedWitel = $request->input('witel');
        $allowedWitels = ['BALI', 'JATIM BARAT', 'JATIM TIMUR', 'SURAMADU', 'NUSA TENGGARA'];

        $flowQuery = HsiData::query()->whereIn('witel', $allowedWitels);

        if ($selectedWitel) {
            $flowQuery->where('witel', $selectedWitel);
        }

        $flowStats = $flowQuery->select(
            // --- 1. RE ---
            DB::raw("COUNT(*) as re"),

            // --- 2. VERIF & VALID ---
            DB::raw("SUM(CASE WHEN data_proses = 'OGP VERIFIKASI DAN VALID' THEN 1 ELSE 0 END) as ogp_verif"),
            DB::raw("SUM(CASE WHEN data_proses = 'CANCEL QC1' THEN 1 ELSE 0 END) as cancel_qc1"),
            DB::raw("SUM(CASE WHEN data_proses = 'CANCEL FCC' THEN 1 ELSE 0 END) as cancel_fcc"),
            DB::raw("SUM(CASE WHEN data_proses NOT IN ('CANCEL QC1', 'CANCEL FCC', 'OGP VERIFIKASI DAN VALID') THEN 1 ELSE 0 END) as valid_re"),

            // --- 3. FEASIBILITY ---
            DB::raw("SUM(CASE WHEN data_proses = 'OGP SURVEY' AND status_resume = 'MIA - INVALID SURVEY' THEN 1 ELSE 0 END) as cancel_wo"),
            DB::raw("SUM(CASE WHEN data_proses = 'UNSC' THEN 1 ELSE 0 END) as unsc"),
            DB::raw("SUM(CASE WHEN data_proses = 'OGP SURVEY' AND status_message = 'MIE - SEND SURVEY' THEN 1 ELSE 0 END) as ogp_survey_count"),
            
            DB::raw("SUM(CASE WHEN 
                data_proses NOT IN ('CANCEL QC1', 'CANCEL FCC', 'OGP VERIFIKASI DAN VALID', 'UNSC') AND
                NOT (data_proses = 'OGP SURVEY' AND status_resume = 'MIA - INVALID SURVEY') AND
                NOT (data_proses = 'OGP SURVEY' AND status_message = 'MIE - SEND SURVEY')
            THEN 1 ELSE 0 END) as valid_wo"),

            // --- 4. INSTALASI ---
            DB::raw("SUM(CASE WHEN data_proses = 'CANCEL' THEN 1 ELSE 0 END) as cancel_instalasi"),
            DB::raw("SUM(CASE WHEN data_proses = 'FALLOUT' THEN 1 ELSE 0 END) as fallout"),
            DB::raw("SUM(CASE WHEN data_proses = 'REVOKE' THEN 1 ELSE 0 END) as revoke_count"),

            // Valid PI (Exclude OGP Survey Total)
            DB::raw("SUM(CASE WHEN 
                data_proses NOT IN ('CANCEL QC1', 'CANCEL FCC', 'OGP VERIFIKASI DAN VALID', 'UNSC', 'CANCEL', 'FALLOUT', 'REVOKE', 'OGP SURVEY') 
                AND status_resume != 'MIA - INVALID SURVEY'
            THEN 1 ELSE 0 END) as valid_pi"),

            // --- 5. PS ---
            DB::raw("SUM(CASE WHEN data_proses = 'OGP PROVI' THEN 1 ELSE 0 END) as ogp_provi"),

            // PS Final (Exclude OGP Survey Total)
            DB::raw("SUM(CASE WHEN 
                data_proses NOT IN ('CANCEL QC1', 'CANCEL FCC', 'OGP VERIFIKASI DAN VALID', 'UNSC', 'CANCEL', 'FALLOUT', 'REVOKE', 'OGP PROVI', 'OGP SURVEY') 
                AND status_resume != 'MIA - INVALID SURVEY'
            THEN 1 ELSE 0 END) as ps_count"),

            // --- RASIO DENOMINATOR (SESUAI REQUEST) ---
            
            // PS/RE Denominator (Kecuali WMS)
            DB::raw("SUM(CASE WHEN 
                data_proses NOT IN ('CANCEL FCC', 'UNSC', 'REVOKE') AND
                (group_paket != 'WMS' OR group_paket IS NULL)
            THEN 1 ELSE 0 END) as ps_re_denominator"),

            // PS/PI Denominator (Pakai Proxy Valid PI karena tidak ada kolom ps_inisial)
            DB::raw("SUM(CASE WHEN 
                data_proses NOT IN ('CANCEL QC1', 'CANCEL FCC', 'OGP VERIFIKASI DAN VALID', 'UNSC', 'CANCEL', 'FALLOUT', 'REVOKE', 'OGP SURVEY') 
                AND status_resume != 'MIA - INVALID SURVEY'
            THEN 1 ELSE 0 END) as ps_pi_denominator"),

            // --- REVOKE DETAIL ---
            DB::raw("SUM(CASE WHEN data_proses = 'REVOKE' AND status_resume = '102 | FOLLOW UP COMPLETED' THEN 1 ELSE 0 END) as followup_completed"),
            DB::raw("SUM(CASE WHEN data_proses = 'REVOKE' AND status_resume = '100 | REVOKE COMPLETED' THEN 1 ELSE 0 END) as revoke_completed"),
            DB::raw("SUM(CASE WHEN data_proses = 'REVOKE' AND status_resume = 'REVOKE ORDER' THEN 1 ELSE 0 END) as revoke_order"),
            DB::raw("SUM(CASE WHEN data_proses = 'REVOKE' AND status_resume = '102 | FOLLOW UP COMPLETED' AND data_ps_revoke = 'PS' THEN 1 ELSE 0 END) as ps_revoke"),
            DB::raw("SUM(CASE WHEN data_proses = 'REVOKE' AND status_resume = '102 | FOLLOW UP COMPLETED' AND (data_ps_revoke = 'PI' OR data_ps_revoke = 'ACT_COM') THEN 1 ELSE 0 END) as ogp_provi_revoke"),
            DB::raw("SUM(CASE WHEN data_proses = 'REVOKE' AND status_resume = '102 | FOLLOW UP COMPLETED' AND (data_ps_revoke = 'FO_WFM' OR data_ps_revoke = 'FO_UIM' OR data_ps_revoke = 'FO_ASAP') THEN 1 ELSE 0 END) as fallout_revoke"),
            DB::raw("SUM(CASE WHEN data_proses = 'REVOKE' AND status_resume = '102 | FOLLOW UP COMPLETED' AND data_ps_revoke = 'CANCEL' THEN 1 ELSE 0 END) as cancel_revoke"),
            DB::raw("SUM(CASE WHEN data_proses = 'REVOKE' AND status_resume = '102 | FOLLOW UP COMPLETED' AND (data_ps_revoke IS NULL OR data_ps_revoke = '#N/A' OR data_ps_revoke = 'INPROGESS_SC' OR data_ps_revoke = 'REVOKE') THEN 1 ELSE 0 END) as lain_lain_revoke")

        )->first();

        return Inertia::render('FlowProcessHSI', [
            'flowStats' => $flowStats,
            'witels'    => $allowedWitels,
            'filters'   => $request->only(['witel']),
        ]);
    }

    public function import(Request $request)
    {
        $request->validate(['file' => 'required|mimes:xlsx,xls,csv', 'date_format' => 'required|in:m/d/Y,d/m/Y,Y-m-d']);
        try {
            Excel::import(new HsiDataImport($request->input('date_format')), $request->file('file'));
            return redirect()->back()->with('success', 'Import Berhasil');
        } catch (\Exception $e) {
            return redirect()->back()->with('error', 'Error: ' . $e->getMessage());
        }
    }
}