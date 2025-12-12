import React, { useEffect, useMemo, useRef, useState } from "react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Head, useForm, usePage, router, Link } from "@inertiajs/react";
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import InputError from "@/Components/InputError";
import PrimaryButton from "@/Components/PrimaryButton";
import TableConfiguratorSOS from '@/Components/TableConfiguratorSOS';
import CustomTargetFormSOS from '@/Components/CustomTargetFormSOS';
import axios from "axios";
import toast from "react-hot-toast";
import DetailTable from "@/Components/Sos/DetailTable";
import GalaksiReportTable from '@/Components/Sos/GalaksiReportTable';
import ListPoPreviewTable from '@/Components/Sos/ListPoPreviewTable';
import UnmappedPoList from '@/Components/Sos/UnmappedPoList';
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
import {
    provideOrderColumnsTemplate,
    inProcessColumnsTemplate,
    readyToBillColumnsTemplate,
    provCompleteColumnsTemplate,
} from "@/config/tableConfigTemplates";
// [TAMBAHKAN] Impor SweetAlert seperti di file DP
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';

// ===================================================================
// Konfigurasi Awal
// ===================================================================

const MySwal = withReactContent(Swal); // [TAMBAHKAN]

export const sosTableConfigTemplateAOMO = [ // BIRU
    { key: 'witel', title: 'WITEL', type: 'fixed', visible: true, configurable: false },
    {
        groupTitle: "<3BLN",
        groupClass: "bg-blue-400 text-white",
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
        groupClass: "bg-red-800 text-white",
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
            {text} {Math.round(progress)}% {/* [PERBAIKAN] Membulatkan progres */}
        </p>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
            ></div>
        </div>
    </div>
);

// ===================================================================
// Komponen Helper & UI
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

const DetailTabButton = ({ viewName, currentView, children }) => {
    const { filters } = usePage().props;
    const newParams = { ...filters, tab: viewName };
    delete newParams.page;
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

const DetailsCard = ({ totals }) => (
    <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="font-semibold text-lg text-gray-800 mb-4">Details</h3>
        <div className="space-y-2 text-sm">
            <div className="flex justify-between">
                <span>Grand Total Order</span>
                <span className="font-bold">{totals.grandTotalOrder.toLocaleString('id-ID')}</span>
            </div>
            <div className="flex justify-between">
                <span>Total Est BC (JT)</span>
                <span className="font-bold">{totals.totalEstBC.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
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

const SosReportTable = ({ data, tableConfig, viewMode }) => {
    // ... (Logika SosReportTable tidak berubah) ...
    const renderCell = (item, column) => {
        const value = item[column.key] ?? 0;
        if (column.type === 'currency') {
            return parseFloat(value).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        }
        return Number(value).toLocaleString('id-ID');
    };
    const isAOMOMode = viewMode === 'AOMO';
    const headerThemeClass = isAOMOMode ? 'bg-blue-800 text-white' : 'bg-red-800 text-white';
    const grandTotalRowClass = isAOMOMode ? 'bg-blue-800 text-white' : 'bg-red-800 text-white';
    const segmentTotalRowClass = isAOMOMode ? 'bg-blue-900 font-bold text-white' : 'bg-red-900 font-bold text-white';
    return (
        <div className="w-full">
            <table className="min-w-full w-full table-fixed divide-y divide-gray-200 border">
                {/* PERUBAHAN 1: Atur font dasar header lebih kecil (10px) dan line-height rapat */}
                <thead className="bg-gray-50 text-gray-600 uppercase text-[10px] sm:text-[11px] leading-tight">
                    <tr>
                        {/* Header WITEL */}
                        <th rowSpan="2" className={`py-2 px-1 border text-left left-0 z-20 font-bold whitespace-normal break-words ${headerThemeClass}`}>
                            WITEL
                        </th>

                        {/* Header Group (misal: <3BLN, >3BLN) */}
                        <SortableContext items={tableConfig.filter(item => item.key !== 'witel').map(item => item.groupTitle || item.key)} strategy={horizontalListSortingStrategy}>
                            {tableConfig.map((item) => {
                                if (item.type === 'fixed') return null;
                                return (
                                    <SortableHeaderCell key={item.groupTitle || item.key} item={item}>
                                        <span className="whitespace-normal break-words block text-center font-bold">
                                            {item.groupTitle || item.title}
                                        </span>
                                    </SortableHeaderCell>
                                );
                            })}
                        </SortableContext>
                    </tr>

                    {/* Sub-Header Kolom (misal: PROV ORDER, EST BC) */}
                    <tr>
                        {tableConfig.map((item) => {
                            if (!item.groupTitle) return null;
                            return (
                                <SortableContext key={`${item.groupTitle}-subcolumns`} items={item.columns.map(col => col.key)} strategy={horizontalListSortingStrategy}>
                                    {item.columns.map((col) =>
                                        col.visible ? (
                                            <SortableSubHeaderCell key={col.key} id={col.key} column={col} parent={item}>
                                                {/* PERUBAHAN 2: Padding dikurangi (py-1 px-1) agar muat */}
                                                <div className="py-1 px-1 text-center whitespace-normal break-words">
                                                    {col.title}
                                                </div>
                                            </SortableSubHeaderCell>
                                        ) : null
                                    )}
                                </SortableContext>
                            );
                        })}
                    </tr>
                </thead>

                {/* PERUBAHAN 3: Body font disesuaikan agar seimbang dengan header */}
                <tbody className="text-gray-700 text-[12px] sm:text-xs">
                    {data.map((item, rowIndex) => {
                        if (item.isTotal) {
                            const isGrandTotal = item.witel === 'GRAND TOTAL';
                            const segmentTotalNames = ['SME', 'GOV', 'PRIVATE', 'SOE'];
                            const isSegmentTotal = segmentTotalNames.includes(item.witel);
                            let rowClass = '';
                            if (isGrandTotal) {
                                rowClass = grandTotalRowClass;
                            } else if (isSegmentTotal) {
                                rowClass = segmentTotalRowClass;
                            } else {
                                rowClass = 'bg-gray-200 font-bold';
                            }
                            return (
                                <tr key={rowIndex} className={rowClass}>
                                    <td className={`py-1 px-1 border text-left left-0 z-10 font-bold whitespace-normal break-words ${rowClass}`}>
                                        {item.witel}
                                    </td>
                                    {tableConfig.slice(1).flatMap(config => {
                                        if (config.columns) {
                                            return config.columns.map(col => (
                                                <td key={`${item.witel}-${col.key}`} className="py-1 px-1 border text-center whitespace-normal break-words">
                                                    {renderCell(item, col)}
                                                </td>
                                            ));
                                        } else if (config.key) {
                                            return (
                                                <td key={`${item.witel}-${config.key}`} className="py-1 px-1 border text-center whitespace-normal break-words">
                                                    {renderCell(item, config)}
                                                </td>
                                            );
                                        }
                                        return [];
                                    })}
                                </tr>
                            );
                        }
                        return (
                            <tr key={rowIndex} className="border-b hover:bg-gray-50">
                                <td className="py-2 px-1 border text-left left-0 z-10 bg-white whitespace-normal break-words font-medium">
                                    {item.witel}
                                </td>
                                {tableConfig.slice(1).flatMap(configItem => {
                                    if (configItem.columns) {
                                        return configItem.columns.map(col =>
                                            col.visible ? (
                                                <td key={`${item.witel}-${col.key}`} className="py-2 px-1 border text-center whitespace-normal break-words">
                                                    {renderCell(item, col)}
                                                </td>
                                            ) : null
                                        );
                                    }
                                    if (configItem.key) {
                                        return (
                                            <td key={`${item.witel}-${configItem.key}`} className="py-2 px-1 border text-center whitespace-normal break-words">
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
    reportDataAomo = [],
    reportDataSodoro = [],
    provideOrderData = { data: [], links: [] },
    inProcessData = { data: [], links: [] },
    readyToBillData = { data: [], links: [] },
    provCompleteData = { data: [], links: [] },
    unmappedPoData = { data: [], links: [] },
    poListOptions = [],
    galaksiData = [],
    listPoData = { data: [], links: [] },
    savedConfigAomo,
    savedConfigSodoro,
    flash = {},
    customTargets,
    period,
}) {
    const { props } = usePage();
    const { filters = {} } = props;
    const [viewMode, setViewMode] = useState('AOMO');
    const activeDetailView = filters.tab || 'provide_order';

    const isInitialMount = useRef(true);

    const [queueProgress, setQueueProgress] = useState(null);
    const [isPaused, setIsPaused] = useState(false);
    const [timeRemaining, setTimeRemaining] = useState(null);
    const startTimeRef = useRef(null);
    const isQueueProcessing = queueProgress !== null && queueProgress < 100;

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
        po: '', nipnas: '', segment: '', bill_city: '', witel: '',
    });

    function handleManualPoSubmit(e) {
        e.preventDefault();
        postManualPo(route("admin.analysisSOS.addPo"), {
            preserveScroll: true,
            onSuccess: () => {
                resetManualPo();
            },
        });
    }

    useEffect(() => {
        if (flash.success) toast.success(flash.success);
        if (flash.error) toast.error(flash.error);
    }, [flash]);

    const [tableConfig, setTableConfig] = useState(
        viewMode === 'AOMO'
            ? (savedConfigAomo || sosTableConfigTemplateAOMO)
            : (savedConfigSodoro || sosTableConfigTemplateSODORO)
    );

    useEffect(() => {
        if (viewMode === 'AOMO') {
            setTableConfig(savedConfigAomo && savedConfigAomo.length > 0 ? savedConfigAomo : sosTableConfigTemplateAOMO);
        } else {
            // viewMode === 'SODORO'
            setTableConfig(savedConfigSodoro && savedConfigSodoro.length > 0 ? savedConfigSodoro : sosTableConfigTemplateSODORO);
        }
    }, [viewMode, savedConfigAomo, savedConfigSodoro]);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event) => {
        // ... (Logika handleDragEnd tidak berubah) ...
        const { active, over } = event;
        if (!over || active.id === over.id) { return; }
        const isTopLevelActive = tableConfig.some(item => (item.groupTitle || item.key) === active.id);
        const isTopLevelOver = tableConfig.some(item => (item.groupTitle || item.key) === over.id);
        if (isTopLevelActive && isTopLevelOver) {
            setTableConfig((items) => {
                const fixedColumns = items.filter(item => item.type === 'fixed');
                const sortableItems = items.filter(item => item.type !== 'fixed');
                const oldIndex = sortableItems.findIndex(item => (item.groupTitle || item.key) === active.id);
                const newIndex = sortableItems.findIndex(item => (item.groupTitle || item.key) === over.id);
                const reorderedSortableItems = arrayMove(sortableItems, oldIndex, newIndex);
                const finalConfig = [...tableConfig];
                let sortableIndex = 0;
                for (let i = 0; i < finalConfig.length; i++) {
                    if (finalConfig[i].type !== 'fixed') {
                        finalConfig[i] = reorderedSortableItems[sortableIndex++];
                    }
                }
                return finalConfig;
            });
        }
        else {
            let activeGroup = null;
            let overGroup = null;
            let activeKey = active.id;
            let overKey = over.id;
            for (const group of tableConfig) {
                if (group.columns?.some(col => col.key === activeKey)) { activeGroup = group; }
                if (group.columns?.some(col => col.key === overKey)) { overGroup = group; }
                if (activeGroup && overGroup) break;
            }
            if (activeGroup && overGroup && activeGroup.groupTitle === overGroup.groupTitle) {
                setTableConfig(currentConfig => {
                    const newConfig = JSON.parse(JSON.stringify(currentConfig));
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
            else { console.warn("Drag and drop sub-columns between different groups is not supported yet."); }
        }
        // ... (Akhir logika handleDragEnd)
    };

    const [poProgress, setPoProgress] = useState(null);

    const { data: uploadData, setData: setUploadData, post: postUpload, processing: processingUpload, errors, reset, progress: uploadProgress } = useForm({
        file: null, // <-- Sudah benar 'file'
    });

    const { data: poUploadData, setData: setPoUploadData, post: postPoUpload, processing: processingPo, errors: errorsPo, reset: resetPo } = useForm({
        po_document: null,
    });

    // =========================================================================
    // [PERBAIKAN UTAMA] Logika Polling meniru AnalysisDigitalProduct.jsx
    // =========================================================================
    useEffect(() => {
        // [1] Baca batch_id dari URL (bukan flash message)
        const urlParams = new URLSearchParams(window.location.search);
        let batchId = urlParams.get("batch_id") || sessionStorage.getItem('sos_active_batch_id');

        // [2] Fungsi cleanup
        const cleanup = () => {
            if (window.sosJobInterval) clearInterval(window.sosJobInterval);
            window.sosJobInterval = null;
            setQueueProgress(null);
            sessionStorage.removeItem('sos_active_batch_id');
            startTimeRef.current = null;
            setTimeRemaining(null);
            setIsPaused(false);

            // Hapus 'batch_id' dari URL
            if (urlParams.has("batch_id")) {
                const currentUrl = new URL(window.location.href);
                currentUrl.searchParams.delete("batch_id");
                window.history.replaceState({}, document.title, currentUrl.toString());
            }
        };

        // [3] Jika batchId ditemukan di URL
        if (batchId) {
            sessionStorage.setItem('sos_active_batch_id', batchId);

            if (queueProgress === null) {
                setQueueProgress(0); // Mulai progress bar
            }

            if (window.sosJobInterval) clearInterval(window.sosJobInterval);

            // [4] Mulai Polling
            window.sosJobInterval = setInterval(() => {
                if (isPaused) return; // Jika dijeda, lewati

                // Gunakan route 'import.progress' yang sudah benar
                axios.get(route("import.progress", { batchId }))
                    .then(response => {
                        const newProgress = response.data.progress ?? 0;
                        const status = response.data.status ?? 'processing';

                        // Handle GAGAL
                        if (status === 'failed' || newProgress === -1) {
                            toast.error("Proses impor gagal di server.");
                            cleanup();
                            return;
                        }

                        setQueueProgress(newProgress); // Update state progress bar

                        // Logika Estimasi Waktu (meniru DP)
                        if (newProgress > 1 && newProgress < 100) {
                            if (!startTimeRef.current) {
                                startTimeRef.current = Date.now();
                            }
                            const elapsedTime = (Date.now() - startTimeRef.current) / 1000;
                            const progressMade = newProgress - 1;
                            if (progressMade > 0 && elapsedTime > 0) {
                                const speed = progressMade / elapsedTime; // persen per detik
                                const remainingPercentage = 100 - newProgress;
                                const remainingTimeInSeconds = remainingPercentage / speed;

                                if (remainingTimeInSeconds > 0 && isFinite(remainingTimeInSeconds)) {
                                    const minutes = Math.floor(remainingTimeInSeconds / 60);
                                    const seconds = Math.floor(remainingTimeInSeconds % 60);
                                    setTimeRemaining(`${minutes} menit ${seconds} detik`);
                                }
                            }
                        } else {
                            setTimeRemaining(null);
                        }

                        // Handle Selesai (100%)
                        if (newProgress >= 100 || status === 'completed') {
                            cleanup();
                            setTimeout(() => {
                                toast.success("Proses impor data SOS selesai!");
                                // [PENTING] Inilah refresh otomatis Anda
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

    // [PERBAIKAN DEPENDENSI] Ini adalah kunci utamanya.
    // Kita memantau URL (seperti DP) dan status Jeda.
    }, [usePage().props.url, isPaused]);
    // =========================================================================
    // [AKHIR PERBAIKAN UTAMA]
    // =========================================================================

    // Handle job progress PO List (tidak berubah)
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const poBatchId = urlParams.get("po_batch_id");
        if (poBatchId && poProgress === null) {
            setPoProgress(0);
            toast.loading('Memproses file Daftar PO...', { id: 'po-import-toast' });
            const interval = setInterval(() => {
                axios.get(route("import.progress", { batchId: poBatchId })) // <-- Ini juga menggunakan route 'import.progress'
                    .then(response => {
                        const newProgress = response.data.progress ?? 0;
                        setPoProgress(newProgress);
                        if (newProgress >= 100 || response.data.status === 'completed') {
                            clearInterval(interval);
                            toast.success('Daftar PO berhasil diperbarui!', { id: 'po-import-toast' });
                            setTimeout(() => {
                                setPoProgress(null);
                                const currentUrl = new URL(window.location.href);
                                currentUrl.searchParams.delete("po_batch_id");
                                window.history.replaceState({}, '', currentUrl);
                                router.reload({
                                    only: ['listPoData'],
                                    preserveScroll: true,
                                    preserveState: true,
                                });
                            }, 1500);
                        } else if (newProgress === -1 || response.data.status === 'failed') {
                             clearInterval(interval);
                             setPoProgress(null);
                             toast.error('Gagal memproses file PO.', { id: 'po-import-toast' });
                        }
                    })
                    .catch(error => {
                        console.error("Gagal mengambil progres job PO:", error);
                        clearInterval(interval);
                        setPoProgress(null);
                        toast.error('Gagal memproses file PO.', { id: 'po-import-toast' });
                    });
            }, 2000);
            return () => clearInterval(interval);
        }
    }, [usePage().props.url]); // [PERBAIKAN] Pantau URL di sini juga

    const currentReportData = viewMode === 'AOMO' ? reportDataAomo : reportDataSodoro;

    const detailsTotals = useMemo(() => {
        // ... (Logika detailsTotals tidak berubah) ...
        if (!currentReportData || currentReportData.length === 0) {
            return { grandTotalOrder: 0, totalEstBC: 0, totalLt3bln: 0, totalGt3bln: 0, totalEstBClt3bln: 0, totalEstBCgt3bln: 0 };
        }
        const grandTotalRow = currentReportData.find(item => item.witel === 'GRAND TOTAL');
        if (grandTotalRow) {
            const totalEstBClt3bln = (grandTotalRow.est_bc_provide_order_lt_3bln || 0) + (grandTotalRow.est_bc_in_process_lt_3bln || 0) + (grandTotalRow.est_bc_ready_to_bill_lt_3bln || 0);
            const totalEstBCgt3bln = (grandTotalRow.est_bc_provide_order_gt_3bln || 0) + (grandTotalRow.est_bc_in_process_gt_3bln || 0) + (grandTotalRow.est_bc_ready_to_bill_gt_3bln || 0);
            const totalEstBC = totalEstBClt3bln + totalEstBCgt3bln;
            return {
                grandTotalOrder: grandTotalRow.grand_total_order || 0,
                totalEstBC: totalEstBC,
                totalLt3bln: grandTotalRow.total_lt_3bln || 0,
                totalGt3bln: grandTotalRow.total_gt_3bln || 0,
                totalEstBClt3bln: totalEstBClt3bln,
                totalEstBCgt3bln: totalEstBCgt3bln,
            };
        }
        return { grandTotalOrder: 0, totalEstBC: 0, totalLt3bln: 0, totalGt3bln: 0, totalEstBClt3bln: 0, totalEstBCgt3bln: 0 };
    }, [currentReportData]);

    const handleSaveConfig = () => {
        const configPageName = viewMode === 'AOMO' ? 'analysis_sos_aomo' : 'analysis_sos_sodoro';

        router.post(route("admin.analysisSOS.saveConfig"), {
            configuration: tableConfig,
            page_name: configPageName
        }, {
            preserveScroll: true,
        });
    };

    function handleUploadSubmit(e) {
        e.preventDefault();
        // [PERBAIKAN] Kirim query params saat ini agar 'tab' tidak hilang
        postUpload(route("admin.analysisSOS.upload", { ...filters }));
    }

    function handlePoUploadSubmit(e) {
        e.preventDefault();
        postPoUpload(route("admin.analysisSOS.uploadPoList"), {
            preserveScroll: true,
        });
    }

    const handlePauseToggle = () => setIsPaused(prev => !prev);

    // =========================================================================
    // [PERBAIKAN UTAMA] Mengganti `handleCancelUpload` (meniru DP)
    // =========================================================================
    const handleCancelUpload = async () => {
        const batchId = sessionStorage.getItem('sos_active_batch_id'); // Gunakan key session SOS
        if (!batchId) {
            toast.error("Tidak ada proses yang sedang berjalan.");
            return;
        }

        const result = await MySwal.fire({
            title: 'Anda Yakin?',
            text: "Anda akan membatalkan proses unggah dan olah data ini.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Ya, Batalkan!',
            cancelButtonText: 'Lanjutkan Proses'
        });

        if (result.isConfirmed) {
            // [PERBAIKAN] Gunakan axios.post agar bisa di-then
            // router.post tidak memiliki callback 'onSuccess' yang andal untuk ini
            const cancelToast = toast.loading("Membatalkan proses...");
            axios.post(route('admin.analysisSOS.import.cancel'), { batch_id: batchId })
                .then(response => {
                    toast.success(response.data.message || "Proses dibatalkan.", { id: cancelToast });
                    if (window.sosJobInterval) clearInterval(window.sosJobInterval);
                    setQueueProgress(null);
                    sessionStorage.removeItem('sos_active_batch_id');
                    setTimeRemaining(null);
                    setIsPaused(false);
                })
                .catch(error => {
                    toast.error("Gagal membatalkan proses.", { id: cancelToast });
                    console.error(error);
                });
        }
    };

    // Definisi kolom (tidak berubah)
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
                    <div className="lg:col-span-4 space-y-6">
                        <DetailsCard totals={detailsTotals} />

                        <div className="bg-white p-6 rounded-lg shadow-md">
                            <h3 className="font-semibold text-lg text-gray-800">Unggah Data Mentah</h3>

                            {/* [PERBAIKAN] Logika tampilan progres bar meniru DP */}

                            {/* TAHAP 1: Progress UPLOAD (dari form) */}
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

                            {/* TAHAP 2: Progress QUEUE (dari useEffect) */}
                            {!processingUpload && isQueueProcessing && (
                                <div className="mt-4 space-y-4">
                                    <ProgressBar
                                        progress={queueProgress}
                                        text={`Memproses file di server...`}
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

                            {/* TAHAP 3: Form UPLOAD (Idle) */}
                            {!processingUpload && !isQueueProcessing && (
                                <>
                                    <p className="text-gray-500 mt-1 text-sm">Unggah file (.xlsx, .xls, .csv, atau .zip dari CSV).</p>
                                    <form onSubmit={handleUploadSubmit} className="mt-4 space-y-4">
                                        <div>
                                            <input
                                                type="file"
                                                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                                onChange={(e) => setUploadData("file", e.target.files[0])}
                                                disabled={processingUpload}
                                                accept=".xlsx,.xls,.csv,.zip,application/zip"
                                            />
                                            <InputError message={errors.file} className="mt-2" />
                                        </div>
                                        <button
                                            type="submit"
                                            disabled={processingUpload}
                                            className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 disabled:bg-blue-400"
                                        >
                                            Unggah Dokumen
                                        </button>
                                    </form>
                                </>
                            )}
                        </div>

                        <div className="bg-white p-6 rounded-lg shadow-md">
                            {/* ... (Form Master Data PO tidak berubah) ... */}
                            <div
                                className="flex justify-between items-center cursor-pointer"
                                onClick={() => setIsPoFormVisible(!isPoFormVisible)}
                            >
                                <h3 className="font-semibold text-lg text-gray-800">Master Data PO</h3>
                                <button className="text-blue-600 hover:text-blue-800 text-sm font-semibold flex items-center gap-2">
                                    {isPoFormVisible ? 'Tutup' : 'Tambah PO'}
                                    <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 transition-transform ${isPoFormVisible ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>
                            </div>

                            {isPoFormVisible && (
                                <div className="mt-6 pt-6 border-t animate-fade-in-down">
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
                                    <hr className="my-6 border-dashed" />
                                </div>
                            )}
                            <hr className="my-6" />
                            <ListPoPreviewTable dataPaginator={listPoData} />
                        </div>

                        <div className="bg-white p-6 rounded-lg shadow-md mt-6">
                            <h3 className="font-semibold text-lg text-gray-800 mb-4">
                                Daftar PO Belum di Mapping
                            </h3>
                            <p className="text-sm text-gray-600 mb-4">
                                Berikut adalah daftar order yang belum memiliki PO Name, namun berasal dari 5 Witel utama. Anda dapat mengedit PO Name secara manual.
                            </p>
                            <UnmappedPoList
                                dataPaginator={unmappedPoData}
                                poOptions={poListOptions} // <--- [2] Oper ke Child Component
                            />
                        </div>

                        <CustomTargetFormSOS
                            tableConfig={tableConfig}
                            witelList={witelList}
                            initialData={customTargets}
                            period={period}
                        />
                        <TableConfiguratorSOS
                            tableConfig={tableConfig}
                            setTableConfig={setTableConfig}
                            onSave={handleSaveConfig}
                            viewMode={viewMode}
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
                            <SosReportTable data={currentReportData} tableConfig={tableConfig} viewMode={viewMode} />
                        </div>

                        <div className="bg-white p-6 rounded-lg shadow-md">
                            <div className="flex flex-wrap items-center gap-2 border-b pb-4 mb-4">
                                <DetailTabButton viewName="provide_order" currentView={activeDetailView}>Provide Order</DetailTabButton>
                                <DetailTabButton viewName="in_process" currentView={activeDetailView}>In Process</DetailTabButton>
                                <DetailTabButton viewName="ready_to_bill" currentView={activeDetailView}>Ready to Bill</DetailTabButton>
                                <DetailTabButton viewName="prov_complete" currentView={activeDetailView}>Prov Complete</DetailTabButton>
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
                        </div>

                        <div className="bg-white p-6 rounded-lg shadow-md mt-6">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-semibold text-lg text-gray-800">
                                    Laporan Galaksi
                                </h3>
                                <a
                                    href={route("admin.analysisSOS.exportGalaksi")}
                                    className="px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-md hover:bg-green-700 transition-colors"
                                >
                                    Ekspor Laporan Galaksi
                                </a>
                            </div>
                            <GalaksiReportTable galaksiData={galaksiData} />
                        </div>
                    </div>
                </div>
            </DndContext>
        </AuthenticatedLayout>
    );
}
