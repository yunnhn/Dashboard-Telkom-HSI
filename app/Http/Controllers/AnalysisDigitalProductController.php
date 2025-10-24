<?php

namespace App\Http\Controllers;

use App\Exports\DataReportExport;
use App\Exports\HistoryExport;
use App\Exports\InProgressExport;
use App\Exports\KpiPoExport;
use App\Jobs\ImportAndProcessDocument;
use App\Models\AccountOfficer;
use App\Models\CustomTarget;
use App\Models\DocumentData;
use App\Models\Target;
use App\Models\UpdateLog;
use App\Models\UserTableConfiguration;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Redirect;
use Inertia\Inertia;
use Maatwebsite\Excel\Facades\Excel;

class AnalysisDigitalProductController extends Controller
{
    // ===================================================================
    // BAGIAN COMPLETE/CANCEL ORDER
    // ===================================================================

    public function uploadComplete(Request $request)
    {
        $request->validate([
            'complete_document' => 'required|file|mimes:xlsx,xls,csv',
        ]);

        try {
            $rows = Excel::toCollection(null, $request->file('complete_document'))[0];
            $orderIdsFromExcel = $rows->skip(1)->map(fn ($row) => trim($row[0] ?? null))->filter()->unique()->values();

            if ($orderIdsFromExcel->isEmpty()) {
                return Redirect::back()->with('info', 'File yang diunggah tidak berisi Order ID yang valid.');
            }

            $cleanedOrderIds = $orderIdsFromExcel->map(fn ($id) => preg_replace('/[^A-Za-z0-9-]/', '', $id));
            $ordersToUpdateAndLog = DocumentData::where('status_wfm', 'in progress')->whereIn(DB::raw("REGEXP_REPLACE(order_id, '[^A-Za-z0-9-]', '')"), $cleanedOrderIds)->get();

            if ($ordersToUpdateAndLog->isEmpty()) {
                return Redirect::back()->with('info', 'Tidak ada order "In Progress" yang cocok untuk di-complete dari daftar yang diunggah.');
            }

            $updatedCount = DocumentData::whereIn('order_id', $ordersToUpdateAndLog->pluck('order_id'))->update([
                'status_wfm' => 'done close bima',
                'milestone' => 'Completed via Upload Process',
                'order_status_n' => 'COMPLETE',
            ]);

            $logs = $ordersToUpdateAndLog
                ->map(
                    fn ($order) => [
                        'order_id' => $order->order_id,
                        'product_name' => $order->product_name ?? $order->product,
                        'customer_name' => $order->customer_name,
                        'nama_witel' => $order->nama_witel,
                        'status_lama' => 'in progress',
                        'status_baru' => 'done close bima',
                        'sumber_update' => 'Upload Complete',
                        'created_at' => now(),
                        'updated_at' => now(),
                    ],
                )
                ->all();

            if (!empty($logs)) {
                UpdateLog::insert($logs);
            }

            return Redirect::back()->with('success', "Proses selesai. Berhasil mengupdate {$updatedCount} order menjadi complete.");
        } catch (\Exception $e) {
            return Redirect::back()->with('error', 'Gagal memproses file. Pastikan format file benar. Error: '.$e->getMessage());
        }
    }

    public function uploadCancel(Request $request)
    {
        $request->validate(['cancel_document' => 'required|file|mimes:xlsx,xls,csv']);

        try {
            $rows = Excel::toCollection(null, $request->file('cancel_document'))[0];
            $orderIdsFromExcel = $rows->skip(1)->map(fn ($row) => trim($row[0] ?? null))->filter()->unique()->values();

            if ($orderIdsFromExcel->isEmpty()) {
                return Redirect::back()->with('info', 'File cancel yang diunggah tidak berisi Order ID yang valid.');
            }

            $cleanedOrderIds = $orderIdsFromExcel->map(fn ($id) => preg_replace('/[^A-Za-z0-9-]/', '', $id));
            $ordersToUpdateAndLog = DocumentData::where('status_wfm', 'in progress')->whereIn(DB::raw("REGEXP_REPLACE(order_id, '[^A-Za-z0-9-]', '')"), $cleanedOrderIds)->get();

            if ($ordersToUpdateAndLog->isEmpty()) {
                return Redirect::back()->with('info', 'Tidak ada order "In Progress" yang cocok untuk di-cancel dari daftar yang diberikan.');
            }

            $updatedCount = DocumentData::whereIn('order_id', $ordersToUpdateAndLog->pluck('order_id'))->update([
                'status_wfm' => 'done close cancel',
                'milestone' => 'Canceled via Upload Process',
                'order_status_n' => 'CANCEL',
            ]);

            $logs = $ordersToUpdateAndLog
                ->map(
                    fn ($order) => [
                        'order_id' => $order->order_id,
                        'product_name' => $order->product_name ?? $order->product,
                        'customer_name' => $order->customer_name,
                        'nama_witel' => $order->nama_witel,
                        'status_lama' => 'in progress',
                        'status_baru' => 'done close cancel',
                        'sumber_update' => 'Upload Cancel',
                        'created_at' => now(),
                        'updated_at' => now(),
                    ],
                )
                ->all();

            if (!empty($logs)) {
                UpdateLog::insert($logs);
            }

            return Redirect::back()->with('success', "Proses selesai. Berhasil meng-cancel {$updatedCount} order.");
        } catch (\Exception $e) {
            return Redirect::back()->with('error', 'Gagal memproses file cancel. Error: '.$e->getMessage());
        }
    }

