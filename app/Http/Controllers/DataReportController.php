<?php

namespace App\Http\Controllers;

use App\Exports\DataReportExport;
use App\Exports\InProgressExport;
use App\Models\DocumentData;
use App\Models\OrderProduct;
use App\Models\Target;
use App\Models\UserTableConfiguration;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Maatwebsite\Excel\Facades\Excel;

class DataReportController extends Controller
{
    public function index(Request $request)
    {
        $request->validate([
            'month' => 'nullable|date_format:Y-m',
            'year' => 'nullable|integer|digits:4',
            'witel' => 'nullable|string|max:255',
        ]);

        $currentMonth = $request->input('month', now()->format('Y-m'));
        $selectedYear = $request->input('year', now()->year);
        $selectedWitel = $request->input('witel');
        $reportPeriod = Carbon::parse($currentMonth)->startOfMonth();

        // [LOGIKA CUT OFF] Ambil tanggal order terbaru sebagai patokan.
        $latestCutOff = DocumentData::query()
            ->whereNotNull('order_created_date')
            ->latest('order_created_date')
            ->value('order_created_date');
        $cutOffDate = $latestCutOff ? Carbon::parse($latestCutOff)->format('d F Y H:i:s') : 'N/A';

        // [LOGIKA UTAMA] Ambil data untuk KEDUA segmen untuk ditampilkan
        $smeReportData = $this->getReportDataForSegment('SME', $reportPeriod);
        $legsReportData = $this->getReportDataForSegment('LEGS', $reportPeriod); // 'all' untuk mengambil data sepanjang tahun

        // Ambil data In Progress untuk tabel detail, dengan filter
        $inProgressData = DocumentData::query()
            ->select('order_id', 'milestone', 'order_status_n', 'product', 'nama_witel', 'customer_name', 'order_created_date')
            ->where('status_wfm', 'in progress')
            ->whereYear('order_created_date', $selectedYear)
            ->when($selectedWitel, fn ($q, $w) => $q->where('nama_witel', $w))
            ->orderBy('order_created_date', 'desc')
            ->paginate(10, ['*'], 'in_progress_page')
            ->withQueryString();

        // Ambil Konfigurasi Tampilan Dinamis
        $smeConfigRecord = UserTableConfiguration::where('page_name', 'analysis_digital_sme')->first();
        $legsConfigRecord = UserTableConfiguration::where('page_name', 'analysis_digital_legs')->first();

        $witelList = DocumentData::query()->select('nama_witel')->whereNotNull('nama_witel')->distinct()->orderBy('nama_witel')->pluck('nama_witel');

        return Inertia::render('DataReport', [
            'smeReportData' => $smeReportData,
            'legsReportData' => $legsReportData,
            'inProgressData' => $inProgressData,
            'filters' => $request->only(['month', 'year', 'witel', 'segment']),
            'smeConfig' => $smeConfigRecord ? $smeConfigRecord->configuration : null,
            'legsConfig' => $legsConfigRecord ? $legsConfigRecord->configuration : null,
            'filterOptions' => ['witelList' => $witelList],
            'cutOffDate' => $cutOffDate,
        ]);
    }

    public function export(Request $request)
    {
        $validated = $request->validate([
            'month' => 'required|date_format:Y-m',
            // 'segment' tidak lagi diperlukan di validasi karena kita ambil keduanya
        ]);

        $periodInput = $validated['month'];
        $reportPeriod = Carbon::parse($periodInput)->startOfMonth();

        // 1. Ambil data untuk KEDUA segmen
        $reportDataSme = $this->getReportDataForSegment('SME', $reportPeriod);
        $reportDataLegs = $this->getReportDataForSegment('LEGS', $reportPeriod);

        // 2. Ambil Konfigurasi Dinamis HANYA untuk SME
        // Perhatikan: Konfigurasi LEGS sudah di-hardcode di dalam datareport.blade.php Anda,
        // jadi kita hanya perlu mengambil yang SME dari database.
        $smeConfigRecord = UserTableConfiguration::where('page_name', 'analysis_digital_sme')->first();

        // Gunakan template fallback jika config SME tidak ditemukan di DB
        $tableConfigSme = $smeConfigRecord ? $smeConfigRecord->configuration : $this->getSmeTemplate();

        // 3. Hitung 'details' untuk KEDUA segmen
        $detailsSme = $this->calculateDetails($reportDataSme);
        $detailsLegs = $this->calculateDetails($reportDataLegs);

        // 4. Siapkan nama file dan panggil Export Class
        $fileName = 'Data_Report_All_Segments_'.$reportPeriod->format('F_Y').'.xlsx';

        return Excel::download(new DataReportExport(
            $reportDataLegs,
            $reportDataSme,
            $tableConfigSme, // Hanya config SME yang dinamis
            $detailsLegs,
            $detailsSme,
            $periodInput
        ), $fileName);
    }

