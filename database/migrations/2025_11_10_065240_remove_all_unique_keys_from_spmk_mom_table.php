<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Helper untuk memeriksa apakah index ada.
     * Kita butuh ini karena state database Anda tidak pasti.
     */
    private function indexExists(Blueprint $table, string $indexName): bool
    {
        $connection = Schema::getConnection();
        $schema = $connection->getDatabaseName();

        $count = $connection->table('information_schema.statistics')
            ->where('table_schema', $schema)
            ->where('table_name', $table->getTable())
            ->where('index_name', $indexName)
            ->count();

        return $count > 0;
    }

    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('spmk_mom', function (Blueprint $table) {
            // [PERBAIKAN] Kita akan cek dulu sebelum menghapus

            // 1. Hapus 'spmk_mom_no_nde_spmk_unique' JIKA ADA
            if ($this->indexExists($table, 'spmk_mom_no_nde_spmk_unique')) {
                $table->dropUnique('spmk_mom_no_nde_spmk_unique');
            }

            // 2. Hapus 'spmk_mom_id_i_hld_unique' JIKA ADA
            if ($this->indexExists($table, 'spmk_mom_id_i_hld_unique')) {
                $table->dropUnique('spmk_mom_id_i_hld_unique');
            }

            // 3. Tambahkan index BIASA (non-unik) JIKA BELUM ADA
            if (!$this->indexExists($table, 'spmk_mom_id_i_hld_index')) {
                $table->index('id_i_hld');
            }
            if (!$this->indexExists($table, 'spmk_mom_no_nde_spmk_index')) {
                $table->index('no_nde_spmk');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('spmk_mom', function (Blueprint $table) {
            // Hapus index biasa JIKA ADA
            if ($this->indexExists($table, 'spmk_mom_id_i_hld_index')) {
                $table->dropIndex('spmk_mom_id_i_hld_index');
            }
            if ($this->indexExists($table, 'spmk_mom_no_nde_spmk_index')) {
                $table->dropIndex('spmk_mom_no_nde_spmk_index');
            }

            // Kembalikan ke keadaan asli (sesuai file .sql)
            if (!$this->indexExists($table, 'spmk_mom_no_nde_spmk_unique')) {
                $table->unique('no_nde_spmk', 'spmk_mom_no_nde_spmk_unique');
            }
        });
    }
};
