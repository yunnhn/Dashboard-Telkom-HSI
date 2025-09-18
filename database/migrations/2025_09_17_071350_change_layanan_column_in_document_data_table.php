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
        Schema::table('document_data', function (Blueprint $table) {
            // Mengubah tipe kolom 'layanan' menjadi TEXT
            $table->text('layanan')->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('document_data', function (Blueprint $table) {
            // Mengembalikan tipe kolom jika migrasi di-rollback (sesuaikan panjangnya jika perlu)
            $table->string('layanan', 255)->nullable()->change();
        });
    }
};
