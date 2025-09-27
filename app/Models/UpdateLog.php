<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class UpdateLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'order_id',
        'product_name',
        'customer_name',
        'nama_witel',
        'status_lama',
        'status_baru',
        'sumber_update',
    ];
}
