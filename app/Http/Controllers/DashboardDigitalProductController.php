<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\DocumentData;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class DashboardDigitalProductController extends Controller
{
    public function index(Request $request)
    {
        // Validasi dan set default untuk filter
        $validated = $request->validate([
            'period' => 'nullable|date_format:Y-m',
            'limit' => 'nullable|in:10,30,100,500',
        ]);
        $period = $validated['period'] ?? Carbon::now()->format('Y-m');
        $date = Carbon::parse($period);
        $limit = $validated['limit'] ?? '10';

        $products = ['Netmonk', 'OCA', 'Antares Eazy', 'Pijar'];
        $witelList = ['BALI', 'JATIM BARAT', 'JATIM TIMUR', 'NUSA TENGGARA', 'SURAMADU'];

        $subTypeMapping = [
            'AO' => ['New Install', 'ADD SERVICE', 'NEW SALES'],
            'MO' => ['MODIFICATION', 'Modify'],
            'SO' => ['Suspend'],
            'DO' => ['Disconnect'],
            'RO' => ['Resume'],
        ];

        $caseStatement = "CASE ";
        foreach ($subTypeMapping as $group => $subTypes) {
            $escapedSubTypes = array_map(fn($v) => str_replace("'", "''", strtoupper(trim($v))), $subTypes);
            $inClause = implode("', '", $escapedSubTypes);
            $caseStatement .= "WHEN UPPER(TRIM(order_sub_type)) IN ('" . $inClause . "') THEN '" . $group . "' ";
        }
        $caseStatement .= "ELSE NULL END";

        // --- Query untuk Revenue by Sub-type ---
        $revenueBySubTypeQuery = DocumentData::query()
            ->select(
                DB::raw($caseStatement . " as sub_type"),
                DB::raw('TRIM(UPPER(product)) as product'),
                DB::raw('SUM(net_price) as total_revenue')
            )
            ->whereNotNull(DB::raw($caseStatement))
            ->where('net_price', '>', 0) // <-- Ini penyebab 'Pijar' tidak muncul jika harganya 0
            ->whereIn(DB::raw('TRIM(UPPER(product))'), array_map('strtoupper', $products))
            ->whereYear('order_date', $date->year)
            ->whereMonth('order_date', $date->month)
            ->groupBy('sub_type', DB::raw('TRIM(UPPER(product))'));

        $revenueBySubTypeData = $revenueBySubTypeQuery->get()->map(function ($item) use ($products) {
            foreach ($products as $p) {
                if (strtoupper($p) === $item->product) {
                    $item->product = $p;
                    break;
                }
            }
            return $item;
        });

        // --- [FIX] Query untuk Amount by Sub-type dikembalikan ke format yang benar ---
        $amountBySubTypeQuery = DocumentData::query()
            ->select(
                DB::raw($caseStatement . " as sub_type"),
                DB::raw('TRIM(UPPER(product)) as product'),
                DB::raw('COUNT(*) as total_amount') // Menghitung jumlah, bukan harga
            )
            ->whereNotNull(DB::raw($caseStatement))
            // Tidak ada filter harga, jadi 'Pijar' dengan harga 0 akan terhitung
            ->whereIn(DB::raw('TRIM(UPPER(product))'), array_map('strtoupper', $products))
            ->whereYear('order_date', $date->year)
            ->whereMonth('order_date', $date->month)
            ->groupBy('sub_type', DB::raw('TRIM(UPPER(product))'));

        $amountBySubTypeData = $amountBySubTypeQuery->get()->map(function ($item) use ($products) {
            foreach ($products as $p) {
                if (strtoupper($p) === $item->product) {
                    $item->product = $p;
                    break;
                }
            }
            return $item;
        });

        $allSubTypes = collect([
            ['sub_type' => 'AO', 'total' => 0],
            ['sub_type' => 'SO', 'total' => 0],
            ['sub_type' => 'DO', 'total' => 0],
            ['sub_type' => 'MO', 'total' => 0],
            ['sub_type' => 'RO', 'total' => 0],
        ]);

        $existingSubTypeCounts = DocumentData::query()
            ->select(
                DB::raw($caseStatement . " as sub_type"),
                DB::raw('COUNT(*) as total')
            )
            ->whereNotNull(DB::raw($caseStatement))
            ->whereYear('order_date', $date->year)
            ->whereMonth('order_date', $date->month)
            ->groupBy('sub_type')
            ->get()
            ->keyBy('sub_type'); // Jadikan sub_type sebagai key untuk kemudahan merge

        // Gabungkan data yang ada dengan daftar lengkap
        $sessionBySubType = $allSubTypes->map(function ($item) use ($existingSubTypeCounts) {
            if ($existingSubTypeCounts->has($item['sub_type'])) {
                $item['total'] = $existingSubTypeCounts->get($item['sub_type'])['total'];
            }
            return $item;
        });

        $productRadarData = DocumentData::query()
            ->select(
                'nama_witel',
                ...collect($products)->map(function ($product) { // [UBAH] Gunakan variabel $products
                    return DB::raw("SUM(CASE WHEN product = '{$product}' THEN 1 ELSE 0 END) as `{$product}`");
                })
            )
            ->whereIn('nama_witel', $witelList)
            ->whereIn('product', $products) // [TAMBAH] Filter berdasarkan produk untuk efisiensi
            ->whereYear('order_date', $date->year)
            ->whereMonth('order_date', $date->month)
            ->groupBy('nama_witel')
            ->get();

        $witelPieData = DocumentData::query()
            ->select('nama_witel', DB::raw('COUNT(*) as value'))
            ->whereIn('nama_witel', $witelList)
            ->whereYear('order_date', $date->year)
            ->whereMonth('order_date', $date->month)
            ->groupBy('nama_witel')
            ->get();

        $dataPreview = DocumentData::query()
            ->select('order_id', 'product', 'milestone', 'nama_witel', 'status_wfm', 'order_created_date', 'order_date') // Optional: tambahkan 'order_date' jika ingin ditampilkan
            ->whereYear('order_date', $date->year)
            ->whereMonth('order_date', $date->month)
            ->orderBy('order_date', 'desc')
            ->paginate($limit)
            ->withQueryString();

        return Inertia::render('DashboardDigitalProduct', [
            'revenueBySubTypeData' => $revenueBySubTypeData,
            'amountBySubTypeData' => $amountBySubTypeData,
            'sessionBySubType' => $sessionBySubType,
            'productRadarData' => $productRadarData,
            'witelPieData' => $witelPieData,
            'dataPreview' => $dataPreview,
            'filters' => [
                'period' => $period,
                'limit' => $limit,
            ]
        ]);
    }
}

