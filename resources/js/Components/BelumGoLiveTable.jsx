// file: resources/js/Components/BelumGoLiveTable.jsx
// [VERSI MODIFIKASI DENGAN LINK]

import React from 'react';
import { Link } from '@inertiajs/react'; // [TAMBAH] Import Link
import {
    SortableContext,
    horizontalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// ===================================================================
// KOMPONEN HELPER (Tidak berubah)
// ===================================================================

const SortableSubHeaderCell = ({ id, column, parent, children }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.8 : 1, zIndex: isDragging ? 11 : 1, cursor: 'grab',
    };
    const finalClassName = `py-2 px-4 border text-center font-medium select-none ${parent.columnClass || ''} ${column.headerClass || ''}`;
    return (
        <th ref={setNodeRef} style={style} {...attributes} {...listeners} className={finalClassName}>
            {children}
        </th>
    );
};

const SortableHeaderCell = ({ item, children }) => {
    const id = item.groupTitle || item.key;
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.8 : 1, zIndex: isDragging ? 10 : 1, cursor: 'grab',
    };
    const finalClassName = `py-2 px-4 border text-center font-medium select-none ${item.groupClass || item.columnClass || ''}`;
    const colSpan = item.groupTitle ? (item.columns || []).filter(c => c.visible).length : 1;
    const rowSpan = item.groupTitle ? 1 : 2;

    return (
        <th ref={setNodeRef} style={style} {...attributes} {...listeners} colSpan={colSpan} rowSpan={rowSpan} className={finalClassName}>
            {children}
        </th>
    );
};

// ===================================================================
// [PERUBAHAN DI SINI] HELPER BARU UNTUK LINK
// ===================================================================

// Helper untuk format cell (hanya numeric & default untuk summary)
const renderCell = (item, column) => {
    const value = item[column.key];
    if (value === null || value === undefined) return '0';
    if (column.key === 'persen_dalam_toc') {
        return value; // Asumsi sudah string "XX,XX%"
    }
    return Number(value).toLocaleString('id-ID');
};

/**
 * [BARU] Fungsi wrapper untuk membuat sel bisa diklik
 * @param {object} item - Baris data
 * @param {string} columnKey - Kunci kolom (e.g., 'dalam_toc')
 * @param {string} formattedValue - Nilai yang sudah diformat
 * @param {object} styles - Berisi { isTotalRow, isParentWitelRow }
 */
const renderClickableCell = (item, columnKey, formattedValue, { isTotalRow, isParentWitelRow }) => {
    const numericValue = item[columnKey] ?? 0;

    // Kolom ini tidak bisa diklik
    const nonClickableKeys = ['witel_lama', 'persen_dalam_toc'];
    if (nonClickableKeys.includes(columnKey) || numericValue === 0) {
        return formattedValue;
    }

    // Tentukan warna link (putih di latar gelap, biru di latar putih)
    const linkClass = isTotalRow || isParentWitelRow
        ? "text-white hover:text-gray-200 hover:underline font-bold"
        : "text-gray-800 hover:text-gray-500 hover:underline";

    return (
        <Link
            href={route('report.jt.tocDetails')} // <-- Arahkan ke route baru
            data={{
                witel: item.witel_lama, // 'witel_lama' adalah key di 'tocReportData'
                kpi_key: columnKey
            }}
            className={linkClass}
            title={`Lihat detail ${columnKey} untuk ${item.witel_lama}`}
        >
            {formattedValue}
        </Link>
    );
};


// ===================================================================
// KOMPONEN TABEL UTAMA (BelumGoLiveTable)
// ===================================================================

