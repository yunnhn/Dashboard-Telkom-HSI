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
        Schema::table('spmk_mom', function (Blueprint $table) {
            // Kolom 1: Usia (dari tanggal_mom)
            // Kita buat nullable jika tanggal_mom terkadang kosong
            $table->integer('usia')->nullable()->after('tanggal_mom');

            // Kolom 2: PO Name
            $table->string('po_name')->nullable()->after('segmen');

            // Kolom 3: Go Live
            $table->char('go_live', 1)->default('N')->after('status_proyek');

            // Kolom 4: Populasi (Non Drop)
            $table->char('populasi_non_drop', 1)->default('Y')->after('ba_drop');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('spmk_mom', function (Blueprint $table) {
            $table->dropColumn([
                'usia',
                'po_name',
                'go_live',
                'populasi_non_drop',
            ]);
        });
    }
};
