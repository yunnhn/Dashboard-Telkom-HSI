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
        Schema::create('sos_data_raw', function (Blueprint $table) {
            $table->id();
            $table->string('batch_id')->index(); // OK: Index pada string

            // [PERBAIKAN INTENSIF] Mengubah tipe data TEXT untuk kolom yang diindeks menjadi STRING

            // Kolom Lain (Jika datanya pendek, sebaiknya diubah juga ke string)
            $table->text('accountnas')->nullable();
            $table->text('action_cd')->nullable();
            $table->text('agree_end_date')->nullable();
            $table->text('agree_itemnum')->nullable();
            $table->text('agree_name')->nullable();
            $table->text('agree_start_date')->nullable();
            $table->text('agree_type')->nullable();
            $table->text('am')->nullable();
            $table->text('amortisasi')->nullable();
            $table->text('asset_integ_id')->nullable();
            $table->text('before_bandwidth')->nullable();
            $table->text('biaya_pasang')->nullable();
            $table->text('bill_region')->nullable();
            $table->text('bill_witel')->nullable();
            $table->text('billaccntname')->nullable();
            $table->text('billaccntnum')->nullable();
            $table->text('billaddr')->nullable();
            $table->text('billcity')->nullable();
            $table->text('billcom_date')->nullable();
            $table->text('current_bandwidth')->nullable();
            $table->text('cust_region')->nullable();
            $table->text('cust_witel')->nullable();
            $table->text('custaccntname')->nullable();
            $table->text('custaccntnum')->nullable();
            $table->text('custaddr')->nullable();
            $table->text('custcity')->nullable();
            $table->text('hrg_bulanan')->nullable();
            $table->text('is_termin')->nullable();
            $table->text('kategori')->nullable();
            $table->text('kategori_umur')->nullable();
            $table->text('lama_kontrak_hari')->nullable();
            $table->text('li_billdate')->nullable();
            $table->text('li_billing_start_date')->nullable();
            $table->text('li_created_date')->nullable();
            $table->text('li_fulfillment_status')->nullable();
            $table->text('li_id')->nullable();
            $table->text('li_milestone')->nullable();
            $table->text('li_payment_term')->nullable();
            $table->text('li_product_name')->nullable();
            $table->text('li_productid')->nullable();
            $table->text('li_sid')->nullable();
            $table->text('li_status')->nullable();
            $table->text('li_status_date')->nullable();
            $table->text('line_item_description')->nullable();

            // PERBAIKAN: Mengubah TEXT ke STRING untuk kolom yang diindeks
            $table->string('nipnas', 191)->nullable()->index(); // Index untuk join cepat

            $table->text('order_created_date')->nullable();
            $table->text('order_createdby')->nullable();
            $table->text('order_createdby_name')->nullable();
            $table->text('order_description')->nullable();

            // PERBAIKAN: Mengubah TEXT ke STRING untuk kolom yang diindeks
            $table->string('order_id', 191)->nullable()->index(); // Index untuk join/upsert cepat

            $table->text('order_subtype')->nullable();
            $table->text('prevorder')->nullable();
            $table->text('product_activation_date')->nullable();
            $table->text('product_digital')->nullable();
            $table->text('quote_row_id')->nullable();
            $table->text('revenue')->nullable();
            $table->text('scaling')->nullable();
            $table->text('segmen')->nullable();
            $table->text('servaccntname')->nullable();
            $table->text('servaccntnum')->nullable();
            $table->text('servaddr')->nullable();
            $table->text('servcity')->nullable();
            $table->text('service_region')->nullable();
            $table->text('service_witel')->nullable();
            $table->text('sid')->nullable();
            $table->text('standard_name')->nullable();
            $table->text('sub_segmen')->nullable();
            $table->text('umur_order')->nullable();
            $table->text('x_billcomp_dt')->nullable();

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sos_data_raw');
    }
};
