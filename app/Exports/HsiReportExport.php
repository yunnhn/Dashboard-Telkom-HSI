<?php

namespace App\Exports;

use Illuminate\Contracts\View\View;
use Maatwebsite\Excel\Concerns\FromView;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithTitle;

class HsiReportExport implements FromView, ShouldAutoSize, WithTitle
{
    protected $reportData;
    protected $totals;

    public function __construct($reportData, $totals)
    {
        $this->reportData = $reportData;
        $this->totals = $totals;
    }

    public function view(): View
    {
        return view('exports.hsi_report', [
            'reportData' => $this->reportData,
            'totals' => $this->totals
        ]);
    }

    public function title(): string
    {
        return 'Report HSI';
    }
}