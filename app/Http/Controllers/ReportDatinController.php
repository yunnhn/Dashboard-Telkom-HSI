<?php

namespace App\Http\Controllers;

use App\Traits\SosReportable;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\DB;
use App\Models\SosData; // Pastikan Model 'SosData' Anda benar
use Carbon\Carbon;
use App\Models\UserTableConfiguration;
use Illuminate\Support\Facades\Auth;

class ReportDatinController extends Controller
{
    // Gunakan Trait yang sama dengan AnalysisSOSController
    use SosReportable;

    /**
     * Menampilkan halaman Report Datin untuk user.
     */
    public function index(Request $request)
    {
        // Panggil fungsi-fungsi dari Trait
        $reportData = $this->getSosReportData();
        $galaksiData = $this->getGalaksiReportData();

        $configAomoRecord = UserTableConfiguration::where('page_name', 'analysis_sos_aomo')
                            ->where('user_id', Auth::id())
                            ->first();
        $configSodoroRecord = UserTableConfiguration::where('page_name', 'analysis_sos_sodoro')
                            ->where('user_id', Auth::id())
                            ->first();

        // Render halaman React 'ReportDatin'
        return Inertia::render('ReportDatin', [
            'reportData' => $reportData,
            'galaksiData' => $galaksiData,
            'savedConfigAomo' => $configAomoRecord ? $configAomoRecord->configuration : null,
            'savedConfigSodoro' => $configSodoroRecord ? $configSodoroRecord->configuration : null,
        ]);
    }

    public function showSosDetails(Request $request)
    {
        $validated = $request->validate([
            'segment' => 'required|string',
            'witel' => 'required|string',
            'kpi_key' => 'required|string',
            'view_mode' => 'required|string',
        ]);

        $segment = $validated['segment'];
        $witel = $validated['witel'];
        $kpiKey = $validated['kpi_key'];
        $viewMode = $validated['view_mode'];

        // ===================================================================
        // [PERBAIKAN] Mapping Data Frontend -> Backend
        // ===================================================================
        // React mengirim 'PRIVATE', tapi DB berisi '3. PRIVATE' (sesuai screenshot)
        $segmentMap = [
            'SME' => '1. SME',     // Asumsi, sesuaikan jika namanya beda
            'GOV' => '2. GOV',     // Asumsi, sesuaikan jika namanya beda
            'PRIVATE' => '3. PRIVATE', // Sesuai screenshot Anda
            'SOE' => '4. SOE',     // Asumsi, sesuaikan jika namanya beda
        ];

        // Ambil nilai segmen yang benar untuk query DB
        // Jika 'PRIVATE' masuk, $targetSegment akan menjadi '3. PRIVATE'
        $targetSegment = $segmentMap[$segment] ?? $segment;
        // ===================================================================


        // ===================================================================
        // NAMA-NAMA KOLOM (Sudah OK)
        // ===================================================================
        $model = \App\Models\SosData::class;

        $segmentColumn  = 'segmen_baru';
        $witelColumn    = 'bill_witel'; // Pastikan ini kolom Witel (SEMARANG, BALI, dll)
        $statusColumn   = 'kategori';
        $umurColumn     = 'kategori_umur';
        $tipeGrupColumn = 'tipe_grup';
        $dateColumn     = 'li_billdate';
        $customerColumn = 'standard_name';
        $poColumn       = 'po_name';
        $estBcColumn    = 'revenue';
        // ===================================================================

        // 1. Tentukan Status Order (Sudah benar)
        $status = match(true) {
            str_contains($kpiKey, 'provide_order') => 'PROVIDE ORDER',
            str_contains($kpiKey, 'in_process') => 'IN PROCESS',
            str_contains($kpiKey, 'ready_to_bill') => 'READY TO BILL',
            default => null,
        };

        // 2. Tentukan Filter Umur (Sudah benar)
        $ageCategory = null;
        if (str_contains($kpiKey, 'lt_3bln')) {
            $ageCategory = '< 3 BLN';
        } else if (str_contains($kpiKey, 'gt_3bln')) {
            $ageCategory = '> 3 BLN';
        }

        // 3. Bangun Query
        $query = $model::query();

        // Filter berdasarkan tipe_grup (AOMO / SODORO)
        $query->where($tipeGrupColumn, $viewMode);

        // 4. Filter Witel/Segmen
        // Array ini untuk mengecek $witel yang dikirim React, jadi biarkan
        $segmentTotalNames = ['SME', 'GOV', 'PRIVATE', 'SOE'];

        if ($witel === 'GRAND TOTAL') {
            // Kasus Grand Total: Jangan filter segmen/witel
        } else if (in_array($witel, $segmentTotalNames) && $witel === $segment) {
            // Kasus Total Segmen: Filter HANYA segmen
            // [PERBAIKAN] Gunakan $targetSegment yang sudah di-map
            $query->where($segmentColumn, $targetSegment);
        } else {
            // Kasus Witel Spesifik: Filter segmen DAN witel
            // [PERBAIKAN] Gunakan $targetSegment yang sudah di-map
            $query->where($segmentColumn, $targetSegment);
            $query->where($witelColumn, $witel); // Asumsi $witel ('SEMARANG', 'BALI') sudah benar
        }

        // 5. Filter Status
        if ($status) {
            $query->where($statusColumn, $status);
        }

        // 6. Filter Umur
        if ($ageCategory) {
            $query->where($umurColumn, $ageCategory);
        }

        // 7. Ambil data
        $orders = $query->select(
            'order_id',
            $segmentColumn,
            $witelColumn,
            $customerColumn,
            $statusColumn,
            $umurColumn,
            $tipeGrupColumn,
            $poColumn,
            $dateColumn,
            $estBcColumn
        )->get();

        return Inertia::render('ReportDatin/Details', [
            'orders' => $orders,
            'pageTitle' => "Detail SOS: $witel ($kpiKey - $viewMode)",
        ]);
    }

