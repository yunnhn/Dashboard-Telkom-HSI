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
        Schema::table('sos_data', function (Blueprint $table) {
            // [BARU] Tambahkan bill_city
            $table->string('bill_city')->nullable()->after('umur_order');

            // Sesuaikan 'after' pada kolom pertama
            $table->string('po_name')->nullable()->after('bill_city'); // Diubah dari 'umur_order'

            // Kolom-kolom lainnya tetap sama
            $table->string('tipe_order')->nullable()->after('po_name');
            $table->string('segmen_baru')->nullable()->after('tipe_order');
            $table->string('scalling1')->nullable()->after('segmen_baru');
            $table->string('scalling2')->nullable()->after('scalling1');
            $table->string('tipe_grup')->nullable()->after('scalling2');
            $table->string('witel_baru')->nullable()->after('tipe_grup');
            $table->string('kategori_baru')->nullable()->after('witel_baru');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('sos_data', function (Blueprint $table) {
            $table->dropColumn([
                'bill_city', // [BARU] Tambahkan di dropColumn
                'po_name',
                'tipe_order',
                'segmen_baru',
                'scalling1',
                'scalling2',
                'tipe_grup',
                'witel_baru',
                'kategori_baru'
            ]);
        });
    }
};
