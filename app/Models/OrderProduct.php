<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class OrderProduct extends Model
{
    use HasFactory;

    protected $table = 'order_products';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    // [PERUBAHAN] Tambahkan 'channel' dan 'status_wfm'
    protected $fillable = [
        'order_id',
        'product_name',
        'net_price',
        'channel',
        'status_wfm',
    ];
}
