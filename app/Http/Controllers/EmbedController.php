<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Inertia\Inertia;
use Illuminate\Validation\Rule; // <-- Tambahkan ini

class EmbedController extends Controller
{
    /**
     * Kunci cache untuk pengaturan.
     */
    private const EMBED_SETTINGS_KEY = 'granular_embed_settings';

    /**
     * [BARU] Struktur pengaturan default.
     */
    private const DEFAULT_SETTINGS = [
        'jt' => ['enabled' => false, 'url' => ''],
        'datin' => ['enabled' => false, 'url' => ''],
        'digitalProduct' => ['enabled' => false, 'url' => ''],
    ];

    /**
     * Menampilkan halaman statis untuk petunjuk embed dashboard.
     */
    public function show()
    {
        // Ambil pengaturan yang ada, atau gunakan default jika tidak ada
        $settings = Cache::get(self::EMBED_SETTINGS_KEY, self::DEFAULT_SETTINGS);

        // Pastikan semua kunci ada (jika ada dashboard baru ditambahkan di default)
        $settings = array_merge(self::DEFAULT_SETTINGS, $settings);

        return Inertia::render('Admin/EmbedInfo', [
            'embedSettings' => $settings, // Kirim pengaturan ke frontend
        ]);
    }

    /**
     * [DIMODIFIKASI] Menyimpan pengaturan embed eksternal.
     */
    public function save(Request $request)
    {
        // Hanya Super Admin yang boleh menyimpan
        if ($request->user()->role !== 'superadmin') {
            abort(403);
        }

        // Validasi data yang masuk
        $validated = $request->validate([
            'jt.enabled' => 'required|boolean',
            'jt.url' => 'nullable|url',
            'datin.enabled' => 'required|boolean',
            'datin.url' => 'nullable|url',
            'digitalProduct.enabled' => 'required|boolean',
            'digitalProduct.url' => 'nullable|url',
        ]);

        // Validasi kustom: Jika 'enabled' true, 'url' wajib diisi
        $errors = [];
        foreach ($validated as $key => $settings) {
            if ($settings['enabled'] && empty($settings['url'])) {
                $errors["$key.url"] = "URL wajib diisi jika embed untuk dashboard ini diaktifkan.";
            }
        }

        if (!empty($errors)) {
            return back()->withErrors($errors);
        }

        // Simpan pengaturan ke cache selamanya
        Cache::forever(self::EMBED_SETTINGS_KEY, $validated);

        return back()->with('success', 'Pengaturan embed telah disimpan!');
    }
}
