<?php

namespace App\Http\Controllers;

use App\Models\DocumentData;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Carbon\Carbon;

class DashboardDigitalProductController extends Controller
{
    public function index(Request $request)
    {
        return $this->getData($request, false);
    }

    public function embed(Request $request)
    {
        return $this->getData($request, true);
    }

    private function getData(Request $request, $isEmbed)
    {
        // 1. VALIDASI
        $request->validate([
            'startDate' => 'nullable|date_format:Y-m-d',
            'endDate'   => 'nullable|date_format:Y-m-d|after_or_equal:startDate',
            'products'  => 'nullable|array',
            'witels'    => 'nullable|array',
            'subTypes'  => 'nullable|array',
            'branches'  => 'nullable|array',
            'limit'     => 'nullable|in:10,50,100,500',
            'search'    => 'nullable|string|max:255',
        ]);

        $limit  = $request->input('limit', 10);
        $search = $request->input('search');

        // 2. SETUP DATE
        $firstOrderDate  = DocumentData::min('order_date');
        $latestOrderDate = DocumentData::max('order_date');

        $initialStartDate = $isEmbed
            ? now()->startOfYear()->format('Y-m-d')
            : ($firstOrderDate ? Carbon::parse($firstOrderDate)->format('Y-m-d') : now()->format('Y-m-d'));
        
        $initialEndDate = $latestOrderDate ? Carbon::parse($latestOrderDate)->format('Y-m-d') : now()->format('Y-m-d');

        $startDateToUse = $request->input('startDate', $initialStartDate);
        $endDateToUse   = $request->input('endDate', $initialEndDate);

        // 3. CASE STATEMENTS (Standarisasi Data)
        // Case Product
        $productCaseStatement = "CASE " .
            "WHEN UPPER(TRIM(product)) LIKE '%NETMONK%' THEN 'Netmonk' " .
            "WHEN UPPER(TRIM(product)) LIKE '%OCA%' THEN 'OCA' " .
            "WHEN UPPER(TRIM(product)) LIKE '%ANTARES%' THEN 'Antares' " .
            "WHEN UPPER(TRIM(product)) LIKE '%PIJAR%' THEN 'Pijar' " .
            "ELSE NULL END";

        // Case SubType
        $subTypeMapping = [
            'AO' => ['New Install', 'ADD SERVICE', 'NEW SALES'],
            'MO' => ['MODIFICATION', 'Modify'],
            'SO' => ['Suspend'], 'DO' => ['Disconnect'], 'RO' => ['Resume'],
        ];
        $subTypeCaseStatement = 'CASE ';
        foreach ($subTypeMapping as $group => $types) {
            $inClause = implode("', '", array_map(fn ($v) => strtoupper(trim($v)), $types));
            $subTypeCaseStatement .= "WHEN UPPER(TRIM(order_sub_type)) IN ('" . $inClause . "') THEN '" . $group . "' ";
        }
        $subTypeCaseStatement .= 'ELSE NULL END';

        // Case Branch (Handle NULL jadi string agar bisa difilter)
        $branchCaseStatement = "COALESCE(NULLIF(telda, ''), 'Non-Telda (NCX)')";

        // 4. PREPARE FILTER OPTIONS
        $products = ['Netmonk', 'OCA', 'Antares', 'Pijar'];
        
        $witelList = DocumentData::query()
            ->select('nama_witel')
            ->whereNotNull('nama_witel')
            ->whereNotNull(DB::raw($productCaseStatement)) 
            ->distinct()->orderBy('nama_witel')->pluck('nama_witel');

        // Branch List Master (Termasuk NCX)
        $branchList = DocumentData::query()
            ->select(DB::raw("$branchCaseStatement as telda"))
            ->whereNotNull(DB::raw($productCaseStatement))
            ->distinct()->orderBy('telda')->pluck('telda');

        // MAPPING DYNAMIC: WITEL -> BRANCH (Termasuk NULL/NCX)
        $witelBranchMapping = DocumentData::query()
            ->select('nama_witel', DB::raw("$branchCaseStatement as telda"))
            ->whereNotNull('nama_witel')
            // Note: Jangan pakai whereNotNull('telda') agar data NULL (NCX) ikut terambil
            ->whereNotNull(DB::raw($productCaseStatement))
            ->distinct()
            ->orderBy('nama_witel')
            ->orderBy('telda')
            ->get();

        $subTypes = ['AO', 'SO', 'DO', 'MO', 'RO'];

        // 5. CORE FILTER LOGIC
        $applyFilters = function ($query) use ($request, $startDateToUse, $endDateToUse, $subTypeCaseStatement, $productCaseStatement, $branchCaseStatement) {
            $query->whereBetween('order_date', [$startDateToUse . ' 00:00:00', $endDateToUse . ' 23:59:59']);
            
            // Hapus "Data Hantu" (Product tak dikenal)
            $query->whereNotNull(DB::raw($productCaseStatement));

            if ($request->filled('products')) {
                $query->whereIn(DB::raw($productCaseStatement), $request->input('products'));
            }
            if ($request->filled('witels')) {
                $query->whereIn('nama_witel', $request->input('witels'));
            }
            // Filter Branch menggunakan logic COALESCE agar NULL (NCX) terbaca
            if ($request->filled('branches')) {
                $query->whereIn(DB::raw($branchCaseStatement), $request->input('branches'));
            }
            if ($request->filled('subTypes')) {
                $query->whereIn(DB::raw($subTypeCaseStatement), $request->input('subTypes'));
            }
        };

        // 6. QUERY DATA DASHBOARD
        
        // Revenue
        $revenueByWitelData = DocumentData::query()
            ->select('nama_witel', DB::raw($productCaseStatement . ' as product'), DB::raw('SUM(net_price) as total_revenue'))
            ->whereNotNull('nama_witel')->where('net_price', '>', 0)
            ->tap($applyFilters)
            ->groupBy('nama_witel', DB::raw($productCaseStatement))->get();

        // Amount
        $amountByWitelData = DocumentData::query()
            ->select('nama_witel', DB::raw($productCaseStatement . ' as product'), DB::raw('COUNT(*) as total_amount'))
            ->whereNotNull('nama_witel')
            ->tap($applyFilters)
            ->groupBy('nama_witel', DB::raw($productCaseStatement))->get();

        // Segment
        $productBySegmentData = DocumentData::query()
            ->select(DB::raw($productCaseStatement . ' as product'), 'segment', DB::raw('COUNT(*) as total'))
            ->whereNotNull('segment')
            ->tap($applyFilters)
            ->groupBy('segment', DB::raw($productCaseStatement))->get();

        // Channel
        $productByChannelData = DocumentData::query()
            ->select(
                DB::raw($productCaseStatement . ' as product'),
                DB::raw("COALESCE(NULLIF(channel, ''), 'Unmapped') as channel"), 
                DB::raw('COUNT(*) as total')
            )
            ->tap($applyFilters)
            ->groupBy(DB::raw("COALESCE(NULLIF(channel, ''), 'Unmapped')"), DB::raw($productCaseStatement))->get();

        // Pie Chart
        $productPieData = DocumentData::query()
            ->select(DB::raw($productCaseStatement . ' as product'), DB::raw('COUNT(*) as value'))
            ->tap($applyFilters)
            ->groupBy(DB::raw($productCaseStatement))->get();

        // Table Preview
        $dataPreview = DocumentData::query()
            ->select(
                'id',
                'batch_id',
                'order_id',
                'product',
                'net_price',
                'is_template_price',
                'products_processed',
                'milestone',
                'previous_milestone',
                'segment',
                'nama_witel',
                'status_wfm',
                'customer_name',
                'channel',
                'layanan',
                'filter_produk',
                'witel_lama',
                'order_status',
                'order_sub_type',
                'order_status_n',
                'tahun',
                // Logic khusus Telda/Branch tetap dipertahankan
                DB::raw("COALESCE(NULLIF(telda, ''), 'Non-Telda (NCX)') as telda"), 
                'week',
                'order_date',
                'order_created_date'
            )
            ->tap($applyFilters)
            ->when($search, function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('order_id', 'like', "%{$search}%")
                      ->orWhere('customer_name', 'like', "%{$search}%")
                      ->orWhere('product', 'like', "%{$search}%")
                      ->orWhere('status_wfm', 'like', "%{$search}%");
                });
            })
            ->orderBy('order_date', 'desc')
            ->paginate($limit)->withQueryString();

        // 7. RETURN
        $props = [
            'revenueByWitelData'   => $revenueByWitelData,
            'amountByWitelData'    => $amountByWitelData,
            'productBySegmentData' => $productBySegmentData,
            'productByChannelData' => $productByChannelData,
            'productPieData'       => $productPieData,
            'dataPreview'          => $dataPreview,
            'filters' => [
                'startDate' => $startDateToUse,
                'endDate'   => $endDateToUse,
                'products'  => $request->input('products'),
                'witels'    => $request->input('witels'),
                'subTypes'  => $request->input('subTypes'),
                'branches'  => $request->input('branches'),
                'limit'     => $limit,
                'search'    => $search,
            ],
            'filterOptions' => [
                'products'       => $products,
                'witelList'      => $witelList,
                'subTypes'       => $subTypes,
                'branchList'     => $branchList,
                'witelBranchMap' => $witelBranchMapping, // Data penting untuk FE
            ],
            'isEmbed' => $isEmbed,
        ];

        return $isEmbed
            ? Inertia::render('DashboardDigitalProduct', $props)->rootView('embed')
            : Inertia::render('DashboardDigitalProduct', $props);
    }
}