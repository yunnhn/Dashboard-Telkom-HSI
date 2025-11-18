// resources/js/Components/Sos/GalaksiReportTable.jsx
// [VERSI MODIFIKASI DENGAN LINK]

import React, { useMemo } from 'react';
import { Link } from '@inertiajs/react'; // [TAMBAH] Import Link

const formatNumber = (value) => {
    return (value ?? 0).toLocaleString('id-ID');
};

/**
 * [BARU] Fungsi helper untuk membuat sel bisa diklik
 * @param {object} item - Baris data
 * @param {string} columnKey - Kunci kolom (e.g., 'ao_lt_3bln')
 * @param {boolean} isTotalRow - Apakah ini baris <tfoot>
 */
const renderClickableCell = (item, columnKey, isTotalRow = false) => {
    const numericValue = item[columnKey] ?? 0;
    const formattedValue = formatNumber(numericValue);

    // Kolom ini tidak bisa diklik
    const nonClickableKeys = ['po', 'total_lt_3bln', 'total_gt_3bln', 'achievement'];
    if (nonClickableKeys.includes(columnKey) || numericValue === 0) {
        return formattedValue;
    }

    // Tentukan warna link (putih di latar gelap, biru di latar putih)
    const linkClass = isTotalRow
        ? "text-white hover:text-gray-200 hover:underline font-bold"
        : "text-gray-800 hover:text-gray-500 hover:underline";

    // Tentukan PO (untuk baris total, kirim 'Grand Total')
    const poName = isTotalRow ? 'Grand Total' : item.po;

    return (
        <Link
            href={route('report.datin.galaksiDetails')}
            data={{
                po: poName,
                kpi_key: columnKey
            }}
            className={linkClass}
            title={`Lihat detail ${columnKey} untuk ${poName}`}
        >
            {formattedValue}
        </Link>
    );
};


