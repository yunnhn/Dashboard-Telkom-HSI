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
    private $allowedWitels = ['BALI', 'JATIM BARAT', 'JATIM TIMUR', 'SURAMADU', 'NUSA TENGGARA'];
    private $userDateFormat;

    public function __construct($format)
    {
        $this->userDateFormat = $format; 
    }

    public function model(array $row)
    {
        $witelInput = isset($row['witel']) ? strtoupper(trim($row['witel'])) : null;

        if (!$witelInput || !in_array($witelInput, $this->allowedWitels)) {
            return null; 
        }

        return new HsiData([
            'nomor_order'       => $row['nomor_order'] ?? $row['order_id'] ?? null,
            'regional'          => $row['regional'] ?? null,
            'witel'             => $witelInput,
            'witel_old'         => $row['witel_old'] ?? $row['witelold'] ?? null,
            'sto'               => $row['sto'] ?? null,
            'unit'              => $row['unit'] ?? null,
            'jenis_psb'         => $row['jenis_psb'] ?? null,
            'type_trans'        => $row['type_trans'] ?? null,
            'type_layanan'      => $row['type_layanan'] ?? null,
            'status_resume'     => $row['status_resume'] ?? null,
            'provider'          => $row['provider'] ?? null,
            
            // CONVERT DATE
            'order_date'        => $this->transformDate($row['order_date'] ?? null),
            'last_updated_date' => $this->transformDate($row['last_updated_date'] ?? null),
            'tgl_ps'            => $this->transformDate($row['tgl_ps'] ?? null),
            'tgl_manja'         => $this->transformDate($row['tgl_manja'] ?? null),

            'ncli'              => $row['ncli'] ?? null,
            'pots'              => $row['pots'] ?? null,
            'speedy'            => $row['speedy'] ?? null,
            'customer_name'     => $row['customer_name'] ?? null,
            'loc_id'            => $row['loc_id'] ?? null,
            'wonum'             => $row['wonum'] ?? null,
            'contact_hp'        => $row['contact_hp'] ?? null,
            'ins_address'       => $row['ins_address'] ?? null,
            'gps_longitude'     => $row['gps_longitude'] ?? null,
            'gps_latitude'      => $row['gps_latitude'] ?? null,
            'kcontact'          => $row['kcontact'] ?? null,
            'channel'           => $row['channel'] ?? null,
            'status_inet'       => $row['status_inet'] ?? null,
            'status_onu'        => $row['status_onu'] ?? null,
            'upload'            => $row['upload'] ?? null,
            'download'          => $row['download'] ?? null,
            'last_program'      => $row['last_program'] ?? null,
            'status_voice'      => $row['status_voice'] ?? null,
            'clid'              => $row['clid'] ?? null,
            'last_start'        => $row['last_start'] ?? null,
            'tindak_lanjut'     => $row['tindak_lanjut'] ?? null,
            'isi_comment'       => $row['isi_comment'] ?? null,
            'user_id_tl'        => $row['user_id_tl'] ?? null,
            'kelompok_kendala'  => $row['kelompok_kendala'] ?? null,
            'kelompok_status'   => $row['kelompok_status'] ?? null,
            'hero_addon'        => $row['hero_addon'] ?? null,
            'status_message'    => $row['status_message'] ?? null,
            'package_name'      => $row['package_name'] ?? null,
            'group_paket'       => $row['group_paket'] ?? null,
            'reason_cancel'     => $row['reason_cancel'] ?? null,
            'keterangan_cancel' => $row['keterangan_cancel'] ?? null,
            'detail_manja'      => $row['detail_manja'] ?? null,
            'sub_error_code'    => $row['suberrorcode'] ?? $row['sub_error_code'] ?? null,
            'engineer_memo'     => $row['engineermemo'] ?? $row['engineer_memo'] ?? null,
            'data_proses'       => $row['data_proses'] ?? $row['dataproses'] ?? null,
            'no_order_reval'    => $row['no_order_reval'] ?? null,
            'data_ps_revoke'    => $row['data_ps_revoke'] ?? null,
        ]);
    }

    /**
     * LOGIKA "TUKAR PAKSA"
     * Jika hasilnya terbaca 12 April (d=12, m=4), padahal user pilih Format US (m/d/Y),
     * Kita paksa tukar menjadi 4 Desember (d=4, m=12).
     */
    private function transformDate($value)
    {
        if (empty($value)) return null;

        try {
            $date = null;

            // 1. Parsing awal (biarkan dia salah dulu tidak apa-apa)
            if (is_numeric($value)) {
                $date = Date::excelToDateTimeObject($value); // Dapat Object DateTime
                $date = Carbon::instance($date); // Ubah ke Carbon
            } elseif ($value instanceof \DateTimeInterface) {
                $date = Carbon::instance($value);
            } else {
                // Parse string biasa
                $date = Carbon::parse($value);
            }

            // 2. CEK & TUKAR (SWAP LOGIC)
            // Jika user memilih format 'm/d/Y' (Bulan Dulu) ...
            if ($this->userDateFormat === 'm/d/Y') {
                // ... TAPI sistem membacanya sebagai tanggal yang "terbalik"
                // Contoh Kasus Anda: Terbaca 2025-04-12 (April 12).
                // $date->day = 12
                // $date->month = 4
                
                // Kita mau ubah jadi: 2025-12-04
                // Bulan harusnya 12 (ambil dari day yang salah)
                // Tanggal harusnya 4 (ambil dari month yang salah)
                
                // Syarat tukar: Angka tanggal saat ini (12) harus <= 12 (karena akan jadi bulan)
                if ($date->day <= 12) {
                     return Carbon::create(
                        $date->year, 
                        $date->day,   // Jadikan Day sebagai MONTH (12)
                        $date->month, // Jadikan Month sebagai DAY (4)
                        $date->hour, $date->minute, $date->second
                    )->format('Y-m-d H:i:s');
                }
            }

            // Jika tidak perlu ditukar (atau format lain), kembalikan apa adanya
            return $date->format('Y-m-d H:i:s');

        } catch (\Throwable $e) {
            return null;
        }
    }

    public function batchSize(): int { return 1000; }
    public function chunkSize(): int { return 1000; }
}