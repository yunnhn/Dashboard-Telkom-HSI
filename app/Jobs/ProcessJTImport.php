<?php

namespace App\Jobs;

use Illuminate\Bus\Batchable;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Cache; // [WAJIB] Tambahkan Cache

class ProcessJTImport implements ShouldQueue
{
    use Batchable, Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $timeout = 3600;
    protected $path;

    public function __construct(string $path)
    {
        $this->path = $path;
    }

    public function handle(): void
    {
        if ($this->batch() && $this->batch()->cancelled()) {
            return;
        }

        $currentBatchId = $this->batch()->id;

        // [PERBAIKAN 1] Inisialisasi progress di Cache
        Cache::put('import_progress_'.$currentBatchId, 0, now()->addHour());

        $temporaryTableName = null;
        $query = null;
        $insertColumns = null;
        $selectColumns = null;

        try {
            $temporaryTableName = 'temp_jt_import_'.Str::random(10);
            Log::info("Membuat tabel sementara: {$temporaryTableName}");

            $filePath = Storage::disk('local')->path($this->path);
            $filePath = str_replace('\\', '/', $filePath);

            // ... (Definisi $csvHeaders, $createStatement, $loadDataVariables, $setStatement tetap sama)
            // [CUT] Logika string query...
            $csvHeaders = [
                'BULAN', 'TAHUN', 'ID i-HLD', 'REGION', 'Witel Lama', 'Witel Baru',
                'No NDE SPMK', 'Perihal NDE SPMK', 'MoM', 'BA Drop', 'Uraian Kegiatan',
                'Segmen', 'Tanggal CB', 'Tanggal MoM', 'Jenis Kegiatan', 'RAB',
                'Revenue Plan', 'Total Port', 'Template Durasi', 'TOC', 'Umur Pekerjaan',
                'Kategori Umur Pekerjaan', 'Status Proyek', 'Keterangan TOC',
                'Status Tomps - Last Activity', 'Status Tomps New', 'Status i-HLD',
                'Nama ODP GO LIVE', 'BAK', 'Keterangan Pelimpahan', 'Mitra Lokal',
            ];
            $createStatement = "CREATE TEMPORARY TABLE `{$temporaryTableName}` (";
            foreach ($csvHeaders as $header) {
                $columnName = '`'.Str::slug(str_replace('-', '_', $header), '_').'`';
                $createStatement .= "{$columnName} TEXT NULL, ";
            }
            $createStatement = rtrim($createStatement, ', ').') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;';
            $loadDataVariables = implode(', ', array_map(function ($header) {
                return '@'.Str::slug(str_replace('-', '_', $header), '_');
            }, $csvHeaders));
            $setStatement = implode(', ', array_map(function ($header) {
                $columnName = '`'.Str::slug(str_replace('-', '_', $header), '_').'`';
                $variableName = '@'.Str::slug(str_replace('-', '_', $header), '_');
                return "{$columnName} = NULLIF(TRIM({$variableName}), '')";
            }, $csvHeaders));


            // Langkah 1: Buat Tabel Temporer
            DB::statement($createStatement);

            // [PERBAIKAN 2] Update progress
            Cache::put('import_progress_'.$currentBatchId, 10, now()->addHour());

            Log::info("Memulai LOAD DATA INFILE dari: {$filePath}");
            $query = "
                LOAD DATA LOCAL INFILE '{$filePath}'
                INTO TABLE `{$temporaryTableName}`
                CHARACTER SET utf8mb4
                FIELDS TERMINATED BY ','
                OPTIONALLY ENCLOSED BY '\"'
                LINES TERMINATED BY '\\n'
                IGNORE 1 ROWS
                ({$loadDataVariables})
                SET {$setStatement}
            ";

            // Langkah 2: Muat Data dari CSV ke Tabel Temporer
            DB::connection()->getPdo()->exec($query);

            // [PERBAIKAN 3] Update progress
            Cache::put('import_progress_'.$currentBatchId, 50, now()->addHour());

            $tempRowCount = DB::table($temporaryTableName)->count();
            Log::info("Data berhasil dimuat ke tabel sementara. Jumlah baris: {$tempRowCount}");
            if ($tempRowCount === 0) {
                Log::warning('Tidak ada data yang dimuat. Proses dihentikan.');
                return;
            }

            Log::info('Memulai proses INSERT INTO ... SELECT ... ke spmk_mom');

            // ... (Definisi $poNameCase, $goLiveCase, $populasiCase, $columnMapping tetap sama)
            // [CUT] Logika string query...
            $poNameCase = "CASE
                    WHEN `witel_lama` = 'WITEL MADIUN' THEN 'ALFONSUS'
                    WHEN `witel_lama` IN ('WITEL DENPASAR', 'WITEL SINGARAJA') THEN 'DIASTANTO'
                    WHEN `witel_lama` = 'WITEL JEMBER' THEN 'ILHAM MIFTAHUL'
                    WHEN `witel_lama` = 'WITEL PASURUAN' THEN 'I WAYAN KRISNA'
                    WHEN `witel_lama` = 'WITEL SIDOARJO' THEN 'IBRAHIM MUHAMMAD'
                    WHEN `witel_lama` = 'WITEL KEDIRI' THEN 'LUQMAN KURNIAWAN'
                    WHEN `witel_lama` = 'WITEL MALANG' THEN 'NURTRIA IMAN'
                    WHEN `witel_lama` = 'WITEL NTT' THEN 'MARIA FRANSISKA'
                    WHEN `witel_lama` = 'WITEL NTB' THEN 'ANDRE YANA'
                    WHEN `witel_lama` IN ('WITEL SURABAYA UTARA', 'WITEL SURABAYA SELATAN', 'WITEL MADURA')
                    THEN
                        (CASE
                            WHEN `segmen` = 'DBS' THEN 'FERIZKA PARAMITHA'
                            WHEN `segmen` = 'DGS' THEN 'EKA SARI'
                            WHEN `segmen` IN ('DES', 'DSS', 'DPS') THEN 'DWIEKA SEPTIAN'
                            ELSE ''
                        END)
                    ELSE ''
                END";
            $goLiveCase = " (CASE WHEN `status_tomps_new` LIKE '%go live%' OR `status_proyek` LIKE '%go live%' THEN 'Y' ELSE 'N' END) ";
            $populasiCase = " (CASE WHEN `ba_drop` LIKE '%drop%' THEN 'N' ELSE 'Y' END) ";
            $columnMapping = [
                'bulan' => 'LEFT(`bulan`, 7)', 'tahun' => "CASE WHEN `tahun` RLIKE '^[0-9]{4}$' THEN `tahun` ELSE NULL END",
                'id_i_hld' => '`id_i_hld`', 'region' => '`region`', 'witel_lama' => '`witel_lama`', 'witel_baru' => '`witel_baru`',
                'no_nde_spmk' => '`no_nde_spmk`', 'uraian_kegiatan' => '`uraian_kegiatan`', 'segmen' => '`segmen`',
                'po_name' => $poNameCase, 'jenis_kegiatan' => '`jenis_kegiatan`', 'status_proyek' => '`status_proyek`',
                'go_live' => $goLiveCase, 'keterangan_toc' => '`keterangan_toc`',
                'tanggal_cb' => "STR_TO_DATE(NULLIF(`tanggal_cb`, ''), '%d-%b-%y')",
                'tanggal_mom' => "STR_TO_DATE(NULLIF(`tanggal_mom`, ''), '%d-%b-%y')",
                'usia' => "DATEDIFF(NOW(), STR_TO_DATE(NULLIF(`tanggal_mom`, ''), '%d-%b-%y'))",
                'revenue_plan' => "NULLIF(REPLACE(`revenue_plan`, ',', ''), '')", 'rab' => "NULLIF(REPLACE(`rab`, ',', ''), '')",
                'perihal_nde_spmk' => '`perihal_nde_spmk`', 'mom' => '`mom`', 'ba_drop' => '`ba_drop`',
                'populasi_non_drop' => $populasiCase, 'total_port' => '`total_port`', 'template_durasi' => '`template_durasi`',
                'toc' => '`toc`', 'umur_pekerjaan' => '`umur_pekerjaan`', 'kategori_umur_pekerjaan' => '`kategori_umur_pekerjaan`',
                'status_tomps_last_activity' => '`status_tomps_last_activity`', 'status_tomps_new' => '`status_tomps_new`',
                'status_i_hld' => '`status_i_hld`', 'nama_odp_go_live' => '`nama_odp_go_live`', 'bak' => '`bak`',
                'keterangan_pelimpahan' => '`keterangan_pelimpahan`', 'mitra_lokal' => '`mitra_lokal`',
                'created_at' => 'NOW()', 'updated_at' => 'NOW()',
                'batch_id' => DB::connection()->getPdo()->quote($currentBatchId),
            ];

            // 3. Bangun Query INSERT
            $insertColumns = implode(', ', array_map(function ($col) { return "`{$col}`"; }, array_keys($columnMapping)));
            $selectColumns = implode(', ', array_values($columnMapping));

            // 4. Jalankan Query INSERT
            $affectedRows = DB::statement("
                INSERT INTO spmk_mom ({$insertColumns})
                SELECT {$selectColumns}
                FROM `{$temporaryTableName}`
            ");

            // [PERBAIKAN 4] Update progress
            Cache::put('import_progress_'.$currentBatchId, 95, now()->addHour());

            Log::info("Proses INSERT selesai. Terdapat {$affectedRows} baris yang dimasukkan.");

            // [PERBAIKAN 5] Selesai! Set 100%
            Cache::put('import_progress_'.$currentBatchId, 100, now()->addHour());

        } catch (\Throwable $e) {
            // [PERBAIKAN 6] Set progress -1 (gagal) jika terjadi error
            Cache::put('import_progress_'.$currentBatchId, -1, now()->addHour());

            Log::error('Job ProcessJTImport GAGAL TOTAL: '.$e->getMessage());
            // ... (sisa log error Anda)
            throw $e;
        } finally {
            if ($temporaryTableName) {
                Log::info("Menghapus tabel sementara: {$temporaryTableName}");
                DB::statement("DROP TEMPORARY TABLE IF EXISTS `{$temporaryTableName}`");
            }
        }
    }

    public function failed(\Throwable $exception): void
    {
        // [PERBAIKAN 7] Hapus cache jika job gagal (seperti di 'Digital Product')
        $batchId = $this->batch() ? $this->batch()->id : 'N/A';
        Cache::forget('import_progress_'.$batchId);

        Log::error("Job ProcessJTImport GAGAL (failed method) untuk Batch [{$batchId}]: ".$exception->getMessage());
        Log::error($exception->getTraceAsString());
    }
}
