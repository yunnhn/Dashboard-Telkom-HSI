<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * Model JtData.
 *
 * Model ini terhubung ke tabel 'spmk_mom' di database,
 * yang digunakan oleh halaman AnalysisJT.
 */
class JtData extends Model
{
    use HasFactory;

    protected $table = 'spmk_mom';

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
        'tanggal_spmk' => 'date',
        'target_selesai' => 'date',
        'tanggal_selesai_aktual' => 'date',
        'nilai_proyek' => 'decimal:2',
    ];
}
