<?php

namespace App\Http\Controllers;

use App\Models\TableConfiguration;
use App\Jobs\ImportAndProcessDocument;
use App\Jobs\ProcessCompletedOrders;
use App\Jobs\ProcessCanceledOrders;
use App\Models\CompletedOrder;
use App\Models\AccountOfficer;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Redirect;
use Inertia\Inertia;
use App\Models\DocumentData;
use App\Models\Target;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use App\Exports\InProgressExport;
use App\Models\CanceledOrder;
use Maatwebsite\Excel\Facades\Excel;
use Illuminate\Support\Facades\Cache;
use App\Jobs\ProcessStatusFile;
use App\Models\UpdateLog;

class AnalysisDigitalProductController extends Controller
{
    public function uploadComplete(Request $request)
    {
        $request->validate(['complete_document' => 'required|file|mimes:xlsx,xls,csv']);
        $path = $request->file('complete_document')->store('excel-imports-complete', 'local');

        // Asumsikan ProcessCompletedOrders juga menggunakan Batchable trait
        $batch = Bus::batch([
            new ProcessCompletedOrders($path),
        ])->name('Import Order Complete')->dispatch();

        // UBAH INI: Kirim juga 'jobType'
        return Redirect::back()->with([
            'success' => 'File Order Complete diterima.',
            'batchId' => $batch->id,
            'jobType' => 'complete' // <-- Tambahkan ini
        ]);
    }

    public function syncCompletedOrders()
    {
        $orderIdsToUpdate = CompletedOrder::pluck('order_id');

        if ($orderIdsToUpdate->isEmpty()) {
            return Redirect::back()->with('error', 'Tidak ada data order complete yang perlu disinkronkan.');
        }

        $ordersToLog = DocumentData::whereIn('order_id', $orderIdsToUpdate)
            ->where('status_wfm', 'in progress')
            ->get(['order_id', 'product as product_name', 'customer_name', 'nama_witel', 'status_wfm']);

        $updatedCount = DocumentData::whereIn('order_id', $ordersToLog->pluck('order_id'))
            ->update([
                'status_wfm' => 'done close bima',
                'milestone' => 'Completed via Sync Process',
                'order_status_n' => 'COMPLETE'
            ]);

        $logs = $ordersToLog->map(function ($order) {
            return [
                'order_id' => $order->order_id,
                'product_name' => $order->product_name,
                'customer_name' => $order->customer_name,
                'nama_witel' => $order->nama_witel,
                'status_lama' => $order->status_wfm,
                'status_baru' => 'done close bima',
                'sumber_update' => 'Upload Complete',
                'created_at' => now(),
                'updated_at' => now(),
            ];
        })->all();

        if (!empty($logs)) {
            UpdateLog::insert($logs);
        }

        CompletedOrder::truncate();

        return Redirect::back()->with('success', "Sinkronisasi selesai. Berhasil mengupdate {$updatedCount} order.");
    }

