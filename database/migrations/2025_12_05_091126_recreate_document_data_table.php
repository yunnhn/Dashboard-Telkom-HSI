<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // MATIKAN PENGECEKAN FOREIGN KEY
        // Ini wajib agar kita bisa menghapus tabel tanpa error
        Schema::disableForeignKeyConstraints();

        // 1. HAPUS TABEL ANAK DULU (order_products)
        Schema::dropIfExists('order_products');

        // 2. HAPUS TABEL INDUK (document_data)
        Schema::dropIfExists('document_data');

        // 3. BUAT ULANG TABEL document_data (Induk)
        Schema::create('document_data', function (Blueprint $table) {
            $table->id(); // Primary Key Baru (Auto Increment)

            $table->string('batch_id')->nullable()->index();

            // Order ID sekarang bisa duplikat, jadi HANYA kita beri index biasa
            $table->string('order_id')->index();

            $table->text('product')->nullable(); // Text agar muat panjang
            $table->decimal('net_price', 15, 2)->default(0);
            $table->boolean('is_template_price')->default(false);
            $table->boolean('products_processed')->default(false); // Kolom tambahan dari history migrasi Anda

            $table->text('milestone')->nullable();
            $table->string('previous_milestone')->nullable(); // Kolom tambahan dari history

            $table->string('segment')->nullable();
            $table->string('nama_witel')->nullable();
            $table->string('status_wfm')->nullable();
            $table->string('customer_name')->nullable();
            $table->string('channel')->nullable();
            $table->text('layanan')->nullable(); // Text
            $table->string('filter_produk')->nullable();
            $table->string('witel_lama')->nullable();
            $table->text('order_status')->nullable();
            $table->string('order_sub_type')->nullable();
            $table->string('order_status_n')->nullable();
            $table->string('tahun')->nullable();
            $table->string('telda')->nullable();
            $table->string('week')->nullable();

            $table->dateTime('order_date')->nullable();
            $table->dateTime('order_created_date')->nullable();

            $table->timestamps();
        });

        // 4. BUAT ULANG TABEL order_products (Anak)
        // Kita buat ulang sekalian agar sesuai dengan logika Job Import
        Schema::create('order_products', function (Blueprint $table) {
            $table->id();

            // Relasi ke order_id (String to String)
            // KITA TIDAK MEMBUAT FOREIGN KEY CONSTRAINT DISINI
            // Karena order_id di tabel induk tidak unique.
            $table->string('order_id')->index();

            $table->string('product_name')->nullable();
            $table->decimal('net_price', 15, 2)->default(0);
            $table->string('channel')->nullable();
            $table->string('status_wfm')->nullable();

            $table->timestamps();
        });

        // HIDUPKAN KEMBALI PENGECEKAN
        Schema::enableForeignKeyConstraints();
    }

    public function down(): void
    {
        Schema::disableForeignKeyConstraints();
        Schema::dropIfExists('order_products');
        Schema::dropIfExists('document_data');
        Schema::enableForeignKeyConstraints();
    }
};
