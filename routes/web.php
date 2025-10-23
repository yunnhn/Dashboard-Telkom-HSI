<?php

use App\Http\Controllers\AccountOfficerController;
use App\Http\Controllers\Admin\ExcelMergeController;
use App\Http\Controllers\AnalysisDigitalProductController;
use App\Http\Controllers\DashboardDigitalProductController;
use App\Http\Controllers\DataReportController;
use App\Http\Controllers\GalaksiController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\Redirect;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
|
| Semua rute web aplikasi terdaftar di sini.
| Rute ini menggunakan middleware "web" dan disediakan oleh RouteServiceProvider.
|
*/

// Rute default, mengarahkan ke halaman login
Route::get('/', fn () => Redirect::route('login'));

Route::get('/google-drive-test', function () {
    // Gunakan Inertia::render untuk merender komponen React Anda
    return Inertia::render('Upload');
})->name('google.drive.test');

Route::get('/cek-php', function () {
    phpinfo();
});

// --- RUTE YANG MEMERLUKAN AUTENTIKASI ---
Route::middleware(['auth', 'verified'])->group(function () {
    /*
    |--------------------------------------------------------------------------
    | Rute Umum & Tampilan User
    |--------------------------------------------------------------------------
    */
    Route::get('/dashboard', [DashboardDigitalProductController::class, 'index'])->name('dashboard');
    Route::get('/dashboardDigitalProduct', [DashboardDigitalProductController::class, 'index'])->name('dashboardDigitalProduct');

    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    Route::get('/data-report', [DataReportController::class, 'index'])->name('data-report.index');
    Route::post('/data-report/export', [DataReportController::class, 'export'])->name('data-report.export');
    Route::post('/data-report/export/inprogress', [DataReportController::class, 'exportInProgress'])->name('data-report.exportInProgress');

    Route::get('/galaksi', [GalaksiController::class, 'index'])->name('galaksi.index');

    Route::post('/run-traceroute', [TracerouteController::class, 'run'])->name('traceroute.run');

    Route::get('/tools/google-drive-test', function () {
        return Inertia::render('Tools/GoogleDriveTest');
    })->name('tools.google-drive-test');

    /*
    |--------------------------------------------------------------------------
    | Rute Progress Bar Upload Dokumen
    |--------------------------------------------------------------------------
    | Endpoint ini dipanggil frontend (React) untuk menanyakan progres upload
    | dan import dokumen. Controller akan baca nilai Cache dari backend.
    */
    Route::get('/import-progress/{batchId}', [AnalysisDigitalProductController::class, 'getImportProgress'])
        ->name('import.progress');

    /*
    |--------------------------------------------------------------------------
    | Rute Khusus Admin & Superadmin (Area CMS)
    |--------------------------------------------------------------------------
    */
    Route::middleware(['role:admin,superadmin'])
        ->prefix('admin')
        ->name('admin.')
        ->group(function () {
            // Grup Controller untuk Analisis Digital Product
            Route::controller(AnalysisDigitalProductController::class)
                ->prefix('analysis-digital-product')
                ->name('analysisDigitalProduct.')
                ->group(function () {
                    Route::get('/', 'index')->name('index');
                    Route::post('/upload', 'upload')->name('upload');
                    Route::post('/targets', 'updateTargets')->name('targets');
                    Route::post('/upload-complete', 'uploadComplete')->name('uploadComplete');
                    Route::post('/upload-cancel', 'uploadCancel')->name('uploadCancel');
                    Route::post('/config', 'saveConfig')->name('saveConfig');
                    Route::post('/reset-config', 'resetTableConfig')->name('resetConfig');
                    Route::post('/clear-history', 'clearHistory')->name('clearHistory');
                    Route::post('/export-report', 'exportReport')->name('export.report');
                    Route::post('/custom-targets', 'saveCustomTargets')->name('saveCustomTargets');
                    Route::get('/export/kpi-po', 'exportKpiPo')->name('export.kpiPo');
                    Route::get('/export/inprogress', 'exportInProgress')->name('export.inprogress');
                    Route::get('/export/history', 'exportHistory')->name('export.history');
                    Route::put('/update-net-price/{order_id}', [AnalysisDigitalProductController::class, 'updateNetPrice'])->name('admin.analysisDigitalProduct.updateNetPrice');
                });

            // Rute untuk Analisis SOS
            Route::get('/analysis-sos', fn () => inertia('Admin/AnalysisSOS'))->name('analysisSOS.index');

            // Rute aksi update manual (menggunakan Route Model Binding)
            Route::put('/manual-update/complete/{documentData:order_id}', [AnalysisDigitalProductController::class, 'updateManualComplete'])->name('manual.update.complete');
            Route::put('/manual-update/cancel/{documentData:order_id}', [AnalysisDigitalProductController::class, 'updateManualCancel'])->name('manual.update.cancel');
            Route::put('/complete-update/progress/{documentData:order_id}', [AnalysisDigitalProductController::class, 'updateCompleteToProgress'])->name('complete.update.progress');
            Route::put('/complete-update/qc/{documentData:order_id}', [AnalysisDigitalProductController::class, 'updateCompleteToQc'])->name('complete.update.qc');
            Route::put('/complete-update/cancel/{documentData:order_id}', [AnalysisDigitalProductController::class, 'updateCompleteToCancel'])->name('complete.update.cancel');
            Route::put('/qc-update/{documentData:order_id}/progress', [AnalysisDigitalProductController::class, 'updateQcStatusToProgress'])->name('qc.update.progress');
            Route::put('/qc-update/{documentData:order_id}/done', [AnalysisDigitalProductController::class, 'updateQcStatusToDone'])->name('qc.update.done');
            Route::put('/qc-update/{documentData:order_id}/cancel', [AnalysisDigitalProductController::class, 'updateQcStatusToCancel'])->name('qc.update.cancel');

            // Rute Resource untuk Account Officer (hanya store dan update)
            Route::resource('account-officers', AccountOfficerController::class)->only(['store', 'update']);

            Route::get('/merge-excel', [ExcelMergeController::class, 'create'])->name('merge-excel.create');
            Route::post('/merge-excel', [ExcelMergeController::class, 'merge'])->name('merge-excel.merge');

            Route::get('/merge-excel/download', [ExcelMergeController::class, 'download'])->name('merge-excel.download');
            Route::get('/merge-excel/download-url', [ExcelMergeController::class, 'getDownloadUrl'])->name('merge-excel.download-url');
        });

    /*
    |--------------------------------------------------------------------------
    | Rute HANYA untuk Superadmin
    |--------------------------------------------------------------------------
    */
    Route::middleware(['role:superadmin'])->group(function () {
        Route::resource('users', UserController::class);
    });
});

require __DIR__.'/auth.php';

// for CI
