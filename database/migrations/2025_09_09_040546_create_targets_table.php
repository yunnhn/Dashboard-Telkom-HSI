<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    // ..._create_targets_table.php
    public function up(): void
    {
        Schema::create('targets', function (Blueprint $table) {
            $table->id();
            $table->string('segment'); // SME atau LEGS
            $table->string('nama_witel');
            $table->string('metric_type'); // 'prov_comp' atau 'revenue'
            $table->string('product_name'); // 'Netmonk', 'OCA', 'AE', 'PS'
            $table->decimal('target_value', 15, 2);
            $table->date('period'); // contoh: 2025-09-01
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('targets');
    }
};
