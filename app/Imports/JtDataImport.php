<?php

namespace App\Imports;

use Carbon\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Maatwebsite\Excel\Concerns\ToModel;
use Maatwebsite\Excel\Concerns\WithBatchInserts;
use Maatwebsite\Excel\Concerns\WithHeadingRow;

// PERHATIKAN: Tanpa WithChunkReading agar Synchronous
class JtDataImport implements ToModel, WithHeadingRow, WithBatchInserts
{
    protected $batchId;
    protected $totalRows;
    protected $currentRow = 0;

    public function __construct(string $batchId, int $totalRows)
    {
        $this->batchId = $batchId;
        $this->totalRows = $totalRows > 0 ? $totalRows : 1;
    }

    public function model(array $row)
    {
        // 1. Update Progress Bar (TETAP)
        ++$this->currentRow;
        if ($this->currentRow % 20 === 0) {
            $percentage = 5 + (($this->currentRow / $this->totalRows) * 90);
            $percentage = min(round($percentage), 98);
            Cache::put('import_progress_'.$this->batchId, $percentage, now()->addHour());
        }

        // 2. Validasi Baris Kosong (TETAP)
        if (empty($row['witel_lama']) && empty($row['segmen']) && empty($row['region']) && empty($row['no_nde_spmk'])) {
            return null;
        }

        // 3. Bersihkan Data (TETAP)
        $witelLama = trim($row['witel_lama'] ?? '');
        $segmen = trim($row['segmen'] ?? '');
        $status_i_hld = strtolower($row['status_i_hld'] ?? '');
        $keterangan_toc = strtolower($row['keterangan_toc'] ?? '');
        $baDrop = strtolower($row['ba_drop'] ?? '');
        $idIHld = trim($row['id_i_hld'] ?? '');
        $noNdeSpmk = trim($row['no_nde_spmk'] ?? '');

        // Parsing Tanggal
        $tanggalMom = $this->parseDate($row['tanggal_mom'] ?? null);
        $tanggalCb = $this->parseDate($row['tanggal_cb'] ?? null);

        // 4. Logika Bisnis (TETAP)
        $poName = $this->determinePoName($witelLama, $segmen);
        $isGoLive =
            str_contains($keterangan_toc, 'go live') || str_contains($status_i_hld, 'go live');

        $goLive = $isGoLive ? 'Y' : 'N';
        $populasiNonDrop = str_contains($baDrop, 'drop') ? 'N' : 'Y';

        $tahunRaw = $row['tahun'] ?? '';
        $tahun = (preg_match('/^[0-9]{4}$/', $tahunRaw)) ? $tahunRaw : null;

        $usia = $tanggalMom ? Carbon::now()->diffInDays(Carbon::parse($tanggalMom)) : null;
        $bulan = isset($row['bulan']) ? substr($row['bulan'], 0, 7) : null;

        // 5. DATA VALUES
        $values = [
            'bulan' => $bulan,
            'tahun' => $tahun,
            'id_i_hld' => $idIHld ?: null,
            'no_nde_spmk' => $noNdeSpmk ?: null,
            'region' => $row['region'] ?? null,
            'witel_lama' => $witelLama,
            'witel_baru' => $row['witel_baru'] ?? null,
            'uraian_kegiatan' => $row['uraian_kegiatan'] ?? null, // Simpan apa adanya
            'segmen' => $segmen,
            'po_name' => $poName,
            'jenis_kegiatan' => $row['jenis_kegiatan'] ?? null,
            'status_proyek' => $row['status_proyek'] ?? null,
            'go_live' => $goLive,
            'keterangan_toc' => $row['keterangan_toc'] ?? null,
            'tanggal_cb' => $tanggalCb,
            'tanggal_mom' => $tanggalMom,
            'usia' => $usia,
            'revenue_plan' => $this->cleanCurrency($row['revenue_plan'] ?? ''),
            'rab' => $this->cleanCurrency($row['rab'] ?? ''),
            'perihal_nde_spmk' => $row['perihal_nde_spmk'] ?? null,
            'mom' => $row['mom'] ?? null,
            'ba_drop' => $row['ba_drop'] ?? null,
            'populasi_non_drop' => $populasiNonDrop,
            'total_port' => $row['total_port'] ?? null,
            'template_durasi' => $row['template_durasi'] ?? null,
            'toc' => $row['toc'] ?? null,
            'umur_pekerjaan' => $row['umur_pekerjaan'] ?? null,
            'kategori_umur_pekerjaan' => $row['kategori_umur_pekerjaan'] ?? null,
            'status_tomps_last_activity' => $row['status_tomps_last_activity'] ?? null,
            'status_tomps_new' => $row['status_tomps_new'] ?? null,
            'status_i_hld' => $row['status_i_hld'] ?? null,
            'nama_odp_go_live' => $row['nama_odp_go_live'] ?? null,
            'bak' => $row['bak'] ?? null,
            'keterangan_pelimpahan' => $row['keterangan_pelimpahan'] ?? null,
            'mitra_lokal' => $row['mitra_lokal'] ?? null,

            // Kolom Sistem
            'updated_at' => now(),
            'created_at' => now(),
            'batch_id' => $this->batchId,
        ];

        // 6. EKSEKUSI (Perubahan Utama Disini)
        // Kita HAPUS logika "Cek if exists lalu update".
        // Kita paksa INSERT semua baris yang ada di Excel.

        DB::table('spmk_mom')->insert($values);

        return null;
    }

