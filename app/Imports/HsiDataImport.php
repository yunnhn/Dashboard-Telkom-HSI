<?php

namespace App\Imports;

use App\Models\HsiData;
use Maatwebsite\Excel\Concerns\ToModel;
use Maatwebsite\Excel\Concerns\WithHeadingRow;
use Maatwebsite\Excel\Concerns\WithBatchInserts;
use Maatwebsite\Excel\Concerns\WithChunkReading;
use Carbon\Carbon;
use PhpOffice\PhpSpreadsheet\Shared\Date;

class HsiDataImport implements ToModel, WithHeadingRow, WithBatchInserts, WithChunkReading
{
    private $allowedWitels = ['BALI', 'JATIM BARAT', 'JATIM TIMUR', 'SURAMADU', 'NUSA TENGGARA', 'JAWA TIMUR'];
    private $userDateFormat;

    public function __construct($format)
    {
        $this->userDateFormat = $format; 
    }

    public function model(array $row)
    {
        // Normalisasi input Witel
        $witelInput = isset($row['witel']) ? strtoupper(trim($row['witel'])) : null;

        // Filter: Hanya import jika Witel ada di daftar RSO 2
        if (!$witelInput || !in_array($witelInput, $this->allowedWitels)) {
            return null; 
        }

        return new HsiData([
            // --- 1. IDENTITAS & LOKASI ---
            'nomor'             => $row['nomor'] ?? null,
            'order_id'          => $row['order_id'] ?? $row['nomor_order'] ?? null,
            'regional'          => $row['regional'] ?? null,
            'witel'             => $witelInput,
            'regional_old'      => $row['regional_old'] ?? null,
            'witel_old'         => $row['witel_old'] ?? $row['witelold'] ?? null,
            'datel'             => $row['datel'] ?? null,
            'sto'               => $row['sto'] ?? null,
            'unit'              => $row['unit'] ?? null,

            // --- 2. DETAIL TRANSAKSI ---
            'jenis_psb'         => $row['jenis_psb'] ?? $row['jenispsb'] ?? null,
            'type_trans'        => $row['type_trans'] ?? null,
            'type_layanan'      => $row['type_layanan'] ?? null,
            'status_resume'     => $row['status_resume'] ?? null,
            'provider'          => $row['provider'] ?? null,

            // --- 3. TANGGAL (Penting: Transform Date) ---
            'order_date'        => $this->transformDate($row['order_date'] ?? null),
            'last_updated_date' => $this->transformDate($row['last_updated_date'] ?? null),
            
            // --- 4. DATA PELANGGAN & TEKNIS ---
            'ncli'              => $row['ncli'] ?? null,
            'pots'              => $row['pots'] ?? null,
            'speedy'            => $row['speedy'] ?? null,
            'customer_name'     => $row['customer_name'] ?? null,
            'loc_id'            => $row['loc_id'] ?? null,
            'wonum'             => $row['wonum'] ?? null,
            'flag_deposit'      => $row['flag_deposit'] ?? null,
            'contact_hp'        => $row['contact_hp'] ?? null,
            'ins_address'       => $row['ins_address'] ?? null,
            'gps_longitude'     => $row['gps_longitude'] ?? null,
            'gps_latitude'      => $row['gps_latitude'] ?? null,
            'kcontact'          => $row['kcontact'] ?? null,
            'channel'           => $row['channel'] ?? null,

            // --- 5. STATUS & QUALITY ---
            'status_inet'       => $row['status_inet'] ?? null,
            'status_onu'        => $row['status_onu'] ?? null,
            'upload'            => $row['upload'] ?? null,
            'download'          => $row['download'] ?? null,
            'last_program'      => $row['last_program'] ?? null,
            'status_voice'      => $row['status_voice'] ?? null,
            'clid'              => $row['clid'] ?? null,
            'last_start'        => $row['last_start'] ?? null,

            // --- 6. TINDAK LANJUT & KOMENTAR ---
            'tindak_lanjut'     => $row['tindak_lanjut'] ?? null,
            'isi_comment'       => $row['isi_comment'] ?? null,
            'user_id_tl'        => $row['user_id_tl'] ?? null,
            'tgl_comment'       => $this->transformDate($row['tgl_comment'] ?? null),
            'tanggal_manja'     => $this->transformDate($row['tanggal_manja'] ?? null),

            // --- 7. KENDALA & PAKET ---
            'kelompok_kendala'  => $row['kelompok_kendala'] ?? null,
            'kelompok_status'   => $row['kelompok_status'] ?? null,
            'hero'              => $row['hero'] ?? null,
            'addon'             => $row['addon'] ?? null,
            'tgl_ps'            => $this->transformDate($row['tgl_ps'] ?? null),
            'status_message'    => $row['status_message'] ?? null,
            'package_name'      => $row['package_name'] ?? null,
            'group_paket'       => $row['group_paket'] ?? null,

            // --- 8. PEMBATALAN & MANJA ---
            'reason_cancel'     => $row['reason_cancel'] ?? null,
            'keterangan_cancel' => $row['keterangan_cancel'] ?? null,
            'tgl_manja'         => $this->transformDate($row['tgl_manja'] ?? null),
            'detail_manja'      => $row['detail_manja'] ?? null,
            'suberrorcode'      => $row['suberrorcode'] ?? $row['sub_error_code'] ?? null,
            'engineermemo'      => $row['engineermemo'] ?? $row['engineer_memo'] ?? null,

            // --- 9. PERIODE & PROSES (Kolom Baru) ---
            'tahun'             => $row['tahun'] ?? null,
            'bulan'             => $row['bulan'] ?? null,
            'tanggal'           => $row['tanggal'] ?? null,
            'ps_1'              => $row['ps_1'] ?? null,
            'cek'               => $row['cek'] ?? null,
            'hasil'             => $row['hasil'] ?? null,
            'telda'             => $row['telda'] ?? null,
            'data_proses'       => $row['data_proses'] ?? $row['dataproses'] ?? null,
            'no_order_revoke'   => $row['no_order_revoke'] ?? $row['no_order_reval'] ?? null,
            'data_ps_revoke'    => $row['data_ps_revoke'] ?? null,
            'untuk_ps_pi'       => $row['untuk_ps_pi'] ?? null,
        ]);
    }

