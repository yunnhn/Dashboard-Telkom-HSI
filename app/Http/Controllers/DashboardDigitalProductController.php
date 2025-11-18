<?php

namespace App\Http\Controllers;

use App\Models\DocumentData;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Illuminate\Support\Facades\Cache;

class DashboardDigitalProductController extends Controller
{
    public function index(Request $request)
    {
        $settings = Cache::get('granular_embed_settings', []);

        if (isset($settings['digitalProduct']) && $settings['digitalProduct']['enabled'] && !empty($settings['digitalProduct']['url'])) {
            return Inertia::render('Dashboard/ExternalEmbed', [
                'embedUrl' => $settings['digitalProduct']['url'],
                'headerTitle' => 'Dashboard Digital Product' // Judul untuk layout
            ]);
        }

        // 1. Validasi filter (sudah benar)
        $validated = $request->validate([
            'startDate' => 'nullable|date_format:Y-m-d',
            'endDate' => 'nullable|date_format:Y-m-d|after_or_equal:startDate',
            'products' => 'nullable|array', 'products.*' => 'string|max:255',
            'witels' => 'nullable|array', 'witels.*' => 'string|max:255',
            'subTypes' => 'nullable|array', 'subTypes.*' => 'string|in:AO,SO,DO,MO,RO',
            'branches' => 'nullable|array', 'branches.*' => 'string|max:255',
            'limit' => 'nullable|in:10,50,100,500',
        ]);
        $limit = $validated['limit'] ?? '10';

        $firstOrderDate = DocumentData::min('order_date');
        $latestOrderDate = DocumentData::max('order_date');

        // Jika tidak ada data sama sekali, gunakan tanggal hari ini sebagai fallback
        $initialStartDate = $firstOrderDate ? \Carbon\Carbon::parse($firstOrderDate)->format('Y-m-d') : now()->format('Y-m-d');
        $initialEndDate = $latestOrderDate ? \Carbon\Carbon::parse($latestOrderDate)->format('Y-m-d') : now()->format('Y-m-d');

        // Gunakan tanggal tersebut
        $startDateToUse = $request->input('startDate', $initialStartDate);
        $endDateToUse = $request->input('endDate', $initialEndDate);

        $startDateToUse = $request->input('startDate', $initialStartDate);
        $endDateToUse = $request->input('endDate', $initialEndDate);

        // Daftar opsi filter (tidak berubah)
        $products = ['Netmonk', 'OCA', 'Antares Eazy', 'Pijar'];
        $subTypes = ['AO', 'SO', 'DO', 'MO', 'RO'];
        $witelList = DocumentData::query()->select('nama_witel')->whereNotNull('nama_witel')->distinct()->orderBy('nama_witel')->pluck('nama_witel');
        $branchList = DocumentData::query()->select('telda')->whereNotNull('telda')->distinct()->orderBy('telda')->pluck('telda');

        // CASE statements (tidak berubah)
        $productCaseStatement = 'CASE '.
            "WHEN UPPER(TRIM(product)) LIKE 'NETMONK%' THEN 'Netmonk' ".
            "WHEN UPPER(TRIM(product)) LIKE 'OCA%' THEN 'OCA' ".
            "WHEN UPPER(TRIM(product)) LIKE 'ANTARES EAZY%' THEN 'Antares Eazy' ".
            "WHEN UPPER(TRIM(product)) LIKE 'PIJAR%' THEN 'Pijar' ".
            'ELSE NULL END';

        $subTypeMapping = [
            'AO' => ['New Install', 'ADD SERVICE', 'NEW SALES'], 'MO' => ['MODIFICATION', 'Modify'],
            'SO' => ['Suspend'], 'DO' => ['Disconnect'], 'RO' => ['Resume'],
        ];
        $subTypeCaseStatement = 'CASE ';
        foreach ($subTypeMapping as $group => $types) {
            $inClause = implode("', '", array_map(fn ($v) => strtoupper(trim($v)), $types));
            $subTypeCaseStatement .= "WHEN UPPER(TRIM(order_sub_type)) IN ('".$inClause."') THEN '".$group."' ";
        }
        $subTypeCaseStatement .= 'ELSE NULL END';

        // [PERBAIKAN UTAMA - ANTI GAGAL]
        $applyFilters = function ($query) use ($startDateToUse, $endDateToUse, $validated, $subTypeCaseStatement, $productCaseStatement) {
            // Selalu terapkan filter tanggal
            $query->whereBetween('order_date', [$startDateToUse.' 00:00:00', $endDateToUse.' 23:59:59']);

            // [FIX PRODUK]
            // Cek apakah 'products' ada dan merupakan array
            if (isset($validated['products']) && is_array($validated['products'])) {
                if (empty($validated['products'])) {
                    // Jika array-nya KOSONG (0/4), paksa kueri untuk tidak mengembalikan apa-apa.
                    $query->whereRaw('1 = 0'); // Ini 100% pasti memfilter 0 hasil
                } else {
                    // Jika array-nya berisi (misal 1/4, 2/4), gunakan whereIn
                    $query->whereIn(DB::raw($productCaseStatement), $validated['products']);
                }
            }
            // Jika $validated['products'] adalah null (tidak dikirim), filter tidak diterapkan (ambil 4/4)

            // [FIX WITEL]
            if (isset($validated['witels']) && is_array($validated['witels'])) {
                if (empty($validated['witels'])) {
                    $query->whereRaw('1 = 0');
                } else {
                    $query->whereIn('nama_witel', $validated['witels']);
                }
            }

            // [FIX BRANCH]
            if (isset($validated['branches']) && is_array($validated['branches'])) {
                if (empty($validated['branches'])) {
                    $query->whereRaw('1 = 0');
                } else {
                    $query->whereIn('telda', $validated['branches']);
                }
            }

            // [FIX SUB TYPE]
            if (isset($validated['subTypes']) && is_array($validated['subTypes'])) {
                if (empty($validated['subTypes'])) {
                    $query->whereRaw('1 = 0');
                } else {
                    $query->whereIn(DB::raw($subTypeCaseStatement), $validated['subTypes']);
                }
            }
        };

        // --- Query (Tidak berubah) ---
        $revenueBySubTypeData = DocumentData::query()
            ->select(DB::raw($subTypeCaseStatement.' as sub_type'), DB::raw($productCaseStatement.' as product'), DB::raw('SUM(net_price) as total_revenue'))
            ->whereNotNull(DB::raw($productCaseStatement))->whereNotNull(DB::raw($subTypeCaseStatement))->where('net_price', '>', 0)
            ->groupBy('sub_type', 'product')->tap($applyFilters)->get();

        $amountBySubTypeData = DocumentData::query()
            ->select(DB::raw($subTypeCaseStatement.' as sub_type'), DB::raw($productCaseStatement.' as product'), DB::raw('COUNT(*) as total_amount'))
            ->whereNotNull(DB::raw($productCaseStatement))->whereNotNull(DB::raw($subTypeCaseStatement))
            ->groupBy('sub_type', 'product')->tap($applyFilters)->get();

        $sessionBySubTypeQuery = DocumentData::query()
            ->select(DB::raw($subTypeCaseStatement.' as sub_type'), DB::raw('COUNT(*) as total'))
            ->whereNotNull(DB::raw($subTypeCaseStatement))->groupBy('sub_type')->tap($applyFilters);
        $existingSubTypeCounts = $sessionBySubTypeQuery->get()->keyBy('sub_type');
        $allSubTypes = collect($subTypes)->map(fn ($st) => ['sub_type' => $st, 'total' => 0]);
        $sessionBySubType = $allSubTypes->map(function ($item) use ($existingSubTypeCounts) {
            if ($existingSubTypeCounts->has($item['sub_type'])) {
                $item['total'] = $existingSubTypeCounts->get($item['sub_type'])['total'];
            }

            return $item;
        });

        $productRadarData = DocumentData::query()
            ->select('nama_witel', ...collect($products)->map(fn ($p) => DB::raw('SUM(CASE WHEN '.$productCaseStatement." = '{$p}' THEN 1 ELSE 0 END) as `{$p}`")))
            ->whereNotNull('nama_witel')->whereNotNull(DB::raw($productCaseStatement))
            ->groupBy('nama_witel')->tap($applyFilters)->get();

        $witelPieData = DocumentData::query()->select('nama_witel', DB::raw('COUNT(*) as value'))
            ->groupBy('nama_witel')->tap($applyFilters)->get();

        $dataPreview = DocumentData::query()
            ->select('order_id', 'product', 'milestone', 'nama_witel', 'status_wfm', 'order_created_date', 'order_date')
            ->orderBy('order_date', 'desc')->tap($applyFilters)->paginate($limit)->withQueryString();

        return Inertia::render('DashboardDigitalProduct', [
            'revenueBySubTypeData' => $revenueBySubTypeData,
            'amountBySubTypeData' => $amountBySubTypeData,
            'sessionBySubType' => $sessionBySubType,
            'productRadarData' => $productRadarData,
            'witelPieData' => $witelPieData,
            'dataPreview' => $dataPreview,
            'filters' => [
                'startDate' => $startDateToUse,
                'endDate' => $endDateToUse,
                // Kirim kembali nilai yang divalidasi (atau null)
                'products' => $validated['products'] ?? null,
                'witels' => $validated['witels'] ?? null,
                'subTypes' => $validated['subTypes'] ?? null,
                'branches' => $validated['branches'] ?? null,
                'limit' => $limit,
            ],
            'filterOptions' => [
                'products' => $products, 'witelList' => $witelList, 'subTypes' => $subTypes, 'branchList' => $branchList,
            ],
            'isEmbed' => false,
        ]);
    }