    public function index(Request $request)
    {
        // ===================================================================
        // LANGKAH 1: PERSIAPAN FILTER
        // ===================================================================
        $periodInput = $request->input('period', now()->format('Y-m'));
        $selectedSegment = $request->input('segment', 'SME');
        $reportPeriod = \Carbon\Carbon::parse($periodInput)->startOfMonth();
        $inProgressYear = $request->input('in_progress_year', now()->year);
        $masterWitelList = ['BALI', 'JATIM BARAT', 'JATIM TIMUR', 'NUSA TENGGARA', 'SURAMADU'];
        $productMap = [
            'netmonk' => 'n', 'oca' => 'o',
            'antares' => 'ae', 'antares eazy' => 'ae', // Menangani 'Antares' & 'Antares Eazy'
            'pijar' => 'ps'  // Menggunakan 'Pijar'
        ];

        // ===================================================================
        // LANGKAH 2: INISIALISASI DATA REPORT
        // ===================================================================
        $reportDataMap = collect($masterWitelList)->mapWithKeys(function ($witel) use ($productMap) {
            $data = ['nama_witel' => $witel];
            $initials = array_unique(array_values($productMap));
            foreach ($initials as $initial) {
                $data["in_progress_{$initial}"] = 0;
                $data["prov_comp_{$initial}_realisasi"] = 0;
                $data["prov_comp_{$initial}_target"] = 0;
                $data["revenue_{$initial}_ach"] = 0;
                $data["revenue_{$initial}_target"] = 0;
            }
            return [$witel => $data];
        });

        // ===================================================================
        // LANGKAH 3: PENGAMBILAN & PEMROSESAN DATA REPORT UTAMA
        // ===================================================================

        // Query untuk data Realisasi & Revenue (berdasarkan tanggal SELESAI)
        $realizationDocuments = DocumentData::whereIn('nama_witel', $masterWitelList)
            ->where('segment', $selectedSegment)->where('status_wfm', 'done close bima')
            ->whereYear('order_created_date', $reportPeriod->year)->whereMonth('order_date', $reportPeriod->month)
            ->get();

        $inProgressDocuments = DocumentData::whereIn('nama_witel', $masterWitelList)
            ->where('segment', $selectedSegment)->where('status_wfm', 'in progress')
            ->whereYear('order_created_date', $reportPeriod->year)->whereMonth('order_created_date', $reportPeriod->month)
            ->get();

        // Proses data In Progress dengan pola "Ambil, Ubah, Simpan" yang BENAR
        foreach ($inProgressDocuments as $doc) {
            $witel = $doc->nama_witel;
            $pName = strtolower(trim($doc->product)); // Standarisasi ke huruf kecil
            if (isset($productMap[$pName]) && $reportDataMap->has($witel)) {
                $currentData = $reportDataMap->get($witel);
                $initial = $productMap[$pName];
                $currentData["in_progress_{$initial}"]++;
                $reportDataMap->put($witel, $currentData);
            }
        }

        // Proses data Realisasi dan Revenue dengan pola yang BENAR
        foreach ($realizationDocuments as $doc) {
            $witel = $doc->nama_witel;
            $pName = strtolower(trim($doc->product)); // Standarisasi ke huruf kecil
            if (isset($productMap[$pName]) && $reportDataMap->has($witel)) {
                $currentData = $reportDataMap->get($witel);
                $initial = $productMap[$pName];
                $currentData["prov_comp_{$initial}_realisasi"]++;
                $currentData["revenue_{$initial}_ach"] += $doc->net_price;
                $reportDataMap->put($witel, $currentData);
            }
        }

        // Ambil dan gabungkan data Target
        $mapProductToKey = ['netmonk'=>'netmonk', 'oca'=>'oca', 'antares'=>'antareseazy', 'antares eazy'=>'antareseazy', 'pijar'=>'pijarsekolah'];
        $targets = Target::where('segment', $selectedSegment)->where('period', $reportPeriod->format('Y-m-d'))->get();
        foreach ($targets as $target) {
            $witel = $target->nama_witel;
            $pName = strtolower(trim($target->product_name)); // Standarisasi ke huruf kecil
            if (isset($reportDataMap[$witel]) && isset($mapProductToKey[$pName])) {
                $currentData = $reportDataMap->get($witel);
                $initial = $productMap[$pName];
                $metricKey = $target->metric_type;
                $currentData["{$metricKey}_{$initial}_target"] = $target->target_value;
                $reportDataMap->put($witel, $currentData);
            }
        }

        // Konversi nilai revenue ke jutaan
        foreach ($reportDataMap as $witel => $data) {
            $currentData = $reportDataMap->get($witel);
            foreach (array_unique(array_values($productMap)) as $initial) {
                $currentData["revenue_{$initial}_ach"] /= 1000000;
            }
            $reportDataMap->put($witel, $currentData);
        }

        $reportData = $reportDataMap->values()->map(fn($item) => (object) $item);

        // ===================================================================
        // LANGKAH 4: AMBIL DATA PENDUKUNG LAINNYA
        // ===================================================================
        $pageName = 'analysis_digital_' . strtolower($selectedSegment);
        $userConfig = TableConfiguration::where('user_id', Auth::id())->where('page_name', $pageName)->first();
        if ($userConfig) {
            $tableConfig = $userConfig->configuration;
        } else {
            $tableConfig = ($selectedSegment === 'SME') ? $this->getDefaultSmeConfig() : $this->getDefaultLegsConfig();
        }

        $inProgressData = DocumentData::where('status_wfm', 'in progress')->where('segment', $selectedSegment)->whereYear('order_created_date', $inProgressYear)->orderBy('order_created_date', 'desc')->get();
        $historyData = UpdateLog::latest()->take(10)->get();
        $qcData = DocumentData::where('status_wfm', '')->orderBy('updated_at', 'desc')->get();
        $newStatusData = DocumentData::where('batch_id', Cache::get('last_successful_batch_id'))->whereNotNull('previous_milestone')->orderBy('updated_at', 'desc')->get();

        $officers = AccountOfficer::orderBy('name')->get();
        $kpiData = $officers->map(function ($officer) {
            $witelFilter = $officer->filter_witel_lama;
            $specialFilter = null;
            if ($officer->special_filter_column && $officer->special_filter_value) {
                $specialFilter = ['column' => $officer->special_filter_column, 'value' => $officer->special_filter_value];
            }

            $singleQuery = DocumentData::where('witel_lama', $witelFilter)
                ->whereNotNull('product')
                ->where('product', 'NOT LIKE', '%-%')
                ->where('product', 'NOT LIKE', "%\n%");
            if ($specialFilter) {
                $singleQuery->where($specialFilter['column'], $specialFilter['value']);
            }

            $done_scone_single = $singleQuery->clone()->where('status_wfm', 'done close bima')->where('channel', 'SC-One')->count();
            $done_ncx_single   = $singleQuery->clone()->where('status_wfm', 'done close bima')->where('channel', '!=', 'SC-One')->count();
            $ogp_scone_single  = $singleQuery->clone()->where('status_wfm', 'in progress')->where('channel', 'SC-One')->count();
            $ogp_ncx_single    = $singleQuery->clone()->where('status_wfm', 'in progress')->where('channel', '!=', 'SC-One')->count();

            $bundleQuery = DB::table('order_products')
                ->join('document_data', 'order_products.order_id', '=', 'document_data.order_id')
                ->where('document_data.witel_lama', $witelFilter);
            if ($specialFilter) {
                $bundleQuery->where('document_data.' . $specialFilter['column'], $specialFilter['value']);
            }

            $done_scone_bundle = $bundleQuery->clone()->where('order_products.status_wfm', 'done close bima')->where('order_products.channel', 'SC-One')->count();
            $done_ncx_bundle   = $bundleQuery->clone()->where('order_products.status_wfm', 'done close bima')->where('order_products.channel', '!=', 'SC-One')->count();
            $ogp_scone_bundle  = $bundleQuery->clone()->where('order_products.status_wfm', 'in progress')->where('order_products.channel', 'SC-One')->count();
            $ogp_ncx_bundle    = $bundleQuery->clone()->where('order_products.status_wfm', 'in progress')->where('order_products.channel', '!=', 'SC-One')->count();

            $done_ncx   = $done_ncx_single + $done_ncx_bundle;
            $done_scone = $done_scone_single + $done_scone_bundle;
            $ogp_ncx    = $ogp_ncx_single + $ogp_ncx_bundle;
            $ogp_scone  = $ogp_scone_single + $ogp_scone_bundle;

            return [
                'id'         => $officer->id,
                'nama_po'    => $officer['name'],
                'witel'      => $officer['display_witel'],
                'done_ncx'   => $done_ncx,
                'done_scone' => $done_scone,
                'ogp_ncx'    => $ogp_ncx,
                'ogp_scone'  => $ogp_scone,
                'total'      => $done_ncx + $done_scone + $ogp_ncx + $ogp_scone,
                'ach_ytd'    => 0,
                'ach_q3'     => 0,
            ];
        });

        // ===================================================================
        // LANGKAH 5: RENDER
        // ===================================================================
        return Inertia::render('AnalysisDigitalProduct', [
            'reportData' => $reportData,
            'currentSegment' => $selectedSegment,
            'period' => $periodInput,
            'inProgressData' => $inProgressData,
            'newStatusData' => $newStatusData,
            'historyData' => $historyData,
            'qcData' => $qcData,
            'accountOfficers' => $officers,
            'kpiData' => $kpiData,
            'currentInProgressYear' => $inProgressYear,
            'initialTableConfig' => $tableConfig,
        ]);
    }

