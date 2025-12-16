<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class AnalysisJTDashboardController extends Controller
{
    // ... (Fungsi Helper getWitelSegments, getPoCaseStatementString, applyStrictFilters, getWitelPoMap TETAP SAMA, tidak perlu diubah) ...
    // HANYA BAGIAN handleRequest YANG BERUBAH DI BAWAH INI

    // ===================================================================
    // 1. DEFINISI & HELPER (Salin ulang bagian ini dari kode lama anda)
    // ===================================================================
    private function getWitelSegments()
    {
        return [
            'WITEL BALI' => ['WITEL DENPASAR', 'WITEL SINGARAJA'],
            'WITEL JATIM BARAT' => ['WITEL KEDIRI', 'WITEL MADIUN', 'WITEL MALANG'],
            'WITEL JATIM TIMUR' => ['WITEL JEMBER', 'WITEL PASURUAN', 'WITEL SIDOARJO'],
            'WITEL NUSA TENGGARA' => ['WITEL NTT', 'WITEL NTB'],
            'WITEL SURAMADU' => ['WITEL SURABAYA UTARA', 'WITEL SURABAYA SELATAN', 'WITEL MADURA'],
        ];
    }

    private function getPoCaseStatementString()
    {
        return "
            CASE
                WHEN witel_lama = 'WITEL MADIUN' THEN 'ALFONSUS'
                WHEN witel_lama IN ('WITEL DENPASAR', 'WITEL SINGARAJA') THEN 'DIASTANTO'
                WHEN witel_lama = 'WITEL JEMBER' THEN 'ILHAM MIFTAHUL'
                WHEN witel_lama = 'WITEL PASURUAN' THEN 'I WAYAN KRISNA'
                WHEN witel_lama = 'WITEL SIDOARJO' THEN 'IBRAHIM MUHAMMAD'
                WHEN witel_lama = 'WITEL KEDIRI' THEN 'LUQMAN KURNIAWAN'
                WHEN witel_lama = 'WITEL MALANG' THEN 'NURTRIA IMAN'
                WHEN witel_lama = 'WITEL NTT' THEN 'MARIA FRANSISKA'
                WHEN witel_lama = 'WITEL NTB' THEN 'ANDRE YANA'
                WHEN witel_lama IN ('WITEL SURABAYA UTARA', 'WITEL SURABAYA SELATAN', 'WITEL MADURA')
                THEN
                    (CASE
                        WHEN segmen = 'DBS' THEN 'FERIZKA PARAMITHA'
                        WHEN segmen = 'DGS' THEN 'EKA SARI'
                        WHEN segmen IN ('DES', 'DSS', 'DPS') THEN 'DWIEKA SEPTIAN'
                        ELSE ''
                    END)
                ELSE ''
            END
        ";
    }

    private function applyStrictFilters($query)
    {
        $excludedWitel = ['WITEL SEMARANG JATENG UTARA', 'WITEL SOLO JATENG TIMUR', 'WITEL YOGYA JATENG SELATAN'];

        $query->whereNotIn('keterangan_toc', ['Selesai', 'Dibatalkan', 'GO LIVE'])
              ->whereRaw("UPPER(status_i_hld) NOT LIKE '%DROP%'")
              ->whereRaw("UPPER(status_i_hld) NOT LIKE '%GO LIVE%'")
              ->where(function ($q) {
                  $q->where('status_tomps_new', '!=', 'CLOSE - 100%')->orWhereNull('status_tomps_new');
              })
              ->whereNotNull('tanggal_mom')
              ->whereNotIn('witel_baru', $excludedWitel)
              ->where('go_live', '=', 'N')
              ->where('populasi_non_drop', '=', 'Y')
              ->where(function ($q) {
                  $q->where('keterangan_pelimpahan', '=', '-')->orWhereNull('keterangan_pelimpahan');
              });
    }

    private function getWitelPoMap($parentWitelList)
    {
        // ... (Kode sama persis seperti sebelumnya) ...
        $poCase = $this->getPoCaseStatementString();
        $rawMap = DB::table('spmk_mom')
            ->select(
                'witel_baru',
                DB::raw("COALESCE(NULLIF(po_name, ''), ({$poCase})) as fixed_po_name")
            )
            ->whereNotNull('witel_baru')
            ->distinct()
            ->get();
        $mapping = [];
        $validParents = [];
        foreach ($parentWitelList as $p) {
            $validParents[strtoupper(trim($p))] = $p;
        }
        foreach ($rawMap as $row) {
            $dbWitelClean = strtoupper(trim($row->witel_baru));
            $po = $row->fixed_po_name;
            if (empty($po) || $po == 'Belum Terdefinisi') {
                continue;
            }
            if (isset($validParents[$dbWitelClean])) {
                $realKey = $validParents[$dbWitelClean];
                if (!isset($mapping[$realKey])) {
                    $mapping[$realKey] = [];
                }
                if (!in_array($po, $mapping[$realKey])) {
                    $mapping[$realKey][] = $po;
                }
            }
        }
        foreach ($mapping as $key => $pos) {
            sort($mapping[$key]);
        }
        return $mapping;
    }

    public function index(Request $request)
    {
        // ... (Kode sama) ...
        $settings = Cache::get('granular_embed_settings', []);
        if (isset($settings['jt']) && $settings['jt']['enabled'] && !empty($settings['jt']['url'])) {
            return Inertia::render('Dashboard/ExternalEmbed', [
                'embedUrl' => $settings['jt']['url'],
                'headerTitle' => 'Dashboard Analysis JT',
            ]);
        }
        return $this->handleRequest($request, false);
    }

    public function embed(Request $request)
    {
        return $this->handleRequest($request, true);
    }

    // ===================================================================
    // 3. LOGIC UTAMA (UPDATED)
    // ===================================================================

    private function handleRequest(Request $request, $isEmbed)
    {
        // A. Validasi
        $validated = $request->validate([
            'startDate' => 'nullable|date_format:Y-m-d',
            'endDate'   => 'nullable|date_format:Y-m-d|after_or_equal:startDate',
            // ... validasi lain tetap ...
            'witels'    => 'nullable|array',
            'pos'       => 'nullable|array',
            'limit'     => 'nullable|in:10,50,100,500',
            'search'    => 'nullable|string|max:255',
        ]);

        $limit  = $validated['limit'] ?? '10';
        $search = $validated['search'] ?? null;

        // --- [PERBAIKAN LOGIC TANGGAL DEFAULT] ---

        // 1. Cari Tanggal Terakhir di Database
        $latestMomDate = DB::table('spmk_mom')->max('tanggal_mom');

        // 2. Tentukan Default: Awal Tahun s/d Tanggal Terakhir DB
        $defaultStartDate = now()->startOfYear()->format('Y-m-d');
        $defaultEndDate   = $latestMomDate ? \Carbon\Carbon::parse($latestMomDate)->format('Y-m-d') : now()->format('Y-m-d');

        // 3. Gunakan Input User jika ada, jika tidak gunakan Default
        $startDateToUse = $request->input('startDate', $defaultStartDate);
        $endDateToUse   = $request->input('endDate', $defaultEndDate);

        // --- [END PERBAIKAN LOGIC TANGGAL] ---

        // C. Setup Struktur Witel & Map (TETAP)
        $witelSegments = $this->getWitelSegments();
        $parentWitelList = array_keys($witelSegments);
        $childWitelList = array_merge(...array_values($witelSegments));
        $witelPoMap = $this->getWitelPoMap($parentWitelList);
        $poCaseString = $this->getPoCaseStatementString();

        // D. Filter Logic (UPDATE: Gunakan variabel $startDateToUse)
        $applyUserFilters = function ($query) use ($validated, $startDateToUse, $endDateToUse, $parentWitelList, $childWitelList, $poCaseString) {

            // 1. Filter Tanggal (SELALU TERAPKAN FILTER TANGGAL)
            // Karena sekarang sudah ada default value, kita tidak perlu cek isset($validated) lagi untuk tanggal
            $query->whereBetween('tanggal_mom', [$startDateToUse, $endDateToUse]);

            // 2. Filter Witel
            if (isset($validated['witels']) && !empty($validated['witels'])) {
                $query->whereIn(DB::raw('TRIM(witel_baru)'), $validated['witels']);
            } else {
                $query->whereIn(DB::raw('TRIM(witel_baru)'), $parentWitelList);
            }
            // 3. Filter Child Witel
            $query->whereIn(DB::raw('TRIM(witel_lama)'), $childWitelList);
            // 4. Filter PO
            if (array_key_exists('pos', $validated)) {
                if (!empty($validated['pos'])) {
                    $poListString = implode("','", $validated['pos']);
                    $query->whereRaw("COALESCE(NULLIF(po_name, ''), ({$poCaseString})) IN ('{$poListString}')");
                } else {
                    $query->whereRaw('1 = 0');
                }
            }
        };

        $applyStrictReportFilters = function ($query) {
            $this->applyStrictFilters($query);
        };

        // --- E. BUILD QUERIES ---

        // 1. Status Data (Pie & Stacked)
        $statusData = DB::table('spmk_mom')
            ->select(
                DB::raw('TRIM(witel_baru) as witel_induk'),
                DB::raw("SUM(CASE WHEN (UPPER(status_i_hld) LIKE '%GO LIVE%' AND populasi_non_drop = 'Y') THEN 1 ELSE 0 END) as golive"),
                DB::raw("SUM(CASE WHEN keterangan_toc NOT IN ('Selesai', 'Dibatalkan', 'GO LIVE') THEN 1 ELSE 0 END) as blm_golive"),
                DB::raw("SUM(CASE WHEN populasi_non_drop = 'N' THEN 1 ELSE 0 END) as `drop`")
            )
            ->whereIn(DB::raw('TRIM(witel_baru)'), $parentWitelList)
            ->tap($applyUserFilters)
            ->groupBy(DB::raw('TRIM(witel_baru)'))
            ->orderBy(DB::raw('TRIM(witel_baru)'))
            ->get();

        $pieChartData = ['doneGolive' => $statusData->sum('golive'), 'blmGolive' => $statusData->sum('blm_golive'), 'drop' => $statusData->sum('drop')];
        $stackedBarData = $statusData->map(fn ($item) => ['witel' => $item->witel_induk, 'golive' => $item->golive, 'blmGolive' => $item->blm_golive, 'drop' => $item->drop]);

        // 2 & 3. Chart Usia
        $rawRankingData = DB::table('spmk_mom')
            ->select(
                'uraian_kegiatan',
                DB::raw('TRIM(witel_baru) as witel_induk'),
                DB::raw("COALESCE(NULLIF(po_name, ''), ({$poCaseString})) as fixed_po_name"),
                DB::raw('DATEDIFF(NOW(), tanggal_mom) as usia')
            )
            ->tap($applyUserFilters)
            ->tap($applyStrictReportFilters)
            ->get();

        $usiaWitelData = $rawRankingData
            ->groupBy('witel_induk')
            ->flatMap(function ($items, $witel) {
                return $items->sortByDesc('usia')->values()->take(3)->map(function ($item, $index) {
                    return [
                        'witel_induk' => $item->witel_induk,
                        'po_name' => $item->fixed_po_name,
                        'uraian_kegiatan' => $item->uraian_kegiatan,
                        'usia' => $item->usia,
                        'rank' => $index + 1,
                    ];
                });
            })->values()->all();

        $usiaPoData = $rawRankingData
            ->where('fixed_po_name', '!=', '')
            ->where('fixed_po_name', '!=', 'Belum Terdefinisi')
            ->groupBy('fixed_po_name')
            ->flatMap(function ($items, $poName) {
                return $items->sortByDesc('usia')->values()->take(3)->map(function ($item, $index) {
                    return [
                        'fixed_po_name' => $item->fixed_po_name,
                        'po_name' => $item->fixed_po_name,
                        'uraian_kegiatan' => $item->uraian_kegiatan,
                        'usia' => $item->usia,
                        'rank' => $index + 1,
                    ];
                });
            })->values()->all();

        // 4. Radar Chart
        $radarData = DB::table('spmk_mom')
            ->select(
                DB::raw('TRIM(witel_baru) as witel_induk'),
                DB::raw("SUM(CASE WHEN (UPPER(status_i_hld) LIKE '%INITIAL%' AND go_live = 'N' AND populasi_non_drop = 'Y') THEN 1 ELSE 0 END) AS initial"),
                DB::raw("SUM(CASE WHEN (UPPER(status_i_hld) LIKE '%SURVEY%' AND go_live = 'N' AND populasi_non_drop = 'Y') THEN 1 ELSE 0 END) AS survey_drm"),
                DB::raw("SUM(CASE WHEN ((UPPER(status_i_hld) LIKE '%PERIZINAN%' OR UPPER(status_i_hld) LIKE '%MOS%') AND go_live = 'N' AND populasi_non_drop = 'Y') THEN 1 ELSE 0 END) AS perizinan_mos"),
                DB::raw("SUM(CASE WHEN (UPPER(status_i_hld) LIKE '%INSTALASI%' AND go_live = 'N' AND populasi_non_drop = 'Y') THEN 1 ELSE 0 END) AS instalasi"),
                DB::raw("SUM(CASE WHEN ((UPPER(status_i_hld) LIKE '%FI%' OR UPPER(status_i_hld) LIKE '%OGP%') AND go_live = 'N' AND populasi_non_drop = 'Y') THEN 1 ELSE 0 END) AS fi_ogp_live")
            )
            ->tap($applyUserFilters)
            ->groupBy(DB::raw('TRIM(witel_baru)'))
            ->orderBy(DB::raw('TRIM(witel_baru)'))
            ->get()
            ->map(fn ($item) => [
                'witel' => $item->witel_induk, 'initial' => $item->initial, 'survey_drm' => $item->survey_drm,
                'perizinan_mos' => $item->perizinan_mos, 'instalasi' => $item->instalasi, 'fi_ogp_live' => $item->fi_ogp_live,
            ]);

        // 5. Data Preview [UPDATED]
        // Kolom disesuaikan dengan DB spmk_mom + Search Logic
        $dataPreview = DB::table('spmk_mom')
            ->select(
                'spmk_mom.*',
                DB::raw("COALESCE(NULLIF(po_name, ''), ({$poCaseString})) as po_name")
            )
            ->tap($applyUserFilters) // Tetap pakai filter User (Tanggal, Witel, dll)

            // -----------------------------------------------------------
            // HAPUS ATAU KOMENTARI BARIS DI BAWAH INI
            // ->tap($applyStrictReportFilters)
            // -----------------------------------------------------------
            // Penjelasan: Baris di atas adalah yang memaksa data harus
            // statusnya "Belum Go Live". Dengan menghapusnya, semua status akan muncul.

            ->when($search, function ($query, $search) use ($poCaseString) {
                $query->where(function ($q) use ($search, $poCaseString) {
                    $q->where('id_i_hld', 'like', "%{$search}%")
                      ->orWhere('no_nde_spmk', 'like', "%{$search}%")
                      ->orWhere('uraian_kegiatan', 'like', "%{$search}%")
                      ->orWhereRaw("COALESCE(NULLIF(po_name, ''), ({$poCaseString})) LIKE ?", ["%{$search}%"]);
                });
            })
            ->orderBy('usia', 'desc')
            ->paginate($limit)
            ->withQueryString();

        // F. Opsi Filter
        $allPoList = DB::table('spmk_mom')
            ->select(DB::raw("COALESCE(NULLIF(po_name, ''), ({$poCaseString})) as fixed_po_name"))
            ->whereIn(DB::raw('TRIM(witel_baru)'), $parentWitelList)
            ->distinct()
            ->orderBy('fixed_po_name')
            ->pluck('fixed_po_name')
            ->filter(fn ($val) => !empty($val) && $val !== 'Belum Terdefinisi')
            ->values();

        $response = Inertia::render('DashboardJT', [
            'pieChartData' => $pieChartData, 'stackedBarData' => $stackedBarData,
            'usiaWitelData' => $usiaWitelData, 'usiaPoData' => $usiaPoData, 'radarData' => $radarData,
            'dataPreview' => $dataPreview,
            'filters' => [
                'startDate' => $startDateToUse,
                'endDate'   => $endDateToUse,
                'witels'    => $validated['witels'] ?? null,
                'pos'       => $validated['pos'] ?? null,
                'limit'     => $limit,
                'search'    => $search
            ],
            'filterOptions' => [
                'witelIndukList' => $parentWitelList,
                'poList' => $allPoList,
                'witelPoMap' => $witelPoMap,
                'defaultStartDate' => $defaultStartDate,
                'defaultEndDate'   => $defaultEndDate,
            ],
            'isEmbed' => $isEmbed,
        ]);

        if ($isEmbed) {
            return $response->rootView('embed');
        }

        return $response;
    }
}
