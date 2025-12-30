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
        Schema::table('temp_upload_data', function (Blueprint $table) {
            // Menambahkan kolom batch_id setelah id
            // Diberi index agar proses pencarian/penghapusan cepat
            $table->string('batch_id')->nullable()->after('order_id')->index();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Cek dulu apakah tabelnya ada
        if (Schema::hasTable('temp_upload_data')) {
            Schema::table('temp_upload_data', function (Blueprint $table) {
                $table->dropColumn('batch_id');
            });
        }
    }
};
