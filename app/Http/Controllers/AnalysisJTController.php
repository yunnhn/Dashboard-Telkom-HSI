<?php

namespace App\Http\Controllers;

use App\Exports\JtReportExport;
use App\Jobs\ProcessJTImport;
use App\Models\CustomTarget;
use App\Models\PoData;
use App\Models\UserTableConfiguration;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Redirect;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Maatwebsite\Excel\Facades\Excel;

class AnalysisJTController extends Controller
{
    /**
     * CATATAN PERBAIKAN:
     * Fungsi `getPoCaseStatementString` DIHAPUS.
     * Alasannya: Logika penentuan PO Name (Penanggung Jawab) sekarang sudah ditangani
     * di level Import (JtDataImport.php) dan disimpan ke kolom `po_name` di database.
     * Menggunakan kolom DB langsung lebih efisien daripada CASE WHEN raksasa.
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

        $reportData = [];
        $grandTotal = [
            'witel_lama' => 'TOTAL',
            'dalam_toc' => 0,
            'lewat_toc' => 0,
            'jumlah_lop_on_progress' => 0,
            'persen_dalam_toc' => '0,00%',
            'isTotal' => true,
        ];

        $groupedBySegment = $data->groupBy('witel_baru');

        foreach ($witelSegments as $segmentName => $witelChildren) {
            $segmentTotal = [
                'witel_lama' => $segmentName,
                'dalam_toc' => 0,
                'lewat_toc' => 0,
                'jumlah_lop_on_progress' => 0,
                'persen_dalam_toc' => '0,00%',
                'isSegment' => true,
            ];
            $childRows = [];
            $witelDataFromDB = $groupedBySegment->get($segmentName);
            $childDataLookup = $witelDataFromDB ? $witelDataFromDB->keyBy('witel_lama') : collect();

            foreach ($witelChildren as $childName) {
                $witelData = $childDataLookup->get($childName);
                $dalam = (int) ($witelData->dalam_toc ?? 0);
                $lewat = (int) ($witelData->lewat_toc ?? 0);
                $jumlah = $dalam + $lewat;
                $persen = ($jumlah > 0) ? ($dalam / $jumlah) * 100 : 0;

                $rowData = [
                    'witel_lama' => $childName,
                    'dalam_toc' => $dalam,
                    'lewat_toc' => $lewat,
                    'jumlah_lop_on_progress' => $jumlah,
                    'persen_dalam_toc' => number_format($persen, 2, ',', '.').'%',
                ];
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

    public function index(Request $request)
    {
        $filters = $request->all('search', 'tab');

        $jtReportData = $this->getJtReportData();
        $jtSummaryData = collect($jtReportData)->firstWhere('isTotal', true);
        $tocReportData = $this->getTocReportData();

        $excludedWitel = [
            'WITEL SEMARANG JATENG UTARA',
            'WITEL SOLO JATENG TIMUR',
            'WITEL YOGYA JATENG SELATAN',
        ];

        // --- QUERY UTAMA ---
        $belumGoLiveList = DB::table('spmk_mom')
            ->select(
                'spmk_mom.*',
                // [PERBAIKAN] Tidak perlu CASE WHEN lagi, gunakan kolom po_name langsung
                // Kita tetap select explicit jika perlu alias, tapi spmk_mom.* sudah mencakup po_name
                'spmk_mom.po_name',
                DB::raw('DATEDIFF(NOW(), spmk_mom.tanggal_cb) as umur_project')
            )
            ->whereNotIn('spmk_mom.status_proyek', ['Selesai', 'Dibatalkan', 'GO LIVE'])
            ->when($request->input('search'), function ($query, $search) {
                // Logika pencarian disesuaikan untuk menggunakan kolom po_name
                if (request()->input('tab', 'belum_go_live') === 'belum_go_live') {
                    $query->where(function ($q) use ($search) {
                        $q->where('spmk_mom.no_nde_spmk', 'like', "%{$search}%")
                            ->orWhere('spmk_mom.uraian_kegiatan', 'like', "%{$search}%")
                            ->orWhere('spmk_mom.segmen', 'like', "%{$search}%")
                            // [PERBAIKAN] Search langsung ke kolom PO Name
                            ->orWhere('spmk_mom.po_name', 'like', "%{$search}%");
                    });
                }
            })
            // [PERBAIKAN UTAMA] Sorting: Data terbaru (Import terakhir) muncul paling atas
            ->orderBy('spmk_mom.created_at', 'desc')
            ->paginate(20, ['*'], 'page')
            ->appends(request()->query());

        // --- QUERY TOP 3 BY WITEL ---
        $top3ByWitel = DB::table(function ($query) use ($excludedWitel) {
            $query->select(
                'witel_baru',
                'uraian_kegiatan',
                'id_i_hld as ihld',
                'tanggal_mom as tgl_mom',
                'revenue_plan as revenue',
                'status_tomps_new as status_tomps',
                DB::raw('DATEDIFF(NOW(), tanggal_mom) as umur_project'),
                DB::raw('ROW_NUMBER() OVER(PARTITION BY witel_baru ORDER BY DATEDIFF(NOW(), tanggal_mom) DESC) as rn')
            )
               ->from('spmk_mom')
               ->where(function ($q) {
                   $q->where('status_tomps_last_activity', '!=', 'CLOSE - 100%')
                     ->orWhereNull('status_tomps_last_activity');
               })
               ->whereNotNull('tanggal_mom')
               ->whereNotIn('witel_baru', $excludedWitel)
               ->where('go_live', '=', 'N')
               ->where('populasi_non_drop', '=', 'Y');
        }, 'ranked_projects')
        ->where('rn', '<=', 3)
        ->orderBy('witel_baru')
        ->orderBy('umur_project', 'desc')
        ->get()
        ->groupBy('witel_baru');

        // --- QUERY TOP 3 BY PO (DIPERBAIKI) ---
        // Sekarang menggunakan kolom po_name langsung
        $top3ByPO = DB::table(function ($query) use ($excludedWitel) {
            $query->select(
                'uraian_kegiatan',
                'id_i_hld as ihld',
                'tanggal_mom as tgl_mom',
                'revenue_plan as revenue',
                'status_tomps_new as status_tomps',
                'po_name', // [PERBAIKAN] Ambil kolom langsung
                DB::raw('DATEDIFF(NOW(), tanggal_mom) as umur_project'),
                DB::raw('ROW_NUMBER() OVER(PARTITION BY po_name ORDER BY DATEDIFF(NOW(), tanggal_mom) DESC) as rn')
            )
               ->from('spmk_mom')
               ->where(function ($q) {
                   $q->where('status_tomps_last_activity', '!=', 'CLOSE - 100%')
                     ->orWhereNull('status_tomps_last_activity');
               })
               ->whereNotNull('tanggal_mom')
               ->whereNotIn('witel_baru', $excludedWitel)
               ->where('go_live', '=', 'N')
               ->where('populasi_non_drop', '=', 'Y');
        }, 'ranked_projects')
        ->where('rn', '<=', 3)
        ->whereNotNull('po_name')
        ->where('po_name', '!=', '')
        ->where('po_name', '!=', 'Belum Terdefinisi') // Jaga-jaga jika masih ada text ini
        ->orderBy('po_name')
        ->orderBy('umur_project', 'desc')
        ->get()
        ->groupBy('po_name');

        $savedConfig = UserTableConfiguration::where('page_name', 'analysis_jt')->where('user_id', Auth::id())->first();
        if (!$savedConfig) {
            $savedConfig = UserTableConfiguration::where('page_name', 'analysis_jt')->whereNull('user_id')->first();
        }

        return Inertia::render('Admin/AnalysisJT', [
            'jtReportData' => $jtReportData,
            'jtSummaryData' => $jtSummaryData,
            'tocReportData' => $tocReportData,
            'belumGoLiveList' => $belumGoLiveList,
            'top3ByWitel' => $top3ByWitel,
            'top3ByPO' => $top3ByPO,
            'filters' => $filters,
            'savedTableConfig' => $savedConfig ? $savedConfig->configuration : [],
            'flash' => session()->get('flash', []),
        ]);
    }

    /**
     * Menangani upload file data mentah JT dan memulai Job.
     */
    public function upload(Request $request)
    {
        $request->validate([
            'document' => 'required|file|mimes:xlsx,xls,csv|max:51200',
        ]);

        try {
            $path = $request->file('document')->store('imports', 'local');

            $batch = Bus::batch([
                new ProcessJTImport($path),
            ])
            ->name('JT Data Import')
            ->finally(function ($batch) use ($path) {
                Storage::disk('local')->delete($path);
            })
            ->dispatch();

            // URL Bersih dengan Progress Bar
            $queryParams = $request->except('document');
            $queryParams['batch_id'] = $batch->id;
            session()->flash('flash', ['success' => 'File sedang diproses.']);

            return Inertia::location(
                route('admin.analysisJT.index', $queryParams)
            );
        } catch (\Exception $e) {
            Log::error('Gagal mengunggah file JT: '.$e->getMessage());

            return Redirect::back()->with('flash', ['error' => 'Gagal mengunggah file: '.$e->getMessage()]);
        }
    }

