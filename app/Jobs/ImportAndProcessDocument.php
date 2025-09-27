<?php

namespace App\Jobs;

use App\Imports\DocumentDataImport;
use App\Models\DocumentData;
use App\Models\OrderProduct;
use App\Jobs\ProcessProductBundles;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Maatwebsite\Excel\Facades\Excel;
use Illuminate\Bus\Batchable;

class ImportAndProcessDocument implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels, Batchable;

    public $timeout = 1200;
    protected $path;

    public function __construct(string $path)
    {
        $this->path = $path;
    }

    public function handle(): void
    {
        Log::info("Batch [" . $this->batch()->id . "]: Job ImportAndProcessDocument DIMULAI.");

        if ($this->batch()->cancelled()) {
            Log::warning("Batch [" . $this->batch()->id . "]: Proses dibatalkan sebelum import.");
            return;
        }
        // Perintahkan Importer untuk memulai proses, kirimkan ID batch yang asli
        Excel::import(new DocumentDataImport($this->batch()->id), $this->path);

        // Simpan ID batch terakhir yang sukses untuk referensi di masa depan
        \Illuminate\Support\Facades\Cache::put('last_successful_batch_id', $this->batch()->id, now()->addHours(24));

        Log::info("Batch [" . $this->batch()->id . "]: Job ImportAndProcessDocument SELESAI.");
    }

    public function failed(\Throwable $exception): void
    {
        Log::error("Batch [" . ($this->batch() ? $this->batch()->id : 'N/A') . "]: Job ImportAndProcessDocument GAGAL.");
        Log::error($exception->getMessage());
    }

    private function calculateProductPrice(string $productName, DocumentData $order): int
    {
        $witel = strtoupper(trim($order->nama_witel));
        $segment = strtoupper(trim($order->segment));

        switch (strtolower(trim($productName))) {
            case 'netmonk':
                return ($segment === 'LEGS')
                    ? 26100
                    : (($witel === 'BALI') ? 26100 : 21600);

            case 'oca':
                return ($segment === 'LEGS')
                    ? 104000
                    : (($witel === 'NUSA TENGGARA') ? 104000 : 103950);

            case 'antares eazy':
                return 35000;

            case 'pijar sekolah':
                return 582750;

            default:
                return 0;
        }
    }
}
