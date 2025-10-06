<?php

namespace App\Exports;

use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithEvents;
use Maatwebsite\Excel\Events\AfterSheet;

class KpiPoExport implements FromCollection, WithHeadings, WithMapping, ShouldAutoSize, WithEvents
{
    protected $data;

    public function __construct(Collection $data)
    {
        $this->data = $data;
    }

    public function collection()
    {
        return $this->data;
    }

    public function headings(): array
    {
        // Ini akan menjadi baris header kedua (sub-header)
        return [
            'NAMA PO',
            'WITEL',
            'NCX',
            'SCONE',
            'NCX',
            'SCONE',
            'TOTAL',
            'YTD',
            'Q3',
        ];
    }

    public function map($row): array
    {
        // Pastikan urutan data sesuai dengan header
        return [
            $row['nama_po'],
            $row['witel'],
            $row['done_ncx'],
            $row['done_scone'],
            $row['ogp_ncx'],
            $row['ogp_scone'],
            $row['total'],
            $row['ach_ytd'],
            $row['ach_q3'],
        ];
    }

    public function registerEvents(): array
    {
        return [
            AfterSheet::class => function(AfterSheet $event) {
                $sheet = $event->sheet->getDelegate();

                // Tambah 1 baris baru di atas untuk header utama
                $sheet->insertNewRowBefore(1, 1);

                // Set nilai dan gabungkan sel untuk header utama
                $sheet->setCellValue('A1', ' ')->mergeCells('A1:A2');
                $sheet->setCellValue('B1', ' ')->mergeCells('B1:B2');
                $sheet->setCellValue('C1', 'PRODIGI DONE')->mergeCells('C1:D1');
                $sheet->setCellValue('E1', 'PRODIGI OGP')->mergeCells('E1:F1');
                $sheet->setCellValue('G1', ' ')->mergeCells('G1:G2');
                $sheet->setCellValue('H1', 'ACH')->mergeCells('H1:I1');

                // Styling header
                $sheet->getStyle('A1:I2')->getFont()->setBold(true);
                $sheet->getStyle('A1:I2')->getAlignment()->setHorizontal('center')->setVertical('center');
                $sheet->getStyle('C1')->getFill()->setFillType('solid')->getStartColor()->setARGB('ED7D31'); // Oranye
                $sheet->getStyle('E1')->getFill()->setFillType('solid')->getStartColor()->setARGB('4472C4'); // Biru
                $sheet->getStyle('H1')->getFill()->setFillType('solid')->getStartColor()->setARGB('FFC000'); // Kuning
            },
        ];
    }
}
