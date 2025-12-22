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
    // HALAMAN 1: DASHBOARD GRAFIK (KEMBALI KE ASAL)
    // =================================================================
    public function index(Request $request)
    {
        $startDate = $request->input('start_date');
        $endDate = $request->input('end_date');
        $allowedWitels = ['BALI', 'JATIM BARAT', 'JATIM TIMUR', 'SURAMADU', 'NUSA TENGGARA'];
        
        $baseQuery = HsiData::query()->whereIn('witel', $allowedWitels);

        if ($startDate && $endDate) {
            $baseQuery->whereDate('order_date', '>=', $startDate)
                      ->whereDate('order_date', '<=', $endDate);
        }

        // --- CHART 1: PIE REGIONAL ---
        $chart1 = (clone $baseQuery)
            ->select('witel as nama_witel', DB::raw("'Total' as product"), DB::raw('count(*) as total_amount'))
            ->groupBy('witel')->orderBy('total_amount', 'desc')->get()
            ->map(fn($item) => ['product' => $item->nama_witel, 'value' => $item->total_amount]);

        // --- CHART 2: PIE STATUS ---
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

        // --- CHART 3: LAYANAN ---
        $queryChart3 = (clone $baseQuery);
        if ($request->has('witel_layanan') && $request->witel_layanan != '') {
            $queryChart3->where('witel', $request->witel_layanan);
        }
        $chart3 = $queryChart3
            ->select('type_layanan as sub_type', DB::raw("'Total' as product"), DB::raw('count(*) as total_amount'))
            ->groupBy('type_layanan')->orderBy('total_amount', 'desc')->limit(10)->get();

        // --- CHART 4: SEBARAN PS ---
        $chart4 = (clone $baseQuery)
            ->where(function($q) {
                $q->where('type_trans', 'not like', '%REVOKE%')
                  ->where('type_trans', 'not like', '%CABUT%');
            })
            ->select('witel', DB::raw('count(*) as value'))
            ->groupBy('witel')->get()->map(fn($i) => ['product' => $i->witel, 'value' => $i->value]);

        // --- CHART 5 & 6: PIVOT CANCEL ---
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
                )->groupBy('witel', DB::raw("COALESCE(NULLIF(sub_error_code, ''), NULLIF(engineer_memo, ''), 'null')"))->get();

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

    // ... (kode atas tetap sama) ...

    // =================================================================
    // HALAMAN 2: FLOW PROCESS HSI (MODIFIKASI FILTER WITEL)
    // =================================================================
    public function flow(Request $request)
    {
        // 1. Ambil Input Filter Witel
        $selectedWitel = $request->input('witel');
        $allowedWitels = ['BALI', 'JATIM BARAT', 'JATIM TIMUR', 'SURAMADU', 'NUSA TENGGARA'];

        // 2. Base Query
        $flowQuery = HsiData::query()->whereIn('witel', $allowedWitels);

        // 3. Terapkan Filter Witel (Jika user memilih witel tertentu)
        if ($selectedWitel) {
            $flowQuery->where('witel', $selectedWitel);
        }

        // --- CALCULATE FLOW STATS ---
        $flowStats = $flowQuery->select(
            DB::raw("COUNT(*) as re"),
            DB::raw("SUM(CASE WHEN data_proses = 'OGP VERIFIKASI DAN VALID' THEN 1 ELSE 0 END) as ogp_verif"),
            DB::raw("SUM(CASE WHEN data_proses = 'CANCEL QC1' THEN 1 ELSE 0 END) as cancel_qc1"),
            DB::raw("SUM(CASE WHEN data_proses = 'CANCEL FCC' THEN 1 ELSE 0 END) as cancel_fcc"),
            DB::raw("SUM(CASE WHEN data_proses != 'CANCEL QC1' AND data_proses != 'CANCEL FCC' AND data_proses != 'OGP VERIFIKASI DAN VALID' THEN 1 ELSE 0 END) as valid_re"),
            DB::raw("SUM(CASE WHEN data_proses = 'OGP SURVEY' OR status_resume = 'MIA - INVALID SURVEY' THEN 1 ELSE 0 END) as cancel_wo"),
            DB::raw("SUM(CASE WHEN data_proses = 'UNSC' THEN 1 ELSE 0 END) as unsc"),
            DB::raw("SUM(CASE WHEN data_proses = 'OGP SURVEY' OR status_message = 'MIE - SEND SURVEY' THEN 1 ELSE 0 END) as ogp_survey_count"),
            DB::raw("SUM(CASE WHEN data_proses != 'CANCEL QC1' AND data_proses != 'CANCEL FCC' AND data_proses != 'OGP VERIFIKASI DAN VALID' AND status_resume != 'MIA - INVALID SURVEY' AND data_proses != 'UNSC' AND data_proses != 'OGP SURVEY' THEN 1 ELSE 0 END) as valid_wo"),
            DB::raw("SUM(CASE WHEN data_proses = 'CANCEL' THEN 1 ELSE 0 END) as cancel_instalasi"),
            DB::raw("SUM(CASE WHEN data_proses = 'FALLOUT' THEN 1 ELSE 0 END) as fallout"),
            
            // FIX: Alias revoke_count
            DB::raw("SUM(CASE WHEN data_proses = 'REVOKE' THEN 1 ELSE 0 END) as revoke_count"),

            DB::raw("SUM(CASE WHEN data_proses != 'CANCEL QC1' AND data_proses != 'CANCEL FCC' AND data_proses != 'OGP VERIFIKASI DAN VALID' AND status_resume != 'MIA - INVALID SURVEY' AND data_proses != 'UNSC' AND data_proses != 'OGP SURVEY' AND data_proses != 'CANCEL' AND data_proses != 'FALLOUT' AND data_proses != 'REVOKE' THEN 1 ELSE 0 END) as valid_pi"),
            DB::raw("SUM(CASE WHEN data_proses = 'OGP PROVI' THEN 1 ELSE 0 END) as ogp_provi"),
            DB::raw("SUM(CASE WHEN data_proses != 'CANCEL QC1' AND data_proses != 'CANCEL FCC' AND data_proses != 'OGP VERIFIKASI DAN VALID' AND status_resume != 'MIA - INVALID SURVEY' AND data_proses != 'UNSC' AND data_proses != 'OGP SURVEY' AND data_proses != 'CANCEL' AND data_proses != 'FALLOUT' AND data_proses != 'REVOKE' AND data_proses != 'OGP PROVI' THEN 1 ELSE 0 END) as ps_count"),
            DB::raw("SUM(CASE WHEN data_proses = 'REVOKE' AND status_resume = '102 | FOLLOW UP COMPLETED' THEN 1 ELSE 0 END) as followup_completed"),

        // 3. Revoke Completed
        // Logic: RSO 2, REVOKE, REVOKE COMP (100 | REVOKE COMPLETED)
            DB::raw("SUM(CASE WHEN data_proses = 'REVOKE' AND status_resume = '100 | REVOKE COMPLETED' THEN 1 ELSE 0 END) as revoke_completed"),

        // 4. Revoke Order
        // Logic: RSO 2, REVOKE, REVOKE ORDER DETAIL (REVOKE ORDER)
            DB::raw("SUM(CASE WHEN data_proses = 'REVOKE' AND status_resume = 'REVOKE ORDER' THEN 1 ELSE 0 END) as revoke_order"),

        // --- CHILDREN OF FOLLOW UP COMPLETED ---
        // (Assuming these are subsets of Follow Up Completed, based on the diagram tree structure)
        // Base Condition for all below: data_proses = 'REVOKE' AND status_resume = '102 | FOLLOW UP COMPLETED'

        // 5. PS (Revoke Flow)
        // Logic: ... AND REVOKE PS (data_ps_revoke = PS)
            DB::raw("SUM(CASE WHEN data_proses = 'REVOKE' AND status_resume = '102 | FOLLOW UP COMPLETED' AND data_ps_revoke = 'PS' THEN 1 ELSE 0 END) as ps_revoke"),

        // 6. OGP PROVI (Revoke Flow)
        // Logic: ... AND ACT COM PI REVOKE (data_ps_revoke = PI OR ACT_COM)
            DB::raw("SUM(CASE WHEN data_proses = 'REVOKE' AND status_resume = '102 | FOLLOW UP COMPLETED' AND (data_ps_revoke = 'PI' OR data_ps_revoke = 'ACT_COM') THEN 1 ELSE 0 END) as ogp_provi_revoke"),

        // 7. FALLOUT (Revoke Flow)
        // Logic: ... AND FALLOUT REVOKE (data_ps_revoke = FO_WFM OR FO_UIM OR FO_ASAP)
            DB::raw("SUM(CASE WHEN data_proses = 'REVOKE' AND status_resume = '102 | FOLLOW UP COMPLETED' AND (data_ps_revoke = 'FO_WFM' OR data_ps_revoke = 'FO_UIM' OR data_ps_revoke = 'FO_ASAP') THEN 1 ELSE 0 END) as fallout_revoke"),
        // 8. CANCEL (Revoke Flow)
        // Logic: ... AND CANCEL REVOKE (data_ps_revoke = CANCEL)
            DB::raw("SUM(CASE WHEN data_proses = 'REVOKE' AND status_resume = '102 | FOLLOW UP COMPLETED' AND data_ps_revoke = 'CANCEL' THEN 1 ELSE 0 END) as cancel_revoke"),
        // 9. LAIN LAIN (Revoke Flow)
        // Logic: ... AND LAIN-LAIN (data_ps_revoke = #N/A OR INPROGESS_SC OR REVOKE or NULL)
        // Note: 'INPROGESS_SC' spelling from metadata. Assuming case sensitive or clean data.
            DB::raw("SUM(CASE WHEN data_proses = 'REVOKE' AND status_resume = '102 | FOLLOW UP COMPLETED' AND (data_ps_revoke IS NULL OR data_ps_revoke = '#N/A' OR data_ps_revoke = 'INPROGESS_SC' OR data_ps_revoke = 'REVOKE') THEN 1 ELSE 0 END) as lain_lain_revoke")
        )->first();

        return Inertia::render('FlowProcessHSI', [
            'flowStats' => $flowStats,
            'witels'    => $allowedWitels, // Kirim daftar witel ke frontend
            'filters'   => $request->only(['witel']),
        ]);
    }

    // ... (sisanya tetap sama) ...

    // Function Import (Tetap)
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