    private function getDefaultSMeConfig(): array
    {
        // Isi dari metode ini adalah konversi langsung dari state React Anda ke array PHP
        return [
            [
                'groupTitle' => 'In Progress',
                'groupClass' => 'bg-blue-600',
                'columns' => [
                    ['key' => 'in_progress_n', 'title' => 'N'],
                    ['key' => 'in_progress_o', 'title' => 'O'],
                    ['key' => 'in_progress_ae', 'title' => 'AE'],
                    ['key' => 'in_progress_ps', 'title' => 'PS'],
                ],
            ],
            [
                'groupTitle' => 'Prov Comp',
                'groupClass' => 'bg-orange-600',
                'columns' => [
                    ['key' => 'prov_comp_n', 'title' => 'N', 'subColumns' => [['key' => '_target', 'title' => 'T'], ['key' => '_realisasi', 'title' => 'R'], ['key' => '_percent', 'title' => 'P']]],
                    ['key' => 'prov_comp_o', 'title' => 'O', 'subColumns' => [['key' => '_target', 'title' => 'T'], ['key' => '_realisasi', 'title' => 'R'], ['key' => '_percent', 'title' => 'P']]],
                    ['key' => 'prov_comp_ae', 'title' => 'AE', 'subColumns' => [['key' => '_target', 'title' => 'T'], ['key' => '_realisasi', 'title' => 'R'], ['key' => '_percent', 'title' => 'P']]],
                    ['key' => 'prov_comp_ps', 'title' => 'PS', 'subColumns' => [['key' => '_target', 'title' => 'T'], ['key' => '_realisasi', 'title' => 'R'], ['key' => '_percent', 'title' => 'P']]],
                ],
            ],
            [
                'groupTitle' => 'REVENUE (Rp Juta)',
                'groupClass' => 'bg-green-700',
                'columns' => [
                    ['key' => 'revenue_n', 'title' => 'N', 'subColumns' => [['key' => '_target', 'title' => 'T'], ['key' => '_ach', 'title' => 'ACH']]],
                    ['key' => 'revenue_o', 'title' => 'O', 'subColumns' => [['key' => '_target', 'title' => 'T'], ['key' => '_ach', 'title' => 'ACH']]],
                    ['key' => 'revenue_ae', 'title' => 'AE', 'subColumns' => [['key' => '_target', 'title' => 'T'], ['key' => '_ach', 'title' => 'ACH']]],
                    ['key' => 'revenue_ps', 'title' => 'PS', 'subColumns' => [['key' => '_target', 'title' => 'T'], ['key' => '_ach', 'title' => 'ACH']]],
                ],
            ],
            [
                'groupTitle' => 'Total Keseluruhan',
                'groupClass' => 'bg-gray-600',
                'columns' => [
                    ['key' => 'grand_total', 'title' => 'Realisasi']
                ],
            ],
        ];
    }