    public function clearHistory()
    {
        UpdateLog::truncate();

        return Redirect::back()->with('success', 'Seluruh data histori berhasil dihapus.');
    }

    // ===================================================================
    //  METHOD INDEX UTAMA DENGAN LOGIKA HYBRID
    // ===================================================================
    public function index(Request $request)
    {
        // [1] BACA SEMUA FILTER, TERMASUK TAB YANG AKTIF
        $filters = $request->only(['search', 'period', 'segment', 'witel', 'in_progress_year', 'net_price_status', 'tab']);
        $activeTab = $request->input('tab', 'inprogress'); // Default tab adalah 'inprogress'

        // Ambil filter utama untuk report
        $periodInput = $request->input('period', now()->format('Y-m'));
        $selectedSegment = $request->input('segment', 'SME');
        $reportPeriod = \Carbon\Carbon::parse($periodInput)->startOfMonth();
        $paginationCount = 15;

        // ===================================================================
        // BAGIAN 1: Mengambil Data Report Utama (Logika ini tetap sama)
        // ===================================================================
        $reportData = $this->getReportDataForSegment($selectedSegment, $reportPeriod);
        $reportData = collect($reportData)->map(fn ($item) => (object) $item); // Pastikan formatnya objek

        // ===================================================================
        // BAGIAN 2: LOGIKA BARU UNTUK DATA TAB DETAIL (PAGINASI)
        // ===================================================================

        // [2] SIAPKAN SEMUA QUERY DASAR UNTUK SETIAP TAB
        $inProgressQuery = DocumentData::query()
            ->where('status_wfm', 'in progress')
            ->where('segment', $selectedSegment)
            ->whereYear('order_created_date', $request->input('in_progress_year', now()->year))
            ->when($request->input('witel'), fn ($q, $w) => $q->where('nama_witel', $w));

        $completeQuery = DocumentData::query()
            ->where('status_wfm', 'done close bima')
            ->where('segment', $selectedSegment);

        $qcQuery = DocumentData::query()
            ->where('status_wfm', '')
            ->where('segment', $selectedSegment);

        $historyQuery = UpdateLog::query()->latest();

        // Query [A] untuk produk tunggal (dari document_data)
        $singleProductsQuery = DB::table('document_data')
            ->select(
                'order_id as uid',
                'order_id',
                'product as product_name',
                'net_price',
                'nama_witel',
                'customer_name',
                'order_created_date',
                'is_template_price'
            )
            ->where('product', 'NOT LIKE', '%-%'); // Hanya ambil produk tunggal

        // Query [B] untuk produk bundling (dari order_products)
        $bundleProductsQuery = DB::table('order_products')
            ->join('document_data', 'order_products.order_id', '=', 'document_data.order_id')
            ->select(
                'order_products.id as uid',
                'order_products.order_id',
                'order_products.product_name',
                'order_products.net_price',
                'document_data.nama_witel',
                'document_data.customer_name',
                'document_data.order_created_date',
                DB::raw('1 as is_template_price') // Semua bundling adalah 'template'
            );

        // [PERBAIKAN] Terapkan filter PENCARIAN (search) ke sub-query SEBELUM union
        if ($request->filled('search')) {
            $searchTerm = $request->search;
            // [FIX] Gunakan '=' untuk exact match
            $singleProductsQuery->where('document_data.order_id', '=', $searchTerm);
            $bundleProductsQuery->where('order_products.order_id', '=', $searchTerm);
        }

        // [PERBAIKAN] Terapkan filter STATUS (pasti/template) ke sub-query SEBELUM union
        $netPriceStatus = $request->input('net_price_status');

        if ($netPriceStatus === 'pasti') {
            // "Harga Pasti" HANYA dari produk tunggal & is_template_price = 0
            $singleProductsQuery->where('is_template_price', false);
            $netPriceQuery = $singleProductsQuery; // HANYA query A
        } elseif ($netPriceStatus === 'template') {
            // "Harga Template" = (Template 0-price) + (Semua Bundling)
            $singleProductsQuery->where('is_template_price', true);
            $netPriceQuery = $singleProductsQuery->union($bundleProductsQuery); // Query A + Query B
        } else {
            // Jika tidak ada filter, tampilkan semua (A + B)
            $netPriceQuery = $singleProductsQuery->union($bundleProductsQuery);
        }

        if ($request->filled('search')) {
            $searchTerm = $request->search;

            $inProgressQuery->where('order_id', '=', $searchTerm);
            $completeQuery->where('order_id', '=', $searchTerm);
            $qcQuery->where('order_id', '=', $searchTerm);
            $historyQuery->where('order_id', '=', $searchTerm);
        }

        $tabCounts = [
            'inprogress' => (clone $inProgressQuery)->count(),
            'complete' => (clone $completeQuery)->count(),
            'qc' => (clone $qcQuery)->count(),
            'history' => (clone $historyQuery)->count(),
            'netprice' => DB::table(DB::raw("({$netPriceQuery->toSql()}) as sub"))
                          ->mergeBindings($netPriceQuery)
                          ->count(),
        ];

        // [3] INISIALISASI SEMUA DATA PAGINATOR SEBAGAI OBJEK KOSONG
        // Ini PENTING agar props di React tidak error
        $emptyPaginator = fn () => new \Illuminate\Pagination\LengthAwarePaginator([], 0, $paginationCount);
        $inProgressData = $emptyPaginator();
        $completeData = $emptyPaginator();
        $qcData = $emptyPaginator();
        $historyData = $emptyPaginator();
        $netPriceData = $emptyPaginator();

        // [4] JALANKAN PAGINASI HANYA UNTUK TAB YANG AKTIF
        switch ($activeTab) {
            case 'inprogress':
                $inProgressData = $inProgressQuery->orderBy('order_created_date', 'desc')->paginate($paginationCount)->withQueryString();
                break;
            case 'complete':
                $completeData = $completeQuery->orderBy('updated_at', 'desc')->paginate($paginationCount)->withQueryString();
                break;
            case 'qc':
                $qcData = $qcQuery->orderBy('updated_at', 'desc')->paginate($paginationCount)->withQueryString();
                break;
            case 'history':
                $historyData = $historyQuery->paginate(10)->withQueryString(); // History punya item per halaman berbeda
                break;
            case 'netprice':
                $netPriceData = DB::table(DB::raw("({$netPriceQuery->toSql()}) as sub"))
                    ->mergeBindings($netPriceQuery)
                    ->orderBy('order_created_date', 'desc')
                    ->paginate($paginationCount)
                    ->withQueryString();
                break;
        }

        // ===================================================================
        // BAGIAN 3: Mengambil Data Lainnya (KPI, Config, dll - Logika tetap sama)
        // ===================================================================
        $pageName = 'analysis_digital_'.strtolower($selectedSegment);
        $configRecord = UserTableConfiguration::where('page_name', $pageName)->first();
        $savedTableConfig = $configRecord ? $configRecord->configuration : null;
        $customTargets = CustomTarget::where('user_id', auth()->id())->where('page_name', $pageName)->where('period', $reportPeriod->format('Y-m-d'))->get();

        $officers = AccountOfficer::orderBy('name')->get();
        // Logika untuk $kpiData... (copy-paste dari controller lama Anda)
        $kpiData = $officers->map(function ($officer) {
            // ... (SELURUH LOGIKA PERHITUNGAN KPI ANDA DI SINI) ...
            // Kode ini terlalu panjang untuk disalin ulang, pastikan Anda memasukkan
            // blok kalkulasi KPI dari controller lama Anda di sini.
            $witelFilter = $officer->filter_witel_lama;
            $specialFilter = $officer->special_filter_column && $officer->special_filter_value
                ? ['column' => $officer->special_filter_column, 'value' => $officer->special_filter_value]
                : null;
            $singleQuery = DocumentData::where('witel_lama', $witelFilter)->whereNotNull('product')->where('product', 'NOT LIKE', '%-%')->where('product', 'NOT LIKE', "%\n%")->when($specialFilter, fn ($q) => $q->where($specialFilter['column'], $specialFilter['value']));
            $bundleQuery = DB::table('order_products')->join('document_data', 'order_products.order_id', '=', 'document_data.order_id')->where('document_data.witel_lama', $witelFilter)->when($specialFilter, fn ($q) => $q->where('document_data.'.$specialFilter['column'], $specialFilter['value']));
            $done_ncx = $singleQuery->clone()->where('status_wfm', 'done close bima')->where('channel', '!=', 'SC-One')->count() + $bundleQuery->clone()->where('order_products.status_wfm', 'done close bima')->where('order_products.channel', '!=', 'SC-One')->count();
            $done_scone = $singleQuery->clone()->where('status_wfm', 'done close bima')->where('channel', 'SC-One')->count() + $bundleQuery->clone()->where('order_products.status_wfm', 'done close bima')->where('order_products.channel', 'SC-One')->count();
            $ogp_ncx = $singleQuery->clone()->where('status_wfm', 'in progress')->where('channel', '!=', 'SC-One')->count() + $bundleQuery->clone()->where('order_products.status_wfm', 'in progress')->where('order_products.channel', '!=', 'SC-One')->count();
            $ogp_scone = $singleQuery->clone()->where('status_wfm', 'in progress')->where('channel', 'SC-One')->count() + $bundleQuery->clone()->where('order_products.status_wfm', 'in progress')->where('order_products.channel', 'SC-One')->count();
            $total_ytd = $done_ncx + $done_scone + $ogp_ncx + $ogp_scone;
            $q3Months = [7, 8, 9];
            $q3Year = 2025;
            $singleQueryQ3 = $singleQuery->clone()->whereYear('order_created_date', $q3Year)->whereIn(DB::raw('MONTH(order_created_date)'), $q3Months);
            $bundleQueryQ3 = $bundleQuery->clone()->whereYear('document_data.order_created_date', $q3Year)->whereIn(DB::raw('MONTH(document_data.order_created_date)'), $q3Months);
            $done_scone_q3 = $singleQueryQ3->clone()->where('status_wfm', 'done close bima')->where('channel', 'SC-One')->count() + $bundleQueryQ3->clone()->where('order_products.status_wfm', 'done close bima')->where('order_products.channel', 'SC-One')->count();
            $done_ncx_q3 = $singleQueryQ3->clone()->where('status_wfm', 'done close bima')->where('channel', '!=', 'SC-One')->count() + $bundleQueryQ3->clone()->where('order_products.status_wfm', 'done close bima')->where('order_products.channel', '!=', 'SC-One')->count();
            $ogp_ncx_q3 = $singleQueryQ3->clone()->where('status_wfm', 'in progress')->where('channel', '!=', 'SC-One')->count() + $bundleQueryQ3->clone()->where('order_products.status_wfm', 'in progress')->where('order_products.channel', '!=', 'SC-One')->count();
            $ogp_scone_q3 = $singleQueryQ3->clone()->where('status_wfm', 'in progress')->where('channel', 'SC-One')->count() + $bundleQueryQ3->clone()->where('order_products.status_wfm', 'in progress')->where('order_products.channel', 'SC-One')->count();
            $total_q3 = $done_ncx_q3 + $done_scone_q3 + $ogp_ncx_q3 + $ogp_scone_q3;

            return [
                'id' => $officer->id, 'nama_po' => $officer->name, 'witel' => $officer->display_witel, 'done_ncx' => $done_ncx, 'done_scone' => $done_scone, 'ogp_ncx' => $ogp_ncx, 'ogp_scone' => $ogp_scone, 'total' => $total_ytd, 'ach_ytd' => $total_ytd > 0 ? number_format((($done_ncx + $done_scone) / $total_ytd) * 100, 1).'%' : '0.0%', 'ach_q3' => $total_q3 > 0 ? number_format((($done_ncx_q3 + $done_scone_q3) / $total_q3) * 100, 1).'%' : '0.0%',
            ];
        });

        // ===================================================================
        // BAGIAN 4: Render View Inertia
        // ===================================================================
        return Inertia::render('Admin/AnalysisDigitalProduct', [
            'tabCounts' => $tabCounts,
            // Data Report Utama
            'reportData' => $reportData,
            'currentSegment' => $selectedSegment,
            'period' => $periodInput,
            'currentInProgressYear' => $request->input('in_progress_year', now()->year),

            // Data Paginasi untuk Detail Tab
            'inProgressData' => $inProgressData,
            'completeData' => $completeData,
            'netPriceData' => $netPriceData,
            'historyData' => $historyData,
            'qcData' => $qcData,

            // Data Tambahan
            'accountOfficers' => $officers,
            'kpiData' => $kpiData,
            'customTargets' => $customTargets->groupBy('target_key')->map(fn ($group) => $group->pluck('value', 'witel')),
            'savedTableConfig' => $savedTableConfig,

            // Filter
            'filters' => $filters,
        ]);
    }

