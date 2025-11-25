<?php

namespace App\Traits;

use App\Models\ListPo;
use App\Models\SosData;
use Illuminate\Support\Facades\DB;

trait SosReportable
{
    /**
     * Helper method untuk mengagregasi data report utama dari tabel sos_data.
     * * [MODIFIKASI] Sekarang menerima parameter $tipeGrup (AOMO / SODORO)
     */
    private function getSosReportData($tipeGrup = null)
    {
        // 1. Definisikan Witel
        $masterWitelList = ['BALI', 'JATIM BARAT', 'JATIM TIMUR', 'NUSA TENGGARA', 'SURAMADU'];
        $sourceWitelList = $masterWitelList;

        // 2. Definisikan Segmen
        $masterSegmentList = ['1. SME', '2. GOV', '3. PRIVATE', '4. SOE'];

        // 3. Mulai Query Builder
        $query = SosData::query()
            ->select(
                'segmen_baru',
                'witel_baru as witel',

                // --- < 3 BLN ---
                DB::raw("SUM(CASE WHEN kategori_umur = '< 3 BLN' AND UPPER(kategori) IN ('PROVIDE ORDER', '1. PROVIDE ORDER') THEN 1 ELSE 0 END) as provide_order_lt_3bln"),
                DB::raw("SUM(CASE WHEN kategori_umur = '< 3 BLN' AND UPPER(kategori) IN ('PROVIDE ORDER', '1. PROVIDE ORDER') THEN scalling2 ELSE 0 END) as est_bc_provide_order_lt_3bln"),

                DB::raw("SUM(CASE WHEN kategori_umur = '< 3 BLN' AND UPPER(kategori) IN ('IN PROCESS', 'PROV. COMPLETE', '2. IN PROCESS') THEN 1 ELSE 0 END) as in_process_lt_3bln"),
                DB::raw("SUM(CASE WHEN kategori_umur = '< 3 BLN' AND UPPER(kategori) IN ('IN PROCESS', 'PROV. COMPLETE', '2. IN PROCESS') THEN scalling2 ELSE 0 END) as est_bc_in_process_lt_3bln"),

                DB::raw("SUM(CASE WHEN kategori_umur = '< 3 BLN' AND UPPER(kategori) IN ('READY TO BILL', '3. READY TO BILL') THEN 1 ELSE 0 END) as ready_to_bill_lt_3bln"),
                DB::raw("SUM(CASE WHEN kategori_umur = '< 3 BLN' AND UPPER(kategori) IN ('READY TO BILL', '3. READY TO BILL') THEN scalling2 ELSE 0 END) as est_bc_ready_to_bill_lt_3bln"),

                // --- > 3 BLN ---
                DB::raw("SUM(CASE WHEN kategori_umur = '> 3 BLN' AND UPPER(kategori) IN ('PROVIDE ORDER', '1. PROVIDE ORDER') THEN 1 ELSE 0 END) as provide_order_gt_3bln"),
                DB::raw("SUM(CASE WHEN kategori_umur = '> 3 BLN' AND UPPER(kategori) IN ('PROVIDE ORDER', '1. PROVIDE ORDER') THEN scalling2 ELSE 0 END) as est_bc_provide_order_gt_3bln"),

                DB::raw("SUM(CASE WHEN kategori_umur = '> 3 BLN' AND UPPER(kategori) IN ('IN PROCESS', 'PROV. COMPLETE', '2. IN PROCESS') THEN 1 ELSE 0 END) as in_process_gt_3bln"),
                DB::raw("SUM(CASE WHEN kategori_umur = '> 3 BLN' AND UPPER(kategori) IN ('IN PROCESS', 'PROV. COMPLETE', '2. IN PROCESS') THEN scalling2 ELSE 0 END) as est_bc_in_process_gt_3bln"),

                DB::raw("SUM(CASE WHEN kategori_umur = '> 3 BLN' AND UPPER(kategori) IN ('READY TO BILL', '3. READY TO BILL') THEN 1 ELSE 0 END) as ready_to_bill_gt_3bln"),
                DB::raw("SUM(CASE WHEN kategori_umur = '> 3 BLN' AND UPPER(kategori) IN ('READY TO BILL', '3. READY TO BILL') THEN scalling2 ELSE 0 END) as est_bc_ready_to_bill_gt_3bln")
            );

        // =================================================================
        // [PERBAIKAN UTAMA] Filter berdasarkan tipe_grup (AOMO / SODORO)
        // =================================================================
        if ($tipeGrup) {
            // Pastikan nama kolom di database Anda benar 'tipe_grup'
            $query->where('tipe_grup', $tipeGrup);
        }

        // Lanjutkan eksekusi query
        $dbData = $query
            ->whereIn('witel_baru', $sourceWitelList)
            ->whereIn('segmen_baru', $masterSegmentList)
            ->groupBy('segmen_baru', 'witel_baru')
            ->get()
            ->keyBy(fn ($item) => $item->segmen_baru . '_' . $item->witel)
            ->toArray();

        // 4. Bangun struktur data akhir (Logika ini tidak berubah)
        $processedData = [];
        $grandTotal = $this->getBlankTotalRow('GRAND TOTAL');

        foreach ($masterSegmentList as $segment) {
            $displayName = preg_replace('/^\d+\.\s*/', '', $segment);
            $segmentTotal = $this->getBlankTotalRow(strtoupper($displayName));
            $segmentWitelRows = [];

            foreach ($masterWitelList as $witel) {
                $key = $segment . '_' . $witel;
                $rowData = $dbData[$key] ?? array_merge(['segmen_baru' => $segment, 'witel' => $witel], $this->getBlankTotalRow(null));

                // Pastikan scalling di-handle sebagai float
                foreach ($rowData as $colKey => $value) {
                    if (is_string($value) && is_numeric($value)) {
                         $rowData[$colKey] = (float) $value;
                    }
                }

                $segmentWitelRows[] = $this->calculateRowTotals($rowData);

                foreach ($rowData as $colKey => $value) {
                    if (is_numeric($value)) {
                        $segmentTotal[$colKey] += (float) $value;
                        $grandTotal[$colKey] += (float) $value;
                    }
                }
            }

            $processedData[] = $this->calculateRowTotals($segmentTotal);
            $processedData = array_merge($processedData, $segmentWitelRows);
        }

        $processedData[] = $this->calculateRowTotals($grandTotal);

        return $processedData;
    }

