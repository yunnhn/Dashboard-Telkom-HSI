<?php

namespace App\Imports;

use App\Models\SosDataRaw;
use Maatwebsite\Excel\Concerns\ToModel;
use Maatwebsite\Excel\Concerns\WithHeadingRow;
use Maatwebsite\Excel\Concerns\WithChunkReading;
use Maatwebsite\Excel\Concerns\SkipsEmptyRows;
use Carbon\Carbon;

class SOSDataImport implements ToModel, WithHeadingRow, WithChunkReading, SkipsEmptyRows
{
    public function model(array $row)
    {
        // =====================================================================
        // PHASE 1: PEMBERSIHAN AGRESIF (FIX UTAMA ANDA)
        // =====================================================================

        // 1. Buang kolom yang key-nya string kosong ("")
        // Ini mengatasi error: Unknown column '' in 'field list'
        if (isset($row[''])) {
            unset($row['']);
        }

        // 2. Buang kolom yang key-nya null
        unset($row[null]);

        // 3. Validasi Data Utama (NIPNAS wajib ada)
        if (empty($row['nipnas'])) {
            return null;
        }

        // =====================================================================
        // PHASE 2: MAPPING MANUAL (WHITELIST STRATEGY)
        // =====================================================================
        // Kita definisikan ulang array baru agar 100% bersih dari kolom sampah Excel.

        return new SosDataRaw([
            // ID & Relasi
            'nipnas'                => $row['nipnas'] ?? null,
            'standard_name'         => $row['standard_name'] ?? null,
            'order_id'              => $row['order_id'] ?? null,
            'prevorder'             => $row['prevorder'] ?? null,
            'order_subtype'         => $row['order_subtype'] ?? null,
            'order_description'     => $row['order_description'] ?? null,
            'li_sid'                => $row['li_sid'] ?? null,
            'sid'                   => $row['sid'] ?? null,
            'segmen'                => $row['segmen'] ?? null,
            'sub_segmen'            => $row['sub_segmen'] ?? null,

            // Customer
            'custaccntnum'          => $row['custaccntnum'] ?? null,
            'custaccntname'         => $row['custaccntname'] ?? null,
            'custaddr'              => $row['custaddr'] ?? null,
            'custcity'              => $row['custcity'] ?? null,
            'cust_region'           => $row['cust_region'] ?? null,
            'cust_witel'            => $row['cust_witel'] ?? null,

            // Service
            'servaccntnum'          => $row['servaccntnum'] ?? null,
            'servaccntname'         => $row['servaccntname'] ?? null,
            'servaddr'              => $row['servaddr'] ?? null,
            'servcity'              => $row['servcity'] ?? null,
            'service_region'        => $row['service_region'] ?? null,
            'service_witel'         => $row['service_witel'] ?? null,

            // Billing
            'billaccntnum'          => $row['billaccntnum'] ?? null,
            'accountnas'            => $row['accountnas'] ?? null,
            'billaccntname'         => $row['billaccntname'] ?? null,
            'billaddr'              => $row['billaddr'] ?? null,
            'billcity'              => $row['billcity'] ?? null,
            'bill_region'           => $row['bill_region'] ?? null,
            'bill_witel'            => $row['bill_witel'] ?? null,

            // Line Item & Status
            'li_id'                 => $row['li_id'] ?? null,
            'li_productid'          => $row['li_productid'] ?? null,
            'li_product_name'       => $row['li_product_name'] ?? null,
            'product_digital'       => $row['product_digital'] ?? null,
            'li_bandwidth'          => $row['li_bandwidth'] ?? null,
            'li_billdate'           => $this->transformDate($row['li_billdate'] ?? null),
            'li_milestone'          => $row['li_milestone'] ?? null,
            'kategori'              => $row['kategori'] ?? null,
            'billcom_date'          => $this->transformDate($row['billcom_date'] ?? null),
            'li_status'             => $row['li_status'] ?? null,
            'li_status_date'        => $this->transformDate($row['li_status_date'] ?? null),
            'li_fulfillment_status' => $row['li_fulfillment_status'] ?? null,
            'is_termin'             => $row['is_termin'] ?? null,

            // Financials
            'biaya_pasang'          => $this->cleanNumber($row['biaya_pasang'] ?? 0),
            'hrg_bulanan'           => $this->cleanNumber($row['hrg_bulanan'] ?? 0),
            'revenue'               => $this->cleanNumber($row['revenue'] ?? 0),
            'scaling'               => $this->cleanNumber($row['scaling'] ?? 0),
            'li_payment_term'       => $row['li_payment_term'] ?? null,
            'li_billing_start_date' => $this->transformDate($row['li_billing_start_date'] ?? null),
            'order_created_date'    => $this->transformDate($row['order_created_date'] ?? null),

            // Agreements
            'agree_itemnum'         => $row['agree_itemnum'] ?? null,
            'agree_name'            => $row['agree_name'] ?? null,
            'agree_type'            => $row['agree_type'] ?? null,
            'agree_start_date'      => $this->transformDate($row['agree_start_date'] ?? null),
            'agree_end_date'        => $this->transformDate($row['agree_end_date'] ?? null),
            'lama_kontrak_hari'     => $row['lama_kontrak_hari'] ?? null,
            'amortisasi'            => $row['amortisasi'] ?? null,

            // Metadata Lainnya
            'order_createdby'       => $row['order_createdby'] ?? null,
            'li_created_date'       => $this->transformDate($row['li_created_date'] ?? null),
            'order_createdby_name'  => $row['order_createdby_name'] ?? null,
            'current_bandwidth'     => $row['current_bandwidth'] ?? null,
            'before_bandwidth'      => $row['before_bandwidth'] ?? null,
            'product_activation_date' => $this->transformDate($row['product_activation_date'] ?? null),
            'quote_row_id'          => $row['quote_row_id'] ?? null,
            'line_item_description' => $row['line_item_description'] ?? null,
            'asset_integ_id'        => $row['asset_integ_id'] ?? null,
            'action_cd'             => $row['action_cd'] ?? null,
            'kategori_umur'         => $row['kategori_umur'] ?? null,
            'am'                    => $row['am'] ?? null,
            'x_billcomp_dt'         => $row['x_billcomp_dt'] ?? null,
            'umur_order'            => $row['umur_order'] ?? null,
            'po'                    => $row['po'] ?? null,
            'tipe_order'            => $row['tipe_order'] ?? null,

            // --- [KOLOM BARU DARI HEADER EXCEL ANDA] ---
            // Pastikan nama key di kiri SAMA PERSIS dengan nama kolom di database MySQL
            // Pastikan nama key di kanan ($row) huruf KECIL dan spasi diganti underscore (_)

            'scalling1'             => $this->cleanNumber($row['scalling1'] ?? 0),
            'scalling2'             => $this->cleanNumber($row['scalling2'] ?? 0),
            'tipe_group'            => $row['tipe_group'] ?? null, // Excel: TIPE GROUP
            'witel_new'             => $row['witel_new'] ?? null,   // Excel: WITEL NEW
            'kategori_new'          => $row['kategori_new'] ?? null // Excel: KATEGORI NEW
        ]);
    }

    public function chunkSize(): int
    {
        return 1000;
    }

    /**
     * Helper: Bersihkan angka dari karakter aneh (Rp, koma, dll)
     */
    private function cleanNumber($value)
    {
        if (is_numeric($value)) {
            return $value;
        }
        // Jika null atau string kosong, return 0
        if (empty($value)) {
            return 0;
        }
        // Hapus karakter non-numeric kecuali titik/koma
        return preg_replace('/[^0-9.]/', '', $value);
    }

    /**
     * Helper: Transformasi tanggal Excel ke format MySQL (Y-m-d)
     */
    private function transformDate($value)
    {
        if (empty($value) || $value === '-' || $value === '#N/A') {
            return null;
        }
        try {
            // Support format tanggal Excel numeric
            if (is_numeric($value)) {
                return \PhpOffice\PhpSpreadsheet\Shared\Date::excelToDateTimeObject($value)->format('Y-m-d H:i:s');
            }
            return Carbon::parse($value)->format('Y-m-d H:i:s');
        } catch (\Exception $e) {
            return null;
        }
    }
}
