<?php

use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\DashboardDigitalProductController;
use App\Http\Controllers\AnalysisDigitalProductController;
use App\Http\Controllers\AccountOfficerController;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
*/

Route::get('/', function () {
    return Inertia::render('Welcome', [
        'canLogin' => Route::has('login'),
        'canRegister' => Route::has('register'),
        'laravelVersion' => Application::VERSION,
        'phpVersion' => PHP_VERSION,
    ]);
});

// Rute yang memerlukan autentikasi
Route::middleware(['auth', 'verified'])->group(function () {

    // --- DASHBOARD ---
    Route::get('/dashboard', [DashboardDigitalProductController::class, 'index'])->name('dashboard'); // Ubah ke /dashboard untuk standar
    Route::get('/dashboardDigitalProduct', [DashboardDigitalProductController::class, 'index'])->name('dashboardDigitalProduct');


    // --- ANALYSIS DIGITAL PRODUCT ---
    Route::prefix('analysisDigitalProduct')->name('analysisDigitalProduct.')->controller(AnalysisDigitalProductController::class)->group(function () {
        Route::get('/', 'index')->name('index'); // nama rute: analysisDigitalProduct.index
        Route::post('/upload', 'upload')->name('upload');
        Route::post('/targets', 'updateTargets')->name('targets');Route::post('/upload-complete', 'uploadComplete')->name('uploadComplete');
        Route::post('/sync-complete', 'syncCompletedOrders')->name('syncComplete');
        Route::post('/upload-cancel', 'uploadCancel')->name('uploadCancel');
        Route::post('/sync-cancel', 'syncCanceledOrders')->name('syncCancel');
        Route::get('/export/inprogress', 'exportInProgress')->name('export.inprogress');
    });

    // --- ACCOUNT OFFICERS (CRUD) ---
    Route::post('/account-officers', [AccountOfficerController::class, 'store'])->name('account-officers.store');
    Route::put('/account-officers/{officer}', [AccountOfficerController::class, 'update'])->name('account-officers.update');

    // --- MANUAL & QC UPDATE ACTIONS ---
    Route::put('/manual-update/complete/{order_id}', [AnalysisDigitalProductController::class, 'updateManualComplete'])->name('manual.update.complete');
    Route::put('/manual-update/cancel/{order_id}', [AnalysisDigitalProductController::class, 'updateManualCancel'])->name('manual.update.cancel');
    Route::put('/qc-update/{order_id}/progress', [AnalysisDigitalProductController::class, 'updateQcStatusToProgress'])->name('qc.update.progress');
    Route::put('/qc-update/{order_id}/done', [AnalysisDigitalProductController::class, 'updateQcStatusToDone'])->name('qc.update.done');

    // --- IMPORT PROGRESS BAR ---
    Route::get('/import-progress/{batchId}', [AnalysisDigitalProductController::class, 'getImportProgress'])->name('import.progress');

    // --- PROFIL PENGGUNA ---
    Route::prefix('profile')->controller(ProfileController::class)->group(function () {
        Route::get('/', 'edit')->name('profile.edit');
        Route::patch('/', 'update')->name('profile.update');
        Route::delete('/', 'destroy')->name('profile.destroy');
    });

    Route::post('/analysis-digital-product/config', [AnalysisDigitalProductController::class, 'saveTableConfig'])->name('analysisDigitalProduct.saveConfig');
});

// Rute Autentikasi Bawaan Laravel
require __DIR__.'/auth.php';
