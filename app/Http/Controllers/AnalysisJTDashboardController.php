<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;
use Inertia\Inertia;

class AnalysisJTDashboardController extends Controller
{
    /**
     * Mendefinisikan struktur Witel Induk (Parent) dan Witel Anak (Child).
     */
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

    /**
     * Menampilkan halaman dashboard Analysis JT.
     */
    public function index(Request $request)
    {
        // === [BARU] Cek Pengaturan Embed ===
        $settings = Cache::get('granular_embed_settings', []);

        if (isset($settings['jt']) && $settings['jt']['enabled'] && !empty($settings['jt']['url'])) {
            return Inertia::render('Dashboard/ExternalEmbed', [
                'embedUrl' => $settings['jt']['url'],
                'headerTitle' => 'Dashboard Analysis JT' // Judul untuk layout
            ]);
        }

        // 1. Validasi Filter
        $validated = $request->validate([
            'startDate' => 'nullable|date_format:Y-m-d',
            'endDate' => 'nullable|date_format:Y-m-d|after_or_equal:startDate',
            'witels' => 'nullable|array', 'witels.*' => 'string|max:255',
            'pos' => 'nullable|array', 'pos.*' => 'string|max:255',
            'limit' => 'nullable|in:10,50,100,500',
        ]);
        $limit = $validated['limit'] ?? '10';

        // 2. Tentukan Rentang Tanggal (HANYA UNTUK UI DatePicker)
        // Kita tidak akan menggunakan ini untuk memfilter kueri secara default
        $firstOrderDate = DB::table('spmk_mom')->min('tanggal_mom');
        $latestOrderDate = DB::table('spmk_mom')->max('tanggal_mom');
        $startDateForUI = $request->input('startDate', $firstOrderDate ? \Carbon\Carbon::parse($firstOrderDate)->format('Y-m-d') : now()->startOfYear()->format('Y-m-d'));
        $endDateForUI = $request->input('endDate', $latestOrderDate ? \Carbon\Carbon::parse($latestOrderDate)->format('Y-m-d') : now()->format('Y-m-d'));

        // 3. Buat "Whitelist" Witel berdasarkan getWitelSegments
        $witelSegments = $this->getWitelSegments();
        $parentWitelList = array_keys($witelSegments);
        $childWitelList = array_merge(...array_values($witelSegments));

        // 4. Ambil Opsi Filter
        $witelIndukList = $parentWitelList; // Opsi filter adalah Induk

        $poList = DB::table('spmk_mom')
            ->select('po_name')
            ->whereNotNull('po_name')
            ->where('po_name', '!=', 'Belum Terdefinisi')
            ->whereIn(DB::raw('TRIM(witel_baru)'), $parentWitelList) // Hanya PO dari Witel yang valid
            ->whereIn(DB::raw('TRIM(witel_lama)'), $childWitelList) // Hanya PO dari Witel yang valid
            ->whereNotIn('status_proyek', ['Selesai', 'Dibatalkan', 'GO LIVE'])
            ->distinct()
            ->orderBy('po_name')
            ->pluck('po_name');

        // 5. [PERBAIKAN KUNCI] Buat Closure Filter Global
        $applyFilters = function ($query) use ($validated, $parentWitelList, $childWitelList) {
            // [FIX] HANYA terapkan filter tanggal jika user MENGIRIM-nya via request
            if (isset($validated['startDate']) && isset($validated['endDate'])) {
                $query->whereBetween('tanggal_mom', [$validated['startDate'], $validated['endDate']]);
            }
            // Jika tidak ada request, JANGAN filter tanggal sama sekali (ambil semua data)

            // Filter Witel Induk (Grup)
            if (isset($validated['witels']) && is_array($validated['witels'])) {
                if (empty($validated['witels'])) {
                    $query->whereRaw('1 = 0');
                } else {
                    // Filter berdasarkan witel_baru (Induk)
                    $query->whereIn(DB::raw('TRIM(witel_baru)'), $validated['witels']);
                }
            } else {
                // Filter default: HANYA tampilkan Witel yang ada di getWitelSegments
                $query->whereIn(DB::raw('TRIM(witel_baru)'), $parentWitelList);
            }

            // Filter PO Name
            if (isset($validated['pos']) && is_array($validated['pos'])) {
                if (empty($validated['pos'])) {
                    $query->whereRaw('1 = 0');
                } else {
                    $query->whereIn('po_name', $validated['pos']);
                }
            }

            // Filter default: HANYA tampilkan Witel Anak yang valid
            $query->whereIn(DB::raw('TRIM(witel_lama)'), $childWitelList);
        };

        // 6. === KUMPULKAN DATA UNTUK 5 CHARTS ===

        // Chart 1 & 2: Pie Chart (Total) dan Stacked Bar (per Witel)
        $statusData = DB::table('spmk_mom')
            ->select(
                DB::raw('TRIM(witel_baru) as witel_induk'), // Induk (Parent)
                DB::raw("SUM(CASE WHEN (UPPER(status_tomps_new) LIKE '%GO LIVE%' AND populasi_non_drop = 'Y') THEN 1 ELSE 0 END) as golive"),
                DB::raw("SUM(CASE WHEN status_proyek NOT IN ('Selesai', 'Dibatalkan', 'GO LIVE') THEN 1 ELSE 0 END) as blm_golive"),
                DB::raw("SUM(CASE WHEN populasi_non_drop = 'N' THEN 1 ELSE 0 END) as `drop`")
            )
            ->tap($applyFilters) // Terapkan filter opsional
            ->groupBy('witel_induk')
            ->orderBy('witel_induk')
            ->get();

        $pieChartData = [
            'doneGolive' => $statusData->sum('golive'),
            'blmGolive' => $statusData->sum('blm_golive'),
            'drop' => $statusData->sum('drop'),
        ];

        $stackedBarData = $statusData->map(fn ($item) => [
            'witel' => $item->witel_induk,
            'golive' => $item->golive,
            'blmGolive' => $item->blm_golive,
            'drop' => $item->drop,
        ]);

        // Kueri dasar untuk chart "On Progress"
        $onProgressQueryBase = DB::table('spmk_mom')
            ->whereNotIn('status_proyek', ['Selesai', 'Dibatalkan', 'GO LIVE'])
            ->tap($applyFilters);

        // Chart 3: Usia Order Tertinggi per Witel
        $usiaWitelData = (clone $onProgressQueryBase)
            ->select(
                DB::raw('TRIM(witel_baru) as witel_induk'),
                DB::raw('MAX(DATEDIFF(NOW(), tanggal_cb)) as max_usia')
            )
            ->groupBy('witel_induk')
            ->orderBy('witel_induk')
            ->get()
            ->map(fn ($item) => ['witel' => $item->witel_induk, 'usia' => $item->max_usia]);

        // Chart 4: Usia Order Tertinggi per PO
        $usiaPoData = (clone $onProgressQueryBase)
            ->select(
                'po_name',
                DB::raw('MAX(DATEDIFF(NOW(), tanggal_cb)) as max_usia')
            )
            ->whereNotNull('po_name')
            ->where('po_name', '!=', 'Belum Terdefinisi')
            ->groupBy('po_name')
            ->orderBy('po_name')
            ->get()
            ->map(fn ($item) => ['po_name' => $item->po_name, 'usia' => $item->max_usia]);

        // Chart 5: Radar Chart Progress Deploy per Witel
        $radarData = (clone $onProgressQueryBase)
            ->select(
                DB::raw('TRIM(witel_baru) as witel_induk'),
                DB::raw("SUM(CASE WHEN (UPPER(status_tomps_new) LIKE '%INITIAL%' AND go_live = 'N' AND populasi_non_drop = 'Y') THEN 1 ELSE 0 END) AS initial"),
                DB::raw("SUM(CASE WHEN (UPPER(status_tomps_new) LIKE '%SURVEY & DRM%' AND go_live = 'N' AND populasi_non_drop = 'Y') THEN 1 ELSE 0 END) AS survey_drm"),
                DB::raw("SUM(CASE WHEN (UPPER(status_tomps_new) LIKE '%PERIZINAN & MOS%' AND go_live = 'N' AND populasi_non_drop = 'Y') THEN 1 ELSE 0 END) AS perizinan_mos"),
                DB::raw("SUM(CASE WHEN (UPPER(status_tomps_new) LIKE '%INSTALASI%' AND go_live = 'N' AND populasi_non_drop = 'Y') THEN 1 ELSE 0 END) AS instalasi"),
                DB::raw("SUM(CASE WHEN (UPPER(status_tomps_new) LIKE '%FI-OGP LIVE%' AND go_live = 'N' AND populasi_non_drop = 'Y') THEN 1 ELSE 0 END) AS fi_ogp_live")
            )
            ->groupBy('witel_induk')
            ->orderBy('witel_induk')
            ->get()
            ->map(fn ($item) => [
                'witel' => $item->witel_induk,
                'initial' => $item->initial,
                'survey_drm' => $item->survey_drm,
                'perizinan_mos' => $item->perizinan_mos,
                'instalasi' => $item->instalasi,
                'fi_ogp_live' => $item->fi_ogp_live,
            ]);

        // Kueri untuk Data Preview
        $dataPreview = DB::table('spmk_mom')
            ->select(
                'uraian_kegiatan', 'po_name', 'status_proyek', 'tanggal_cb', 'witel_baru', 'witel_lama',
                DB::raw('TRIM(witel_baru) as witel_induk'),
                DB::raw('DATEDIFF(NOW(), tanggal_cb) as usia')
            )
            ->orderBy('usia', 'desc')
            ->tap($applyFilters)
            ->paginate($limit)
            ->withQueryString();

        // 7. Kirim data ke View React
        return Inertia::render('DashboardJT', [
            'pieChartData' => $pieChartData,
            'stackedBarData' => $stackedBarData,
            'usiaWitelData' => $usiaWitelData,
            'usiaPoData' => $usiaPoData,
            'radarData' => $radarData,

            'dataPreview' => $dataPreview,

            'filters' => [
                'startDate' => $validated['startDate'] ?? null, // Kirim null jika tidak diset
                'endDate' => $validated['endDate'] ?? null,   // Kirim null jika tidak diset
                'witels' => $validated['witels'] ?? null,
                'pos' => $validated['pos'] ?? null,
                'limit' => $limit,
            ],
            // Opsi untuk dropdown filter
            'filterOptions' => [
                'witelIndukList' => $witelIndukList,
                'poList' => $poList,
                // Kirim tanggal ini untuk placeholder datepicker
                'initialStartDate' => $startDateForUI,
                'initialEndDate' => $endDateForUI,
            ],
        ]);
    }