    /**
     * LOGIKA TRANSFORMASI TANGGAL
     * Menangani format Excel serial number dan string, serta 
     * fitur 'Swap Date' jika format US/UK tertukar.
     */
    private function transformDate($value)
    {
        if (empty($value) || $value == '-' || $value == '#N/A') return null;

        try {
            $date = null;

            // 1. Parsing
            if (is_numeric($value)) {
                $date = Date::excelToDateTimeObject($value);
                $date = Carbon::instance($date);
            } elseif ($value instanceof \DateTimeInterface) {
                $date = Carbon::instance($value);
            } else {
                // Hapus jam/menit jika ada karakter aneh, atau parse langsung
                $date = Carbon::parse($value);
            }

            // 2. Logic Tukar Bulan/Tanggal (US Format Fix)
            if ($this->userDateFormat === 'm/d/Y') {
                // Jika user pilih m/d/Y, tapi sistem baca d/m/Y, kita tukar.
                // Contoh: 4 Desember (4/12) terbaca 12 April (12/4).
                // Syarat: Day saat ini <= 12 (karena akan jadi bulan).
                if ($date->day <= 12) {
                     return Carbon::create(
                        $date->year, 
                        $date->day,   // Day jadi Month
                        $date->month, // Month jadi Day
                        $date->hour, $date->minute, $date->second
                    )->format('Y-m-d H:i:s');
                }
            }

            return $date->format('Y-m-d H:i:s');

        } catch (\Throwable $e) {
            // Jika gagal parse, kembalikan null agar tidak error fatal
            return null;
        }
    }

    public function batchSize(): int { return 1000; }
    public function chunkSize(): int { return 1000; }
}