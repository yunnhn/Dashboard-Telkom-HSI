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
            'limit' => 'nullable|in:20,50,100,500',
        ]);
        $period = $validated['period'] ?? Carbon::now()->format('Y-m');
        $limit = $validated['limit'] ?? '20';

        // --- Query untuk Chart Revenue by Sub-type (Tidak Berubah) ---
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

        $revenueBySubTypeQuery = DocumentData::query()
            ->select(
                DB::raw($caseStatement . " as sub_type"),
                'product',
                DB::raw('SUM(net_price) as total_revenue')
            )
            ->whereNotNull(DB::raw($caseStatement))
            ->where('net_price', '>', 0)
            ->groupBy('sub_type', 'product');

        $date = Carbon::parse($period);
        $revenueBySubTypeQuery->whereYear('order_date', $date->year)
                              ->whereMonth('order_date', $date->month);

        $revenueBySubTypeData = $revenueBySubTypeQuery->get();

        // --- [BARU] Query untuk Tabel Data Preview ---
        $dataPreview = DocumentData::query()
            ->select('order_id', 'product', 'milestone', 'nama_witel', 'status_wfm', 'order_created_date')
            ->orderBy('order_created_date', 'desc')
            ->paginate($limit)
            ->withQueryString();

        return Inertia::render('DashboardDigitalProduct', [
            'revenueBySubTypeData' => $revenueBySubTypeData,
            'dataPreview' => $dataPreview,
            'filters' => [
                'period' => $period,
                'limit' => $limit,
            ]
        ]);
    }
}

