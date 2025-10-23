<?php

namespace App\Exports;

use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Log;
use Maatwebsite\Excel\Concerns\Exportable;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithEvents;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Events\AfterSheet;
use Maatwebsite\Excel\Facades\Excel;

class MergedFilesExport implements FromCollection, WithHeadings, WithEvents
{
    use Exportable;

    protected $files;
    protected $actualHeadings = []; // Simpan heading di sini

    public function __construct(array $files)
    {
        $this->files = $files;
        $this->prepareData(); // Panggil method persiapan di constructor
    }

    /**
     * Method untuk mempersiapkan heading dan data sekali saja.
     */
    protected function prepareData()
    {
        Log::info('Preparing headings from first file');
        if (empty($this->files)) {
            return;
        }

        try {
            $firstFile = $this->files[0];
            $collection = $this->readFile($firstFile['path'], $firstFile['extension']);

            if (!$collection->isEmpty()) {
                // Ambil baris pertama sebagai heading, pastikan ini adalah array
                $this->actualHeadings = $collection->first()->toArray();
                Log::info('Headings prepared: '.json_encode($this->actualHeadings));
            } else {
                Log::warning('First file is empty, using default headings.');
                $this->actualHeadings = ['No headers found'];
            }
        } catch (\Exception $e) {
            Log::error('Error preparing headings: '.$e->getMessage());
            $this->actualHeadings = ['Error reading headers from first file'];
        }
    }

    /**
     * Kembalikan headings yang sudah disiapkan.
     */
    public function headings(): array
    {
        return $this->actualHeadings;
    }

    /**
     * Bangun koleksi data dari semua file.
     */
    public function collection(): Collection
    {
        Log::info('Starting collection merge with '.count($this->files).' files');
        $mergedData = new Collection();

        foreach ($this->files as $index => $file) {
            try {
                Log::info("Processing file {$index}: {$file['original_name']}");
                $collection = $this->readFile($file['path'], $file['extension']);

                if ($collection->isEmpty()) {
                    Log::warning("File {$file['original_name']} is empty");
                    continue;
                }

                // Selalu lewati baris pertama (header) dari setiap file
                // **PENTING: Ubah setiap baris menjadi array**
                $dataWithoutHeader = $collection->slice(1)->map(function ($row) {
                    return $row->toArray();
                });

                if ($dataWithoutHeader->isNotEmpty()) {
                    $mergedData = $mergedData->concat($dataWithoutHeader);
                }
            } catch (\Exception $e) {
                Log::error("Error processing file {$file['original_name']}: ".$e->getMessage());
                // Buat baris error yang sesuai dengan jumlah kolom header
                $errorRow = array_fill(0, count($this->actualHeadings), '');
                $errorRow[0] = "ERROR: Cannot read file {$file['original_name']}";
                $mergedData->push($errorRow);
            }
        }

        Log::info("Merge completed. Total rows in merged data: {$mergedData->count()}");

        return $mergedData;
    }

    /**
     * Baca file dan kembalikan sebagai Collection.
     */
    protected function readFile(string $filePath, string $extension): Collection
    {
        try {
            Log::info("Reading file: {$filePath} with extension: {$extension}");
            $readerType = match (strtolower($extension)) {
                'csv' => \Maatwebsite\Excel\Excel::CSV,
                'xls' => \Maatwebsite\Excel\Excel::XLS,
                default => \Maatwebsite\Excel\Excel::XLSX,
            };

            $collection = Excel::toCollection(null, $filePath, null, $readerType);

            if ($collection->isEmpty() || $collection->first()->isEmpty()) {
                Log::warning("Empty collection for file: {$filePath}");

                return new Collection();
            }

            return $collection->first();
        } catch (\Exception $e) {
            Log::error("Failed to read file {$filePath}: ".$e->getMessage());
            throw new \Exception('Cannot process file: '.basename($filePath));
        }
    }

    public function registerEvents(): array
    {
        return [
            AfterSheet::class => function (AfterSheet $event) {
                // Bold header row
                $event->sheet->getStyle('A1:Z1')->getFont()->setBold(true);
            },
        ];
    }
}
