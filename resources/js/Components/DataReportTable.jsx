// resources/js/Components/DataReportTable.jsx
// [VERSI FINAL DENGAN PERBAIKAN WARNA LINK & ALIGNMENT GRAND TOTAL]

import React from 'react';
import { Link } from '@inertiajs/react';

/**
 * Helper untuk format angka
 */
const formatNumber = (value, decimalPlaces) => {
    const num = parseFloat(value);
    if (isNaN(num)) {
        return 0;
    }
    return num.toLocaleString('id-ID', {
        minimumFractionDigits: decimalPlaces,
        maximumFractionDigits: decimalPlaces,
    });
};

/**
 * Helper untuk kalkulasi
 */
const calculateValue = (item, calculation) => {
    const { operation, operands } = calculation;
    let result = 0;

    try {
        if (operation === 'sum') {
            result = operands.reduce((acc, key) => acc + (parseFloat(item[key]) || 0), 0);
            return formatNumber(result, 0);
        }
        else if (operation === 'percentage') {
            const [realisasiKey, targetKey] = operands;
            const realisasi = parseFloat(item[realisasiKey]) || 0;
            const target = parseFloat(item[targetKey]) || 0;
            result = (target === 0) ? 0 : (realisasi / target) * 100;
            return formatNumber(result, 2);
        }
    } catch (e) {
        console.error("Calculation error", e);
        return 0;
    }
    return formatNumber(result, 0);
};

/**
 * Render sel tabel
 * [PERUBAHAN 1]: Fungsi ini sekarang menerima 'linkClass' opsional
 */
const renderCell = (item, colKey, value, props, linkClass = "text-gray-600 hover:text-gray-400") => {
    const { segment, month } = props;

    // 1. Logika Formatting
    let formattedValue;
    if (colKey.startsWith('revenue_')) {
        formattedValue = formatNumber(value, 3);
    } else {
        formattedValue = formatNumber(value, 0);
    }

    // 2. Logika Link
    const isClickable = (colKey.startsWith('in_progress_') || colKey.startsWith('prov_comp_')) && parseFloat(value) > 0;

    if (isClickable) {
        return (
            <Link
                href={route('data-report.details')}
                data={{
                    segment: segment,
                    witel: item.nama_witel,
                    month: month,
                    kpi_key: colKey,
                }}
                // [PERUBAHAN 2]: Menerapkan 'linkClass' yang dikirim
                className={`${linkClass} hover:underline font-bold`}
                title={`Lihat detail ${colKey} untuk ${item.nama_witel || 'GRAND TOTAL'}`}
            >
                {formattedValue}
            </Link>
        );
    }

    return formattedValue;
};


