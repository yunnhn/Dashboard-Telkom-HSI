<?php

use App\Http\Controllers\AnalysisDigitalProductController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\DashboardDigitalProductController;
use App\Http\Controllers\ManualUpdateController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/info', function () { phpinfo(); });

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

    Route::get('/dashboardDigitalProduct', [DashboardDigitalProductController::class, 'index'])->name('dashboardDigitalProduct');

    // Fitur AnalysisDigitalProduct
    Route::get('/analysisDigitalProduct', [AnalysisDigitalProductController::class, 'index'])->name('analysisDigitalProduct');
    Route::prefix('analysisDigitalProduct')->controller(AnalysisDigitalProductController::class)->group(function () {
        Route::post('/upload', 'upload')->name('analysisDigitalProduct.upload');
        Route::post('/targets', 'updateTargets')->name('analysisDigitalProduct.targets');
    });

    // Aksi Manual Update (dipindahkan ke sini agar terlindungi)
    Route::put('/manual-update/{order_id}/complete', [ManualUpdateController::class, 'complete'])->name('manual.update.complete');
    Route::delete('/manual-update/{order_id}/cancel', [ManualUpdateController::class, 'cancel'])->name('manual.update.cancel');

    // Profil Pengguna
    Route::prefix('profile')->controller(ProfileController::class)->group(function () {
        Route::get('/', 'edit')->name('profile.edit');
        Route::patch('/', 'update')->name('profile.update');
        Route::delete('/', 'destroy')->name('profile.destroy');
    });

    Route::post('/analysis-digital-product/sync-complete', [AnalysisDigitalProductController::class, 'syncCompletedOrders'])->name('analysisDigitalProduct.syncComplete');
});

// Rute Autentikasi Bawaan Laravel
require __DIR__.'/auth.php';