    public function cancelImport(Request $request)
    {
        $batchId = $request->input('batch_id');
        if ($batchId) {
            $batch = Bus::findBatch($batchId);
            if ($batch) {
                $batch->cancel();

                return response()->json(['message' => 'Proses impor dibatalkan.']);
            }
        }

        return response()->json(['message' => 'Batch tidak ditemukan.'], 404);
    }

    public function saveConfig(Request $request)
    {
        $validated = $request->validate([
            'configuration' => 'required|array',
            'page_name' => 'required|string',
        ]);

        UserTableConfiguration::updateOrCreate(
            [
                'page_name' => $validated['page_name'],
                'user_id' => Auth::id(),
            ],
            [
                'configuration' => $validated['configuration'],
            ]
        );

        return Redirect::back()->with('success', 'Tampilan tabel berhasil disimpan!');
    }

    public function resetConfig(Request $request)
    {
        $validated = $request->validate(['page_name' => 'required|string']);
        $pageName = $validated['page_name'];

        UserTableConfiguration::where('page_name', $pageName)
            ->where('user_id', Auth::id())
            ->delete();

        UserTableConfiguration::where('page_name', $pageName)
            ->whereNull('user_id')
            ->delete();

        return Redirect::back()->with('success', 'Tampilan tabel berhasil di-reset.');
    }

