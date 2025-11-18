<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * Model PoData.
 *
 * Model ini terhubung ke tabel 'list_po' di database,
 * yang digunakan oleh halaman AnalysisJT dan AnalysisSOS.
 */
class PoData extends Model
{
    use HasFactory;

    /**
     * Nama tabel yang terhubung dengan model ini.
     * Sesuai permintaan Anda, ini menunjuk ke 'list_po'.
     *
     * @var string
     */
    protected $table = 'list_po';

    /**
     * Atribut yang dijaga dari mass assignment.
     *
     * @var array
     */
    protected $guarded = ['id'];

    /**
     * Tipe data asli dari atribut.
     *
     * @var array
     */
    protected $casts = [
        // Tambahkan casting jika ada kolom tanggal atau angka
        // 'tanggal_po' => 'date',
    ];
}
