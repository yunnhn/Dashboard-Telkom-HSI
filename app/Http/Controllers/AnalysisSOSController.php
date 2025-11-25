<?php

namespace App\Http\Controllers;

use App\Exports\GalaksiSosReportExport;
use App\Exports\SosReportExport;
use App\Imports\SOSDataImport;
use App\Jobs\ProcessListPoImport;
use App\Jobs\ProcessSOSImport;
use App\Models\CustomTarget;
use App\Models\ListPo;
use App\Models\SosData;
use App\Models\UserTableConfiguration;
use App\Traits\SosReportable;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Bus; // <-- Pastikan ini ada
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Redirect;
use Inertia\Inertia; // <-- Pastikan ini ada
use Maatwebsite\Excel\Facades\Excel;

class AnalysisSOSController extends Controller
{
    use SosReportable;

    public function index(Request $request)
    {
        $filters = $request->only(['tab', 'search']);
        $activeTab = $request->input('tab', 'provide_order');
        $paginationCount = 15;
        $periodInput = now()->format('Y-m');

        $reportDataAomo = $this->getSosReportData('AOMO');
        $reportDataSodoro = $this->getSosReportData('SODORO');

        $existingPoNames = ListPo::query()
            ->select('po')
            ->whereNotNull('po')
            ->where('po', '!=', '')
            ->whereNotIn('po', ['PO_TIDAK_TERDEFINISI', 'HOLD', 'LANDING', '#N/A']) // Filter nama invalid
            ->distinct()
            ->orderBy('po')
            ->pluck('po');

        $provideOrderData = SosData::query()
            ->where('kategori', 'PROVIDE ORDER')
            ->latest('order_created_date')
            ->paginate($paginationCount, ['*'], 'provide_order_page')->withQueryString();

        $inProcessData = SosData::query()
            ->where('kategori', 'IN PROCESS')
            ->latest('order_created_date')
            ->paginate($paginationCount, ['*'], 'in_process_page')->withQueryString();

        $readyToBillData = SosData::query()
            ->where('kategori', 'READY TO BILL')
            ->latest('order_created_date')
            ->paginate($paginationCount, ['*'], 'ready_to_bill_page')->withQueryString();

        $provCompleteData = SosData::query()
            ->where('kategori', 'PROV. COMPLETE')
            ->latest('order_created_date')
            ->paginate($paginationCount, ['*'], 'prov_complete_page')->withQueryString();

        $galaksiData = $this->getGalaksiReportData();

        $listPoData = ListPo::latest()->paginate(10, ['*'], 'list_po_page')->withQueryString();

        $mainWitelList = ['BALI', 'JATIM BARAT', 'JATIM TIMUR', 'NUSA TENGGARA', 'SURAMADU'];

        $unmappedPoData = SosData::query()
            ->where('po_name', 'PO_TIDAK_TERDEFINISI')
            ->whereIn('bill_witel', $mainWitelList)
            ->select('id', 'order_id', 'nipnas', 'standard_name', 'bill_witel', 'po_name', 'segmen', 'bill_city', 'witel_baru', 'cust_city', 'serv_city')
            ->latest('order_created_date')
            ->paginate($paginationCount, ['*'], 'unmapped_po_page')->withQueryString();

        // --- [PERBAIKAN DIMULAI DI SINI] ---

        // Ambil config AOMO (Cari milik user, jika tidak ada, cari yang NULL)
        $configAomoRecord = UserTableConfiguration::where('page_name', 'analysis_sos_aomo')
            ->where('user_id', Auth::id())
            ->first();
        if (!$configAomoRecord) {
            $configAomoRecord = UserTableConfiguration::where('page_name', 'analysis_sos_aomo')
                ->whereNull('user_id')
                ->first();
        }

        // Ambil config SODORO (Cari milik user, jika tidak ada, cari yang NULL)
        $configSodoroRecord = UserTableConfiguration::where('page_name', 'analysis_sos_sodoro')
            ->where('user_id', Auth::id())
            ->first();
        if (!$configSodoroRecord) {
            $configSodoroRecord = UserTableConfiguration::where('page_name', 'analysis_sos_sodoro')
                ->whereNull('user_id')
                ->first();
        }

        // --- [PERBAIKAN SELESAI] ---

        $customTargets = CustomTarget::where('user_id', auth()->id())
            ->where('page_name', 'analysis_sos')
            ->where('period', Carbon::parse($periodInput)->startOfMonth()->format('Y-m-d'))
            ->get();

        return Inertia::render('Admin/AnalysisSOS', [
            'reportDataAomo' => $reportDataAomo,
            'reportDataSodoro' => $reportDataSodoro,
            'provideOrderData' => $provideOrderData,
            'inProcessData' => $inProcessData,
            'readyToBillData' => $readyToBillData,
            'provCompleteData' => $provCompleteData,
            'savedConfigAomo' => $configAomoRecord ? $configAomoRecord->configuration : null,
            'savedConfigSodoro' => $configSodoroRecord ? $configSodoroRecord->configuration : null,
            'filters' => $filters,
            'period' => $periodInput,
            'customTargets' => $customTargets->groupBy('target_key')->map(fn ($group) => $group->pluck('value', 'witel')),
            'galaksiData' => $galaksiData,
            'listPoData' => $listPoData,
            'unmappedPoData' => $unmappedPoData,
            'poListOptions' => $existingPoNames,
        ]);
    }