// Komponen Utama
export default function DataReportTable({ data, tableConfig, decimalPlaces, segment, month }) {

    // 1. Render Header (Tidak ada perubahan)
    const renderHeaders = () => {
        return (
            <>
                {/* Baris Pertama (Group Title) */}
                <tr className="text-xs text-white uppercase tracking-wider">
                    <th rowSpan={3} className="py-3 px-4 bg-gray-700  left-0 z-20 border-b border-gray-600 align-middle">WITEL</th>
                    {tableConfig.map((group, index) => (
                        <th
                            key={index}
                            colSpan={group.columns.reduce((acc, col) => acc + (col.subColumns ? col.subColumns.length : 1), 0)}
                            rowSpan={group.columns.some(col => col.subColumns) ? 1 : 2}
                            className={`py-2 px-2 text-center border-b border-l border-gray-600 ${group.groupClass || 'bg-gray-600'}`}
                        >
                            {group.groupTitle}
                        </th>
                    ))}
                </tr>

                {/* Baris Kedua (Column & Sub-Column Titles) */}
                <tr className="text-xs text-white uppercase tracking-wider">
                    {tableConfig.map((group) =>
                        group.columns.map((col, colIndex) => {
                            if (!col.subColumns) {
                                return null;
                            }
                            return (
                                <th
                                    key={`${group.groupTitle}-${colIndex}`}
                                    colSpan={col.subColumns.length}
                                    className={`py-2 px-2 text-center border-b border-l border-gray-600 ${col.columnClass || group.columnClass}`}
                                >
                                    {col.title}
                                </th>
                            );
                        })
                    )}
                </tr>

                {/* Baris Ketiga (Sub-Column Titles & Column Titles tanpa sub-column) */}
                <tr className="text-xs text-white uppercase tracking-wider">
                    {tableConfig.map((group) =>
                        group.columns.map((col, colIndex) => {
                            if (col.subColumns) {
                                // Render Sub-kolom
                                return col.subColumns.map((subCol, subIndex) => (
                                    <th key={`${col.key}-${subIndex}`} className={`py-2 px-2 text-center border-b border-l border-gray-600 ${col.subColumnClass || group.subColumnClass}`}>
                                        {subCol.title}
                                    </th>
                                ));
                            } else {
                                // Render Kolom biasa
                                return (
                                    <th key={`${col.key}-${colIndex}`} rowSpan={1} className={`py-2 px-2 text-center border-b border-l border-gray-600 ${col.columnClass || group.columnClass}`}>
                                        {col.title}
                                    </th>
                                );
                            }
                        })
                    )}
                </tr>
            </>
        );
    };

    // 2. Render Body (Tidak ada perubahan)
    // 'renderCell' dipanggil tanpa 'linkClass', jadi akan default ke biru
    const renderBody = () => {
        return data.map((item, rowIndex) => (
            <tr key={item.nama_witel || rowIndex} className="border-b hover:bg-gray-50 text-sm">
                <td className="py-2 px-4 whitespace-nowrap  left-0 z-10 bg-white font-medium border-r">
                    {item.nama_witel}
                </td>
                {tableConfig.flatMap(group =>
                    group.columns.map(col => {
                        if (col.subColumns) {
                            return col.subColumns.map(subCol => {
                                const colKey = `${col.key}${subCol.key}`;
                                let value;
                                if (subCol.type === 'calculation') {
                                    value = calculateValue(item, subCol.calculation);
                                    return <td key={colKey} className="py-2 px-4 text-center border-l">{value}</td>;
                                } else {
                                    value = item[colKey] || 0;
                                    return (
                                        <td key={colKey} className="py-2 px-4 text-center border-l">
                                            {renderCell(item, colKey, value, { segment, month })}
                                        </td>
                                    );
                                }
                            });
                        } else {
                            const colKey = col.key;
                            let value;
                            if (col.type === 'calculation') {
                                value = calculateValue(item, col.calculation);
                                return <td key={colKey} className="py-2 px-4 text-center border-l">{value}</td>;
                            } else {
                                value = item[colKey] || 0;
                                return (
                                    <td key={colKey} className="py-2 px-4 text-center border-l">
                                        {renderCell(item, colKey, value, { segment, month })}
                                    </td>
                                );
                            }
                        }
                    })
                )}
            </tr>
        ));
    };

    // =========================================================================
    // [PERBAIKAN] Bagian 3: Render Total (Grand Total)
    // =========================================================================
    const renderTotals = () => {
        // Hitung total
        const totals = {};
        tableConfig.forEach(group => {
            group.columns.forEach(col => {
                if (col.subColumns) {
                    col.subColumns.forEach(sc => {
                        if (sc.type !== 'calculation') {
                            const key = col.key + sc.key;
                            totals[key] = data.reduce((sum, item) => sum + (parseFloat(item[key]) || 0), 0);
                        }
                    });
                } else if (col.type !== 'calculation') {
                    totals[col.key] = data.reduce((sum, item) => sum + (parseFloat(item[col.key]) || 0), 0);
                }
            });
        });

        return (
            <tr className="font-bold text-white">
                <td className="border-t border-gray-700 p-2 text-left  left-0 z-10 bg-gray-700">GRAND TOTAL</td>

                {tableConfig.flatMap(group =>
                    group.columns.map(col => {
                        // [PERBAIKAN 5] Ambil kelas BG dari 'group.groupClass'
                        const bgClass = group.groupClass || 'bg-gray-600';

                        if (col.subColumns) {
                            return col.subColumns.map(subCol => {
                                const colKey = `${col.key}${subCol.key}`;
                                let value;
                                if (subCol.type === 'calculation') {
                                    value = calculateValue(totals, subCol.calculation);
                                } else {
                                    value = totals[colKey] || 0;
                                    value = renderCell(totals, colKey, value, { segment: 'ALL', month }, "text-white hover:text-gray-200");
                                }

                                // [PERUBAHAN 4] Tambahkan 'text-center'
                                return <td key={`total-${colKey}`} className={`border-t border-l border-gray-700 p-2 text-center ${bgClass}`}>{value}</td>;
                            });
                        } else {
                            const colKey = col.key;
                            let value;
                            if (col.type === 'calculation') {
                                value = calculateValue(totals, col.calculation);
                            } else {
                                value = totals[colKey] || 0;
                                // [PERUBAHAN 3] Kirim 'text-white' sebagai 'linkClass'
                                value = renderCell(totals, colKey, value, { segment: 'ALL', month }, "text-white hover:text-gray-200");
                            }

                            // [PERUBAHAN 4] Tambahkan 'text-center'
                            return <td key={`total-${colKey}`} className={`border-t border-l border-gray-700 p-2 text-center ${bgClass}`}>{value}</td>;
                        }
                    })
                )}
            </tr>
        );
    };

    return (
        <div className="overflow-x-auto shadow-md rounded-lg">
            <table className="min-w-full bg-white border border-gray-200 text-sm">
                <thead className=" top-0 z-30">
                    {renderHeaders()}
                </thead>
                <tbody className="text-gray-700">
                    {renderBody()}
                    {renderTotals()}
                </tbody>
            </table>
        </div>
    );
}
