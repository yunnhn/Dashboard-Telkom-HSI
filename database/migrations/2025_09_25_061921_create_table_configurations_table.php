<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('table_configurations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->string('page_name')->default('analysis_digital_product'); // Penanda halaman
            $table->json('configuration'); // Kolom untuk menyimpan objek tableConfig
            $table->timestamps();

            $table->unique(['user_id', 'page_name']); // Setiap user hanya punya 1 config per halaman
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('table_configurations');
    }
};