    // =========================================================================
    // [PERBAIKAN UTAMA DI SINI] Mengganti logika `upload`
    // =========================================================================
    public function upload(Request $request)
    {
        Log::info('Proses upload dimulai.');
        $request->validate(['file' => 'required|file|mimes:xlsx,xls,csv,zip']);
        Log::info('Validasi file berhasil.');

        try {
            $path = $request->file('file')->store('excel-imports', 'local');
            Log::info('File berhasil disimpan di: '.$path);

            $batch = Bus::batch([
                new ProcessSOSImport($path),
            ])
            ->name('Import Data SOS')
            ->dispatch();

            Log::info('Job Importer berhasil dikirim ke antrian dengan batch ID: '.$batch->id);

            // [1] Ambil semua query params yang ada di URL (spt 'tab')
            $queryParams = $request->except('file');

            // [2] Tambahkan batch_id ke query params
            $queryParams['batch_id'] = $batch->id;

            // [3] Gunakan Inertia::location untuk redirect di sisi client (MENIRU DP)
            return Inertia::location(
                route('admin.analysisSOS.index', $queryParams)
            );
        } catch (\Throwable $e) {
            Log::error('Terjadi error saat upload: '.$e->getMessage());

            return Redirect::back()->with('error', 'Gagal memproses file. Cek log untuk detail.');
        }
    }

    public function saveConfig(Request $request)
    {
        $validated = $request->validate([
            'configuration' => 'required|array',
            'page_name' => 'required|string',
        ]);

        UserTableConfiguration::updateOrCreate(
            ['page_name' => $validated['page_name'], 'user_id' => Auth::id()],
            ['configuration' => $validated['configuration']]
        );

        return Redirect::back()->with('success', 'Tampilan tabel berhasil disimpan!');
    }

    public function saveCustomTargets(Request $request)
    {
        $validated = $request->validate([
            'targets' => 'required|array',
            'period' => 'required|date_format:Y-m',
        ]);

        $period = Carbon::parse($validated['period'])->startOfMonth()->format('Y-m-d');
        $pageName = 'analysis_sos';

        foreach ($validated['targets'] as $targetKey => $witelValues) {
            foreach ($witelValues as $witel => $value) {
                CustomTarget::updateOrCreate(
                    [
                        'user_id' => auth()->id(),
                        'page_name' => $pageName,
                        'period' => $period,
                        'target_key' => $targetKey,
                        'witel' => $witel,
                    ],
                    ['value' => $value ?? 0]
                );
            }
        }

        return Redirect::back()->with('success', 'Target kustom berhasil disimpan.');
    }

    public function resetConfig(Request $request)
    {
        $validated = $request->validate(['page_name' => 'required|string']);
        $pageName = $validated['page_name']; // contoh: 'analysis_sos_aomo'

        // 1. Hapus konfigurasi yang spesifik untuk user ini
        UserTableConfiguration::where('page_name', $pageName)
            ->where('user_id', Auth::id())
            ->delete();

        // 2. Hapus juga konfigurasi global (user_id = NULL) yang mungkin ada
        UserTableConfiguration::where('page_name', $pageName)
            ->whereNull('user_id')
            ->delete();

        return Redirect::back()->with('success', 'Tampilan tabel berhasil di-reset.');
    }

    public function export(Request $request)
    {
        $reportData = $this->getSosReportData();
        $galaksiData = $this->getGalaksiReportData();
        $lastUpdate = SosData::latest('updated_at')->value('updated_at');
        $cutoffDate = $lastUpdate ? Carbon::parse($lastUpdate)->isoFormat('D MMMM YYYY') : 'N/A';
        $period = $lastUpdate ? strtoupper(Carbon::parse($lastUpdate)->isoFormat('D MMMM YYYY')) : 'OKTOBER 2025';
        $viewMode = $request->input('viewMode', 'AOMO');
        $fileName = 'SOS_Report_'.$viewMode.'_'.now()->format('Y-m-d').'.xlsx';

        return Excel::download(new SosReportExport($reportData, $cutoffDate, $period, $viewMode, $galaksiData), $fileName);
    }

