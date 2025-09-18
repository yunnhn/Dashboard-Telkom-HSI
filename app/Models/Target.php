<?php
// app/Models/Target.php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Target extends Model
{
    use HasFactory;

    protected $fillable = [
        'segment', 'nama_witel', 'metric_type', 'product_name', 'target_value', 'period'
    ];
}
