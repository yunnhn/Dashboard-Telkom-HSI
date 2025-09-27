<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TableConfiguration extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'page_name',
        'configuration',
    ];

    // Ini sangat penting!
    protected $casts = [
        'configuration' => 'array',
    ];
}
