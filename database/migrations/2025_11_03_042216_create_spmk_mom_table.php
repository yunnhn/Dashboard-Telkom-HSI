<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('spmk_mom', function (Blueprint $table) {
            $table->id();

            // Kolom yang sudah ada dan sesuai
            $table->string('bulan', 7)->nullable()->comment('Dari Excel: BULAN');
            $table->year('tahun')->nullable()->comment('Dari Excel: TAHUN');
            $table->string('region')->nullable()->comment('Dari Excel: REGION');
            $table->string('witel_lama')->nullable()->comment('Dari Excel: Witel Lama');
            $table->string('witel_baru')->nullable()->comment('Dari Excel: Witel Baru');

            // Kolom yang di-rename dari migrasi/SQL lama
            $table->string('id_i_hld')->nullable()->comment('Rename dari: id_i-hld (Sesuai Excel: ID i-HLD)');
            $table->string('no_nde_spmk')->nullable()->unique()->comment('Rename dari: nomor_spmk (Sesuai Excel: No NDE SPMK)');
            $table->text('uraian_kegiatan')->nullable()->comment('Rename dari: nama_project (Sesuai Excel: Uraian Kegiatan)');
            $table->string('segmen')->nullable()->comment('Rename dari: nama_pelanggan (Sesuai Excel: Segmen)');
            $table->date('tanggal_cb')->nullable()->comment('Rename dari: tanggal_spmk (Sesuai Excel: Tanggal CB)');
            $table->string('jenis_kegiatan')->nullable()->comment('Rename dari: jenis_layanan (Sesuai Excel: Jenis Kegiatan)');
            $table->decimal('revenue_plan', 15, 2)->nullable()->comment('Rename dari: nilai_proyek (Sesuai Excel: Revenue Plan)');
            $table->string('status_proyek')->nullable()->comment('Rename dari: status (Sesuai Excel: Status Proyek)');
            $table->text('keterangan_toc')->nullable()->comment('Rename dari: keterangan (Sesuai Excel: Keterangan TOC)');

            // Kolom BARU yang ditambahkan dari Excel
            $table->text('perihal_nde_spmk')->nullable()->comment('Dari Excel: Perihal NDE SPMK');
            $table->string('mom')->nullable()->comment('Dari Excel: MoM');
            $table->string('ba_drop')->nullable()->comment('Dari Excel: BA Drop');
            $table->date('tanggal_mom')->nullable()->comment('Dari Excel: Tanggal MoM');
            $table->decimal('rab', 15, 2)->nullable()->comment('Dari Excel: RAB');
            $table->string('total_port')->nullable()->comment('Dari Excel: Total Port');
            $table->string('template_durasi')->nullable()->comment('Dari Excel: Template Durasi');
            $table->string('toc')->nullable()->comment('Dari Excel: TOC');
            $table->string('umur_pekerjaan')->nullable()->comment('Dari Excel: Umur Pekerjaan');
            $table->string('kategori_umur_pekerjaan')->nullable()->comment('Dari Excel: Kategori Umur Pekerjaan');
            $table->string('status_tomps_last_activity')->nullable()->comment('Dari Excel: Status Tomps - Last Activity');
            $table->string('status_tomps_new')->nullable()->comment('Dari Excel: Status Tomps New');
            $table->string('status_i_hld')->nullable()->comment('Dari Excel: Status i-HLD');
            $table->string('nama_odp_go_live')->nullable()->comment('Dari Excel: Nama ODP GO LIVE');
            $table->string('bak')->nullable()->comment('Dari Excel: BAK');
            $table->text('keterangan_pelimpahan')->nullable()->comment('Dari Excel: Keterangan Pelimpahan');
            $table->string('mitra_lokal')->nullable()->comment('Dari Excel: Mitra Lokal');

            // Kolom yang dihapus dari migrasi lama (karena tidak ada di Excel):
            // - lokasi_pekerjaan
            // - target_selesai
            // - tanggal_selesai_aktual

            // Timestamps standar Laravel
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('spmk_mom');
    }
};
