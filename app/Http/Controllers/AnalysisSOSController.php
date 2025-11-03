<?php

namespace App\Http\Controllers;

use App\Exports\GalaksiSosReportExport;
use App\Exports\SosReportExport;
use App\Jobs\ProcessListPoImport;
use App\Jobs\ProcessSOSImport;
use App\Models\CustomTarget;
use App\Models\ListPo;
use App\Models\SosData;
use App\Models\UserTableConfiguration; // [WAJIB] Tambahkan ini untuk mendapatkan ID user
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Redirect;
use Inertia\Inertia;
use Maatwebsite\Excel\Facades\Excel;

class AnalysisSOSController extends Controller
{
    /**
     * Menampilkan halaman utama Analisis SOS dengan semua data yang dibutuhkan.
     */
    public function index(Request $request)
    {
        $filters = $request->only(['tab', 'search']);
        $activeTab = $request->input('tab', 'provide_order');
        $paginationCount = 15;
        $periodInput = now()->format('Y-m');

        // 1. Mengambil data untuk tabel report utama
        $reportData = $this->getSosReportData();

        // 2. Mengambil data untuk tab detail (dengan paginasi)
        $provideOrderData = SosData::query()
            ->where('kategori', '1. PROVIDE ORDER')
            ->latest('order_created_date')
            ->paginate($paginationCount, ['*'], 'provide_order_page')->withQueryString();

        $inProcessData = SosData::query()
            ->where('kategori', '2. IN PROCESS')
            ->latest('order_created_date')
            ->paginate($paginationCount, ['*'], 'in_process_page')->withQueryString();

        $readyToBillData = SosData::query()
            ->where('kategori', '3. READY TO BILL')
            ->latest('order_created_date')
            ->paginate($paginationCount, ['*'], 'ready_to_bill_page')->withQueryString();

        $provCompleteData = SosData::query()
            ->where('kategori', '4. PROV COMPLETE') // Asumsi nama kategori di database
            ->latest('order_created_date')
            ->paginate($paginationCount, ['*'], 'prov_complete_page')->withQueryString();

        $galaksiData = $this->getGalaksiReportData();

        $listPoData = ListPo::latest()->paginate(10, ['*'], 'list_po_page')->withQueryString();

        // 3. Mengambil konfigurasi tabel yang disimpan user
        // [PERBAIKAN] Mengambil data spesifik untuk user yang sedang login
        $configRecord = UserTableConfiguration::where('page_name', 'analysis_sos')
            ->where('user_id', Auth::id())
            ->first();

        $savedTableConfig = $configRecord ? $configRecord->configuration : null;

        $customTargets = CustomTarget::where('user_id', auth()->id())
            ->where('page_name', 'analysis_sos')
            ->where('period', Carbon::parse($periodInput)->startOfMonth()->format('Y-m-d'))
            ->get();

        return Inertia::render('Admin/AnalysisSOS', [
            'reportData' => $reportData,
            'provideOrderData' => $provideOrderData,
            'inProcessData' => $inProcessData,
            'readyToBillData' => $readyToBillData,
            'provCompleteData' => $provCompleteData,
            'savedTableConfig' => $savedTableConfig,
            'filters' => $filters,
            'period' => $periodInput,
            'customTargets' => $customTargets->groupBy('target_key')->map(fn ($group) => $group->pluck('value', 'witel')),
            'galaksiData' => $galaksiData,
            'listPoData' => $listPoData,
        ]);
    }

    // Ganti fungsi getGalaksiReportData() yang lama dengan yang ini.

