<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class HsiData extends Model
{
    use HasFactory;

    protected $table = 'hsi_data';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        // 1. Identitas & Lokasi
        'nomor',
        'order_id',
        'regional',
        'witel',
        'regional_old',
        'witel_old',
        'datel',
        'sto',
        'unit',

        // 2. Detail Transaksi
        'jenis_psb',
        'type_trans',
        'type_layanan',
        'status_resume',
        'provider',

        // 3. Tanggal
        'order_date',
        'last_updated_date',

        // 4. Data Pelanggan & Teknis
        'ncli',
        'pots',
        'speedy',
        'customer_name',
        'loc_id',
        'wonum',
        'flag_deposit',
        'contact_hp',
        'ins_address',
        'gps_longitude',
        'gps_latitude',
        'kcontact',
        'channel',

        // 5. Status & Quality
        'status_inet',
        'status_onu',
        'upload',
        'download',
        'last_program',
        'status_voice',
        'clid',
        'last_start',

        // 6. Tindak Lanjut
        'tindak_lanjut',
        'isi_comment',
        'user_id_tl',
        'tgl_comment',
        'tanggal_manja',

        // 7. Kendala & Paket
        'kelompok_kendala',
        'kelompok_status',
        'hero',
        'addon',
        'tgl_ps',
        'status_message',
        'package_name',
        'group_paket',

        // 8. Pembatalan & Manja
        'reason_cancel',
        'keterangan_cancel',
        'tgl_manja',
        'detail_manja',
        'suberrorcode',
        'engineermemo',

        // 9. Periode & Proses
        'tahun',
        'bulan',
        'tanggal',
        'ps_1',
        'cek',
        'hasil',
        'telda',
        'data_proses',
        'no_order_revoke',
        'data_ps_revoke',
        'untuk_ps_pi',
    ];

    /**
     * Casting tipe data agar otomatis formatnya benar saat diambil
     */
    protected $casts = [
        'order_date' => 'datetime',
        'last_updated_date' => 'datetime',
        'tgl_comment' => 'datetime',
        'tanggal_manja' => 'datetime',
        'tgl_ps' => 'datetime',
        'tgl_manja' => 'datetime',
    ];
}