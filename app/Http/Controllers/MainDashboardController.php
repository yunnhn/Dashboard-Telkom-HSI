<?php
namespace App\Http\Controllers;

use Illuminate\Support\Facades\Cache;
use Inertia\Inertia;

class MainDashboardController extends Controller
{
    public function show()
    {
        $settings = Cache::get('global_embed_settings', [
            'enabled' => false,
            'url' => '',
        ]);

        if ($settings['enabled'] && !empty($settings['url'])) {
            // Tampilkan halaman iframe eksternal
            return Inertia::render('Dashboard/ExternalEmbed', [
                'embedUrl' => $settings['url']
            ]);
        }

        // Jika tidak, alihkan ke dashboard internal bawaan
        // (Ganti ini ke dashboard default Anda, misal Digital Product)
        return redirect()->route('dashboardDigitalProduct');
    }
}
