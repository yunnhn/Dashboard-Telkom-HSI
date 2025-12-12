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
    private function getDashboardData(Request $request)
    {
        // 1. Validasi filter
        $validated = $request->validate([
            'startDate' => 'nullable|date_format:Y-m-d',
            'endDate'   => 'nullable|date_format:Y-m-d|after_or_equal:startDate',
            'witels'    => 'nullable|array', 'witels.*'    => 'string',
            'segmens'   => 'nullable|array', 'segmens.*'   => 'string',
            'kategoris' => 'nullable|array', 'kategoris.*' => 'string',
            'limit'     => 'nullable|in:10,50,100',
            'search'    => 'nullable|string|max:255',
        ]);

        $limit  = $validated['limit'] ?? '10';
        $search = $validated['search'] ?? null;

        // --- Logic Tanggal Default ---
        $minDate = SosData::min('order_created_date');
        $maxDate = SosData::max('order_created_date');
        $defaultStartDate = $minDate ? Carbon::parse($minDate)->format('Y-m-d') : now()->format('Y-m-d');
        $defaultEndDate   = $maxDate ? Carbon::parse($maxDate)->format('Y-m-d') : now()->format('Y-m-d');
        $startDateToUse = $validated['startDate'] ?? $defaultStartDate;
        $endDateToUse   = $validated['endDate'] ?? $defaultEndDate;

        // 2. Base Query Awal (Exclude RSO1)
        // Filter ini akan berlaku untuk Dropdown List DAN Data Chart
        $rootQuery = SosData::query()
            ->where('witel_baru', '!=', 'RSO1'); 

        // 3. Siapkan opsi filter
        $filterOptions = [
            // [UPDATED] Menggunakan 'witel_baru' dan exclude RSO1 (turunan dari $rootQuery)
            'witelList'    => (clone $rootQuery)
                                ->select(DB::raw('TRIM(UPPER(witel_baru)) as witel'))
                                ->whereNotNull('witel_baru')
                                ->distinct()
                                ->orderBy('witel')
                                ->pluck('witel'),
            
            'segmenList'   => (clone $rootQuery)->select(DB::raw('TRIM(UPPER(segmen)) as segmen'))->whereNotNull('segmen')->distinct()->orderBy('segmen')->pluck('segmen'),
            'kategoriList' => (clone $rootQuery)->select('kategori')->whereNotNull('kategori')->distinct()->orderBy('kategori')->pluck('kategori'),
            'umurList'     => (clone $rootQuery)->select('kategori_umur')->whereNotNull('kategori_umur')->distinct()->orderBy('kategori_umur')->pluck('kategori_umur'),
            'defaultStartDate' => $defaultStartDate,
            'defaultEndDate'   => $defaultEndDate,
        ];

        // 4. Closure Filter User
        $applyFilters = function ($query) use ($validated, $startDateToUse, $endDateToUse) {
            $query->whereBetween('order_created_date', [$startDateToUse . ' 00:00:00', $endDateToUse . ' 23:59:59']);

            if (!empty($validated['witels'])) {
                // [UPDATED] Filter query data menggunakan 'witel_baru'
                $query->whereIn(DB::raw('TRIM(UPPER(witel_baru))'), $validated['witels']);
            }
            if (!empty($validated['segmens'])) {
                $query->whereIn(DB::raw('TRIM(UPPER(segmen))'), $validated['segmens']);
            }
            if (!empty($validated['kategoris'])) {
                $query->whereIn('kategori', $validated['kategoris']);
            }
        };

        // 5. Query Chart
        $baseQuery = SosData::query()
            ->where('witel_baru', '!=', 'RSO1') // Pastikan RSO1 terfilter di data chart
            ->tap($applyFilters);

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

        // [UPDATED] Distribusi Witel juga sebaiknya menggunakan witel_baru agar konsisten dengan filter
        $witelDistribution = (clone $baseQuery)->select(
            DB::raw('TRIM(UPPER(witel_baru)) as witel'), 
            DB::raw('COUNT(*) as value')
        )->whereNotNull('witel_baru')->groupBy('witel')->orderBy('value', 'desc')->get();

        $segmenDistribution = (clone $baseQuery)->select(
            DB::raw('TRIM(UPPER(segmen)) as witel'),
            DB::raw('COUNT(*) as value')
        )->whereNotNull('segmen')->groupBy('witel')->orderBy('value', 'desc')->get();

        // 6. Query Data Preview
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

        // 7. Return Data
        return [
            'ordersByCategory'   => $ordersByCategory,
            'revenueByCategory'  => $revenueByCategory,
            'witelDistribution'  => $witelDistribution,
            'segmenDistribution' => $segmenDistribution,
            'dataPreview'        => $dataPreview,
            'filters' => array_merge($validated, [
                'limit'     => $limit,
                'startDate' => $startDateToUse,
                'endDate'   => $endDateToUse,
                'search'    => $search
            ]),
            'filterOptions' => $filterOptions,
        ];
    }

    public function index(Request $request)
    {
        $settings = Cache::get('granular_embed_settings', []);
        if (isset($settings['datin']) && $settings['datin']['enabled'] && !empty($settings['datin']['url'])) {
            return Inertia::render('Dashboard/ExternalEmbed', [
                'embedUrl' => $settings['datin']['url'],
                'headerTitle' => 'Dashboard SOS Datin'
            ]);
        }
        $data = $this->getDashboardData($request);
        return Inertia::render('DashboardSOS', array_merge($data, ['isEmbed' => false]));
    }

    public function embed(Request $request)
    {
        $data = $this->getDashboardData($request);
        return Inertia::render('DashboardSOS', array_merge($data, ['isEmbed' => true]))->rootView('embed');
    }
}