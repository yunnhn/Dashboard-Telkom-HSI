<?php

namespace App\Http\Controllers;

use App\Models\SosData;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;
use Inertia\Inertia;
use Carbon\Carbon;

class DashboardSOSController extends Controller
{
    /**
     * Core logic untuk mengambil data dashboard
     */
    private function getDashboardData(Request $request)
    {
        // 1. Validasi Input
        $validated = $request->validate([
            'startDate' => 'nullable|date_format:Y-m-d',
            'endDate'   => 'nullable|date_format:Y-m-d|after_or_equal:startDate',
            'witels'    => 'nullable|array',
            'segmens'   => 'nullable|array',
            'kategoris' => 'nullable|array',
            'limit'     => 'nullable|in:10,50,100',
            'search'    => 'nullable|string|max:255',
        ]);

        $limit  = $validated['limit'] ?? '10';
        $search = $validated['search'] ?? null;

        // 2. Logic Penentuan Tanggal Default (Anti Tahun 0457)
        // Kita hanya mencari Min/Max date dari tahun 2000 ke atas untuk menghindari data error/sampah
        $dateRange = SosData::where('order_created_date', '>=', '2000-01-01')
            ->selectRaw('MIN(order_created_date) as min_date, MAX(order_created_date) as max_date')
            ->first();

        $defaultStartDate = $dateRange && $dateRange->min_date
            ? Carbon::parse($dateRange->min_date)->format('Y-m-d')
            : now()->startOfYear()->format('Y-m-d');

        $defaultEndDate = $dateRange && $dateRange->max_date
            ? Carbon::parse($dateRange->max_date)->format('Y-m-d')
            : now()->format('Y-m-d');

        // 3. Sanitasi Input User
        // Jika user/URL mengirim tanggal aneh (< 2000), paksa kembali ke default
        $reqStart = $request->input('startDate');
        $reqEnd   = $request->input('endDate');

        if ($reqStart && $reqStart < '2000-01-01') {
            $startDateToUse = $defaultStartDate;
        } else {
            $startDateToUse = $reqStart ?? $defaultStartDate;
        }

        if ($reqEnd && $reqEnd < '2000-01-01') {
            $endDateToUse = $defaultEndDate;
        } else {
            $endDateToUse = $reqEnd ?? $defaultEndDate;
        }

        // 4. Base Query untuk Filter Option (Dropdown)
        // Exclude RSO1 sejak awal
        $rootQuery = SosData::query()->where('witel_baru', '!=', 'RSO1');

        $filterOptions = [
            'witelList' => (clone $rootQuery)
                ->select(DB::raw('TRIM(UPPER(witel_baru)) as witel'))
                ->whereNotNull('witel_baru')
                ->distinct()
                ->orderBy('witel')
                ->pluck('witel'),

            'segmenList' => (clone $rootQuery)
                ->select(DB::raw('TRIM(UPPER(segmen)) as segmen'))
                ->whereNotNull('segmen')
                ->distinct()
                ->orderBy('segmen')
                ->pluck('segmen'),

            'kategoriList' => (clone $rootQuery)
                ->select('kategori')
                ->whereNotNull('kategori')
                ->distinct()
                ->orderBy('kategori')
                ->pluck('kategori'),

            // Kirim default dates ke frontend untuk acuan reset
            'defaultStartDate' => $defaultStartDate,
            'defaultEndDate'   => $defaultEndDate,
        ];

        // 5. Closure Filter Utama
        $applyFilters = function ($query) use ($validated, $startDateToUse, $endDateToUse) {
            // Filter Tanggal
            $query->whereBetween('order_created_date', [$startDateToUse . ' 00:00:00', $endDateToUse . ' 23:59:59']);

            // Filter Witel
            if (!empty($validated['witels'])) {
                $query->whereIn(DB::raw('TRIM(UPPER(witel_baru))'), $validated['witels']);
            }
            // Filter Segmen
            if (!empty($validated['segmens'])) {
                $query->whereIn(DB::raw('TRIM(UPPER(segmen))'), $validated['segmens']);
            }
            // Filter Kategori
            if (!empty($validated['kategoris'])) {
                $query->whereIn('kategori', $validated['kategoris']);
            }
        };

        // 6. Query untuk Chart & Statistik
        $baseQuery = SosData::query()
            ->where('witel_baru', '!=', 'RSO1') // Konsisten exclude RSO1
            ->tap($applyFilters);

        // Chart: Order by Kategori & Umur
        $ordersByCategory = (clone $baseQuery)->select(
            'kategori',
            DB::raw("SUM(CASE WHEN kategori_umur = '< 3 BLN' THEN 1 ELSE 0 END) as lt_3bln_total"),
            DB::raw("SUM(CASE WHEN kategori_umur = '> 3 BLN' THEN 1 ELSE 0 END) as gt_3bln_total")
        )->whereNotNull('kategori')->groupBy('kategori')->get();

        // Chart: Revenue by Kategori & Umur
        $revenueByCategory = (clone $baseQuery)->select(
            'kategori',
            DB::raw("SUM(CASE WHEN kategori_umur = '< 3 BLN' THEN revenue ELSE 0 END) / 1000000 as lt_3bln_revenue"),
            DB::raw("SUM(CASE WHEN kategori_umur = '> 3 BLN' THEN revenue ELSE 0 END) / 1000000 as gt_3bln_revenue")
        )->whereNotNull('kategori')->groupBy('kategori')->get();

        // Chart: Distribusi Witel
        $witelDistribution = (clone $baseQuery)->select(
            DB::raw('TRIM(UPPER(witel_baru)) as witel'),
            DB::raw('COUNT(*) as value')
        )->whereNotNull('witel_baru')->groupBy('witel')->orderBy('value', 'desc')->get();

        // Chart: Distribusi Segmen
        $segmenDistribution = (clone $baseQuery)->select(
            DB::raw('TRIM(UPPER(segmen)) as witel'), // Frontend mungkin baca prop 'witel' sbg label
            DB::raw('COUNT(*) as value')
        )->whereNotNull('segmen')->groupBy('witel')->orderBy('value', 'desc')->get();

        // 7. Query Data Preview (Tabel)
        $dataPreview = SosData::query()
            ->select(
                'id', 'nipnas', 'standard_name', 'order_id', 'order_subtype', 'order_description',
                'segmen', 'sub_segmen', 'cust_city', 'cust_witel', 'serv_city', 'service_witel',
                'bill_witel', 'li_product_name', 'li_billdate', 'li_milestone', 'kategori',
                'li_status', 'li_status_date', 'is_termin', 'biaya_pasang', 'hrg_bulanan',
                'revenue', 'order_created_date', 'agree_type', 'agree_start_date', 'agree_end_date',
                'lama_kontrak_hari', 'amortisasi', 'action_cd', 'kategori_umur', 'umur_order',
                'bill_city', 'po_name', 'tipe_order', 'segmen_baru', 'scalling1', 'scalling2',
                'tipe_grup', 'witel_baru', 'kategori_baru'
            )
            ->where('witel_baru', '!=', 'RSO1')
            ->tap($applyFilters)
            ->when($search, function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('standard_name', 'like', "%{$search}%")
                      ->orWhere('order_id', 'like', "%{$search}%")
                      ->orWhere('li_product_name', 'like', "%{$search}%");
                });
            })
            ->orderBy('order_created_date', 'desc')
            ->paginate($limit)
            ->withQueryString();

        // 8. Return Response Data
        return [
            'ordersByCategory'   => $ordersByCategory,
            'revenueByCategory'  => $revenueByCategory,
            'witelDistribution'  => $witelDistribution,
            'segmenDistribution' => $segmenDistribution,
            'dataPreview'        => $dataPreview,
            'filters' => [
                'startDate' => $startDateToUse,
                'endDate'   => $endDateToUse,
                'witels'    => $validated['witels'] ?? null,
                'segmens'   => $validated['segmens'] ?? null,
                'kategoris' => $validated['kategoris'] ?? null,
                'limit'     => $limit,
                'search'    => $search,
            ],
            'filterOptions' => $filterOptions,
        ];
    }

    public function index(Request $request)
    {
        // Cek Setting Embed External
        $settings = Cache::get('granular_embed_settings', []);
        if (isset($settings['datin']) && $settings['datin']['enabled'] && !empty($settings['datin']['url'])) {
            return Inertia::render('Dashboard/ExternalEmbed', [
                'embedUrl' => $settings['datin']['url'],
                'headerTitle' => 'Dashboard SOS Datin'
            ]);
        }

        // Ambil Data Dashboard
        $data = $this->getDashboardData($request);

        return Inertia::render('DashboardSOS', array_merge($data, ['isEmbed' => false]));
    }

    public function embed(Request $request)
    {
        $data = $this->getDashboardData($request);
        return Inertia::render('DashboardSOS', array_merge($data, ['isEmbed' => true]))->rootView('embed');
    }
}
