<?php

namespace App\Jobs;

use Illuminate\Bus\Batchable;
use App\Imports\CanceledOrdersImport;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Maatwebsite\Excel\Facades\Excel;

class ProcessCanceledOrders implements ShouldQueue
{
    use Batchable, Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected $path;

    public function __construct(string $path)
    {
        $this->path = $path;
    }

    public function handle(): void
    {
        $filePath = Storage::path($this->path);
        Log::info("Memulai proses unggah file Cancel dari: {$this->path}");

        try {
            // Panggil kelas import baru yang sudah menggunakan sintaks modern
            Excel::import(new CanceledOrdersImport, $filePath);
            Log::info("Selesai memproses file Cancel: {$this->path}");

        } catch (\Exception $e) {
            Log::error("Gagal memproses file Cancel {$this->path}: " . $e->getMessage());
            $this->fail($e);
        } finally {
            Storage::delete($this->path);
        }
    }
}