    private function calculateDetails(array $reportData): array
    {
        $ogp = 0;
        $closed = 0;
        foreach ($reportData as $item) {
            $ogp += ($item['in_progress_n'] ?? 0) + ($item['in_progress_o'] ?? 0) + ($item['in_progress_ae'] ?? 0) + ($item['in_progress_ps'] ?? 0);
            $closed += ($item['prov_comp_n_realisasi'] ?? 0) + ($item['prov_comp_o_realisasi'] ?? 0) + ($item['prov_comp_ae_realisasi'] ?? 0) + ($item['prov_comp_ps_realisasi'] ?? 0);
        }

        return ['total' => $ogp + $closed, 'ogp' => $ogp, 'closed' => $closed];
    }

    private function getReportDataForSegment(string $segment, $period)
    {
        $masterWitelList = ['BALI', 'JATIM BARAT', 'JATIM TIMUR', 'NUSA TENGGARA', 'SURAMADU'];
        $productMap = [
            'netmonk' => 'n',
            'oca' => 'o',
            'antares' => 'ae',
            'antares eazy' => 'ae',
            'antares eazysc' => 'ae',
            'pijar' => 'ps',
            'pijar sekolah' => 'ps',
        ];

        $reportDataMap = collect($masterWitelList)->mapWithKeys(function ($witel) use ($productMap) {
            $data = ['nama_witel' => $witel];
            $initials = array_unique(array_values($productMap));
            foreach ($initials as $initial) {
                $data["in_progress_{$initial}"] = 0;
                $data["prov_comp_{$initial}_realisasi"] = 0;
                $data["prov_comp_{$initial}_target"] = 0;
                $data["revenue_{$initial}_ach"] = 0;
                $data["revenue_{$initial}_target"] = 0;
            }

            return [$witel => $data];
        });

        // [MODIFIKASI UTAMA] Logika filter yang fleksibel
        $baseQuery = DocumentData::whereIn('nama_witel', $masterWitelList)->where('segment', $segment);

        if ($period instanceof Carbon) {
            // Logika filter bulanan (untuk SME)
            $realizationDocuments = $baseQuery->clone()
                ->where('status_wfm', 'done close bima')
                ->whereYear('order_date', $period->year)
                ->whereMonth('order_date', $period->month)
                ->get();

            $inProgressDocuments = $baseQuery->clone()
                ->where('status_wfm', 'in progress')
                ->whereYear('order_created_date', $period->year)
                ->whereMonth('order_created_date', $period->month)
                ->get();
        } else {
            // Logika "sepanjang waktu" (untuk LEGS, saat $period = 'all')
            $realizationDocuments = $baseQuery->clone()->where('status_wfm', 'done close bima')->get();
            $inProgressDocuments = $baseQuery->clone()->where('status_wfm', 'in progress')->get();
        }

        // Proses data (loop foreach) menggunakan nama variabel yang konsisten: $realizationDocuments
        foreach ($inProgressDocuments as $doc) {
            $witel = $doc->nama_witel;
            if (!$reportDataMap->has($witel)) {
                continue;
            }

            // ... (sisa logika loop in progress tidak berubah)
            if (str_contains($doc->product, '-')) {
                $bundleItems = DB::table('order_products')->where('order_id', $doc->order_id)->where('status_wfm', 'in progress')->get();
                foreach ($bundleItems as $item) {
                    $pName = strtolower(trim($item->product_name));
                    if (isset($productMap[$pName])) {
                        $currentData = $reportDataMap->get($witel);
                        $initial = $productMap[$pName];
                        ++$currentData["in_progress_{$initial}"];
                        $reportDataMap->put($witel, $currentData);
                    }
                }
            } else {
                $pName = strtolower(trim($doc->product));
                if (isset($productMap[$pName])) {
                    $currentData = $reportDataMap->get($witel);
                    $initial = $productMap[$pName];
                    ++$currentData["in_progress_{$initial}"];
                    $reportDataMap->put($witel, $currentData);
                }
            }
        }

        foreach ($realizationDocuments as $doc) { // <-- Pastikan menggunakan $realizationDocuments
            $witel = $doc->nama_witel;
            if (!$reportDataMap->has($witel)) {
                continue;
            }

            // ... (sisa logika loop realisasi tidak berubah)
            if (str_contains($doc->product, '-')) {
                $bundleItems = DB::table('order_products')->where('order_id', $doc->order_id)->where('status_wfm', 'done close bima')->get();
                foreach ($bundleItems as $item) {
                    $pName = strtolower(trim($item->product_name));
                    if (isset($productMap[$pName])) {
                        $currentData = $reportDataMap->get($witel);
                        $initial = $productMap[$pName];
                        ++$currentData["prov_comp_{$initial}_realisasi"];
                        $currentData["revenue_{$initial}_ach"] += $item->net_price;
                        $reportDataMap->put($witel, $currentData);
                    }
                }
            } else {
                $pName = strtolower(trim($doc->product));
                if (isset($productMap[$pName])) {
                    $currentData = $reportDataMap->get($witel);
                    $initial = $productMap[$pName];
                    ++$currentData["prov_comp_{$initial}_realisasi"];
                    $currentData["revenue_{$initial}_ach"] += $doc->net_price;
                    $reportDataMap->put($witel, $currentData);
                }
            }
        }

        if ($period instanceof Carbon) {
            $targets = Target::where('segment', $segment)->where('period', $period->format('Y-m-d'))->get();
            foreach ($targets as $target) {
                $witel = $target->nama_witel;
                $pName = strtolower(trim($target->product_name));
                if (isset($reportDataMap[$witel]) && isset($productMap[$pName])) {
                    $currentData = $reportDataMap->get($witel);
                    $initial = $productMap[$pName];
                    $metricKey = $target->metric_type;
                    $currentData["{$metricKey}_{$initial}_target"] = $target->target_value;
                    $reportDataMap->put($witel, $currentData);
                }
            }
        }

        foreach ($reportDataMap as $witel => $data) {
            $currentData = $reportDataMap->get($witel);
            foreach (array_unique(array_values($productMap)) as $initial) {
                $currentData["revenue_{$initial}_ach"] /= 1000000;
            }
            $reportDataMap->put($witel, $currentData);
        }

        return $reportDataMap->values()->map(fn ($item) => (array) $item)->all();
    }

