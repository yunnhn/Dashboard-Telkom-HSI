<?php

namespace App\Http\Controllers;

use App\Models\AccountOfficer;
use App\Models\DocumentData;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class GalaksiController extends Controller
{
    public function index()
    {
        // Ambil semua data Account Officer sebagai dasar tabel
        $officers = AccountOfficer::orderBy('name')->get();

        // Lakukan iterasi untuk setiap officer untuk menghitung KPI mereka
        $kpiData = $officers->map(function ($officer) {
            // Tentukan filter berdasarkan data officer
            $witelFilter = $officer->filter_witel_lama;
            $specialFilter = $officer->special_filter_column && $officer->special_filter_value
                ? ['column' => $officer->special_filter_column, 'value' => $officer->special_filter_value]
                : null;

            // Query dasar untuk order tunggal dan order bundle
            $singleQuery = DocumentData::where('witel_lama', $witelFilter)
                ->whereNotNull('product')
                ->where('product', 'NOT LIKE', '%-%')
                ->where('product', 'NOT LIKE', "%\n%")
                ->when($specialFilter, fn($q) => $q->where($specialFilter['column'], $specialFilter['value']));

            $bundleQuery = DB::table('order_products')
                ->join('document_data', 'order_products.order_id', '=', 'document_data.order_id')
                ->where('document_data.witel_lama', $witelFilter)
                ->when($specialFilter, fn($q) => $q->where('document_data.' . $specialFilter['column'], $specialFilter['value']));

            // Hitung KPI (Done & OGP untuk NCX & SCONE)
            $done_ncx = $singleQuery->clone()->where('status_wfm', 'done close bima')->where('channel', '!=', 'SC-One')->count()
                + $bundleQuery->clone()->where('order_products.status_wfm', 'done close bima')->where('order_products.channel', '!=', 'SC-One')->count();

            $done_scone = $singleQuery->clone()->where('status_wfm', 'done close bima')->where('channel', 'SC-One')->count()
                + $bundleQuery->clone()->where('order_products.status_wfm', 'done close bima')->where('order_products.channel', 'SC-One')->count();

            $ogp_ncx = $singleQuery->clone()->where('status_wfm', 'in progress')->where('channel', '!=', 'SC-One')->count()
                + $bundleQuery->clone()->where('order_products.status_wfm', 'in progress')->where('order_products.channel', '!=', 'SC-One')->count();

            $ogp_scone = $singleQuery->clone()->where('status_wfm', 'in progress')->where('channel', 'SC-One')->count()
                + $bundleQuery->clone()->where('order_products.status_wfm', 'in progress')->where('order_products.channel', 'SC-One')->count();

            $total_ytd = $done_ncx + $done_scone + $ogp_ncx + $ogp_scone;

            // Perhitungan Q3 (bisa dibuat dinamis jika perlu)
            $q3Months = [7, 8, 9];
            $q3Year = 2025; // Tahun ini bisa disesuaikan

            $singleQueryQ3 = $singleQuery->clone()->whereYear('order_created_date', $q3Year)->whereIn(DB::raw('MONTH(order_created_date)'), $q3Months);
            $bundleQueryQ3 = $bundleQuery->clone()->whereYear('document_data.order_created_date', $q3Year)->whereIn(DB::raw('MONTH(document_data.order_created_date)'), $q3Months);

            $done_scone_q3 = $singleQueryQ3->clone()->where('status_wfm', 'done close bima')->where('channel', 'SC-One')->count()
                + $bundleQueryQ3->clone()->where('order_products.status_wfm', 'done close bima')->where('order_products.channel', 'SC-One')->count();

            $done_ncx_q3 = $singleQueryQ3->clone()->where('status_wfm', 'done close bima')->where('channel', '!=', 'SC-One')->count()
                + $bundleQueryQ3->clone()->where('order_products.status_wfm', 'done close bima')->where('order_products.channel', '!=', 'SC-One')->count();

            $ogp_ncx_q3 = $singleQueryQ3->clone()->where('status_wfm', 'in progress')->where('channel', '!=', 'SC-One')->count()
                + $bundleQueryQ3->clone()->where('order_products.status_wfm', 'in progress')->where('order_products.channel', '!=', 'SC-One')->count();

            $ogp_scone_q3 = $singleQueryQ3->clone()->where('status_wfm', 'in progress')->where('channel', 'SC-One')->count()
                + $bundleQueryQ3->clone()->where('order_products.status_wfm', 'in progress')->where('order_products.channel', 'SC-One')->count();

            $total_q3 = $done_ncx_q3 + $done_scone_q3 + $ogp_ncx_q3 + $ogp_scone_q3;

            return [
                'id' => $officer->id,
                'nama_po' => $officer->name,
                'witel' => $officer->display_witel,
                'done_ncx' => $done_ncx,
                'done_scone' => $done_scone,
                'ogp_ncx' => $ogp_ncx,
                'ogp_scone' => $ogp_scone,
                'total' => $total_ytd,
                'ach_ytd' => $total_ytd > 0 ? number_format((($done_ncx + $done_scone) / $total_ytd) * 100, 1) . '%' : '0.0%',
                'ach_q3' => $total_q3 > 0 ? number_format((($done_ncx_q3 + $done_scone_q3) / $total_q3) * 100, 1) . '%' : '0.0%',
            ];
        });

        return Inertia::render('Galaksi/Index', [
            'kpiData' => $kpiData,
            'accountOfficers' => $officers, // Kirim juga data mentah officers untuk modal edit
        ]);
    }
}