    private function getGalaksiReportData()
    {
        // 1. [PERBAIKAN] Tambahkan aturan bisnis untuk menggabungkan nama PO
        $nipnasToPoMap = ListPo::query()
            ->whereNotNull('po')
            ->where('po', '!=', '')
            ->whereNotIn('po', ['HOLD', 'LANDING'])
            ->get(['nipnas', 'po'])
            ->pluck('po', 'nipnas')
            ->map(function ($poName) {
                // Pertama, bersihkan spasi tersembunyi
                $cleanedName = trim($poName);

                // Terapkan aturan penggabungan spesifik
                if (strtoupper($cleanedName) === 'EKA SARI AYUNINGTYAS') {
                    return 'EKA SARI';
                }

                // Kembalikan nama yang sudah bersih
                return $cleanedName;
            });

        // 2. Lakukan agregasi data (Logika ini sudah benar dan tidak perlu diubah)
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

        // 3. Siapkan struktur hasil akhir. (Logika ini sudah benar)
        $resultsByPoName = [];
        $blankRow = [
            'ao_lt_3bln' => 0, 'so_lt_3bln' => 0, 'do_lt_3bln' => 0, 'mo_lt_3bln' => 0, 'ro_lt_3bln' => 0,
            'ao_gt_3bln' => 0, 'so_gt_3bln' => 0, 'do_gt_3bln' => 0, 'mo_gt_3bln' => 0, 'ro_gt_3bln' => 0,
        ];

        foreach ($aggregatedData as $item) {
            if (isset($nipnasToPoMap[$item->nipnas])) {
                $poName = $nipnasToPoMap[$item->nipnas]; // Nama PO di sini sudah digabungkan
                if (!isset($resultsByPoName[$poName])) {
                    $resultsByPoName[$poName] = array_merge(['po' => $poName], $blankRow);
                }
                foreach ($blankRow as $key => $value) {
                    $resultsByPoName[$poName][$key] += $item->$key;
                }
            }
        }

        // 4. Pastikan semua PO dari master list tetap muncul di tabel. (Logika ini sudah benar)
        $uniquePoNames = collect($nipnasToPoMap->values())->unique()->sort();
        $finalData = [];
        foreach ($uniquePoNames as $poName) {
            $finalData[] = $resultsByPoName[$poName] ?? array_merge(['po' => $poName], $blankRow);
        }

        return $finalData;
    }

    public function upload(Request $request)
    {
        Log::info('Proses upload dimulai.'); // Log 1

        $request->validate(['document' => 'required|file|mimes:xlsx,xls,csv']);
        Log::info('Validasi file berhasil.'); // Log 2

        try {
            $path = $request->file('document')->store('excel-imports', 'local');
            Log::info('File berhasil disimpan di: '.$path); // Log 3

            $batch = Bus::batch([new ProcessSOSImport($path)])
                ->name('Import Data SOS')
                ->dispatch();

            Log::info('Job berhasil dikirim ke antrian dengan batch ID: '.$batch->id); // Log 4

            return Redirect::route('admin.analysisSOS.index', ['batch_id' => $batch->id]);
        } catch (\Throwable $e) {
            Log::error('Terjadi error saat upload: '.$e->getMessage()); // Log 5 (Error)

            return Redirect::back()->with('error', 'Gagal memproses file. Cek log untuk detail.'); // Kirim pesan error
        }
    }

