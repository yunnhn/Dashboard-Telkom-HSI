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
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
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

    public function cancelImport(Request $request)
    {
        // 1. Validasi request untuk memastikan batch_id ada
        $validated = $request->validate(['batch_id' => 'required|string']);

        // 2. DEFINISIKAN variabel $batchId dari data yang divalidasi
        $batchId = $validated['batch_id'];

        // 3. Log bahwa proses pembatalan dimulai (akan muncul di laravel.log)
        Log::info("Mencoba membatalkan batch dengan ID: {$batchId}");

        // 4. Cari batch job menggunakan Bus facade
        $batch = Bus::findBatch($batchId);

        if ($batch) {
            // 5. Jika batch ditemukan, batalkan
            $batch->cancel();
            Log::info("Batch ID: {$batchId} berhasil ditemukan dan DIBATALKAN.");

            // 6. Bersihkan session (PERHATIKAN: $batchId TIDAK diperlukan di sini)
            session()->forget(['active_batch_id', 'active_job_type']);

            return Redirect::back()->with('success', 'Proses impor berhasil dibatalkan.');
        }

        // 7. Log jika batch tidak ditemukan
        Log::error("Gagal menemukan batch dengan ID: {$batchId} untuk dibatalkan.");

        return Redirect::back()->with('error', 'Gagal menemukan proses untuk dibatalkan (mungkin sudah selesai atau tidak ada).');
    }

    // ===================================================================
    //  METHOD INDEX UTAMA DENGAN LOGIKA HYBRID
    // ===================================================================
    public function index(Request $request)
    {
        // [1] FILTER DASAR
        $filters = $request->only(['search', 'period', 'segment', 'witel', 'branch', 'in_progress_year', 'net_price_status', 'channel', 'price_status', 'tab']);
        $activeTab = $request->input('tab', 'inprogress');
        $search = $request->input('search');
        $selectedBranch = $request->input('branch');

        $branchCase = "COALESCE(NULLIF(telda, ''), 'Non-Telda (NCX)')";

        $periodInput = $request->input('period', now()->format('Y-m'));
        $selectedSegment = $request->input('segment', 'SME');
        // Handle range like '06/11/2025 - 24/12/2025' by using the start date's month
        $normalized = str_replace(['–', '—'], '-', $periodInput);
        if (strpos($normalized, '/') !== false && strpos($normalized, '-') !== false) {
            [$start, $end] = array_map('trim', explode('-', $normalized));
            $reportPeriod = \Carbon\Carbon::createFromFormat('d/m/Y', $start)->startOfMonth();
        } else {
            $reportPeriod = \Carbon\Carbon::parse($periodInput)->startOfMonth();
        }
        $paginationCount = 15;

        // [2] LOAD REPORT DATA UTAMA
        $reportData = $this->getReportDataForSegment($selectedSegment, $reportPeriod);
        $reportData = collect($reportData)->map(fn ($item) => (object) $item);

        // [3] QUERY DASAR UNTUK TAB
        $inProgressQuery = DocumentData::query()
            ->where('status_wfm', 'in progress')
            ->where('segment', $selectedSegment)
            ->whereYear('order_created_date', $request->input('in_progress_year', now()->year))
            ->when($request->input('witel'), fn ($q, $w) => $q->where('nama_witel', $w))
            ->when($selectedBranch, fn ($q, $b) => $q->where(DB::raw($branchCase), $b))
            ->when($search, fn ($q, $s) => $q->where('order_id', 'like', '%' . $s . '%'));

        $completeQuery = DocumentData::query()
            ->where('status_wfm', 'done close bima')
            ->where('segment', $selectedSegment)
            ->when($request->input('witel'), fn ($q, $w) => $q->where('nama_witel', $w))
            ->when($selectedBranch, fn ($q, $b) => $q->where(DB::raw($branchCase), $b))
            ->when($search, fn ($q, $s) => $q->where('order_id', 'like', '%' . $s . '%'));

        $qcQuery = DocumentData::query()
            ->where('status_wfm', '')
            ->where('segment', $selectedSegment)
            ->when($request->input('witel'), fn ($q, $w) => $q->where('nama_witel', $w))
            ->when($selectedBranch, fn ($q, $b) => $q->where(DB::raw($branchCase), $b))
            ->when($search, fn ($q, $s) => $q->where('order_id', 'like', '%' . $s . '%'));

        $historyQuery = UpdateLog::query()
            ->when($search, fn ($q, $s) => $q->where('order_id', 'like', '%' . $s . '%'))
            ->latest();

        // ===================================================================
        // QUERY NET PRICE (LOGIKA BARU - PINDAH KE ATAS)
        // ===================================================================

        // Ambil input filter
        $channelFilter = $request->input('channel');
        $priceStatusFilter = $request->input('price_status');

        // Helper Closure untuk Filter
        $applyFilters = function ($query, $tablePrefix) use ($search, $channelFilter, $priceStatusFilter) {
            $query->when($search, fn ($q, $s) => $q->where($tablePrefix . '.order_id', 'like', '%' . $s . '%'));

            // Filter Channel
            if ($channelFilter === 'sc-one') {
                $query->where($tablePrefix . '.channel', 'SC-One');
            } elseif ($channelFilter === 'ncx') {
                $query->where(function($q) use ($tablePrefix) {
                    $q->where($tablePrefix . '.channel', '!=', 'SC-One')
                      ->orWhereNull($tablePrefix . '.channel');
                });
            }

            // Filter Status Harga
            if ($priceStatusFilter === 'priced') {
                $query->where($tablePrefix . '.net_price', '>', 0);
            } elseif ($priceStatusFilter === 'unpriced') {
                $query->where(function($q) use ($tablePrefix) {
                    $q->where($tablePrefix . '.net_price', '=', 0)
                      ->orWhereNull($tablePrefix . '.net_price');
                });
            }
        };

        // 1. Single Products
        $singleProductsQuery = DB::table('document_data')
            ->select('order_id as uid', 'order_id', 'product as product_name', 'net_price', 'nama_witel', 'customer_name', 'order_created_date', 'channel', DB::raw('0 as is_bundle'))
            ->where('product', 'NOT LIKE', '%-%');
        $applyFilters($singleProductsQuery, 'document_data');

        // 2. Bundle Products
        $bundleProductsQuery = DB::table('order_products')
            ->join('document_data', 'order_products.order_id', '=', 'document_data.order_id')
            ->select('order_products.id as uid', 'order_products.order_id', 'order_products.product_name', 'order_products.net_price', 'document_data.nama_witel', 'document_data.customer_name', 'document_data.order_created_date', 'order_products.channel', DB::raw('1 as is_bundle'));
        $applyFilters($bundleProductsQuery, 'order_products');

        // Gabungkan Query
        $netPriceQuery = $singleProductsQuery->union($bundleProductsQuery);

        // [FIX ERROR] HITUNG TOTAL NET PRICE SEBELUM ARRAY $tabCounts
        // Menggunakan subquery count untuk akurasi UNION
        $netPriceTotalCount = DB::table(DB::raw("({$netPriceQuery->toSql()}) as sub"))
            ->mergeBindings($netPriceQuery)
            ->count();

        // [4] TAB COUNTS
        $tabCounts = [
            'inprogress' => (clone $inProgressQuery)->count(),
            'complete' => (clone $completeQuery)->count(),
            'qc' => (clone $qcQuery)->count(),
            'history' => (clone $historyQuery)->count(),
            'netprice' => $netPriceTotalCount, // Variabel ini sekarang sudah aman
        ];

        // [5] PAGINASI
        $emptyPaginator = fn () => new LengthAwarePaginator([], 0, $paginationCount);
        $inProgressData = $emptyPaginator();
        $completeData = $emptyPaginator();
        $qcData = $emptyPaginator();
        $historyData = $emptyPaginator();

        switch ($activeTab) {
            case 'inprogress': $inProgressData = $inProgressQuery->orderBy('order_created_date', 'desc')->paginate($paginationCount)->withQueryString(); break;
            case 'complete': $completeData = $completeQuery->orderBy('updated_at', 'desc')->paginate($paginationCount)->withQueryString(); break;
            case 'qc': $qcData = $qcQuery->orderBy('updated_at', 'desc')->paginate($paginationCount)->withQueryString(); break;
            case 'history': $historyData = $historyQuery->paginate(10)->withQueryString(); break;
        }

        // Pagination Net Price (Selalu di-load)
        $netPriceData = DB::table(DB::raw("({$netPriceQuery->toSql()}) as sub"))
            ->mergeBindings($netPriceQuery)
            ->orderBy('order_created_date', 'desc')
            ->paginate($paginationCount, ['*'], 'net_price_page')
            ->withQueryString();

        // [5.1] BRANCH LIST (TELDA) UNTUK WITEL TERPILIH
        $branchList = DocumentData::query()
            ->where('segment', $selectedSegment)
            ->when($request->input('witel'), fn ($q, $w) => $q->where('nama_witel', $w))
            ->select(DB::raw("{$branchCase} as telda"))
            ->distinct()
            ->orderBy('telda')
            ->pluck('telda');

        // [6] LOAD AUX DATA
        $pageName = 'analysis_digital_' . strtolower($selectedSegment);
        $configRecord = UserTableConfiguration::where('page_name', $pageName)->first();
        $savedTableConfig = $configRecord ? $configRecord->configuration : null;
        $customTargets = CustomTarget::where('user_id', auth()->id())->where('page_name', $pageName)->where('period', $reportPeriod->format('Y-m-d'))->get();

        // [7] KPI DATA
        $officers = AccountOfficer::orderBy('name')->get();
        $kpiData = $officers->map(function ($officer) {
            $query = DB::table('order_products')
                ->join('document_data', 'order_products.order_id', '=', 'document_data.order_id')
                ->where('document_data.witel_lama', $officer->filter_witel_lama)
                ->whereNotNull('order_products.product_name');

            if ($officer->special_filter_column && $officer->special_filter_value) {
                $query->where('document_data.' . $officer->special_filter_column, $officer->special_filter_value);
            }

            // YTD
            $done_ncx = (clone $query)->where('order_products.status_wfm', 'done close bima')->where('order_products.channel', '!=', 'SC-One')->count();
            $done_scone = (clone $query)->where('order_products.status_wfm', 'done close bima')->where('order_products.channel', 'SC-One')->count();
            $ogp_ncx = (clone $query)->where('order_products.status_wfm', 'in progress')->where('order_products.channel', '!=', 'SC-One')->count();
            $ogp_scone = (clone $query)->where('order_products.status_wfm', 'in progress')->where('order_products.channel', 'SC-One')->count();
            $total_ytd = $done_ncx + $done_scone + $ogp_ncx + $ogp_scone;

            // Q3
            $queryQ3 = (clone $query)->whereYear('document_data.order_created_date', 2025)->whereIn(DB::raw('MONTH(document_data.order_created_date)'), [7, 8, 9]);
            $done_ncx_q3 = (clone $queryQ3)->where('order_products.status_wfm', 'done close bima')->where('order_products.channel', '!=', 'SC-One')->count();
            $done_scone_q3 = (clone $queryQ3)->where('order_products.status_wfm', 'done close bima')->where('order_products.channel', 'SC-One')->count();
            $ogp_ncx_q3 = (clone $queryQ3)->where('order_products.status_wfm', 'in progress')->where('order_products.channel', '!=', 'SC-One')->count();
            $ogp_scone_q3 = (clone $queryQ3)->where('order_products.status_wfm', 'in progress')->where('order_products.channel', 'SC-One')->count();
            $total_q3 = $done_ncx_q3 + $done_scone_q3 + $ogp_ncx_q3 + $ogp_scone_q3;

            return [
                'id' => $officer->id,
                'nama_po' => $officer->name,
                'witel' => $officer->display_witel,
                'done_ncx' => $done_ncx,
                'done_scone' => $done_scone,
                'ogp_ncx' => $ogp_ncx,
                'ogp_scone' => $ogp_scone,
                'total' => $total_ytd,
                'ach_ytd' => $total_ytd > 0 ? number_format((($done_ncx + $done_scone) / $total_ytd) * 100, 1) . '%' : '0.0%',
                'ach_q3' => $total_q3 > 0 ? number_format((($done_ncx_q3 + $done_scone_q3) / $total_q3) * 100, 1) . '%' : '0.0%',
            ];
        });

        return Inertia::render('Admin/AnalysisDigitalProduct', [
            'tabCounts' => $tabCounts,
            'reportData' => $reportData,
            'currentSegment' => $selectedSegment,
            'period' => $periodInput,
            'currentInProgressYear' => $request->input('in_progress_year', now()->year),
            'inProgressData' => $inProgressData,
            'completeData' => $completeData,
            'netPriceData' => $netPriceData,
            'historyData' => $historyData,
            'qcData' => $qcData,
            'accountOfficers' => $officers,
            'kpiData' => $kpiData,
            'customTargets' => $customTargets->groupBy('target_key')->map(fn ($group) => $group->pluck('value', 'witel')),
            'savedTableConfig' => $savedTableConfig,
            'filters' => $filters,
            'branchList' => $branchList,
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

        // [FIX] Ambil semua input dari request sebelumnya
        $queryParams = $request->except('document');

        // Gabungkan dengan batch_id dan job_type
        $queryParams['batch_id'] = $batch->id;
        $queryParams['job_type'] = 'mentah';

        return Inertia::location(
            route('admin.analysisDigitalProduct.index', $queryParams)
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
        $officers = AccountOfficer::orderBy('name')->get();

        $kpiData = $officers->map(function ($officer) {
            // [LOGIKA SAMA PERSIS DENGAN INDEX - FIXED DOUBLE COUNTING]

            // 1. Base Query ke order_products join document_data
            $query = DB::table('order_products')
                ->join('document_data', 'order_products.order_id', '=', 'document_data.order_id')
                ->where('document_data.witel_lama', $officer->filter_witel_lama);

            // 2. Filter Spesial (Segment dll)
            if ($officer->special_filter_column && $officer->special_filter_value) {
                $query->where('document_data.'.$officer->special_filter_column, $officer->special_filter_value);
            }

            // 3. Pastikan produk valid
            $query->whereNotNull('order_products.product_name');

            // --- YTD Calculations ---
            $done_ncx = (clone $query)->where('order_products.status_wfm', 'done close bima')->where('order_products.channel', '!=', 'SC-One')->count();
            $done_scone = (clone $query)->where('order_products.status_wfm', 'done close bima')->where('order_products.channel', 'SC-One')->count();
            $ogp_ncx = (clone $query)->where('order_products.status_wfm', 'in progress')->where('order_products.channel', '!=', 'SC-One')->count();
            $ogp_scone = (clone $query)->where('order_products.status_wfm', 'in progress')->where('order_products.channel', 'SC-One')->count();

            $total_ytd = $done_ncx + $done_scone + $ogp_ncx + $ogp_scone;

            // --- Q3 Calculations ---
            $q3Months = [7, 8, 9];
            $q3Year = 2025;

            // Filter waktu pada parent (document_data)
            $queryQ3 = (clone $query)
                ->whereYear('document_data.order_created_date', $q3Year)
                ->whereIn(DB::raw('MONTH(document_data.order_created_date)'), $q3Months);

            $done_ncx_q3 = (clone $queryQ3)->where('order_products.status_wfm', 'done close bima')->where('order_products.channel', '!=', 'SC-One')->count();
            $done_scone_q3 = (clone $queryQ3)->where('order_products.status_wfm', 'done close bima')->where('order_products.channel', 'SC-One')->count();
            $ogp_ncx_q3 = (clone $queryQ3)->where('order_products.status_wfm', 'in progress')->where('order_products.channel', '!=', 'SC-One')->count();
            $ogp_scone_q3 = (clone $queryQ3)->where('order_products.status_wfm', 'in progress')->where('order_products.channel', 'SC-One')->count();

            $total_q3 = $done_ncx_q3 + $done_scone_q3 + $ogp_ncx_q3 + $ogp_scone_q3;

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

    public function resetConfig(Request $request)
    {
        $validated = $request->validate([
            'page_name' => 'required|string',
        ]);

        UserTableConfiguration::where('page_name', $validated['page_name'])
            // [FIX] Tambahkan baris ini untuk menargetkan user yang sedang login
            ->where('user_id', Auth::id())
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
