<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('sos_data', function (Blueprint $table) {
            // Tambahkan kolom batch_id, bisa null, dan letakkan setelah 'updated_at'
            $table->string('batch_id')->nullable()->after('updated_at');

            // Tambahkan index untuk mempercepat kueri pencarian/penghapusan
            $table->index('batch_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('sos_data', function (Blueprint $table) {
            // Hapus index terlebih dahulu (nama default: nama_tabel_nama_kolom_index)
            $table->dropIndex('sos_data_batch_id_index');

            // Hapus kolomnya
            $table->dropColumn('batch_id');
        });
    }
};