    public function saveCustomTargets(Request $request)
    {
        $request->validate([
            'targets' => 'required|array',
            'period' => 'required|string|date_format:Y-m',
        ]);
        CustomTarget::updateOrCreate(
            ['page_name' => 'analysis_jt', 'period' => $request->input('period')],
            ['targets' => $request->input('targets')]
        );

        return Redirect::back()->with('flash', ['success' => 'Target kustom berhasil disimpan.']);
    }

    public function uploadPoList(Request $request)
    {
        $request->validate([
            'po_document' => 'required|file|mimes:xlsx,xls,csv|max:10240',
        ]);

        return Redirect::back()->with('flash', ['info' => 'Fitur Upload PO belum diimplementasikan.']);
    }

    public function addPoManually(Request $request)
    {
        $request->validate([
            'po' => 'required|string|max:255',
            'nipnas' => 'required|string|max:255|unique:list_po,nipnas,'.$request->input('nipnas').',nipnas',
            'segment' => 'nullable|string',
            'bill_city' => 'nullable|string',
            'witel' => 'nullable|string',
        ]);
        PoData::updateOrCreate(
            ['nipnas' => $request->input('nipnas')],
            [
                'po' => $request->input('po'),
                'segment' => $request->input('segment'),
                'bill_city' => $request->input('bill_city'),
                'witel' => $request->input('witel'),
            ]
        );

        return Redirect::back()->with('flash', ['success' => 'Data PO berhasil disimpan.']);
    }

    public function export(Request $request)
    {
        $data = $this->getJtReportData();
        $fileName = 'jt_report_'.date('Ymd_His').'.xlsx';

        return Excel::download(new JtReportExport($data), $fileName);
    }

    /*
    |--------------------------------------------------------------------------
    | FUNGSI ROLLBACK
    |--------------------------------------------------------------------------
    */
    public function showRollbackPageJT()
    {
        $recentBatches = DB::table('spmk_mom')->select('batch_id', DB::raw('MAX(created_at) as last_upload_time'))
            ->whereNotNull('batch_id')
            ->groupBy('batch_id')
            ->orderBy('last_upload_time', 'desc')
            ->limit(20)
            ->get();

        return Inertia::render('SuperAdmin/RollbackPageJT', [
            'recentBatches' => $recentBatches,
        ]);
    }

    public function executeRollbackJT(Request $request)
    {
        $validated = $request->validate([
            'batch_id' => 'required|string|exists:spmk_mom,batch_id',
        ], [
            'batch_id.exists' => 'Batch ID ini tidak ditemukan di tabel JT.',
        ]);
        $batchId = $validated['batch_id'];
        Log::warning('Super Admin ['.auth()->id()."] memulai rollback JT untuk Batch ID: {$batchId}");
        try {
            $deletedRows = DB::table('spmk_mom')->where('batch_id', $batchId)->delete();
            Log::info("Rollback JT Batch [{$batchId}]: {$deletedRows} baris dihapus dari spmk_mom.");

            return Redirect::back()->with('success', "Rollback untuk Batch ID: {$batchId} berhasil. Total {$deletedRows} baris telah dihapus.");
        } catch (\Exception $e) {
            Log::error("Gagal melakukan rollback batch JT {$batchId}: ".$e->getMessage());

            return Redirect::back()->with('error', 'Gagal melakukan rollback. Silakan cek log sistem.');
        }
    }

