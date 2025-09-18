<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CompletedOrder extends Model
{
    use HasFactory;

    // Tentukan nama tabel secara eksplisit
    protected $table = 'completed_orders';

    // Tentukan primary key dan tipenya
    protected $primaryKey = 'order_id';
    public $incrementing = false;
    protected $keyType = 'string';

    // Kolom yang boleh diisi
    protected $fillable = [
        'order_id',
    ];
}
