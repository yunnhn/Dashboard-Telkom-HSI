import React, { useMemo } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from "@inertiajs/react";
import BelumGoLiveTable from '@/Components/BelumGoLiveTable'; // Asumsi ini ada di components

// ===================================================================
// KONFIGURASI TABEL (Disalin dari AnalysisJT.jsx)
// ===================================================================
export const jtTableConfigTemplate = [
    {
        key: 'witel', // Nama kolom di 'witel'
        title: 'WITEL',
        type: 'fixed',
        visible: true,
        headerClass: 'bg-gray-800 text-white',
        columnClass: 'bg-gray-100 font-bold text-left',
    },
    {
        key: 'jml_lop_exc_drop',
        title: 'JUMLAH LOP (exc Drop)',
        type: 'numeric',
        visible: true,
        headerClass: 'bg-blue-900 text-white',
    },
    {
        key: 'rev_all_lop',
        title: 'REV ALL LOP',
        type: 'currency',
        visible: true,
        headerClass: 'bg-blue-900 text-white',
    },
    {
        groupTitle: "PROGRESS DEPLOY",
        groupClass: "bg-blue-900 text-white",
        columnClass: "bg-blue-900 text-white",
        columns: [
            { key: "initial", title: "INITIAL", type: "numeric", visible: true },
            { key: "survey_drm", title: "SURVEY & DRM", type: "numeric", visible: true },
            { key: "perizinan_mos", title: "PERIZINAN & MOS", type: "numeric", visible: true },
            { key: "instalasi", title: "INSTALASI", type: "numeric", visible: true },
            { key: "fi_ogp_live", title: "FI-OGP LIVE", type: "numeric", visible: true },
        ],
    },
    {
        groupTitle: "GOLIVE (exc Drop)",
        groupClass: "bg-green-700 text-white",
        columnClass: "bg-green-700 text-white",
        columns: [
            { key: "golive_jml_lop", title: "JML LOP", type: "numeric", visible: true },
            { key: "golive_rev_lop", title: "REV LOP", type: "currency", visible: true },
        ],
    },
    {
        key: 'drop',
        title: 'DROP',
        type: 'numeric',
        visible: true,
        headerClass: 'bg-red-700 text-white',
        columnClass: 'bg-red-50', // Latar merah muda untuk sel anak
    },
    {
        key: 'percent_close',
        title: '%CLOSE',
        type: 'percentage',
        visible: true,
        headerClass: 'bg-blue-900 text-white',
        columnClass: 'font-bold',
    },
];

export const belumGoLiveTableConfig = [
    {
        key: "witel_lama",
        title: "WITEL LAMA",
        visible: true,
        type: 'fixed',
        columnClass: "bg-blue-900 text-white",
    },
    {
        groupTitle: "TOC LOP BELUM GOLIVE",
        groupClass: "bg-red-700 text-white",
        columnClass: "bg-blue-900 text-white",
        columns: [
            { key: "dalam_toc", title: "DALAM TOC", type: "numeric", visible: true },
            { key: "lewat_toc", title: "LEWAT TOC", type: "numeric", visible: true },
        ],
    },
    {
        key: "jumlah_lop_on_progress",
        title: "JUMLAH LOP ON PROGRESS",
        type: "numeric",
        visible: true,
        columnClass: "bg-blue-900 text-white",
    },
    {
        key: "persen_dalam_toc",
        title: "% DALAM TOC",
        visible: true,
        columnClass: "bg-blue-900 text-white",
    },
];

const StaticHeaderCell = ({ item, children }) => {
    const colSpan = item.groupTitle ? item.columns.filter(c => c.visible).length : 1;
    if (colSpan === 0) return null;
    const finalClassName = `py-2 px-4 border text-center font-medium select-none ${item.groupClass || item.headerClass || ''}`;
    return (
        <th colSpan={colSpan} rowSpan={item.groupTitle ? 1 : 2} className={finalClassName}>
            {children}
        </th>
    );
};

