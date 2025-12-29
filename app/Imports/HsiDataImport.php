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
        // Normalisasi input Witel (Uppercase & Trim)
        $witelInput = isset($row['witel']) ? strtoupper(trim($row['witel'])) : null;

        // Filter: Hanya import jika Witel ada di daftar RSO 2 (Case Insensitive sudah dihandle di atas)
        if (!$witelInput || !in_array($witelInput, $this->allowedWitels)) {
            return null; 
        }

        return new HsiData([
            // --- 1. IDENTITAS & LOKASI ---
            'nomor'             => $row['nomor'] ?? null,
            'order_id'          => $row['order_id'] ?? $row['nomor_order'] ?? $row['orderid'] ?? null,
            'regional'          => $row['regional'] ?? null,
            'witel'             => $witelInput,
            'regional_old'      => $row['regional_old'] ?? null,
            'witel_old'         => $row['witel_old'] ?? $row['witelold'] ?? null,
            'datel'             => $row['datel'] ?? null,
            'sto'               => $row['sto'] ?? null,
            'unit'              => $row['unit'] ?? null,

            // --- 2. DETAIL TRANSAKSI ---
            'jenis_psb'         => $row['jenis_psb'] ?? $row['jenispsb'] ?? null,
            'type_trans'        => $row['type_trans'] ?? $row['typetrans'] ?? null,
            'type_layanan'      => $row['type_layanan'] ?? $row['typelayanan'] ?? null,
            'status_resume'     => $row['status_resume'] ?? null,
            'provider'          => $row['provider'] ?? null,

            // --- 3. TANGGAL (Penting: Transform Date) ---
            'order_date'        => $this->transformDate($row['order_date'] ?? null),
            'last_updated_date' => $this->transformDate($row['last_updated_date'] ?? null),
            
            // --- 4. DATA PELANGGAN & TEKNIS ---
            'ncli'              => $row['ncli'] ?? null,
            'pots'              => $row['pots'] ?? null,
            'speedy'            => $row['speedy'] ?? null,
            'customer_name'     => $row['customer_name'] ?? $row['nama_pelanggan'] ?? null,
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

            // --- 9. PERIODE & PROSES (Kolom Baru dari 67 Kolom) ---
            'tahun'             => $row['tahun'] ?? null,
            'bulan'             => $row['bulan'] ?? null,
            'tanggal'           => $row['tanggal'] ?? null,
            'ps_1'              => $this->transformDate($row['ps_1'] ?? $row['ps1'] ?? null),
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
     * LOGIKA TRANSFORMASI TANGGAL YANG KUAT
     * Menangani: Excel Serial Number, String Format (Y-m-d, d/m/Y), dan Swap Date Logic.
     */
    private function transformDate($value)
    {
        // Cek nilai kosong atau placeholder error Excel
        if (empty($value) || $value === '-' || $value === '#N/A' || $value === 'NaT') {
            return null;
        }

        try {
            $date = null;

            // 1. Parsing jika formatnya Excel Serial Number (angka, misal: 45265)
            if (is_numeric($value)) {
                $date = Date::excelToDateTimeObject($value);
                $date = Carbon::instance($date);
            } 
            // 2. Parsing jika sudah instance DateTime (kadang library Excel otomatis convert)
            elseif ($value instanceof \DateTimeInterface) {
                $date = Carbon::instance($value);
            } 
            // 3. Parsing jika String
            else {
                // Bersihkan string dari karakter aneh
                $value = trim($value);
                
                // Coba parse format standar Y-m-d H:i:s atau Y-m-d
                try {
                    $date = Carbon::parse($value);
                } catch (\Exception $e) {
                    // Fallback jika formatnya d/m/Y (umum di Indonesia/Excel lokal)
                    try {
                        $date = Carbon::createFromFormat('d/m/Y', $value);
                    } catch (\Exception $ex) {
                         // Fallback terakhir: Coba format m/d/Y
                         try {
                            $date = Carbon::createFromFormat('m/d/Y', $value);
                         } catch (\Exception $ex2) {
                            return null; // Menyerah, kembalikan null
                         }
                    }
                }
            }

            // 4. Logic Tukar Bulan/Tanggal (US Format Fix)
            // Ini HANYA dijalankan jika user secara eksplisit memilih format m/d/Y saat upload
            // Tujuannya membalik tanggal (misal 4/12 -> 4 Des) menjadi (12/4 -> 12 Apr) jika user salah pilih format
            if ($this->userDateFormat === 'm/d/Y' && $date) {
                // Syarat swap: Hari saat ini <= 12 (karena angka > 12 tidak mungkin jadi bulan)
                if ($date->day <= 12) {
                     return Carbon::create(
                        $date->year, 
                        $date->day,   // Day lama jadi Month baru
                        $date->month, // Month lama jadi Day baru
                        $date->hour, $date->minute, $date->second
                    )->format('Y-m-d H:i:s');
                }
            }

            return $date ? $date->format('Y-m-d H:i:s') : null;

        } catch (\Throwable $e) {
            // Log error jika perlu, tapi kembalikan null agar proses import baris lain tetap jalan
            return null;
        }
    }

    // Mengatur ukuran batch insert (1000 baris per query) untuk performa
    public function batchSize(): int { return 1000; }
    
    // Mengatur ukuran chunk read (membaca 1000 baris dari file ke RAM) untuk hemat memori
    public function chunkSize(): int { return 1000; }
}