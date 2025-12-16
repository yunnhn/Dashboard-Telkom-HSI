<?php

use App\Http\Controllers\AccountOfficerController;
use App\Http\Controllers\Admin\ExcelMergeController;
use App\Http\Controllers\AnalysisDigitalProductController;
use App\Http\Controllers\AnalysisJTController;
use App\Http\Controllers\AnalysisJTDashboardController;
use App\Http\Controllers\MainDashboardController;
use App\Http\Controllers\AnalysisSOSController;
use App\Http\Controllers\DashboardDigitalProductController;
use App\Http\Controllers\DynamicRecordController;
use App\Http\Controllers\DashboardSOSController;
use App\Http\Controllers\MasterDataPOController;
use App\Http\Controllers\DataReportController;
use App\Http\Controllers\GalaksiController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\ReportDatinController;
use App\Http\Controllers\ReportJTController;
use App\Http\Controllers\SuperAdminController;
use App\Http\Controllers\TracerouteController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\EmbedController;
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
Route::get('/embed/dashboard-jt', [AnalysisJTDashboardController::class, 'embed'])->name('dashboard.jt.embed');
Route::get('/embed/dashboard-sos', [DashboardSOSController::class, 'embed'])->name('dashboard.sos.embed');

// --- RUTE YANG MEMERLUKAN AUTENTIKASI ---
Route::middleware(['auth', 'verified'])->group(function () {
    /*
    |--------------------------------------------------------------------------
    | Rute Umum & Tampilan User/Admin Biasa
    |--------------------------------------------------------------------------
    */
    // Dashboard (Dibersihkan dari duplikasi, prioritas MainDashboardController)
    Route::get('/dashboard', [MainDashboardController::class, 'show'])->name('dashboard');
    Route::get('/dashboardDigitalProduct', [DashboardDigitalProductController::class, 'index'])->name('dashboardDigitalProduct');
    Route::get('/dashboard-sos', [DashboardSOSController::class, 'index'])->name('dashboard.sos');
    Route::get('/dashboard-jt', [AnalysisJTDashboardController::class, 'index'])->name('dashboard.jt');

    // Profile Routes
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
    Route::post('/cms-mode/exit', [ProfileController::class, 'exitCmsMode'])->name('cms.exit');

    // Data Report & Galaksi Routes
    Route::get('/data-report', [DataReportController::class, 'index'])->name('data-report.index');
    Route::get('/data-report/export', [DataReportController::class, 'export'])->name('data-report.export');
    Route::get('/data-report/export/inprogress', [DataReportController::class, 'exportInProgress'])->name('data-report.exportInProgress');

    // [PERBAIKAN PENTING]
    // Mengarahkan detail galaksi ke DataReportController yang sudah diperbaiki logic-nya
    Route::get('/galaksi', [GalaksiController::class, 'index'])->name('galaksi.index'); // Halaman utama galaksi tetap di GalaksiController (jika index-nya aman)
    Route::get('/galaksi/details', [DataReportController::class, 'showDetails'])->name('galaksi.showDetails'); // Detail diganti ke DataReportController
    Route::get('/data-report/details', [DataReportController::class, 'showDetails'])->name('data-report.details');

    // Tools & Others
    Route::post('/run-traceroute', [TracerouteController::class, 'run'])->name('traceroute.run');
    Route::get('/tools/google-drive-test', fn () => Inertia::render('Tools/GoogleDriveTest'))->name('tools.google-drive-test');

    // Report Datin & JT Routes
    Route::get('/report-datin', [ReportDatinController::class, 'index'])->name('report.datin');
    Route::get('/report-jt', [ReportJTController::class, 'index'])->name('report.jt');
    Route::get('/import-progress/{batchId}', [AnalysisSOSController::class, 'getImportProgress'])->name('import.progress');

    // Detail Routes
    Route::get('/report-jt/details', [ReportJTController::class, 'showDetails'])->name('report.jt.details');
    Route::get('/report-jt/toc-details', [ReportJTController::class, 'showTocDetails'])->name('report.jt.tocDetails');
    Route::get('/report-datin/sos-details', [ReportDatinController::class, 'showSosDetails'])->name('report.datin.sosDetails');
    Route::get('/report-datin/galaksi-details', [ReportDatinController::class, 'showGalaksiDetails'])->name('report.datin.galaksiDetails');

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
                    Route::post('/cancel-import', 'cancelImport')->name('import.cancel');
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
                    Route::post('/sos/import', [AnalysisSOSController::class, 'importSosData'])->name('sos.import');
                    Route::post('/update-po-name', 'updatePoName')->name('updatePoName');
                });

            // Grup Controller untuk Analisis JT
            Route::controller(AnalysisJTController::class)
                ->prefix('analysis-jt')
                ->name('analysisJT.')
                ->group(function () {
                    Route::get('/', 'index')->name('index');
                    Route::post('/upload', 'upload')->name('upload');
                    Route::post('/save-config', 'saveConfig')->name('saveConfig');
                    Route::post('/reset-config', 'resetConfig')->name('resetConfig');
                    Route::post('/save-custom-targets', 'saveCustomTargets')->name('saveCustomTargets');
                    Route::get('/export', 'export')->name('export');
                    Route::post('/upload-po-list', 'uploadPoList')->name('uploadPoList');
                    Route::post('/add-po', 'addPoManually')->name('addPo');
                    Route::post('/import/cancel', 'cancelImport')->name('import.cancel');

                    // Route Polling Progress
                    Route::get('/progress/{batchId}', 'getImportProgress')->name('getImportProgress');
                });

            Route::controller(MasterDataPOController::class)
                ->prefix('master-data-po')
                ->name('masterDataPO.')
                ->group(function () {
                    Route::get('/', 'index')->name('index');
                    Route::post('/upload', 'upload')->name('upload');
                    Route::post('/store', 'store')->name('store'); // Manual Add
                    Route::post('/update-mapping', 'updateMapping')->name('updateMapping'); // Mapping Action
                });

            // Rute Resource untuk Account Officer (hanya store dan update)
            Route::resource('account-officers', AccountOfficerController::class)->only(['store', 'update']);

            // Rute untuk Excel Merge
            Route::get('/merge-excel', [ExcelMergeController::class, 'create'])->name('merge-excel.create');
            Route::post('/merge-excel', [ExcelMergeController::class, 'merge'])->name('merge-excel.merge');
            Route::get('/merge-excel/download', [ExcelMergeController::class, 'download'])->name('merge-excel.download');
            Route::get('/merge-excel/download-url', [ExcelMergeController::class, 'getDownloadUrl'])->name('merge-excel.download-url');

            // Route untuk Edit Record Dinamis
            Route::get('/record/{type}/{id}', [DynamicRecordController::class, 'edit'])->name('record.edit');
            Route::put('/record/{type}/{id}', [DynamicRecordController::class, 'update'])->name('record.update');

            Route::get('/embed-info', [EmbedController::class, 'show'])->name('embed.show');
            Route::post('/embed-info', [EmbedController::class, 'save'])->name('embed.save');
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
            Route::resource('users', UserController::class);

            // Controller untuk Fitur Super Admin Lainnya (Termasuk Rollback)
            Route::controller(SuperAdminController::class)->group(function () {
                Route::get('/rollback', 'showRollbackPage')->name('rollback.show');
                Route::post('/rollback', 'executeRollback')->name('rollback.execute'); // Rollback Digital Product
                Route::post('/rollback-jt', 'executeRollbackJT')->name('rollback.executeJT'); // Rollback JT
                Route::post('/rollback-datin', 'executeRollbackDatin')->name('rollback.executeDatin'); // Rollback Datin
            });
        });
});

require __DIR__.'/auth.php';
