<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('completed_orders', function (Blueprint $table) {
            // Menggunakan string untuk order_id agar cocok dengan tabel document_data
            $table->string('order_id')->primary();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('completed_orders');
    }
};
