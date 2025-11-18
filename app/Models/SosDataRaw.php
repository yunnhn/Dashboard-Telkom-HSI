<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SosDataRaw extends Model
{
    protected $table = 'sos_data_raw';

    // Izinkan semua kolom diisi
    protected $guarded = [];
}