    public function exportInProgress(Request $request)
    {
        // 1. Validasi diubah: 'segment' dihapus, 'month' diganti 'year'
        $validated = $request->validate([
            'year' => 'required|integer|digits:4', // Filter utama sekarang adalah tahun
            'witel' => 'nullable|string',
        ]);

        $year = $validated['year'];
        $witel = $validated['witel'] ?? null;

        // 2. Query diubah: klausa where('segment', ...) dihapus
        $inProgressData = DocumentData::query()
            ->where('status_wfm', 'in progress')
            // ->where('segment', $segment) // <-- BARIS INI DIHAPUS untuk mengambil semua segmen
            ->whereYear('order_created_date', $year) // Menggunakan order_created_date agar konsisten dengan tabel di halaman
            ->when($witel, function ($query, $witelValue) {
                return $query->where('nama_witel', $witelValue);
            })
            ->select(
                'order_id',
                'product as product_name',
                'nama_witel',
                'customer_name',
                'milestone',
                'order_created_date',
                'segment', // Kolom segment tetap diambil untuk ditampilkan di Excel
                'telda'
            )
            ->orderBy('order_created_date', 'desc')
            ->get();

        // 3. Nama file diubah agar lebih relevan
        $witelName = $witel ? str_replace(' ', '_', $witel) : 'ALL_WITEL';
        $fileName = "in_progress_ALL_SEGMENTS_{$witelName}_{$year}.xlsx";

        // 4. Panggil class export dengan data yang sudah difilter
        // Pastikan InProgressExport class Anda bisa menangani data ini
        return Excel::download(new InProgressExport($inProgressData, $witel), $fileName);
    }