    /** Helper untuk membuat array kosong untuk baris total */
    private function getBlankTotalRow($witelName)
    {
        $row = [
            'provide_order_lt_3bln' => 0, 'est_bc_provide_order_lt_3bln' => 0, 'in_process_lt_3bln' => 0, 'est_bc_in_process_lt_3bln' => 0,
            'ready_to_bill_lt_3bln' => 0, 'est_bc_ready_to_bill_lt_3bln' => 0,
            'provide_order_gt_3bln' => 0, 'est_bc_provide_order_gt_3bln' => 0, 'in_process_gt_3bln' => 0, 'est_bc_in_process_gt_3bln' => 0,
            'ready_to_bill_gt_3bln' => 0, 'est_bc_ready_to_bill_gt_3bln' => 0,
        ];
        if ($witelName) {
            $row['witel'] = $witelName;
            $row['isTotal'] = true;
        }
        return $row;
    }

    /** Helper untuk menghitung total per baris */
    private function calculateRowTotals($row)
    {
        $row['total_lt_3bln'] = ($row['provide_order_lt_3bln'] ?? 0) + ($row['in_process_lt_3bln'] ?? 0) + ($row['ready_to_bill_lt_3bln'] ?? 0);
        $row['total_gt_3bln'] = ($row['provide_order_gt_3bln'] ?? 0) + ($row['in_process_gt_3bln'] ?? 0) + ($row['ready_to_bill_gt_3bln'] ?? 0);
        $row['grand_total_order'] = ($row['total_lt_3bln'] ?? 0) + ($row['total_gt_3bln'] ?? 0);
        return $row;
    }

