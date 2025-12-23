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
    // HALAMAN 1: DASHBOARD GRAFIK + PETA SEBARAN
    // =================================================================
    public function index(Request $request)
    {
        // 1. FILTER PARAMETERS
        $startDate = $request->input('start_date');
        $endDate = $request->input('end_date');
        $selectedWitelOlds = $request->input('filter_witel', []);

        // 2. DEFINE SCOPE: RSO 2 (JATIM + BALNUS)
        $rso2Witels = [
            'JATIM BARAT', 
            'JATIM TIMUR', 
            'SURAMADU', 
            'BALI', 
            'NUSA TENGGARA',
            'JAWA TIMUR' 
        ];
        
        // Base Query dengan Filter RSO 2
        $baseQuery = HsiData::query()->whereIn('witel', $rso2Witels);

        // 3. APPLY DATE RANGE FILTER (FIX: Kembali ke order_date)
        // Menggunakan order_date agar data CANCEL dan OPEN tetap muncul.
        if ($startDate && $endDate) {
            $baseQuery->whereDate('order_date', '>=', $startDate)
                      ->whereDate('order_date', '<=', $endDate);
        }

        // 4. APPLY WITEL OLD FILTER (Multi-Select)
        if (!empty($selectedWitelOlds)) {
            $baseQuery->whereIn('witel_old', $selectedWitelOlds);
        }

        // =================================================================
        // VISUALISASI 1: TOTAL ORDER (Pie Chart)
        // =================================================================
        // Data: Total Order Masuk berdasarkan Witel (RSO 2)
        $chart1 = (clone $baseQuery)
            ->select('witel', DB::raw('count(*) as total_amount'))
            ->groupBy('witel')
            ->orderBy('total_amount', 'desc')
            ->get()
            ->map(function($item) {
                return [
                    'product' => $item->witel, 
                    'value'   => $item->total_amount
                ];
            });

        // =================================================================
        // VISUALISASI 2: CANCEL BY FCC (Stacked Bar Chart)
        // =================================================================
        // Filter: REJECT FCC | Dimension: WITEL (X) | Breakdown: SUBERRORCODE
        // Sort: Record Count Descending (Witel) & Secondary Sort (Error Code)
        
        $cancelFccQuery = (clone $baseQuery)->where('kelompok_status', 'REJECT_FCC');
        
        $cancelFccData = $cancelFccQuery
            ->select(
                'witel', 
                // Breakdown dimension: SUBERRORCODE
                DB::raw("COALESCE(NULLIF(sub_error_code, ''), 'Unknown') as error_code"), 
                DB::raw('count(*) as total')
            )
            ->groupBy('witel', DB::raw("COALESCE(NULLIF(sub_error_code, ''), 'Unknown')"))
            ->get();

        // 1. Sort Keys (Error Codes) berdasarkan total global terbanyak
        $errorTotals = $cancelFccData->groupBy('error_code')->map(fn($group) => $group->sum('total'))->sortDesc();
        $chart5Keys = $errorTotals->keys()->values()->all();

        // 2. Sort X-Axis (Witel) berdasarkan total record terbanyak
        $witelTotals = $cancelFccData->groupBy('witel')->map(fn($group) => $group->sum('total'))->sortDesc();

        // 3. Build Data Structure
        $chart5Data = [];
        foreach ($witelTotals->keys() as $witelName) {
            $rows = $cancelFccData->where('witel', $witelName);
            $entry = ['name' => $witelName];
            
            // Init semua keys dengan 0
            foreach ($chart5Keys as $key) {
                $entry[$key] = 0;
            }
            
            // Isi value
            foreach ($rows as $row) {
                $entry[$row->error_code] = $row->total;
            }
            $chart5Data[] = $entry;
        }

        // =================================================================
        // VISUALISASI LAINNYA (EXISTING)
        // =================================================================
        
        // Chart 4: Total PS (Completed)
        $chart4 = (clone $baseQuery)
            ->where('kelompok_status', 'PS')
            ->select('witel', DB::raw('count(*) as value'))
            ->groupBy('witel')
            ->orderBy('value', 'desc')
            ->get()
            ->map(fn($i) => ['product' => $i->witel, 'value' => $i->value]);

        // Chart 6: Cancel Non-FCC
        $cancelData = (clone $baseQuery)
            ->where('kelompok_status', 'CANCEL')
            ->select('witel', DB::raw("COALESCE(NULLIF(sub_error_code, ''), 'Unknown') as error_code"), DB::raw('count(*) as total'))
            ->groupBy('witel', DB::raw("COALESCE(NULLIF(sub_error_code, ''), 'Unknown')"))
            ->get();
        
        $cancelErrorTotals = $cancelData->groupBy('error_code')->map(fn($group) => $group->sum('total'))->sortDesc();
        $chart6Keys = $cancelErrorTotals->keys()->values()->all();
        $cancelWitelTotals = $cancelData->groupBy('witel')->map(fn($group) => $group->sum('total'))->sortDesc();
        
        $chart6Data = [];
        foreach ($cancelWitelTotals->keys() as $witelName) {
            $rows = $cancelData->where('witel', $witelName);
            $entry = ['name' => $witelName];
            foreach ($chart6Keys as $key) $entry[$key] = 0;
            foreach ($rows as $row) $entry[$row->error_code] = $row->total;
            $chart6Data[] = $entry;
        }

        // Chart 2: Komposisi Status
        $queryChart2 = (clone $baseQuery);
        if ($request->has('witel_status') && $request->witel_status != '') {
            $queryChart2->where('witel', $request->witel_status);
        }
        $chart2 = $queryChart2
            ->select(DB::raw("CASE WHEN status_resume LIKE '%PS%' THEN 'Completed' WHEN status_resume LIKE '%CANCEL%' THEN 'Cancel' ELSE 'Open' END as status_group"), DB::raw('count(*) as value'))
            ->groupBy('status_group')
            ->get()
            ->map(fn($i) => ['product' => $i->status_group, 'value' => $i->value]);

        // Chart 3: Jenis Layanan
        $queryChart3 = (clone $baseQuery);
        if ($request->has('witel_layanan') && $request->witel_layanan != '') {
            $queryChart3->where('witel', $request->witel_layanan);
        }
        $chart3 = $queryChart3
            ->select('type_layanan as sub_type', DB::raw("'Total' as product"), DB::raw('count(*) as total_amount'))
            ->groupBy('type_layanan')
            ->orderBy('total_amount', 'desc')
            ->limit(10)
            ->get();

        // Map Data (Filtered by Date & Witel)
        $regionBounds = [
            'BALI' => ['minLat' => -8.95, 'maxLat' => -7.90, 'minLng' => 114.40, 'maxLng' => 115.75],
            'JATIM_AREA' => ['minLat' => -8.90, 'maxLat' => -6.60, 'minLng' => 110.80, 'maxLng' => 114.45],
            'NUSA TENGGARA' => ['minLat' => -11.20, 'maxLat' => -8.00, 'minLng' => 115.80, 'maxLng' => 127.50],
        ];

        $mapData = (clone $baseQuery)
            ->whereNotNull('gps_latitude')
            ->whereNotNull('gps_longitude')
            ->get()
            ->map(function($item) use ($regionBounds) {
                // Coordinate Cleaner (Sama seperti sebelumnya)
                $cleanCoord = function($val, $isLat) {
                    if (!$val) return null;
                    $v = preg_replace('/[^0-9\.\-]/', '', str_replace(',', '.', $val));
                    if (!is_numeric($v)) return null;
                    $fv = (float)$v;
                    $maxLoop = 10;
                    if ($isLat) {
                        if ($fv > 0 && $fv < 15) $fv = -$fv; 
                        if ($fv > 100) $fv = -$fv; 
                        while (($fv < -15 || $fv > 5) && $fv != 0 && $maxLoop-- > 0) { $fv /= 10; }
                        if ($fv > 0) $fv = -$fv;
                    } else {
                        while (($fv > 150 || $fv < 90) && $fv != 0 && $maxLoop-- > 0) {
                            if (abs($fv) < 90) $fv *= 10; else $fv /= 10; 
                        }
                    }
                    return $fv;
                };

                $lat = $cleanCoord($item->gps_latitude ?? $item->GPS_LATITUDE, true);
                $lng = $cleanCoord($item->gps_longitude ?? $item->GPS_LONGITUDE, false);
                $recordWitel = strtoupper($item->witel ?? $item->WITEL ?? '');

                if (!$lat || !$lng) return null;

                $actualLocation = 'OUTSIDE_DEFINED_BOUNDS';
                if ($lat >= $regionBounds['BALI']['minLat'] && $lat <= $regionBounds['BALI']['maxLat'] && $lng >= $regionBounds['BALI']['minLng'] && $lng <= $regionBounds['BALI']['maxLng']) {
                    $actualLocation = 'BALI';
                } elseif ($lat >= $regionBounds['JATIM_AREA']['minLat'] && $lat <= $regionBounds['JATIM_AREA']['maxLat'] && $lng >= $regionBounds['JATIM_AREA']['minLng'] && $lng <= $regionBounds['JATIM_AREA']['maxLng']) {
                    $actualLocation = 'JATIM_AREA';
                } elseif ($lat >= $regionBounds['NUSA TENGGARA']['minLat'] && $lat <= $regionBounds['NUSA TENGGARA']['maxLat'] && $lng >= $regionBounds['NUSA TENGGARA']['minLng'] && $lng <= $regionBounds['NUSA TENGGARA']['maxLng']) {
                    $actualLocation = 'NUSA TENGGARA';
                }

                $markerStatus = 'valid';
                if ($actualLocation === 'OUTSIDE_DEFINED_BOUNDS') {
                    $markerStatus = 'anomaly'; 
                } elseif ($actualLocation === 'JATIM_AREA') {
                    if (!str_contains($recordWitel, 'JATIM') && !str_contains($recordWitel, 'SURAMADU')) $markerStatus = 'anomaly';
                } else {
                    if ($recordWitel !== $actualLocation) $markerStatus = 'anomaly';
                }

                $displayId = $item->order_id ?? $item->ORDER_ID ?? $item->sc_id ?? $item->SC_ID ?? $item->wonum ?? $item->WONUM ?? '-';

                return [
                    'id' => $displayId, 
                    'name' => $item->customer_name ?? 'No Name',
                    'witel' => $recordWitel, 
                    'sto' => $item->sto, 
                    'status' => $item->status_resume,
                    'lat' => $lat, 
                    'lng' => $lng, 
                    'marker_status' => $markerStatus, 
                    'actual_loc' => $actualLocation
                ];
            })
            ->filter(fn($i) => $i !== null)
            ->values();

        // Stats Summary
        $stats = [
            'total'     => (clone $baseQuery)->count(),
            'completed' => (clone $baseQuery)->where('kelompok_status', 'PS')->count(),
            'open'      => (clone $baseQuery)->whereNotIn('kelompok_status', ['PS', 'CANCEL', 'REJECT_FCC'])->count(),
        ];

        // Filter Options (Witel Old)
        $witelFilterOptions = HsiData::select('witel', 'witel_old')
            ->whereIn('witel', $rso2Witels)
            ->whereNotNull('witel')->whereNotNull('witel_old')
            ->distinct()->orderBy('witel')->get()
            ->map(fn($item) => ['label' => $item->witel, 'value' => $item->witel_old])
            ->values();

        return Inertia::render('DashboardHSI', [
            'stats'         => $stats,
            'mapData'       => $mapData,
            'chart1'        => $chart1, 
            'chart4'        => $chart4, 
            'chart5Data'    => $chart5Data, 'chart5Keys' => $chart5Keys,
            'chart6Data'    => $chart6Data, 'chart6Keys' => $chart6Keys,
            'chart2'        => $chart2,
            'chart3'        => $chart3,
            'witels'        => $rso2Witels,
            'filters'       => $request->only(['start_date', 'end_date', 'witel_status', 'witel_layanan', 'filter_witel']),
            'witelOptions'  => $witelFilterOptions,
        ]);
    }

    // ... (Fungsi flow dan import tetap sama) ...
    public function flow(Request $request)
    {
        $selectedWitel = $request->input('witel');
        $allowedWitels = ['BALI', 'JATIM BARAT', 'JATIM TIMUR', 'SURAMADU', 'NUSA TENGGARA'];

        $flowQuery = HsiData::query()->whereIn('witel', $allowedWitels);

        if ($selectedWitel) {
            $flowQuery->where('witel', $selectedWitel);
        }

        $flowStats = $flowQuery->select(
            DB::raw("COUNT(*) as re"),
            DB::raw("SUM(CASE WHEN data_proses = 'OGP VERIFIKASI DAN VALID' THEN 1 ELSE 0 END) as ogp_verif"),
            DB::raw("SUM(CASE WHEN data_proses = 'CANCEL QC1' THEN 1 ELSE 0 END) as cancel_qc1"),
            DB::raw("SUM(CASE WHEN data_proses = 'CANCEL FCC' THEN 1 ELSE 0 END) as cancel_fcc"),
            DB::raw("SUM(CASE WHEN data_proses NOT IN ('CANCEL QC1', 'CANCEL FCC', 'OGP VERIFIKASI DAN VALID') THEN 1 ELSE 0 END) as valid_re"),
            DB::raw("SUM(CASE WHEN data_proses = 'OGP SURVEY' AND status_resume = 'MIA - INVALID SURVEY' THEN 1 ELSE 0 END) as cancel_wo"),
            DB::raw("SUM(CASE WHEN data_proses = 'UNSC' THEN 1 ELSE 0 END) as unsc"),
            DB::raw("SUM(CASE WHEN data_proses = 'OGP SURVEY' AND status_message = 'MIE - SEND SURVEY' THEN 1 ELSE 0 END) as ogp_survey_count"),
            DB::raw("SUM(CASE WHEN data_proses NOT IN ('CANCEL QC1', 'CANCEL FCC', 'OGP VERIFIKASI DAN VALID', 'UNSC') AND NOT (data_proses = 'OGP SURVEY' AND status_resume = 'MIA - INVALID SURVEY') AND NOT (data_proses = 'OGP SURVEY' AND status_message = 'MIE - SEND SURVEY') THEN 1 ELSE 0 END) as valid_wo"),
            DB::raw("SUM(CASE WHEN data_proses = 'CANCEL' THEN 1 ELSE 0 END) as cancel_instalasi"),
            DB::raw("SUM(CASE WHEN data_proses = 'FALLOUT' THEN 1 ELSE 0 END) as fallout"),
            DB::raw("SUM(CASE WHEN data_proses = 'REVOKE' THEN 1 ELSE 0 END) as revoke_count"),
            DB::raw("SUM(CASE WHEN data_proses NOT IN ('CANCEL QC1', 'CANCEL FCC', 'OGP VERIFIKASI DAN VALID', 'UNSC', 'CANCEL', 'FALLOUT', 'REVOKE', 'OGP SURVEY') AND status_resume != 'MIA - INVALID SURVEY' THEN 1 ELSE 0 END) as valid_pi"),
            DB::raw("SUM(CASE WHEN data_proses = 'OGP PROVI' THEN 1 ELSE 0 END) as ogp_provi"),
            DB::raw("SUM(CASE WHEN data_proses NOT IN ('CANCEL QC1', 'CANCEL FCC', 'OGP VERIFIKASI DAN VALID', 'UNSC', 'CANCEL', 'FALLOUT', 'REVOKE', 'OGP PROVI', 'OGP SURVEY') AND status_resume != 'MIA - INVALID SURVEY' THEN 1 ELSE 0 END) as ps_count"),
            DB::raw("SUM(CASE WHEN data_proses NOT IN ('CANCEL FCC', 'UNSC', 'REVOKE') AND (group_paket != 'WMS' OR group_paket IS NULL) THEN 1 ELSE 0 END) as ps_re_denominator"),
            DB::raw("SUM(CASE WHEN data_proses NOT IN ('CANCEL QC1', 'CANCEL FCC', 'OGP VERIFIKASI DAN VALID', 'UNSC', 'CANCEL', 'FALLOUT', 'REVOKE', 'OGP SURVEY') AND status_resume != 'MIA - INVALID SURVEY' THEN 1 ELSE 0 END) as ps_pi_denominator"),
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
            'flowStats' => $flowStats, 'witels' => $allowedWitels, 'filters' => $request->only(['witel']),
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