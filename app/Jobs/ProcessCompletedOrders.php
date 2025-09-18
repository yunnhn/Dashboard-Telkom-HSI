<?php

namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use App\Imports\CompletedOrdersImport; // Importer baru yang akan kita buat
use Maatwebsite\Excel\Facades\Excel;
use Illuminate\Support\Facades\Log;

class ProcessCompletedOrders implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected $filePath;

    public function __construct(string $filePath)
    {
        $this->filePath = $filePath;
    }

    public function handle(): void
    {
        Log::info("Memulai job untuk memproses order complete dari file: {$this->filePath}");
        try {
            // Panggil Importer baru kita
            Excel::import(new CompletedOrdersImport, $this->filePath);
            Log::info("Selesai memproses file order complete.");
        } catch (\Exception $e) {
            Log::error("GAGAL memproses file order complete: " . $e->getMessage());
            $this->fail($e);
        }
    }
}
