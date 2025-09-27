<?php

namespace App\Traits;

trait CalculatesProductPrice
{
    /**
     * Menghitung harga produk berdasarkan nama, segmen, dan witel.
     */
    public function calculatePrice(?string $productName, ?string $segment, ?string $witel): int
    {
        if (empty($productName)) {
            return 0;
        }

        // Normalisasi input untuk perbandingan yang andal
        $witel = strtoupper(trim($witel ?? ''));
        $segment = strtoupper(trim($segment ?? ''));
        $lowerProductName = strtolower($productName);

        if (stripos($lowerProductName, 'netmonk') !== false) {
            return 21600;
        }

        if (stripos($lowerProductName, 'OCA') !== false) {
            return 104000;
        }

        if (stripos($lowerProductName, 'antares') !== false) {
            return 35000;
        }

        if (stripos($lowerProductName, 'pijar') !== false) {
            return 582750;
        }

        return 0; // Default jika tidak ada keyword yang cocok
    }
}
