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

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'configuration' => 'array',
    ];
}