    private function getSmeTemplate(): array
    {
        return [
            [
                'groupTitle' => 'In Progress',
                'groupClass' => 'bg-blue-600',
                'columnClass' => 'bg-blue-500',
                'columns' => [
                    ['key' => 'in_progress_n', 'title' => 'N'],
                    ['key' => 'in_progress_o', 'title' => 'O'],
                    ['key' => 'in_progress_ae', 'title' => 'AE'],
                    ['key' => 'in_progress_ps', 'title' => 'PS'],
                ],
                'subColumnClass' => 'bg-blue-400',
            ],
            [
                'groupTitle' => 'Prov Comp',
                'groupClass' => 'bg-orange-600',
                'columnClass' => 'bg-orange-400',
                'subColumnClass' => 'bg-orange-300',
                'columns' => [
                    [
                        'key' => 'prov_comp_n',
                        'title' => 'N',
                        'subColumns' => [
                            ['key' => '_target', 'title' => 'T'],
                            ['key' => '_realisasi', 'title' => 'R'],
                            [
                                'key' => '_percent',
                                'title' => 'P',
                                'type' => 'calculation',
                                'calculation' => [
                                    'operation' => 'percentage',
                                    'operands' => ['prov_comp_n_realisasi', 'prov_comp_n_target'],
                                ],
                            ],
                        ],
                    ],
                    [
                        'key' => 'prov_comp_o',
                        'title' => 'O',
                        'subColumns' => [
                            ['key' => '_target', 'title' => 'T'],
                            ['key' => '_realisasi', 'title' => 'R'],
                            [
                                'key' => '_percent',
                                'title' => 'P',
                                'type' => 'calculation',
                                'calculation' => [
                                    'operation' => 'percentage',
                                    'operands' => ['prov_comp_o_realisasi', 'prov_comp_o_target'],
                                ],
                            ],
                        ],
                    ],
                    [
                        'key' => 'prov_comp_ae',
                        'title' => 'AE',
                        'subColumns' => [
                            ['key' => '_target', 'title' => 'T'],
                            ['key' => '_realisasi', 'title' => 'R'],
                            [
                                'key' => '_percent',
                                'title' => 'P',
                                'type' => 'calculation',
                                'calculation' => [
                                    'operation' => 'percentage',
                                    'operands' => ['prov_comp_ae_realisasi', 'prov_comp_ae_target'],
                                ],
                            ],
                        ],
                    ],
                    [
                        'key' => 'prov_comp_ps',
                        'title' => 'PS',
                        'subColumns' => [
                            ['key' => '_target', 'title' => 'T'],
                            ['key' => '_realisasi', 'title' => 'R'],
                            [
                                'key' => '_percent',
                                'title' => 'P',
                                'type' => 'calculation',
                                'calculation' => [
                                    'operation' => 'percentage',
                                    'operands' => ['prov_comp_ps_realisasi', 'prov_comp_ps_target'],
                                ],
                            ],
                        ],
                    ],
                ],
            ],
            [
                'groupTitle' => 'REVENUE (Rp Juta)',
                'groupClass' => 'bg-green-700',
                'columnClass' => 'bg-green-500',
                'subColumnClass' => 'bg-green-300',
                'columns' => [
                    [
                        'key' => 'revenue_n',
                        'title' => 'N',
                        'subColumns' => [
                            ['key' => '_ach', 'title' => 'ACH'],
                            ['key' => '_target', 'title' => 'T'],
                        ],
                    ],
                    [
                        'key' => 'revenue_o',
                        'title' => 'O',
                        'subColumns' => [
                            ['key' => '_ach', 'title' => 'ACH'],
                            ['key' => '_target', 'title' => 'T'],
                        ],
                    ],
                    [
                        'key' => 'revenue_ae',
                        'title' => 'AE',
                        'subColumns' => [
                            ['key' => '_ach', 'title' => 'ACH'],
                            ['key' => '_target', 'title' => 'T'],
                        ],
                    ],
                    [
                        'key' => 'revenue_ps',
                        'title' => 'PS',
                        'subColumns' => [
                            ['key' => '_ach', 'title' => 'ACH'],
                            ['key' => '_target', 'title' => 'T'],
                        ],
                    ],
                ],
            ],
            [
                'groupTitle' => 'Grand Total',
                'groupClass' => 'bg-gray-600',
                'columnClass' => 'bg-gray-500',
                'columns' => [
                    [
                        'key' => 'grand_total_target',
                        'title' => 'T',
                        'type' => 'calculation',
                        'calculation' => [
                            'operation' => 'sum',
                            'operands' => [
                                'prov_comp_n_target',
                                'prov_comp_o_target',
                                'prov_comp_ae_target',
                                'prov_comp_ps_target',
                            ],
                        ],
                    ],
                    [
                        'key' => 'grand_total_realisasi',
                        'title' => 'R',
                        'type' => 'calculation',
                        'calculation' => [
                            'operation' => 'sum',
                            'operands' => [
                                'prov_comp_n_realisasi',
                                'prov_comp_o_realisasi',
                                'prov_comp_ae_realisasi',
                                'prov_comp_ps_realisasi',
                            ],
                        ],
                    ],
                    [
                        'key' => 'grand_total_persentase',
                        'title' => 'P',
                        'type' => 'calculation',
                        'calculation' => [
                            'operation' => 'percentage',
                            'operands' => [
                                'grand_total_realisasi',
                                'grand_total_target',
                            ],
                        ],
                    ],
                ],
            ],
        ];
    }