    private function getDefaultLegsConfig(): array
    {
        // Ini adalah konfigurasi default untuk tabel LEGS yang lebih sederhana
        return [
            [
                'groupTitle' => 'In Progress',
                'groupClass' => 'bg-blue-600',
                'columnClass' => 'bg-blue-500',
                'columns' => [
                    ['key' => 'in_progress_n', 'title' => 'N'],
                    ['key' => 'in_progress_o', 'title' => 'O'],
                    ['key' => 'in_progress_ae', 'title' => 'AE'],
                    ['key' => 'in_progress_ps', 'title' => 'PS'],
                ],
            ],
            [
                'groupTitle' => 'Proving Complete', // Judul berbeda
                'groupClass' => 'bg-orange-600',
                'columnClass' => 'bg-orange-500',
                'columns' => [
                    // LEGS hanya punya realisasi, tanpa target & persen
                    ['key' => 'prov_comp_n_realisasi', 'title' => 'N'],
                    ['key' => 'prov_comp_o_realisasi', 'title' => 'O'],
                    ['key' => 'prov_comp_ae_realisasi', 'title' => 'AE'],
                    ['key' => 'prov_comp_ps_realisasi', 'title' => 'PS'],
                ],
            ],
            [
                'groupTitle' => 'REVENUE (Rp Juta)',
                'groupClass' => 'bg-green-700',
                'columnClass' => 'bg-green-600',
                'columns' => [
                    ['key' => 'revenue_n', 'title' => 'N', 'subColumns' => [['key' => '_target', 'title' => 'T'], ['key' => '_ach', 'title' => 'ACH']]],
                    ['key' => 'revenue_o', 'title' => 'O', 'subColumns' => [['key' => '_target', 'title' => 'T'], ['key' => '_ach', 'title' => 'ACH']]],
                    ['key' => 'revenue_ae', 'title' => 'AE', 'subColumns' => [['key' => '_target', 'title' => 'T'], ['key' => '_ach', 'title' => 'ACH']]],
                    ['key' => 'revenue_ps', 'title' => 'PS', 'subColumns' => [['key' => '_target', 'title' => 'T'], ['key' => '_ach', 'title' => 'ACH']]],
                ],
            ],
            [
                'groupTitle' => 'Total Keseluruhan',
                'groupClass' => 'bg-gray-600',
                'columns' => [
                    ['key' => 'grand_total', 'title' => 'Realisasi']
                ],
            ],
        ];
    }

