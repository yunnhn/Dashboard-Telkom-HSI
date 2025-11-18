import React, { useEffect, useMemo, useRef, useState } from "react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Head, useForm, usePage, router, Link } from "@inertiajs/react";
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import InputError from "@/Components/InputError";
import PrimaryButton from "@/Components/PrimaryButton";
import TableConfiguratorJT from '@/Components/TableConfiguratorJT';
import CustomTargetFormSOS from '@/Components/CustomTargetFormSOS';
import axios from "axios";
import toast from "react-hot-toast";
import BelumGoLiveTable from '@/Components/BelumGoLiveTable';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    horizontalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import Swal from 'sweetalert2'; // Impor Swal

// ===================================================================
// KONFIGURASI TABEL UTAMA (Template Default)
// ===================================================================
export const jtTableConfigTemplate = [
    {
        key: 'witel',
        title: 'WITEL',
        type: 'fixed',
        visible: true,
        configurable: false,
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
        visible: true,
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
        visible: true,
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
        columnClass: 'bg-red-50',
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

// ===================================================================
// KONFIGURASI TABEL PENDUKUNG
// ===================================================================
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

// ===================================================================
// TABEL PENDUKUNG (Top 3 Witel)
// ===================================================================
const Top3WitelTable = ({ data }) => {
    // ... (Kode Top3WitelTable tidak berubah) ...
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
// TABEL PENDUKUNG (Top 3 PO)
// ===================================================================
const Top3PoTable = ({ data }) => {
    // Fungsi formatCell tetap sama
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
                    {/* ... Bagian <thead> tidak berubah ... */}
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
                        Object.entries(data).map(([poName, projects]) => {

                            // [PERUBAHAN] Hitung jumlah baris padding yang diperlukan
                            const numProjects = projects.length;
                            const paddingRowsNeeded = 3 - numProjects;

                            return (
                                <React.Fragment key={poName}>
                                    {/* 1. Render baris project yang ada */}
                                    {projects.map((project, index) => (
                                        <tr key={project.ihld || index} className="border-b hover:bg-gray-50">
                                            {index === 0 && (
                                                <td
                                                    // [PERUBAHAN] rowSpan sekarang SELALU 3
                                                    rowSpan={3}
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

                                    {/* 2. [PERUBAHAN] Render baris padding jika diperlukan */}
                                    {paddingRowsNeeded > 0 && Array.from({ length: paddingRowsNeeded }).map((_, padIndex) => (
                                        <tr key={`pad-${poName}-${padIndex}`} className="border-b bg-gray-50/50">
                                            {/* Sel NAMA PO tidak dirender di sini karena sudah di-rowSpan */}
                                            <td className="py-3 px-4 border text-center text-gray-400">-</td>
                                            <td className="py-3 px-4 border text-center text-gray-400">-</td>
                                            <td className="py-3 px-4 border text-center text-gray-400">-</td>
                                            <td className="py-3 px-4 border text-center text-gray-400">-</td>
                                            <td className="py-3 px-4 border text-center text-gray-400">-</td>
                                            <td className="py-3 px-4 border text-center text-gray-400">-</td>
                                        </tr>
                                    ))}
                                </React.Fragment>
                            );
                        })
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
// KOMPONEN UI (Progress Bar, DND Helper, Tab)
// ===================================================================

const ProgressBar = ({ progress, text }) => (
    <div className="mt-4">
        <p className="text-sm font-semibold text-gray-700 mb-1">{text} {progress}%</p>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
        </div>
    </div>
);

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

    const colSpan = item.groupTitle ? item.columns.filter(c => c.visible).length : 1;
    if (colSpan === 0) return null;

    const finalClassName = `py-2 px-4 border text-center font-medium select-none ${item.groupClass || item.headerClass || ''}`;
    return (
        <th ref={setNodeRef} style={style} {...attributes} {...listeners} colSpan={colSpan} rowSpan={item.groupTitle ? 1 : 2} className={finalClassName}>
            {children}
        </th>
    );
};

const DetailTabButton = ({ viewName, currentView, children }) => {
    const { filters } = usePage().props;
    const newParams = { ...filters, tab: viewName };
    delete newParams.page;

    return (
        <Link
            href={route("admin.analysisJT.index", newParams)}
            className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${currentView === viewName ? "bg-blue-600 text-white shadow" : "bg-white text-gray-600 hover:bg-gray-100"}`}
            preserveState
            preserveScroll
            replace
        >
            {children}
        </Link>
    );
};

// ===================================================================
// KARTU RINGKASAN
// ===================================================================
const DetailsCardJT = ({ totals }) => {
    const formatOrder = (value) => (value || 0).toLocaleString('id-ID');
    const formatRevenue = (value) => (value || 0).toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

    const summaryRows = [
        { label: "INITIAL", orders: totals?.initial, revenue: totals?.initial_rev },
        { label: "SURVEY & DRM", orders: totals?.survey_drm, revenue: totals?.survey_drm_rev },
        { label: "PERIZINAN & MOS", orders: totals?.perizinan_mos, revenue: totals?.perizinan_mos_rev },
        { label: "INSTALASI", orders: totals?.instalasi, revenue: totals?.instalasi_rev },
        { label: "FI-OGP LIVE", orders: totals?.fi_ogp_live, revenue: totals?.fi_ogp_live_rev },
    ];
    const goLiveRow = { label: "GO LIVE", orders: totals?.golive_jml_lop, revenue: totals?.golive_rev_lop };

    return (
        <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="font-semibold text-lg text-gray-800 mb-4">Ringkasan Report JT</h3>
            <div className="space-y-3 text-sm">
                <div>
                    <p className="font-semibold text-gray-700 mb-2">Total LOP On Progress (by Status)</p>
                    <table className="min-w-full text-left">
                        <thead>
                            <tr className="border-b border-gray-200">
                                <th className="py-1 px-2 font-medium text-gray-500">Status</th>
                                <th className="py-1 px-2 font-medium text-gray-500 text-right">Order</th>
                                <th className="py-1 px-2 font-medium text-gray-500 text-right">Revenue</th>
                            </tr>
                        </thead>
                        <tbody>
                            {summaryRows.map((row) => (
                                <tr key={row.label} className="border-b border-gray-100">
                                    <td className="py-1.5 px-2">{row.label}</td>
                                    <td className="py-1.5 px-2 text-right font-bold">{formatOrder(row.orders)}</td>
                                    <td className="py-1.5 px-2 text-right font-bold">{formatRevenue(row.revenue)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="pt-3 border-t">
                    <p className="font-semibold text-green-700 mb-2">Total LOP GO LIVE (exc Drop)</p>
                    <table className="min-w-full text-left">
                        <thead>
                            <tr className="border-b border-gray-200">
                                <th className="py-1 px-2 font-medium text-gray-500">Status</th>
                                <th className="py-1 px-2 font-medium text-gray-500 text-right">Order</th>
                                <th className="py-1 px-2 font-medium text-gray-500 text-right">Revenue</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="border-b border-gray-100">
                                <td className="py-1.5 px-2">{goLiveRow.label}</td>
                                <td className="py-1.5 px-2 text-right font-bold">{formatOrder(goLiveRow.orders)}</td>
                                <td className="py-1.5 px-2 text-right font-bold">{formatRevenue(goLiveRow.revenue)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

// ===================================================================
// KOMPONEN TABEL UTAMA (JtReportTable)
// ===================================================================
const JtReportTable = ({ data, tableConfig }) => {
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

    const grandTotalRowClass = 'bg-blue-900 text-white font-bold';

    return (
        <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-200 text-sm">
                <thead className="text-gray-600 uppercase text-xs">
                    <tr>
                        <th rowSpan="2" className="py-3 px-4 border text-left left-0 z-20 font-bold bg-blue-900 text-white">
                            WITEL
                        </th>
                        <SortableContext items={tableConfig.filter(item => item.key !== 'witel').map(item => item.groupTitle || item.key)} strategy={horizontalListSortingStrategy}>
                            {tableConfig.filter(item => item.visible).map((item) => {
                                if (item.type === 'fixed') return null;
                                return (
                                    <SortableHeaderCell key={item.groupTitle || item.key} item={item}>
                                        {item.groupTitle || item.title}
                                    </SortableHeaderCell>
                                );
                            })}
                        </SortableContext>
                    </tr>
                    <tr>
                        {tableConfig.filter(item => item.visible && item.groupTitle).map((item) => {
                            if (!item.groupTitle) return null;
                            return (
                                <SortableContext key={`${item.groupTitle}-subcolumns`} items={item.columns.map(col => col.key)} strategy={horizontalListSortingStrategy}>
                                    {item.columns.map((col) =>
                                        col.visible ? (
                                            <SortableSubHeaderCell key={col.key} id={col.key} column={col} parent={item}>
                                                {col.title}
                                            </SortableSubHeaderCell>
                                        ) : null
                                    )}
                                </SortableContext>
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

                                {tableConfig.slice(1).filter(config => config.visible).flatMap(config => {

                                    if (config.columns) {
                                        return config.columns.filter(col => col.visible).map(col => {
                                            let cellClasses = "py-2 px-4 border text-right whitespace-nowrap";
                                            return (
                                                <td key={`${item.witel}-${col.key}`} className={cellClasses}>
                                                    {renderCell(item, col)}
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
                                                {renderCell(item, config)}
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
// KOMPONEN HALAMAN UTAMA (AnalysisJT)
// ===================================================================

export default function AnalysisJT({
    auth,
    jtReportData = [],
    jtSummaryData = {},
    tocReportData = [],
    belumGoLiveList = { data: [], links: [] },
    top3ByWitel = {},
    top3ByPO = {},
    savedTableConfig = [],
    flash = {},
    customTargets,
    period,
}) {
    const { props } = usePage();
    const { filters = {} } = props;
    const activeDetailView = filters.tab || 'belum_go_live';

    const [queueProgress, setQueueProgress] = useState(null);
    const [isPaused, setIsPaused] = useState(false);
    const [timeRemaining, setTimeRemaining] = useState(null);
    const startTimeRef = useRef(null);
    const isQueueProcessing = queueProgress !== null;

    const witelList = ["BALI", "JATIM BARAT", "JATIM TIMUR", "NUSA TENGGARA", "SURAMADU"];

    useEffect(() => {
        if (flash.success) toast.success(flash.success);
        if (flash.error) toast.error(flash.error);
    }, [flash]);

    const [tableConfig, setTableConfig] = useState(jtTableConfigTemplate);
    useEffect(() => {
        if (savedTableConfig && Array.isArray(savedTableConfig) && savedTableConfig.length > 0) {
            const fixedColumn = jtTableConfigTemplate.find(c => c.type === 'fixed');
            const savedDynamicConfig = savedTableConfig.filter(c => c.type !== 'fixed');
            const newConfig = [fixedColumn, ...savedDynamicConfig];
            setTableConfig(newConfig);
        } else {
            setTableConfig(jtTableConfigTemplate);
        }
    }, [savedTableConfig]);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const isTopLevelActive = tableConfig.some(item => (item.groupTitle || item.key) === active.id);
        const isTopLevelOver = tableConfig.some(item => (item.groupTitle || item.key) === over.id);

        if (isTopLevelActive && isTopLevelOver) {
            setTableConfig((items) => {
                const fixedColumns = items.filter(item => item.type === 'fixed');
                const sortableItems = items.filter(item => item.type !== 'fixed');
                const oldIndex = sortableItems.findIndex(item => (item.groupTitle || item.key) === active.id);
                const newIndex = sortableItems.findIndex(item => (item.groupTitle || item.key) === over.id);
                const reorderedSortableItems = arrayMove(sortableItems, oldIndex, newIndex);
                return [...fixedColumns, ...reorderedSortableItems];
            });
        }
        else {
            let activeGroup = null;
            let overGroup = null;
            for (const group of tableConfig) {
                if (group.columns?.some(col => col.key === active.id)) activeGroup = group;
                if (group.columns?.some(col => col.key === over.id)) overGroup = group;
            }
            if (activeGroup && overGroup && activeGroup.groupTitle === overGroup.groupTitle) {
                setTableConfig(currentConfig => {
                    const newConfig = JSON.parse(JSON.stringify(currentConfig));
                    const targetGroup = newConfig.find(g => g.groupTitle === activeGroup.groupTitle);
                    if (targetGroup && targetGroup.columns) {
                        const oldIndex = targetGroup.columns.findIndex(c => c.key === active.id);
                        const newIndex = targetGroup.columns.findIndex(c => c.key === over.id);
                        if (oldIndex !== -1 && newIndex !== -1) {
                            targetGroup.columns = arrayMove(targetGroup.columns, oldIndex, newIndex);
                        }
                    }
                    return newConfig;
                });
            }
        }
    };

    const { data: uploadData, setData: setUploadData, post: postUpload, processing: processingUpload, errors, reset, progress: uploadProgress } = useForm({
        document: null,
    });

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        let batchId = urlParams.get("batch_id") || sessionStorage.getItem('jt_active_batch_id');

        const cleanup = () => {
            if (window.jtJobInterval) clearInterval(window.jtJobInterval);
            window.jtJobInterval = null;
            setQueueProgress(null); // Gunakan state yang benar
            sessionStorage.removeItem('jt_active_batch_id');
            setTimeRemaining(null);
            setIsPaused(false);
            const currentUrl = new URL(window.location.href);
            currentUrl.searchParams.delete("batch_id");
            window.history.replaceState({}, document.title, currentUrl.toString());
        };

        if (batchId) {
            sessionStorage.setItem('jt_active_batch_id', batchId);
            if (queueProgress === null) setQueueProgress(0);
            if (window.jtJobInterval) clearInterval(window.jtJobInterval);

            window.jtJobInterval = setInterval(() => {
                if (isPaused) return;

                axios.get(route("import.progress", { batchId }))
                    .then(response => {
                        const newProgress = response.data.progress ?? 0;
                        setQueueProgress(newProgress); // Selalu update progress

                        // Hitung sisa waktu jika sedang berjalan
                        if (newProgress > 1 && newProgress < 100) {
                            if (!startTimeRef.current) startTimeRef.current = Date.now();
                            const elapsedTime = (Date.now() - startTimeRef.current) / 1000;
                            const estimatedTotalTime = (elapsedTime / newProgress) * 100;
                            const remainingTimeInSeconds = estimatedTotalTime - elapsedTime;
                            if (remainingTimeInSeconds > 0) {
                                const minutes = Math.floor(remainingTimeInSeconds / 60);
                                const seconds = Math.floor(remainingTimeInSeconds % 60);
                                setTimeRemaining(`${minutes} menit ${seconds} detik`);
                            }
                        } else {
                            setTimeRemaining(null);
                        }

                        // Logika Selesai
                        if (newProgress >= 100) {
                            if (window.jtJobInterval) clearInterval(window.jtJobInterval);
                            window.jtJobInterval = null;
                            setTimeRemaining(null);

                            setTimeout(() => {
                                cleanup();
                                toast.success("Proses impor data JT selesai!");
                                router.reload({ preserveScroll: true });
                            }, 4000); // <-- Ini sudah benar (4 detik)
                        }
                    })
                    .catch(error => {
                        console.error("Gagal mengambil progres job JT:", error);
                        toast.error("Terjadi kesalahan saat memproses file JT.");
                        cleanup();
                    });
            }, 2500);
        }
        return () => {
            if (window.jtJobInterval) clearInterval(window.jtJobInterval);
        };
    }, [isPaused, props.flash]);


    const handleSaveConfig = () => {
        const configToSave = tableConfig.filter(c => c.type !== 'fixed');
        router.post(route("admin.analysisJT.saveConfig"), {
            configuration: configToSave,
            page_name: "analysis_jt"
        }, {
            preserveScroll: true,
        });
    };

    function handleUploadSubmit(e) {
        e.preventDefault();
        postUpload(route("admin.analysisJT.upload"), {
            onSuccess: () => reset('document'),
            preserveScroll: true,
        });
    }

    const handlePauseToggle = () => setIsPaused(prev => !prev);
    const handleCancelUpload = () => {
        Swal.fire({
            title: 'Anda Yakin?',
            text: "Anda yakin ingin membatalkan proses impor ini?",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Ya, Batalkan!',
            cancelButtonText: 'Lanjut Impor'
        }).then((result) => {
            if (result.isConfirmed) {
                const batchId = sessionStorage.getItem('jt_active_batch_id');
                if (batchId) {
                    axios.post(route('admin.analysisJT.import.cancel'), { batch_id: batchId })
                        .then(response => {
                            toast.success(response.data.message || "Proses dibatalkan.");
                            if (window.jtJobInterval) clearInterval(window.jtJobInterval);

                            // [PERBAIKAN] Ganti 'setProgress' menjadi 'setQueueProgress'
                            setQueueProgress(null);

                            sessionStorage.removeItem('jt_active_batch_id');
                            setTimeRemaining(null);
                            setIsPaused(false);
                        })
                        .catch(error => toast.error("Gagal membatalkan proses."));
                }
            }
        });
    };

    return (
        <AuthenticatedLayout
            auth={auth}
            header={
                <h2 className="font-semibold text-xl text-gray-800 leading-tight">
                    Analysis Jaringan Tambahan
                </h2>
            }
        >
            <Head title="Analysis Jaringan Tambahan" />
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
            >
                <div className="py-12">
                    {/* [PERBAIKAN] Ganti max-w-7xl menjadi max-w-full */}
                    <div className="max-w-full mx-auto sm:px-6 lg:px-8">
                        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                            {/* Kolom Utama */}
                            <div className="lg:col-span-3 space-y-6">

                                <TableConfiguratorJT
                                    tableConfig={tableConfig}
                                    setTableConfig={setTableConfig}
                                    onSave={handleSaveConfig}
                                    defaultConfig={jtTableConfigTemplate} // Beri default config
                                />

                                {/* Tabel Laporan Utama (Gambar 1) */}
                                <div className="bg-white p-6 rounded-lg shadow-md">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="font-semibold text-lg text-gray-800">
                                            Data Report JT
                                        </h3>
                                        <a
                                            href={route("admin.analysisJT.export")}
                                            className="px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-md hover:bg-green-700 transition-colors"
                                        >
                                            Ekspor Excel
                                        </a>
                                    </div>
                                    <JtReportTable data={jtReportData} tableConfig={tableConfig} />
                                </div>

                                {/* Kontainer Tab untuk Tabel Pendukung */}
                                <div className="bg-white p-6 rounded-lg shadow-md">
                                    <div className="flex flex-wrap items-center gap-2 border-b pb-4 mb-4">
                                        <DetailTabButton viewName="belum_go_live" currentView={activeDetailView}>
                                            Project Belum GO LIVE
                                        </DetailTabButton>
                                        <DetailTabButton viewName="top_3_witel" currentView={activeDetailView}>
                                            Top 3 On Progress by Witel
                                        </DetailTabButton>
                                        <DetailTabButton viewName="top_3_po" currentView={activeDetailView}>
                                            Top 3 On Progress by PO
                                        </DetailTabButton>
                                    </div>
                                    {activeDetailView === 'belum_go_live' && (
                                        <BelumGoLiveTable
                                            data={tocReportData}
                                            tableConfig={belumGoLiveTableConfig}
                                        />
                                    )}
                                    {activeDetailView === 'top_3_witel' &&
                                        <Top3WitelTable
                                            data={top3ByWitel}
                                        />
                                    }
                                    {activeDetailView === 'top_3_po' &&
                                        <Top3PoTable
                                            data={top3ByPO}
                                        />
                                    }
                                </div>
                            </div>

                            {/* Sidebar */}
                            <div className="lg:col-span-1 space-y-6">
                                <DetailsCardJT totals={jtSummaryData} />

                                {/* KARTU UPLOAD DENGAN PROGRESS BAR */}
                                <div className="bg-white p-6 rounded-lg shadow-md">
                                    <h3 className="font-semibold text-lg text-gray-800">Unggah Data Mentah JT</h3>

                                    {/* TAHAP 1: Sedang Mengunggah (File -> Server) */}
                                    {processingUpload && (
                                        <div className="mt-4 space-y-4">
                                            <ProgressBar
                                                progress={uploadProgress ? uploadProgress.percentage : 0}
                                                text="Mengunggah file..."
                                            />
                                            {uploadProgress && (
                                                <p className="text-sm text-gray-600 animate-pulse">
                                                    {uploadProgress.percentage}% terkirim...
                                                </p>
                                            )}
                                        </div>
                                    )}

                                    {/* TAHAP 2: Sedang Memproses di Queue (Server-side) */}
                                    {/* Logika 'isQueueProcessing' sudah diperbarui */}
                                    {!processingUpload && isQueueProcessing && (
                                        <div className="mt-4 space-y-4">
                                            <ProgressBar
                                                progress={Math.round(queueProgress)} // Gunakan state queue
                                                text={`Memproses file JT...`}
                                            />
                                            {timeRemaining && (
                                                <p className="text-sm text-gray-600 animate-pulse">
                                                    Perkiraan waktu selesai: <strong>{timeRemaining}</strong>
                                                </p>
                                            )}
                                            {/* Tampilkan tombol hanya jika belum 100% */}
                                            {queueProgress < 100 && (
                                                <div className="flex items-center gap-4 mt-2">
                                                    <button type="button" onClick={handlePauseToggle} className={`w-1/2 px-4 py-2 text-sm font-semibold rounded-md text-white transition-colors ${isPaused ? "bg-green-500 hover:bg-green-600" : "bg-yellow-500 hover:bg-yellow-600"}`}>
                                                        {isPaused ? "Lanjutkan" : "Jeda"}
                                                    </button>
                                                    <button type="button" onClick={handleCancelUpload} className="w-1/2 px-4 py-2 text-sm bg-red-600 text-white font-semibold rounded-md hover:bg-red-700 transition-colors">
                                                        Batalkan
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* TAHAP 3: Idle (Menunggu file) */}
                                    {!processingUpload && !isQueueProcessing && (
                                        <>
                                            <p className="text-gray-500 mt-1 text-sm">Unggah file Excel (xlsx, xls, csv) untuk memperbarui data JT.</p>
                                            <form onSubmit={handleUploadSubmit} className="mt-4 space-y-4">
                                                <div>
                                                    <input
                                                        type="file"
                                                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                                        onChange={(e) => setUploadData("document", e.target.files[0])}
                                                        disabled={processingUpload}
                                                    />
                                                    <InputError message={errors.document} className="mt-2" />
                                                </div>
                                                <button type="submit" disabled={processingUpload || !uploadData.document} className="w-full px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 disabled:bg-blue-400">
                                                    Unggah Dokumen
                                                </button>
                                            </form>
                                        </>
                                    )}
                                </div>
                                <CustomTargetFormSOS
                                    tableConfig={tableConfig}
                                    witelList={witelList}
                                    initialData={customTargets}
                                    period={period}
                                    saveRouteName="admin.analysisJT.saveCustomTargets"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </DndContext>
        </AuthenticatedLayout>
    );
}
