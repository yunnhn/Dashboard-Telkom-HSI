<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('document_data', function (Blueprint $table) {
            // KOLOM KUNCI
            $table->string('order_id')->primary();

            // DIUBAH: Tipe data 'string' menjadi 'text' untuk menampung nama produk yang panjang
            $table->text('product')->nullable()->comment('String produk mentah dari Excel, bisa sangat panjang');

            // KOLOM HASIL TRANSFORMASI (PENTING UNTUK DASHBOARD)
            $table->string('segment')->comment('Hasil kalkulasi: SME atau LEGS');
            $table->string('status_wfm')->comment('Hasil kalkulasi: done close bima atau in progress');

            // KOLOM DATA MENTAH DARI EXCEL
            $table->string('channel')->nullable();
            $table->string('filter_produk')->nullable();
            $table->string('witel_lama')->nullable();
            $table->string('layanan')->nullable();
            $table->timestamp('order_date')->nullable();
            $table->text('order_status')->nullable();
            $table->string('order_sub_type')->nullable();
            $table->string('order_status_n')->nullable();
            $table->string('nama_witel')->nullable();
            $table->string('customer_name')->nullable();
            $table->text('milestone')->nullable();
            $table->decimal('net_price', 15, 2)->default(0);
            $table->integer('tahun')->nullable();
            $table->string('telda')->nullable();
            $table->integer('week')->nullable();
            $table->timestamp('order_created_date')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('document_data');
    }
};