    public function saveTableConfig(Request $request)
    {
        $validated = $request->validate([
            'configuration' => 'required|array',
            'segment' => 'required|string|in:SME,LEGS' // Tambahkan validasi segmen
        ]);

        $pageName = 'analysis_digital_' . strtolower($validated['segment']);

        TableConfiguration::updateOrCreate(
            ['user_id' => Auth::id(), 'page_name' => $pageName],
            ['configuration' => $validated['configuration']]
        );

        return Redirect::back()->with('success', 'Tampilan tabel berhasil disimpan!');
    }

    public function updateTargets(Request $request)
    {
        $validated = $request->validate([
            'targets' => 'required|array', 'segment' => 'required|string|in:SME,LEGS',
            'period' => 'required|date_format:Y-m-d', 'targets.*.prov_comp.*' => 'nullable|numeric',
            'targets.*.revenue.*' => 'nullable|numeric',
        ]);
        foreach ($validated['targets'] as $witelName => $metrics) {
            foreach ($metrics as $metricType => $products) {
                foreach ($products as $productInitial => $targetValue) {
                    $productName = $this->mapProductInitialToName($productInitial);
                    if (!$productName) continue;
                    Target::updateOrCreate(
                        ['segment' => $validated['segment'], 'period' => $validated['period'], 'nama_witel' => $witelName, 'metric_type' => $metricType, 'product_name' => $productName],
                        ['target_value' => $targetValue ?? 0]
                    );
                }
            }
        }
        return Redirect::back()->with('success', 'Target berhasil diperbarui!');
    }

    private function mapProductInitialToName(string $initial): ?string
    {
        $map = ['n' => 'Netmonk', 'o' => 'OCA', 'ae' => 'Antares Eazy', 'ps' => 'Pijar Sekolah'];
        return $map[strtolower($initial)] ?? null;
    }

    public function getImportProgress(string $batchId)
    {
        $batch = Bus::findBatch($batchId);

        if (!$batch || $batch->finished()) {
            return response()->json(['progress' => 100]);
        }

        // Cek progres dari Cache yang diisi oleh Importer
        $progress = Cache::get('import_progress_' . $batchId, 0);

        return response()->json(['progress' => $progress]);
    }

    public function upload(Request $request)
    {
        $request->validate(['document' => 'required|file|mimes:xlsx,xls,csv']);
        $path = $request->file('document')->store('excel-imports', 'local');

        $batch = Bus::batch([
            new ImportAndProcessDocument($path),
        ])->name('Import Data Mentah')->dispatch();

        // UBAH INI: Kirim juga 'jobType'
        return Redirect::back()->with([
            'success' => 'Dokumen berhasil diterima.',
            'batchId' => $batch->id,
            'jobType' => 'mentah'
        ]);
    }

    public function updateManualComplete(Request $request, $order_id)
    {
        $order = DocumentData::where('order_id', $order_id)->first();

        if ($order) {
            $order->status_wfm = 'done close bima';
            $order->order_status_n = 'COMPLETE';
            $order->milestone = 'Completed Manually'; // <-- Penanda penting!
            $order->save();

            return Redirect::back()->with('success', "Order ID: {$order_id} berhasil di-complete.");
        }
        return Redirect::back()->with('error', "Order ID: {$order_id} tidak ditemukan.");
    }

    // Pastikan metode updateManualCancel juga sudah ada dan benar
    public function updateManualCancel(Request $request, $order_id)
    {
        $order = DocumentData::where('order_id', $order_id)->first();
        if ($order) {
            $order->status_wfm = 'done close cancel';
            $order->order_status_n = 'CANCEL';
            $order->milestone = 'Canceled Manually'; // <-- Penanda penting!
            $order->save();
            return Redirect::back()->with('success', "Order ID: {$order_id} berhasil dibatalkan.");
        }
        return Redirect::back()->with('error', "Order ID: {$order_id} tidak ditemukan.");
    }

