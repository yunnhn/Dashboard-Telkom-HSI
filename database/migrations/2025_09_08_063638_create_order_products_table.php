<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('order_products', function (Blueprint $table) {
            $table->id();
            $table->string('order_id');
            $table->string('product_name');
            $table->decimal('net_price', 15, 2)->default(0); // Tipe data diubah ke decimal
            $table->timestamps();

            // Menghubungkan ke tabel document_data. Jika order dihapus, produknya ikut terhapus.
            $table->foreign('order_id')->references('order_id')->on('document_data')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('order_products');
    }
};
