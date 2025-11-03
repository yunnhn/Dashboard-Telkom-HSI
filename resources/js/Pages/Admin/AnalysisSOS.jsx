import React, { useEffect, useMemo, useRef, useState } from "react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Head, useForm, usePage, router, Link } from "@inertiajs/react";
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import InputError from "@/Components/InputError";
import PrimaryButton from "@/Components/PrimaryButton";
import TableConfiguratorSOS from '@/Components/TableConfiguratorSOS'; // Asumsi komponen ini sudah ada
import CustomTargetFormSOS from "@/Components/CustomTargetFormSOS";
import axios from "axios";
import toast from "react-hot-toast";
import DetailTable from "@/Components/Sos/DetailTable";
import GalaksiReportTable from '@/Components/Sos/GalaksiReportTable';
import ListPoPreviewTable from '@/Components/Sos/ListPoPreviewTable';
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
    horizontalListSortingStrategy, // Gunakan strategi horizontal untuk kolom
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
    provideOrderColumnsTemplate,
    inProcessColumnsTemplate,
    readyToBillColumnsTemplate,
    provCompleteColumnsTemplate,
} from "@/config/tableConfigTemplates";

// ===================================================================
// Konfigurasi Awal untuk Tabel Report
// ===================================================================
export const sosTableConfigTemplateAOMO = [ // BIRU
    { key: 'witel', title: 'WITEL', type: 'fixed', visible: true, configurable: false },
    {
        groupTitle: "<3BLN",
        groupClass: "bg-blue-400 text-white", // Menggunakan className
        columnClass: "bg-blue-800 text-white",
        columns: [
            { key: "provide_order_lt_3bln", title: "PROVIDE ORDER", type: "numeric", visible: true },
            { key: "est_bc_provide_order_lt_3bln", title: "EST BC (JT)", type: "currency", visible: true },
            { key: "in_process_lt_3bln", title: "IN PROCESS", type: "numeric", visible: true },
            { key: "est_bc_in_process_lt_3bln", title: "EST BC (JT)", type: "currency", visible: true },
            { key: "ready_to_bill_lt_3bln", title: "READY TO BILL", type: "numeric", visible: true },
            { key: "est_bc_ready_to_bill_lt_3bln", title: "EST BC (JT)", type: "currency", visible: true },
        ],
    },
    { key: 'total_lt_3bln', title: 'ORDER <3BLN Total', headerClass: 'bg-blue-400 text-white', type: 'numeric', isTotal: true, visible: true },
    {
        groupTitle: ">3BLN",
        groupClass: "bg-blue-400 text-white",
        columnClass: "bg-blue-800 text-white",
        columns: [
            { key: "provide_order_gt_3bln", title: "PROVIDE ORDER", type: "numeric", visible: true },
            { key: "est_bc_provide_order_gt_3bln", title: "EST BC (JT)", type: "currency", visible: true },
            { key: "in_process_gt_3bln", title: "IN PROCESS", type: "numeric", visible: true },
            { key: "est_bc_in_process_gt_3bln", title: "EST BC (JT)", type: "currency", visible: true },
            { key: "ready_to_bill_gt_3bln", title: "READY TO BILL", type: "numeric", visible: true },
            { key: "est_bc_ready_to_bill_gt_3bln", title: "EST BC (JT)", type: "currency", visible: true },
        ],
    },
    { key: 'total_gt_3bln', title: 'ORDER >3BLN Total', headerClass: 'bg-blue-400 text-white', type: 'numeric', isTotal: true, visible: true },
    { key: 'grand_total_order', title: 'Grand Total Order', headerClass: 'bg-blue-800 font-bold text-white', isTotal: true, visible: true }
];

export const sosTableConfigTemplateSODORO = [ // MERAH
    { key: 'witel', title: 'WITEL', type: 'fixed', visible: true, configurable: false },
    {
        groupTitle: "<3BLN",
        groupClass: "bg-red-800 text-white", // Menggunakan className
        columnClass: "bg-red-800 text-white",
        columns: [
            { key: "provide_order_lt_3bln", title: "PROVIDE ORDER", type: "numeric", visible: true },
            { key: "in_process_lt_3bln", title: "IN PROCESS", type: "numeric", visible: true },
            { key: "ready_to_bill_lt_3bln", title: "READY TO BILL", type: "numeric", visible: true },
        ],
    },
    { key: 'total_lt_3bln', title: '<3BLN Total', headerClass: 'bg-red-800 text-white', type: 'numeric', isTotal: true, visible: true },
    {
        groupTitle: ">3BLN",
        groupClass: "bg-red-800 text-white",
        columnClass: "bg-red-800 text-white",
        columns: [
            { key: "provide_order_gt_3bln", title: "PROVIDE ORDER", type: "numeric", visible: true },
            { key: "in_process_gt_3bln", title: "IN PROCESS", type: "numeric", visible: true },
            { key: "ready_to_bill_gt_3bln", title: "READY TO BILL", type: "numeric", visible: true },
        ],
    },
    { key: 'total_gt_3bln', title: '>3BLN Total', headerClass: 'bg-red-800 text-white', type: 'numeric', isTotal: true, visible: true },
    { key: 'grand_total_order', title: 'Grand Total Order', headerClass: 'bg-red-800 text-white font-bold', isTotal: true, visible: true }
];