    /*
    |--------------------------------------------------------------------------
    | METODE HELPER PRIBADI
    |--------------------------------------------------------------------------
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

            // GOLIVE (JML LOP): hanya melihat go_live = 'Y'
            DB::raw("SUM(CASE WHEN go_live = 'Y' AND populasi_non_drop = 'Y' THEN 1 ELSE 0 END) AS golive_jml_lop"),

            // DROP: hanya melihat populasi_non_drop = 'N'
            DB::raw("SUM(CASE WHEN populasi_non_drop = 'N' THEN 1 ELSE 0 END) AS `drop`"),

            // REVENUE (dihitung terpisah berdasarkan status + filter)
            DB::raw("SUM(CASE WHEN UPPER(status_tomps_new) LIKE '%INITIAL%' AND go_live = 'N' AND populasi_non_drop = 'Y' THEN COALESCE(revenue_plan, 0) ELSE 0 END) AS initial_rev"),
            DB::raw("SUM(CASE WHEN UPPER(status_tomps_new) LIKE '%SURVEY & DRM%' AND go_live = 'N' AND populasi_non_drop = 'Y' THEN COALESCE(revenue_plan, 0) ELSE 0 END) AS survey_drm_rev"),
            DB::raw("SUM(CASE WHEN UPPER(status_tomps_new) LIKE '%PERIZINAN & MOS%' AND go_live = 'N' AND populasi_non_drop = 'Y' THEN COALESCE(revenue_plan, 0) ELSE 0 END) AS perizinan_mos_rev"),
            DB::raw("SUM(CASE WHEN UPPER(status_tomps_new) LIKE '%INSTALASI%' AND go_live = 'N' AND populasi_non_drop = 'Y' THEN COALESCE(revenue_plan, 0) ELSE 0 END) AS instalasi_rev"),
            DB::raw("SUM(CASE WHEN UPPER(status_tomps_new) LIKE '%FI - OGP GOLIVE%' AND go_live = 'N' AND populasi_non_drop = 'Y' THEN COALESCE(revenue_plan, 0) ELSE 0 END) AS fi_ogp_live_rev"),

            // GOLIVE (REV LOP): hanya melihat go_live = 'Y'
            DB::raw("SUM(CASE WHEN go_live = 'Y' AND populasi_non_drop = 'Y' THEN COALESCE(revenue_plan, 0) ELSE 0 END) AS golive_rev_lop"),

            // REV ALL LOP (Total revenue dari SEMUA KECUALI DROP)
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

        // 4. Proses data di PHP (Struktur Laporan)
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

                    // JML LOP (EXC DROP) = Total (Initial s/d Golive)
                    $rowData['jml_lop_exc_drop'] =
                        ($rowData['initial'] ?? 0) +
                        ($rowData['survey_drm'] ?? 0) +
                        ($rowData['perizinan_mos'] ?? 0) +
                        ($rowData['instalasi'] ?? 0) +
                        ($rowData['fi_ogp_live'] ?? 0) +
                        ($rowData['golive_jml_lop'] ?? 0);

                    // %CLOSE = GOLIVE / JML LOP (EXC DROP)
                    if ($rowData['jml_lop_exc_drop'] > 0) {
                        $rowData['percent_close'] = (($rowData['golive_jml_lop'] ?? 0) / $rowData['jml_lop_exc_drop']) * 100;
                    } else {
                        $rowData['percent_close'] = 0;
                    }
                }
                $childRows[] = $rowData;
                $accumulate($segmentTotal, $rowData);
            }

            // Hitung ulang JML LOP dan %Close untuk Total Segmen
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

        // Hitung ulang JML LOP dan %Close untuk Grand Total
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

    public function getImportProgress($batchId)
    {
        $batch = Bus::findBatch($batchId);
        if (!$batch || $batch->finished()) {
            return response()->json(['progress' => 100]);
        }
        $progress = Cache::get('import_progress_'.$batchId, 0);

        return response()->json(['progress' => $progress]);
    }
}
