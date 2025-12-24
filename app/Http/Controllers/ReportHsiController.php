<?php

namespace App\Http\Controllers;

use App\Models\HsiData;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;
use App\Models\Target;

class ReportHsiController extends Controller
{
    public function index()
    {
        // 1. Ambil data granular (Group by Witel & Witel Old)
        // Kita butuh detail witel_old untuk sub-row
        $rawData = HsiData::select('witel', 'witel_old')
            ->selectRaw("
                -- STATUS DASAR
                SUM(CASE WHEN kelompok_status = 'PRE PI' THEN 1 ELSE 0 END) as pre_pi,
                COUNT(*) as registered,
                SUM(CASE WHEN kelompok_status = 'INPROGRESS_SC' THEN 1 ELSE 0 END) as inprogress_sc,
                SUM(CASE WHEN kelompok_status = 'QC1' THEN 1 ELSE 0 END) as qc1,
                SUM(CASE WHEN kelompok_status = 'FCC' THEN 1 ELSE 0 END) as fcc,
                SUM(CASE WHEN kelompok_status = 'REJECT_FCC' THEN 1 ELSE 0 END) as cancel_by_fcc,
                SUM(CASE WHEN kelompok_status = 'SURVEY_NEW_MANJA' THEN 1 ELSE 0 END) as survey_new_manja,
                SUM(CASE WHEN kelompok_status = 'UNSC' THEN 1 ELSE 0 END) as unsc,
                
                -- PI AGING
                SUM(CASE WHEN kelompok_status = 'PI' AND TIMESTAMPDIFF(HOUR, last_updated_date, NOW()) < 24 THEN 1 ELSE 0 END) as pi_under_1_hari,
                SUM(CASE WHEN kelompok_status = 'PI' AND TIMESTAMPDIFF(HOUR, last_updated_date, NOW()) >= 24 AND TIMESTAMPDIFF(HOUR, last_updated_date, NOW()) <= 72 THEN 1 ELSE 0 END) as pi_1_3_hari,
                SUM(CASE WHEN kelompok_status = 'PI' AND TIMESTAMPDIFF(HOUR, last_updated_date, NOW()) > 72 THEN 1 ELSE 0 END) as pi_over_3_hari,
                SUM(CASE WHEN kelompok_status = 'PI' THEN 1 ELSE 0 END) as total_pi,

                -- FALLOUT WFM
                SUM(CASE WHEN kelompok_status = 'FO_WFM' AND kelompok_kendala = 'Kendala Pelanggan' THEN 1 ELSE 0 END) as fo_wfm_kndl_plgn,
                SUM(CASE WHEN kelompok_status = 'FO_WFM' AND kelompok_kendala = 'Kendala Teknik' THEN 1 ELSE 0 END) as fo_wfm_kndl_teknis,
                SUM(CASE WHEN kelompok_status = 'FO_WFM' AND kelompok_kendala = 'Kendala Lainnya' THEN 1 ELSE 0 END) as fo_wfm_kndl_sys,
                SUM(CASE WHEN kelompok_status = 'FO_WFM' AND kelompok_kendala IS NULL OR kelompok_kendala = '' OR kelompok_kendala = 'BLANK' THEN 1 ELSE 0 END) as fo_wfm_others,

                -- OTHER FALLOUTS
                SUM(CASE WHEN kelompok_status = 'FO_UIM' THEN 1 ELSE 0 END) as fo_uim,
                SUM(CASE WHEN kelompok_status = 'FO_ASAP' THEN 1 ELSE 0 END) as fo_asp,
                SUM(CASE WHEN kelompok_status = 'FO_OSM' THEN 1 ELSE 0 END) as fo_osm,
                
                -- TOTAL FALLOUT (Termasuk FO_WFM sesuai request sebelumnya)
                SUM(CASE WHEN kelompok_status IN ('FO_UIM', 'FO_ASAP', 'FO_OSM', 'FO_WFM') THEN 1 ELSE 0 END) as total_fallout,

                -- COMPLETION & OTHERS
                SUM(CASE WHEN kelompok_status = 'ACT_COM' THEN 1 ELSE 0 END) as act_comp,
                SUM(CASE WHEN kelompok_status = 'PS' THEN 1 ELSE 0 END) as jml_comp_ps,
                
                -- CANCEL DETAILS
                SUM(CASE WHEN kelompok_status = 'CANCEL' AND kelompok_kendala = 'Kendala Pelanggan' THEN 1 ELSE 0 END) as cancel_kndl_plgn,
                SUM(CASE WHEN kelompok_status = 'CANCEL' AND kelompok_kendala = 'Kendala Teknik' THEN 1 ELSE 0 END) as cancel_kndl_teknis,
                SUM(CASE WHEN kelompok_status = 'CANCEL' AND kelompok_kendala = 'Kendala Lainnya' THEN 1 ELSE 0 END) as cancel_kndl_sys,
                SUM(CASE WHEN kelompok_status = 'CANCEL' AND (kelompok_kendala IS NULL OR kelompok_kendala = '' OR kelompok_kendala = 'BLANK') THEN 1 ELSE 0 END) as cancel_others,
                SUM(CASE WHEN kelompok_status = 'CANCEL' THEN 1 ELSE 0 END) as total_cancel,
                
                SUM(CASE WHEN kelompok_status = 'REVOKE' THEN 1 ELSE 0 END) as `revoke`
            ")
            ->groupBy('witel', 'witel_old')
            ->orderBy('witel')
            ->orderBy('witel_old')
            ->get();

        // 2. Hitung Grand Total dari data raw (Sebelum dimanipulasi strukturnya)
        $totals = $this->calculateSummary($rawData, 'GRAND TOTAL');

        // 3. Struktur Ulang Data untuk Frontend (Parent Witel -> Sub Witel)
        $finalReportData = collect();
        $groupedData = $rawData->groupBy('witel');

        // Daftar kolom yang perlu dijumlahkan
        $numericFields = [
            'pre_pi', 'registered', 'inprogress_sc', 'qc1', 'fcc', 'cancel_by_fcc', 'survey_new_manja', 'unsc',
            'pi_under_1_hari', 'pi_1_3_hari', 'pi_over_3_hari', 'total_pi',
            'fo_wfm_kndl_plgn', 'fo_wfm_kndl_teknis', 'fo_wfm_kndl_sys', 'fo_wfm_others',
            'fo_uim', 'fo_asp', 'fo_osm', 'total_fallout',
            'act_comp', 'jml_comp_ps',
            'cancel_kndl_plgn', 'cancel_kndl_teknis', 'cancel_kndl_sys', 'cancel_others', 'total_cancel',
            'revoke'
        ];

        foreach ($groupedData as $witel => $children) {
            // A. Buat Baris Induk (Summary Witel)
            $parent = new \stdClass();
            $parent->witel_display = $witel; // Nama Witel Utama
            $parent->row_type = 'main';      // Penanda untuk styling bold
            
            // Sum semua field numeric
            foreach ($numericFields as $field) {
                $parent->$field = $children->sum($field);
            }
            
            // Hitung Persentase Parent
            $this->calculatePercentages($parent);
            
            // Masukkan Parent ke list
            $finalReportData->push($parent);

            // B. Masukkan Baris Anak (Sub Witel)
            foreach ($children as $child) {
                $child->witel_display = $child->witel_old ?? '(Blank)'; // Nama Sub Witel
                $child->row_type = 'sub'; // Penanda untuk styling normal/indent
                
                $this->calculatePercentages($child);
                $finalReportData->push($child);
            }
        }

        return Inertia::render('ReportHsi', [
            'reportData' => $finalReportData,
            'totals' => $totals
        ]);
    }

    // Helper untuk menghitung total summary object
    private function calculateSummary($collection, $label)
    {
        $totals = [
            'witel' => $label,
            'registered' => $collection->sum('registered'),
            'pre_pi' => $collection->sum('pre_pi'),
            'inprogress_sc' => $collection->sum('inprogress_sc'),
            'qc1' => $collection->sum('qc1'),
            'fcc' => $collection->sum('fcc'),
            'cancel_by_fcc' => $collection->sum('cancel_by_fcc'),
            'survey_new_manja' => $collection->sum('survey_new_manja'),
            'unsc' => $collection->sum('unsc'),
            'pi_under_1_hari' => $collection->sum('pi_under_1_hari'),
            'pi_1_3_hari' => $collection->sum('pi_1_3_hari'),
            'pi_over_3_hari' => $collection->sum('pi_over_3_hari'),
            'total_pi' => $collection->sum('total_pi'),
            'fo_wfm_kndl_plgn' => $collection->sum('fo_wfm_kndl_plgn'),
            'fo_wfm_kndl_teknis' => $collection->sum('fo_wfm_kndl_teknis'),
            'fo_wfm_kndl_sys' => $collection->sum('fo_wfm_kndl_sys'),
            'fo_wfm_others' => $collection->sum('fo_wfm_others'),
            'fo_uim' => $collection->sum('fo_uim'),
            'fo_asp' => $collection->sum('fo_asp'),
            'fo_osm' => $collection->sum('fo_osm'),
            'total_fallout' => $collection->sum('total_fallout'),
            'act_comp' => $collection->sum('act_comp'),
            'jml_comp_ps' => $collection->sum('jml_comp_ps'),
            'cancel_kndl_plgn' => $collection->sum('cancel_kndl_plgn'),
            'cancel_kndl_teknis' => $collection->sum('cancel_kndl_teknis'),
            'cancel_kndl_sys' => $collection->sum('cancel_kndl_sys'),
            'cancel_others' => $collection->sum('cancel_others'),
            'total_cancel' => $collection->sum('total_cancel'),
            'revoke' => $collection->sum('revoke'),
        ];

        // Konversi ke object agar seragam akses property-nya
        $totalsObj = (object) $totals;
        $this->calculatePercentages($totalsObj);
        
        return $totalsObj;
    }

    // Helper hitung persentase
    private function calculatePercentages($item)
    {
        // PI/RE (%)
        $num_pire = $item->total_pi + $item->total_fallout + $item->act_comp + $item->jml_comp_ps + $item->total_cancel;
        $item->pi_re_percent = $item->registered > 0 ? round(($num_pire / $item->registered) * 100, 2) : 0;

        // PS/RE (%)
        $denom_psre = $item->registered - $item->cancel_by_fcc - $item->unsc - $item->revoke;
        $item->ps_re_percent = $denom_psre > 0 ? round(($item->jml_comp_ps / $denom_psre) * 100, 2) : 0;

        // PS/PI (%)
        $denom_pspi = $item->total_pi + $item->total_fallout + $item->act_comp + $item->jml_comp_ps;
        $item->ps_pi_percent = $denom_pspi > 0 ? round(($item->jml_comp_ps / $denom_pspi) * 100, 2) : 0;
    }
}