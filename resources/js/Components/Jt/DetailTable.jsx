// file: resources/js/Components/Jt/DetailTable.jsx
// [VERSI BARU] Dibuat khusus untuk AnalysisJT

import React from 'react';
import { Link, usePage } from "@inertiajs/react";

// Komponen Pagination
const Pagination = ({ links = [], activeView }) => {
    if (links.length <= 3) return null;

    const appendTabViewToUrl = (url) => {
        if (!url || !activeView) return url;
        try {
            const urlObject = new URL(url);
            urlObject.searchParams.set('tab', activeView);
            return urlObject.toString();
        } catch (error) {
            console.error("URL Pagination tidak valid:", url);
            return url;
        }
    };

    return (
        <div className="flex flex-wrap justify-center items-center mt-4 space-x-1">
            {links.map((link, index) => (
                <Link
                    key={index}
                    href={appendTabViewToUrl(link.url) ?? "#"}
                    className={`px-3 py-2 text-sm border rounded hover:bg-blue-600 hover:text-white transition-colors ${link.active ? "bg-blue-600 text-white" : "bg-white text-gray-700"
                        } ${!link.url ? "text-gray-400 cursor-not-allowed" : ""}`}
                    dangerouslySetInnerHTML={{ __html: link.label }}
                    preserveScroll
                    preserveState
                />
            ))}
        </div>
    );
};

// Komponen Utama DetailTable (Versi JT)
const DetailTable = ({ dataPaginator, columns }) => {
    // Pastikan dataPaginator tidak null/undefined
    const { data = [], links = [] } = dataPaginator || { data: [], links: [] };
    const { filters = {} } = usePage().props;
    // Ambil tab aktif dari filters, fallback ke default tab
    const activeTab = filters.tab || 'belum_go_live';

    const formatCell = (item, column) => {
        // Menggunakan col.key (properti dari analysisJT)
        const value = item[column.key];
        if (value === null || value === undefined) return '-';

        switch (column.type) {
            case 'date':
                try {
                    return new Date(value).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
                } catch (e) {
                    return "Invalid Date";
                }
            case 'currency':
                return parseFloat(value).toLocaleString('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 });
            case 'numeric':
                // Tipe ini dibutuhkan oleh analysisJT untuk "Umur (Hari)"
                return parseFloat(value).toLocaleString('id-ID');
            default:
                return value;
        }
    };

    // Filter kolom yang 'visible: true'
    const visibleColumns = columns.filter(col => col.visible);

    return (
        <div className="overflow-x-auto">
            <table className="min-w-full bg-white text-sm table-auto">
                <thead className="bg-gray-50 border-b">
                    <tr>
                        {visibleColumns.map((col) => (
                            <th
                                // Menggunakan col.key (properti dari analysisJT)
                                key={col.key}
                                className={`py-3 px-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider ${col.headerClass || ''}`}
                            >
                                {/* Menggunakan col.title (properti dari analysisJT) */}
                                {col.title}
                            </th>
                        ))}
                    </tr>
                </thead>

                <tbody>
                    {data.length > 0 ? (
                        data.map((item, index) => (
                            <tr key={item.id || item.order_id || index} className="border-b hover:bg-gray-50 transition-colors">
                                {visibleColumns.map((col) => (
                                    <td
                                        // Menggunakan col.key (properti dari analysisJT)
                                        key={col.key}
                                        className={`py-3 px-4 whitespace-nowrap ${col.cellClass || ''}`}
                                    >
                                        {formatCell(item, col)}
                                    </td>
                                ))}
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td
                                colSpan={visibleColumns.length || 1} // Fallback jika tidak ada kolom
                                className="text-center py-10 text-gray-500"
                            >
                                Tidak ada data untuk ditampilkan dalam kategori ini.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>

            {/* Tampilkan pagination jika ada data */}
            {data.length > 0 && (
                <div className="mt-4">
                    <Pagination links={links} activeView={activeTab} />
                </div>
            )}
        </div>
    );
};

export default DetailTable;