    public function saveCustomTargets(Request $request)
    {
        $validated = $request->validate([
            'targets' => 'required|array',
            'period' => 'required|date_format:Y-m',
            'segment' => 'required|string',
        ]);

        $period = \Carbon\Carbon::parse($validated['period'])->startOfMonth()->format('Y-m-d');
        $pageName = 'analysis_digital_'.strtolower($validated['segment']);

        foreach ($validated['targets'] as $targetKey => $witelValues) {
            foreach ($witelValues as $witel => $value) {
                CustomTarget::updateOrCreate(
                    [
                        'user_id' => auth()->id(),
                        'page_name' => $pageName,
                        'period' => $period,
                        'target_key' => $targetKey,
                        'witel' => $witel,
                    ],
                    [
                        'value' => $value ?? 0,
                    ],
                );
            }
        }

        return Redirect::back()->with('success', 'Target kustom berhasil disimpan.');
    }

    public function updateTargets(Request $request)
    {
        $validated = $request->validate([
            'targets' => 'required|array',
            'segment' => 'required|string|in:SME,LEGS',
            'period' => 'required|date_format:Y-m-d',
            'targets.*.prov_comp.*' => 'nullable|numeric',
            'targets.*.revenue.*' => 'nullable|numeric',
        ]);
        foreach ($validated['targets'] as $witelName => $metrics) {
            foreach ($metrics as $metricType => $products) {
                foreach ($products as $productInitial => $targetValue) {
                    $productName = $this->mapProductInitialToName($productInitial);
                    if (!$productName) {
                        continue;
                    }
                    Target::updateOrCreate(['segment' => $validated['segment'], 'period' => $validated['period'], 'nama_witel' => $witelName, 'metric_type' => $metricType, 'product_name' => $productName], ['target_value' => $targetValue ?? 0]);
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

    private function getReportDataForSegment(string $segment, \Carbon\Carbon $reportPeriod)
    {
        $startDate = $reportPeriod->copy()->startOfMonth();
        $endDate = $reportPeriod->copy()->endOfMonth();

        $masterWitelList = ['BALI', 'JATIM BARAT', 'JATIM TIMUR', 'NUSA TENGGARA', 'SURAMADU'];
        $productMap = [
            'netmonk' => 'n', 'oca' => 'o', 'antares' => 'ae', 'antares eazy' => 'ae',
            'antares eazysc' => 'ae', 'pijar' => 'ps', 'pijar sekolah' => 'ps',
        ];

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

        $realizationDocuments = DocumentData::whereIn('nama_witel', $masterWitelList)
            ->where('segment', $segment)
            ->where('status_wfm', 'done close bima')
            ->whereYear('order_date', $reportPeriod->year)     // <-- DIUBAH: Gunakan 'order_date'
            ->whereMonth('order_date', $reportPeriod->month)    // <-- KONSISTEN: Gunakan 'order_date'
            ->get();

        $inProgressDocuments = DocumentData::whereIn('nama_witel', $masterWitelList)
            ->where('segment', $segment)
            ->where('status_wfm', 'in progress')
            ->whereYear('order_created_date', $reportPeriod->year) // <-- BENAR: Gunakan 'order_created_date'
            ->whereMonth('order_created_date', $reportPeriod->month) // <-- KONSISTEN: Gunakan 'order_created_date'
            ->get();

        foreach ($inProgressDocuments as $doc) {
            $witel = $doc->nama_witel;
            if (!$reportDataMap->has($witel)) {
                continue;
            }
            if (str_contains($doc->product, '-')) {
                $bundleItems = DB::table('order_products')->where('order_id', $doc->order_id)->where('status_wfm', 'in progress')->get();
                foreach ($bundleItems as $item) {
                    $pName = strtolower(trim($item->product_name));
                    if (isset($productMap[$pName])) {
                        $currentData = $reportDataMap->get($witel);
                        $initial = $productMap[$pName];
                        ++$currentData["in_progress_{$initial}"];
                        $reportDataMap->put($witel, $currentData);
                    }
                }
            } else {
                $pName = strtolower(trim($doc->product));
                if (isset($productMap[$pName])) {
                    $currentData = $reportDataMap->get($witel);
                    $initial = $productMap[$pName];
                    ++$currentData["in_progress_{$initial}"];
                    $reportDataMap->put($witel, $currentData);
                }
            }
        }

        foreach ($realizationDocuments as $doc) {
            $witel = $doc->nama_witel;
            if (!$reportDataMap->has($witel)) {
                continue;
            }
            if (str_contains($doc->product, '-')) {
                $bundleItems = DB::table('order_products')->where('order_id', $doc->order_id)->where('status_wfm', 'done close bima')->get();
                foreach ($bundleItems as $item) {
                    $pName = strtolower(trim($item->product_name));
                    if (isset($productMap[$pName])) {
                        $currentData = $reportDataMap->get($witel);
                        $initial = $productMap[$pName];
                        ++$currentData["prov_comp_{$initial}_realisasi"];
                        $currentData["revenue_{$initial}_ach"] += $item->net_price;
                        $reportDataMap->put($witel, $currentData);
                    }
                }
            } else {
                $pName = strtolower(trim($doc->product));
                if (isset($productMap[$pName])) {
                    $currentData = $reportDataMap->get($witel);
                    $initial = $productMap[$pName];
                    ++$currentData["prov_comp_{$initial}_realisasi"];
                    $currentData["revenue_{$initial}_ach"] += $doc->net_price;
                    $reportDataMap->put($witel, $currentData);
                }
            }
        }

        $targets = Target::where('segment', $segment)->where('period', $reportPeriod->format('Y-m-d'))->get();
        foreach ($targets as $target) {
            $witel = $target->nama_witel;
            $pName = strtolower(trim($target->product_name));
            if (isset($reportDataMap[$witel]) && isset($productMap[$pName])) {
                $currentData = $reportDataMap->get($witel);
                $initial = $productMap[$pName];
                $metricKey = $target->metric_type;
                $currentData["{$metricKey}_{$initial}_target"] = $target->target_value;
                $reportDataMap->put($witel, $currentData);
            }
        }

        foreach ($reportDataMap as $witel => $data) {
            $currentData = $reportDataMap->get($witel);
            foreach (array_unique(array_values($productMap)) as $initial) {
                $currentData["revenue_{$initial}_ach"] /= 1000000;
            }
            $reportDataMap->put($witel, $currentData);
        }

        return $reportDataMap->values()->map(fn ($item) => (array) $item)->all();
    }

    public function getImportProgress(string $batchId)
    {
        $batch = Bus::findBatch($batchId);
        if (!$batch || $batch->finished()) {
            return response()->json(['progress' => 100]);
        }
        $progress = \Illuminate\Support\Facades\Cache::get('import_progress_'.$batchId, 0);

        return response()->json(['progress' => $progress]);
    }

    public function upload(Request $request)
    {
        $request->validate(['document' => 'required|file|mimes:xlsx,xls,csv']);
        $path = $request->file('document')->store('excel-imports', 'local');

        $batch = Bus::batch([new ImportAndProcessDocument($path)])
            ->name('Import Data Mentah')
            ->dispatch();

        return Inertia::location(
            route('admin.analysisDigitalProduct.index', [
                'batch_id' => $batch->id,
                'job_type' => 'mentah',
                'segment' => $request->input('segment', 'SME'),
                'period' => $request->input('period', now()->format('Y-m')),
                'in_progress_year' => $request->input('in_progress_year', now()->year),
            ]),
        );
    }

    private function logAndUpdate(DocumentData $order, $newStatusWfm, $newOrderStatusN, $milestone, $logSource)
    {
        $oldStatus = $order->status_wfm;
        if ($oldStatus === $newStatusWfm) {
            return Redirect::back()->with('info', "Order ID: {$order->order_id} sudah dalam status yang dituju.");
        }

        UpdateLog::create([
            'order_id' => $order->order_id,
            'product_name' => $order->product_name ?? $order->product,
            'customer_name' => $order->customer_name,
            'nama_witel' => $order->nama_witel,
            'status_lama' => $oldStatus,
            'status_baru' => $newStatusWfm,
            'sumber_update' => $logSource,
        ]);

        $order->status_wfm = $newStatusWfm;
        $order->order_status_n = $newOrderStatusN;
        $order->milestone = $milestone;
        $order->save();

        return Redirect::back()->with('success', "Order ID: {$order->order_id} berhasil diupdate ke status '{$newStatusWfm}'.");
    }

    // [PERBAIKAN UTAMA] Semua fungsi di bawah ini sekarang menggunakan Route-Model Binding
    public function updateManualComplete(Request $request, DocumentData $documentData)
    {
        return $this->logAndUpdate($documentData, 'done close bima', 'COMPLETE', 'Completed Manually', 'Manual Action');
    }

    public function updateManualCancel(Request $request, DocumentData $documentData)
    {
        return $this->logAndUpdate($documentData, 'done close cancel', 'CANCEL', 'Canceled Manually', 'Manual Action');
    }

    public function updateCompleteToProgress(Request $request, DocumentData $documentData)
    {
        return $this->logAndUpdate($documentData, 'in progress', 'IN PROGRESS', 'Reverted to In Progress from Complete', 'Manual Action from Complete Tab');
    }

    public function updateCompleteToQc(Request $request, DocumentData $documentData)
    {
        return $this->logAndUpdate($documentData, '', 'PENDING QC', 'Reverted to QC from Complete', 'Manual Action from Complete Tab');
    }

    public function updateCompleteToCancel(Request $request, DocumentData $documentData)
    {
        return $this->logAndUpdate($documentData, 'done close cancel', 'CANCEL', 'Changed to Cancel from Complete', 'Manual Action from Complete Tab');
    }

    public function updateQcStatusToProgress(Request $request, DocumentData $documentData)
    {
        return $this->logAndUpdate($documentData, 'in progress', 'IN PROGRESS', 'QC Processed - Return to In Progress', 'Manual Action from QC Tab');
    }

    public function updateQcStatusToDone(Request $request, DocumentData $documentData)
    {
        return $this->logAndUpdate($documentData, 'done close bima', 'COMPLETE', 'QC Processed - Marked as Complete', 'Manual Action from QC Tab');
    }

    public function updateQcStatusToCancel(Request $request, DocumentData $documentData)
    {
        return $this->logAndUpdate($documentData, 'done close cancel', 'CANCEL', 'QC Processed - Marked as Cancel', 'Manual Action from QC Tab');
    }

    public function exportInProgress(Request $request)
    {
        // 1. Validasi input dari request (opsional tapi disarankan)
        $validated = $request->validate([
            'segment' => 'required|in:SME,LEGS',
            'in_progress_year' => 'required|integer',
            'witel' => 'nullable|string', // witel boleh kosong
        ]);

        $segment = $validated['segment'];
        $year = $validated['in_progress_year'];
        $witel = $validated['witel'] ?? null; // Gunakan null jika tidak ada

        // 2. Jalankan query untuk mendapatkan data yang sudah difilter
        $inProgressData = DocumentData::query()
            ->where('status_wfm', 'in progress')
            ->where('segment', $segment)
            ->whereYear('order_created_date', $year)
            // [MODIFIKASI UTAMA] Terapkan filter witel jika ada
            ->when($witel, function ($query, $witelValue) {
                return $query->where('nama_witel', $witelValue);
            })
            ->select(
                'order_id',
                'product as product_name',
                'nama_witel',
                'customer_name',
                'milestone',
                'order_created_date',
                'segment',
                'telda' // Menggunakan 'telda' sesuai template Blade Anda
            )
            ->orderBy('order_created_date', 'desc')
            ->get(); // Gunakan ->get() untuk mengambil semua data yang cocok

        // 3. Buat nama file yang dinamis
        $witelName = $witel ? str_replace(' ', '_', $witel) : 'ALL';
        $fileName = "in_progress_{$segment}_{$witelName}_{$year}.xlsx";

        // 4. Panggil class export dengan data yang sudah difilter
        return Excel::download(new InProgressExport($inProgressData, $witel), $fileName);
    }

    public function exportReport(Request $request)
    {
        $validated = $request->validate([
            'period' => 'required|date_format:Y-m',
            'table_config' => 'required|json',
            'details' => 'required|json',
        ]);

        $tableConfig = json_decode($validated['table_config'], true);
        $detailsSme = json_decode($validated['details'], true);
        $periodInput = $validated['period'];
        $reportPeriod = \Carbon\Carbon::parse($periodInput)->startOfMonth();

        $reportDataLegs = $this->getReportDataForSegment('LEGS', $reportPeriod);
        $reportDataSme = $this->getReportDataForSegment('SME', $reportPeriod);

        $ogpLegs = 0;
        $closedLegs = 0;
        foreach ($reportDataLegs as $item) {
            $ogpLegs += ($item['in_progress_n'] ?? 0) + ($item['in_progress_o'] ?? 0) + ($item['in_progress_ae'] ?? 0) + ($item['in_progress_ps'] ?? 0);
            $closedLegs += ($item['prov_comp_n_realisasi'] ?? 0) + ($item['prov_comp_o_realisasi'] ?? 0) + ($item['prov_comp_ae_realisasi'] ?? 0) + ($item['prov_comp_ps_realisasi'] ?? 0);
        }
        $detailsLegs = ['total' => $ogpLegs + $closedLegs, 'ogp' => $ogpLegs, 'closed' => $closedLegs];

        $fileName = 'Data_Report_All_Segments_'.$reportPeriod->format('F_Y').'.xlsx';

        return Excel::download(new DataReportExport($reportDataLegs, $reportDataSme, $tableConfig, $detailsLegs, $detailsSme, $periodInput), $fileName);
    }

    public function exportHistory(Request $request)
    {
        $fileName = 'update_history_'.now()->format('Y-m-d_H-i').'.xlsx';

        return Excel::download(new HistoryExport(), $fileName);
    }

    public function exportKpiPo(Request $request)
    {
        // Logika ini adalah salinan dari perhitungan kpiData di method index()
        $officers = AccountOfficer::orderBy('name')->get();
        $kpiData = $officers->map(function ($officer) {
            $witelFilter = $officer->filter_witel_lama;
            $specialFilter = $officer->special_filter_column && $officer->special_filter_value ? ['column' => $officer->special_filter_column, 'value' => $officer->special_filter_value] : null;

            $singleQuery = DocumentData::where('witel_lama', $witelFilter)
                    ->whereNotNull('product')
                    ->where('product', 'NOT LIKE', '%-%')
                    ->where('product', 'NOT LIKE', "%\n%")
                    ->when($specialFilter, fn ($q) => $q
                    ->where($specialFilter['column'], $specialFilter['value']));

            $bundleQuery = DB::table('order_products')
                    ->join('document_data', 'order_products.order_id', '=', 'document_data.order_id')
                    ->where('document_data.witel_lama', $witelFilter)
                    ->when($specialFilter, fn ($q) => $q
                    ->where('document_data.'.$specialFilter['column'], $specialFilter['value']));

            $done_ncx = $singleQuery->clone()
                    ->where('status_wfm', 'done close bima')
                    ->where('channel', '!=', 'SC-One')
                    ->count() + $bundleQuery
                    ->clone()
                    ->where('order_products.status_wfm', 'done close bima')
                    ->where('order_products.channel', '!=', 'SC-One')
                    ->count();

            $done_scone = $singleQuery->clone()->where('status_wfm', 'done close bima')->where('channel', 'SC-One')->count() + $bundleQuery->clone()->where('order_products.status_wfm', 'done close bima')->where('order_products.channel', 'SC-One')->count();
            $ogp_ncx = $singleQuery->clone()->where('status_wfm', 'in progress')->where('channel', '!=', 'SC-One')->count() + $bundleQuery->clone()->where('order_products.status_wfm', 'in progress')->where('order_products.channel', '!=', 'SC-One')->count();
            $ogp_scone = $singleQuery->clone()->where('status_wfm', 'in progress')->where('channel', 'SC-One')->count() + $bundleQuery->clone()->where('order_products.status_wfm', 'in progress')->where('order_products.channel', 'SC-One')->count();

            $total_ytd = $done_ncx + $done_scone + $ogp_ncx + $ogp_scone;
            $q3Months = [7, 8, 9];
            $q3Year = 2025;

            $singleQueryQ3 = $singleQuery->clone()->whereYear('order_created_date', $q3Year)->whereIn(DB::raw('MONTH(order_created_date)'), $q3Months);
            $bundleQueryQ3 = $bundleQuery->clone()->whereYear('document_data.order_created_date', $q3Year)->whereIn(DB::raw('MONTH(document_data.order_created_date)'), $q3Months);
            $done_scone_q3 = $singleQueryQ3->clone()->where('status_wfm', 'done close bima')->where('channel', 'SC-One')->count() + $bundleQueryQ3->clone()->where('order_products.status_wfm', 'done close bima')->where('order_products.channel', 'SC-One')->count();
            $done_ncx_q3 = $singleQueryQ3->clone()->where('status_wfm', 'done close bima')->where('channel', '!=', 'SC-One')->count() + $bundleQueryQ3->clone()->where('order_products.status_wfm', 'done close bima')->where('order_products.channel', '!=', 'SC-One')->count();
            $total_q3 = $done_ncx_q3 + $done_scone_q3 + $singleQueryQ3->clone()->where('status_wfm', 'in progress')->where('channel', 'SC-One')->count() + $bundleQueryQ3->clone()->where('order_products.status_wfm', 'in progress')->where('order_products.channel', 'SC-One')->count() + $singleQueryQ3->clone()->where('status_wfm', 'in progress')->where('channel', '!=', 'SC-One')->count() + $bundleQueryQ3->clone()->where('order_products.status_wfm', 'in progress')->where('order_products.channel', '!=', 'SC-One')->count();

            return [
                'id' => $officer->id,
                'nama_po' => $officer->name,
                'witel' => $officer->display_witel,
                'done_ncx' => $done_ncx,
                'done_scone' => $done_scone,
                'ogp_ncx' => $ogp_ncx,
                'ogp_scone' => $ogp_scone,
                'total' => $total_ytd,
                'ach_ytd' => $total_ytd > 0 ? number_format((($done_ncx + $done_scone) / $total_ytd) * 100, 1).'%' : '0.0%',
                'ach_q3' => $total_q3 > 0 ? number_format((($done_ncx_q3 + $done_scone_q3) / $total_q3) * 100, 1).'%' : '0.0%',
            ];
        });

        return Excel::download(new KpiPoExport($kpiData), 'kpi_po_report_'.now()->format('Y-m-d').'.xlsx');
    }

    public function saveConfig(Request $request)
    {
        $validated = $request->validate([
            'configuration' => 'required|array',
            'page_name' => 'required|string',
        ]);

        // Menggunakan updateOrCreate untuk mencari berdasarkan page_name
        UserTableConfiguration::updateOrCreate(
            [
                'page_name' => $validated['page_name'],
            ],
            [
                'configuration' => $validated['configuration'],
                // Tambahkan user_id jika Anda ingin tahu siapa yang terakhir mengubah
                'user_id' => Auth::id(),
            ]
        );

        // [FIX] Tambahkan ->with('success', '...') pada redirect Anda
        return Redirect::back()->with('success', 'Tampilan tabel berhasil disimpan!');
    }

    public function resetTableConfig(Request $request)
    {
        $validated = $request->validate([
            'page_name' => 'required|string',
        ]);

        UserTableConfiguration::where('page_name', $validated['page_name'])
            ->delete();

        return Redirect::back()->with('success', 'Tampilan tabel berhasil di-reset ke pengaturan awal.');
    }

    public function getTableConfig(Request $request)
    {
        $validated = $request->validate([
            'segment' => 'required|string|in:SME,LEGS',
        ]);

        $pageName = 'analysis_digital_'.strtolower($validated['segment']); // [FIX] Tambahkan user_id

        $configRecord = UserTableConfiguration::where('page_name', $pageName)->first();

        // Jika ada record, kirim konfigurasinya. Jika tidak, kirim null.
        if ($configRecord) {
            return response()->json($configRecord->configuration);
        }

        return response()->json(null);
    }

    public function updateNetPrice(Request $request, $order_id) // Ubah parameter
    {
        $validated = $request->validate([
            'net_price' => 'required|numeric|min:0',
            'product_name' => 'required|string', // [BARU] Kita butuh nama produk untuk mencari di tabel order_products
        ]);

        // Coba update di tabel document_data (untuk produk tunggal)
        $updated = DocumentData::where('order_id', $order_id)
            ->where('product', $validated['product_name'])
            ->update([
                'net_price' => $validated['net_price'],
                'is_template_price' => false,
            ]);

        // Jika tidak ada yang terupdate, coba update di tabel order_products (untuk produk bundling)
        if ($updated === 0) {
            $updated = DB::table('order_products')
                ->where('order_id', $order_id)
                ->where('product_name', $validated['product_name'])
                ->update(['net_price' => $validated['net_price']]);
        }

        if ($updated > 0) {
            return Redirect::back()->with('success', "Harga untuk Order ID {$order_id} berhasil diupdate.");
        }

        return Redirect::back()->with('error', 'Gagal menemukan order yang cocok untuk diupdate.');
    }

    public function progress($batchId)
    {
        $key = "import_progress_{$batchId}";
        $progress = Cache::get($key, 0);
        Log::info("Frontend minta progress untuk {$key}: {$progress}%");

        return response()->json(['progress' => $progress]);
    }
}
