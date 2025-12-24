<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('hsi_data', function (Blueprint $table) {
            $table->id();

            // --- HEADER EXCEL (Urutan disesuaikan) ---
            $table->string('nomor')->nullable();            // NOMOR
            $table->string('order_id')->nullable()->index(); // ORDER_ID
            $table->string('regional')->nullable();         // REGIONAL
            $table->string('witel')->nullable();            // WITEL
            $table->string('regional_old')->nullable();     // REGIONAL_OLD
            $table->string('witel_old')->nullable();        // WITEL_OLD
            $table->string('datel')->nullable();            // DATEL
            $table->string('sto')->nullable();              // STO
            $table->string('unit')->nullable();             // UNIT
            $table->string('jenis_psb')->nullable();        // JENISPSB
            $table->string('type_trans')->nullable();       // TYPE_TRANS
            $table->string('type_layanan')->nullable();     // TYPE_LAYANAN
            $table->string('status_resume')->nullable();    // STATUS_RESUME
            $table->string('provider')->nullable();         // PROVIDER
            
            // Tanggal penting (DateTime agar bisa difilter per bulan/tahun)
            $table->dateTime('order_date')->nullable();         // ORDER_DATE
            $table->dateTime('last_updated_date')->nullable();  // LAST_UPDATED_DATE
            
            $table->string('ncli')->nullable();             // NCLI
            $table->string('pots')->nullable();             // POTS
            $table->string('speedy')->nullable();           // SPEEDY
            $table->string('customer_name')->nullable();    // CUSTOMER_NAME
            $table->string('loc_id')->nullable();           // LOC_ID
            $table->string('wonum')->nullable();            // WONUM
            $table->string('flag_deposit')->nullable();     // FLAG_DEPOSIT
            $table->string('contact_hp')->nullable();       // CONTACT_HP
            $table->text('ins_address')->nullable();        // INS_ADDRESS
            $table->string('gps_longitude')->nullable();    // GPS_LONGITUDE
            $table->string('gps_latitude')->nullable();     // GPS_LATITUDE
            $table->string('kcontact')->nullable();         // KCONTACT
            $table->string('channel')->nullable();          // CHANNEL
            $table->string('status_inet')->nullable();      // STATUS_INET
            $table->string('status_onu')->nullable();       // STATUS_ONU
            $table->string('upload')->nullable();           // UPLOAD
            $table->string('download')->nullable();         // DOWNLOAD
            $table->string('last_program')->nullable();     // LAST_PROGRAM
            $table->string('status_voice')->nullable();     // STATUS_VOICE
            $table->string('clid')->nullable();             // CLID
            $table->string('last_start')->nullable();       // LAST_START
            $table->string('tindak_lanjut')->nullable();    // TINDAK_LANJUT
            $table->text('isi_comment')->nullable();        // ISI_COMMENT
            $table->string('user_id_tl')->nullable();       // USER_ID_TL
            
            $table->dateTime('tgl_comment')->nullable();    // TGL_COMMENT
            $table->dateTime('tanggal_manja')->nullable();  // TANGGAL_MANJA
            
            $table->string('kelompok_kendala')->nullable(); // KELOMPOK_KENDALA
            $table->string('kelompok_status')->nullable();  // KELOMPOK_STATUS
            $table->string('hero')->nullable();             // HERO
            $table->string('addon')->nullable();            // ADDON
            
            $table->dateTime('tgl_ps')->nullable();         // TGL_PS
            
            $table->string('status_message')->nullable();   // STATUS_MESSAGE
            $table->string('package_name')->nullable();     // PACKAGE_NAME
            $table->string('group_paket')->nullable();      // GROUP_PAKET
            $table->string('reason_cancel')->nullable();    // REASON_CANCEL
            $table->text('keterangan_cancel')->nullable();  // KETERANGAN_CANCEL
            
            $table->dateTime('tgl_manja')->nullable();      // TGL_MANJA
            
            $table->string('detail_manja')->nullable();     // DETAIL_MANJA
            $table->string('suberrorcode')->nullable();     // SUBERRORCODE
            $table->string('engineermemo')->nullable();     // ENGINEERMEMO
            
            // Kolom Periode & Validasi
            $table->integer('tahun')->nullable();           // TAHUN
            $table->integer('bulan')->nullable();           // BULAN
            $table->integer('tanggal')->nullable();         // TANGGAL
            $table->string('ps_1')->nullable();             // PS 1
            $table->string('cek')->nullable();              // CEK
            $table->string('hasil')->nullable();            // HASIL
            $table->string('telda')->nullable();            // TELDA
            $table->string('data_proses')->nullable();      // DATA PROSES
            $table->string('no_order_revoke')->nullable();  // NO ORDER REVOKE
            $table->string('data_ps_revoke')->nullable();   // DATA PS REVOKE
            $table->string('untuk_ps_pi')->nullable();      // UNTUK PS/PI

            $table->timestamps(); // created_at, updated_at
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('hsi_data');
    }
};