const ProgressBar = ({ progress, text }) => (
    <div className="mt-4">
        <p className="text-sm font-semibold text-gray-700 mb-1">
            {text} {progress}%
        </p>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
            ></div>
        </div>
    </div>
);

// export const sosTableConfigTemplate = [
//     // Item 1: Grup <3BLN
//     {
//         key: 'witel',
//         title: 'WITEL',
//         type: 'fixed', // Tipe khusus agar tidak bisa diedit/dihapus
//         visible: true,
//         configurable: false // Properti untuk menandai agar tidak muncul di beberapa form
//     },
//     {
//         groupTitle: "<3BLN",
//         columns: [
//             { key: "provide_order_lt_3bln", title: "PROVIDE ORDER", type: "numeric", visible: true },
//             { key: "est_bc_provide_order_lt_3bln", title: "EST BC (JT)", type: "currency", visible: true },
//             { key: "in_process_lt_3bln", title: "IN PROCESS", type: "numeric", visible: true },
//             { key: "est_bc_in_process_lt_3bln", title: "EST BC (JT)", type: "currency", visible: true },
//             { key: "ready_to_bill_lt_3bln", title: "READY TO BILL", type: "numeric", visible: true },
//             { key: "est_bc_ready_to_bill_lt_3bln", title: "EST BC (JT)", type: "currency", visible: true },
//         ],
//     },
//     // Item 2: Kolom Tunggal <3BLN Total
//     {
//         key: 'total_lt_3bln',
//         title: 'ORDER <3BLN Total',
//         type: 'numeric',
//         isTotal: true,
//         visible: true
//     },
//     // Item 3: Grup >3BLN
//     {
//         groupTitle: ">3BLN",
//         columns: [
//             { key: "provide_order_gt_3bln", title: "PROVIDE ORDER", type: "numeric", visible: true },
//             { key: "est_bc_provide_order_gt_3bln", title: "EST BC (JT)", type: "currency", visible: true },
//             { key: "in_process_gt_3bln", title: "IN PROCESS", type: "numeric", visible: true },
//             { key: "est_bc_in_process_gt_3bln", title: "EST BC (JT)", type: "currency", visible: true },
//             { key: "ready_to_bill_gt_3bln", title: "READY TO BILL", type: "numeric", visible: true },
//             { key: "est_bc_ready_to_bill_gt_3bln", title: "EST BC (JT)", type: "currency", visible: true },
//         ],
//     },
//     // Item 4: Kolom Tunggal >3BLN Total
//     {
//         key: 'total_gt_3bln',
//         title: 'ORDER >3BLN Total',
//         type: 'numeric',
//         isTotal: true,
//         visible: true
//     },
//     {
//         key: 'grand_total_order',
//         title: 'Grand Total Order',
//         isTotal: true,
//         visible: true
//     }
// ];

// ===================================================================
// Komponen Helper & UI
// ===================================================================

// Tambahkan komponen helper ini di bawah SortableHeaderCell
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
    const finalClassName = `py-2 px-4 border text-center font-medium select-none ${item.groupClass || item.headerClass || ''}`;
    return (
        <th ref={setNodeRef} style={style} {...attributes} {...listeners} colSpan={item.groupTitle ? item.columns.filter(c => c.visible).length : 1} rowSpan={item.groupTitle ? 1 : 2} className={finalClassName}>
            {children}
        </th>
    );
};

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
                    className={`px-3 py-2 text-sm border rounded hover:bg-blue-600 hover:text-white transition-colors ${link.active ? "bg-blue-600 text-white" : "bg-white text-gray-700"} ${!link.url ? "text-gray-400 cursor-not-allowed" : ""}`}
                    dangerouslySetInnerHTML={{ __html: link.label }}
                    preserveScroll
                    preserveState
                />
            ))}
        </div>
    );
};

/**
 * Tombol untuk navigasi antar tab tabel detail.
 */
