<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('update_logs', function (Blueprint $table) {
            $table->id();
            $table->string('order_id')->index();
            $table->string('product_name')->nullable();
            $table->string('customer_name')->nullable();
            $table->string('nama_witel')->nullable();
            $table->string('status_lama');
            $table->string('status_baru');
            $table->string('sumber_update'); // e.g., 'Upload Complete', 'Upload Cancel', 'Manual'
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('update_logs');
    }
};
