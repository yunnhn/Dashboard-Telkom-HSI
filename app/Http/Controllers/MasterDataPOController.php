<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\ListPo;
use App\Models\SosData;
use App\Jobs\ProcessListPoImport;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Redirect;
use Inertia\Inertia;

class MasterDataPOController extends Controller
{
    public function index(Request $request)
    {
        $paginationCount = 15;

        // 1. Data Master PO (List PO)
        $listPoData = ListPo::latest()->paginate(10, ['*'], 'list_po_page')->withQueryString();

        // 2. Data PO Belum Ter-mapping (Unmapped)
        // Mengambil data dari SosData (Datin) yang PO-nya belum terdefinisi
        $mainWitelList = ['BALI', 'JATIM BARAT', 'JATIM TIMUR', 'NUSA TENGGARA', 'SURAMADU'];

        $unmappedPoData = SosData::query()
            ->where('po_name', 'PO_TIDAK_TERDEFINISI')
            ->whereIn('bill_witel', $mainWitelList)
            ->select('id', 'order_id', 'nipnas', 'standard_name', 'bill_witel', 'po_name', 'segmen', 'bill_city', 'witel_baru', 'cust_city', 'serv_city')
            ->latest('order_created_date')
            ->paginate($paginationCount, ['*'], 'unmapped_po_page')->withQueryString();

        // 3. Opsi PO untuk Dropdown Mapping
        $existingPoNames = ListPo::query()
            ->select('po')
            ->whereNotNull('po')
            ->where('po', '!=', '')
            ->whereNotIn('po', ['PO_TIDAK_TERDEFINISI', 'HOLD', 'LANDING', '#N/A'])
            ->distinct()
            ->orderBy('po')
            ->pluck('po');

        return Inertia::render('Admin/MasterDataPO', [
            'listPoData' => $listPoData,
            'unmappedPoData' => $unmappedPoData,
            'poListOptions' => $existingPoNames,
        ]);
    }

    public function upload(Request $request)
    {
        $request->validate(['po_document' => 'required|file|mimes:xlsx,xls,csv']);

        $path = $request->file('po_document')->store('excel-imports', 'local');

        $batch = Bus::batch([
            new ProcessListPoImport($path),
        ])->name('Import Daftar PO')->dispatch();

        // Redirect kembali ke index Master Data PO dengan batch_id untuk polling
        return Redirect::route('admin.masterDataPO.index', ['po_batch_id' => $batch->id])
            ->with('info', 'File Daftar PO sedang diproses di latar belakang!');
    }

    public function store(Request $request)
    {
        // Tambah Manual Master PO
        $validated = $request->validate([
            'po' => 'required|string|max:255',
            'nipnas' => 'required|string|max:255',
            'segment' => 'nullable|string|max:255',
            'bill_city' => 'nullable|string|max:255',
            'witel' => 'nullable|string|max:255',
        ]);

        ListPo::updateOrCreate(
            ['nipnas' => $validated['nipnas']],
            [
                'po' => $validated['po'],
                'segment' => $validated['segment'] ?? null,
                'bill_city' => $validated['bill_city'] ?? null,
                'witel' => $validated['witel'] ?? null,
            ]
        );

        return Redirect::back()->with('success', 'Master Data PO berhasil ditambahkan.');
    }

    public function updateMapping(Request $request)
    {
        // Logic mapping PO Name pada data transaksi (dari UnmappedPoList)
        // Sama persis dengan updatePoName di controller sebelumnya
        $validated = $request->validate([
            'order_id' => 'required|string|exists:sos_data,order_id',
            'po_name' => 'required|string|max:255',
            'nipnas' => 'required|string|max:255',
            'segmen' => 'nullable|string',
            'bill_city' => 'nullable|string',
            'witel_baru' => 'nullable|string',
        ]);

        $targetNipnas = trim($validated['nipnas']);
        $poNameBaru = trim($validated['po_name']);

        // ... (Logic penentuan Witel & Segmen disederhanakan/disalin dari AnalysisSOSController) ...
        // Agar ringkas, saya langsung update SosData di sini:

        $updateData = [
            'po_name' => $poNameBaru,
            'bill_city' => $validated['bill_city'],
        ];

        // Simpan update ke SosData
        SosData::where('order_id', $validated['order_id'])->update($updateData);

        // Update Master Data ListPo juga agar kedepannya otomatis
        ListPo::updateOrCreate(
            ['nipnas' => $targetNipnas],
            [
                'po' => $poNameBaru,
                'bill_city' => $validated['bill_city'] ?? null,
            ]
        );

        return Redirect::back()->with('success', "Data Order {$validated['order_id']} berhasil dimapping.");
    }
}
