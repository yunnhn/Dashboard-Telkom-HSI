<?php

use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\UserController; // Pastikan ini di-import
use App\Http\Controllers\DashboardDigitalProductController;
use App\Http\Controllers\AnalysisDigitalProductController;
use App\Http\Controllers\ActionBasedController;
use App\Http\Controllers\AccountOfficerController;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
*/

// --- RUTE PUBLIK ---
// Halaman selamat datang untuk tamu
Route::get('/', function () {
    return Inertia::render('Welcome', [
        'canLogin' => Route::has('login'),
        'canRegister' => Route::has('register'),
        'laravelVersion' => Application::VERSION,
        'phpVersion' => PHP_VERSION,
    ]);
});

// --- RUTE YANG MEMERLUKAN AUTENTIKASI ---
// Semua rute di dalam grup ini hanya bisa diakses oleh pengguna yang sudah login
Route::middleware(['auth', 'verified'])->group(function () {

    /*
    |--------------------------------------------------------------------------
    | Rute untuk SEMUA Peran (User, Admin, Superadmin)
    |--------------------------------------------------------------------------
    */
    // Dashboard utama (semua role bisa akses, tampilan diatur oleh frontend)
    Route::get('/dashboard', [DashboardDigitalProductController::class, 'index'])->name('dashboard');
    Route::get('/dashboardDigitalProduct', [DashboardDigitalProductController::class, 'index'])->name('dashboardDigitalProduct');

    // Profil (setiap pengguna bisa mengedit profilnya sendiri)
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    // Progress Bar (kemungkinan dibutuhkan oleh semua role saat import)
    Route::get('/import-progress/{batchId}', [AnalysisDigitalProductController::class, 'getImportProgress'])->name('import.progress');

    Route::get('/action-based', [ActionBasedController::class, 'index'])->name('action-based.index');

    /*
    |--------------------------------------------------------------------------
    | Rute HANYA untuk Admin & Superadmin
    |--------------------------------------------------------------------------
    */
    Route::middleware(['role:admin,superadmin'])->group(function () {
        // Analisis Digital Product
        Route::prefix('analysisDigitalProduct')->name('analysisDigitalProduct.')->controller(AnalysisDigitalProductController::class)->group(function () {
            Route::get('/', 'index')->name('index');
            Route::post('/upload', 'upload')->name('upload');
            Route::post('/targets', 'updateTargets')->name('targets');
            Route::post('/upload-complete', 'uploadComplete')->name('uploadComplete');
            Route::post('/sync-complete', 'syncCompletedOrders')->name('syncComplete');
            Route::post('/upload-cancel', 'uploadCancel')->name('uploadCancel');
            Route::post('/sync-cancel', 'syncCanceledOrders')->name('syncCancel');
            Route::get('/export/inprogress', 'exportInProgress')->name('export.inprogress');
            Route::post('/config', 'saveTableConfig')->name('saveConfig');
            Route::post('/clear-history', 'clearHistory')->name('clearHistory');
            Route::get('/export/history', 'exportHistory')->name('export.history');
            Route::post('/export-report', 'exportReport')->name('export.report');
            Route::post('/custom-targets', 'saveCustomTargets')->name('saveCustomTargets');
            Route::get('/export/kpi-po', 'exportKpiPo')->name('export.kpiPo');
        });

        // Account Officers (CRUD)
        Route::post('/account-officers', [AccountOfficerController::class, 'store'])->name('account-officers.store');
        Route::put('/account-officers/{officer}', [AccountOfficerController::class, 'update'])->name('account-officers.update');

        // Manual & QC Update Actions
        Route::put('/manual-update/complete/{documentData:order_id}', [AnalysisDigitalProductController::class, 'updateManualComplete'])->name('manual.update.complete');
        Route::put('/manual-update/cancel/{documentData:order_id}', [AnalysisDigitalProductController::class, 'updateManualCancel'])->name('manual.update.cancel');

        Route::put('/complete-update/progress/{documentData:order_id}', [AnalysisDigitalProductController::class, 'updateCompleteToProgress'])->name('complete.update.progress');
        Route::put('/complete-update/qc/{documentData:order_id}', [AnalysisDigitalProductController::class, 'updateCompleteToQc'])->name('complete.update.qc');
        Route::put('/complete-update/cancel/{documentData:order_id}', [AnalysisDigitalProductController::class, 'updateCompleteToCancel'])->name('complete.update.cancel');

        Route::put('/qc-update/{documentData:order_id}/progress', [AnalysisDigitalProductController::class, 'updateQcStatusToProgress'])->name('qc.update.progress');
        Route::put('/qc-update/{documentData:order_id}/done', [AnalysisDigitalProductController::class, 'updateQcStatusToDone'])->name('qc.update.done');
        Route::put('/qc-update/{documentData:order_id}/cancel', [AnalysisDigitalProductController::class, 'updateQcStatusToCancel'])->name('qc.update.cancel');
    });


    /*
    |--------------------------------------------------------------------------
    | Rute HANYA untuk Superadmin
    |--------------------------------------------------------------------------
    */
    Route::middleware(['role:superadmin'])->group(function () {
        // Rute ini akan membuat semua rute yang dibutuhkan untuk User Management
        // termasuk GET /users dengan nama 'users.index'
        Route::resource('users', UserController::class);
    });

});

// Rute Autentikasi Bawaan Laravel (login, register, dll.)
require __DIR__.'/auth.php';
