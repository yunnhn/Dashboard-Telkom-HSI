<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('hsi_data', function (Blueprint $table) {
            // Tambahkan kolom witel_old setelah witel
            $table->string('witel_old')->nullable()->after('witel');
        });
    }

    public function down(): void
    {
        Schema::table('hsi_data', function (Blueprint $table) {
            $table->dropColumn('witel_old');
        });
    }
};