    // --- Helper Functions ---

    private function parseDate($dateString)
    {
        if (!$dateString) {
            return null;
        }
        try {
            if (is_numeric($dateString)) {
                return \PhpOffice\PhpSpreadsheet\Shared\Date::excelToDateTimeObject($dateString)->format('Y-m-d');
            }

            return Carbon::createFromFormat('d-M-y', $dateString)->format('Y-m-d');
        } catch (\Throwable $e) {
            try {
                return Carbon::parse($dateString)->format('Y-m-d');
            } catch (\Throwable $ex) {
                return null;
            }
        }
    }

    private function cleanCurrency($value)
    {
        if (is_null($value)) {
            return null;
        }
        $cleaned = preg_replace('/[^0-9]/', '', $value);

        return $cleaned === '' ? null : $cleaned;
    }

    private function determinePoName($witel, $segmen)
    {
        $witel = strtoupper(trim($witel));
        $segmen = strtoupper(trim($segmen));

        $directMapping = [
            'WITEL MADIUN' => 'ALFONSUS',
            'WITEL JEMBER' => 'ILHAM MIFTAHUL',
            'WITEL PASURUAN' => 'I WAYAN KRISNA',
            'WITEL SIDOARJO' => 'IBRAHIM MUHAMMAD',
            'WITEL KEDIRI' => 'LUQMAN KURNIAWAN',
            'WITEL MALANG' => 'NURTRIA IMAN',
            'WITEL NTT' => 'MARIA FRANSISKA',
            'WITEL NTB' => 'ANDRE YANA',
        ];

        if (isset($directMapping[$witel])) {
            return $directMapping[$witel];
        }
        if (in_array($witel, ['WITEL DENPASAR', 'WITEL SINGARAJA'])) {
            return 'DIASTANTO';
        }

        if (in_array($witel, ['WITEL SURABAYA UTARA', 'WITEL SURABAYA SELATAN', 'WITEL MADURA'])) {
            if ($segmen === 'DBS') {
                return 'FERIZKA PARAMITHA';
            }
            if ($segmen === 'DGS') {
                return 'EKA SARI';
            }
            if (in_array($segmen, ['DES', 'DSS', 'DPS'])) {
                return 'DWIEKA SEPTIAN';
            }
        }

        return '';
    }

    public function batchSize(): int
    {
        return 500;
    }
}
