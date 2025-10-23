<?php

namespace App\Http\Controllers\Admin;

use App\Exports\MergedFilesExport;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Maatwebsite\Excel\Facades\Excel;

class ExcelMergeController extends Controller
{
    public function create()
    {
        // Ambil hasil merge terakhir dari session
        $lastResult = session()->get('last_merge_result_'.auth()->id());

        return Inertia::render('Admin/MergeExcel', [
            'lastMergeResult' => $lastResult,
        ]);
    }

    public function merge(Request $request)
    {
        Log::info('=== MERGE REQUEST STARTED ===');

        $request->validate([
            'files' => 'required|array|min:1|max:10',
            'files.*' => 'file|max:20480', // <-- HAPUS 'mimes:...' DARI SINI
        ], [
            // 'files.*.mimes' => '...', // HAPUS JUGA PESAN ERROR MIMES
            'files.*.max' => 'Ukuran setiap file tidak boleh lebih dari 20MB.',
            'files.required' => 'Anda harus memilih setidaknya satu file untuk diunggah.',
            'files.min' => 'Anda harus memilih setidaknya satu file untuk diunggah.',
            'files.max' => 'Anda hanya dapat mengunggah maksimal 10 file sekaligus.',
        ]);

        Log::info('Validation passed, processing '.count($request->file('files')).' files');

        $filePaths = [];
        $directory = 'temp-merges/'.uniqid();

        try {
            // Simpan file yang diupload
            foreach ($request->file('files') as $file) {
                $extension = strtolower($file->getClientOriginalExtension());

                if (!in_array($extension, ['xlsx', 'xls', 'csv'])) {
                    throw new \Exception('File dengan format .'.$extension.' tidak didukung.');
                }

                $path = $file->store($directory, 'public');
                $filePaths[] = [
                    'path' => $path,
                    'extension' => $extension,
                    'original_name' => $file->getClientOriginalName(),
                ];

                Log::info("File stored: {$path}");
            }

            // Proses merge secara synchronous (tanpa queue)
            $mergeResult = $this->processMerge($filePaths);

            // Hapus file temporary
            $this->cleanupTempFiles($directory);

            Log::info('=== MERGE PROCESS COMPLETED ===');
            Log::info('Result: '.json_encode($mergeResult));

            return back()->with([
                'success' => 'Proses penggabungan selesai! File telah berhasil digabungkan.',
                'mergeResult' => $mergeResult,
            ]);
        } catch (\Exception $e) {
            Log::error('Merge process failed: '.$e->getMessage());

            // Cleanup jika ada error
            if (isset($directory)) {
                $this->cleanupTempFiles($directory);
            }

            return back()->with('error', 'Terjadi kesalahan saat memproses file: '.$e->getMessage());
        }
    }

    /**
     * Proses merge file secara synchronous.
     */
    protected function processMerge($filePaths)
    {
        $filesWithInfo = [];

        foreach ($filePaths as $fileInfo) {
            $path = $fileInfo['path'];

            if (Storage::disk('public')->exists($path)) {
                $absolutePath = Storage::disk('public')->path($path);
                $filesWithInfo[] = [
                    'path' => $absolutePath,
                    'extension' => $fileInfo['extension'],
                    'original_name' => $fileInfo['original_name'],
                ];
                Log::info("Processing file: {$fileInfo['original_name']}");
            } else {
                throw new \Exception("File tidak ditemukan: {$path}");
            }
        }

        if (empty($filesWithInfo)) {
            throw new \Exception('Tidak ada file valid yang ditemukan');
        }

        // Generate nama file hasil
        $fileName = 'merged_files_'.now()->format('Ymd_His').'.xlsx';
        $exportPath = 'merged-results/'.$fileName;

        // Pastikan directory exists
        $directory = dirname(Storage::disk('public')->path($exportPath));
        if (!is_dir($directory)) {
            mkdir($directory, 0755, true);
        }

        Log::info("Starting Excel export to: {$exportPath}");

        // Proses export
        Excel::store(new MergedFilesExport($filesWithInfo), $exportPath, 'public');

        Log::info("Excel export completed: {$exportPath}");

        // Simpan ke session
        $mergeResult = [
            'file_name' => $fileName,
            'file_path' => $exportPath,
            'download_url' => route('admin.merge-excel.download', ['file_path' => $exportPath]),
            'created_at' => now()->toDateTimeString(),
        ];

        session()->put('last_merge_result_'.auth()->id(), $mergeResult);

        return $mergeResult;
    }

    /**
     * Cleanup temporary files.
     */
    protected function cleanupTempFiles($directory)
    {
        try {
            if (Storage::disk('public')->exists($directory)) {
                Storage::disk('public')->deleteDirectory($directory);
                Log::info("Cleaned up temp directory: {$directory}");
            }
        } catch (\Throwable $e) {
            Log::warning('Cleanup error: '.$e->getMessage());
        }
    }

    /**
     * Download file hasil merge.
     */
    public function download(Request $request)
    {
        $filePath = $request->query('file_path');

        if (!$filePath) {
            // Menggunakan redirect Inertia untuk menampilkan error
            return back()->with('error', 'Parameter file_path diperlukan.');
        }

        // Validasi path untuk keamanan (sudah bagus)
        if (strpos($filePath, 'merged-results/') !== 0 || !Storage::disk('public')->exists($filePath)) {
            return back()->with('error', 'File tidak ditemukan atau path tidak valid.');
        }

        $fullPath = Storage::disk('public')->path($filePath);
        $fileName = basename($filePath);

        Log::info("Downloading file: {$filePath} as {$fileName}");

        // Menggunakan response()->download() yang lebih eksplisit
        return response()->download($fullPath, $fileName)->deleteFileAfterSend(true);
    }
}
