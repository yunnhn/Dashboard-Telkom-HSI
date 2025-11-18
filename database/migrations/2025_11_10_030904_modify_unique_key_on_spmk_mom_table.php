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
            // 1. Hapus UNIQUE key yang salah dari 'no_nde_spmk'
            // 'spmk_mom_no_nde_spmk_unique' adalah nama constraint dari file header_spmk_mom.sql Anda
            $table->dropUnique('spmk_mom_no_nde_spmk_unique');

            // 2. Tambahkan UNIQUE key yang benar ke 'id_i_hld'
            // Kita juga tambahkan index biasa ke 'no_nde_spmk' untuk pencarian cepat
            $table->index('no_nde_spmk');
            $table->unique('id_i_hld', 'spmk_mom_id_i_hld_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('spmk_mom', function (Blueprint $table) {
            // 1. Hapus key yang benar
            $table->dropUnique('spmk_mom_id_i_hld_unique');
            $table->dropIndex('spmk_mom_no_nde_spmk_index'); // Hapus index biasa

            // 2. Kembalikan key yang salah (jika diperlukan rollback)
            $table->unique('no_nde_spmk', 'spmk_mom_no_nde_spmk_unique');
        });
    }
};
