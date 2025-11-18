<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * Model TableConfiguration.
 *
 * Model ini terhubung ke tabel 'user_table_configurations' yang
 * menyimpan preferensi tampilan tabel kustom untuk setiap halaman.
 */
class TableConfiguration extends Model
{
    use HasFactory;

    /**
     * [PERBAIKAN]
     * Nama tabel yang terhubung dengan model ini.
     * Diubah dari 'table_configurations' menjadi 'user_table_configurations'
     * agar sesuai dengan file .sql Anda.
     *
     * @var string
     */
    protected $table = 'user_table_configurations';

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
        // Secara otomatis mengubah JSON dari DB menjadi array PHP
        'configuration' => 'array',
    ];
}
