<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('order_products', function (Blueprint $table) {
            // Menambahkan kolom 'channel' setelah 'net_price'
            $table->string('channel')->nullable()->after('net_price');
            // Menambahkan kolom 'status_wfm' setelah 'channel'
            $table->string('status_wfm')->nullable()->after('channel');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('order_products', function (Blueprint $table) {
            // Menghapus kolom jika migrasi di-rollback
            $table->dropColumn(['channel', 'status_wfm']);
        });
    }
};
