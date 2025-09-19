<?php

namespace App\Jobs;

use App\Imports\DocumentDataImport;
use App\Models\DocumentData;
use App\Models\OrderProduct;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Maatwebsite\Excel\Facades\Excel;

class ImportAndProcessDocument implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $timeout = 1200;
    protected $filePath;

    public function __construct(string $filePath)
    {
        $this->filePath = $filePath;
    }

    public function handle(): void
    {
        Log::info("Memulai job gabungan untuk file: {$this->filePath}");

        try {
            Log::info("Memulai Fase 1: Impor data mentah...");
            Excel::import(new \App\Imports\DocumentDataImport, $this->filePath);
            Log::info("Fase 1 Selesai: Impor data mentah berhasil.");
        } catch (\Exception $e) {
            Log::error("GAGAL pada Fase 1 (Impor Data Mentah): " . $e->getMessage() . " di baris " . $e->getLine());
            $this->fail($e);
            return;
        }

        Log::info("Memulai Fase 2: Memproses Produk...");
        try {
            DB::transaction(function () {
                DocumentData::where('products_processed', false)
                    ->chunkById(100, function ($orders) {

                    foreach ($orders as $order) {
                        $productString = $order->product ?? '';

                        $normalizedString = str_replace(["\r\n", "\n", "\r"], '-', $productString);

                        if (str_contains($normalizedString, '-')) {

                            OrderProduct::where('order_id', $order->order_id)->delete();

                            $productNames = array_filter(array_map('trim', explode('-', $normalizedString)));

                            foreach ($productNames as $productName) {
                                if (
                                    empty($productName) ||
                                    stripos($productName, 'kidi') !== false ||
                                    (stripos($order->layanan ?? '', 'mahir') !== false && stripos($productName, 'pijar') !== false)
                                ) {
                                    continue;
                                }

                                OrderProduct::create([
                                    'order_id'     => $order->order_id,
                                    'product_name' => $productName,
                                    'net_price'    => $this->calculateProductPrice($productName, $order),
                                    'channel'      => $order->channel,
                                    'status_wfm'   => $order->status_wfm,
                                ]);
                            }
                        }

                        $order->products_processed = true;
                        $order->save();
                    }
                });
            });
            Log::info("Fase 2 Selesai dengan sukses.");
        } catch (\Exception $e) {
            Log::error("GAGAL pada Fase 2 (Pemrosesan Produk): " . $e->getMessage() . " di baris " . $e->getLine());
            $this->fail($e);
        }
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