const BelumGoLiveTable = ({ data = [], tableConfig = [] }) => {

    // Style untuk baris Induk/Grup Witel (abu-abu, dari gambar asli)
    const parentWitelRowClass = 'bg-gray-700 text-white font-bold';
    const totalRowClass = 'bg-blue-900 text-white font-bold';

    const parentWitelNames = [
        'WITEL BALI', 'WITEL JATIM BARAT', 'WITEL JATIM TIMUR',
        'WITEL NUSA TENGGARA', 'WITEL SURAMADU'
    ];

    const fixedColumn = tableConfig.find(col => col.type === 'fixed');
    const sortableColumns = tableConfig.filter(col => col.type !== 'fixed');

    if (!fixedColumn) {
        console.error("Konfigurasi tabel BelumGoLive salah: Tidak ditemukan kolom dengan type: 'fixed'.");
        return <div>Error: Konfigurasi tabel tidak valid.</div>;
    }

    return (
        <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-200 text-sm">
                <thead className="text-gray-600 uppercase text-xs">
                    {/* ... (Tidak ada perubahan di <thead>) ... */}
                    <tr>
                        <th rowSpan="2" className={`py-3 px-4 border text-left left-0 z-20 font-bold ${fixedColumn.columnClass || 'bg-gray-700 text-white'}`}>
                            {fixedColumn.title}
                        </th>
                        <SortableContext items={sortableColumns.map(item => item.groupTitle || item.key)} strategy={horizontalListSortingStrategy}>
                            {sortableColumns.map((item) => {
                                if (item.visible === false) return null;
                                return (
                                    <SortableHeaderCell key={item.groupTitle || item.key} item={item}>
                                        {item.groupTitle || item.title}
                                    </SortableHeaderCell>
                                );
                            })}
                        </SortableContext>
                    </tr>
                    <tr>
                        {sortableColumns.map((item) => {
                            if (!item.groupTitle || !item.columns) return null;
                            const visibleSubColumns = item.columns.filter(col => col.visible);
                            return (
                                <SortableContext key={`${item.groupTitle}-subcolumns`} items={visibleSubColumns.map(col => col.key)} strategy={horizontalListSortingStrategy}>
                                    {visibleSubColumns.map((col) => (
                                        <SortableSubHeaderCell key={col.key} id={col.key} column={col} parent={item}>
                                            {col.title}
                                        </SortableSubHeaderCell>
                                    ))}
                                </SortableContext>
                            );
                        })}
                    </tr>
                </thead>

                {/* [PERUBAHAN DI <tbody>] */}
                <tbody className="text-gray-700">
                    {data.map((item, rowIndex) => {
                        const witelName = item[fixedColumn.key];
                        const isTotalRow = witelName === 'TOTAL';
                        const isParentWitelRow = parentWitelNames.includes(witelName);

                        let rowClass = 'border-b hover:bg-gray-50';
                        if (isTotalRow) {
                            rowClass = totalRowClass;
                        } else if (isParentWitelRow) {
                            rowClass = parentWitelRowClass;
                        }

                        let witelCellClass = 'py-2 px-4 border text-left left-0 z-10 bg-white';
                        if (isTotalRow) {
                            witelCellClass = `py-2 px-4 border text-left left-0 z-10 ${totalRowClass}`;
                        } else if (isParentWitelRow) {
                            witelCellClass = `py-2 px-4 border text-left left-0 z-10 ${parentWitelRowClass}`;
                        }

                        return (
                            <tr key={rowIndex} className={rowClass}>
                                {/* Sel Data Pertama (WITEL LAMA) */}
                                <td className={witelCellClass}>
                                    {item[fixedColumn.key]}
                                </td>

                                {/* Sel Data sisanya */}
                                {sortableColumns.flatMap(configItem => {
                                    // Jika ini grup (TOC LOP BELUM GOLIVE)
                                    if (configItem.columns) {
                                        return configItem.columns.map(col =>
                                            col.visible ? (
                                                <td key={`${rowIndex}-${col.key}`} className="py-2 px-4 border text-center">
                                                    {/* [DIUBAH] Memanggil renderClickableCell */}
                                                    {renderClickableCell(
                                                        item,
                                                        col.key,
                                                        renderCell(item, col),
                                                        { isTotalRow, isParentWitelRow }
                                                    )}
                                                </td>
                                            ) : null
                                        );
                                    }

                                    // Jika ini kolom tunggal (JUMLAH LOP & % DALAM TOC)
                                    if (configItem.key && configItem.visible) {
                                        return (
                                            <td key={`${rowIndex}-${configItem.key}`} className="py-2 px-4 border text-center">
                                                {/* [DIUBAH] Memanggil renderClickableCell */}
                                                {renderClickableCell(
                                                    item,
                                                    configItem.key,
                                                    renderCell(item, configItem),
                                                    { isTotalRow, isParentWitelRow }
                                                )}
                                            </td>
                                        );
                                    }
                                    return null;
                                })}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

export default BelumGoLiveTable;