const DetailTabButton = ({ viewName, currentView, children }) => {
    const { filters } = usePage().props;
    const newParams = { ...filters, tab: viewName };
    delete newParams.page; // Kembali ke halaman 1 saat ganti tab

    return (
        <Link
            href={route("admin.analysisSOS.index", newParams)}
            className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${currentView === viewName ? "bg-blue-600 text-white shadow" : "bg-white text-gray-600 hover:bg-gray-100"}`}
            preserveState
            preserveScroll
            replace
        >
            {children}
        </Link>
    );
};

/**
 * Kartu untuk menampilkan detail ringkasan data.
 */
const DetailsCard = ({ totals }) => (
    <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="font-semibold text-lg text-gray-800 mb-4">Details</h3>
        <div className="space-y-2 text-sm">
            {/* Info Utama */}
            <div className="flex justify-between">
                <span>Grand Total Order</span>
                <span className="font-bold">{totals.grandTotalOrder.toLocaleString('id-ID')}</span>
            </div>
            <div className="flex justify-between">
                <span>Total Est BC (JT)</span>
                <span className="font-bold">{totals.totalEstBC.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>

            {/* Grup Di Bawah 3 Bulan */}
            <div className="pt-3 mt-3 border-t">
                <p className="font-semibold text-gray-600 mb-2">Di Bawah 3 Bulan</p>
                <div className="flex justify-between pl-2">
                    <span>Total Order &lt;3BLN</span>
                    <span>{totals.totalLt3bln.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between pl-2">
                    <span>Total Est BC &lt;3BLN (JT)</span>
                    <span>{totals.totalEstBClt3bln.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
            </div>

            {/* Grup Di Atas 3 Bulan */}
            <div className="pt-3 mt-3 border-t">
                <p className="font-semibold text-gray-600 mb-2">Di Atas 3 Bulan</p>
                <div className="flex justify-between pl-2">
                    <span>Total Order &gt;3BLN</span>
                    <span>{totals.totalGt3bln.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between pl-2">
                    <span>Total Est BC &gt;3BLN (JT)</span>
                    <span>{totals.totalEstBCgt3bln.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
            </div>
        </div>
    </div>
);

// ===================================================================
// Komponen Tabel
// ===================================================================

// Ganti komponen SosReportTable di AnalysisSOS.jsx

const SosReportTable = ({ data, tableConfig, viewMode }) => {
    const renderCell = (item, column) => {
        const value = item[column.key] ?? 0;
        if (column.type === 'currency') {
            return parseFloat(value).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        }
        return Number(value).toLocaleString('id-ID');
    };

    // [PERUBAHAN] Tentukan kelas tema berdasarkan viewMode
    const isAOMOMode = viewMode === 'AOMO';
    const headerThemeClass = isAOMOMode ? 'bg-blue-800 text-white' : 'bg-red-800 text-white'; // Merah untuk SO_DO_RO
    const grandTotalRowClass = isAOMOMode ? 'bg-blue-800 text-white' : 'bg-red-800 text-white'; // Merah untuk SO_DO_RO
    const segmentTotalRowClass = isAOMOMode ? 'bg-blue-900 font-bold text-white' : 'bg-red-900 font-bold text-white'; // Merah untuk SO_DO_RO

    return (
        <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-200 text-sm">
                <thead className="text-gray-600 uppercase text-xs">
                    <tr>
                        <th rowSpan="2" className={`py-3 px-4 border text-left left-0 z-20 font-bold ${headerThemeClass}`}>
                            WITEL
                        </th>
                        <SortableContext items={tableConfig.filter(item => item.key !== 'witel').map(item => item.groupTitle || item.key)} strategy={horizontalListSortingStrategy}>
                            {tableConfig.map((item) => {
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
                        {tableConfig.map((item) => {
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
                        // Cek apakah ini baris total (baik segmen maupun grand total)
                        if (item.isTotal) {
                            const isGrandTotal = item.witel === 'GRAND TOTAL';
                            const segmentTotalNames = ['PRIVATE SERVICE', 'REGIONAL', 'GOVERNMENT', 'STATE-OWNED ENTERPRISE SERVICE', 'ENTERPRISE'];
                            const isSegmentTotal = segmentTotalNames.includes(item.witel);

                            // [PERUBAHAN] Logika penentuan kelas CSS untuk baris total
                            let rowClass = '';
                            if (isGrandTotal) {
                                rowClass = grandTotalRowClass; // Kelas untuk Grand Total
                            } else if (isSegmentTotal) {
                                rowClass = segmentTotalRowClass; // Kelas untuk Total Segmen (merah/biru tergantung mode)
                            } else {
                                rowClass = 'bg-gray-200 font-bold'; // Fallback jika ada total lain
                            }

                            return (
                                <tr key={rowIndex} className={rowClass}>
                                    {/* Render sel pertama untuk nama total */}
                                    <td className={`py-2 px-4 border text-left left-0 z-10 font-bold ${rowClass}`}>
                                        {item.witel}
                                    </td>

                                    {/* Render sisa sel data untuk baris total */}
                                    {tableConfig.slice(1).flatMap(config => {
                                        if (config.columns) {
                                            return config.columns.map(col => (
                                                <td key={`${item.witel}-${col.key}`} className="py-2 px-4 border text-center">{renderCell(item, col)}</td>
                                            ));
                                        } else if (config.key) {
                                            return (
                                                <td key={`${item.witel}-${config.key}`} className="py-2 px-4 border text-center">{renderCell(item, config)}</td>
                                            );
                                        }
                                        return [];
                                    })}
                                </tr>
                            );
                        }

                        // Jika bukan baris total, render baris data WITEL biasa
                        return (
                            <tr key={rowIndex} className="border-b hover:bg-gray-50">
                                {/* Sel WITEL untuk baris data biasa */}
                                <td className="py-3 px-4 border text-left left-0 z-10 bg-white">
                                    {item.witel}
                                </td>

                                {/* Render sisa sel data untuk baris biasa */}
                                {tableConfig.slice(1).flatMap(configItem => {
                                    if (configItem.columns) {
                                        return configItem.columns.map(col =>
                                            col.visible ? (
                                                <td key={`${item.witel}-${col.key}`} className="py-3 px-4 border text-center">
                                                    {renderCell(item, col)}
                                                </td>
                                            ) : null
                                        );
                                    }
                                    if (configItem.key) {
                                        return (
                                            <td key={`${item.witel}-${configItem.key}`} className="py-3 px-4 border text-center">
                                                {renderCell(item, configItem)}
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

// ===================================================================
// Komponen Utama Halaman
// ===================================================================

export default function AnalysisSOS({
    auth,
    reportData = [],
    provideOrderData = { data: [], links: [] },
    inProcessData = { data: [], links: [] },
    readyToBillData = { data: [], links: [] },
    provCompleteData = { data: [], links: [] },
    galaksiData = [],
    listPoData = { data: [], links: [] },
    savedTableConfig = [],
    flash = {},
    customTargets,
    period,
}) {
    const { props } = usePage();
    const { filters = {} } = props;
    const [viewMode, setViewMode] = useState('AOMO');
    const activeDetailView = filters.tab || 'provide_order';

    // [BARU] State untuk manajemen progress bar
    const [progress, setProgress] = useState(null);
    const [isPaused, setIsPaused] = useState(false);
    const [timeRemaining, setTimeRemaining] = useState(null);
    const startTimeRef = useRef(null);
    // Helper untuk conditional rendering
    const isProcessing = progress !== null && progress < 100;

    const witelList = [
        "BALI", "JATIM BARAT", "JATIM TIMUR", "NUSA TENGGARA", "SURAMADU"
    ];

    const [isPoFormVisible, setIsPoFormVisible] = useState(false);

    const {
        data: manualPoData,
        setData: setManualPoData,
        post: postManualPo,
        processing: processingManualPo,
        errors: errorsManualPo,
        reset: resetManualPo
    } = useForm({
        po: '',
        nipnas: '',
        segment: '',
        bill_city: '',
        witel: '',
    });

    function handleManualPoSubmit(e) {
        e.preventDefault();
        postManualPo(route("admin.analysisSOS.addPo"), {
            preserveScroll: true,
            onSuccess: () => {
                resetManualPo(); // Kosongkan form setelah berhasil
            },
        });
    }

    useEffect(() => {
        if (flash.success) toast.success(flash.success);
        if (flash.error) toast.error(flash.error);
    }, [flash]);

    const [tableConfig, setTableConfig] = useState(
        viewMode === 'AOMO' ? sosTableConfigTemplateAOMO : sosTableConfigTemplateSODORO
    );

    useEffect(() => {
        setTableConfig(viewMode === 'AOMO' ? sosTableConfigTemplateAOMO : sosTableConfigTemplateSODORO);
    }, [viewMode]);

    useEffect(() => {
        // Jika ada konfigurasi yang tersimpan dari server, gunakan itu.
        if (savedTableConfig && savedTableConfig.length > 0) {
            setTableConfig(savedTableConfig);
        }
        // Jika tidak ada (setelah reset), pilih template default berdasarkan viewMode saat ini.
        else {
            if (viewMode === 'AOMO') {
                setTableConfig(sosTableConfigTemplateAOMO);
            } else {
                setTableConfig(sosTableConfigTemplateSODORO);
            }
        }
        // Tambahkan viewMode ke dependency array agar efek ini berjalan saat mode tampilan berubah.
    }, [savedTableConfig, viewMode]);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event) => {
        const { active, over } = event;

        if (!over || active.id === over.id) {
            return; // Tidak ada perubahan jika tidak ada tujuan drop atau itemnya sama
        }

        // Cek apakah item yang di-drag adalah item level atas (grup atau kolom tunggal)
        const isTopLevelActive = tableConfig.some(item => (item.groupTitle || item.key) === active.id);
        const isTopLevelOver = tableConfig.some(item => (item.groupTitle || item.key) === over.id);

        // 1. Logika untuk mengurutkan item level atas
        if (isTopLevelActive && isTopLevelOver) {
            setTableConfig((items) => {
                // Filter dulu kolom fixed agar tidak ikut terurut
                const fixedColumns = items.filter(item => item.type === 'fixed');
                const sortableItems = items.filter(item => item.type !== 'fixed');

                const oldIndex = sortableItems.findIndex(item => (item.groupTitle || item.key) === active.id);
                const newIndex = sortableItems.findIndex(item => (item.groupTitle || item.key) === over.id);

                const reorderedSortableItems = arrayMove(sortableItems, oldIndex, newIndex);

                // Gabungkan kembali dengan kolom fixed di posisi semula
                const finalConfig = [...tableConfig]; // Salin array asli
                let sortableIndex = 0;
                for (let i = 0; i < finalConfig.length; i++) {
                    if (finalConfig[i].type !== 'fixed') {
                        finalConfig[i] = reorderedSortableItems[sortableIndex++];
                    }
                }
                return finalConfig;
            });
        }
        // 2. Logika untuk mengurutkan sub-kolom di dalam grup
        else {
            // Cari grup tempat sub-kolom berada
            let activeGroup = null;
            let overGroup = null;
            let activeKey = active.id;
            let overKey = over.id;

            for (const group of tableConfig) {
                if (group.columns?.some(col => col.key === activeKey)) {
                    activeGroup = group;
                }
                if (group.columns?.some(col => col.key === overKey)) {
                    overGroup = group;
                }
                if (activeGroup && overGroup) break; // Keluar jika keduanya sudah ditemukan
            }

            // Pastikan sub-kolom diseret di dalam grup yang sama
            if (activeGroup && overGroup && activeGroup.groupTitle === overGroup.groupTitle) {
                setTableConfig(currentConfig => {
                    const newConfig = JSON.parse(JSON.stringify(currentConfig)); // Deep copy
                    const targetGroup = newConfig.find(g => g.groupTitle === activeGroup.groupTitle);

                    if (targetGroup && targetGroup.columns) {
                        const oldIndex = targetGroup.columns.findIndex(c => c.key === activeKey);
                        const newIndex = targetGroup.columns.findIndex(c => c.key === overKey);

                        if (oldIndex !== -1 && newIndex !== -1) {
                            targetGroup.columns = arrayMove(targetGroup.columns, oldIndex, newIndex);
                        }
                    }
                    return newConfig;
                });
            }
            // Jika diseret antar grup (atau kasus lain), abaikan saja untuk saat ini
            else {
                console.warn("Drag and drop sub-columns between different groups is not supported yet.");
            }
        }
    };

    const [poProgress, setPoProgress] = useState(null);

    const { data: uploadData, setData: setUploadData, post: postUpload, processing, errors, reset } = useForm({
        document: null,
    });

    const { data: poUploadData, setData: setPoUploadData, post: postPoUpload, processing: processingPo, errors: errorsPo, reset: resetPo } = useForm({
        po_document: null,
    });

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        let batchId = urlParams.get("batch_id") || sessionStorage.getItem('sos_active_batch_id');

        const cleanup = () => {
            if (window.sosJobInterval) clearInterval(window.sosJobInterval);
            window.sosJobInterval = null;
            setProgress(null);
            sessionStorage.removeItem('sos_active_batch_id');
            startTimeRef.current = null;
            setTimeRemaining(null);
            setIsPaused(false);

            const currentUrl = new URL(window.location.href);
            currentUrl.searchParams.delete("batch_id");
            window.history.replaceState({}, document.title, currentUrl.toString());
        };

        if (batchId) {
            sessionStorage.setItem('sos_active_batch_id', batchId);
            if (progress === null) {
                setProgress(0);
            }

            if (window.sosJobInterval) clearInterval(window.sosJobInterval);

            window.sosJobInterval = setInterval(() => {
                if (isPaused) return; // Jika dijeda, lewati pengecekan

                axios.get(route("import.progress", { batchId }))
                    .then(response => {
                        const newProgress = response.data.progress ?? 0;
                        setProgress(newProgress);

                        // Kalkulasi estimasi waktu
                        if (newProgress > 1 && newProgress < 100) {
                            if (!startTimeRef.current) {
                                startTimeRef.current = Date.now();
                            }
                            const elapsedTime = (Date.now() - startTimeRef.current) / 1000; // in seconds
                            const remainingPercentage = 100 - newProgress;
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

                        if (newProgress >= 100) {
                            cleanup();
                            setTimeout(() => {
                                toast.success("Proses impor data SOS selesai!");
                                router.reload({ preserveScroll: true });
                            }, 1500);
                        }
                    })
                    .catch(error => {
                        console.error("Gagal mengambil progres job:", error);
                        toast.error("Terjadi kesalahan saat memproses file.");
                        cleanup();
                    });
            }, 2500); // Poll setiap 2.5 detik
        }

        return () => {
            if (window.sosJobInterval) clearInterval(window.sosJobInterval);
        };
    }, [isPaused]);

    // Handle job progress from backend
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const poBatchId = urlParams.get("po_batch_id");

        if (poBatchId && poProgress === null) {
            setPoProgress(0); // Inisialisasi progress
            toast.loading('Memproses file Daftar PO...', { id: 'po-import-toast' });

            const interval = setInterval(() => {
                axios.get(route("import.progress", { batchId: poBatchId }))
                    .then(response => {
                        const newProgress = response.data.progress ?? 0;
                        setPoProgress(newProgress);

                        if (newProgress >= 100) {
                            clearInterval(interval);
                            toast.success('Daftar PO berhasil diperbarui!', { id: 'po-import-toast' });

                            setTimeout(() => {
                                setPoProgress(null);
                                // Hapus parameter dari URL
                                const currentUrl = new URL(window.location.href);
                                currentUrl.searchParams.delete("po_batch_id");
                                window.history.replaceState({}, '', currentUrl);

                                // [PENTING] Muat ulang hanya data listPo
                                router.reload({
                                    only: ['listPoData'],
                                    preserveScroll: true,
                                    preserveState: true,
                                });
                            }, 1500); // Tunggu sebentar sebelum refresh
                        }
                    })
                    .catch(error => {
                        console.error("Gagal mengambil progres job PO:", error);
                        clearInterval(interval);
                        setPoProgress(null);
                        toast.error('Gagal memproses file PO.', { id: 'po-import-toast' });
                    });
            }, 2000); // Cek status setiap 2 detik

            return () => clearInterval(interval); // Cleanup
        }
    }, []);

    const detailsTotals = useMemo(() => {
        if (!reportData || reportData.length === 0) {
            // Pastikan nilai default ada untuk semua properti
            return { grandTotalOrder: 0, totalEstBC: 0, totalLt3bln: 0, totalGt3bln: 0, totalEstBClt3bln: 0, totalEstBCgt3bln: 0 };
        }

        const grandTotalRow = reportData.find(item => item.witel === 'GRAND TOTAL');

        if (grandTotalRow) {
            // Kalkulasi total Est BC untuk grup <3 Bulan
            const totalEstBClt3bln = (grandTotalRow.est_bc_provide_order_lt_3bln || 0) +
                (grandTotalRow.est_bc_in_process_lt_3bln || 0) +
                (grandTotalRow.est_bc_ready_to_bill_lt_3bln || 0);

            // Kalkulasi total Est BC untuk grup >3 Bulan
            const totalEstBCgt3bln = (grandTotalRow.est_bc_provide_order_gt_3bln || 0) +
                (grandTotalRow.est_bc_in_process_gt_3bln || 0) +
                (grandTotalRow.est_bc_ready_to_bill_gt_3bln || 0);

            // Grand total Est BC adalah jumlah dari keduanya
            const totalEstBC = totalEstBClt3bln + totalEstBCgt3bln;

            return {
                grandTotalOrder: grandTotalRow.grand_total_order || 0,
                totalEstBC: totalEstBC,
                totalLt3bln: grandTotalRow.total_lt_3bln || 0,
                totalGt3bln: grandTotalRow.total_gt_3bln || 0,
                totalEstBClt3bln: totalEstBClt3bln, // <-- Data baru
                totalEstBCgt3bln: totalEstBCgt3bln, // <-- Data baru
            };
        }

        return { grandTotalOrder: 0, totalEstBC: 0, totalLt3bln: 0, totalGt3bln: 0, totalEstBClt3bln: 0, totalEstBCgt3bln: 0 };
    }, [reportData]);

    const handleSaveConfig = () => {
        router.post(route("admin.analysisSOS.saveConfig"), {
            configuration: tableConfig,
            page_name: "analysis_sos"
        }, {
            preserveScroll: true,
        });
    };

    function handleUploadSubmit(e) {
        e.preventDefault();
        postUpload(route("admin.analysisSOS.upload"), {
            onSuccess: () => reset('document'),
        });
    }

    function handlePoUploadSubmit(e) {
        e.preventDefault();
        postPoUpload(route("admin.analysisSOS.uploadPoList"), {
            preserveScroll: true,
        });
    }

    const handlePauseToggle = () => setIsPaused(prev => !prev);

    const handleCancelUpload = () => {
        if (!confirm("Anda yakin ingin membatalkan proses impor ini?")) return;

        const batchId = sessionStorage.getItem('sos_active_batch_id');
        if (batchId) {
            axios.post(route('admin.analysisSOS.import.cancel'), { batch_id: batchId })
                .then(response => {
                    toast.success(response.data.message || "Proses dibatalkan.");
                    if (window.sosJobInterval) clearInterval(window.sosJobInterval);

                    // Membersihkan state secara manual setelah pembatalan
                    setProgress(null);
                    sessionStorage.removeItem('sos_active_batch_id');
                    startTimeRef.current = null;
                    setTimeRemaining(null);
                    setIsPaused(false);
                })
                .catch(error => {
                    toast.error("Gagal membatalkan proses.");
                    console.error(error);
                });
        }
    };

    // Definisi kolom untuk setiap tabel detail
    const provideOrderColumns = useMemo(() => provideOrderColumnsTemplate, []);
    const inProcessColumns = useMemo(() => inProcessColumnsTemplate, []);
    const readyToBillColumns = useMemo(() => readyToBillColumnsTemplate, []);
    const provCompleteColumns = useMemo(() => provCompleteColumnsTemplate, []);

    return (
        <AuthenticatedLayout auth={auth} header="Analysis Datin">
            <Head title="Analysis Datin" />
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
            >
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Kolom Utama */}
                    <div className="lg:col-span-3 space-y-6">
                        <TableConfiguratorSOS
                            tableConfig={tableConfig}        // <-- Gunakan state asli
                            setTableConfig={setTableConfig}  // <-- Gunakan setState asli
                            onSave={handleSaveConfig}
                        />

                        <div className="mb-4">
                            <button onClick={() => setViewMode('AOMO')} className={viewMode === 'AOMO' ? 'font-bold' : ''}>Tampilan AO MO</button>
                            <span className="mx-2">|</span>
                            <button onClick={() => setViewMode('SODORO')} className={viewMode === 'SODORO' ? 'font-bold' : ''}>Tampilan SO DO RO</button>
                        </div>

                        <div className="bg-white p-6 rounded-lg shadow-md">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-semibold text-lg text-gray-800">
                                    Data Report
                                </h3>
                                <a
                                    href={`${route("admin.analysisSOS.export")}?viewMode=${viewMode}`}
                                    className="px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-md hover:bg-green-700 transition-colors"
                                >
                                    Ekspor Excel
                                </a>
                            </div>
                            <SosReportTable data={reportData} tableConfig={tableConfig} viewMode={viewMode} />
                        </div>

                        <div className="bg-white p-6 rounded-lg shadow-md">
                            <div className="flex flex-wrap items-center gap-2 border-b pb-4 mb-4">
                                <DetailTabButton viewName="provide_order" currentView={activeDetailView}>Provide Order</DetailTabButton>
                                <DetailTabButton viewName="in_process" currentView={activeDetailView}>In Process</DetailTabButton>
                                <DetailTabButton viewName="ready_to_bill" currentView={activeDetailView}>Ready to Bill</DetailTabButton>
                                <DetailTabButton viewName="prov_complete" currentView={activeDetailView}>Prov Complete</DetailTabButton>
                                <DetailTabButton viewName="galaksi" currentView={activeDetailView}>Galaksi</DetailTabButton>
                            </div>

                            {activeDetailView === 'provide_order' &&
                                <DetailTable dataPaginator={provideOrderData} columns={provideOrderColumns} />
                            }
                            {activeDetailView === 'in_process' &&
                                <DetailTable dataPaginator={inProcessData} columns={inProcessColumns} />
                            }
                            {activeDetailView === 'ready_to_bill' &&
                                <DetailTable dataPaginator={readyToBillData} columns={readyToBillColumns} />
                            }
                            {activeDetailView === 'prov_complete' &&
                                <DetailTable dataPaginator={provCompleteData} columns={provCompleteColumns} />
                            }
                            {activeDetailView === 'galaksi' &&
                                <div>
                                    <div className="flex justify-between items-center mb-4">
                                        <h4 className="font-semibold text-md text-gray-700">Laporan Galaksi</h4>
                                        <a
                                            href={route("admin.analysisSOS.exportGalaksi")}
                                            className="px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-md hover:bg-green-700 transition-colors"
                                        >
                                            Ekspor Laporan Galaksi
                                        </a>
                                    </div>
                                    {/* [PERUBAHAN] Gunakan komponen baru */}
                                    <GalaksiReportTable galaksiData={galaksiData} />
                                </div>
                            }
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="lg:col-span-1 space-y-6">
                        <DetailsCard totals={detailsTotals} />

                        <div className="bg-white p-6 rounded-lg shadow-md">
                            <h3 className="font-semibold text-lg text-gray-800">Unggah Data Mentah</h3>

                            {/* [PERUBAHAN] Tampilkan form ATAU progress bar */}
                            {!isProcessing ? (
                                <>
                                    <p className="text-gray-500 mt-1 text-sm">Unggah file Excel (xlsx, xls, csv) untuk memperbarui data.</p>
                                    <form onSubmit={handleUploadSubmit} className="mt-4 space-y-4">
                                        <div>
                                            <input
                                                type="file"
                                                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                                onChange={(e) => setUploadData("document", e.target.files[0])}
                                                disabled={processing}
                                            />
                                            <InputError message={errors.document} className="mt-2" />
                                        </div>
                                        <button
                                            type="submit"
                                            disabled={processing}
                                            className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 disabled:bg-blue-400"
                                        >
                                            {processing ? "Mengunggah..." : "Unggah Dokumen"}
                                        </button>
                                    </form>
                                </>
                            ) : (
                                <div className="mt-4 space-y-4">
                                    <ProgressBar
                                        progress={progress}
                                        text={`Memproses file...`}
                                    />
                                    {timeRemaining && (
                                        <p className="text-sm text-gray-600 animate-pulse">
                                            Perkiraan waktu selesai: <strong>{timeRemaining}</strong>
                                        </p>
                                    )}
                                    <div className="flex items-center gap-4 mt-2">
                                        <button
                                            type="button"
                                            onClick={handlePauseToggle}
                                            className={`w-1/2 px-4 py-2 text-sm font-semibold rounded-md text-white transition-colors ${isPaused
                                                ? "bg-green-500 hover:bg-green-600"
                                                : "bg-yellow-500 hover:bg-yellow-600"
                                                }`}
                                        >
                                            {isPaused ? "Lanjutkan" : "Jeda"}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleCancelUpload}
                                            className="w-1/2 px-4 py-2 text-sm bg-red-600 text-white font-semibold rounded-md hover:bg-red-700 transition-colors"
                                        >
                                            Batalkan
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="bg-white p-6 rounded-lg shadow-md">
                            {/* Header dan Tombol Toggle */}
                            <div
                                className="flex justify-between items-center cursor-pointer"
                                onClick={() => setIsPoFormVisible(!isPoFormVisible)}
                            >
                                <h3 className="font-semibold text-lg text-gray-800">Master Data PO</h3>
                                <button className="text-blue-600 hover:text-blue-800 text-sm font-semibold flex items-center gap-2">
                                    {isPoFormVisible ? 'Tutup' : 'Tambah PO'}
                                    {/* Icon panah sederhana */}
                                    <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 transition-transform ${isPoFormVisible ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>
                            </div>

                            {/* Konten Collapsible */}
                            {isPoFormVisible && (
                                <div className="mt-6 pt-6 border-t animate-fade-in-down">
                                    {/* --- Form Upload File --- */}
                                    <h4 className="font-semibold text-md text-gray-800">Unggah File PO</h4>
                                    <p className="text-gray-500 mt-1 mb-4 text-sm">Perbarui master data PO melalui file Excel.</p>
                                    <form onSubmit={handlePoUploadSubmit} className="space-y-4">
                                        <div>
                                            <input
                                                type="file"
                                                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                                                onChange={(e) => setPoUploadData("po_document", e.target.files[0])}
                                                disabled={processingPo || poProgress !== null}
                                            />
                                            <InputError message={errorsPo.po_document} className="mt-2" />
                                        </div>

                                        {poProgress !== null && (
                                            <ProgressBar progress={poProgress} text="Memperbarui Daftar PO..." />
                                        )}

                                        <button
                                            type="submit"
                                            disabled={processingPo || poProgress !== null}
                                            className="px-4 py-2 bg-green-600 text-white font-semibold rounded-md hover:bg-green-700 disabled:bg-green-400"
                                        >
                                            {poProgress !== null ? 'Memproses...' : (processingPo ? "Mengunggah..." : "Unggah Daftar PO")}
                                        </button>
                                    </form>
                                    {/* --- Akhir Form Upload File --- */}

                                    <hr className="my-6 border-dashed" />

                                    {/* --- Form Manual --- */}
                                    <h4 className="font-semibold text-md text-gray-800 mb-3">Tambah/Update PO Manual</h4>
                                    <form onSubmit={handleManualPoSubmit} className="space-y-4">
                                        <div>
                                            <InputLabel htmlFor="po" value="Nama PO" />
                                            <TextInput id="po" value={manualPoData.po} className="mt-1 block w-full" onChange={(e) => setManualPoData('po', e.target.value)} required />
                                            <InputError message={errorsManualPo.po} className="mt-2" />
                                        </div>
                                        <div>
                                            <InputLabel htmlFor="nipnas" value="NIPNAS" />
                                            <TextInput id="nipnas" value={manualPoData.nipnas} className="mt-1 block w-full" onChange={(e) => setManualPoData('nipnas', e.target.value)} required />
                                            <InputError message={errorsManualPo.nipnas} className="mt-2" />
                                        </div>
                                        <div>
                                            <InputLabel htmlFor="segment" value="Segment" />
                                            <TextInput id="segment" value={manualPoData.segment} className="mt-1 block w-full" onChange={(e) => setManualPoData('segment', e.target.value)} />
                                            <InputError message={errorsManualPo.segment} className="mt-2" />
                                        </div>
                                        <div>
                                            <InputLabel htmlFor="bill_city" value="Bill City" />
                                            <TextInput id="bill_city" value={manualPoData.bill_city} className="mt-1 block w-full" onChange={(e) => setManualPoData('bill_city', e.target.value)} />
                                            <InputError message={errorsManualPo.bill_city} className="mt-2" />
                                        </div>
                                        <div>
                                            <InputLabel htmlFor="witel" value="Witel" />
                                            <TextInput id="witel" value={manualPoData.witel} className="mt-1 block w-full" onChange={(e) => setManualPoData('witel', e.target.value)} />
                                            <InputError message={errorsManualPo.witel} className="mt-2" />
                                        </div>
                                        <div className="flex items-center justify-end">
                                            <PrimaryButton className="ms-4" disabled={processingManualPo}>
                                                {processingManualPo ? 'Menyimpan...' : 'Simpan Data PO'}
                                            </PrimaryButton>
                                        </div>
                                    </form>
                                    {/* --- Akhir Form Manual --- */}
                                </div>
                            )}

                            <hr className="my-6" />
                            <ListPoPreviewTable dataPaginator={listPoData} />
                        </div>

                        <CustomTargetFormSOS
                            tableConfig={tableConfig}
                            witelList={witelList}
                            initialData={customTargets}
                            period={period}
                        />
                    </div>
                </div>
            </DndContext>
        </AuthenticatedLayout>
    );
}