    public function exportGalaksi()
    {
        $galaksiData = $this->getGalaksiReportData();
        $lastUpdate = SosData::latest('updated_at')->value('updated_at');
        $cutoffDate = $lastUpdate ? Carbon::parse($lastUpdate)->format('d/m/Y H:i:s') : 'N/A';
        $fileName = 'Galaksi_SOS_Report_'.now()->format('Y-m-d').'.xlsx';

        return Excel::download(new GalaksiSosReportExport($galaksiData, $cutoffDate), $fileName);
    }

    public function importSosData(Request $request)
    {
        // 1. Validasi File
        $request->validate([
            'file' => 'required|file|mimes:csv,xlsx,xls',
        ]);

        Log::info('Proses upload (Sync/Direct) dimulai.');

        try {
            // 2. Simpan File Sementara
            $file = $request->file('file');
            // Menggunakan 'local' disk agar path-nya pasti
            $path = $file->store('excel-imports', 'local');

            Log::info('File berhasil disimpan di: '.$path);

            // 3. Eksekusi Import
            // Kita pass path file yang sudah disimpan
            Excel::import(new SOSDataImport(), $path, 'local');

            Log::info('Proses impor (upsert) selesai.');

            return Redirect::back()->with('success', 'Data SOS berhasil diimpor dan kolom kosong otomatis dibersihkan.');
        } catch (\Maatwebsite\Excel\Validators\ValidationException $e) {
            Log::error('Error validasi Excel: ', $e->failures());

            return Redirect::back()->withErrors(['file' => 'Gagal validasi data Excel: '.$e->getMessage()]);
        } catch (\Exception $e) {
            Log::error('Proses impor GAGAL: '.$e->getMessage(), ['trace' => $e->getTraceAsString()]);

            return Redirect::back()->withErrors(['file' => 'Terjadi error sistem: '.$e->getMessage()]);
        }
    }

    public function uploadPoList(Request $request)
    {
        $request->validate(['po_document' => 'required|file|mimes:xlsx,xls,csv']);
        $path = $request->file('po_document')->store('excel-imports', 'local');
        $batch = Bus::batch([
            new ProcessListPoImport($path),
        ])->name('Import Daftar PO')->dispatch();

        return Redirect::route('admin.analysisSOS.index', ['po_batch_id' => $batch->id])
            ->with('info', 'File Daftar PO sedang diproses di latar belakang!');
    }

    public function addPoManually(Request $request)
    {
        $validated = $request->validate([
            'po' => 'required|string|max:255',
            'nipnas' => 'required|string|max:255',
            'segment' => 'nullable|string|max:255',
            'bill_city' => 'nullable|string|max:255',
            'witel' => 'nullable|string|max:255',
        ]);

        // 1. Update Master Data (ListPo)
        // Ini hanya menyimpan "Kamus Data" untuk file upload di MASA DEPAN.
        ListPo::updateOrCreate(
            ['nipnas' => $validated['nipnas']],
            [
                'po' => $validated['po'],
                'segment' => $validated['segment'] ?? null,
                'bill_city' => $validated['bill_city'] ?? null,
                'witel' => $validated['witel'] ?? null,
            ]
        );

        // [PERBAIKAN] HAPUS LOGIKA BULK UPDATE KE SOS_DATA
        // Karena kita sepakat 1 NIPNAS bisa beda-beda PO, maka fitur "Tambah PO Manual"
        // (yang basisnya NIPNAS) tidak boleh sembarangan menimpa data transaksi yang ada.
        // Function ini sekarang murni hanya untuk "Menambah Master Data".

        return Redirect::back()->with('success', 'Master Data PO disimpan untuk referensi upload mendatang. Data transaksi saat ini TIDAK diubah.');
    }

    public function cancelImport(Request $request)
    {
        $validated = $request->validate(['batch_id' => 'required|string']);
        $batch = Bus::findBatch($validated['batch_id']);
        if ($batch) {
            $batch->cancel();
            Cache::forget('import_progress_'.$validated['batch_id']);
            session()->forget('sos_active_batch_id'); // [TAMBAHAN] Bersihkan session juga

            return response()->json(['message' => 'Proses impor berhasil dibatalkan.']);
        }

        return response()->json(['message' => 'Batch tidak ditemukan.'], 404);
    }