    public function embed(Request $request)
    {
        // 1. Validasi filter (sudah benar)
        $validated = $request->validate([
            'startDate' => 'nullable|date_format:Y-m-d',
            'endDate' => 'nullable|date_format:Y-m-d|after_or_equal:startDate',
            'products' => 'nullable|array', 'products.*' => 'string|max:255',
            'witels' => 'nullable|array', 'witels.*' => 'string|max:255',
            'subTypes' => 'nullable|array', 'subTypes.*' => 'string|in:AO,SO,DO,MO,RO',
            'branches' => 'nullable|array', 'branches.*' => 'string|max:255',
            'limit' => 'nullable|in:10,50,100,500',
        ]);
        $limit = $validated['limit'] ?? '10';

        $initialStartDate = now()->startOfYear()->format('Y-m-d');
        $latestOrderDate = DocumentData::max('order_date');
        $initialEndDate = $latestOrderDate ? \Carbon\Carbon::parse($latestOrderDate)->format('Y-m-d') : now()->format('Y-m-d');

        $startDateToUse = $request->input('startDate', $initialStartDate);
        $endDateToUse = $request->input('endDate', $initialEndDate);

        // Opsi filter (tidak berubah)
        $products = ['Netmonk', 'OCA', 'Antares Eazy', 'Pijar'];
        $subTypes = ['AO', 'SO', 'DO', 'MO', 'RO'];
        $witelList = DocumentData::query()->select('nama_witel')->whereNotNull('nama_witel')->distinct()->orderBy('nama_witel')->pluck('nama_witel');
        $branchList = DocumentData::query()->select('telda')->whereNotNull('telda')->distinct()->orderBy('telda')->pluck('telda');

        // CASE statements (tidak berubah)
        $productCaseStatement = 'CASE '.
            "WHEN UPPER(TRIM(product)) LIKE 'NETMONK%' THEN 'Netmonk' ".
            "WHEN UPPER(TRIM(product)) LIKE 'OCA%' THEN 'OCA' ".
            "WHEN UPPER(TRIM(product)) LIKE 'ANTARES EAZY%' THEN 'Antares Eazy' ".
            "WHEN UPPER(TRIM(product)) LIKE 'PIJAR%' THEN 'Pijar' ".
            'ELSE NULL END';

        $subTypeMapping = [
            'AO' => ['New Install', 'ADD SERVICE', 'NEW SALES'], 'MO' => ['MODIFICATION', 'Modify'],
            'SO' => ['Suspend'], 'DO' => ['Disconnect'], 'RO' => ['Resume'],
        ];
        $subTypeCaseStatement = 'CASE ';
        foreach ($subTypeMapping as $group => $types) {
            $inClause = implode("', '", array_map(fn ($v) => strtoupper(trim($v)), $types));
            $subTypeCaseStatement .= "WHEN UPPER(TRIM(order_sub_type)) IN ('".$inClause."') THEN '".$group."' ";
        }
        $subTypeCaseStatement .= 'ELSE NULL END';

        // [PERBAIKAN UTAMA - ANTI GAGAL]
        $applyFilters = function ($query) use ($startDateToUse, $endDateToUse, $validated, $subTypeCaseStatement, $productCaseStatement) {
            // Selalu terapkan filter tanggal
            $query->whereBetween('order_date', [$startDateToUse.' 00:00:00', $endDateToUse.' 23:59:59']);

            // [FIX PRODUK]
            if (isset($validated['products']) && is_array($validated['products'])) {
                if (empty($validated['products'])) {
                    $query->whereRaw('1 = 0'); // Paksa 0 hasil
                } else {
                    $query->whereIn(DB::raw($productCaseStatement), $validated['products']);
                }
            }

            // [FIX WITEL]
            if (isset($validated['witels']) && is_array($validated['witels'])) {
                if (empty($validated['witels'])) {
                    $query->whereRaw('1 = 0');
                } else {
                    $query->whereIn('nama_witel', $validated['witels']);
                }
            }

            // [FIX BRANCH]
            if (isset($validated['branches']) && is_array($validated['branches'])) {
                if (empty($validated['branches'])) {
                    $query->whereRaw('1 = 0');
                } else {
                    $query->whereIn('telda', $validated['branches']);
                }
            }

            // [FIX SUB TYPE]
            if (isset($validated['subTypes']) && is_array($validated['subTypes'])) {
                if (empty($validated['subTypes'])) {
                    $query->whereRaw('1 = 0');
                } else {
                    $query->whereIn(DB::raw($subTypeCaseStatement), $validated['subTypes']);
                }
            }
        };

        // --- Query (Tidak berubah) ---
        $revenueBySubTypeData = DocumentData::query()
            ->select(DB::raw($subTypeCaseStatement.' as sub_type'), DB::raw($productCaseStatement.' as product'), DB::raw('SUM(net_price) as total_revenue'))
            ->whereNotNull(DB::raw($productCaseStatement))->whereNotNull(DB::raw($subTypeCaseStatement))->where('net_price', '>', 0)
            ->groupBy('sub_type', 'product')->tap($applyFilters)->get();

        $amountBySubTypeData = DocumentData::query()
            ->select(DB::raw($subTypeCaseStatement.' as sub_type'), DB::raw($productCaseStatement.' as product'), DB::raw('COUNT(*) as total_amount'))
            ->whereNotNull(DB::raw($productCaseStatement))->whereNotNull(DB::raw($subTypeCaseStatement))
            ->groupBy('sub_type', 'product')->tap($applyFilters)->get();

        $sessionBySubTypeQuery = DocumentData::query()
            ->select(DB::raw($subTypeCaseStatement.' as sub_type'), DB::raw('COUNT(*) as total'))
            ->whereNotNull(DB::raw($subTypeCaseStatement))->groupBy('sub_type')->tap($applyFilters);
        $existingSubTypeCounts = $sessionBySubTypeQuery->get()->keyBy('sub_type');
        $allSubTypes = collect($subTypes)->map(fn ($st) => ['sub_type' => $st, 'total' => 0]);
        $sessionBySubType = $allSubTypes->map(function ($item) use ($existingSubTypeCounts) {
            if ($existingSubTypeCounts->has($item['sub_type'])) {
                $item['total'] = $existingSubTypeCounts->get($item['sub_type'])['total'];
            }

            return $item;
        });

        $productRadarData = DocumentData::query()
            ->select('nama_witel', ...collect($products)->map(fn ($p) => DB::raw('SUM(CASE WHEN '.$productCaseStatement." = '{$p}' THEN 1 ELSE 0 END) as `{$p}`")))
            ->whereNotNull('nama_witel')->whereNotNull(DB::raw($productCaseStatement))
            ->groupBy('nama_witel')->tap($applyFilters)->get();

        $witelPieData = DocumentData::query()->select('nama_witel', DB::raw('COUNT(*) as value'))
            ->groupBy('nama_witel')->tap($applyFilters)->get();

        $dataPreview = DocumentData::query()
            ->select('order_id', 'product', 'milestone', 'nama_witel', 'status_wfm', 'order_created_date', 'order_date')
            ->orderBy('order_date', 'desc')->tap($applyFilters)->paginate($limit)->withQueryString();

        return Inertia::render('DashboardDigitalProduct', [
            'revenueBySubTypeData' => $revenueBySubTypeData,
            'amountBySubTypeData' => $amountBySubTypeData,
            'sessionBySubType' => $sessionBySubType,
            'productRadarData' => $productRadarData,
            'witelPieData' => $witelPieData,
            'dataPreview' => $dataPreview,
            'filters' => [
                'startDate' => $startDateToUse,
                'endDate' => $endDateToUse,
                'products' => $validated['products'] ?? null,
                'witels' => $validated['witels'] ?? null,
                'subTypes' => $validated['subTypes'] ?? null,
                'branches' => $validated['branches'] ?? null,
                'limit' => $limit,
            ],
            'filterOptions' => [
                'products' => $products, 'witelList' => $witelList, 'subTypes' => $subTypes, 'branchList' => $branchList,
            ],
            'isEmbed' => true,
        ])->rootView('embed');
    }
}
