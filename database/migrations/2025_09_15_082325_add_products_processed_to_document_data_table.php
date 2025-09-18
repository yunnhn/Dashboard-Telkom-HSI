<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('document_data', function (Blueprint $table) {
            $table->boolean('products_processed')
                  ->default(false)
                  ->after('net_price');
        });
    }

    public function down(): void
    {
        Schema::table('document_data', function (Blueprint $table) {
            $table->dropColumn('products_processed');
        });
    }
};
