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
        Schema::create('hsi_data', function (Blueprint $table) {
            $table->id();
            
            // --- KOLOM DATA ---
            $table->string('nomor_order')->nullable()->index(); // Index agar pencarian cepat
            $table->string('regional')->nullable();
            $table->string('witel')->nullable();
            $table->string('sto')->nullable();
            $table->string('unit')->nullable();
            $table->string('jenis_psb')->nullable();
            $table->string('type_trans')->nullable();
            $table->string('type_layanan')->nullable();
            $table->string('status_resume')->nullable();
            $table->string('provider')->nullable();

            // --- BAGIAN PENTING: TIPE DATA TANGGAL ---
            // Harus dateTime atau date agar fitur filter tanggal bekerja!
            $table->dateTime('order_date')->nullable();
            $table->dateTime('last_updated_date')->nullable();
            $table->dateTime('tgl_ps')->nullable();
            $table->dateTime('tgl_manja')->nullable();
            // -----------------------------------------

            $table->string('ncli')->nullable();
            $table->string('pots')->nullable();
            $table->string('speedy')->nullable();
            $table->string('customer_name')->nullable();
            $table->string('loc_id')->nullable();
            $table->string('wonum')->nullable();
            $table->string('contact_hp')->nullable();
            $table->text('ins_address')->nullable();
            $table->string('gps_longitude')->nullable();
            $table->string('gps_latitude')->nullable();
            $table->string('kcontact')->nullable();
            $table->string('channel')->nullable();
            $table->string('status_inet')->nullable();
            $table->string('status_onu')->nullable();
            $table->string('upload')->nullable();
            $table->string('download')->nullable();
            $table->string('last_program')->nullable();
            $table->string('status_voice')->nullable();
            $table->string('clid')->nullable();
            $table->string('last_start')->nullable();
            $table->string('tindak_lanjut')->nullable();
            $table->text('isi_comment')->nullable();
            $table->string('user_id_tl')->nullable();
            $table->string('kelompok_kendala')->nullable();
            $table->string('kelompok_status')->nullable();
            $table->string('hero_addon')->nullable();
            $table->string('status_message')->nullable();
            $table->string('package_name')->nullable();
            $table->string('group_paket')->nullable();
            $table->string('reason_cancel')->nullable();
            $table->text('keterangan_cancel')->nullable();
            $table->string('detail_manja')->nullable();
            $table->string('sub_error_code')->nullable();
            $table->string('engineer_memo')->nullable();
            $table->string('data_proses')->nullable();
            $table->string('no_order_reval')->nullable();
            $table->string('data_ps_revoke')->nullable();
            
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('hsi_data');
    }
};