    /**
     * Helper method untuk mengagregasi data Galaksi.
     */
    private function getGalaksiReportData()
    {
        // 1. Ambil PETA NIPNAS -> NAMA PO
        $nipnasToPoMap = ListPo::query()
            ->whereNotNull('po')
            ->where('po', '!=', '')
            ->whereNotIn('po', ['HOLD', 'LANDING'])
            ->get(['nipnas', 'po'])
            ->pluck('po', 'nipnas')
            ->map(function ($poName) {
                $cleanedName = trim($poName);
                if (strtoupper($cleanedName) === 'EKA SARI AYUNINGTYAS') {
                    return 'EKA SARI';
                }
                return $cleanedName;
            });

        // 2. Lakukan agregasi data dari SEMUA sos_data.
        $aggregatedData = SosData::query()
            ->select(
                'nipnas',
                DB::raw("SUM(CASE WHEN kategori_umur = '< 3 BLN' AND UPPER(order_subtype) = 'NEW INSTALL' THEN 1 ELSE 0 END) as ao_lt_3bln"),
                DB::raw("SUM(CASE WHEN kategori_umur = '< 3 BLN' AND UPPER(order_subtype) = 'SUSPEND' THEN 1 ELSE 0 END) as so_lt_3bln"),
                DB::raw("SUM(CASE WHEN kategori_umur = '< 3 BLN' AND UPPER(order_subtype) = 'DISCONNECT' THEN 1 ELSE 0 END) as do_lt_3bln"),
                DB::raw("SUM(CASE WHEN kategori_umur = '< 3 BLN' AND UPPER(order_subtype) IN ('MODIFY PRICE', 'MODIFY', 'MODIFY BA', 'RENEWAL AGREEMENT', 'MODIFY TERMIN') THEN 1 ELSE 0 END) as mo_lt_3bln"),
                DB::raw("SUM(CASE WHEN kategori_umur = '< 3 BLN' AND UPPER(order_subtype) = 'RESUME' THEN 1 ELSE 0 END) as ro_lt_3bln"),
                DB::raw("SUM(CASE WHEN kategori_umur = '> 3 BLN' AND UPPER(order_subtype) = 'NEW INSTALL' THEN 1 ELSE 0 END) as ao_gt_3bln"),
                DB::raw("SUM(CASE WHEN kategori_umur = '> 3 BLN' AND UPPER(order_subtype) = 'SUSPEND' THEN 1 ELSE 0 END) as so_gt_3bln"),
                DB::raw("SUM(CASE WHEN kategori_umur = '> 3 BLN' AND UPPER(order_subtype) = 'DISCONNECT' THEN 1 ELSE 0 END) as do_gt_3bln"),
                DB::raw("SUM(CASE WHEN kategori_umur = '> 3 BLN' AND UPPER(order_subtype) IN ('MODIFY PRICE', 'MODIFY', 'MODIFY BA', 'RENEWAL AGREEMENT', 'MODIFY TERMIN') THEN 1 ELSE 0 END) as mo_gt_3bln"),
                DB::raw("SUM(CASE WHEN kategori_umur = '> 3 BLN' AND UPPER(order_subtype) = 'RESUME' THEN 1 ELSE 0 END) as ro_gt_3bln")
            )
            ->where(DB::raw('UPPER(li_status)'), 'IN PROGRESS')
            ->groupBy('nipnas')
            ->get();

        // 3. Siapkan struktur hasil akhir.
        $resultsByPoName = [];
        $blankRow = [
            'ao_lt_3bln' => 0, 'so_lt_3bln' => 0, 'do_lt_3bln' => 0, 'mo_lt_3bln' => 0, 'ro_lt_3bln' => 0,
            'ao_gt_3bln' => 0, 'so_gt_3bln' => 0, 'do_gt_3bln' => 0, 'mo_gt_3bln' => 0, 'ro_gt_3bln' => 0,
        ];

        foreach ($aggregatedData as $item) {
            if (isset($nipnasToPoMap[$item->nipnas])) {
                $poName = $nipnasToPoMap[$item->nipnas];
                if (!isset($resultsByPoName[$poName])) {
                    $resultsByPoName[$poName] = array_merge(['po' => $poName], $blankRow);
                }
                foreach ($blankRow as $key => $value) {
                    $resultsByPoName[$poName][$key] += $item->$key;
                }
            }
        }

        // 4. Pastikan semua PO dari master list tetap muncul di tabel.
        $uniquePoNames = collect($nipnasToPoMap->values())->unique()->sort();
        $finalData = [];
        foreach ($uniquePoNames as $poName) {
            $finalData[] = $resultsByPoName[$poName] ?? array_merge(['po' => $poName], $blankRow);
        }

        return $finalData;
    }
}
