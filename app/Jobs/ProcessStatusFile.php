<?php

namespace App\Jobs;

use App\Models\DocumentData;
use App\Models\OrderStatusLog;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Maatwebsite\Excel\Facades\Excel;

class ProcessStatusFile implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected $path;
    protected $statusToSet;
    protected $originalFileName;

    public function __construct(string $path, string $statusToSet, string $originalFileName)
    {
        $this->path = $path;
        $this->statusToSet = $statusToSet;
        $this->originalFileName = $originalFileName;
    }

    public function handle(): void
    {
        $filePath = Storage::path($this->path);
        Log::info("Memulai proses file status ({$this->statusToSet}) dari: {$this->originalFileName}");

        try {
            // FASE 1: BACA EXCEL DAN SIMPAN KE TABEL LOG
            Excel::filter('chunk')->load($filePath)->chunk(250, function ($results) {
                $logs = [];
                foreach ($results as $row) {
                    if (!empty($row->order_id)) {
                        $logs[] = [
                            'order_id' => $row->order_id,
                            'status' => $this->statusToSet,
                            'source_file' => $this->originalFileName,
                            'created_at' => now(),
                            'updated_at' => now(),
                        ];
                    }
                }
                if (!empty($logs)) {
                    OrderStatusLog::insert($logs);
                }
            });
            Log::info("Fase 1 Selesai: Menyimpan log status dari {$this->originalFileName}");

            // FASE 2: SINKRONISASI OTOMATIS
            Log::info("Memulai Fase 2: Sinkronisasi status {$this->statusToSet} ke data utama.");
            $this->sync();

        } catch (\Exception $e) {
            Log::error("Gagal memproses file status {$this->originalFileName}: " . $e->getMessage());
            $this->fail($e);
        } finally {
            Storage::delete($this->path);
        }
    }

    private function sync(): void
    {
        $logsToProcess = OrderStatusLog::where('status', $this->statusToSet)->whereNull('processed_at')->get();

        if ($logsToProcess->isEmpty()) {
            Log::info("Tidak ada log status {$this->statusToSet} baru untuk disinkronkan.");
            return;
        }

        $orderIds = $logsToProcess->pluck('order_id');
        $statusWfm = ($this->statusToSet === 'completed') ? 'done close bima' : 'done close cancel';
        $milestone = ($this->statusToSet === 'completed') ? 'Completed via Sync Process' : 'Canceled via Sync Process';
        $statusN = ($this->statusToSet === 'completed') ? 'COMPLETE' : 'CANCEL';

        $updatedCount = DocumentData::whereIn('order_id', $orderIds)
            ->where('status_wfm', 'in progress')
            ->update([
                'status_wfm' => $statusWfm,
                'milestone' => $milestone,
                'order_status_n' => $statusN,
            ]);

        // Tandai log sebagai sudah diproses
        OrderStatusLog::whereIn('id', $logsToProcess->pluck('id'))->update(['processed_at' => now()]);

        Log::info("Sinkronisasi {$this->statusToSet} selesai. Berhasil mengupdate {$updatedCount} order.");
    }
}
