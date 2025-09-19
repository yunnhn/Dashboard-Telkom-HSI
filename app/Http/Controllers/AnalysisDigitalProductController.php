<?php

namespace App\Http\Controllers;

use App\Jobs\ImportAndProcessDocument;
use App\Jobs\ProcessCompletedOrders;
use App\Models\CompletedOrder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Redirect;
use Inertia\Inertia;
use App\Models\DocumentData;
use App\Models\Target;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class AnalysisDigitalProductController extends Controller
{
    protected $accountOfficers = [
        ['name' => 'Alfonsus Jaconias', 'display_witel' => 'JATIM BARAT', 'filter_witel_lama' => 'madiun', 'special_filter' => null],
        ['name' => 'Dwieka Septian', 'display_witel' => 'SURAMADU', 'filter_witel_lama' => 'suramadu', 'special_filter' => ['column' => 'segment', 'value' => 'LEGS']],
        ['name' => 'Ferizka Paramita', 'display_witel' => 'SURAMADU', 'filter_witel_lama' => 'suramadu', 'special_filter' => ['column' => 'segment', 'value' => 'SME']],
        ['name' => 'Ibrahim Muhammad', 'display_witel' => 'JATIM TIMUR', 'filter_witel_lama' => 'sidoarjo', 'special_filter' => null],
        ['name' => 'Ilham Miftahul', 'display_witel' => 'JATIM TIMUR', 'filter_witel_lama' => 'jember', 'special_filter' => null],
        ['name' => 'I Wayan Krisna', 'display_witel' => 'JATIM TIMUR', 'filter_witel_lama' => 'pasuruan', 'special_filter' => null],
        ['name' => 'Luqman Kurniawan', 'display_witel' => 'JATIM BARAT', 'filter_witel_lama' => 'kediri', 'special_filter' => null],
        ['name' => 'Maria Fransiska', 'display_witel' => 'NUSRA', 'filter_witel_lama' => 'ntt', 'special_filter' => null],
        ['name' => 'Nurtria Iman Sari', 'display_witel' => 'JATIM BARAT', 'filter_witel_lama' => 'malang', 'special_filter' => null],
        ['name' => 'Andre Yana Wijaya', 'display_witel' => 'NUSRA', 'filter_witel_lama' => 'ntb', 'special_filter' => null],
        ['name' => 'Diastanto', 'display_witel' => 'BALI', 'filter_witel_lama' => 'bali', 'special_filter' => null],
    ];

    public function uploadComplete(Request $request)
    {
        $request->validate([
            'complete_document' => 'required|file|mimes:xlsx,xls,csv'
        ]);

        $path = $request->file('complete_document')->store('excel-imports-complete', 'local');

        ProcessCompletedOrders::dispatch($path);

        return Redirect::route('analysisDigitalProduct')->with('success', 'File Order Complete diterima. Status akan diperbarui di latar belakang.');
    }

    public function syncCompletedOrders()
    {
        $pendingCount = CompletedOrder::count();

        if ($pendingCount === 0) {
            return Redirect::route('analysisDigitalProduct')->with('error', 'Tidak ada data order complete yang perlu disinkronkan.');
        }

        $updatedCount = DB::table('document_data')
            ->join('completed_orders', 'document_data.order_id', '=', 'completed_orders.order_id')
            ->where('document_data.status_wfm', 'in progress')
            ->update([
                'document_data.status_wfm' => 'done close bima',
                'document_data.milestone' => 'Completed via Sync Process'
            ]);

        CompletedOrder::truncate();

        return Redirect::route('analysisDigitalProduct')->with('success', "Sinkronisasi selesai. Berhasil mengupdate {$updatedCount} dari {$pendingCount} order.");
    }

    public function index(Request $request)
    {
        $periodInput = $request->input('period', now()->format('Y-m'));
        $selectedSegment = $request->input('segment', 'SME');
        $reportPeriod = \Carbon\Carbon::parse($periodInput)->startOfMonth();

        $inProgressYear = $request->input('in_progress_year', now()->year);

        $newData = DocumentData::orderBy('created_at', 'desc')->take(10)->get();

        $masterWitelList = ['BALI', 'JATIM BARAT', 'JATIM TIMUR', 'NUSA TENGGARA', 'SURAMADU'];

        $documentData = DocumentData::whereIn('nama_witel', $masterWitelList)
                            ->where('segment', $selectedSegment)
                            ->whereYear('order_created_date', $reportPeriod->year)
                            ->whereMonth('order_created_date', $reportPeriod->month)
                            ->get();

        $realisasiDataFromDb = collect();
        foreach ($masterWitelList as $witel) { $realisasiDataFromDb->put($witel, [ 'nama_witel' => $witel, 'in_progress' => ['Netmonk'=>0,'OCA'=>0,'Antares Eazy'=>0,'Pijar Sekolah'=>0], 'prov_comp' => ['Netmonk'=>0,'OCA'=>0,'Antares Eazy'=>0,'Pijar Sekolah'=>0], 'revenue' => ['Netmonk'=>0,'OCA'=>0,'Antares Eazy'=>0,'Pijar Sekolah'=>0], ]); }
        foreach ($documentData as $doc) { $witel = $doc->nama_witel; if (!$realisasiDataFromDb->has($witel)) continue; if ($doc->product && !str_contains($doc->product, '-')) { $pName = trim($doc->product); if (in_array($pName, ['Netmonk', 'OCA', 'Antares Eazy', 'Pijar Sekolah'])) { $current = $realisasiDataFromDb->get($witel); if ($doc->status_wfm === 'in progress') { $current['in_progress'][$pName]++; } if ($doc->status_wfm === 'done close bima') { $current['prov_comp'][$pName]++; $current['revenue'][$pName] += $doc->net_price; } $realisasiDataFromDb->put($witel, $current); } } elseif ($doc->product && str_contains($doc->product, '-')) { $orderProducts = \App\Models\OrderProduct::where('order_id', $doc->order_id)->get(); foreach ($orderProducts as $op) { $pName = trim($op->product_name); if (in_array($pName, ['Netmonk', 'OCA', 'Antares Eazy', 'Pijar Sekolah'])) { $current = $realisasiDataFromDb->get($witel); if ($doc->status_wfm === 'in progress') { $current['in_progress'][$pName]++; } if ($doc->status_wfm === 'done close bima') { $current['prov_comp'][$pName]++; $current['revenue'][$pName] += $op->net_price; } $realisasiDataFromDb->put($witel, $current); } } } }

        $targets = Target::where('segment', $selectedSegment)
                    ->where('period', $reportPeriod
                    ->format('Y-m-d'))
                    ->get()
                    ->keyBy(fn ($item) => $item->nama_witel . '_' . $item->metric_type . '_' . $item->product_name);

        $reportData = collect($masterWitelList)->map(function ($witelName) use ($realisasiDataFromDb, $targets) { $realisasiItem = $realisasiDataFromDb->get($witelName); return (object) [ 'nama_witel' => $witelName, 'in_progress_n' => $realisasiItem['in_progress']['Netmonk'], 'in_progress_o' => $realisasiItem['in_progress']['OCA'], 'in_progress_ae' => $realisasiItem['in_progress']['Antares Eazy'], 'in_progress_ps' => $realisasiItem['in_progress']['Pijar Sekolah'], 'prov_comp_n_realisasi'=> $realisasiItem['prov_comp']['Netmonk'], 'prov_comp_o_realisasi'=> $realisasiItem['prov_comp']['OCA'], 'prov_comp_ae_realisasi'=> $realisasiItem['prov_comp']['Antares Eazy'], 'prov_comp_ps_realisasi'=> $realisasiItem['prov_comp']['Pijar Sekolah'], 'revenue_n_ach' => $realisasiItem['revenue']['Netmonk'] / 1000000, 'revenue_o_ach' => $realisasiItem['revenue']['OCA'] / 1000000, 'revenue_ae_ach' => $realisasiItem['revenue']['Antares Eazy'] / 1000000, 'revenue_ps_ach' => $realisasiItem['revenue']['Pijar Sekolah'] / 1000000, 'prov_comp_n_target' => $targets->get("{$witelName}_prov_comp_Netmonk")->target_value ?? 0, 'prov_comp_o_target' => $targets->get("{$witelName}_prov_comp_OCA")->target_value ?? 0, 'prov_comp_ae_target' => $targets->get("{$witelName}_prov_comp_Antares Eazy")->target_value ?? 0, 'prov_comp_ps_target' => $targets->get("{$witelName}_prov_comp_Pijar Sekolah")->target_value ?? 0, 'revenue_n_target' => $targets->get("{$witelName}_revenue_Netmonk")->target_value ?? 0, 'revenue_o_target' => $targets->get("{$witelName}_revenue_OCA")->target_value ?? 0, 'revenue_ae_target' => $targets->get("{$witelName}_revenue_Antares Eazy")->target_value ?? 0, 'revenue_ps_target' => $targets->get("{$witelName}_revenue_Pijar Sekolah")->target_value ?? 0, ]; });

        $inProgressData = DocumentData::where('status_wfm', 'in progress')
            ->where('segment', $selectedSegment)
            ->whereYear('order_created_date', $inProgressYear)
            ->select('order_id', 'milestone', 'segment', 'order_status_n', 'product as product_name', 'nama_witel', 'customer_name', 'order_created_date')
            ->orderBy('order_created_date', 'desc')->get();

        $historyData = DocumentData::whereIn('milestone', ['Completed Manually', 'Canceled Manually'])
                                ->orderBy('updated_at', 'desc')
                                ->take(10)
                                ->get();

        $kpiData = collect($this->accountOfficers)->map(function ($officer) {
            $witelFilter = $officer['filter_witel_lama'];
            $specialFilter = $officer['special_filter'];

            $singleQuery = DocumentData::where('witel_lama', $witelFilter)
                ->whereNotNull('product')
                ->where('product', 'NOT LIKE', '%-%')
                ->where('product', 'NOT LIKE', "%\n%");

            if ($specialFilter) {
                $singleQuery->where($specialFilter['column'], $specialFilter['value']);
            }

            $done_scone_single = $singleQuery->clone()->where('status_wfm', 'done close bima')->where('channel', 'SC-One')->count();
            $done_ncx_single   = $singleQuery->clone()->where('status_wfm', 'done close bima')->where('channel', '!=', 'SC-One')->count();
            $ogp_scone_single  = $singleQuery->clone()->where('status_wfm', 'in progress')->where('channel', 'SC-One')->count();
            $ogp_ncx_single    = $singleQuery->clone()->where('status_wfm', 'in progress')->where('channel', '!=', 'SC-One')->count();

            $bundleQuery = DB::table('order_products')
                ->join('document_data', 'order_products.order_id', '=', 'document_data.order_id')
                ->where('document_data.witel_lama', $witelFilter);

            if ($specialFilter) {
                $bundleQuery->where('document_data.' . $specialFilter['column'], $specialFilter['value']);
            }

            $done_scone_bundle = $bundleQuery->clone()->where('order_products.status_wfm', 'done close bima')->where('order_products.channel', 'SC-One')->count();
            $done_ncx_bundle   = $bundleQuery->clone()->where('order_products.status_wfm', 'done close bima')->where('order_products.channel', '!=', 'SC-One')->count();
            $ogp_scone_bundle  = $bundleQuery->clone()->where('order_products.status_wfm', 'in progress')->where('order_products.channel', 'SC-One')->count();
            $ogp_ncx_bundle    = $bundleQuery->clone()->where('order_products.status_wfm', 'in progress')->where('order_products.channel', '!=', 'SC-One')->count();

            $done_ncx   = $done_ncx_single + $done_ncx_bundle;
            $done_scone = $done_scone_single + $done_scone_bundle;
            $ogp_ncx    = $ogp_ncx_single + $ogp_ncx_bundle;
            $ogp_scone  = $ogp_scone_single + $ogp_scone_bundle;

            return [
                'nama_po'    => $officer['name'],
                'witel'      => $officer['display_witel'],
                'done_ncx'   => $done_ncx,
                'done_scone' => $done_scone,
                'ogp_ncx'    => $ogp_ncx,
                'ogp_scone'  => $ogp_scone,
                'total'      => $done_ncx + $done_scone + $ogp_ncx + $ogp_scone,
                'ach_ytd'    => 0,
                'ach_q3'     => 0,
            ];
        });

        return Inertia::render('AnalysisDigitalProduct', [
            'reportData' => $reportData ? $reportData->values()->all() : [],
            'currentSegment' => $selectedSegment,
            'period' => $periodInput,
            'inProgressData' => $inProgressData,
            'newData' => $newData,
            'historyData' => $historyData,
            'kpiData' => $kpiData,
            'currentInProgressYear' => $inProgressYear, ]);
    }

    public function updateTargets(Request $request)
    {
        $validated = $request->validate([
            'targets' => 'required|array', 'segment' => 'required|string|in:SME,LEGS',
            'period' => 'required|date_format:Y-m-d', 'targets.*.prov_comp.*' => 'nullable|numeric',
            'targets.*.revenue.*' => 'nullable|numeric',
        ]);
        foreach ($validated['targets'] as $witelName => $metrics) {
            foreach ($metrics as $metricType => $products) {
                foreach ($products as $productInitial => $targetValue) {
                    $productName = $this->mapProductInitialToName($productInitial);
                    if (!$productName) continue;
                    Target::updateOrCreate(
                        ['segment' => $validated['segment'], 'period' => $validated['period'], 'nama_witel' => $witelName, 'metric_type' => $metricType, 'product_name' => $productName],
                        ['target_value' => $targetValue ?? 0]
                    );
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

    public function upload(Request $request)
    {
        $request->validate(['document' => 'required|file|mimes:xlsx,xls,csv']);

        $path = $request->file('document')->store('excel-imports', 'local');

        ImportAndProcessDocument::dispatch($path);

        return Redirect::route('analysisDigitalProduct')->with('success', 'Dokumen berhasil diterima. Proses akan berjalan di latar belakang (± 2 menit).');
    }

    public function updateManualComplete(Request $request, $order_id)
    {
        $order = DocumentData::where('order_id', $order_id)->first();

        if ($order) {
            $order->status_wfm = 'done close bima';
            $order->order_status_n = 'COMPLETE';
            $order->milestone = 'Completed Manually'; // <-- Penanda penting!
            $order->save();

            return Redirect::back()->with('success', "Order ID: {$order_id} berhasil di-complete.");
        }
        return Redirect::back()->with('error', "Order ID: {$order_id} tidak ditemukan.");
    }

    // Pastikan metode updateManualCancel juga sudah ada dan benar
    public function updateManualCancel(Request $request, $order_id)
    {
        $order = DocumentData::where('order_id', $order_id)->first();
        if ($order) {
            $order->status_wfm = 'done close cancel';
            $order->order_status_n = 'CANCEL';
            $order->milestone = 'Canceled Manually'; // <-- Penanda penting!
            $order->save();
            return Redirect::back()->with('success', "Order ID: {$order_id} berhasil dibatalkan.");
        }
        return Redirect::back()->with('error', "Order ID: {$order_id} tidak ditemukan.");
    }
}
