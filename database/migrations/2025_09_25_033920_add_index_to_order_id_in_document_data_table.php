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
            $table->index('order_id'); // atau ->unique('order_id') jika seharusnya unik
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('document_data', function (Blueprint $table) {
            //
        });
    }
};
