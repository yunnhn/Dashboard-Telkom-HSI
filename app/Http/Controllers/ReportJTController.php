<?php

namespace App\Http\Controllers;

use App\Models\UserTableConfiguration;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class ReportJTController extends Controller
{
    // ===================================================================
    // FUNGSI HELPER
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

    private function getJtReportData()
    {
        $baseFilter = "go_live = 'N' AND populasi_non_drop = 'Y'";
        $selectExpressions = [
            DB::raw("SUM(CASE WHEN UPPER(status_tomps_new) LIKE '%INITIAL%' AND $baseFilter THEN 1 ELSE 0 END) AS initial"),
            DB::raw("SUM(CASE WHEN UPPER(status_tomps_new) LIKE '%SURVEY%' AND $baseFilter THEN 1 ELSE 0 END) AS survey_drm"),
            DB::raw("SUM(CASE WHEN (UPPER(status_tomps_new) LIKE '%PERIZINAN%' OR UPPER(status_tomps_new) LIKE '%MOS%') AND $baseFilter THEN 1 ELSE 0 END) AS perizinan_mos"),
            DB::raw("SUM(CASE WHEN UPPER(status_tomps_new) LIKE '%INSTALASI%' AND $baseFilter THEN 1 ELSE 0 END) AS instalasi"),
            DB::raw("SUM(CASE WHEN (UPPER(status_tomps_new) LIKE '%FI%' OR UPPER(status_tomps_new) LIKE '%OGP%') AND $baseFilter THEN 1 ELSE 0 END) AS fi_ogp_live"),
            DB::raw("SUM(CASE WHEN go_live = 'Y' AND populasi_non_drop = 'Y' THEN 1 ELSE 0 END) AS golive_jml_lop"),
            DB::raw("SUM(CASE WHEN populasi_non_drop = 'N' THEN 1 ELSE 0 END) AS `drop`"),
            DB::raw("SUM(CASE WHEN UPPER(status_tomps_new) LIKE '%INITIAL%' AND $baseFilter THEN COALESCE(revenue_plan, 0) ELSE 0 END) AS initial_rev"),
            DB::raw("SUM(CASE WHEN UPPER(status_tomps_new) LIKE '%SURVEY%' AND $baseFilter THEN COALESCE(revenue_plan, 0) ELSE 0 END) AS survey_drm_rev"),
            DB::raw("SUM(CASE WHEN (UPPER(status_tomps_new) LIKE '%PERIZINAN%' OR UPPER(status_tomps_new) LIKE '%MOS%') AND $baseFilter THEN COALESCE(revenue_plan, 0) ELSE 0 END) AS perizinan_mos_rev"),
            DB::raw("SUM(CASE WHEN UPPER(status_tomps_new) LIKE '%INSTALASI%' AND $baseFilter THEN COALESCE(revenue_plan, 0) ELSE 0 END) AS instalasi_rev"),
            DB::raw("SUM(CASE WHEN (UPPER(status_tomps_new) LIKE '%FI%' OR UPPER(status_tomps_new) LIKE '%OGP%') AND $baseFilter THEN COALESCE(revenue_plan, 0) ELSE 0 END) AS fi_ogp_live_rev"),
            DB::raw("SUM(CASE WHEN go_live = 'Y' AND populasi_non_drop = 'Y' THEN COALESCE(revenue_plan, 0) ELSE 0 END) AS golive_rev_lop"),
            DB::raw("SUM(CASE WHEN populasi_non_drop = 'Y' THEN COALESCE(revenue_plan, 0) ELSE 0 END) AS rev_all_lop"),
        ];

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
                    DB::raw('TRIM(witel_lama) as witel_lama'),
                    DB::raw('TRIM(witel_baru) as witel_baru'),
                    ...$selectExpressions
                )
                ->whereRaw("TRIM(witel_baru) IN ({$parentPlaceholders})", $parentWitelList)
                ->whereRaw("TRIM(witel_lama) IN ({$childPlaceholders})", $childWitelList)
                ->groupBy(DB::raw('TRIM(witel_lama)'), DB::raw('TRIM(witel_baru)'))
                ->orderBy(DB::raw('TRIM(witel_baru)'))
                ->orderBy(DB::raw('TRIM(witel_lama)'))
                ->get();
        }

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
                    DB::raw('TRIM(witel_lama) as witel_lama'),
                    DB::raw('TRIM(witel_baru) as witel_baru'),
                    DB::raw("SUM(CASE WHEN UPPER(keterangan_toc) LIKE '%DALAM TOC%' AND go_live = 'N' AND populasi_non_drop = 'Y' THEN 1 ELSE 0 END) as dalam_toc"),
                    DB::raw("SUM(CASE WHEN UPPER(keterangan_toc) LIKE '%LEWAT TOC%' AND go_live = 'N' AND populasi_non_drop = 'Y' THEN 1 ELSE 0 END) as lewat_toc")
                )
                ->whereRaw("TRIM(witel_baru) IN ({$parentPlaceholders})", $parentWitelList)
                ->whereRaw("TRIM(witel_lama) IN ({$childPlaceholders})", $childWitelList)
                ->groupBy(DB::raw('TRIM(witel_lama)'), DB::raw('TRIM(witel_baru)'))
                ->orderBy(DB::raw('TRIM(witel_baru)'))
                ->orderBy(DB::raw('TRIM(witel_lama)'))
                ->get()
                ->keyBy(fn ($item) => $item->witel_baru.'|'.$item->witel_lama);
        }

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

    // ===================================================================
    // METODE INDEX UTAMA (YANG DIPERBAIKI)
    // ===================================================================
    public function index(Request $request)
    {
        // 1. Ambil data untuk Tabel 1
        $jtReportData = $this->getJtReportData();

        // 2. Ambil data untuk Tabel 2
        $tocReportData = $this->getTocReportData();

        // 3. Definisi Excluded Witel (Agar bisa dipakai di kedua query)
        $excludedWitel = [
            'WITEL SEMARANG JATENG UTARA',
            'WITEL SOLO JATENG TIMUR',
            'WITEL YOGYA JATENG SELATAN',
        ];

        // 4. Query Tabel 3 (Top 3 by Witel) - DIPERBAIKI
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
            // [PENAMBAHAN LOGIKA SESUAI REQUEST]
            ->where(function ($q) {
                $q->where('status_tomps_last_activity', '!=', 'CLOSE - 100%')
                    ->orWhereNull('status_tomps_last_activity');
            })
            ->whereNotNull('tanggal_mom')
            ->whereNotIn('witel_baru', $excludedWitel)
            ->where('go_live', '=', 'N')
            ->where('populasi_non_drop', '=', 'Y')
            // [AKHIR PENAMBAHAN]
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

        // 5. Query Tabel 4 (Top 3 by PO) - DIPERBAIKI
        $poCaseString = $this->getPoCaseStatementString();
        $top3ByPO = DB::table(function ($query) use ($poCaseString, $excludedWitel) {
            $query->select(
                'uraian_kegiatan',
                'id_i_hld as ihld',
                'tanggal_mom as tgl_mom',
                'revenue_plan as revenue',
                'status_tomps_new as status_tomps',
                DB::raw("COALESCE(NULLIF(po_name, ''), ({$poCaseString})) as po_name"),
                DB::raw('DATEDIFF(NOW(), tanggal_mom) as umur_project'),
                DB::raw('ROW_NUMBER() OVER(
                            PARTITION BY COALESCE(NULLIF(po_name, ""), ('.$poCaseString.'))
                            ORDER BY DATEDIFF(NOW(), tanggal_mom) DESC
                        ) as rn')
            )
            ->from('spmk_mom')
            ->whereNotIn('status_proyek', ['Selesai', 'Dibatalkan', 'GO LIVE'])
            ->whereRaw("UPPER(status_tomps_new) NOT LIKE '%DROP%'")
            ->whereRaw("UPPER(status_tomps_new) NOT LIKE '%GO LIVE%'")
            // [PENAMBAHAN LOGIKA SESUAI REQUEST]
            ->where(function ($q) {
                $q->where('status_tomps_last_activity', '!=', 'CLOSE - 100%')
                    ->orWhereNull('status_tomps_last_activity');
            })
            ->whereNotNull('tanggal_mom')
            ->whereNotIn('witel_baru', $excludedWitel)
            ->where('go_live', '=', 'N')
            ->where('populasi_non_drop', '=', 'Y');
            // [AKHIR PENAMBAHAN]
        }, 'ranked_projects')
            ->where('rn', '<=', 3)
            ->where('po_name', '!=', 'Belum Terdefinisi')
            ->whereNotNull('po_name')
            ->where('po_name', '!=', '')
            ->orderBy('po_name')
            ->orderBy('umur_project', 'desc')
            ->get()
            ->groupBy('po_name');

        // 6. Ambil Konfigurasi Tabel JT
        $configRecord = UserTableConfiguration::where('page_name', 'analysis_jt')
            ->where('user_id', Auth::id())
            ->first();

        if (!$configRecord) {
            $configRecord = UserTableConfiguration::where('page_name', 'analysis_jt')
                ->whereNull('user_id')
                ->first();
        }

        // 7. Render tampilan
        return Inertia::render('ReportJT', [
            'jtReportData' => $jtReportData,
            'tocReportData' => $tocReportData,
            'top3ByWitel' => $top3ByWitel,
            'top3ByPO' => $top3ByPO,
            'savedConfigJt' => $configRecord ? $configRecord->configuration : null,
            'flash' => session()->get('flash', []),
        ]);
    }

    public function showDetails(Request $request)
    {
        $validated = $request->validate([
            'witel' => 'required|string',
            'kpi_key' => 'required|string',
        ]);

        $witelName = $validated['witel'];
        $kpiKey = $validated['kpi_key'];

        $witelSegments = $this->getWitelSegments();
        $targetWitelList = [];

        if (isset($witelSegments[$witelName])) {
            $targetWitelList = $witelSegments[$witelName];
        } else {
            $targetWitelList = [$witelName];
        }

        $query = DB::table('spmk_mom')->whereIn('witel_lama', $targetWitelList);

        $query->where(function ($q) use ($kpiKey) {
            match ($kpiKey) {
                'jml_lop_exc_drop' => $q->where('populasi_non_drop', 'Y'),
                'rev_all_lop' => $q->where('populasi_non_drop', 'Y'),
                'initial' => $q->whereRaw("UPPER(status_tomps_new) LIKE '%INITIAL%'")->where('go_live', 'N')->where('populasi_non_drop', 'Y'),
                'survey_drm' => $q->whereRaw("UPPER(status_tomps_new) LIKE '%SURVEY%'")->where('go_live', 'N')->where('populasi_non_drop', 'Y'),
                'perizinan_mos' => $q->where(function ($sub) {
                    $sub->whereRaw("UPPER(status_tomps_new) LIKE '%PERIZINAN%'")
                        ->orWhereRaw("UPPER(status_tomps_new) LIKE '%MOS%'");
                })->where('go_live', 'N')->where('populasi_non_drop', 'Y'),
                'instalasi' => $q->whereRaw("UPPER(status_tomps_new) LIKE '%INSTALASI%'")->where('go_live', 'N')->where('populasi_non_drop', 'Y'),
                'fi_ogp_live' => $q->where(function ($sub) {
                    $sub->whereRaw("UPPER(status_tomps_new) LIKE '%FI%'")
                        ->orWhereRaw("UPPER(status_tomps_new) LIKE '%OGP%'");
                })->where('go_live', 'N')->where('populasi_non_drop', 'Y'),
                'golive_jml_lop' => $q->where('go_live', 'Y')->where('populasi_non_drop', 'Y'),
                'golive_rev_lop' => $q->where('go_live', 'Y')->where('populasi_non_drop', 'Y'),
                'drop' => $q->where('populasi_non_drop', 'N'),
                default => $q->whereRaw('1 = 0'),
            };
        });

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

        $witelSegments = $this->getWitelSegments();
        $targetWitelList = [];

        if ($witelName === 'TOTAL') {
            $targetWitelList = array_merge(...array_values($witelSegments));
        } elseif (isset($witelSegments[$witelName])) {
            $targetWitelList = $witelSegments[$witelName];
        } else {
            $targetWitelList = [$witelName];
        }

        $query = DB::table('spmk_mom')
            ->whereIn('witel_lama', $targetWitelList)
            ->where('go_live', 'N')
            ->where('populasi_non_drop', 'Y');

        match ($kpiKey) {
            'dalam_toc' => $query->whereRaw("UPPER(keterangan_toc) LIKE '%DALAM TOC%'"),
            'lewat_toc' => $query->whereRaw("UPPER(keterangan_toc) LIKE '%LEWAT TOC%'"),
            'jumlah_lop_on_progress' => $query,
            default => $query->whereRaw('1 = 0'),
        };

        $orders = $query->select(
            'id_i_hld as ihld',
            'uraian_kegiatan',
            'witel_lama',
            'keterangan_toc',
            'status_tomps_new as status_tomps',
            'tanggal_mom as tgl_mom',
            'revenue_plan as revenue'
        )
        ->orderBy('tanggal_mom', 'desc')
        ->get();

        return Inertia::render('ReportJT/Details', [
            'orders' => $orders,
            'pageTitle' => "Detail Laporan TOC: $witelName ($kpiKey)",
            'filters' => $validated,
        ]);
    }
}