    public function exportInProgress(Request $request)
    {
        $segment = $request->input('segment', 'SME');
        $year = $request->input('in_progress_year', now()->year);
        $fileName = 'in_progress_data_' . $segment . '_' . $year . '.xlsx';

        // Panggil kelas Export dan trigger download
        return Excel::download(new InProgressExport($segment, $year), $fileName);
    }

    public function updateQcStatusToProgress(Request $request, $order_id)
    {
        $order = DocumentData::find($order_id);
        if ($order) {
            $order->status_wfm = 'in progress';
            $order->milestone = 'QC Processed - Return to In Progress';
            $order->save();
            return Redirect::back()->with('success', "Order ID {$order_id} dikembalikan ke status 'In Progress'.");
        }
        return Redirect::back()->with('error', "Order ID {$order_id} tidak ditemukan.");
    }

    public function updateQcStatusToDone(Request $request, $order_id)
    {
        $order = DocumentData::find($order_id);
        if ($order) {
            $order->status_wfm = 'done close bima';
            $order->order_status_n = 'COMPLETE'; // Sesuaikan juga status n
            $order->milestone = 'QC Processed - Marked as Complete';
            $order->save();
            return Redirect::back()->with('success', "Order ID {$order_id} diubah menjadi 'Complete'.");
        }
        return Redirect::back()->with('error', "Order ID {$order_id} tidak ditemukan.");
    }

    public function uploadCancel(Request $request)
    {
        $request->validate(['cancel_document' => 'required|file|mimes:xlsx,xls,csv']);
        $path = $request->file('cancel_document')->store('excel-imports-cancel', 'local');

        // Asumsikan ProcessCanceledOrders juga menggunakan Batchable trait
        $batch = Bus::batch([
            new ProcessCanceledOrders($path),
        ])->name('Import Order Cancel')->dispatch();

        // UBAH INI: Kirim juga 'jobType'
        return Redirect::back()->with([
            'success' => 'File Order Cancel diterima.',
            'batchId' => $batch->id,
            'jobType' => 'cancel' // <-- Tambahkan ini
        ]);
    }

    public function syncCanceledOrders()
    {
        $orderIdsToUpdate = CanceledOrder::pluck('order_id');

        if ($orderIdsToUpdate->isEmpty()) {
            return Redirect::back()->with('error', 'Tidak ada data order cancel yang perlu disinkronkan.');
        }

        // 1. Ambil data LAMA untuk logging
        $ordersToLog = DocumentData::whereIn('order_id', $orderIdsToUpdate)
            ->where('status_wfm', 'in progress')
            ->get(['order_id', 'product as product_name', 'customer_name', 'nama_witel', 'status_wfm']);

        // 2. Lakukan mass update
        $updatedCount = DocumentData::whereIn('order_id', $ordersToLog->pluck('order_id'))
            ->update([
                'status_wfm' => 'done close cancel',
                'milestone' => 'Canceled via Sync Process',
                'order_status_n' => 'CANCEL'
            ]);

        // 3. Siapkan dan masukkan data log
        $logs = $ordersToLog->map(function ($order) {
            return [
                'order_id' => $order->order_id,
                'product_name' => $order->product_name,
                'customer_name' => $order->customer_name,
                'nama_witel' => $order->nama_witel,
                'status_lama' => $order->status_wfm,
                'status_baru' => 'done close cancel',
                'sumber_update' => 'Upload Cancel',
                'created_at' => now(),
                'updated_at' => now(),
            ];
        })->all();

        // 4. Masukkan log ke database
        if (!empty($logs)) {
            UpdateLog::insert($logs);
        }

        // 5. Kosongkan tabel sementara
        CanceledOrder::truncate();

        return Redirect::back()->with('success', "Sinkronisasi selesai. Berhasil meng-cancel {$updatedCount} order.");
    }

     public function uploadStatusFile(Request $request)
    {
        $validated = $request->validate([
            'document' => 'required|file|mimes:xlsx,xls,csv',
            'type' => 'required|string|in:complete,cancel',
        ]);

        $file = $validated['document'];
        $type = $validated['type'];

        $statusToSet = ($type === 'complete') ? 'completed' : 'canceled';
        $path = $file->store("excel-imports-status", 'local');

        ProcessStatusFile::dispatch($path, $statusToSet, $file->getClientOriginalName());

        return Redirect::back()->with('success', "File Order {$type} diterima. Proses akan berjalan di latar belakang.");
    }
}
