<?php

namespace App\Http\Controllers;

use App\Models\JtData;
use App\Models\UserTableConfiguration;
use Illuminate\Support\Facades\Auth;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
// Pastikan model JtData diimpor jika Anda menggunakannya untuk helper lain,
// meskipun kueri utama kita menggunakan DB::table
use Inertia\Inertia;

class ReportJTController extends Controller
{
    // ===================================================================
    // FUNGSI HELPER (Disalin dari AnalysisJTController)
    // ===================================================================

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
     * Logika CASE untuk menentukan Nama PO (Penanggung Jawab).
     */
    private function getPoCaseStatementString()
    {
        // [PERBAIKAN] Menggunakan 'witel_lama' agar konsisten dengan ProcessJTImport.
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

    /**
     * Kueri untuk Tabel 1: Data Report JT.
     */
    private function getJtReportData()
    {
        // 1. Definisikan ekspresi COUNT dan SUM (Revenue)
        $selectExpressions = [
            DB::raw("SUM(CASE WHEN UPPER(status_tomps_new) LIKE '%INITIAL%' AND go_live = 'N' AND populasi_non_drop = 'Y' THEN 1 ELSE 0 END) AS initial"),
            DB::raw("SUM(CASE WHEN UPPER(status_tomps_new) LIKE '%SURVEY & DRM%' AND go_live = 'N' AND populasi_non_drop = 'Y' THEN 1 ELSE 0 END) AS survey_drm"),
            DB::raw("SUM(CASE WHEN UPPER(status_tomps_new) LIKE '%PERIZINAN & MOS%' AND go_live = 'N' AND populasi_non_drop = 'Y' THEN 1 ELSE 0 END) AS perizinan_mos"),
            DB::raw("SUM(CASE WHEN UPPER(status_tomps_new) LIKE '%INSTALASI%' AND go_live = 'N' AND populasi_non_drop = 'Y' THEN 1 ELSE 0 END) AS instalasi"),
            DB::raw("SUM(CASE WHEN UPPER(status_tomps_new) LIKE '%FI - OGP GOLIVE%' AND go_live = 'N' AND populasi_non_drop = 'Y' THEN 1 ELSE 0 END) AS fi_ogp_live"),
            DB::raw("SUM(CASE WHEN go_live = 'Y' AND populasi_non_drop = 'Y' THEN 1 ELSE 0 END) AS golive_jml_lop"),
            DB::raw("SUM(CASE WHEN populasi_non_drop = 'N' THEN 1 ELSE 0 END) AS `drop`"),
            DB::raw("SUM(CASE WHEN UPPER(status_tomps_new) LIKE '%INITIAL%' AND go_live = 'N' AND populasi_non_drop = 'Y' THEN COALESCE(revenue_plan, 0) ELSE 0 END) AS initial_rev"),
            DB::raw("SUM(CASE WHEN UPPER(status_tomps_new) LIKE '%SURVEY & DRM%' AND go_live = 'N' AND populasi_non_drop = 'Y' THEN COALESCE(revenue_plan, 0) ELSE 0 END) AS survey_drm_rev"),
            DB::raw("SUM(CASE WHEN UPPER(status_tomps_new) LIKE '%PERIZINAN & MOS%' AND go_live = 'N' AND populasi_non_drop = 'Y' THEN COALESCE(revenue_plan, 0) ELSE 0 END) AS perizinan_mos_rev"),
            DB::raw("SUM(CASE WHEN UPPER(status_tomps_new) LIKE '%INSTALASI%' AND go_live = 'N' AND populasi_non_drop = 'Y' THEN COALESCE(revenue_plan, 0) ELSE 0 END) AS instalasi_rev"),
            DB::raw("SUM(CASE WHEN UPPER(status_tomps_new) LIKE '%FI - OGP GOLIVE%' AND go_live = 'N' AND populasi_non_drop = 'Y' THEN COALESCE(revenue_plan, 0) ELSE 0 END) AS fi_ogp_live_rev"),
            DB::raw("SUM(CASE WHEN go_live = 'Y' AND populasi_non_drop = 'Y' THEN COALESCE(revenue_plan, 0) ELSE 0 END) AS golive_rev_lop"),
            DB::raw("SUM(CASE WHEN populasi_non_drop = 'Y' THEN COALESCE(revenue_plan, 0) ELSE 0 END) AS rev_all_lop"),
        ];

        // 2. Ambil "Whitelist" Witel
        $witelSegments = $this->getWitelSegments();
        $parentWitelList = array_keys($witelSegments);
        $childWitelList = array_merge(...array_values($witelSegments));
        if (empty($parentWitelList) || empty($childWitelList)) {
            $data = collect();
        } else {
            $parentPlaceholders = implode(',', array_fill(0, count($parentWitelList), '?'));
            $childPlaceholders = implode(',', array_fill(0, count($childWitelList), '?'));
            // 3. Jalankan Query Utama
            $data = DB::table('spmk_mom')
                ->select(
                    DB::raw('TRIM(witel_lama) as witel_lama'), // Anak
                    DB::raw('TRIM(witel_baru) as witel_baru'), // Induk
                    ...$selectExpressions
                )
                ->whereRaw("TRIM(witel_baru) IN ({$parentPlaceholders})", $parentWitelList)
                ->whereRaw("TRIM(witel_lama) IN ({$childPlaceholders})", $childWitelList)
                ->groupBy(DB::raw('TRIM(witel_lama)'), DB::raw('TRIM(witel_baru)'))
                ->orderBy(DB::raw('TRIM(witel_baru)'))
                ->orderBy(DB::raw('TRIM(witel_lama)'))
                ->get();
        }
        // 4. Proses data di PHP
        $reportData = [];
        $allColumns = [
            'initial', 'survey_drm', 'perizinan_mos', 'instalasi', 'fi_ogp_live',
            'initial_rev', 'survey_drm_rev', 'perizinan_mos_rev', 'instalasi_rev', 'fi_ogp_live_rev',
            'golive_jml_lop', 'drop',
            'rev_all_lop', 'golive_rev_lop',
            'jml_lop_exc_drop', 'percent_close',
        ];
        $initializeRow = function ($witelName) use ($allColumns) {
            $row = ['witel' => $witelName];
            foreach ($allColumns as $col) {
                $row[$col] = 0;
            }

            return $row;
        };
        $accumulate = function (&$totalRow, $childRow) use ($allColumns) {
            foreach ($allColumns as $col) {
                if ($col !== 'percent_close') {
                    $totalRow[$col] += $childRow[$col];
                }
            }
        };
        $grandTotal = $initializeRow('GRAND TOTAL');
        $grandTotal['isTotal'] = true;
        $groupedBySegment = $data->groupBy('witel_baru');
        foreach ($witelSegments as $segmentName => $witelChildren) {
            $segmentTotal = $initializeRow($segmentName);
            $segmentTotal['isSegment'] = true;
            $childRows = [];
            $witelDataFromDB = $groupedBySegment->get($segmentName);
            $childDataLookup = $witelDataFromDB ? $witelDataFromDB->keyBy('witel_lama') : collect();
            foreach ($witelChildren as $childName) {
                $witelData = $childDataLookup->get($childName);
                $rowData = $initializeRow($childName);
                if ($witelData) {
                    foreach ($allColumns as $col) {
                        if (property_exists($witelData, $col)) {
                            $rowData[$col] = $witelData->$col ?? 0;
                        }
                    }
                    $rowData['jml_lop_exc_drop'] = ($rowData['initial'] ?? 0) + ($rowData['survey_drm'] ?? 0) + ($rowData['perizinan_mos'] ?? 0) + ($rowData['instalasi'] ?? 0) + ($rowData['fi_ogp_live'] ?? 0) + ($rowData['golive_jml_lop'] ?? 0);
                    if ($rowData['jml_lop_exc_drop'] > 0) {
                        $rowData['percent_close'] = (($rowData['golive_jml_lop'] ?? 0) / $rowData['jml_lop_exc_drop']) * 100;
                    } else {
                        $rowData['percent_close'] = 0;
                    }
                }
                $childRows[] = $rowData;
                $accumulate($segmentTotal, $rowData);
            }

            $segmentTotal['jml_lop_exc_drop'] =
                ($segmentTotal['initial'] ?? 0) +
                ($segmentTotal['survey_drm'] ?? 0) +
                ($segmentTotal['perizinan_mos'] ?? 0) +
                ($segmentTotal['instalasi'] ?? 0) +
                ($segmentTotal['fi_ogp_live'] ?? 0) +
                ($segmentTotal['golive_jml_lop'] ?? 0);

            if ($segmentTotal['jml_lop_exc_drop'] > 0) {
                $segmentTotal['percent_close'] = ($segmentTotal['golive_jml_lop'] / $segmentTotal['jml_lop_exc_drop']) * 100;
            } else {
                $segmentTotal['percent_close'] = 0;
            }
            $reportData[] = $segmentTotal;
            $reportData = array_merge($reportData, $childRows);
            $accumulate($grandTotal, $segmentTotal);
        }

        $grandTotal['jml_lop_exc_drop'] =
            ($grandTotal['initial'] ?? 0) +
            ($grandTotal['survey_drm'] ?? 0) +
            ($grandTotal['perizinan_mos'] ?? 0) +
            ($grandTotal['instalasi'] ?? 0) +
            ($grandTotal['fi_ogp_live'] ?? 0) +
            ($grandTotal['golive_jml_lop'] ?? 0);

        if ($grandTotal['jml_lop_exc_drop'] > 0) {
            $grandTotal['percent_close'] = ($grandTotal['golive_jml_lop'] / $grandTotal['jml_lop_exc_drop']) * 100;
        } else {
            $grandTotal['percent_close'] = 0;
        }
        $reportData[] = $grandTotal;

        return $reportData;
    }

    /**
     * Kueri untuk Tabel 2: Project Belum GO LIVE.
     */
    private function getTocReportData()
    {
        $witelSegments = $this->getWitelSegments();
        $parentWitelList = array_keys($witelSegments);
        $childWitelList = array_merge(...array_values($witelSegments));
        if (empty($parentWitelList) || empty($childWitelList)) {
            $data = collect();
        } else {
            $parentPlaceholders = implode(',', array_fill(0, count($parentWitelList), '?'));
            $childPlaceholders = implode(',', array_fill(0, count($childWitelList), '?'));
            $data = DB::table('spmk_mom')
                ->select(
                    DB::raw('TRIM(witel_lama) as witel_lama'), // Anak
                    DB::raw('TRIM(witel_baru) as witel_baru'), // Induk
                    DB::raw("SUM(CASE
                        WHEN UPPER(keterangan_toc) = 'DALAM TOC'
                        AND go_live = 'N'
                        AND populasi_non_drop = 'Y'
                        THEN 1 ELSE 0
                    END) as dalam_toc"),
                    DB::raw("SUM(CASE
                        WHEN UPPER(keterangan_toc) = 'LEWAT TOC'
                        AND go_live = 'N'
                        AND populasi_non_drop = 'Y'
                        THEN 1 ELSE 0
                    END) as lewat_toc")
                )
                ->whereRaw("TRIM(witel_baru) IN ({$parentPlaceholders})", $parentWitelList)
                ->whereRaw("TRIM(witel_lama) IN ({$childPlaceholders})", $childWitelList)
                ->groupBy(DB::raw('TRIM(witel_lama)'), DB::raw('TRIM(witel_baru)'))
                ->orderBy(DB::raw('TRIM(witel_baru)'))
                ->orderBy(DB::raw('TRIM(witel_lama)'))
                ->get()
                ->keyBy(fn ($item) => $item->witel_baru.'|'.$item->witel_lama);
        }
        // Sisa proses (agregasi) di PHP sama...
        $reportData = [];
        $grandTotal = ['witel_lama' => 'TOTAL', 'dalam_toc' => 0, 'lewat_toc' => 0, 'jumlah_lop_on_progress' => 0, 'persen_dalam_toc' => '0,00%', 'isTotal' => true];
        $groupedBySegment = $data->groupBy('witel_baru');
        foreach ($witelSegments as $segmentName => $witelChildren) {
            $segmentTotal = ['witel_lama' => $segmentName, 'dalam_toc' => 0, 'lewat_toc' => 0, 'jumlah_lop_on_progress' => 0, 'persen_dalam_toc' => '0,00%', 'isSegment' => true];
            $childRows = [];
            $witelDataFromDB = $groupedBySegment->get($segmentName);
            $childDataLookup = $witelDataFromDB ? $witelDataFromDB->keyBy('witel_lama') : collect();
            foreach ($witelChildren as $childName) {
                $witelData = $childDataLookup->get($childName);
                $dalam = (int) ($witelData->dalam_toc ?? 0);
                $lewat = (int) ($witelData->lewat_toc ?? 0);
                $jumlah = $dalam + $lewat;
                $persen = ($jumlah > 0) ? ($dalam / $jumlah) * 100 : 0;
                $rowData = ['witel_lama' => $childName, 'dalam_toc' => $dalam, 'lewat_toc' => $lewat, 'jumlah_lop_on_progress' => $jumlah, 'persen_dalam_toc' => number_format($persen, 2, ',', '.').'%'];
                $childRows[] = $rowData;
                $segmentTotal['dalam_toc'] += $dalam;
                $segmentTotal['lewat_toc'] += $lewat;
                $segmentTotal['jumlah_lop_on_progress'] += $jumlah;
            }
            $segJumlah = $segmentTotal['jumlah_lop_on_progress'];
            $segDalam = $segmentTotal['dalam_toc'];
            $segPersen = ($segJumlah > 0) ? ($segDalam / $segJumlah) * 100 : 0;
            $segmentTotal['persen_dalam_toc'] = number_format($segPersen, 2, ',', '.').'%';
            $reportData[] = $segmentTotal;
            $reportData = array_merge($reportData, $childRows);
            $grandTotal['dalam_toc'] += $segmentTotal['dalam_toc'];
            $grandTotal['lewat_toc'] += $segmentTotal['lewat_toc'];
            $grandTotal['jumlah_lop_on_progress'] += $segmentTotal['jumlah_lop_on_progress'];
        }
        $grandJumlah = $grandTotal['jumlah_lop_on_progress'];
        $grandDalam = $grandTotal['dalam_toc'];
        $grandPersen = ($grandJumlah > 0) ? ($grandDalam / $grandJumlah) * 100 : 0;
        $grandTotal['persen_dalam_toc'] = number_format($grandPersen, 2, ',', '.').'%';
        $reportData[] = $grandTotal;

        return $reportData;
    }

    /**
     * Metode index utama untuk menampilkan halaman laporan.
     */
    public function index(Request $request)
    {
        // 1. Ambil data untuk Tabel 1
        $jtReportData = $this->getJtReportData();

        // 2. Ambil data untuk Tabel 2
        $tocReportData = $this->getTocReportData();

        // 3. Ambil data untuk Tabel 3 (Top 3 by Witel)
        // ... (Query Top 3 Witel Anda) ...
        $excludedWitel = [
            'WITEL SEMARANG JATENG UTARA',
            'WITEL SOLO JATENG TIMUR',
            'WITEL YOGYA JATENG SELATAN',
        ];
        $top3ByWitel = DB::table(function ($query) use ($excludedWitel) {
            $query->select(
                'witel_baru',
                'uraian_kegiatan',
                'id_i_hld as ihld',
                'tanggal_mom as tgl_mom',
                'revenue_plan as revenue',
                'status_tomps_new as status_tomps',
                DB::raw('DATEDIFF(NOW(), tanggal_mom) as umur_project'),
                DB::raw('ROW_NUMBER() OVER(
                            PARTITION BY witel_baru
                            ORDER BY DATEDIFF(NOW(), tanggal_mom) DESC
                        ) as rn')
            )
            ->from('spmk_mom')
            ->whereNotIn('status_proyek', ['Selesai', 'Dibatalkan', 'GO LIVE'])
            ->whereRaw("UPPER(status_tomps_new) NOT LIKE '%DROP%'")
            ->whereRaw("UPPER(status_i_hld) NOT LIKE '%DROP%'")
            ->whereRaw("UPPER(status_tomps_new) NOT LIKE '%GO LIVE%'")
            ->where(function ($q) {
                $q->where('status_tomps_last_activity', '!=', 'CLOSE - 100%')
                    ->orWhereNull('status_tomps_last_activity');
            })
            ->whereNotNull('tanggal_mom')
            ->whereNotIn('witel_baru', $excludedWitel)
            ->where('go_live', '=', 'N')
            ->where('populasi_non_drop', '=', 'Y')
            ->where(function ($q) {
                $q->where('bak', '=', '-')
                    ->orWhereNull('bak');
            });
        }, 'ranked_projects')
            ->where('rn', '<=', 3)
            ->orderBy('witel_baru')
            ->orderBy('umur_project', 'desc')
            ->get()
            ->groupBy('witel_baru');

        // 4. Ambil data untuk Tabel 4 (Top 3 by PO)
        $poCaseString = $this->getPoCaseStatementString();
        $top3ByPO = DB::table(function ($query) use ($poCaseString) {
            $query->select(
                'uraian_kegiatan',
                'id_i_hld as ihld',
                'tanggal_mom as tgl_mom',
                'revenue_plan as revenue',
                'status_tomps_new as status_tomps',
                DB::raw("({$poCaseString}) as po_name"),
                DB::raw('DATEDIFF(NOW(), tanggal_mom) as umur_project'),
                DB::raw('ROW_NUMBER() OVER(
                            PARTITION BY ('.$poCaseString.')
                            ORDER BY DATEDIFF(NOW(), tanggal_mom) DESC
                        ) as rn')
            )
            ->from('spmk_mom')
            ->whereNotIn('status_proyek', ['Selesai', 'Dibatalkan', 'GO LIVE'])
            ->whereRaw("UPPER(status_tomps_new) NOT LIKE '%DROP%'")
            ->whereRaw("UPPER(status_tomps_new) NOT LIKE '%GO LIVE%'")
            ->whereNotNull('tanggal_mom');
        }, 'ranked_projects')
            ->where('rn', '<=', 3)
            ->where('po_name', '!=', 'Belum Terdefinisi')
            ->whereNotNull('po_name')
            ->where('po_name', '!=', '')
            ->orderBy('po_name')
            ->orderBy('umur_project', 'desc')
            ->get()
            ->groupBy('po_name');


        // --- [PERBAIKAN DIMULAI DI SINI] ---

        // 5. Ambil Konfigurasi Tabel JT

        // Coba cari config khusus user ini dulu
        $configRecord = UserTableConfiguration::where('page_name', 'analysis_jt')
            ->where('user_id', Auth::id())
            ->first();

        // Jika tidak ada config khusus user, cari config global (yang user_id-nya NULL)
        if (!$configRecord) {
            $configRecord = UserTableConfiguration::where('page_name', 'analysis_jt')
                ->whereNull('user_id')
                ->first();
        }

        // --- [PERBAIKAN SELESAI] ---


        // 6. Render tampilan
        return Inertia::render('ReportJT', [
            'jtReportData' => $jtReportData,
            'tocReportData' => $tocReportData,
            'top3ByWitel' => $top3ByWitel,
            'top3ByPO' => $top3ByPO,

            // Kirim prop baru ini
            'savedConfigJt' => $configRecord ? $configRecord->configuration : null,

            'flash' => session()->get('flash', []),
        ]);
    }

    public function showDetails(Request $request)
    {
        $validated = $request->validate([
            'witel' => 'required|string',
            'kpi_key' => 'required|string', // misal: 'initial', 'golive_jml_lop'
        ]);

        $witelName = $validated['witel'];
        $kpiKey = $validated['kpi_key'];

        // 1. Tentukan target Witel (Induk atau Anak)
        $witelSegments = $this->getWitelSegments();
        $targetWitelList = [];

        if (isset($witelSegments[$witelName])) {
            // Jika yang diklik adalah Witel Induk (misal: 'WITEL BALI')
            $targetWitelList = $witelSegments[$witelName];
        } else {
            // Jika yang diklik adalah Witel Anak (misal: 'WITEL DENPASAR')
            $targetWitelList = [$witelName];
        }

        // 2. Bangun Query
        $query = DB::table('spmk_mom')->whereIn('witel_lama', $targetWitelList);

        // 3. Terapkan filter KPI berdasarkan 'kpi_key'
        // Ini menerjemahkan nama kolom menjadi logika query yang ada di getJtReportData()
        $query->where(function($q) use ($kpiKey) {
            match ($kpiKey) {
                'jml_lop_exc_drop' => $q->where('populasi_non_drop', 'Y'),
                'rev_all_lop' => $q->where('populasi_non_drop', 'Y'), // Akan mengambil semua, revenue diformat di frontend
                'initial' => $q->where('UPPER(status_tomps_new)', 'LIKE', '%INITIAL%')->where('go_live', 'N')->where('populasi_non_drop', 'Y'),
                'survey_drm' => $q->where('UPPER(status_tomps_new)', 'LIKE', '%SURVEY & DRM%')->where('go_live', 'N')->where('populasi_non_drop', 'Y'),
                'perizinan_mos' => $q->where('UPPER(status_tomps_new)', 'LIKE', '%PERIZINAN & MOS%')->where('go_live', 'N')->where('populasi_non_drop', 'Y'),
                'instalasi' => $q->where('UPPER(status_tomps_new)', 'LIKE', '%INSTALASI%')->where('go_live', 'N')->where('populasi_non_drop', 'Y'),
                'fi_ogp_live' => $q->where('UPPER(status_tomps_new)', 'LIKE', '%FI - OGP GOLIVE%')->where('go_live', 'N')->where('populasi_non_drop', 'Y'),
                'golive_jml_lop' => $q->where('go_live', 'Y')->where('populasi_non_drop', 'Y'),
                'golive_rev_lop' => $q->where('go_live', 'Y')->where('populasi_non_drop', 'Y'),
                'drop' => $q->where('populasi_non_drop', 'N'),
                default => $q->whereRaw('1 = 0'), // Default (tidak mengembalikan apa-apa) jika key tidak cocok
            };
        });

        // 4. Ambil data
        $orders = $query->select(
            'id_i_hld as ihld',
            'uraian_kegiatan',
            'witel_lama',
            'status_tomps_new as status_tomps',
            'tanggal_mom as tgl_mom',
            'revenue_plan as revenue',
            'go_live'
        )
        ->orderBy('tanggal_mom', 'desc')
        ->get();

        return Inertia::render('ReportJT/Details', [
            'orders' => $orders,
            'pageTitle' => "Detail Laporan JT: $witelName ($kpiKey)",
            'filters' => $validated,
        ]);
    }

    public function showTocDetails(Request $request)
    {
        $validated = $request->validate([
            'witel' => 'required|string',
            'kpi_key' => 'required|string|in:dalam_toc,lewat_toc,jumlah_lop_on_progress',
        ]);

        $witelName = $validated['witel'];
        $kpiKey = $validated['kpi_key'];

        // 1. Tentukan target Witel (Induk, Anak, atau TOTAL)
        $witelSegments = $this->getWitelSegments(); // Memanggil helper Anda yang sudah ada
        $targetWitelList = [];

        if ($witelName === 'TOTAL') {
             // Jika diklik 'TOTAL', ambil semua Witel Anak
             $targetWitelList = array_merge(...array_values($witelSegments));
        } else if (isset($witelSegments[$witelName])) {
            // Jika yang diklik adalah Witel Induk (misal: 'WITEL BALI')
            $targetWitelList = $witelSegments[$witelName];
        } else {
            // Jika yang diklik adalah Witel Anak (misal: 'WITEL DENPASAR')
            $targetWitelList = [$witelName];
        }

        // 2. Bangun Query Dasar (Semua project belum go live & non-drop)
        // Logika ini diambil dari method getTocReportData() Anda
        $query = DB::table('spmk_mom')
            ->whereIn('witel_lama', $targetWitelList)
            ->where('go_live', 'N')
            ->where('populasi_non_drop', 'Y');

        // 3. Terapkan filter KPI berdasarkan 'kpi_key'
        match ($kpiKey) {
            'dalam_toc' => $query->whereRaw("UPPER(keterangan_toc) = 'DALAM TOC'"),
            'lewat_toc' => $query->whereRaw("UPPER(keterangan_toc) = 'LEWAT TOC'"),
            'jumlah_lop_on_progress' => $query, // Tidak perlu filter tambahan
            default => $query->whereRaw('1 = 0'), // Failsafe
        };

        // 4. Ambil data
        $orders = $query->select(
            'id_i_hld as ihld',
            'uraian_kegiatan',
            'witel_lama',
            'keterangan_toc', // Tambahkan kolom ini untuk info
            'status_tomps_new as status_tomps',
            'tanggal_mom as tgl_mom',
            'revenue_plan as revenue'
        )
        ->orderBy('tanggal_mom', 'desc')
        ->get();

        // 5. RE-USE (Gunakan kembali) view 'ReportJT/Details.jsx' yang sudah ada
        return Inertia::render('ReportJT/Details', [
            'orders' => $orders,
            'pageTitle' => "Detail Laporan TOC: $witelName ($kpiKey)",
            'filters' => $validated,
        ]);
    }
}