    public function showDetails(Request $request)
    {
        $validated = $request->validate([
            'segment' => 'required|string|in:SME,LEGS',
            'witel' => 'required|string',
            'month' => 'required|date_format:Y-m',
            'kpi_key' => 'required|string', // misal: "in_progress_n" atau "prov_comp_o_realisasi"
        ]);

        $period = Carbon::parse($validated['month']);

        // 1. Tentukan Status (in progress / done)
        $isDone = str_contains($validated['kpi_key'], 'prov_comp');
        $statusWfm = $isDone ? 'done close bima' : 'in progress';

        // 2. Tentukan Produk (n, o, ae, ps)
        $productMap = [
            'n' => ['netmonk'],
            'o' => ['oca'],
            'ae' => ['antares', 'antares eazy', 'antares eazysc'],
            'ps' => ['pijar', 'pijar sekolah'],
        ];

        // Ekstrak inisial produk dari kpi_key
        $keyParts = explode('_', $validated['kpi_key']);
        $productInitial = end($keyParts); // 'n', 'o', 'ae', 'ps', atau 'realisasi'

        // Handle 'realisasi' (untuk prov_comp_..._realisasi)
        if ($productInitial === 'realisasi') {
            $productInitial = $keyParts[count($keyParts) - 2]; // ambil satu sebelum 'realisasi'
        }

        // Jika key tidak ada di map, kembalikan array kosong
        if (!isset($productMap[$productInitial])) {
             return Inertia::render('DataReport/Details', [
                'orders' => [],
                'pageTitle' => "Detail Laporan (Produk tidak dikenal)",
                'filters' => $validated,
            ]);
        }
        $targetProducts = $productMap[$productInitial];

        // 3. Tentukan Kolom Tanggal
        $dateColumn = $isDone ? 'order_date' : 'order_created_date';

        // 4. Query Order Tunggal (dari DocumentData)
        $singleOrders = DocumentData::where('segment', $validated['segment'])
            ->where('nama_witel', $validated['witel'])
            ->where('status_wfm', $statusWfm)
            ->whereYear($dateColumn, $period->year)
            ->whereMonth($dateColumn, $period->month)
            ->where(function ($query) use ($targetProducts) {
                foreach ($targetProducts as $product) {
                    $query->orWhereRaw('LOWER(TRIM(product)) = ?', [$product]);
                }
            })
            ->select('order_id', 'product', 'customer_name', $dateColumn . ' as tanggal', 'milestone', 'status_wfm')
            ->get();

        // 5. Query Order Bundle (dari OrderProduct)
        $bundleOrders = DB::table('order_products')
            ->join('document_data', 'order_products.order_id', '=', 'document_data.order_id')
            ->where('document_data.segment', $validated['segment'])
            ->where('document_data.nama_witel', $validated['witel'])
            ->where('order_products.status_wfm', $statusWfm)
            ->whereYear('document_data.' . $dateColumn, $period->year)
            ->whereMonth('document_data.' . $dateColumn, $period->month)
            ->where(function ($query) use ($targetProducts) {
                foreach ($targetProducts as $product) {
                    $query->orWhereRaw('LOWER(TRIM(order_products.product_name)) = ?', [$product]);
                }
            })
            ->select('order_products.order_id', 'order_products.product_name as product', 'document_data.customer_name', 'document_data.' . $dateColumn . ' as tanggal', 'document_data.milestone', 'order_products.status_wfm')
            ->get();

        $allOrders = $singleOrders->merge($bundleOrders)->sortByDesc('tanggal');

        return Inertia::render('DataReport/Details', [
            'orders' => $allOrders->values(),
            'pageTitle' => "Detail Laporan",
            'filters' => $validated,
        ]);
    }
}
