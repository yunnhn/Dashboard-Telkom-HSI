<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\WithEvents;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Events\AfterSheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class JtReportExport implements FromArray, WithHeadings, WithEvents, WithStyles
{
    protected $data;

    /**
     * @var array Kolom dan urutan yang akan diekspor.
     *            Ini HARUS sesuai dengan urutan header di bawah.
     */
    protected $columnOrder = [
        'witel',
        'jml_lop_exc_drop',
        'rev_all_lop',
        'initial',
        'survey_drm',
        'perizinan_mos',
        'instalasi',
        'fi_ogp_live',
        'golive_jml_lop',
        'golive_rev_lop',
        'drop',
        'percent_close',
    ];

    public function __construct(array $data)
    {
        $this->data = $data;
    }

    /**
     * Menyiapkan data.
     * Kita memformat ulang data agar sesuai dengan urutan kolom yang kita inginkan.
     */
    public function array(): array
    {
        $exportData = [];

        foreach ($this->data as $row) {
            $newRow = [];
            foreach ($this->columnOrder as $key) {
                // Ambil nilai, default ke 0 jika null, kecuali untuk witel
                $value = $row[$key] ?? 0;

                // Khusus kolom witel, biarkan apa adanya (string)
                if ($key === 'witel') {
                    $value = $row[$key];
                }

                // Format persentase
                if ($key === 'percent_close' && is_numeric($value)) {
                    $value = round($value, 2);
                }

                $newRow[$key] = $value;
            }
            $exportData[] = $newRow;
        }

        return $exportData;
    }

    /**
     * Kita tidak menggunakan WithHeadings standar,
     * karena kita akan membuatnya secara manual di event AfterSheet.
     */
    public function headings(): array
    {
        return []; // Kosongkan, akan ditangani oleh event
    }

    /**
     * Menerapkan style dasar untuk baris header.
     */
    public function styles(Worksheet $sheet)
    {
        return [
            // Style baris 1 dan 2 (Header)
            1 => ['font' => ['bold' => true]],
            2 => ['font' => ['bold' => true]],
        ];
    }

    /**
     * Membuat header multi-baris kustom setelah sheet dibuat.
     */
    public function registerEvents(): array
    {
        return [
            AfterSheet::class => function (AfterSheet $event) {
                $sheet = $event->sheet->getDelegate();

                // 1. Buat 2 baris baru di atas untuk header
                $sheet->insertNewRowBefore(1, 2);

                // == DEFINISI HEADER ==
                // Baris 1 (Header Grup)
                $sheet->setCellValue('A1', 'WITEL');
                $sheet->setCellValue('B1', 'JUMLAH LOP (exc Drop)');
                $sheet->setCellValue('C1', 'REV ALL LOP');
                $sheet->setCellValue('D1', 'PROGRESS DEPLOY');
                $sheet->setCellValue('I1', 'GOLIVE (exc Drop)');
                $sheet->setCellValue('K1', 'DROP');
                $sheet->setCellValue('L1', '%CLOSE');

                // Baris 2 (Header Kolom)
                $sheet->setCellValue('D2', 'INITIAL');
                $sheet->setCellValue('E2', 'SURVEY & DRM');
                $sheet->setCellValue('F2', 'PERIZINAN & MOS');
                $sheet->setCellValue('G2', 'INSTALASI');
                $sheet->setCellValue('H2', 'FI-OGP LIVE');
                $sheet->setCellValue('I2', 'JML LOP');
                $sheet->setCellValue('J2', 'REV LOP');

                // == MERGE CELLS ==
                $sheet->mergeCells('A1:A2');
                $sheet->mergeCells('B1:B2');
                $sheet->mergeCells('C1:C2');
                $sheet->mergeCells('D1:H1'); // Grup Progress Deploy
                $sheet->mergeCells('I1:J1'); // Grup Golive
                $sheet->mergeCells('K1:K2');
                $sheet->mergeCells('L1:L2');

                // == STYLING HEADER ==
                $headerRange = 'A1:L2';
                $styleArray = [
                    'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
                    'alignment' => [
                        'horizontal' => Alignment::HORIZONTAL_CENTER,
                        'vertical' => Alignment::VERTICAL_CENTER,
                        'wrapText' => true,
                    ],
                    'fill' => [
                        'fillType' => Fill::FILL_SOLID,
                        'startColor' => ['rgb' => '0D47A1'], // Biru tua
                    ],
                    'borders' => [
                        'allBorders' => [
                            'borderStyle' => Border::BORDER_THIN,
                            'color' => ['rgb' => '9E9E9E'],
                        ],
                    ],
                ];
                $sheet->getStyle($headerRange)->applyFromArray($styleArray);

                // Style spesifik untuk grup Golive
                $sheet->getStyle('I1:J2')->getFill()->getStartColor()->setRGB('1B5E20'); // Hijau tua

                // Style spesifik untuk grup Drop
                $sheet->getStyle('K1:K2')->getFill()->getStartColor()->setRGB('B71C1C'); // Merah tua

                // [PERBAIKAN DIMULAI DARI SINI]
                // Style untuk seluruh data (agar konsisten)
                $maxRow = $sheet->getHighestRow();
                if ($maxRow >= 3) {
                    $dataStyleArray = [
                        'borders' => [
                            'allBorders' => [
                                'borderStyle' => Border::BORDER_THIN,
                                'color' => ['rgb' => 'E0E0E0'], // <-- Warna sekarang di dalam array
                            ],
                        ],
                    ];
                    // Terapkan style border ke semua data
                    $sheet->getStyle('A3:L'.$maxRow)->applyFromArray($dataStyleArray);
                }
                // [AKHIR PERBAIKAN]

                // Format kolom Persentase
                $sheet->getStyle('L3:L'.$maxRow)->getNumberFormat()->setFormatCode('0.00"%"');
                // Format kolom Angka
                $sheet->getStyle('B3:B'.$maxRow)->getNumberFormat()->setFormatCode('#,##0');
                $sheet->getStyle('D3:H'.$maxRow)->getNumberFormat()->setFormatCode('#,##0');
                $sheet->getStyle('I3:I'.$maxRow)->getNumberFormat()->setFormatCode('#,##0');
                $sheet->getStyle('K3:K'.$maxRow)->getNumberFormat()->setFormatCode('#,##0');
                // Format kolom Mata Uang (Revenue)
                $sheet->getStyle('C3:C'.$maxRow)->getNumberFormat()->setFormatCode('Rp #,##0');
                $sheet->getStyle('J3:J'.$maxRow)->getNumberFormat()->setFormatCode('Rp #,##0');

                // Atur Lebar Kolom
                $sheet->getColumnDimension('A')->setWidth(25); // Witel
                foreach (range('B', 'L') as $col) {
                    $sheet->getColumnDimension($col)->setWidth(18);
                }
            },
        ];
    }
}