    /**
     * [BARU] Menampilkan detail untuk tabel Posisi Galaksi.
     * (Fungsi ini sepertinya sudah benar logikanya)
     */
    public function showGalaksiDetails(Request $request)
    {
        $validated = $request->validate([
            'po' => 'required|string',
            'kpi_key' => 'required|string', // misal: 'ao_lt_3bln'
        ]);

        $poName = $validated['po'];
        $kpiKey = $validated['kpi_key'];

        // 1. Parse kpi_key
        $parts = explode('_', $kpiKey);
        $statusPrefix = strtoupper($parts[0]); // 'AO', 'SO', 'DO', 'MO', 'RO'
        $age = $parts[1]; // 'lt' atau 'gt'

        $threeMonthsAgo = Carbon::now()->subMonths(3);

        // 2. Mapping dari 'AO' -> '1. AO'
        $statusMap = [
            'AO' => '1. AO',
            'SO' => '2. SO',
            'DO' => '3. DO',
            'MO' => '4. MO',
            'RO' => '5. RO',
        ];

        if (!isset($statusMap[$statusPrefix])) {
            return Inertia::render('ReportDatin/Details', [
                'orders' => [],
                'pageTitle' => "Detail Galaksi: Status tidak dikenal ($statusPrefix)",
            ]);
        }
        $targetStatus = $statusMap[$statusPrefix];

        // 3. GANTI 'SosData' DENGAN NAMA MODEL ANDA YANG BENAR
        $query = SosData::query();

        // 4. Filter berdasarkan PO (Logika 'Grand Total' di sini sudah benar)
        if ($poName !== 'Grand Total') {
            $query->where('po_name', $poName);
        }

        // 5. Filter berdasarkan 'tipe_order'
        // Pastikan kolom 'tipe_order' ada di screenshot 2 -> YA, ADA.
        $query->where('tipe_order', $targetStatus);

        // 6. Filter berdasarkan Umur
        // Pastikan kolom 'li_billdate' ada di screenshot 1 -> YA, ADA.
        if ($age === 'lt') {
            $query->where('li_billdate', '>=', $threeMonthsAgo);
        } else if ($age === 'gt') {
            $query->where('li_billdate', '<', $threeMonthsAgo);
        }

        // Pastikan semua kolom select ada di screenshot
        $orders = $query->select(
            'order_id',     // screenshot 1
            'segmen',       // screenshot 1
            'tipe_order',   // screenshot 2
            'po_name',      // screenshot 2
            'li_billdate'   // screenshot 1
            // 'revenue' // Anda bisa tambahkan 'revenue' (dari screenshot 2) jika perlu
        )->get();

        return Inertia::render('ReportDatin/Details', [
            'orders' => $orders,
            'pageTitle' => "Detail Galaksi: $poName ($kpiKey)",
        ]);
    }
}
