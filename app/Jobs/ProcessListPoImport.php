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

class ProcessListPoImport implements ShouldQueue
{
    use Batchable;
    use Dispatchable;
    use InteractsWithQueue;
    use Queueable;
    use SerializesModels;

    public $timeout = 600;
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

        $temporaryTableName = 'temp_po_import_'.Str::random(10);
        Log::info("Membuat tabel sementara untuk PO: {$temporaryTableName}");

        $filePath = Storage::disk('local')->path($this->path);
        $filePath = str_replace('\\', '/', $filePath);

        try {
            DB::statement("
                CREATE TEMPORARY TABLE `{$temporaryTableName}` (
                    `nipnas` VARCHAR(255) NULL,
                    `po` VARCHAR(255) NULL,
                    `segment` VARCHAR(255) NULL,
                    `bill_city` VARCHAR(255) NULL,
                    `witel` VARCHAR(255) NULL,
                    INDEX `idx_nipnas` (`nipnas`)
                )
            ");

            Log::info("Memulai LOAD DATA INFILE untuk PO dari: {$filePath}");
            DB::connection()->getPdo()->exec("
                LOAD DATA LOCAL INFILE '{$filePath}'
                INTO TABLE `{$temporaryTableName}`
                CHARACTER SET utf8mb4
                FIELDS TERMINATED BY ','
                ENCLOSED BY '\"'
                LINES TERMINATED BY '\\n'
                IGNORE 1 ROWS
            ");

            $tempRowCount = DB::table($temporaryTableName)->count();
            Log::info("Data PO berhasil dimuat ke tabel sementara. Jumlah baris: {$tempRowCount}");
            if ($tempRowCount === 0) {
                Log::warning('Tidak ada data PO yang dimuat. Proses dihentikan.');

                return;
            }

            Log::info('Memulai proses INSERT... ON DUPLICATE KEY UPDATE untuk List PO');

            // [FIX] Tambahkan filter untuk memastikan kolom 'po' tidak kosong
            $affectedRows = DB::statement("
                INSERT INTO list_po (nipnas, po, segment, bill_city, witel, created_at, updated_at)
                SELECT
                    nipnas, po, segment, bill_city, witel, NOW(), NOW()
                FROM `{$temporaryTableName}`
                WHERE
                    nipnas IS NOT NULL AND nipnas != ''
                    AND po IS NOT NULL AND po != ''
                ON DUPLICATE KEY UPDATE
                    po = VALUES(po),
                    segment = VALUES(segment),
                    bill_city = VALUES(bill_city),
                    witel = VALUES(witel),
                    updated_at = NOW()
            ");

            Log::info("Proses INSERT/UPDATE List PO selesai. Terdapat {$affectedRows} baris yang terpengaruh.");
        } catch (\Throwable $e) {
            Log::error('Error selama proses impor List PO: '.$e->getMessage());
            throw $e;
        } finally {
            Log::info("Menghapus tabel sementara PO: {$temporaryTableName}");
            DB::statement("DROP TEMPORARY TABLE IF EXISTS `{$temporaryTableName}`");
        }
    }

    public function failed(\Throwable $exception): void
    {
        Log::error('Job ProcessListPoImport GAGAL: '.$exception->getMessage());
        Log::error($exception->getTraceAsString());
    }
}
