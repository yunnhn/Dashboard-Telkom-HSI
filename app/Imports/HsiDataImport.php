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
    private $userDateFormat;

    public function __construct($format)
    {
        $this->userDateFormat = $format; 
    }

    public function model(array $row)
    {
        // 1. PEMBERSIH KUAT (Hapus spasi ganda & karakter hantu Excel)
        $witelRaw = $row['witel'] ?? '';
        // Regex ini menghapus semua karakter aneh yang tidak terlihat
        $witelClean = preg_replace('/[\x00-\x1F\x7F\xA0]/u', '', $witelRaw);
        $witelInput = strtoupper(trim($witelClean));

        // 2. HAPUS FILTER (Biarkan semua data masuk, apa pun nama witelnya)
        $witelInput = isset($row['witel']) ? strtoupper(trim($row['witel'])) : null;
        if (!$witelInput || !in_array($witelInput, $this->allowedWitels)) {
            return null; 
        }

        return new HsiData([
            'nomor'             => $row['nomor'] ?? null,
            'order_id'          => $row['order_id'] ?? $row['nomor_order'] ?? null,
            'regional'          => $row['regional'] ?? null,
            'witel'             => $witelInput, // Simpan witel yang sudah dibersihkan
            'regional_old'      => $row['regional_old'] ?? null,
            'witel_old'         => $row['witel_old'] ?? $row['witelold'] ?? null,
            'datel'             => $row['datel'] ?? null,
            'sto'               => $row['sto'] ?? null,
            'unit'              => $row['unit'] ?? null,
            'jenis_psb'         => $row['jenis_psb'] ?? $row['jenispsb'] ?? null,
            'type_trans'        => $row['type_trans'] ?? null,
            'type_layanan'      => $row['type_layanan'] ?? null,
            'status_resume'     => $row['status_resume'] ?? null,
            'provider'          => $row['provider'] ?? null,
            'order_date'        => $this->transformDate($row['order_date'] ?? null),
            'last_updated_date' => $this->transformDate($row['last_updated_date'] ?? null),
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
            'tgl_comment'       => $this->transformDate($row['tgl_comment'] ?? null),
            'tanggal_manja'     => $this->transformDate($row['tanggal_manja'] ?? null),
            'kelompok_kendala'  => $row['kelompok_kendala'] ?? null,
            'kelompok_status'   => $row['kelompok_status'] ?? null,
            'hero'              => $row['hero'] ?? null,
            'addon'             => $row['addon'] ?? null,
            'tgl_ps'            => $this->transformDate($row['tgl_ps'] ?? null),
            'status_message'    => $row['status_message'] ?? null,
            'package_name'      => $row['package_name'] ?? null,
            'group_paket'       => $row['group_paket'] ?? null,
            'reason_cancel'     => $row['reason_cancel'] ?? null,
            'keterangan_cancel' => $row['keterangan_cancel'] ?? null,
            'tgl_manja'         => $this->transformDate($row['tgl_manja'] ?? null),
            'detail_manja'      => $row['detail_manja'] ?? null,
            'suberrorcode'      => $row['suberrorcode'] ?? $row['sub_error_code'] ?? null,
            'engineermemo'      => $row['engineermemo'] ?? $row['engineer_memo'] ?? null,
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

    private function transformDate($value)
    {
        if (empty($value) || $value == '-' || $value == '#N/A') return null;
        try {
            $date = null;
            if (is_numeric($value)) {
                $date = Date::excelToDateTimeObject($value);
                $date = Carbon::instance($date);
            } elseif ($value instanceof \DateTimeInterface) {
                $date = Carbon::instance($value);
            } else {
                $date = Carbon::parse($value);
            }
            if ($this->userDateFormat === 'm/d/Y' && $date->day <= 12) {
                 return Carbon::create($date->year, $date->day, $date->month, $date->hour, $date->minute, $date->second)->format('Y-m-d H:i:s');
            }
            return $date->format('Y-m-d H:i:s');
        } catch (\Throwable $e) {
            return null;
        }
    }

    public function batchSize(): int { return 1000; }
    public function chunkSize(): int { return 1000; }
}