    public function embed(Request $request)
    {
        // 1. Validasi Filter
        $validated = $request->validate([
            'startDate' => 'nullable|date_format:Y-m-d',
            'endDate' => 'nullable|date_format:Y-m-d|after_or_equal:startDate',
            'witels' => 'nullable|array', 'witels.*' => 'string|max:255',
            'pos' => 'nullable|array', 'pos.*' => 'string|max:255',
            'limit' => 'nullable|in:10,50,100,500',
        ]);
        $limit = $validated['limit'] ?? '10';

        // 2. Tentukan Rentang Tanggal (HANYA UNTUK UI DatePicker)
        // Kita tidak akan menggunakan ini untuk memfilter kueri secara default
        $firstOrderDate = DB::table('spmk_mom')->min('tanggal_mom');
        $latestOrderDate = DB::table('spmk_mom')->max('tanggal_mom');
        $startDateForUI = $request->input('startDate', $firstOrderDate ? \Carbon\Carbon::parse($firstOrderDate)->format('Y-m-d') : now()->startOfYear()->format('Y-m-d'));
        $endDateForUI = $request->input('endDate', $latestOrderDate ? \Carbon\Carbon::parse($latestOrderDate)->format('Y-m-d') : now()->format('Y-m-d'));

        // 3. Buat "Whitelist" Witel berdasarkan getWitelSegments
        $witelSegments = $this->getWitelSegments();
        $parentWitelList = array_keys($witelSegments);
        $childWitelList = array_merge(...array_values($witelSegments));

        // 4. Ambil Opsi Filter
        $witelIndukList = $parentWitelList; // Opsi filter adalah Induk

        $poList = DB::table('spmk_mom')
            ->select('po_name')
            ->whereNotNull('po_name')
            ->where('po_name', '!=', 'Belum Terdefinisi')
            ->whereIn(DB::raw('TRIM(witel_baru)'), $parentWitelList) // Hanya PO dari Witel yang valid
            ->whereIn(DB::raw('TRIM(witel_lama)'), $childWitelList) // Hanya PO dari Witel yang valid
            ->whereNotIn('status_proyek', ['Selesai', 'Dibatalkan', 'GO LIVE'])
            ->distinct()
            ->orderBy('po_name')
            ->pluck('po_name');

        // 5. [PERBAIKAN KUNCI] Buat Closure Filter Global
        $applyFilters = function ($query) use ($validated, $parentWitelList, $childWitelList) {
            // [FIX] HANYA terapkan filter tanggal jika user MENGIRIM-nya via request
            if (isset($validated['startDate']) && isset($validated['endDate'])) {
                $query->whereBetween('tanggal_mom', [$validated['startDate'], $validated['endDate']]);
            }
            // Jika tidak ada request, JANGAN filter tanggal sama sekali (ambil semua data)

            // Filter Witel Induk (Grup)
            if (isset($validated['witels']) && is_array($validated['witels'])) {
                if (empty($validated['witels'])) {
                    $query->whereRaw('1 = 0');
                } else {
                    // Filter berdasarkan witel_baru (Induk)
                    $query->whereIn(DB::raw('TRIM(witel_baru)'), $validated['witels']);
                }
            } else {
                // Filter default: HANYA tampilkan Witel yang ada di getWitelSegments
                $query->whereIn(DB::raw('TRIM(witel_baru)'), $parentWitelList);
            }

            // Filter PO Name
            if (isset($validated['pos']) && is_array($validated['pos'])) {
                if (empty($validated['pos'])) {
                    $query->whereRaw('1 = 0');
                } else {
                    $query->whereIn('po_name', $validated['pos']);
                }
            }

            // Filter default: HANYA tampilkan Witel Anak yang valid
            $query->whereIn(DB::raw('TRIM(witel_lama)'), $childWitelList);
        };

        // 6. === KUMPULKAN DATA UNTUK 5 CHARTS ===

        // Chart 1 & 2: Pie Chart (Total) dan Stacked Bar (per Witel)
        $statusData = DB::table('spmk_mom')
            ->select(
                DB::raw('TRIM(witel_baru) as witel_induk'), // Induk (Parent)
                DB::raw("SUM(CASE WHEN (UPPER(status_tomps_new) LIKE '%GO LIVE%' AND populasi_non_drop = 'Y') THEN 1 ELSE 0 END) as golive"),
                DB::raw("SUM(CASE WHEN status_proyek NOT IN ('Selesai', 'Dibatalkan', 'GO LIVE') THEN 1 ELSE 0 END) as blm_golive"),
                DB::raw("SUM(CASE WHEN populasi_non_drop = 'N' THEN 1 ELSE 0 END) as `drop`")
            )
            ->tap($applyFilters) // Terapkan filter opsional
            ->groupBy('witel_induk')
            ->orderBy('witel_induk')
            ->get();

        $pieChartData = [
            'doneGolive' => $statusData->sum('golive'),
            'blmGolive' => $statusData->sum('blm_golive'),
            'drop' => $statusData->sum('drop'),
        ];

        $stackedBarData = $statusData->map(fn ($item) => [
            'witel' => $item->witel_induk,
            'golive' => $item->golive,
            'blmGolive' => $item->blm_golive,
            'drop' => $item->drop,
        ]);

        // Kueri dasar untuk chart "On Progress"
        $onProgressQueryBase = DB::table('spmk_mom')
            ->whereNotIn('status_proyek', ['Selesai', 'Dibatalkan', 'GO LIVE'])
            ->tap($applyFilters);

        // Chart 3: Usia Order Tertinggi per Witel
        $usiaWitelData = (clone $onProgressQueryBase)
            ->select(
                DB::raw('TRIM(witel_baru) as witel_induk'),
                DB::raw('MAX(DATEDIFF(NOW(), tanggal_cb)) as max_usia')
            )
            ->groupBy('witel_induk')
            ->orderBy('witel_induk')
            ->get()
            ->map(fn ($item) => ['witel' => $item->witel_induk, 'usia' => $item->max_usia]);

        // Chart 4: Usia Order Tertinggi per PO
        $usiaPoData = (clone $onProgressQueryBase)
            ->select(
                'po_name',
                DB::raw('MAX(DATEDIFF(NOW(), tanggal_cb)) as max_usia')
            )
            ->whereNotNull('po_name')
            ->where('po_name', '!=', 'Belum Terdefinisi')
            ->groupBy('po_name')
            ->orderBy('po_name')
            ->get()
            ->map(fn ($item) => ['po_name' => $item->po_name, 'usia' => $item->max_usia]);

        // Chart 5: Radar Chart Progress Deploy per Witel
        $radarData = (clone $onProgressQueryBase)
            ->select(
                DB::raw('TRIM(witel_baru) as witel_induk'),
                DB::raw("SUM(CASE WHEN (UPPER(status_tomps_new) LIKE '%INITIAL%' AND go_live = 'N' AND populasi_non_drop = 'Y') THEN 1 ELSE 0 END) AS initial"),
                DB::raw("SUM(CASE WHEN (UPPER(status_tomps_new) LIKE '%SURVEY & DRM%' AND go_live = 'N' AND populasi_non_drop = 'Y') THEN 1 ELSE 0 END) AS survey_drm"),
                DB::raw("SUM(CASE WHEN (UPPER(status_tomps_new) LIKE '%PERIZINAN & MOS%' AND go_live = 'N' AND populasi_non_drop = 'Y') THEN 1 ELSE 0 END) AS perizinan_mos"),
                DB::raw("SUM(CASE WHEN (UPPER(status_tomps_new) LIKE '%INSTALASI%' AND go_live = 'N' AND populasi_non_drop = 'Y') THEN 1 ELSE 0 END) AS instalasi"),
                DB::raw("SUM(CASE WHEN (UPPER(status_tomps_new) LIKE '%FI-OGP LIVE%' AND go_live = 'N' AND populasi_non_drop = 'Y') THEN 1 ELSE 0 END) AS fi_ogp_live")
            )
            ->groupBy('witel_induk')
            ->orderBy('witel_induk')
            ->get()
            ->map(fn ($item) => [
                'witel' => $item->witel_induk,
                'initial' => $item->initial,
                'survey_drm' => $item->survey_drm,
                'perizinan_mos' => $item->perizinan_mos,
                'instalasi' => $item->instalasi,
                'fi_ogp_live' => $item->fi_ogp_live,
            ]);

        // Kueri untuk Data Preview
        $dataPreview = DB::table('spmk_mom')
            ->select(
                'uraian_kegiatan', 'po_name', 'status_proyek', 'tanggal_cb', 'witel_baru', 'witel_lama',
                DB::raw('TRIM(witel_baru) as witel_induk'),
                DB::raw('DATEDIFF(NOW(), tanggal_cb) as usia')
            )
            ->orderBy('usia', 'desc')
            ->tap($applyFilters)
            ->paginate($limit)
            ->withQueryString();

        // 7. Kirim data ke View React
        return Inertia::render('DashboardJT', [
            'pieChartData' => $pieChartData,
            'stackedBarData' => $stackedBarData,
            'usiaWitelData' => $usiaWitelData,
            'usiaPoData' => $usiaPoData,
            'radarData' => $radarData,

            'dataPreview' => $dataPreview,

            'filters' => [
                'startDate' => $validated['startDate'] ?? null, // Kirim null jika tidak diset
                'endDate' => $validated['endDate'] ?? null,   // Kirim null jika tidak diset
                'witels' => $validated['witels'] ?? null,
                'pos' => $validated['pos'] ?? null,
                'limit' => $limit,
            ],
            // Opsi untuk dropdown filter
            'filterOptions' => [
                'witelIndukList' => $witelIndukList,
                'poList' => $poList,
                // Kirim tanggal ini untuk placeholder datepicker
                'initialStartDate' => $startDateForUI,
                'initialEndDate' => $endDateForUI,
            ],
            'isEmbed' => true,
        ])->rootView('embed');
    }
}