    /**
     * Menyimpan konfigurasi tampilan tabel untuk user.
     */
    public function saveConfig(Request $request)
    {
        $validated = $request->validate([
            'configuration' => 'required|array',
            'page_name' => 'required|string',
        ]);

        // [PERBAIKAN] Gunakan user_id agar setiap user punya konfigurasinya sendiri
        UserTableConfiguration::updateOrCreate(
            [
                'page_name' => $validated['page_name'],
                'user_id' => Auth::id(), // Kondisi untuk mencari
            ],
            [
                'configuration' => $validated['configuration'], // Data untuk di-update atau dibuat
            ]
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
        $pageName = 'analysis_sos'; // Nama halaman spesifik untuk SOS

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

    /**
     * [BARU] Menghapus (mereset) konfigurasi tabel untuk user yang sedang login.
     * Ini adalah method yang hilang dan menyebabkan tombol reset tidak berfungsi.
     */
    public function resetConfig(Request $request)
    {
        $validated = $request->validate([
            'page_name' => 'required|string',
        ]);

        UserTableConfiguration::where('page_name', $validated['page_name'])
            ->where('user_id', Auth::id()) // Pastikan hanya menghapus milik user ini
            ->delete();

        return Redirect::back()->with('success', 'Tampilan tabel berhasil di-reset ke pengaturan awal.');
    }

    // Ganti seluruh fungsi getSosReportData() dengan versi final ini.

    private function getSosReportData()
    {
        // 1. [PERBAIKAN] Definisikan Witel yang akan ditampilkan di tabel akhir
        $masterWitelList = ['BALI', 'JATIM BARAT', 'JATIM TIMUR', 'NUSA TENGGARA', 'SURAMADU'];

        // Definisikan Witel sumber dari database yang akan kita proses
        $sourceWitelList = ['BALI', 'MALANG', 'SIDOARJO', 'NUSA TENGGARA', 'SURAMADU'];

        // Definisikan Segmen (sama seperti sebelumnya)
        $masterSegmentList = ['PRIVATE SERVICE', 'REGIONAL', 'GOVERNMENT', 'STATE-OWNED ENTERPRISE SERVICE', 'ENTERPRISE'];

        // 2. Query utama dengan logika pemetaan Witel
        $dbData = SosData::query()
            ->select(
                DB::raw('TRIM(UPPER(segmen)) as segmen'),

                // [LOGIKA BARU] Petakan ulang nama Witel menggunakan CASE WHEN
                DB::raw("CASE
                        WHEN TRIM(UPPER(bill_witel)) = 'MALANG' THEN 'JATIM BARAT'
                        WHEN TRIM(UPPER(bill_witel)) = 'SIDOARJO' THEN 'JATIM TIMUR'
                        ELSE TRIM(UPPER(bill_witel))
                     END as witel"),

                // Query SUM tetap sama
                DB::raw("SUM(CASE WHEN kategori_umur = '< 3 BLN' AND UPPER(kategori) = '1. PROVIDE ORDER' THEN 1 ELSE 0 END) as provide_order_lt_3bln"),
                DB::raw("SUM(CASE WHEN kategori_umur = '< 3 BLN' AND UPPER(kategori) = '1. PROVIDE ORDER' THEN revenue ELSE 0 END) / 1000000 as est_bc_provide_order_lt_3bln"),
                DB::raw("SUM(CASE WHEN kategori_umur = '< 3 BLN' AND UPPER(kategori) = '2. IN PROCESS' THEN 1 ELSE 0 END) as in_process_lt_3bln"),
                DB::raw("SUM(CASE WHEN kategori_umur = '< 3 BLN' AND UPPER(kategori) = '2. IN PROCESS' THEN revenue ELSE 0 END) / 1000000 as est_bc_in_process_lt_3bln"),
                DB::raw("SUM(CASE WHEN kategori_umur = '< 3 BLN' AND UPPER(kategori) = '3. READY TO BILL' THEN 1 ELSE 0 END) as ready_to_bill_lt_3bln"),
                DB::raw("SUM(CASE WHEN kategori_umur = '< 3 BLN' AND UPPER(kategori) = '3. READY TO BILL' THEN revenue ELSE 0 END) / 1000000 as est_bc_ready_to_bill_lt_3bln"),
                DB::raw("SUM(CASE WHEN kategori_umur = '> 3 BLN' AND UPPER(kategori) = '1. PROVIDE ORDER' THEN 1 ELSE 0 END) as provide_order_gt_3bln"),
                DB::raw("SUM(CASE WHEN kategori_umur = '> 3 BLN' AND UPPER(kategori) = '1. PROVIDE ORDER' THEN revenue ELSE 0 END) / 1000000 as est_bc_provide_order_gt_3bln"),
                DB::raw("SUM(CASE WHEN kategori_umur = '> 3 BLN' AND UPPER(kategori) = '2. IN PROCESS' THEN 1 ELSE 0 END) as in_process_gt_3bln"),
                DB::raw("SUM(CASE WHEN kategori_umur = '> 3 BLN' AND UPPER(kategori) = '2. IN PROCESS' THEN revenue ELSE 0 END) / 1000000 as est_bc_in_process_gt_3bln"),
                DB::raw("SUM(CASE WHEN kategori_umur = '> 3 BLN' AND UPPER(kategori) = '3. READY TO BILL' THEN 1 ELSE 0 END) as ready_to_bill_gt_3bln"),
                DB::raw("SUM(CASE WHEN kategori_umur = '> 3 BLN' AND UPPER(kategori) = '3. READY TO BILL' THEN revenue ELSE 0 END) / 1000000 as est_bc_ready_to_bill_gt_3bln")
            )
            // [FILTER BARU] Hanya ambil data dari witel sumber yang relevan
            ->whereIn(DB::raw('TRIM(UPPER(bill_witel))'), $sourceWitelList)
            ->whereIn(DB::raw('TRIM(UPPER(segmen))'), $masterSegmentList)
            // Group by nama witel yang sudah dipetakan ulang
            ->groupBy('segmen', 'witel')
            ->get()
            ->keyBy(fn ($item) => $item->segmen.'_'.$item->witel)
            ->toArray();

        // 3. Bangun struktur data akhir (Tidak ada perubahan di sini, akan bekerja otomatis)
        $processedData = [];
        $grandTotal = $this->getBlankTotalRow('GRAND TOTAL');

        foreach ($masterSegmentList as $segment) {
            $segmentTotal = $this->getBlankTotalRow(strtoupper($segment));
            $segmentWitelRows = [];

            foreach ($masterWitelList as $witel) {
                $key = $segment.'_'.$witel;
                $rowData = $dbData[$key] ?? array_merge(['segmen' => $segment, 'witel' => $witel], $this->getBlankTotalRow(null));
                $segmentWitelRows[] = $this->calculateRowTotals($rowData);

                foreach ($rowData as $colKey => $value) {
                    if (is_numeric($value)) {
                        $segmentTotal[$colKey] += $value;
                        $grandTotal[$colKey] += $value;
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

        // Error diperbaiki di sini dengan menambahkan '?? 0'
        $row['grand_total_order'] = ($row['total_lt_3bln'] ?? 0) + ($row['total_gt_3bln'] ?? 0);

        return $row;
    }

    public function export(Request $request) // <-- Tambahkan Request
    {
        // 1. Ambil data report yang sudah diproses
        $reportData = $this->getSosReportData();
        $galaksiData = $this->getGalaksiReportData();

        // 2. Ambil tanggal terakhir dari database untuk cutoff
        $lastUpdate = SosData::latest('updated_at')->value('updated_at');
        $cutoffDate = $lastUpdate ? Carbon::parse($lastUpdate)->isoFormat('D MMMM YYYY') : 'N/A';
        $period = $lastUpdate ? strtoupper(Carbon::parse($lastUpdate)->isoFormat('D MMMM YYYY')) : 'OKTOBER 2025';

        // [BARU] Ambil viewMode dari request, default ke 'AOMO' jika tidak ada
        $viewMode = $request->input('viewMode', 'AOMO');

        // 3. Tentukan nama file
        $fileName = 'SOS_Report_'.$viewMode.'_'.now()->format('Y-m-d').'.xlsx';

        // 4. [PERUBAHAN] Kirim $viewMode ke class Export
        return Excel::download(new SosReportExport($reportData, $cutoffDate, $period, $viewMode, $galaksiData), $fileName);
    }

    public function exportGalaksi()
    {
        // 1. Ambil data report Galaksi
        $galaksiData = $this->getGalaksiReportData();

        // 2. Ambil tanggal terakhir dari database untuk cutoff
        $lastUpdate = SosData::latest('updated_at')->value('updated_at');
        $cutoffDate = $lastUpdate ? Carbon::parse($lastUpdate)->format('d/m/Y H:i:s') : 'N/A';

        // 3. Tentukan nama file
        $fileName = 'Galaksi_SOS_Report_'.now()->format('Y-m-d').'.xlsx';

        // 4. Panggil class Export dan unduh file
        return Excel::download(new GalaksiSosReportExport($galaksiData, $cutoffDate), $fileName);
    }

    public function uploadPoList(Request $request)
    {
        $request->validate(['po_document' => 'required|file|mimes:xlsx,xls,csv']);

        $path = $request->file('po_document')->store('excel-imports', 'local');

        // [PERUBAHAN] Gunakan Job Batching agar bisa dilacak oleh frontend
        $batch = Bus::batch([
            new ProcessListPoImport($path),
        ])->name('Import Daftar PO')->dispatch();

        // [PERUBAHAN] Redirect kembali dengan ID batch khusus untuk PO
        // Ini akan memicu polling di frontend
        return Redirect::route('admin.analysisSOS.index', ['po_batch_id' => $batch->id])
            ->with('info', 'File Daftar PO sedang diproses di latar belakang!');
    }

    public function addPoManually(Request $request)
    {
        // Validasi input dari form
        $validated = $request->validate([
            'po' => 'required|string|max:255',
            'nipnas' => 'required|string|max:255',
            'segment' => 'nullable|string|max:255',
            'bill_city' => 'nullable|string|max:255',
            'witel' => 'nullable|string|max:255',
        ]);

        // Gunakan updateOrCreate untuk memperbarui jika NIPNAS sudah ada,
        // atau membuat data baru jika belum ada.
        ListPo::updateOrCreate(
            ['nipnas' => $validated['nipnas']], // Kunci untuk mencari
            [                                   // Data untuk di-update atau dibuat
                'po' => $validated['po'],
                'segment' => $validated['segment'] ?? '#N/A', // Default value jika kosong
                'bill_city' => $validated['bill_city'] ?? '#N/A',
                'witel' => $validated['witel'] ?? '#N/A',
            ]
        );

        // Redirect kembali ke halaman sebelumnya dengan pesan sukses
        return Redirect::back()->with('success', 'Data PO berhasil ditambahkan/diperbarui.');
    }

    public function cancelImport(Request $request)
    {
        $validated = $request->validate([
            'batch_id' => 'required|string',
        ]);

        $batch = Bus::findBatch($validated['batch_id']);

        if ($batch) {
            $batch->cancel();
            // Hapus cache progress agar tidak salah dibaca nanti
            Cache::forget('import_progress_'.$validated['batch_id']);

            return response()->json(['message' => 'Proses impor berhasil dibatalkan.']);
        }

        return response()->json(['message' => 'Batch tidak ditemukan.'], 404);
    }
}