    public function updatePoName(Request $request)
    {
        // 1. Validasi Input
        $validated = $request->validate([
            'order_id' => 'required|string|exists:sos_data,order_id',
            'po_name' => 'required|string|max:255',
            'nipnas' => 'required|string|max:255',
            'segmen' => 'nullable|string',
            'bill_city' => 'nullable|string',
            'witel_baru' => 'nullable|string',
        ]);

        // Bersihkan input
        $targetNipnas = trim($validated['nipnas']);
        $poNameBaru = trim($validated['po_name']);

        // 2. Persiapan Data Update (Logic Penentuan Witel & Segmen)
        $cityMap = [
            'DENPASAR' => 'BALI', 'BADUNG' => 'BALI', 'GIANYAR' => 'BALI',
            'MATARAM' => 'NUSA TENGGARA', 'KUPANG' => 'NUSA TENGGARA',
            'SURABAYA' => 'SURAMADU', 'BANGKALAN' => 'SURAMADU',
            'MALANG' => 'JATIM TIMUR', 'JEMBER' => 'JATIM TIMUR', 'BANYUWANGI' => 'JATIM TIMUR',
            'MADIUN' => 'JATIM BARAT', 'KEDIRI' => 'JATIM BARAT',
        ];
        $validWitels = ['BALI', 'JATIM BARAT', 'JATIM TIMUR', 'NUSA TENGGARA', 'SURAMADU'];
        $validSegmens = ['1. SME', '2. GOV', '3. PRIVATE', '4. SOE'];

        // Logic Witel
        $finalWitel = null;
        if (!empty($validated['witel_baru'])) {
            $inputWitel = strtoupper(trim($validated['witel_baru']));
            if (in_array($inputWitel, $validWitels)) {
                $finalWitel = $inputWitel;
            }
        }
        if (!$finalWitel && !empty($validated['bill_city'])) {
            $inputCity = strtoupper(trim($validated['bill_city']));
            if (isset($cityMap[$inputCity])) {
                $finalWitel = $cityMap[$inputCity];
            }
        }

        // Logic Segmen
        $finalSegmen = null;
        if (!empty($validated['segmen'])) {
            $inputSegmen = strtoupper(trim($validated['segmen']));
            $segmenMap = ['SME' => '1. SME', 'GOV' => '2. GOV', 'PRIVATE' => '3. PRIVATE', 'SOE' => '4. SOE'];
            if (in_array($inputSegmen, $validSegmens)) {
                $finalSegmen = $inputSegmen;
            } elseif (isset($segmenMap[$inputSegmen])) {
                $finalSegmen = $segmenMap[$inputSegmen];
            }
        }

        // =====================================================================
        // [PERBAIKAN] UPDATE SPESIFIK (SINGLE ORDER ONLY)
        // =====================================================================

        $updateData = [
            'po_name' => $poNameBaru,
            'bill_city' => $validated['bill_city'], // Update kota sesuai input
        ];

        // Hanya update segmen jika logic menemukan segmen valid
        if ($finalSegmen) {
            $updateData['segmen'] = $finalSegmen;
            $updateData['segmen_baru'] = $finalSegmen;
        }

        // Hanya update witel jika logic menemukan witel valid
        if ($finalWitel) {
            $updateData['bill_witel'] = $finalWitel;
            $updateData['witel_baru'] = $finalWitel;
        }

        // EKSEKUSI: Hanya update berdasarkan ORDER_ID (Bukan NIPNAS)
        SosData::where('order_id', $validated['order_id'])->update($updateData);

        // =====================================================================
        // 4. Update Master Data ListPo (Opsional: Sebagai default masa depan)
        // =====================================================================
        // Kita tetap simpan ke ListPo agar jika ada upload baru, dia punya default value.
        // Tapi ini TIDAK mengubah order lain yang sudah ada di database saat ini.
        $updatedOrder = SosData::where('order_id', $validated['order_id'])->first();

        ListPo::updateOrCreate(
            ['nipnas' => $targetNipnas],
            [
                'po' => $poNameBaru,
                'segment' => $updatedOrder->segmen_baru ?? null,
                'witel' => $updatedOrder->witel_baru ?? null,
                'bill_city' => $validated['bill_city'] ?? null,
            ]
        );

        return Redirect::back()->with('success', "Berhasil! Data untuk Order ID {$validated['order_id']} telah diperbarui.");
    }

    // =========================================================================
    // [PERBAIKAN UTAMA DI SINI] Meniru 100% logika getImportProgress dari DP
    // =========================================================================
    public function getImportProgress(string $batchId)
    {
        // 1. Cek ke database (tabel job_batches)
        $batch = Bus::findBatch($batchId);

        // 2. Jika batch tidak ditemukan ATAU sudah selesai, paksa lapor 100%
        if (!$batch || $batch->finished()) {
            Cache::forget('import_progress_'.$batchId); // Bersihkan cache

            return response()->json([
                'progress' => 100,
                'status' => 'completed',
            ]);
        }

        // 3. Jika batch masih berjalan, cek progres dari Cache
        $progress = Cache::get('import_progress_'.$batchId, 0);

        // 4. Jika Job gagal dan menulis -1 ke cache
        if ($progress == -1) {
            Cache::forget('import_progress_'.$batchId);

            return response()->json([
                'progress' => -1,
                'status' => 'failed',
            ]);
        }

        // 5. Kirim progres normal
        return response()->json([
            'progress' => $progress,
            'status' => 'processing',
        ]);
    }
}
