<?php
// app/Exports/DataReportExport.php

namespace App\Exports;

use Illuminate\Contracts\View\View;
use Maatwebsite\Excel\Concerns\FromView;
use Maatwebsite\Excel\Concerns\WithTitle;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;

class DataReportExport implements FromView, WithTitle, ShouldAutoSize
{
    protected $reportDataLegs;
    protected $reportDataSme;
    protected $tableConfig;
    protected $detailsLegs;
    protected $detailsSme;
    protected $period;

    public function __construct(array $reportDataLegs, array $reportDataSme, array $tableConfig, array $detailsLegs, array $detailsSme, string $period)
    {
        $this->reportDataLegs = $reportDataLegs;
        $this->reportDataSme = $reportDataSme;
        $this->tableConfig = $tableConfig;
        $this->detailsLegs = $detailsLegs;
        $this->detailsSme = $detailsSme;
        $this->period = \Carbon\Carbon::parse($period)->format('F Y');
    }

    public function view(): View
    {
        return view('exports.datareport', [
            'reportDataLegs' => $this->reportDataLegs,
            'reportDataSme' => $this->reportDataSme,
            'tableConfig' => $this->tableConfig, // Config dinamis untuk SME
            'detailsLegs' => $this->detailsLegs,
            'detailsSme' => $this->detailsSme,   // Details yang benar untuk SME
            'period' => $this->period,
        ]);
    }

    public function title(): string
    {
        return 'Data Report All Segments';
    }
}
