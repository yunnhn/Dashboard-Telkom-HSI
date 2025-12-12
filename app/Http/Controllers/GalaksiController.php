<?php

namespace App\Http\Controllers;

use App\Models\AccountOfficer;
use App\Models\DocumentData;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Carbon\Carbon;

class GalaksiController extends Controller
{
    public function index(Request $request)
    {
        return $this->getData($request);
    }

    private function getData(Request $request)
    {
        // 1. VALIDASI
        $request->validate([
            'year' => 'nullable|integer|digits:4',
            'q3_months' => 'nullable|array',
        ]);

        $selectedYear = $request->input('year', now()->year);
        $q3Months = $request->input('q3_months', [7, 8, 9]); 
        
        // 2. DATA OFFICERS
        $officers = AccountOfficer::orderBy('name')->get();

        // 3. TRANSFORMASI DATA
        $kpiData = $officers->map(function ($officer) use ($selectedYear, $q3Months) {
            
            // Setup Filter
            $witelFilter = $officer->filter_witel_lama;
            $specialFilter = $officer->special_filter_column && $officer->special_filter_value
                ? ['column' => $officer->special_filter_column, 'value' => $officer->special_filter_value]
                : null;

            // --- BUILD QUERY ---
            // PERUBAHAN DISINI: Menambahkan "/ 2" pada setiap COUNT
            
            // Query Single Orders
            $singleStats = DocumentData::query()
                ->where('witel_lama', $witelFilter)
                ->whereNotNull('product')
                ->where('product', 'NOT LIKE', '%-%')
                ->where('product', 'NOT LIKE', "%\n%")
                ->when($specialFilter, fn ($q) => $q->where($specialFilter['column'], $specialFilter['value']))
                ->selectRaw("
                    -- YTD CALCULATIONS (DIBAGI 2)
                    (COUNT(CASE WHEN status_wfm = 'done close bima' AND channel != 'SC-One' THEN 1 END) / 2) as done_ncx,
                    (COUNT(CASE WHEN status_wfm = 'done close bima' AND channel = 'SC-One' THEN 1 END) / 2) as done_scone,
                    (COUNT(CASE WHEN status_wfm = 'in progress' AND channel != 'SC-One' THEN 1 END) / 2) as ogp_ncx,
                    (COUNT(CASE WHEN status_wfm = 'in progress' AND channel = 'SC-One' THEN 1 END) / 2) as ogp_scone,
                    
                    -- Q3 CALCULATIONS (DIBAGI 2)
                    (COUNT(CASE WHEN status_wfm = 'done close bima' AND channel != 'SC-One' AND YEAR(order_created_date) = ? AND MONTH(order_created_date) IN (?,?,?) THEN 1 END) / 2) as done_ncx_q3,
                    (COUNT(CASE WHEN status_wfm = 'done close bima' AND channel = 'SC-One' AND YEAR(order_created_date) = ? AND MONTH(order_created_date) IN (?,?,?) THEN 1 END) / 2) as done_scone_q3,
                    (COUNT(CASE WHEN status_wfm = 'in progress' AND channel != 'SC-One' AND YEAR(order_created_date) = ? AND MONTH(order_created_date) IN (?,?,?) THEN 1 END) / 2) as ogp_ncx_q3,
                    (COUNT(CASE WHEN status_wfm = 'in progress' AND channel = 'SC-One' AND YEAR(order_created_date) = ? AND MONTH(order_created_date) IN (?,?,?) THEN 1 END) / 2) as ogp_scone_q3
                ", [
                    $selectedYear, $q3Months[0], $q3Months[1], $q3Months[2],
                    $selectedYear, $q3Months[0], $q3Months[1], $q3Months[2],
                    $selectedYear, $q3Months[0], $q3Months[1], $q3Months[2],
                    $selectedYear, $q3Months[0], $q3Months[1], $q3Months[2]
                ])
                ->first();

            // Query Bundle Orders
            $bundleStats = DB::table('order_products')
                ->join('document_data', 'order_products.order_id', '=', 'document_data.order_id')
                ->where('document_data.witel_lama', $witelFilter)
                ->when($specialFilter, fn ($q) => $q->where('document_data.'.$specialFilter['column'], $specialFilter['value']))
                ->selectRaw("
                    -- YTD CALCULATIONS Bundle (DIBAGI 2)
                    (COUNT(CASE WHEN order_products.status_wfm = 'done close bima' AND order_products.channel != 'SC-One' THEN 1 END) / 2) as done_ncx,
                    (COUNT(CASE WHEN order_products.status_wfm = 'done close bima' AND order_products.channel = 'SC-One' THEN 1 END) / 2) as done_scone,
                    (COUNT(CASE WHEN order_products.status_wfm = 'in progress' AND order_products.channel != 'SC-One' THEN 1 END) / 2) as ogp_ncx,
                    (COUNT(CASE WHEN order_products.status_wfm = 'in progress' AND order_products.channel = 'SC-One' THEN 1 END) / 2) as ogp_scone,

                    -- Q3 CALCULATIONS Bundle (DIBAGI 2)
                    (COUNT(CASE WHEN order_products.status_wfm = 'done close bima' AND order_products.channel != 'SC-One' AND YEAR(document_data.order_created_date) = ? AND MONTH(document_data.order_created_date) IN (?,?,?) THEN 1 END) / 2) as done_ncx_q3,
                    (COUNT(CASE WHEN order_products.status_wfm = 'done close bima' AND order_products.channel = 'SC-One' AND YEAR(document_data.order_created_date) = ? AND MONTH(document_data.order_created_date) IN (?,?,?) THEN 1 END) / 2) as done_scone_q3,
                    (COUNT(CASE WHEN order_products.status_wfm = 'in progress' AND order_products.channel != 'SC-One' AND YEAR(document_data.order_created_date) = ? AND MONTH(document_data.order_created_date) IN (?,?,?) THEN 1 END) / 2) as ogp_ncx_q3,
                    (COUNT(CASE WHEN order_products.status_wfm = 'in progress' AND order_products.channel = 'SC-One' AND YEAR(document_data.order_created_date) = ? AND MONTH(document_data.order_created_date) IN (?,?,?) THEN 1 END) / 2) as ogp_scone_q3
                ", [
                    $selectedYear, $q3Months[0], $q3Months[1], $q3Months[2],
                    $selectedYear, $q3Months[0], $q3Months[1], $q3Months[2],
                    $selectedYear, $q3Months[0], $q3Months[1], $q3Months[2],
                    $selectedYear, $q3Months[0], $q3Months[1], $q3Months[2]
                ])
                ->first();

            // --- AGGREGATE RESULTS ---
            // Karena SQL sudah membagi 2, hasil penjumlahan di sini otomatis sudah terbagi 2
            $done_ncx   = $singleStats->done_ncx + $bundleStats->done_ncx;
            $done_scone = $singleStats->done_scone + $bundleStats->done_scone;
            $ogp_ncx    = $singleStats->ogp_ncx + $bundleStats->ogp_ncx;
            $ogp_scone  = $singleStats->ogp_scone + $bundleStats->ogp_scone;
            
            $total_ytd  = $done_ncx + $done_scone + $ogp_ncx + $ogp_scone;

            // Q3 Results
            $done_ncx_q3   = $singleStats->done_ncx_q3 + $bundleStats->done_ncx_q3;
            $done_scone_q3 = $singleStats->done_scone_q3 + $bundleStats->done_scone_q3;
            $ogp_ncx_q3    = $singleStats->ogp_ncx_q3 + $bundleStats->ogp_ncx_q3;
            $ogp_scone_q3  = $singleStats->ogp_scone_q3 + $bundleStats->ogp_scone_q3;

            $total_q3 = $done_ncx_q3 + $done_scone_q3 + $ogp_ncx_q3 + $ogp_scone_q3;

            return [
                'id' => $officer->id,
                'nama_po' => $officer->name,
                'witel' => $officer->display_witel,
                // Kita gunakan floatval atau number_format jika ingin memastikan desimal tampil
                'done_ncx' => $done_ncx, 
                'done_scone' => $done_scone,
                'ogp_ncx' => $ogp_ncx,
                'ogp_scone' => $ogp_scone,
                'total' => $total_ytd,
                // Persentase TIDAK PERLU dibagi 2 lagi karena (X/2) / (Y/2) sama dengan X/Y
                'ach_ytd' => $total_ytd > 0 ? number_format((($done_ncx + $done_scone) / $total_ytd) * 100, 1).'%' : '0.0%',
                'ach_q3' => $total_q3 > 0 ? number_format((($done_ncx_q3 + $done_scone_q3) / $total_q3) * 100, 1).'%' : '0.0%',
            ];
        });

        // 4. RETURN INERTIA
        return Inertia::render('Galaksi/Index', [
            'kpiData' => $kpiData,
            'accountOfficers' => $officers,
            'filters' => [
                'year' => $selectedYear,
                'q3_months' => $q3Months
            ]
        ]);
    }

    public function showDetails(Request $request)
    {
        // Fungsi ini hanya menampilkan list detail, biasanya list detail tidak dibagi 2
        // karena menampilkan baris per baris data asli.
        // Jika Anda ingin datanya tetap seperti biasa (list order), biarkan seperti sebelumnya.
        
        $validated = $request->validate([
            'officer_id' => 'required|integer|exists:account_officers,id',
            'kpi_type' => 'required|string|in:done,ogp',
            'channel_type' => 'required|string|in:ncx,scone',
        ]);

        $officer = AccountOfficer::findOrFail($validated['officer_id']);

        $statusWfm = ($validated['kpi_type'] === 'done') ? 'done close bima' : 'in progress';
        $channelOperator = ($validated['channel_type'] === 'ncx') ? '!=' : '=';
        $channelValue = 'SC-One';

        $witelFilter = $officer->filter_witel_lama;
        $specialFilter = $officer->special_filter_column && $officer->special_filter_value
            ? ['column' => $officer->special_filter_column, 'value' => $officer->special_filter_value]
            : null;

        $applyCommonFilters = function($query, $tablePrefix = '') use ($witelFilter, $specialFilter) {
            $colWitel = $tablePrefix ? $tablePrefix.'.witel_lama' : 'witel_lama';
            $query->where($colWitel, $witelFilter);
            if ($specialFilter) {
                $colSpecial = $tablePrefix ? $tablePrefix.'.'.$specialFilter['column'] : $specialFilter['column'];
                $query->where($colSpecial, $specialFilter['value']);
            }
        };

        $singleOrders = DocumentData::query()
            ->tap(fn($q) => $applyCommonFilters($q))
            ->whereNotNull('product')
            ->where('product', 'NOT LIKE', '%-%')
            ->where('product', 'NOT LIKE', "%\n%")
            ->where('status_wfm', $statusWfm)
            ->where('channel', $channelOperator, $channelValue)
            ->select('order_id', 'product', 'customer_name', 'order_created_date', 'status_wfm', 'milestone')
            ->get();

        $bundleOrders = DB::table('order_products')
            ->join('document_data', 'order_products.order_id', '=', 'document_data.order_id')
            ->tap(fn($q) => $applyCommonFilters($q, 'document_data'))
            ->where('order_products.status_wfm', $statusWfm)
            ->where('order_products.channel', $channelOperator, $channelValue)
            ->select(
                'order_products.order_id',
                'order_products.product_name as product',
                'document_data.customer_name',
                'document_data.order_created_date',
                'order_products.status_wfm',
                'document_data.milestone'
            )
            ->get();

        $allOrders = $singleOrders->merge($bundleOrders)->sortByDesc('order_created_date');

        return Inertia::render('Galaksi/ShowDetails', [
            'orders' => $allOrders->values(),
            'pageTitle' => "Detail Order " . $officer->name . " (" . strtoupper($validated['channel_type']) . " - " . strtoupper($validated['kpi_type']) . ")",
            'filters' => $validated
        ]);
    }
}