// ===================================================================
// KOMPONEN TABEL 1: JtReportTable (Versi Statis)
// ===================================================================
const JtReportTable = ({ data, tableConfig }) => {
    // Fungsi renderCell (format) Anda yang sudah ada
    const renderCell = (item, column) => {
        const value = item[column.key] ?? 0;
        if (column.type === 'currency') {
            return parseFloat(value).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        }
        if (column.type === 'percentage') {
            return parseFloat(value).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';
        }
        return Number(value).toLocaleString('id-ID');
    };

    // [BARU] Fungsi wrapper untuk membuat sel bisa diklik
    const renderClickableCell = (item, column) => {
        const formattedValue = renderCell(item, column); // Ambil nilai yang sudah diformat
        const numericValue = item[column.key] ?? 0;

        // Kolom ini tidak bisa diklik
        const nonClickableKeys = ['witel', 'percent_close'];
        if (nonClickableKeys.includes(column.key) || numericValue === 0) {
            return formattedValue;
        }

        // Tentukan warna link berdasarkan Witel Induk/Anak
        const linkClass = item.isSegment || item.isTotal
            ? "text-white hover:text-gray-200 hover:underline font-bold" // Untuk baris total/segmen
            : "text-gray-800 hover:text-gray-500 hover:underline"; // Untuk baris data biasa

        return (
            <Link
                href={route('report.jt.details')}
                data={{
                    witel: item.witel,
                    kpi_key: column.key
                }}
                className={linkClass}
                title={`Lihat detail ${column.key} for ${item.witel}`}
            >
                {formattedValue}
            </Link>
        );
    };

    const grandTotalRowClass = 'bg-blue-900 text-white font-bold';

    return (
        <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-200 text-sm">
                <thead className="text-gray-600 uppercase text-xs">
                    <tr>
                        <th rowSpan="2" className="py-3 px-4 border text-left left-0 z-20 font-bold bg-blue-900 text-white">
                            WITEL
                        </th>
                        {/* Header Statis (tanpa DND) */}
                        {tableConfig.map((item) => {
                            if (item.type === 'fixed') return null;
                            return (
                                <th
                                    key={item.groupTitle || item.key}
                                    colSpan={item.groupTitle ? item.columns.filter(c => c.visible).length : 1}
                                    rowSpan={item.groupTitle ? 1 : 2}
                                    className={`py-2 px-4 border text-center font-medium ${item.groupClass || item.headerClass || ''}`}
                                >
                                    {item.groupTitle || item.title}
                                </th>
                            );
                        })}
                    </tr>
                    <tr>
                        {tableConfig.map((item) => {
                            if (!item.groupTitle) return null;
                            return item.columns.map((col) =>
                                col.visible ? (
                                    <th
                                        key={col.key}
                                        className={`py-2 px-4 border text-center font-medium ${item.columnClass || ''} ${col.headerClass || ''}`}
                                    >
                                        {col.title}
                                    </th>
                                ) : null
                            );
                        })}
                    </tr>
                </thead>

                <tbody className="text-gray-700">
                    {data.map((item, rowIndex) => {
                        let rowClass = '';
                        let firstCellBgClass = '';
                        if (item.isTotal) {
                            rowClass = grandTotalRowClass;
                            firstCellBgClass = grandTotalRowClass;
                        } else if (item.isSegment) {
                            rowClass = 'bg-gray-700 text-white font-bold border-b';
                            firstCellBgClass = 'bg-gray-700 text-white font-bold';
                        } else {
                            rowClass = 'bg-white border-b hover:bg-gray-100';
                            firstCellBgClass = 'bg-gray-50';
                        }

                        return (
                            <tr key={rowIndex} className={rowClass}>
                                <td className={`py-2 px-4 border text-left left-0 z-10 ${firstCellBgClass}`}>
                                    {item.witel}
                                </td>
                                {tableConfig.slice(1).flatMap(config => {
                                    if (config.columns) {
                                        return config.columns.map(col => {
                                            let cellClasses = "py-2 px-4 border text-right whitespace-nowrap";
                                            return (
                                                <td key={`${item.witel}-${col.key}`} className={cellClasses}>
                                                    {renderClickableCell(item, col)}
                                                </td>
                                            );
                                        });
                                    } else if (config.key && config.visible) {
                                        let cellClasses = "py-2 px-4 border text-right whitespace-nowrap";
                                        if (!item.isSegment && !item.isTotal) {
                                            if (config.columnClass) {
                                                cellClasses += ` ${config.columnClass}`;
                                            }
                                            if (config.key === 'percent_close') {
                                                const percentValue = parseFloat(item.percent_close) || 0;
                                                cellClasses = cellClasses.replace('bg-red-50', '');
                                                if (percentValue >= 80) {
                                                    cellClasses += ' bg-green-100 text-green-700';
                                                } else {
                                                    cellClasses += ' bg-red-100 text-red-700';
                                                }
                                            }
                                            if (config.key === 'drop') {
                                                if (config.columnClass) {
                                                    cellClasses += ` ${config.columnClass}`;
                                                }
                                            }
                                        }
                                        return (
                                            <td key={`${item.witel}-${config.key}`} className={cellClasses}>
                                                {renderClickableCell(item, config)}
                                            </td>
                                        );
                                    }
                                    return [];
                                })}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

// ===================================================================
// KOMPONEN TABEL 3: Top3WitelTable (Disalin dari AnalysisJT.jsx)
// ===================================================================
const Top3WitelTable = ({ data }) => {
    const formatCell = (value, type) => {
        if (value === null || value === undefined) return '-';
        try {
            switch (type) {
                case 'date':
                    const d = new Date(value);
                    const day = d.getDate().toString().padStart(2, '0');
                    const mon = d.toLocaleString('en-GB', { month: 'short' });
                    const yr = d.getFullYear().toString().slice(-2);
                    return `${day}-${mon}-${yr}`;
                case 'currency':
                    return parseFloat(value).toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
                case 'age':
                    return value;
                default:
                    return value;
            }
        } catch (e) {
            return value;
        }
    };

    return (
        <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-200 text-sm">
                <thead className="text-gray-600 uppercase text-xs">
                    <tr>
                        <th rowSpan="2" className="py-3 px-4 border text-left bg-blue-900 text-white left-0 z-20">
                            NAMA PROJECT
                        </th>
                        <th colSpan="5" className="py-3 px-4 border text-center bg-blue-900 text-white">
                            TOP 3 USIA PROJECT ON PROGRESS
                        </th>
                    </tr>
                    <tr>
                        <th className="py-2 px-4 border text-center font-medium bg-blue-900 text-white">IHLD</th>
                        <th className="py-2 px-4 border text-center font-medium bg-blue-900 text-white">TGL MOM</th>
                        <th className="py-2 px-4 border text-center font-medium bg-blue-900 text-white">REVENUE</th>
                        <th className="py-2 px-4 border text-center font-medium bg-blue-900 text-white">STATUS TOMPS</th>
                        <th className="py-2 px-4 border text-center font-medium bg-blue-900 text-white">USIA (HARI)</th>
                    </tr>
                </thead>
                <tbody className="text-gray-700">
                    {Object.keys(data).length > 0 ? (
                        Object.entries(data).map(([groupName, projects]) => (
                            <React.Fragment key={groupName}>
                                <tr className="bg-gray-700 font-bold text-white">
                                    <td colSpan="6" className="py-2 px-4 border text-left">
                                        {groupName}
                                    </td>
                                </tr>
                                {projects.map((project, index) => (
                                    <tr key={index} className="border-b hover:bg-gray-50">
                                        <td className="py-3 px-4 border text-left left-0 z-10 bg-white">
                                            {project.uraian_kegiatan}
                                        </td>
                                        <td className="py-3 px-4 border text-center">
                                            {formatCell(project.ihld)}
                                        </td>
                                        <td className="py-3 px-4 border text-center whitespace-nowrap">
                                            {formatCell(project.tgl_mom, 'date')}
                                        </td>
                                        <td className="py-3 px-4 border text-right whitespace-nowrap">
                                            {formatCell(project.revenue, 'currency')}
                                        </td>
                                        <td className="py-3 px-4 border text-center whitespace-nowrap">
                                            {formatCell(project.status_tomps)}
                                        </td>
                                        <td className={`py-3 px-4 border text-center font-bold ${project.umur_project > 90 ? 'text-red-600' : ''}`}>
                                            {formatCell(project.umur_project, 'age')}
                                        </td>
                                    </tr>
                                ))}
                            </React.Fragment>
                        ))
                    ) : (
                        <tr>
                            <td colSpan="6" className="text-center py-10 text-gray-500">
                                Tidak ada data "On Progress" yang ditemukan.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
};

// ===================================================================
// KOMPONEN TABEL 4: Top3PoTable (Disalin dari AnalysisJT.jsx)
// ===================================================================
// ===================================================================
// TABEL PENDUKUNG (Top 3 PO) - (Versi Benar dari AnalysisJT)
// ===================================================================
const Top3PoTable = ({ data }) => {
    const formatCell = (value, type) => {
        if (value === null || value === undefined) return '-';
        try {
            switch (type) {
                case 'date':
                    const d = new Date(value);
                    if (isNaN(d.getTime())) return '-';
                    const day = d.getDate().toString().padStart(2, '0');
                    const mon = d.toLocaleString('en-GB', { month: 'short' });
                    const yr = d.getFullYear().toString().slice(-2);
                    return `${day}-${mon}-${yr}`;
                case 'currency':
                    return parseFloat(value).toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
                case 'age':
                    return value;
                default:
                    return value;
            }
        } catch (e) {
            return value;
        }
    };

    return (
        <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-200 text-sm">
                <thead className="text-gray-600 uppercase text-xs">
                    <tr>
                        <th rowSpan="2" className="py-3 px-4 border text-left bg-blue-900 text-white left-0 z-20">
                            NAMA PO
                        </th>
                        <th rowSpan="2" className="py-3 px-4 border text-left bg-blue-900 text-white left-0 z-10">
                            NAMA PROJECT
                        </th>
                        <th colSpan="5" className="py-3 px-4 border text-center bg-blue-900 text-white">
                            TOP 3 USIA PROJECT ON PROGRESS
                        </th>
                    </tr>
                    <tr>
                        <th className="py-2 px-4 border text-center font-medium bg-blue-900 text-white">IHLD</th>
                        <th className="py-2 px-4 border text-center font-medium bg-blue-900 text-white">TGL MOM</th>
                        <th className="py-2 px-4 border text-center font-medium bg-blue-900 text-white">REVENUE</th>
                        <th className="py-2 px-4 border text-center font-medium bg-blue-900 text-white">STATUS TOMPS</th>
                        <th className="py-2 px-4 border text-center font-medium bg-blue-900 text-white">USIA (HARI)</th>
                    </tr>
                </thead>
                <tbody className="text-gray-700">
                    {Object.keys(data).length > 0 ? (
                        Object.entries(data).map(([poName, projects]) => (
                            <React.Fragment key={poName}>
                                {projects.map((project, index) => (
                                    <tr key={project.ihld || index} className="border-b hover:bg-gray-50">
                                        {index === 0 && (
                                            <td
                                                // [PERBAIKAN] Menggunakan panjang project yang dinamis
                                                rowSpan={projects.length}
                                                className="py-3 px-4 border text-left align-top bg-gray-50 font-semibold left-0 z-10"
                                            >
                                                {poName}
                                            </td>
                                        )}
                                        <td className="py-3 px-4 border text-left">
                                            {project.uraian_kegiatan}
                                        </td>
                                        <td className="py-3 px-4 border text-center">
                                            {formatCell(project.ihld)}
                                        </td>
                                        <td className="py-3 px-4 border text-center whitespace-nowrap">
                                            {formatCell(project.tgl_mom, 'date')}
                                        </td>
                                        <td className="py-3 px-4 border text-right whitespace-nowrap">
                                            {formatCell(project.revenue, 'currency')}
                                        </td>
                                        <td className="py-3 px-4 border text-center whitespace-nowrap">
                                            {formatCell(project.status_tomps)}
                                        </td>
                                        <td className={`py-3 px-4 border text-center font-bold ${project.umur_project > 90 ? 'text-red-600' : ''}`}>
                                            {formatCell(project.umur_project, 'age')}
                                        </td>
                                    </tr>
                                ))}
                                {/* [PERBAIKAN] Logika padding row dihapus */}
                            </React.Fragment>
                        ))
                    ) : (
                        <tr>
                            <td colSpan="7" className="text-center py-10 text-gray-500">
                                Tidak ada data "On Progress" yang ditemukan.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
};

// ===================================================================
// KOMPONEN HALAMAN UTAMA (ReportJT)
// ===================================================================

export default function ReportJT({
    auth,
    jtReportData = [],
    tocReportData = [],
    top3ByWitel = {},
    top3ByPO = {},
    savedConfigJt,
}) {
    const jtConfig = useMemo(() => {
        // [PERBAIKAN PENTING] Filter kolom 'fixed' ('witel')
        const fixedColumn = jtTableConfigTemplate.find(c => c.type === 'fixed');

        if (savedConfigJt && Array.isArray(savedConfigJt) && savedConfigJt.length > 0) {
            // Gabungkan kolom 'witel' (fixed) dengan config dinamis dari DB
            return [fixedColumn, ...savedConfigJt];
        }
        // Jika tidak, gunakan template default
        return jtTableConfigTemplate;
    }, [savedConfigJt]);

    return (
        <AuthenticatedLayout
            auth={auth}
            header={<h2 className="font-semibold text-xl text-gray-800 leading-tight">Laporan Jaringan Tambahan (JT)</h2>}
        >
            <Head title="Report JT Datin" />

            <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8 space-y-6">

                    {/* Tabel 1: Data Report JT */}
                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <h3 className="font-semibold text-lg text-gray-800 mb-4">
                            Data Report JT
                        </h3>
                        <JtReportTable data={jtReportData} tableConfig={jtConfig} />
                    </div>

                    {/* Tabel 2: Project Belum GO LIVE */}
                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <h3 className="font-semibold text-lg text-gray-800 mb-4">
                            Project Belum GO LIVE
                        </h3>
                        <BelumGoLiveTable
                            data={tocReportData}
                            tableConfig={belumGoLiveTableConfig}
                        />
                    </div>

                    {/* Tabel 3: Top 3 On Progress by Witel */}
                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <h3 className="font-semibold text-lg text-gray-800 mb-4">
                            Top 3 Usia Project Terbaru (On Progress) - By Witel Induk
                        </h3>
                        <Top3WitelTable
                            data={top3ByWitel}
                        />
                    </div>

                    {/* Tabel 4: Top 3 On Progress by PO */}
                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <h3 className="font-semibold text-lg text-gray-800 mb-4">
                            Top 3 Usia Project Terbaru (On Progress) - By PO
                        </h3>
                        <Top3PoTable
                            data={top3ByPO}
                        />
                    </div>

                </div>
            </div>
        </AuthenticatedLayout>
    );
}
