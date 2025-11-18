<?php
// ...
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sos_data_raw', function (Blueprint $table) {
            // Tambahkan kolom baru. 'nullable()' penting agar tidak error.
            // Anda bisa taruh ->after('kolom_lain') jika ingin rapi.
            $table->string('li_bandwidth')->nullable()->after('lama_kontrak_hari');
        });
    }

    public function down(): void
    {
        Schema::table('sos_data_raw', function (Blueprint $table) {
            $table->dropColumn('li_bandwidth');
        });
    }
};
