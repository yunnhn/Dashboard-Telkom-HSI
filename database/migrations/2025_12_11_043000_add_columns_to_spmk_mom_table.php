<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('spmk_mom', function (Blueprint $table) {
            // Menambahkan kolom tanggal_golive dengan tipe DATE
            // nullable() digunakan agar tidak error jika ada data lama yang kosong
            $table->date('tanggal_golive')->nullable()->after('po_name');

            // Menambahkan kolom konfirmasi_po (bisa string atau boolean, di sini saya contohkan string)
            $table->string('konfirmasi_po')->nullable()->after('tanggal_golive');
        });
    }

    public function down(): void
    {
        Schema::table('spmk_mom', function (Blueprint $table) {
            // Menghapus kolom jika migration di-rollback
            $table->dropColumn(['tanggal_golive', 'konfirmasi_po']);
        });
    }
};
