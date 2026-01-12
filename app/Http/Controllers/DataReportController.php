<?php

namespace App\Http\Controllers;

use App\Exports\DataReportExport;
use App\Exports\InProgressExport;
use App\Models\AccountOfficer;
use App\Models\DocumentData;
use App\Models\Target;
use App\Models\UserTableConfiguration;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Maatwebsite\Excel\Facades\Excel;

class DataReportController extends Controller
{
    public function index(Request $request)
    {
        $request->validate([
            'start_date' => 'nullable|date',
            'end_date'   => 'nullable|date',
            'witel'      => 'nullable|string|max:255',
        ]);

        // 1. Setup Tanggal & Filter
        $startDate = $request->input('start_date', now()->startOfMonth()->format('Y-m-d'));
        $endDate   = $request->input('end_date', now()->format('Y-m-d'));
        $selectedWitel = $request->input('witel');

        // [LOGIKA CUT OFF]
        $latestCutOff = DocumentData::query()
            ->whereNotNull('order_created_date')
            ->latest('order_created_date')
            ->value('order_created_date');
        $cutOffDate = $latestCutOff ? Carbon::parse($latestCutOff)->format('d F Y H:i:s') : 'N/A';

        // [LOGIKA UTAMA] Data Report Atas
        $smeReportData = $this->getReportDataForSegment('SME', $startDate, $endDate);
        $legsReportData = $this->getReportDataForSegment('LEGS', $startDate, $endDate);

        // [TABEL BAWAH] In Progress List
        $inProgressData = DocumentData::query()
            ->select('order_id', 'milestone', 'order_status_n', 'product', 'nama_witel', 'customer_name', 'order_created_date')
            ->where('status_wfm', 'in progress')
            ->whereBetween('order_created_date', [$startDate, $endDate])
            ->when($selectedWitel, fn ($q, $w) => $q->where('nama_witel', $w))
            ->orderBy('order_created_date', 'desc')
            ->paginate(10, ['*'], 'in_progress_page')
            ->withQueryString();

        $smeConfigRecord = UserTableConfiguration::where('page_name', 'analysis_digital_sme')->first();
        $legsConfigRecord = UserTableConfiguration::where('page_name', 'analysis_digital_legs')->first();
        $witelList = DocumentData::query()->select('nama_witel')->whereNotNull('nama_witel')->distinct()->orderBy('nama_witel')->pluck('nama_witel');

        // [TAMBAHAN] LOGIC GALAKSI (KPI PO)
        $officers = AccountOfficer::orderBy('name')->get();

        $q3Months = [7, 8, 9];
        $currentYear = Carbon::parse($endDate)->year;

        $galaksiData = $officers->map(function ($officer) use ($startDate, $endDate, $currentYear, $q3Months) {
            $witelFilter = $officer->filter_witel_lama;
            $specialFilter = $officer->special_filter_column && $officer->special_filter_value
                ? ['column' => $officer->special_filter_column, 'value' => $officer->special_filter_value]
                : null;

            // Query Single
            $singleStats = DocumentData::query()
                ->where('witel_lama', $witelFilter)
                ->whereNotNull('product')
                ->where('product', 'NOT LIKE', '%-%')
                ->where('product', 'NOT LIKE', "%\n%")
                ->when($specialFilter, fn ($q) => $q->where($specialFilter['column'], $specialFilter['value']))
                ->selectRaw("
                    (COUNT(CASE WHEN status_wfm = 'done close bima' AND channel != 'SC-One' AND order_created_date BETWEEN ? AND ? THEN 1 END) / 2) as done_ncx,
                    (COUNT(CASE WHEN status_wfm = 'done close bima' AND channel = 'SC-One' AND order_created_date BETWEEN ? AND ? THEN 1 END) / 2) as done_scone,
                    (COUNT(CASE WHEN status_wfm = 'in progress' AND channel != 'SC-One' AND order_created_date BETWEEN ? AND ? THEN 1 END) / 2) as ogp_ncx,
                    (COUNT(CASE WHEN status_wfm = 'in progress' AND channel = 'SC-One' AND order_created_date BETWEEN ? AND ? THEN 1 END) / 2) as ogp_scone,

                    (COUNT(CASE WHEN status_wfm = 'done close bima' AND channel != 'SC-One' AND YEAR(order_created_date) = ? AND MONTH(order_created_date) IN (?,?,?) THEN 1 END) / 2) as done_ncx_q3,
                    (COUNT(CASE WHEN status_wfm = 'done close bima' AND channel = 'SC-One' AND YEAR(order_created_date) = ? AND MONTH(order_created_date) IN (?,?,?) THEN 1 END) / 2) as done_scone_q3,
                    (COUNT(CASE WHEN status_wfm = 'in progress' AND channel != 'SC-One' AND YEAR(order_created_date) = ? AND MONTH(order_created_date) IN (?,?,?) THEN 1 END) / 2) as ogp_ncx_q3,
                    (COUNT(CASE WHEN status_wfm = 'in progress' AND channel = 'SC-One' AND YEAR(order_created_date) = ? AND MONTH(order_created_date) IN (?,?,?) THEN 1 END) / 2) as ogp_scone_q3
                ", [
                    $startDate, $endDate, $startDate, $endDate, $startDate, $endDate, $startDate, $endDate,
                    $currentYear, $q3Months[0], $q3Months[1], $q3Months[2],
                    $currentYear, $q3Months[0], $q3Months[1], $q3Months[2],
                    $currentYear, $q3Months[0], $q3Months[1], $q3Months[2],
                    $currentYear, $q3Months[0], $q3Months[1], $q3Months[2]
                ])
                ->first();

            // Query Bundle
            $bundleStats = DB::table('order_products')
                ->join('document_data', 'order_products.order_id', '=', 'document_data.order_id')
                ->where('document_data.witel_lama', $witelFilter)
                ->when($specialFilter, fn ($q) => $q->where('document_data.'.$specialFilter['column'], $specialFilter['value']))
                ->selectRaw("
                    (COUNT(CASE WHEN order_products.status_wfm = 'done close bima' AND order_products.channel != 'SC-One' AND document_data.order_created_date BETWEEN ? AND ? THEN 1 END) / 2) as done_ncx,
                    (COUNT(CASE WHEN order_products.status_wfm = 'done close bima' AND order_products.channel = 'SC-One' AND document_data.order_created_date BETWEEN ? AND ? THEN 1 END) / 2) as done_scone,
                    (COUNT(CASE WHEN order_products.status_wfm = 'in progress' AND order_products.channel != 'SC-One' AND document_data.order_created_date BETWEEN ? AND ? THEN 1 END) / 2) as ogp_ncx,
                    (COUNT(CASE WHEN order_products.status_wfm = 'in progress' AND order_products.channel = 'SC-One' AND document_data.order_created_date BETWEEN ? AND ? THEN 1 END) / 2) as ogp_scone,

                    (COUNT(CASE WHEN order_products.status_wfm = 'done close bima' AND order_products.channel != 'SC-One' AND YEAR(document_data.order_created_date) = ? AND MONTH(document_data.order_created_date) IN (?,?,?) THEN 1 END) / 2) as done_ncx_q3,
                    (COUNT(CASE WHEN order_products.status_wfm = 'done close bima' AND order_products.channel = 'SC-One' AND YEAR(document_data.order_created_date) = ? AND MONTH(document_data.order_created_date) IN (?,?,?) THEN 1 END) / 2) as done_scone_q3,
                    (COUNT(CASE WHEN order_products.status_wfm = 'in progress' AND order_products.channel != 'SC-One' AND YEAR(document_data.order_created_date) = ? AND MONTH(document_data.order_created_date) IN (?,?,?) THEN 1 END) / 2) as ogp_ncx_q3,
                    (COUNT(CASE WHEN order_products.status_wfm = 'in progress' AND order_products.channel = 'SC-One' AND YEAR(document_data.order_created_date) = ? AND MONTH(document_data.order_created_date) IN (?,?,?) THEN 1 END) / 2) as ogp_scone_q3
                ", [
                    $startDate, $endDate, $startDate, $endDate, $startDate, $endDate, $startDate, $endDate,
                    $currentYear, $q3Months[0], $q3Months[1], $q3Months[2],
                    $currentYear, $q3Months[0], $q3Months[1], $q3Months[2],
                    $currentYear, $q3Months[0], $q3Months[1], $q3Months[2],
                    $currentYear, $q3Months[0], $q3Months[1], $q3Months[2]
                ])
                ->first();

            // Aggregate with Safety Check (?? 0)
            $done_ncx   = ($singleStats->done_ncx ?? 0) + ($bundleStats->done_ncx ?? 0);
            $done_scone = ($singleStats->done_scone ?? 0) + ($bundleStats->done_scone ?? 0);
            $ogp_ncx    = ($singleStats->ogp_ncx ?? 0) + ($bundleStats->ogp_ncx ?? 0);
            $ogp_scone  = ($singleStats->ogp_scone ?? 0) + ($bundleStats->ogp_scone ?? 0);
            $total_range = $done_ncx + $done_scone + $ogp_ncx + $ogp_scone;

            // Q3 Aggregate
            $done_ncx_q3   = ($singleStats->done_ncx_q3 ?? 0) + ($bundleStats->done_ncx_q3 ?? 0);
            $done_scone_q3 = ($singleStats->done_scone_q3 ?? 0) + ($bundleStats->done_scone_q3 ?? 0);
            $ogp_ncx_q3    = ($singleStats->ogp_ncx_q3 ?? 0) + ($bundleStats->ogp_ncx_q3 ?? 0);
            $ogp_scone_q3  = ($singleStats->ogp_scone_q3 ?? 0) + ($bundleStats->ogp_scone_q3 ?? 0);
            $total_q3      = $done_ncx_q3 + $done_scone_q3 + $ogp_ncx_q3 + $ogp_scone_q3;

            return [
                'id' => $officer->id,
                'nama_po' => $officer->name,
                'witel' => $officer->display_witel,
                'done_ncx' => $done_ncx,
                'done_scone' => $done_scone,
                'ogp_ncx' => $ogp_ncx,
                'ogp_scone' => $ogp_scone,
                'total' => $total_range,
                'ach_range' => $total_range > 0 ? number_format((($done_ncx + $done_scone) / $total_range) * 100, 1).'%' : '0.0%',
                'ach_q3' => $total_q3 > 0 ? number_format((($done_ncx_q3 + $done_scone_q3) / $total_q3) * 100, 1).'%' : '0.0%',
            ];
        });

        return Inertia::render('DataReport', [
            'smeReportData' => $smeReportData,
            'legsReportData' => $legsReportData,
            'inProgressData' => $inProgressData,
            'filters' => $request->only(['start_date', 'end_date', 'witel', 'segment']),
            'smeConfig' => $smeConfigRecord ? $smeConfigRecord->configuration : null,
            'legsConfig' => $legsConfigRecord ? $legsConfigRecord->configuration : null,
            'filterOptions' => ['witelList' => $witelList],
            'cutOffDate' => $cutOffDate,
            'galaksiData' => $galaksiData,
        ]);
    }

    public function showDetails(Request $request)
    {
        // 1. VALIDASI INPUT
        $validated = $request->validate([
            'officer_id'   => 'nullable|integer',
            'kpi_type'     => 'nullable|string',
            'channel_type' => 'nullable|string',
            'witel'        => 'nullable|string',
            'segment'      => 'nullable|string',
            'kpi_key'      => 'nullable|string',
            'start_date'   => 'nullable|date',
            'end_date'     => 'nullable|date',
        ]);

        $startDate = $request->input('start_date');
        $endDate   = $request->input('end_date');

        // VARIABLE DEFAULT
        $statusWfm = [];
        $channelOperator = null;
        $channelValue = 'SC-One';
        $productKeywords = [];
        $dateColumnToFilter = 'document_data.order_created_date';
        $pageTitle = 'Detail Order';

        $witelFilter = null;
        $specialFilter = null;
        $witelColumn = 'witel_lama';

        // --- LOGIC 1: REQUEST DARI GALAKSI (PO) ---
        if ($request->has('officer_id') && $request->filled('officer_id')) {
            $officer = AccountOfficer::findOrFail($validated['officer_id']);
            $pageTitle = "Detail Order " . $officer->name;

            $witelFilter = $officer->filter_witel_lama;
            $witelColumn = 'witel_lama';

            $statusWfm = ($validated['kpi_type'] === 'done') ? ['done close bima'] : ['in progress'];
            $channelOperator = ($validated['channel_type'] === 'ncx') ? '!=' : '=';
            $dateColumnToFilter = 'document_data.order_created_date';

            if ($officer->special_filter_column && $officer->special_filter_value) {
                $specialFilter = ['column' => $officer->special_filter_column, 'value' => $officer->special_filter_value];
            }
        }
        // --- LOGIC 2: REQUEST DARI DATA REPORT (SME/LEGS) ---
        else {
            $witelParam = $validated['witel'] ?? 'Semua Witel';
            $segmentParam = $validated['segment'] ?? 'All';
            $pageTitle = "Detail Order {$witelParam} ({$segmentParam})";

            if ($witelParam !== 'Semua Witel') {
                $witelFilter = $witelParam;
                $witelColumn = 'nama_witel';
            }

            if ($segmentParam !== 'All') {
                $specialFilter = ['column' => 'segment', 'value' => $segmentParam];
            }

            $key = $validated['kpi_key'] ?? '';
            $productInitial = '';

            if (str_contains($key, 'in_progress')) {
                $statusWfm = ['in progress'];
                $dateColumnToFilter = 'document_data.order_created_date';
                $parts = explode('_', $key);
                $productInitial = end($parts);
            } elseif (str_contains($key, 'prov_comp') || str_contains($key, 'revenue')) {
                $statusWfm = ['done close bima'];
                $dateColumnToFilter = 'document_data.order_date';
                $parts = explode('_', $key);
                if (isset($parts[2])) $productInitial = $parts[2];
            }

            switch ($productInitial) {
                case 'n': $productKeywords = ['netmonk']; break;
                case 'o': $productKeywords = ['oca']; break;
                case 'ae': $productKeywords = ['antares', 'eazy']; break;
                case 'ps': $productKeywords = ['pijar']; break;
            }
        }

        // --- HELPER FILTER (PERBAIKAN AMBIGUOUS COLUMN) ---
        $applyFilters = function($query, $tablePrefix = '') use ($witelFilter, $witelColumn, $specialFilter, $statusWfm, $channelOperator, $channelValue, $startDate, $endDate, $dateColumnToFilter) {

            // 1. FILTER WITEL
            if ($witelFilter) {
                $query->where('document_data.' . $witelColumn, $witelFilter);
            }

            // 2. Segment
            if ($specialFilter) {
                $query->where('document_data.' . $specialFilter['column'], $specialFilter['value']);
            }

            // 3. Channel (FIX AMBIGU)
            if ($channelOperator) {
                 // Jika ada prefix, pakai prefix. Jika tidak, pakai 'channel' (untuk single query tanpa join)
                 $col = $tablePrefix ? $tablePrefix . '.channel' : 'channel';
                 $query->where($col, $channelOperator, $channelValue);
            }

            // 4. Tanggal
            if ($startDate && $endDate) {
                 $query->whereBetween($dateColumnToFilter, [$startDate, $endDate]);
            }
        };

        // =================================================================
        // QUERY 1: BUNDLE
        // =================================================================
        $bundleQuery = DB::table('order_products')
            ->join('document_data', 'order_products.order_id', '=', 'document_data.order_id')
            ->where('document_data.product', 'LIKE', '%-%')
            ->tap(fn($q) => $applyFilters($q, 'document_data')); // Kirim prefix 'document_data'

        if (!empty($statusWfm)) {
            $bundleQuery->whereIn('order_products.status_wfm', $statusWfm);
        }
        // Filter Channel Bundle (di order_products juga dicek)
        if ($channelOperator) {
            $bundleQuery->where('order_products.channel', $channelOperator, $channelValue);
        }
        if (!empty($productKeywords)) {
            $bundleQuery->where(function($q) use ($productKeywords) {
                foreach ($productKeywords as $keyword) {
                    $q->orWhere('order_products.product_name', 'LIKE', '%' . $keyword . '%');
                }
            });
        }

        $bundles = $bundleQuery->select(
            'order_products.order_id',
            'order_products.product_name as product',
            'order_products.net_price',
            'document_data.customer_name',
            'document_data.order_created_date',
            'order_products.status_wfm',
            'document_data.milestone',
            'document_data.segment'
        )->get();

        // =================================================================
        // QUERY 2: SINGLE
        // =================================================================
        $singleQuery = DB::table('document_data')
            ->where('product', 'NOT LIKE', '%-%')
            ->where('product', 'NOT LIKE', "%\n%")
            ->tap(fn($q) => $applyFilters($q, '')); // Prefix kosong

        if (!empty($statusWfm)) {
            $singleQuery->whereIn('status_wfm', $statusWfm);
        }
        if ($channelOperator) {
            $singleQuery->where('channel', $channelOperator, $channelValue);
        }
        if (!empty($productKeywords)) {
            $singleQuery->where(function($q) use ($productKeywords) {
                foreach ($productKeywords as $keyword) {
                    $q->orWhere('product', 'LIKE', '%' . $keyword . '%');
                }
            });
        }

        $singles = $singleQuery->select(
            'order_id',
            'product',
            'net_price',
            'customer_name',
            'order_created_date',
            'status_wfm',
            'milestone',
            'segment'
        )->get();

        // =================================================================
        // MERGE & RETURN
        // =================================================================
        $allOrders = collect([...$bundles, ...$singles])
            ->sortByDesc('order_created_date')
            ->values();

        return Inertia::render('Galaksi/ShowDetails', [
            'orders' => $allOrders,
            'pageTitle' => $pageTitle,
            'filters' => $validated
        ]);
    }

    public function export(Request $request)
    {
        $validated = $request->validate([
            'start_date' => 'required|date',
            'end_date'   => 'required|date',
        ]);

        $startDate = $validated['start_date'];
        $endDate   = $validated['end_date'];

        $reportDataSme = $this->getReportDataForSegment('SME', $startDate, $endDate);
        $reportDataLegs = $this->getReportDataForSegment('LEGS', $startDate, $endDate);

        $smeConfigRecord = UserTableConfiguration::where('page_name', 'analysis_digital_sme')->first();
        $tableConfigSme = $smeConfigRecord ? $smeConfigRecord->configuration : $this->getSmeTemplate();

        $detailsSme = $this->calculateDetails($reportDataSme);
        $detailsLegs = $this->calculateDetails($reportDataLegs);

        $fileName = 'Data_Report_' . Carbon::parse($startDate)->format('dM') . '_to_' . Carbon::parse($endDate)->format('dM_Y') . '.xlsx';
        $dateLabel = Carbon::parse($startDate)->format('d/m/Y') . ' - ' . Carbon::parse($endDate)->format('d/m/Y');

        return Excel::download(new DataReportExport(
            $reportDataLegs,
            $reportDataSme,
            $tableConfigSme,
            $detailsLegs,
            $detailsSme,
            $dateLabel
        ), $fileName);
    }

    public function exportInProgress(Request $request)
    {
        $validated = $request->validate([
            'start_date' => 'required|date',
            'end_date'   => 'required|date',
            'witel'      => 'nullable|string',
        ]);

        $startDate = $validated['start_date'];
        $endDate   = $validated['end_date'];
        $witel     = $validated['witel'] ?? null;

        $inProgressData = DocumentData::query()
            ->where('status_wfm', 'in progress')
            ->whereBetween('order_created_date', [$startDate, $endDate])
            ->when($witel, function ($query, $witelValue) {
                return $query->where('nama_witel', $witelValue);
            })
            ->select('order_id', 'product as product_name', 'nama_witel', 'customer_name', 'milestone', 'order_created_date', 'segment', 'telda')
            ->orderBy('order_created_date', 'desc')
            ->get();

        $witelName = $witel ? str_replace(' ', '_', $witel) : 'ALL_WITEL';
        $period = Carbon::parse($startDate)->format('dM') . '-' . Carbon::parse($endDate)->format('dM_Y');
        $fileName = "in_progress_ALL_SEGMENTS_{$witelName}_{$period}.xlsx";

        return Excel::download(new InProgressExport($inProgressData, $witel), $fileName);
    }

    // --- PERUBAHAN CORE LOGIC QUERY ---
    private function getReportDataForSegment(string $segment, $startDate, $endDate)
    {
        $masterWitelList = ['BALI', 'JATIM BARAT', 'JATIM TIMUR', 'NUSA TENGGARA', 'SURAMADU'];
        $productMap = [
            'netmonk' => 'n', 'oca' => 'o', 'antares' => 'ae', 'antares eazy' => 'ae', 'antares eazysc' => 'ae', 'pijar' => 'ps', 'pijar sekolah' => 'ps',
        ];

        // Inisialisasi Data Kosong
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

        $baseQuery = DocumentData::whereIn('nama_witel', $masterWitelList)->where('segment', $segment);

        // 1. QUERY REALISASI (Done)
        $realizationDocuments = $baseQuery->clone()
            ->where('status_wfm', 'done close bima')
            ->whereBetween('order_date', [$startDate, $endDate])
            ->get();

        // 2. QUERY IN PROGRESS
        $inProgressDocuments = $baseQuery->clone()
            ->where('status_wfm', 'in progress')
            ->whereBetween('order_created_date', [$startDate, $endDate])
            ->get();

        // 3. QUERY TARGET
        $targetPeriod = Carbon::parse($endDate)->startOfMonth()->format('Y-m-d');

        $targets = Target::where('segment', $segment)
            ->where('period', $targetPeriod)
            ->get();

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

        // --- PROCESSING LOOP IN PROGRESS ---
        foreach ($inProgressDocuments as $doc) {
            $witel = $doc->nama_witel;
            if (!$reportDataMap->has($witel)) continue;

            $itemsToProcess = [];
            if (str_contains($doc->product, '-')) {
                $items = DB::table('order_products')
                    ->where('order_id', $doc->order_id)
                    ->where('status_wfm', 'in progress')
                    ->get();
                foreach($items as $item) $itemsToProcess[] = ['name' => $item->product_name];
            } else {
                $itemsToProcess[] = ['name' => $doc->product];
            }

            foreach ($itemsToProcess as $item) {
                $pName = strtolower(trim($item['name']));
                if (isset($productMap[$pName])) {
                    $currentData = $reportDataMap->get($witel);
                    $initial = $productMap[$pName];
                    $currentData["in_progress_{$initial}"]++;
                    $reportDataMap->put($witel, $currentData);
                }
            }
        }

        // --- PROCESSING LOOP REALISASI ---
        foreach ($realizationDocuments as $doc) {
            $witel = $doc->nama_witel;
            if (!$reportDataMap->has($witel)) continue;

            $itemsToProcess = [];
            if (str_contains($doc->product, '-')) {
                $items = DB::table('order_products')
                    ->where('order_id', $doc->order_id)
                    ->where('status_wfm', 'done close bima')
                    ->get();
                foreach($items as $item) $itemsToProcess[] = ['name' => $item->product_name, 'price' => $item->net_price];
            } else {
                $itemsToProcess[] = ['name' => $doc->product, 'price' => $doc->net_price];
            }

            foreach ($itemsToProcess as $item) {
                $pName = strtolower(trim($item['name']));
                if (isset($productMap[$pName])) {
                    $currentData = $reportDataMap->get($witel);
                    $initial = $productMap[$pName];
                    $currentData["prov_comp_{$initial}_realisasi"]++;
                    $currentData["revenue_{$initial}_ach"] += $item['price'];
                    $reportDataMap->put($witel, $currentData);
                }
            }
        }

        // Konversi Revenue ke Juta
        foreach ($reportDataMap as $witel => $data) {
            $currentData = $reportDataMap->get($witel);
            foreach (array_unique(array_values($productMap)) as $initial) {
                $currentData["revenue_{$initial}_ach"] /= 1000000;
            }
            $reportDataMap->put($witel, $currentData);
        }

        return $reportDataMap->values()->map(fn ($item) => (array) $item)->all();
    }

    private function calculateDetails(array $reportData): array
    {
        $ogp = 0;
        $closed = 0;
        foreach ($reportData as $item) {
            $ogp += ($item['in_progress_n'] ?? 0) + ($item['in_progress_o'] ?? 0) + ($item['in_progress_ae'] ?? 0) + ($item['in_progress_ps'] ?? 0);
            $closed += ($item['prov_comp_n_realisasi'] ?? 0) + ($item['prov_comp_o_realisasi'] ?? 0) + ($item['prov_comp_ae_realisasi'] ?? 0) + ($item['prov_comp_ps_realisasi'] ?? 0);
        }

        return ['total' => $ogp + $closed, 'ogp' => $ogp, 'closed' => $closed];
    }

    private function getSmeTemplate(): array
    {
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
                'subColumnClass' => 'bg-blue-400',
            ],
            [
                'groupTitle' => 'Prov Comp',
                'groupClass' => 'bg-orange-600',
                'columnClass' => 'bg-orange-400',
                'subColumnClass' => 'bg-orange-300',
                'columns' => [
                    [
                        'key' => 'prov_comp_n',
                        'title' => 'N',
                        'subColumns' => [
                            ['key' => '_target', 'title' => 'T'],
                            ['key' => '_realisasi', 'title' => 'R'],
                            [
                                'key' => '_percent',
                                'title' => 'P',
                                'type' => 'calculation',
                                'calculation' => [
                                    'operation' => 'percentage',
                                    'operands' => ['prov_comp_n_realisasi', 'prov_comp_n_target'],
                                ],
                            ],
                        ],
                    ],
                    [
                        'key' => 'prov_comp_o',
                        'title' => 'O',
                        'subColumns' => [
                            ['key' => '_target', 'title' => 'T'],
                            ['key' => '_realisasi', 'title' => 'R'],
                            [
                                'key' => '_percent',
                                'title' => 'P',
                                'type' => 'calculation',
                                'calculation' => [
                                    'operation' => 'percentage',
                                    'operands' => ['prov_comp_o_realisasi', 'prov_comp_o_target'],
                                ],
                            ],
                        ],
                    ],
                    [
                        'key' => 'prov_comp_ae',
                        'title' => 'AE',
                        'subColumns' => [
                            ['key' => '_target', 'title' => 'T'],
                            ['key' => '_realisasi', 'title' => 'R'],
                            [
                                'key' => '_percent',
                                'title' => 'P',
                                'type' => 'calculation',
                                'calculation' => [
                                    'operation' => 'percentage',
                                    'operands' => ['prov_comp_ae_realisasi', 'prov_comp_ae_target'],
                                ],
                            ],
                        ],
                    ],
                    [
                        'key' => 'prov_comp_ps',
                        'title' => 'PS',
                        'subColumns' => [
                            ['key' => '_target', 'title' => 'T'],
                            ['key' => '_realisasi', 'title' => 'R'],
                            [
                                'key' => '_percent',
                                'title' => 'P',
                                'type' => 'calculation',
                                'calculation' => [
                                    'operation' => 'percentage',
                                    'operands' => ['prov_comp_ps_realisasi', 'prov_comp_ps_target'],
                                ],
                            ],
                        ],
                    ],
                ],
            ],
            [
                'groupTitle' => 'REVENUE (Rp Juta)',
                'groupClass' => 'bg-green-700',
                'columnClass' => 'bg-green-500',
                'subColumnClass' => 'bg-green-300',
                'columns' => [
                    [
                        'key' => 'revenue_n',
                        'title' => 'N',
                        'subColumns' => [
                            ['key' => '_ach', 'title' => 'ACH'],
                            ['key' => '_target', 'title' => 'T'],
                        ],
                    ],
                    [
                        'key' => 'revenue_o',
                        'title' => 'O',
                        'subColumns' => [
                            ['key' => '_ach', 'title' => 'ACH'],
                            ['key' => '_target', 'title' => 'T'],
                        ],
                    ],
                    [
                        'key' => 'revenue_ae',
                        'title' => 'AE',
                        'subColumns' => [
                            ['key' => '_ach', 'title' => 'ACH'],
                            ['key' => '_target', 'title' => 'T'],
                        ],
                    ],
                    [
                        'key' => 'revenue_ps',
                        'title' => 'PS',
                        'subColumns' => [
                            ['key' => '_ach', 'title' => 'ACH'],
                            ['key' => '_target', 'title' => 'T'],
                        ],
                    ],
                ],
            ],
            [
                'groupTitle' => 'Grand Total',
                'groupClass' => 'bg-gray-600',
                'columnClass' => 'bg-gray-500',
                'columns' => [
                    [
                        'key' => 'grand_total_target',
                        'title' => 'T',
                        'type' => 'calculation',
                        'calculation' => [
                            'operation' => 'sum',
                            'operands' => [
                                'prov_comp_n_target',
                                'prov_comp_o_target',
                                'prov_comp_ae_target',
                                'prov_comp_ps_target',
                            ],
                        ],
                    ],
                    [
                        'key' => 'grand_total_realisasi',
                        'title' => 'R',
                        'type' => 'calculation',
                        'calculation' => [
                            'operation' => 'sum',
                            'operands' => [
                                'prov_comp_n_realisasi',
                                'prov_comp_o_realisasi',
                                'prov_comp_ae_realisasi',
                                'prov_comp_ps_realisasi',
                            ],
                        ],
                    ],
                    [
                        'key' => 'grand_total_persentase',
                        'title' => 'P',
                        'type' => 'calculation',
                        'calculation' => [
                            'operation' => 'percentage',
                            'operands' => [
                                'grand_total_realisasi',
                                'grand_total_target',
                            ],
                        ],
                    ],
                ],
            ],
        ];
    }
}