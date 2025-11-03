<?php

use App\Http\Controllers\AccountOfficerController;
use App\Http\Controllers\Admin\ExcelMergeController;
use App\Http\Controllers\AnalysisDigitalProductController;
use App\Http\Controllers\AnalysisSOSController;
use App\Http\Controllers\DashboardDigitalProductController;
use App\Http\Controllers\DashboardSOSController; // <-- [TAMBAHKAN INI]
use App\Http\Controllers\DataReportController;
use App\Http\Controllers\GalaksiController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\SuperAdminController; // [CATATAN] Ini sudah Anda tambahkan, bagus
use App\Http\Controllers\TracerouteController;
use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\Redirect;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
*/

// Rute default
Route::get('/', fn () => Redirect::route('login'));
Route::get('/google-drive-test', fn () => Inertia::render('Upload'))->name('google.drive.test');
Route::get('/embed/dashboardDigitalProduct', [DashboardDigitalProductController::class, 'embed'])->name('dashboardDigitalProduct.embed');

// --- RUTE YANG MEMERLUKAN AUTENTIKASI ---
Route::middleware(['auth', 'verified'])->group(function () {
    /*
    |--------------------------------------------------------------------------
    | Rute Umum & Tampilan User/Admin Biasa
    |--------------------------------------------------------------------------
    */
    Route::get('/dashboard', [DashboardDigitalProductController::class, 'index'])->name('dashboard');
    Route::get('/dashboardDigitalProduct', [DashboardDigitalProductController::class, 'index'])->name('dashboardDigitalProduct');

    // <-- [TAMBAHKAN INI] Rute untuk Dashboard SOS baru Anda
    Route::get('/dashboard-sos', [DashboardSOSController::class, 'index'])->name('dashboard.sos');

    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
    Route::get('/data-report', [DataReportController::class, 'index'])->name('data-report.index');
    Route::get('/data-report/export', [DataReportController::class, 'export'])->name('data-report.export');
    Route::get('/data-report/export/inprogress', [DataReportController::class, 'exportInProgress'])->name('data-report.exportInProgress');
    Route::get('/galaksi', [GalaksiController::class, 'index'])->name('galaksi.index');
    Route::post('/run-traceroute', [TracerouteController::class, 'run'])->name('traceroute.run');
    Route::get('/tools/google-drive-test', fn () => Inertia::render('Tools/GoogleDriveTest'))->name('tools.google-drive-test');
    Route::get('/import-progress/{batchId}', [AnalysisDigitalProductController::class, 'getImportProgress'])->name('import.progress');
    Route::post('/cms-mode/exit', [ProfileController::class, 'exitCmsMode'])->name('cms.exit');

    /*
    |--------------------------------------------------------------------------
    | Rute Khusus Admin (Area CMS) - Bisa diakses Admin & Superadmin
    |--------------------------------------------------------------------------
    */
    Route::middleware(['role:admin,superadmin']) // Middleware ini berlaku untuk SEMUA route di dalam grup ini
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
                    Route::post('/cancel-import', 'cancelImport')->name('import.cancel'); // Tetap di sini karena admin bisa upload
                    Route::post('/targets', 'updateTargets')->name('targets');
                    Route::post('/upload-complete', 'uploadComplete')->name('uploadComplete');
                    Route::post('/upload-cancel', 'uploadCancel')->name('uploadCancel');
                    Route::post('/config', 'saveConfig')->name('saveConfig');
                    Route::post('/reset-config', 'resetConfig')->name('resetConfig');
                    Route::post('/clear-history', 'clearHistory')->name('clearHistory');
                    Route::post('/export-report', 'exportReport')->name('export.report');
                    Route::post('/custom-targets', 'saveCustomTargets')->name('saveCustomTargets');
                    Route::get('/export/kpi-po', 'exportKpiPo')->name('export.kpiPo');
                    Route::get('/export/inprogress', 'exportInProgress')->name('export.inprogress');
                    Route::get('/export/history', 'exportHistory')->name('export.history');
                    Route::put('/update-net-price/{order_id}', 'updateNetPrice')->name('updateNetPrice');
                    Route::put('/manual-update/complete/{documentData:order_id}', 'updateManualComplete')->name('manual.update.complete');
                    Route::put('/manual-update/cancel/{documentData:order_id}', 'updateManualCancel')->name('manual.update.cancel');
                    Route::put('/complete-update/progress/{documentData:order_id}', 'updateCompleteToProgress')->name('complete.update.progress');
                    Route::put('/complete-update/qc/{documentData:order_id}', 'updateCompleteToQc')->name('complete.update.qc');
                    Route::put('/complete-update/cancel/{documentData:order_id}', 'updateCompleteToCancel')->name('complete.update.cancel');
                    Route::put('/qc-update/{documentData:order_id}/progress', 'updateQcStatusToProgress')->name('qc.update.progress');
                    Route::put('/qc-update/{documentData:order_id}/done', 'updateQcStatusToDone')->name('qc.update.done');
                    Route::put('/qc-update/{documentData:order_id}/cancel', 'updateQcStatusToCancel')->name('qc.update.cancel');
                });

            // Grup Controller untuk Analisis SOS
            Route::controller(AnalysisSOSController::class)
                ->prefix('analysis-sos')
                ->name('analysisSOS.')
                ->group(function () {
                    Route::get('/', 'index')->name('index');
                    Route::post('/upload', 'upload')->name('upload');
                    Route::post('/save-config', 'saveConfig')->name('saveConfig');
                    Route::post('/reset-config', 'resetConfig')->name('resetConfig');
                    Route::post('/save-custom-targets', 'saveCustomTargets')->name('saveCustomTargets');
                    Route::get('/export', 'export')->name('export');
                    Route::get('/export-galaksi', 'exportGalaksi')->name('exportGalaksi');
                    Route::post('/upload-po-list', 'uploadPoList')->name('uploadPoList');
                    Route::post('/add-po', 'addPoManually')->name('addPo');
                    Route::post('/import/cancel', 'cancelImport')->name('import.cancel');
                });

            // Rute Resource untuk Account Officer (hanya store dan update)
            Route::resource('account-officers', AccountOfficerController::class)->only(['store', 'update']);

            // Rute untuk Excel Merge
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
    Route::middleware(['role:superadmin']) // Middleware HANYA untuk Superadmin
        ->prefix('superadmin') // Prefix URL /superadmin/...
        ->name('superadmin.') // Prefix Nama Route superadmin...
        ->group(function () {
            // Resource Controller untuk User Management
            Route::resource('users', UserController::class); // Akan menghasilkan superadmin.users.index, .create, .store, dll.

            // Controller untuk Fitur Super Admin Lainnya (Termasuk Rollback)
            Route::controller(SuperAdminController::class)->group(function () {
                Route::get('/rollback', 'showRollbackPage')->name('rollback.show'); // Nama route: superadmin.rollback.show
                Route::post('/rollback', 'executeRollback')->name('rollback.execute'); // Nama route: superadmin.rollback.execute
                // Tambahkan route Super Admin lainnya di sini
            });
        });
});

require __DIR__.'/auth.php';
