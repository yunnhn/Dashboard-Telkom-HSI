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
    // HALAMAN 1: DASHBOARD GRAFIK + PETA SEBARAN (FINAL MERGED)
    // =================================================================
    public function index(Request $request)
    {
        $startDate = $request->input('start_date');
        $endDate = $request->input('end_date');
        
        $jatimWitels = ['JATIM BARAT', 'JATIM TIMUR', 'SURAMADU'];
        $otherWitels = ['BALI', 'NUSA TENGGARA'];
        $allowedWitels = array_merge($jatimWitels, $otherWitels);
        
        $baseQuery = HsiData::query()->whereIn('witel', $allowedWitels);

        if ($startDate && $endDate) {
            $baseQuery->whereDate('tgl_ps', '>=', $startDate)
                      ->whereDate('tgl_ps', '<=', $endDate);
        }

        // --- MAP DATA (Biarkan seperti sebelumnya) ---
        $regionBounds = [
            'BALI' => ['minLat' => -8.95, 'maxLat' => -7.90, 'minLng' => 114.40, 'maxLng' => 115.75],
            'JATIM_AREA' => ['minLat' => -8.90, 'maxLat' => -6.60, 'minLng' => 110.80, 'maxLng' => 114.45],
            'NUSA TENGGARA' => ['minLat' => -11.20, 'maxLat' => -8.00, 'minLng' => 115.80, 'maxLng' => 127.50],
        ];

        $mapData = (clone $baseQuery)
            ->whereNotNull('gps_latitude')
            ->whereNotNull('gps_longitude')
            ->limit(5000) 
            ->get()
            ->map(function($item) use ($regionBounds, $jatimWitels) {
                // Cleaner
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

                if (!$lat || !$lng || $lat > -4.0 || $lat < -12.0 || $lng < 110.5 || $lng > 128.0) return null; 

                $actualLocation = 'UNKNOWN_AREA';
                if ($lat >= $regionBounds['BALI']['minLat'] && $lat <= $regionBounds['BALI']['maxLat'] && $lng >= $regionBounds['BALI']['minLng'] && $lng <= $regionBounds['BALI']['maxLng']) {
                    $actualLocation = 'BALI';
                } elseif ($lat >= $regionBounds['JATIM_AREA']['minLat'] && $lat <= $regionBounds['JATIM_AREA']['maxLat'] && $lng >= $regionBounds['JATIM_AREA']['minLng'] && $lng <= $regionBounds['JATIM_AREA']['maxLng']) {
                    $actualLocation = 'JATIM_AREA';
                } elseif ($lat >= $regionBounds['NUSA TENGGARA']['minLat'] && $lat <= $regionBounds['NUSA TENGGARA']['maxLat'] && $lng >= $regionBounds['NUSA TENGGARA']['minLng'] && $lng <= $regionBounds['NUSA TENGGARA']['maxLng']) {
                    $actualLocation = 'NUSA TENGGARA';
                }

                $markerStatus = 'valid';
                if ($actualLocation === 'UNKNOWN_AREA') {
                    $markerStatus = 'anomaly';
                } elseif ($actualLocation === 'JATIM_AREA') {
                    if (!in_array($recordWitel, $jatimWitels)) $markerStatus = 'anomaly';
                } else {
                    if ($recordWitel !== $actualLocation) $markerStatus = 'anomaly';
                }

                $displayId = $item->order_id ?? $item->ORDER_ID;
                if (!$displayId || $displayId == '-') $displayId = $item->sc_id ?? $item->SC_ID;
                if (!$displayId || $displayId == '-') $displayId = $item->wonum ?? $item->WONUM ?? '-';

                return [
                    'id' => $displayId, 'name' => $item->customer_name ?? 'No Name',
                    'witel' => $recordWitel, 'sto' => $item->sto, 'status' => $item->status_resume,
                    'lat' => $lat, 'lng' => $lng, 'marker_status' => $markerStatus, 'actual_loc' => $actualLocation
                ];
            })
            ->filter(fn($i) => $i !== null)
            ->values();


        // ... CHART 1 & 4 TETAP SAMA ...
        $chart1 = (clone $baseQuery)
            ->select('witel as nama_witel', DB::raw("'Total' as product"), DB::raw('count(*) as total_amount'))
            ->groupBy('witel')->orderBy('total_amount', 'desc')->get()
            ->map(fn($item) => ['product' => $item->nama_witel, 'value' => $item->total_amount]);

        $chart4 = (clone $baseQuery)
            ->where('kelompok_status', 'PS')
            ->select('witel', DB::raw('count(*) as value'))
            ->groupBy('witel')->orderBy('value', 'desc')->get()
            ->map(fn($i) => ['product' => $i->witel, 'value' => $i->value]);

        // --- HELPER: Stacked Bar (PERBAIKAN LABEL 'null') ---
        $getStackedData = function ($statusFilter) use ($baseQuery) {
            $data = (clone $baseQuery)
                ->where('kelompok_status', $statusFilter)
                // PERBAIKAN: Menggunakan 'null' sebagai string pengganti NULL/Kosong
                ->select(
                    'witel', 
                    DB::raw("COALESCE(NULLIF(sub_error_code, ''), 'null') as fixed_error_code"), 
                    DB::raw('count(*) as total')
                )
                ->groupBy('witel', DB::raw("COALESCE(NULLIF(sub_error_code, ''), 'null')"))
                ->get();

            $witelTotals = $data->groupBy('witel')->map(fn($group) => $group->sum('total'))->sortDesc();
            $allKeys = $data->pluck('fixed_error_code')->unique()->values()->all();

            $chartData = [];
            foreach ($witelTotals->keys() as $witelName) {
                $row = ['name' => $witelName];
                foreach ($allKeys as $key) $row[$key] = 0;
                foreach ($data->where('witel', $witelName) as $d) {
                    $key = $d->fixed_error_code;
                    $row[$key] = $d->total;
                }
                $chartData[] = $row;
            }
            return ['data' => $chartData, 'keys' => $allKeys];
        };

        $chart5 = $getStackedData('REJECT_FCC');
        $chart6 = $getStackedData('CANCEL');

        // ... SISA KODE SAMA ...
        $chart2 = (clone $baseQuery)->select(DB::raw("CASE WHEN status_resume LIKE '%PS%' THEN 'Completed' WHEN status_resume LIKE '%CANCEL%' THEN 'Cancel' ELSE 'Open' END as status_group"), DB::raw('count(*) as value'))->groupBy('status_group')->get()->map(fn($i) => ['product' => $i->status_group, 'value' => $i->value]);
        $chart3 = (clone $baseQuery)->select('type_layanan as sub_type', DB::raw("'Total' as product"), DB::raw('count(*) as total_amount'))->groupBy('type_layanan')->orderBy('total_amount', 'desc')->limit(10)->get();

        $stats = [
            'total'     => (clone $baseQuery)->count(),
            'completed' => (clone $baseQuery)->where('kelompok_status', 'PS')->count(),
            'open'      => (clone $baseQuery)->whereNotIn('kelompok_status', ['PS', 'CANCEL', 'REJECT_FCC'])->count(),
        ];

        return Inertia::render('DashboardHSI', [
            'stats'         => $stats,
            'mapData'       => $mapData,
            'chart1'        => $chart1, 
            'chart4'        => $chart4, 
            'chart5Data'    => $chart5['data'], 'chart5Keys' => $chart5['keys'],
            'chart6Data'    => $chart6['data'], 'chart6Keys' => $chart6['keys'],
            'chart2'        => $chart2,
            'chart3'        => $chart3,
            'witels'        => $allowedWitels,
            'filters'       => $request->only(['start_date', 'end_date', 'witel_status', 'witel_layanan']),
        ]);
    }

    // =================================================================
    // HALAMAN 2: FLOW PROCESS (TETAP SAMA)
    // =================================================================
    public function flow(Request $request)
    {
        $selectedWitel = $request->input('witel');
        $allowedWitels = ['BALI', 'JATIM BARAT', 'JATIM TIMUR', 'SURAMADU', 'NUSA TENGGARA'];
        $flowQuery = HsiData::query()->whereIn('witel', $allowedWitels);
        if ($selectedWitel) $flowQuery->where('witel', $selectedWitel);

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
            DB::raw("SUM(CASE WHEN data_proses NOT IN ('CANCEL QC1', 'CANCEL FCC', 'OGP VERIFIKASI DAN VALID', 'UNSC', 'CANCEL', 'FALLOUT', 'REVOKE') AND NOT (data_proses = 'OGP SURVEY' AND status_resume = 'MIA - INVALID SURVEY') AND NOT (data_proses = 'OGP SURVEY' AND status_message = 'MIE - SEND SURVEY') THEN 1 ELSE 0 END) as valid_pi"),
            DB::raw("SUM(CASE WHEN data_proses = 'OGP PROVI' THEN 1 ELSE 0 END) as ogp_provi"),
            DB::raw("SUM(CASE WHEN data_proses NOT IN ('CANCEL QC1', 'CANCEL FCC', 'OGP VERIFIKASI DAN VALID', 'UNSC', 'CANCEL', 'FALLOUT', 'REVOKE', 'OGP PROVI') AND NOT (data_proses = 'OGP SURVEY' AND status_resume = 'MIA - INVALID SURVEY') AND NOT (data_proses = 'OGP SURVEY' AND status_message = 'MIE - SEND SURVEY') THEN 1 ELSE 0 END) as ps_count"),
            DB::raw("SUM(CASE WHEN data_proses NOT IN ('CANCEL FCC', 'UNSC', 'REVOKE') AND (group_paket != 'WMS' OR group_paket IS NULL) THEN 1 ELSE 0 END) as ps_re_denominator"),
            DB::raw("SUM(CASE WHEN data_proses NOT IN ('CANCEL QC1', 'CANCEL FCC', 'OGP VERIFIKASI DAN VALID', 'UNSC', 'CANCEL', 'FALLOUT', 'REVOKE') AND NOT (data_proses = 'OGP SURVEY' AND status_resume = 'MIA - INVALID SURVEY') AND NOT (data_proses = 'OGP SURVEY' AND status_message = 'MIE - SEND SURVEY') THEN 1 ELSE 0 END) as ps_pi_denominator"),
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