<?php

namespace App\Exports;

use Illuminate\Contracts\View\View;
use Maatwebsite\Excel\Concerns\FromView;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithEvents;
use Maatwebsite\Excel\Concerns\WithTitle;
use Maatwebsite\Excel\Events\AfterSheet;
use PhpOffice\PhpSpreadsheet\Style\Color;
use PhpOffice\PhpSpreadsheet\Style\Fill;

class SosReportExport implements FromView, WithTitle, ShouldAutoSize, WithEvents
{
    protected $reportData;
    protected $cutoffDate;
    protected $period;
    protected $viewMode;
    protected $galaksiData;

    /**
     * [PERBAIKAN] Tambahkan $galaksiData sebagai parameter ke-5
     * (Kita bisa asumsikan ini array, atau hapus type hint agar fleksibel).
     */
    public function __construct(array $reportData, string $cutoffDate, string $period, string $viewMode, $galaksiData)
    {
        $this->reportData = $reportData;
        $this->cutoffDate = $cutoffDate;
        $this->period = $period;
        $this->viewMode = $viewMode;

        // [PERBAIKAN] Sekarang $galaksiData sudah terdefinisi dari parameter
        $this->galaksiData = $galaksiData;
    }

    public function view(): View
    {
        // View ini sudah benar, tidak perlu diubah
        return view('exports.sos_report', [
            'reportData' => $this->reportData,
            'cutoffDate' => $this->cutoffDate,
            'period' => $this->period,
            'galaksiData' => $this->galaksiData,
        ]);
    }

    public function title(): string
    {
        return 'Report SOS';
    }

    /**
     * [BARU] Mendaftarkan event AfterSheet untuk styling.
     */
    public function registerEvents(): array
    {
        return [
            AfterSheet::class => function (AfterSheet $event) {
                // Tentukan skema warna berdasarkan viewMode
                $aomoTheme = [
                    'segment' => '6495ED', // Cornflower Blue
                    'grand' => '00008B', // Dark Blue
                ];
                $sodoroTheme = [
                    'segment' => 'F08080', // Light Coral (Merah muda)
                    'grand' => '8B0000', // Dark Red
                ];

                $currentTheme = $this->viewMode === 'AOMO' ? $aomoTheme : $sodoroTheme;
                $textColor = new Color(Color::COLOR_WHITE);

                // Daftar nama baris total segmen
                $segmentTotalNames = ['SME', 'GOV', 'PRIVATE', 'SOE'];

                // Mulai dari baris ke-4 (setelah 3 baris header di Blade)
                $startRow = 4;

                // Loop melalui data untuk menemukan baris total dan menerapkannya
                foreach ($this->reportData as $index => $item) {
                    $currentRow = $startRow + $index;

                    if (isset($item['isTotal']) && $item['isTotal']) {
                        $colorToApply = null;

                        if ($item['witel'] === 'GRAND TOTAL') {
                            $colorToApply = $currentTheme['grand'];
                        } elseif (in_array($item['witel'], $segmentTotalNames)) {
                            $colorToApply = $currentTheme['segment'];
                        }

                        if ($colorToApply) {
                            // Terapkan style ke baris AO MO (15 kolom: A sampai O)
                            $event->sheet->getDelegate()->getStyle("A{$currentRow}:O{$currentRow}")
                                ->getFill()
                                ->setFillType(Fill::FILL_SOLID)
                                ->getStartColor()->setARGB($colorToApply);

                            // Ganti warna teks menjadi putih
                            $event->sheet->getDelegate()->getStyle("A{$currentRow}:O{$currentRow}")
                                ->getFont()->setColor($textColor);
                        }
                    }
                }

                // Logika untuk mewarnai tabel SO DO RO
                // Asumsi ada 5 baris spasi + header
                $startRowSodoro = $startRow + count($this->reportData) + 5;
                foreach ($this->reportData as $index => $item) {
                    $currentRow = $startRowSodoro + $index;
                    if (isset($item['isTotal']) && $item['isTotal']) {
                        $colorToApply = null;
                        if ($item['witel'] === 'GRAND TOTAL') {
                            $colorToApply = $currentTheme['grand'];
                        } elseif (in_array($item['witel'], $segmentTotalNames)) {
                            $colorToApply = $currentTheme['segment'];
                        }
                        if ($colorToApply) {
                            // Terapkan style ke baris SO DO RO (9 kolom: A sampai I)
                            $event->sheet->getDelegate()->getStyle("A{$currentRow}:I{$currentRow}")
                                ->getFill()
                                ->setFillType(Fill::FILL_SOLID)
                                ->getStartColor()->setARGB($colorToApply);
                            $event->sheet->getDelegate()->getStyle("A{$currentRow}:I{$currentRow}")
                                ->getFont()->setColor($textColor);
                        }
                    }
                }
            },
        ];
    }
}
