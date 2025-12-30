<?php

namespace App\Http\Controllers;

use Inertia\Inertia;
use App\Models\HsiData;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Imports\HsiDataImport;
use Maatwebsite\Excel\Facades\Excel;
use ZipArchive; 
use Illuminate\Support\Facades\File; 

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
        $selectedWitels = $request->input('global_witel', []); 
        $selectedBranches = $request->input('global_branch', []); 
        $mapStatus = $request->input('map_status', []);
        $searchQuery = $request->input('search'); 

        // 2. DEFINE SCOPE: RSO 2
        $rso2Witels = ['JATIM TIMUR', 'JATIM BARAT', 'SURAMADU', 'NUSA TENGGARA', 'BALI'];
        
        $baseQuery = HsiData::query()->whereIn('witel', $rso2Witels);

        // --- AMBIL LIST BRANCH DINAMIS ---
        $rawBranches = HsiData::select('witel', 'witel_old')
            ->whereIn('witel', $rso2Witels)
            ->whereNotNull('witel_old')
            ->distinct()
            ->get();

        $branchMap = [];
        foreach ($rawBranches as $item) {
            if (!isset($branchMap[$item->witel])) {
                $branchMap[$item->witel] = [];
            }
            if (!in_array($item->witel_old, $branchMap[$item->witel])) {
                $branchMap[$item->witel][] = $item->witel_old;
            }
        }

        // 3. APPLY FILTERS
        if ($startDate && $endDate) {
            $baseQuery->whereDate('order_date', '>=', $startDate)
                      ->whereDate('order_date', '<=', $endDate);
        }
        if (!empty($selectedWitels)) {
            $baseQuery->whereIn('witel', $selectedWitels);
        }
        if (!empty($selectedBranches)) {
            $baseQuery->whereIn('witel_old', $selectedBranches);
        }

        // 4. DIMENSI
        if (!empty($selectedBranches)) {
            $dimension = 'witel_old';
            $dimensionLabel = 'Distrik (Branch Selected)';
        } elseif (!empty($selectedWitels)) {
            $dimension = 'witel_old';
            $dimensionLabel = 'Distrik (Witel Old)';
        } else {
            $dimension = 'witel'; 
            $dimensionLabel = 'Regional (Witel)';
        }

        // =================================================================
        // VISUALISASI CHART
        // =================================================================
        $chart1 = (clone $baseQuery)->select($dimension, DB::raw('count(*) as total_amount'))->whereNotNull($dimension)->groupBy($dimension)->orderBy('total_amount', 'desc')->get()->map(fn($i) => ['product' => $i->$dimension, 'value' => $i->total_amount]);
        
        $chart4 = (clone $baseQuery)->where('kelompok_status', 'PS')->select($dimension, DB::raw('count(*) as value'))->whereNotNull($dimension)->groupBy($dimension)->orderBy('value', 'desc')->get()->map(fn($i) => ['product' => $i->$dimension, 'value' => $i->value]);

        // Cancel FCC
        $cancelFccQuery = (clone $baseQuery)->where('kelompok_status', 'REJECT_FCC');
        $cancelFccData = $cancelFccQuery->select($dimension, DB::raw("COALESCE(NULLIF(suberrorcode, ''), 'Null') as error_code"), DB::raw('count(*) as total'))->whereNotNull($dimension)->groupBy($dimension, DB::raw("COALESCE(NULLIF(suberrorcode, ''), 'Null')"))->get();
        $fccErrorTotals = $cancelFccData->groupBy('error_code')->map(fn($g) => $g->sum('total'))->sortDesc();
        $chart5Keys = $fccErrorTotals->keys()->values()->all();
        $fccDimTotals = $cancelFccData->groupBy($dimension)->map(fn($g) => $g->sum('total'))->sortDesc();
        $chart5Data = [];
        foreach ($fccDimTotals->keys() as $dimName) {
            $rows = $cancelFccData->where($dimension, $dimName); $entry = ['name' => $dimName];
            foreach ($chart5Keys as $key) $entry[$key] = 0;
            foreach ($rows as $row) $entry[$row->error_code] = $row->total;
            $chart5Data[] = $entry;
        }

        // Cancel Non-FCC
        $cancelQuery = (clone $baseQuery)->where('kelompok_status', 'CANCEL');
        $cancelData = $cancelQuery->select($dimension, DB::raw("COALESCE(NULLIF(suberrorcode, ''), NULLIF(engineermemo, ''), 'Null') as error_code"), DB::raw('count(*) as total'))->whereNotNull($dimension)->groupBy($dimension, DB::raw("COALESCE(NULLIF(suberrorcode, ''), NULLIF(engineermemo, ''), 'Null')"))->get();
        $cancelErrorTotals = $cancelData->groupBy('error_code')->map(fn($g) => $g->sum('total'))->sortDesc();
        $chart6Keys = $cancelErrorTotals->keys()->values()->all();
        $cancelDimTotals = $cancelData->groupBy($dimension)->map(fn($g) => $g->sum('total'))->sortDesc();
        $chart6Data = [];
        foreach ($cancelDimTotals->keys() as $dimName) {
            $rows = $cancelData->where($dimension, $dimName); $entry = ['name' => $dimName];
            foreach ($chart6Keys as $key) $entry[$key] = 0;
            foreach ($rows as $row) $entry[$row->error_code] = $row->total;
            $chart6Data[] = $entry;
        }

        $chart2 = (clone $baseQuery)->select(DB::raw("CASE WHEN status_resume LIKE '%PS%' THEN 'Completed' WHEN status_resume LIKE '%CANCEL%' THEN 'Cancel' ELSE 'Open' END as status_group"), DB::raw('count(*) as value'))->groupBy('status_group')->get()->map(fn($i) => ['product' => $i->status_group, 'value' => $i->value]);
        $chart3 = (clone $baseQuery)->select('type_layanan as sub_type', DB::raw("'Total' as product"), DB::raw('count(*) as total_amount'))->groupBy('type_layanan')->orderBy('total_amount', 'desc')->limit(10)->get();

        // MAP DATA
        $regionBounds = [
            'BALI' => ['minLat' => -8.95, 'maxLat' => -7.90, 'minLng' => 114.40, 'maxLng' => 115.75],
            'JATIM_AREA' => ['minLat' => -8.90, 'maxLat' => -6.60, 'minLng' => 110.80, 'maxLng' => 114.45],
            'NUSA TENGGARA' => ['minLat' => -11.20, 'maxLat' => -8.00, 'minLng' => 115.80, 'maxLng' => 127.50],
        ];
        $mapQuery = (clone $baseQuery)->whereNotNull('gps_latitude')->whereNotNull('gps_longitude');
        if (!empty($mapStatus)) {
            $mapQuery->where(function($q) use ($mapStatus) {
                $q->whereRaw('1 = 0'); 
                if (in_array('Completed', $mapStatus)) $q->orWhere('kelompok_status', 'PS');
                if (in_array('Cancel', $mapStatus)) $q->orWhereIn('kelompok_status', ['CANCEL', 'REJECT_FCC']);
                if (in_array('Open', $mapStatus)) $q->orWhereNotIn('kelompok_status', ['PS', 'CANCEL', 'REJECT_FCC']);
            });
        }
        $mapData = $mapQuery->get()->map(function($item) use ($regionBounds) {
            $fixCoord = function($val, $isLat) { if(!$val) return null; $c=preg_replace('/[^0-9\-]/','',$val); if(!is_numeric($c)) return null; $f=(float)$c; if($f==0) return null; $loop=0; if($isLat){ while(($f<-12||$f>10)&&$loop<15){$f/=10;$loop++;} } else { while(abs($f)>142&&$loop<15){$f/=10;$loop++;} } return $f; };
            $lat = $fixCoord($item->gps_latitude ?? $item->GPS_LATITUDE, true);
            $lng = $fixCoord($item->gps_longitude ?? $item->GPS_LONGITUDE, false);
            if ($lat===null || $lng===null) return null;
            $witel = strtoupper($item->witel ?? '');
            
            $act = 'OTHER_AREA';
            if ($lat >= -8.95 && $lat <= -7.90 && $lng >= 114.40 && $lng <= 115.75) $act = 'BALI';
            elseif ($lat >= -8.90 && $lat <= -6.60 && $lng >= 110.80 && $lng <= 114.45) $act = 'JATIM_AREA';
            elseif ($lat >= -11.20 && $lat <= -8.00 && $lng >= 115.80 && $lng <= 127.50) $act = 'NUSA TENGGARA';
            
            $statusGroup = 'Open'; if ($item->kelompok_status === 'PS') $statusGroup = 'Completed'; elseif (in_array($item->kelompok_status, ['CANCEL', 'REJECT_FCC'])) $statusGroup = 'Cancel';

            return ['id' => $item->order_id, 'lat' => $lat, 'lng' => $lng, 'status_group' => $statusGroup, 'name' => $item->customer_name, 'witel' => $witel];
        })->filter(fn($i) => $i !== null)->values();

        $stats = [
            'total'     => (clone $baseQuery)->count(),
            'completed' => (clone $baseQuery)->where('kelompok_status', 'PS')->count(),
            'open'      => (clone $baseQuery)->whereNotIn('kelompok_status', ['PS', 'CANCEL', 'REJECT_FCC'])->count(),
        ];

        $trendQuery = (clone $baseQuery)
            ->select(
                DB::raw("DATE(order_date) as date"),
                DB::raw("count(*) as total"),
                DB::raw("sum(case when kelompok_status = 'PS' then 1 else 0 end) as ps")
            )
            ->whereNotNull('order_date')
            ->groupBy(DB::raw("DATE(order_date)"))
            ->orderBy('date', 'asc')
            ->get();

        $chartTrend = $trendQuery->map(function($item) {
            return [
                'date'  => $item->date,
                'total' => (int) $item->total,
                'ps'    => (int) $item->ps
            ];
        });

        // =================================================================
        // DATA PREVIEW TABLE
        // =================================================================
        $tableQuery = (clone $baseQuery); 

        if ($searchQuery) {
            $tableQuery->where(function($q) use ($searchQuery) {
                $q->where('order_id', 'like', "%{$searchQuery}%")
                  ->orWhere('customer_name', 'like', "%{$searchQuery}%")
                  ->orWhere('type_layanan', 'like', "%{$searchQuery}%");
            });
        }

        $tableData = $tableQuery->select(
            'order_id', 
            'order_date', 
            'customer_name', 
            'witel', 
            'sto', 
            'type_layanan',
            'kelompok_status', 
            'status_resume'
        )
        ->orderBy('order_date', 'asc')
        ->paginate(10)
        ->withQueryString();

        return Inertia::render('DashboardHSI', [
            'stats'         => $stats,
            'mapData'       => $mapData,
            'chart1'        => $chart1, 
            'chart4'        => $chart4, 
            'chart5Data'    => $chart5Data, 'chart5Keys' => $chart5Keys,
            'chart6Data'    => $chart6Data, 'chart6Keys' => $chart6Keys,
            'chart2'        => $chart2,
            'chart3'        => $chart3,
            'chartTrend'    => $chartTrend,
            'witels'        => $rso2Witels,
            'filters'       => $request->only(['start_date', 'end_date', 'global_witel', 'global_branch', 'map_status']),
            'dimensionLabel'=> $dimensionLabel,
            'branchMap'     => $branchMap,
            'tableData'     => $tableData
        ]);
    }

    // =================================================================
    // HALAMAN 2: FLOW PROCESS (UPDATED WITH DETAIL & EXPORT)
    // =================================================================
    public function flow(Request $request)
    {
        // 1. FILTER PARAMETERS
        $startDate = $request->input('start_date');
        $endDate = $request->input('end_date');
        $selectedWitels = $request->input('global_witel', []); 
        $selectedBranches = $request->input('global_branch', []); 
        
        // PARAMETER BARU UNTUK DETAIL DAN EXPORT
        $detailCategory = $request->input('detail_category'); 
        $isExport = $request->input('export_detail', false);

        // 2. DEFINE SCOPE
        $rso2Witels = ['JATIM TIMUR', 'JATIM BARAT', 'SURAMADU', 'NUSA TENGGARA', 'BALI'];
        
        // Base Query
        $flowQuery = HsiData::query()->whereIn(DB::raw('TRIM(UPPER(witel))'), $rso2Witels);

        // --- AMBIL BRANCH MAP DINAMIS ---
        $rawBranches = HsiData::select('witel', 'witel_old')
            ->whereIn('witel', $rso2Witels)
            ->whereNotNull('witel_old')
            ->distinct()
            ->get();

        $branchMap = [];
        foreach ($rawBranches as $item) {
            if (!isset($branchMap[$item->witel])) {
                $branchMap[$item->witel] = [];
            }
            if (!in_array($item->witel_old, $branchMap[$item->witel])) {
                $branchMap[$item->witel][] = $item->witel_old;
            }
        }

        // 3. APPLY FILTERS
        if ($startDate && $endDate) {
            $flowQuery->whereDate('order_date', '>=', $startDate)
                      ->whereDate('order_date', '<=', $endDate);
        }
        if (!empty($selectedWitels)) {
            $flowQuery->whereIn('witel', $selectedWitels);
        }
        if (!empty($selectedBranches)) {
            $flowQuery->whereIn('witel_old', $selectedBranches);
        }

        // 4. AGGREGATE DATA STATISTIK UTAMA (Untuk Flowchart)
        // Kita clone query agar query utama tidak berubah saat dipakai untuk detail nanti
        $statsQuery = clone $flowQuery;

        $flowStats = $statsQuery->select(
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
            
            // --- UPDATED LOGIC FOR CONVERSION PS/PI ---
            // Mengikuti logika Report HSI: PI + Fallout + Act Comp + PS
            DB::raw("SUM(CASE WHEN kelompok_status IN ('PI', 'FO_UIM', 'FO_ASAP', 'FO_OSM', 'FO_WFM', 'ACT_COM', 'PS') THEN 1 ELSE 0 END) as ps_pi_denominator"),
            
            DB::raw("SUM(CASE WHEN data_proses = 'REVOKE' AND status_resume = '102 | FOLLOW UP COMPLETED' THEN 1 ELSE 0 END) as followup_completed"),
            DB::raw("SUM(CASE WHEN data_proses = 'REVOKE' AND status_resume = '100 | REVOKE COMPLETED' THEN 1 ELSE 0 END) as revoke_completed"),
            DB::raw("SUM(CASE WHEN data_proses = 'REVOKE' AND status_resume = 'REVOKE ORDER' THEN 1 ELSE 0 END) as revoke_order"),
            DB::raw("SUM(CASE WHEN data_proses = 'REVOKE' AND status_resume = '102 | FOLLOW UP COMPLETED' AND data_ps_revoke = 'PS' THEN 1 ELSE 0 END) as ps_revoke"),
            DB::raw("SUM(CASE WHEN data_proses = 'REVOKE' AND status_resume = '102 | FOLLOW UP COMPLETED' AND (data_ps_revoke = 'PI' OR data_ps_revoke = 'ACT_COM') THEN 1 ELSE 0 END) as ogp_provi_revoke"),
            DB::raw("SUM(CASE WHEN data_proses = 'REVOKE' AND status_resume = '102 | FOLLOW UP COMPLETED' AND (data_ps_revoke = 'FO_WFM' OR data_ps_revoke = 'FO_UIM' OR data_ps_revoke = 'FO_ASAP') THEN 1 ELSE 0 END) as fallout_revoke"),
            DB::raw("SUM(CASE WHEN data_proses = 'REVOKE' AND status_resume = '102 | FOLLOW UP COMPLETED' AND data_ps_revoke = 'CANCEL' THEN 1 ELSE 0 END) as cancel_revoke"),
            DB::raw("SUM(CASE WHEN data_proses = 'REVOKE' AND status_resume = '102 | FOLLOW UP COMPLETED' AND (data_ps_revoke IS NULL OR data_ps_revoke = '#N/A' OR data_ps_revoke = 'INPROGESS_SC' OR data_ps_revoke = 'REVOKE') THEN 1 ELSE 0 END) as lain_lain_revoke"),
            
            // --- FIX COMPLY ---
            DB::raw("SUM(CASE WHEN UPPER(hasil) = 'COMPLY' THEN 1 ELSE 0 END) as comply_count")
        )->first();

        // 5. GET DETAIL DATA (JIKA ADA KATEGORI YG DIPILIH)
        $detailData = null;

        if ($detailCategory) {
            $detailQuery = clone $flowQuery; // Gunakan base query yang sudah difilter tanggal/witel

            switch ($detailCategory) {
                // COLUMN 1
                case 'RE':
                    break; // All data

                // COLUMN 2
                case 'Valid RE':
                    $detailQuery->whereNotIn('data_proses', ['CANCEL QC1', 'CANCEL FCC', 'OGP VERIFIKASI DAN VALID']);
                    break;
                case 'OGP Verif & Valid':
                    $detailQuery->where('data_proses', 'OGP VERIFIKASI DAN VALID');
                    break;
                case 'Cancel QC 1':
                    $detailQuery->where('data_proses', 'CANCEL QC1');
                    break;
                case 'Cancel FCC':
                    $detailQuery->where('data_proses', 'CANCEL FCC');
                    break;

                // COLUMN 3
                case 'Valid WO':
                    $detailQuery->whereNotIn('data_proses', ['CANCEL QC1', 'CANCEL FCC', 'OGP VERIFIKASI DAN VALID', 'UNSC'])
                        ->whereNot(function($q) {
                            $q->where('data_proses', 'OGP SURVEY')->where('status_resume', 'MIA - INVALID SURVEY');
                        })
                        ->whereNot(function($q) {
                            $q->where('data_proses', 'OGP SURVEY')->where('status_message', 'MIE - SEND SURVEY');
                        });
                    break;
                case 'Cancel WO':
                    $detailQuery->where('data_proses', 'OGP SURVEY')->where('status_resume', 'MIA - INVALID SURVEY');
                    break;
                case 'UNSC':
                    $detailQuery->where('data_proses', 'UNSC');
                    break;
                case 'OGP SURVEY':
                    $detailQuery->where('data_proses', 'OGP SURVEY')->where('status_message', 'MIE - SEND SURVEY');
                    break;

                // COLUMN 4
                case 'Valid PI':
                    $detailQuery->whereNotIn('data_proses', ['CANCEL QC1', 'CANCEL FCC', 'OGP VERIFIKASI DAN VALID', 'UNSC', 'CANCEL', 'FALLOUT', 'REVOKE', 'OGP SURVEY'])
                        ->where('status_resume', '!=', 'MIA - INVALID SURVEY');
                    break;
                case 'Cancel Instalasi':
                    $detailQuery->where('data_proses', 'CANCEL');
                    break;
                case 'Fallout':
                    $detailQuery->where('data_proses', 'FALLOUT');
                    break;
                case 'Revoke':
                    $detailQuery->where('data_proses', 'REVOKE');
                    break;

                // COLUMN 5
                case 'PS (COMPLETED)':
                    // Pastikan filter PS yang paling valid digunakan. 
                    // Jika data_proses tidak konsisten, pakai kelompok_status atau status_resume
                    $detailQuery->whereNotIn('data_proses', ['CANCEL QC1', 'CANCEL FCC', 'OGP VERIFIKASI DAN VALID', 'UNSC', 'CANCEL', 'FALLOUT', 'REVOKE', 'OGP PROVI', 'OGP SURVEY'])
                                ->where('status_resume', '!=', 'MIA - INVALID SURVEY');
                    break;
                case 'OGP Provisioning':
                    $detailQuery->where('data_proses', 'OGP PROVI');
                    break;

                // TREE DIAGRAM
                case 'Total Revoke':
                    $detailQuery->where('data_proses', 'REVOKE');
                    break;
                case 'Follow Up Completed':
                    $detailQuery->where('data_proses', 'REVOKE')->where('status_resume', '102 | FOLLOW UP COMPLETED');
                    break;
                case 'Revoke Completed':
                    $detailQuery->where('data_proses', 'REVOKE')->where('status_resume', '100 | REVOKE COMPLETED');
                    break;
                case 'Revoke Order':
                    $detailQuery->where('data_proses', 'REVOKE')->where('status_resume', 'REVOKE ORDER');
                    break;
                
                // LEVEL 3 REVOKE
                case 'PS Revoke':
                    $detailQuery->where('data_proses', 'REVOKE')->where('status_resume', '102 | FOLLOW UP COMPLETED')->where('data_ps_revoke', 'PS');
                    break;
                case 'OGP Provi Revoke':
                    $detailQuery->where('data_proses', 'REVOKE')->where('status_resume', '102 | FOLLOW UP COMPLETED')->whereIn('data_ps_revoke', ['PI', 'ACT_COM']);
                    break;
                case 'Fallout Revoke':
                    $detailQuery->where('data_proses', 'REVOKE')->where('status_resume', '102 | FOLLOW UP COMPLETED')->whereIn('data_ps_revoke', ['FO_WFM', 'FO_UIM', 'FO_ASAP']);
                    break;
                case 'Cancel Revoke':
                    $detailQuery->where('data_proses', 'REVOKE')->where('status_resume', '102 | FOLLOW UP COMPLETED')->where('data_ps_revoke', 'CANCEL');
                    break;
                case 'Lain-Lain Revoke':
                    $detailQuery->where('data_proses', 'REVOKE')->where('status_resume', '102 | FOLLOW UP COMPLETED')
                        ->where(function($q) {
                            $q->whereNull('data_ps_revoke')
                                ->orWhere('data_ps_revoke', '#N/A')
                                ->orWhere('data_ps_revoke', 'INPROGESS_SC')
                                ->orWhere('data_ps_revoke', 'REVOKE');
                        });
                    break;
            }

            // HANDLE EXPORT (Jika tombol export diklik)
            if ($isExport) {
                // Gunakan mapping untuk membersihkan data dari rumus berbahaya
                $exportData = $detailQuery->get()->map(function ($item) {
                    $sanitized = $item->toArray();
                    foreach ($sanitized as $key => $value) {
                        if (is_string($value) && preg_match('/^[\=\+\-\@]/', $value)) {
                            $sanitized[$key] = "'" . $value;
                        }
                    }
                    return $sanitized;
                });
                
                return Excel::download(new class($exportData) implements \Maatwebsite\Excel\Concerns\FromCollection, \Maatwebsite\Excel\Concerns\WithHeadings, \Maatwebsite\Excel\Concerns\ShouldAutoSize, \Maatwebsite\Excel\Concerns\WithStrictNullComparison {
                    protected $data;
                    public function __construct($data) { $this->data = $data; }
                    public function collection() { return $this->data; }
                    public function headings(): array { 
                        return array_keys($this->data->first() ? $this->data->first()->toArray() : []); 
                    }
                }, "Detail_HSI_{$detailCategory}.xlsx");
            }

            // HANDLE PREVIEW TABLE (Pagination)
            $detailData = $detailQuery->select('order_id', 'order_date', 'customer_name', 'witel', 'sto', 'type_layanan', 'kelompok_status', 'status_resume', 'data_proses', 'status_message')
                ->orderBy('order_date', 'desc')
                ->paginate(10)
                ->withQueryString();
        }

        return Inertia::render('FlowProcessHSI', [
            'flowStats' => $flowStats, 
            'witels'    => $rso2Witels, 
            'branchMap' => $branchMap, // <-- Kirim Map
            'filters'   => $request->only(['start_date', 'end_date', 'global_witel', 'global_branch', 'detail_category']),
            'detailData' => $detailData, // Kirim Data Tabel Detail
            'activeCategory' => $detailCategory // Kirim Kategori yang sedang aktif
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