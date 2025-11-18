<?php

namespace App\Http\Controllers;

use App\Models\SosData;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;
use Inertia\Inertia;

class DashboardSOSController extends Controller
{
    // [BARU] Buat fungsi private untuk kueri agar tidak duplikat kode
    private function getDashboardData(Request $request)
    {
        // 1. Validasi filter
        $validated = $request->validate([
            'startDate' => 'nullable|date_format:Y-m-d',
            'endDate' => 'nullable|date_format:Y-m-d|after_or_equal:startDate',
            'witels' => 'nullable|array', 'witels.*' => 'string',
            'segmens' => 'nullable|array', 'segmens.*' => 'string',
            'kategoris' => 'nullable|array', 'kategoris.*' => 'string',
            'limit' => 'nullable|in:10,50,100',
        ]);

        $limit = $validated['limit'] ?? '10';

        // 2. Siapkan opsi untuk dropdown filter
        $filterOptions = [
            'witelList' => SosData::query()->select(DB::raw('TRIM(UPPER(bill_witel)) as witel'))->whereNotNull('bill_witel')->distinct()->orderBy('witel')->pluck('witel'),
            'segmenList' => SosData::query()->select(DB::raw('TRIM(UPPER(segmen)) as segmen'))->whereNotNull('segmen')->distinct()->orderBy('segmen')->pluck('segmen'),
            'kategoriList' => SosData::query()->select('kategori')->whereNotNull('kategori')->distinct()->orderBy('kategori')->pluck('kategori'),
        ];

        // 3. Buat closure untuk menerapkan filter
        $applyFilters = function ($query) use ($validated) {
            if (!empty($validated['startDate'])) {
                $query->where('order_created_date', '>=', $validated['startDate'].' 00:00:00');
            }
            if (!empty($validated['endDate'])) {
                $query->where('order_created_date', '<=', $validated['endDate'].' 23:59:59');
            }
            if (!empty($validated['witels'])) {
                $query->whereIn(DB::raw('TRIM(UPPER(bill_witel))'), $validated['witels']);
            }
            if (!empty($validated['segmens'])) {
                $query->whereIn(DB::raw('TRIM(UPPER(segmen))'), $validated['segmens']);
            }
            if (!empty($validated['kategoris'])) {
                $query->whereIn('kategori', $validated['kategoris']);
            }
        };

        // 4. Query untuk data chart
        $baseQuery = SosData::query()->tap($applyFilters);

        $ordersByCategory = (clone $baseQuery)->select(
            'kategori',
            DB::raw("SUM(CASE WHEN kategori_umur = '< 3 BLN' THEN 1 ELSE 0 END) as lt_3bln_total"),
            DB::raw("SUM(CASE WHEN kategori_umur = '> 3 BLN' THEN 1 ELSE 0 END) as gt_3bln_total")
        )->whereNotNull('kategori')->groupBy('kategori')->get();

        $revenueByCategory = (clone $baseQuery)->select(
            'kategori',
            DB::raw("SUM(CASE WHEN kategori_umur = '< 3 BLN' THEN revenue ELSE 0 END) / 1000000 as lt_3bln_revenue"),
            DB::raw("SUM(CASE WHEN kategori_umur = '> 3 BLN' THEN revenue ELSE 0 END) / 1000000 as gt_3bln_revenue")
        )->whereNotNull('kategori')->groupBy('kategori')->get();

        $witelDistribution = (clone $baseQuery)->select(
            DB::raw('TRIM(UPPER(bill_witel)) as witel'),
            DB::raw('COUNT(*) as value')
        )->whereNotNull('bill_witel')->groupBy('witel')->orderBy('value', 'desc')->get();

        $segmenDistribution = (clone $baseQuery)->select(
            DB::raw('TRIM(UPPER(segmen)) as witel'), // Anda menggunakan 'witel' sebagai alias di sini, saya biarkan
            DB::raw('COUNT(*) as value')
        )->whereNotNull('segmen')->groupBy('witel')->orderBy('value', 'desc')->get();

        // 5. Query untuk Data Preview
        $dataPreview = SosData::query()
            ->select(
                'id', 'order_id', 'nipnas', 'standard_name', 'li_product_name',
                'segmen', 'bill_witel',
                'kategori', 'li_status', 'kategori_umur', 'order_created_date'
            )
            ->tap($applyFilters)
            ->orderBy('order_created_date', 'desc')
            ->paginate($limit)
            ->withQueryString();

        // 6. Kembalikan semua data sebagai array
        return [
            'ordersByCategory' => $ordersByCategory,
            'revenueByCategory' => $revenueByCategory,
            'witelDistribution' => $witelDistribution,
            'segmenDistribution' => $segmenDistribution,
            'dataPreview' => $dataPreview,
            'filters' => $validated + ['limit' => $limit],
            'filterOptions' => $filterOptions,
        ];
    }

    public function index(Request $request)
    {
        // === [BARU] Cek Pengaturan Embed ===
        $settings = Cache::get('granular_embed_settings', []);

        if (isset($settings['datin']) && $settings['datin']['enabled'] && !empty($settings['datin']['url'])) {
            return Inertia::render('Dashboard/ExternalEmbed', [
                'embedUrl' => $settings['datin']['url'],
                'headerTitle' => 'Dashboard SOS Datin' // Judul untuk layout
            ]);
        }

        $data = $this->getDashboardData($request);
        return Inertia::render('DashboardSOS', array_merge($data, [
            'isEmbed' => false,
        ]));
    }

    // ===== METHOD BARU UNTUK EMBED =====
    public function embed(Request $request)
    {
        // Panggil data menggunakan fungsi private
        $data = $this->getDashboardData($request);

        return Inertia::render('DashboardSOS', array_merge($data, [
            'isEmbed' => true, // <-- Tambahkan ini
        ]))->rootView('embed'); // <-- Tambahkan ini
    }
}