const GalaksiReportTable = ({ galaksiData = [] }) => {

    const grandTotal = useMemo(() => {
        const initialTotals = {
            ao_lt_3bln: 0, so_lt_3bln: 0, do_lt_3bln: 0, mo_lt_3bln: 0, ro_lt_3bln: 0,
            ao_gt_3bln: 0, so_gt_3bln: 0, do_gt_3bln: 0, mo_gt_3bln: 0, ro_gt_3bln: 0,
        };

        if (!galaksiData || galaksiData.length === 0) {
            return initialTotals;
        }

        return galaksiData.reduce((acc, item) => {
            acc.ao_lt_3bln += Number(item.ao_lt_3bln ?? 0);
            acc.so_lt_3bln += Number(item.so_lt_3bln ?? 0);
            acc.do_lt_3bln += Number(item.do_lt_3bln ?? 0);
            acc.mo_lt_3bln += Number(item.mo_lt_3bln ?? 0);
            acc.ro_lt_3bln += Number(item.ro_lt_3bln ?? 0);
            acc.ao_gt_3bln += Number(item.ao_gt_3bln ?? 0);
            acc.so_gt_3bln += Number(item.so_gt_3bln ?? 0);
            acc.do_gt_3bln += Number(item.do_gt_3bln ?? 0);
            acc.mo_gt_3bln += Number(item.mo_gt_3bln ?? 0);
            acc.ro_gt_3bln += Number(item.ro_gt_3bln ?? 0);
            return acc;
        }, initialTotals);
    }, [galaksiData]);

    const grand_total_lt_3bln = grandTotal.ao_lt_3bln + grandTotal.so_lt_3bln + grandTotal.do_lt_3bln + grandTotal.mo_lt_3bln + grandTotal.ro_lt_3bln;
    const grand_total_gt_3bln = grandTotal.ao_gt_3bln + grandTotal.so_gt_3bln + grandTotal.do_gt_3bln + grandTotal.mo_gt_3bln + grandTotal.ro_gt_3bln;

    // ... (Logika kalkulasi Achievement Anda tidak berubah) ...
    let grand_achievement;
    if (grand_total_gt_3bln === 0) {
         grand_achievement = 100;
     } else if (grand_total_gt_3bln >= 1 && grand_total_gt_3bln <= 5) {
         grand_achievement = 80;
     } else if (grand_total_gt_3bln >= 6 && grand_total_gt_3bln <= 10) {
         grand_achievement = 60;
     } else if (grand_total_gt_3bln >= 11 && grand_total_gt_3bln <= 20) {
         grand_achievement = 40;
     } else { // Lebih dari 20
         grand_achievement = 20;
     }

    return (
        <div className="overflow-x-auto">
            <table className="min-w-full text-sm table-auto border-separate border-spacing-0">
                <thead className="text-white text-center font-semibold">
                    {/* ... (Header tidak berubah) ... */}
                    <tr>
                        <th rowSpan="2" className="py-2 px-3 border-r border-b border-gray-400 bg-gray-600 sticky left-0 z-10">PO</th>
                        <th colSpan="6" className="py-2 px-3 border-r border-b border-gray-400 bg-blue-900">&lt; 3 BLN</th>
                        <th colSpan="6" className="py-2 px-3 border-r border-b border-gray-400 bg-blue-800">&gt; 3 BLN</th>
                        <th rowSpan="2" className="py-2 px-3 border-b border-gray-400 bg-gray-600">Achievement &gt;3 bln</th>
                    </tr>
                    <tr>
                        <th className="py-2 px-3 border-r border-b border-gray-400 bg-blue-900">AO</th>
                        <th className="py-2 px-3 border-r border-b border-gray-400 bg-blue-900">SO</th>
                        <th className="py-2 px-3 border-r border-b border-gray-400 bg-blue-900">DO</th>
                        <th className="py-2 px-3 border-r border-b border-gray-400 bg-blue-900">MO</th>
                        <th className="py-2 px-3 border-r border-b border-gray-400 bg-blue-900">RO</th>
                        <th className="py-2 px-3 border-r border-b border-gray-400 bg-blue-900">&lt; 3 BLN Total</th>
                        <th className="py-2 px-3 border-r border-b border-gray-400 bg-blue-800">AO</th>
                        <th className="py-2 px-3 border-r border-b border-gray-400 bg-blue-800">SO</th>
                        <th className="py-2 px-3 border-r border-b border-gray-400 bg-blue-800">DO</th>
                        <th className="py-2 px-3 border-r border-b border-gray-400 bg-blue-800">MO</th>
                        <th className="py-2 px-3 border-r border-b border-gray-400 bg-blue-800">RO</th>
                        <th className="py-2 px-3 border-r border-b border-gray-400 bg-blue-800">&gt; 3 BLN Total</th>
                    </tr>
                </thead>
                <tbody>
                    {galaksiData.map((item, index) => {
                        const total_lt_3bln = Number(item.ao_lt_3bln ?? 0) + Number(item.so_lt_3bln ?? 0) + Number(item.do_lt_3bln ?? 0) + Number(item.mo_lt_3bln ?? 0) + Number(item.ro_lt_3bln ?? 0);
                        const total_gt_3bln = Number(item.ao_gt_3bln ?? 0) + Number(item.so_gt_3bln ?? 0) + Number(item.do_gt_3bln ?? 0) + Number(item.mo_gt_3bln ?? 0) + Number(item.ro_gt_3bln ?? 0);

                        // ... (Logika kalkulasi Achievement Anda tidak berubah) ...
                        let achievement;
                         if (total_gt_3bln === 0) {
                             achievement = 100;
                         } else if (total_gt_3bln >= 1 && total_gt_3bln <= 5) {
                             achievement = 80;
                         } else if (total_gt_3bln >= 6 && total_gt_3bln <= 10) {
                             achievement = 60;
                         } else if (total_gt_3bln >= 11 && total_gt_3bln <= 20) {
                             achievement = 40;
                         } else { // Lebih dari 20
                             achievement = 20;
                         }

                        return (
                            <tr key={index} className="text-center bg-white hover:bg-gray-50">
                                <td className="py-2 px-3 border-r border-b border-gray-300 text-left sticky left-0 z-10 bg-white">{item.po}</td>

                                {/* [DIUBAH] Kolom < 3 BLN (Bisa diklik) */}
                                <td className="py-2 px-3 border-r border-b border-gray-300">{renderClickableCell(item, 'ao_lt_3bln')}</td>
                                <td className="py-2 px-3 border-r border-b border-gray-300">{renderClickableCell(item, 'so_lt_3bln')}</td>
                                <td className="py-2 px-3 border-r border-b border-gray-300">{renderClickableCell(item, 'do_lt_3bln')}</td>
                                <td className="py-2 px-3 border-r border-b border-gray-300">{renderClickableCell(item, 'mo_lt_3bln')}</td>
                                <td className="py-2 px-3 border-r border-b border-gray-300">{renderClickableCell(item, 'ro_lt_3bln')}</td>
                                <td className="py-2 px-3 border-r border-b border-gray-300 font-bold bg-gray-100">{formatNumber(total_lt_3bln)}</td>

                                {/* [DIUBAH] Kolom > 3 BLN (Bisa diklik) */}
                                <td className="py-2 px-3 border-r border-b border-gray-300 bg-yellow-100">{renderClickableCell(item, 'ao_gt_3bln')}</td>
                                <td className="py-2 px-3 border-r border-b border-gray-300 bg-yellow-100">{renderClickableCell(item, 'so_gt_3bln')}</td>
                                <td className="py-2 px-3 border-r border-b border-gray-300 bg-yellow-100">{renderClickableCell(item, 'do_gt_3bln')}</td>
                                <td className="py-2 px-3 border-r border-b border-gray-300 bg-yellow-100">{renderClickableCell(item, 'mo_gt_3bln')}</td>
                                <td className="py-2 px-3 border-r border-b border-gray-300 bg-yellow-100">{renderClickableCell(item, 'ro_gt_3bln')}</td>
                                <td className="py-2 px-3 border-r border-b border-gray-300 font-bold bg-yellow-100">{formatNumber(total_gt_3bln)}</td>

                                <td className="py-2 px-3 border-b border-gray-300 font-bold bg-gray-100">{`${achievement}%`}</td>
                            </tr>
                        );
                    })}
                </tbody>
                <tfoot className="text-center bg-blue-900 text-white font-bold">
                    <tr>
                        <td className="py-2 px-3 border-r border-gray-400 text-left sticky left-0 z-10 bg-gray-600">Grand Total</td>

                        {/* [DIUBAH] Kolom < 3 BLN (Bisa diklik) */}
                        <td className="py-2 px-3 border-r border-gray-400">{renderClickableCell(grandTotal, 'ao_lt_3bln', true)}</td>
                        <td className="py-2 px-3 border-r border-gray-400">{renderClickableCell(grandTotal, 'so_lt_3bln', true)}</td>
                        <td className="py-2 px-3 border-r border-gray-400">{renderClickableCell(grandTotal, 'do_lt_3bln', true)}</td>
                        <td className="py-2 px-3 border-r border-gray-400">{renderClickableCell(grandTotal, 'mo_lt_3bln', true)}</td>
                        <td className="py-2 px-3 border-r border-gray-400">{renderClickableCell(grandTotal, 'ro_lt_3bln', true)}</td>
                        <td className="py-2 px-3 border-r border-gray-400">{formatNumber(grand_total_lt_3bln)}</td>

                        {/* [DIUBAH] Kolom > 3 BLN (Bisa diklik) */}
                        <td className="py-2 px-3 border-r border-gray-400">{renderClickableCell(grandTotal, 'ao_gt_3bln', true)}</td>
                        <td className="py-2 px-3 border-r border-gray-400">{renderClickableCell(grandTotal, 'so_gt_3bln', true)}</td>
                        <td className="py-2 px-3 border-r border-gray-400">{renderClickableCell(grandTotal, 'do_gt_3bln', true)}</td>
                        <td className="py-2 px-3 border-r border-gray-400">{renderClickableCell(grandTotal, 'mo_gt_3bln', true)}</td>
                        <td className="py-2 px-3 border-r border-gray-400">{renderClickableCell(grandTotal, 'ro_gt_3bln', true)}</td>
                        <td className="py-2 px-3 border-r border-gray-400">{formatNumber(grand_total_gt_3bln)}</td>

                        <td className="py-2 px-3 bg-gray-600">{`${grand_achievement}%`}</td>
                    </tr>
                </tfoot>
            </table>
        </div>
    );
};

export default GalaksiReportTable;
