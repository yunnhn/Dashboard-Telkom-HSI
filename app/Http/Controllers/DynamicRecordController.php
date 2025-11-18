<?php

namespace App\Http\Controllers;

// [UPDATE] Impor semua model yang benar sesuai info Anda
use App\Models\DocumentData; // Untuk Digital Product
use App\Models\JtData;       // Untuk JT
use App\Models\SosData;       // Untuk Datin
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Redirect;
use Inertia\Inertia;

class DynamicRecordController extends Controller
{
    /**
     * Menampilkan halaman edit dinamis untuk satu record.
     */
    public function edit(string $type, $id)
    {
        $modelClass = $this->getModelClass($type);
        if (!$modelClass) {
            abort(404, 'Tipe data tidak valid.');
        }

        // [PERBAIKAN 1] Logika dinamis untuk menemukan record
        // JT menggunakan 'id_i_hld', yang lain menggunakan 'order_id'
        if ($type === 'jt') {
            $record = $modelClass::where('id_i_hld', $id)->firstOrFail();
        } else {
            $record = $modelClass::where('order_id', $id)->firstOrFail();
        }

        $tableName = (new $modelClass)->getTable();
        $allColumns = Schema::getColumnListing($tableName);

        $hiddenColumns = ['id', 'created_at', 'updated_at', 'deleted_at'];
        if ($type === 'jt') {
            $hiddenColumns[] = 'id_i_hld'; // Sembunyikan ID JT
        } else {
            $hiddenColumns[] = 'order_id'; // Sembunyikan ID Datin/Digital
        }

        $columns = array_diff($allColumns, $hiddenColumns);

        // [PERBAIKAN 2] Pastikan path render 'record/edit' (e kecil)
        // Ini untuk mengatasi masalah "flicker"
        return Inertia::render('Record/Edit', [ // <-- 'edit' (lowercase)
            'record' => $record,
            'columns' => array_values($columns),
            'type' => $type,
            'pageTitle' => "Edit Data $type - (ID: $id)"
        ]);
    }

    /**
     * Mengupdate record.
     */
    public function update(Request $request, string $type, $id)
    {
        if (Auth::user()->role !== 'admin') {
            abort(403, 'Anda tidak memiliki izin untuk mengedit data.');
        }

        $modelClass = $this->getModelClass($type);
        if (!$modelClass) {
            abort(404, 'Tipe data tidak valid.');
        }

        // [PERBAIKAN 1] Logika dinamis untuk menemukan record (harus sama dengan 'edit')
        if ($type === 'jt') {
            $record = $modelClass::where('id_i_hld', $id)->firstOrFail();
        } else {
            $record = $modelClass::where('order_id', $id)->firstOrFail();
        }

        // Ambil data yang 'fillable' dari request
        // PENTING: Pastikan model JtData & SosData punya properti $fillable atau $guarded
        // Model JtData Anda menggunakan $guarded = ['id'], jadi semua kolom lain akan terisi.
        // Model SosData Anda (dari file sebelumnya) menggunakan $fillable, jadi pastikan semua kolom yang ingin diedit ada di sana.
        $fillableData = $request->except(['id', 'created_at', 'updated_at', 'deleted_at', 'id_i_hld', 'order_id']);


        $record->fill($fillableData);
        $record->save();

        return Redirect::back()->with('success', 'Data berhasil diperbarui!');
    }

    /**
     * Helper untuk memetakan string 'type' ke Class Model.
     */
    private function getModelClass(string $type): ?string
    {
        switch ($type) {
            // [PERBAIKAN 3] Tambahkan 'case' untuk 'galaksi'
            case 'galaksi':
            case 'digital_product':
            case 'galaksi_digital_product':
                return DocumentData::class;

            case 'datin':
            case 'galaksi_datin':
                return SosData::class;

            case 'jt':
                return JtData::class;

            default:
                return null;
        }
    }
}
