import React, { useEffect, useMemo, useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, usePage, router } from '@inertiajs/react';
import InputLabel from '@/Components/InputLabel';
import InputError from '@/Components/InputError';
import PrimaryButton from '@/Components/PrimaryButton';
import axios from 'axios';
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
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// ===================================================================
// ... (Semua komponen kecil seperti CollapsibleCard, DetailsCard, SmeReportTable, dll. tetap sama)
// ... (Saya tidak akan menampilkannya lagi di sini agar ringkas)
// ===================================================================
const CollapsibleCard = ({ title, isExpanded, onToggle, children }) => {
    return (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div
                className="flex justify-between items-center p-4 cursor-pointer bg-gray-50 hover:bg-gray-100"
                onClick={onToggle}
            >
                <h3 className="font-semibold text-gray-700">{title}</h3>
                <svg className={`w-5 h-5 text-gray-500 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </div>
            {isExpanded && (
                <div className="p-6 space-y-6 border-t border-gray-200">
                    {children}
                </div>
            )}
        </div>
    );
};

const DetailsCard = ({ totals, segment, period }) => (
    <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="font-semibold text-lg text-gray-800 mb-4">Details</h3>
        <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span>Total</span><span>{totals.total}</span></div>
            <div className="flex justify-between"><span>OGP</span><span>{totals.ogp}</span></div>
            <div className="flex justify-between"><span>Closed</span><span>{totals.closed}</span></div>
            <div className="flex justify-between"><span>Segment</span><span className="font-bold">{segment}</span></div>
            <div className="flex justify-between"><span>Period</span><span className="font-bold">{period}</span></div>
        </div>
    </div>
);

const EditReportForm = ({ currentSegment, reportData, period }) => {
    const [isExpanded, setIsExpanded] = useState(true);

    const witelList = useMemo(() => {
        if (!Array.isArray(reportData)) return [];
        return Array.from(new Set(reportData.map(item => item.nama_witel)));
    }, [reportData]);

    // useForm sekarang bersih dan hanya berisi data yang relevan untuk form ini
    const { data, setData, post, processing, errors } = useForm({
        targets: {},
        segment: currentSegment,
        period: period + '-01',
    });

    // Fungsi submitStatusFile yang tidak relevan sudah dihapus.

    useEffect(() => {
        const initialTargets = {};
        reportData.forEach(item => {
            initialTargets[item.nama_witel] = {
                prov_comp: {
                    n: item.prov_comp_n_target || 0,
                    o: item.prov_comp_o_target || 0,
                    ae: item.prov_comp_ae_target || 0,
                    ps: item.prov_comp_ps_target || 0,
                },
                revenue: {
                    n: item.revenue_n_target || 0,
                    o: item.revenue_o_target || 0,
                    ae: item.revenue_ae_target || 0,
                    ps: item.revenue_ps_target || 0,
                }
            };
        });
        setData(currentData => ({ ...currentData, targets: initialTargets }));
    }, [reportData]);

    useEffect(() => {
        setData(currentData => ({ ...currentData, segment: currentSegment, period: period + '-01' }));
    }, [currentSegment, period]);

    // Fungsi untuk mengirim data form target (sudah benar)
    function submit(e) {
        e.preventDefault();
        post(route('analysisDigitalProduct.targets'), {
            preserveScroll: true,
        });
    }

    // Fungsi untuk menangani input user di form (sudah benar)
    const handleInputChange = (witel, metric, product, value) => {
        setData('targets', {
            ...data.targets,
            [witel]: {
                ...data.targets[witel],
                [metric]: {
                    ...data.targets[witel]?.[metric],
                    [product]: value,
                }
            }
        });
    };

    // Bagian return sudah benar, tidak perlu diubah.
    return (
        <form onSubmit={submit} className="bg-white p-6 rounded-lg shadow-md text-sm">
            <div
                className="flex justify-between items-center cursor-pointer mb-4"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <h3 className="font-semibold text-lg text-gray-800">Edit Target</h3>
                <button type="button" className="text-blue-600 text-sm font-bold hover:underline p-2">
                    {isExpanded ? 'Minimize' : 'Expand'}
                </button>
            </div>

            {isExpanded && (
                <div className="mt-4">
                    {currentSegment === 'SME' && (
                        <fieldset className="mb-4 border rounded-md p-3">
                            <legend className="text-base font-semibold px-2">Prov Comp Targets</legend>
                            {witelList.map(witel => (
                                <div key={`${witel}-prov`} className="mb-3">
                                    <h4 className="font-bold text-gray-600">{witel}</h4>
                                    <div className="grid grid-cols-4 gap-2 mt-1">
                                        {['n', 'o', 'ae', 'ps'].map(p => (
                                            <input
                                                key={p}
                                                type="number"
                                                value={data.targets[witel]?.prov_comp?.[p] ?? ''}
                                                onChange={e => handleInputChange(witel, 'prov_comp', p, e.target.value)}
                                                placeholder={p.toUpperCase()}
                                                className="p-1 border rounded w-full"
                                            />
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </fieldset>
                    )}

                    <fieldset className="border rounded-md p-3">
                        <legend className="text-base font-semibold px-2">Revenue Targets (Rp Juta)</legend>
                        {witelList.map(witel => (
                            <div key={`${witel}-rev`} className="mb-3">
                                <h4 className="font-bold text-gray-600">{witel}</h4>
                                <div className="grid grid-cols-4 gap-2 mt-1">
                                    {['n', 'o', 'ae', 'ps'].map(p => (
                                        <input
                                            key={p}
                                            type="number"
                                            step="0.01"
                                            value={data.targets[witel]?.revenue?.[p] ?? ''}
                                            onChange={e => handleInputChange(witel, 'revenue', p, e.target.value)}
                                            placeholder={p.toUpperCase()}
                                            className="p-1 border rounded w-full"
                                        />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </fieldset>

                    <button type="submit" disabled={processing} className="w-full mt-4 px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 disabled:bg-blue-400">
                        {processing ? 'Menyimpan...' : 'Simpan Target'}
                    </button>
                </div>
            )}
        </form>
    );
};

const LegsReportTable = ({ data = [] }) => {
    // Kalkulasi untuk baris GRAND TOTAL
    const totals = data.reduce((acc, item) => {
        acc.in_progress_n += formatNumber(item.in_progress_n);
        acc.in_progress_o += formatNumber(item.in_progress_o);
        acc.in_progress_ae += formatNumber(item.in_progress_ae);
        acc.in_progress_ps += formatNumber(item.in_progress_ps);

        acc.prov_comp_n_realisasi += formatNumber(item.prov_comp_n_realisasi);
        acc.prov_comp_o_realisasi += formatNumber(item.prov_comp_o_realisasi);
        acc.prov_comp_ae_realisasi += formatNumber(item.prov_comp_ae_realisasi);
        acc.prov_comp_ps_realisasi += formatNumber(item.prov_comp_ps_realisasi);

        // Untuk LEGS, Prov Comp tidak memiliki target, jadi kita hitung realisasi saja.
        // Namun, Revenue memiliki target.
        acc.revenue_n_target += formatNumber(item.revenue_n_target);
        acc.revenue_n_ach += formatNumber(item.revenue_n_ach);
        acc.revenue_o_target += formatNumber(item.revenue_o_target);
        acc.revenue_o_ach += formatNumber(item.revenue_o_ach);
        acc.revenue_ae_target += formatNumber(item.revenue_ae_target);
        acc.revenue_ae_ach += formatNumber(item.revenue_ae_ach);
        acc.revenue_ps_target += formatNumber(item.revenue_ps_target);
        acc.revenue_ps_ach += formatNumber(item.revenue_ps_ach);

        return acc;
    }, {
        in_progress_n: 0, in_progress_o: 0, in_progress_ae: 0, in_progress_ps: 0,
        prov_comp_n_realisasi: 0, prov_comp_o_realisasi: 0, prov_comp_ae_realisasi: 0, prov_comp_ps_realisasi: 0,
        revenue_n_target: 0, revenue_n_ach: 0, revenue_o_target: 0, revenue_o_ach: 0,
        revenue_ae_target: 0, revenue_ae_ach: 0, revenue_ps_target: 0, revenue_ps_ach: 0,
    });

    const grandTotalRealisasi = totals.in_progress_n + totals.in_progress_o + totals.in_progress_ae + totals.in_progress_ps +
        totals.prov_comp_n_realisasi + totals.prov_comp_o_realisasi + totals.prov_comp_ae_realisasi + totals.prov_comp_ps_realisasi;

    return (
        <div className="overflow-x-auto text-xs">
            <table className="w-full border-collapse text-center">
                <thead className="bg-gray-800 text-white">
                    <tr>
                        <th className="border p-2 align-middle" rowSpan="2">WILAYAH TELKOM</th>
                        <th className="border p-2 bg-blue-600" colSpan="4">In Progress</th>
                        <th className="border p-2 bg-orange-600" colSpan="4">Proving Complete</th>
                        <th className="border p-2 bg-green-700" colSpan="8">REVENUE (Rp Juta)</th>
                        <th className="border p-2 bg-gray-600" rowSpan="2">Grand Total</th>
                    </tr>
                    <tr className="font-semibold">
                        {['N', 'O', 'AE', 'PS'].map(cat => <th key={`ip-${cat}`} className="border p-2 bg-blue-500">{cat}</th>)}
                        {['N', 'O', 'AE', 'PS'].map(cat => <th key={`pc-${cat}`} className="border p-2 bg-orange-500">{cat}</th>)}
                        {['N', 'O', 'AE', 'PS'].map(cat => <React.Fragment key={`rev-${cat}`}><th className="border p-1 bg-green-600">T</th><th className="border p-1 bg-green-600">ACH</th></React.Fragment>)}
                    </tr>
                </thead>
                <tbody>
                    {data.length > 0 ? data.map(item => {
                        const rowTotal = formatNumber(item.in_progress_n) + formatNumber(item.in_progress_o) +
                            formatNumber(item.in_progress_ae) + formatNumber(item.in_progress_ps) +
                            formatNumber(item.prov_comp_n_realisasi) + formatNumber(item.prov_comp_o_realisasi) +
                            formatNumber(item.prov_comp_ae_realisasi) + formatNumber(item.prov_comp_ps_realisasi);

                        return (
                            <tr key={item.nama_witel} className="bg-white hover:bg-gray-50">
                                <td className="border p-2 font-semibold text-left text-gray-800">{item.nama_witel}</td>

                                {/* In Progress */}
                                <td className="border p-2">{formatNumber(item.in_progress_n)}</td>
                                <td className="border p-2">{formatNumber(item.in_progress_o)}</td>
                                <td className="border p-2">{formatNumber(item.in_progress_ae)}</td>
                                <td className="border p-2">{formatNumber(item.in_progress_ps)}</td>

                                {/* Proving Complete (hanya realisasi untuk LEGS) */}
                                <td className="border p-2">{formatNumber(item.prov_comp_n_realisasi)}</td>
                                <td className="border p-2">{formatNumber(item.prov_comp_o_realisasi)}</td>
                                <td className="border p-2">{formatNumber(item.prov_comp_ae_realisasi)}</td>
                                <td className="border p-2">{formatNumber(item.prov_comp_ps_realisasi)}</td>

                                {/* Revenue (Target & Achievement) */}
                                <td className="border p-2">{formatRupiah(item.revenue_n_target, decimalPlaces)}</td>
                                <td className="border p-2 font-bold text-green-700 bg-green-50">{formatRupiah(item.revenue_n_ach, decimalPlaces)}</td>
                                <td className="border p-2">{formatRupiah(item.revenue_o_target, decimalPlaces)}</td>
                                <td className="border p-2 font-bold text-green-700 bg-green-50">{formatRupiah(item.revenue_o_ach, decimalPlaces)}</td>
                                <td className="border p-2">{formatRupiah(item.revenue_ae_target, decimalPlaces)}</td>
                                <td className="border p-2 font-bold text-green-700 bg-green-50">{formatRupiah(item.revenue_ae_ach, decimalPlaces)}</td>
                                <td className="border p-2">{formatRupiah(item.revenue_ps_target, decimalPlaces)}</td>
                                <td className="border p-2 font-bold text-green-700 bg-green-50">{formatRupiah(item.revenue_ps_ach, decimalPlaces)}</td>

                                <td className="border p-2 font-bold bg-gray-100">{rowTotal}</td>
                            </tr>
                        );
                    }) : (
                        <tr><td colSpan="21" className="text-center p-4 border text-gray-500">Tidak ada data untuk ditampilkan.</td></tr>
                    )}

                    {/* Baris Grand Total */}
                    <tr className="font-bold text-white">
                        <td className="border p-2 text-left bg-gray-800">GRAND TOTAL</td>
                        <td className="border p-2 bg-blue-600">{totals.in_progress_n}</td>
                        <td className="border p-2 bg-blue-600">{totals.in_progress_o}</td>
                        <td className="border p-2 bg-blue-600">{totals.in_progress_ae}</td>
                        <td className="border p-2 bg-blue-600">{totals.in_progress_ps}</td>

                        <td className="border p-2 bg-orange-600">{totals.prov_comp_n_realisasi}</td>
                        <td className="border p-2 bg-orange-600">{totals.prov_comp_o_realisasi}</td>
                        <td className="border p-2 bg-orange-600">{totals.prov_comp_ae_realisasi}</td>
                        <td className="border p-2 bg-orange-600">{totals.prov_comp_ps_realisasi}</td>

                        <td className="border p-2 bg-green-700">{formatRupiah(totals.revenue_n_target, decimalPlaces)}</td>
                        <td className="border p-2 bg-green-700">{formatRupiah(totals.revenue_n_ach, decimalPlaces)}</td>
                        <td className="border p-2 bg-green-700">{formatRupiah(totals.revenue_o_target, decimalPlaces)}</td>
                        <td className="border p-2 bg-green-700">{formatRupiah(totals.revenue_o_ach, decimalPlaces)}</td>
                        <td className="border p-2 bg-green-700">{formatRupiah(totals.revenue_ae_target, decimalPlaces)}</td>
                        <td className="border p-2 bg-green-700">{formatRupiah(totals.revenue_ae_ach, decimalPlaces)}</td>
                        <td className="border p-2 bg-green-700">{formatRupiah(totals.revenue_ps_target, decimalPlaces)}</td>
                        <td className="border p-2 bg-green-700">{formatRupiah(totals.revenue_ps_ach, decimalPlaces)}</td>

                        <td className="border p-2 bg-gray-600">{grandTotalRealisasi}</td>
                    </tr>
                </tbody>
            </table>
        </div>
    );
};

const formatPercent = (value) => {
    const num = Number(value);
    if (!isFinite(num) || num === 0) return '0.0%';
    return `${num.toFixed(1)}%`;
};

const formatRupiah = (value, decimals = 5) => (Number(value) || 0).toFixed(decimals);
const formatNumber = (value) => Number(value) || 0;

// Komponen untuk membuat header bisa di-drag
const DraggableHeaderCell = ({ group, children, colSpan }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id: group.groupTitle });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <th
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className={`border p-2 ${group.groupClass}`}
            colSpan={colSpan}
        >
            {children}
        </th>
    );
};

// Di dalam AnalysisDigitalProduct.jsx

// Di dalam AnalysisDigitalProduct.jsx

const SmeReportTable = ({ data = [], decimalPlaces, tableConfig, setTableConfig }) => {
    const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates, }));

    const getDataKeys = (config) => {
        const keys = [];
        config.forEach(group => {
            group.columns.forEach(col => {
                if (col.subColumns) {
                    col.subColumns.forEach(sc => {
                        if (sc.type !== 'calculation') keys.push(col.key + sc.key);
                    });
                } else if (col.type !== 'calculation') {
                    keys.push(col.key);
                }
            });
        });
        return keys;
    };

    const totals = useMemo(() => {
        const dataKeys = getDataKeys(tableConfig);
        const initialTotals = Object.fromEntries(dataKeys.map(key => [key, 0]));

        data.forEach(item => {
            dataKeys.forEach(key => {
                initialTotals[key] += formatNumber(item[key]);
            });
        });
        return initialTotals;
    }, [data, tableConfig]);

    function handleDragEnd(event) {
        const { active, over } = event;
        if (active.id !== over.id) {
            setTableConfig((config) => {
                const oldIndex = config.findIndex(g => g.groupTitle === active.id);
                const newIndex = config.findIndex(g => g.groupTitle === over.id);
                return arrayMove(config, oldIndex, newIndex);
            });
        }
    }

    // =======================================================
    // MESIN KALKULASI UTAMA ADA DI FUNGSI INI
    // =======================================================
    const getCellValue = (item, columnDef) => {
        if (columnDef.type === 'calculation') {
            const { operation, operands } = columnDef.calculation;
            const values = operands.map(opKey => {
                const opDef = findColumnDefinition(opKey, tableConfig);
                return opDef?.type === 'calculation' ? getCellValue(item, opDef) : formatNumber(item[opKey]);
            });

            switch (operation) {
                case 'percentage':
                    // operands: [pembilang, penyebut]
                    const [numerator, denominator] = values;
                    if (denominator === 0) return formatPercent(0);
                    return formatPercent((numerator / denominator) * 100);

                case 'sum':
                    // operands: [angka1, angka2, ...]
                    return formatNumber(values.reduce((a, b) => a + b, 0));

                case 'average':
                    if (values.length === 0) return 0;
                    const sum = values.reduce((a, b) => a + b, 0);
                    // Menghindari pembagian dengan nol
                    return formatNumber(sum / values.length);

                case 'count':
                    // Menghitung berapa banyak operand yang nilainya bukan nol
                    return values.filter(v => v !== 0).length;

                default:
                    return 'N/A'; // Operasi tidak dikenal
            }
        }
        return item[columnDef.key];
    };

    const findColumnDefinition = (keyToFind) => {
        for (const group of tableConfig) {
            for (const col of group.columns) {
                if (col.key === keyToFind) return col;
                if (col.subColumns) {
                    for (const subCol of col.subColumns) {
                        if ((col.key + subCol.key) === keyToFind) return subCol;
                    }
                }
            }
        }
        return null;
    };

    // =======================================================
    // JSX di bawah ini di-refactor agar lebih ringkas
    // =======================================================
    const renderCell = (item, col, subCol = null) => {
        const columnDef = subCol || col;
        return (
            <td key={`${item.nama_witel || 'total'}-${columnDef.key}`} className="border p-2">
                {getCellValue(item, columnDef)}
            </td>
        );
    };

    const renderTotalCell = (group, col, subCol = null) => {
        const columnDef = subCol || col;
        return (
            <td key={`total-${columnDef.key}`} className={`border p-2 ${group.groupClass}`}>
                {getCellValue(totals, columnDef)}
            </td>
        );
    };

    return (
        <div className="overflow-x-auto text-xs">
            <table className="w-full border-collapse text-center">
                <thead className="bg-gray-800 text-white">
                    {/* Baris 1: Judul Grup Utama */}
                    <tr>
                        <th className="border p-2 align-middle" rowSpan={3}>WILAYAH TELKOM</th>
                        {tableConfig.map(group => (
                            <th key={group.groupTitle} className={`border p-2 ${group.groupClass}`} colSpan={group.columns.reduce((sum, col) => sum + (col.subColumns?.length || 1), 0)}>
                                {group.groupTitle}
                            </th>
                        ))}
                    </tr>

                    {/* Baris 2: Judul Kolom Produk */}
                    <tr className="font-semibold">
                        {tableConfig.map(group =>
                            group.columns.map(col => (
                                <th key={col.key} className={`border p-2 ${group.columnClass || 'bg-gray-700'}`} colSpan={col.subColumns?.length || 1} rowSpan={col.subColumns ? 1 : 2}>
                                    {col.title}
                                </th>
                            ))
                        )}
                    </tr>

                    {/* Baris 3: Judul Sub-Kolom */}
                    <tr className="font-medium">
                        {tableConfig.map(group =>
                            group.columns.map(col =>
                                col.subColumns?.map(subCol => (
                                    <th key={`${col.key}${subCol.key}`} className={`border p-1 ${group.subColumnClass || 'bg-gray-600'}`}>
                                        {subCol.title}
                                    </th>
                                ))
                            )
                        )}
                    </tr>
                </thead>
                <tbody>
                    {/* Baris Data */}
                    {data.length > 0 ? data.map(item => (
                        <tr key={item.nama_witel} className="bg-white hover:bg-gray-50 text-black">
                            <td className="border p-2 font-semibold text-left">{item.nama_witel}</td>
                            {tableConfig.map(group =>
                                group.columns.map(col =>
                                    col.subColumns ? (
                                        col.subColumns.map(subCol => (
                                            // Menggunakan `cellClassName` yang baru
                                            <td key={`${item.nama_witel}-${col.key}-${subCol.key}`} className={`border p-2 ${subCol.cellClassName || ''}`}>
                                                {getCellValue(item, subCol, col)}
                                            </td>
                                        ))
                                    ) : (
                                        // Fallback untuk grup seperti "In Progress"
                                        <td key={`${item.nama_witel}-${col.key}`} className="border p-2 bg-blue-100">
                                            {getCellValue(item, col)}
                                        </td>
                                    )
                                )
                            )}
                        </tr>
                    )) : (
                        <tr><td colSpan={100} className="text-center p-4 border text-gray-500">Tidak ada data.</td></tr>
                    )}

                    {/* Baris Grand Total */}
                    <tr className="font-bold text-white">
                        <td className="border p-2 text-left bg-gray-800">GRAND TOTAL</td>
                        {tableConfig.map(group =>
                            group.columns.map(col =>
                                col.subColumns ? (
                                    col.subColumns.map(subCol => (
                                        // Selalu gunakan warna grup utama
                                        <td key={`total-${col.key}-${subCol.key}`} className={`border p-2 ${group.groupClass}`}>
                                            {getCellValue(totals, subCol, col)}
                                        </td>
                                    ))
                                ) : (
                                    <td key={`total-${col.key}`} className={`border p-2 ${group.groupClass}`}>
                                        {getCellValue(totals, col)}
                                    </td>
                                )
                            )
                        )}
                    </tr>
                </tbody>
            </table>
        </div>
    );
};

// ===================================================================
// KOMPONEN TABEL BARU: IN PROGRESS
// ===================================================================
const InProgressTable = ({ data = [] }) => {

    const handleCompleteClick = (orderId) => {
        if (confirm(`Anda yakin ingin mengubah status Order ID: ${orderId} menjadi "Complete"?`)) {
            router.put(route('manual.update.complete', { order_id: orderId }), {}, {
                preserveScroll: true,
                // TAMBAHKAN BLOK INI
                onSuccess: () => {
                    // Memaksa Inertia untuk memuat ulang semua data dari server
                    // dan memperbarui semua komponen di halaman.
                    router.reload({ preserveState: false });
                }
            });
        }
    };

    const handleCancelClick = (orderId) => {
        if (confirm(`Anda yakin ingin membatalkan Order ID: ${orderId}?`)) {
            router.put(route('manual.update.cancel', { order_id: orderId }), {}, {
                preserveScroll: true,
                // TAMBAHKAN BLOK INI
                onSuccess: () => {
                    router.reload({ preserveState: false });
                }
            });
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleString('id-ID', {
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit'
        });
    };

    return (
        <div className="overflow-x-auto text-sm">
            <table className="w-full">
                <thead className="bg-gray-50">
                    <tr className="text-left font-semibold text-gray-600">
                        {/* ... header tabel tidak berubah ... */}
                        <th className="p-3">No.</th>
                        <th className="p-3">Milestone</th>
                        <th className="p-3">Segment</th>
                        <th className="p-3">Status Order</th>
                        <th className="p-3">Product Name</th>
                        <th className="p-3">Order ID</th>
                        <th className="p-3">Witel</th>
                        <th className="p-3">Customer Name</th>
                        <th className="p-3">Order Created Date</th>
                        <th className="p-3 text-center">Action</th>
                    </tr>
                </thead>
                <tbody className="divide-y bg-white">
                    {data.length > 0 ? data.map((item, index) => (
                        <tr key={item.order_id} className="text-gray-700 hover:bg-gray-50">
                            <td className="p-3">{index + 1}</td>
                            <td className="p-3">{item.milestone}</td>
                            <td className="p-3">{item.segment}</td>
                            <td className="p-3 whitespace-nowrap">
                                <span className="px-2 py-1 font-semibold leading-tight text-blue-700 bg-blue-100 rounded-full">
                                    {item.order_status_n}
                                </span>
                            </td>
                            <td className="p-3">{item.product_name}</td>
                            <td className="p-3 font-mono">{item.order_id}</td>
                            <td className="p-3">{item.nama_witel}</td>
                            <td className="p-3">{item.customer_name}</td>
                            <td className="p-3">{formatDate(item.order_created_date)}</td>

                            <td className="p-3 text-center">
                                <div className="flex justify-center items-center gap-2">
                                    <button
                                        onClick={() => handleCompleteClick(item.order_id)}
                                        className="px-3 py-1 text-xs font-bold text-white bg-green-500 rounded-md hover:bg-green-600"
                                    >
                                        COMPLETE
                                    </button>
                                    <button
                                        onClick={() => handleCancelClick(item.order_id)}
                                        className="px-3 py-1 text-xs font-bold text-white bg-red-500 rounded-md hover:bg-red-600"
                                    >
                                        CANCEL
                                    </button>
                                </div>
                            </td>
                        </tr>
                    )) : (
                        <tr>
                            <td colSpan="10" className="p-4 text-center text-gray-500">
                                Tidak ada data yang sesuai dengan filter.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
};

// ===================================================================
// KOMPONEN TABEL BARU: HISTORY
// ===================================================================
const HistoryTable = ({ data = [] }) => {

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleString('id-ID', {
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', second: '2-digit'
        });
    };

    // Komponen kecil untuk membuat tampilan status lebih menarik
    const StatusChip = ({ text }) => {
        const lowerText = text.toLowerCase();
        let colorClasses = 'bg-gray-100 text-gray-800'; // Default

        if (lowerText.includes('progress')) {
            colorClasses = 'bg-blue-100 text-blue-800';
        } else if (lowerText.includes('bima')) { // done close bima
            colorClasses = 'bg-green-100 text-green-800';
        } else if (lowerText.includes('cancel')) {
            colorClasses = 'bg-red-100 text-red-800';
        }

        return (
            <span className={`px-2 py-1 text-xs font-semibold leading-tight rounded-full ${colorClasses}`}>
                {text}
            </span>
        );
    };

    return (
        <div className="overflow-x-auto text-sm">
            <p className="text-gray-500 mb-2">Menampilkan 10 data terbaru yang statusnya diubah melalui proses sinkronisasi.</p>
            <table className="w-full whitespace-nowrap">
                <thead className="bg-gray-50">
                    <tr className="text-left font-semibold text-gray-600">
                        <th className="p-3">Waktu Update</th>
                        <th className="p-3">Order ID</th>
                        <th className="p-3">Customer</th>
                        <th className="p-3">Witel</th>
                        <th className="p-3">Status Lama</th>
                        <th className="p-3">Status Baru</th>
                        <th className="p-3">Sumber</th>
                    </tr>
                </thead>
                <tbody className="divide-y bg-white">
                    {data.length > 0 ? data.map((item) => (
                        <tr key={item.id} className="text-gray-700 hover:bg-gray-50">
                            <td className="p-3 font-semibold">{formatDate(item.created_at)}</td>
                            <td className="p-3 font-mono">{item.order_id}</td>
                            <td className="p-3">{item.customer_name}</td>
                            <td className="p-3">{item.nama_witel}</td>
                            <td className="p-3"><StatusChip text={item.status_lama} /></td>
                            <td className="p-3"><StatusChip text={item.status_baru} /></td>
                            <td className="p-3 font-medium text-gray-600">{item.sumber_update}</td>
                        </tr>
                    )) : (
                        <tr>
                            <td colSpan="7" className="p-4 text-center text-gray-500">
                                Belum ada histori update yang tercatat.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
};

const KpiTable = ({ data = [], accountOfficers = [], openModal }) => {
    return (
        <div className="overflow-x-auto text-sm">
            <table className="min-w-full divide-y divide-gray-200 border">
                <thead className="bg-gray-50">
                    <tr>
                        <th rowSpan="2" className="px-4 py-2 text-center text-xs font-medium text-white uppercase tracking-wider border bg-green-600">NAMA PO</th>
                        <th rowSpan="2" className="px-4 py-2 text-center text-xs font-medium text-white uppercase tracking-wider border bg-green-600">WITEL</th>
                        <th colSpan="2" className="px-4 py-2 text-center text-xs font-medium text-white uppercase tracking-wider border bg-orange-500">PRODIGI DONE</th>
                        <th colSpan="2" className="px-4 py-2 text-center text-xs font-medium text-white uppercase tracking-wider border bg-blue-500">PRODIGI OGP</th>
                        <th rowSpan="2" className="px-4 py-2 text-center text-xs font-medium text-white uppercase tracking-wider border bg-green-600">TOTAL</th>
                        <th colSpan="2" className="px-4 py-2 text-center text-xs font-medium text-white uppercase tracking-wider border bg-yellow-400">ACH</th>
                        <th rowSpan="2" className="px-4 py-2 text-center text-xs font-medium text-white uppercase tracking-wider border bg-gray-600">AKSI</th>
                    </tr>
                    <tr>
                        <th className="px-4 py-2 text-center text-xs font-medium text-white uppercase tracking-wider border bg-orange-400">NCX</th>
                        <th className="px-4 py-2 text-center text-xs font-medium text-white uppercase tracking-wider border bg-orange-400">SCONE</th>
                        <th className="px-4 py-2 text-center text-xs font-medium text-white uppercase tracking-wider border bg-blue-400">NCX</th>
                        <th className="px-4 py-2 text-center text-xs font-medium text-white uppercase tracking-wider border bg-blue-400">SCONE</th>
                        <th className="px-4 py-2 text-center text-xs font-medium text-white uppercase tracking-wider border bg-yellow-300">YTD</th>
                        <th className="px-4 py-2 text-center text-xs font-medium text-white uppercase tracking-wider border bg-yellow-300">Q3</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {data.map((po) => (
                        <tr key={po.nama_po} className="hover:bg-gray-50">
                            <td className="px-4 py-2 whitespace-nowrap border font-medium">{po.nama_po}</td>
                            <td className="px-4 py-2 whitespace-nowrap border">{po.witel}</td>
                            <td className="px-4 py-2 whitespace-nowrap border text-center">{po.done_ncx}</td>
                            <td className="px-4 py-2 whitespace-nowrap border text-center">{po.done_scone}</td>
                            <td className="px-4 py-2 whitespace-nowrap border text-center">{po.ogp_ncx}</td>
                            <td className="px-4 py-2 whitespace-nowrap border text-center">{po.ogp_scone}</td>
                            <td className="px-4 py-2 whitespace-nowrap border text-center font-bold">{po.total}</td>
                            <td className="px-4 py-2 whitespace-nowrap border text-center font-bold bg-yellow-200">{po.ach_ytd}</td>
                            <td className="px-4 py-2 whitespace-nowrap border text-center font-bold bg-yellow-200">{po.ach_q3}</td>
                            <td className="px-4 py-2 whitespace-nowrap border">
                                <button
                                    onClick={() => openModal(accountOfficers.find(a => a.id === po.id))}
                                    className="text-indigo-600 hover:text-indigo-900 text-xs font-semibold"
                                >
                                    Edit
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

const AgentFormModal = ({ isOpen, onClose, agent }) => {
    const { data, setData, post, put, processing, errors, reset } = useForm({
        name: '',
        display_witel: '',
        filter_witel_lama: '',
        special_filter_column: '',
        special_filter_value: '',
    });

    useEffect(() => {
        if (agent) {
            setData({
                name: agent.name || '',
                display_witel: agent.display_witel || '',
                filter_witel_lama: agent.filter_witel_lama || '',
                special_filter_column: agent.special_filter_column || '',
                special_filter_value: agent.special_filter_value || '',
            });
        } else {
            reset();
        }
    }, [agent, isOpen]); // Tambahkan isOpen agar form reset saat ditutup dan dibuka lagi

    const handleSubmit = (e) => {
        e.preventDefault();
        const onSuccess = () => {
            onClose();
            // Tidak perlu router.reload, karena onSuccess Inertia akan otomatis memperbarui data
        };

        if (agent) {
            put(route('account-officers.update', agent.id), { onSuccess, preserveScroll: true });
        } else {
            post(route('account-officers.store'), { onSuccess, preserveScroll: true });
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
                <h2 className="text-lg font-bold mb-4">{agent ? 'Edit Agen' : 'Tambah Agen Baru'}</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <InputLabel htmlFor="name" value="Nama PO" />
                        <input id="name" type="text" value={data.name} onChange={e => setData('name', e.target.value)} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm" required />
                        <InputError message={errors.name} className="mt-2" />
                    </div>
                    <div>
                        <InputLabel htmlFor="display_witel" value="Display Witel" />
                        <input id="display_witel" type="text" value={data.display_witel} onChange={e => setData('display_witel', e.target.value)} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm" required />
                        <InputError message={errors.display_witel} className="mt-2" />
                    </div>
                    <div>
                        <InputLabel htmlFor="filter_witel_lama" value="Filter Witel Lama (sesuai data mentah)" />
                        <input id="filter_witel_lama" type="text" value={data.filter_witel_lama} onChange={e => setData('filter_witel_lama', e.target.value)} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm" required />
                        <InputError message={errors.filter_witel_lama} className="mt-2" />
                    </div>
                    <div>
                        <InputLabel htmlFor="special_filter_column" value="Filter Kolom Khusus (opsional)" />
                        <input id="special_filter_column" type="text" value={data.special_filter_column} onChange={e => setData('special_filter_column', e.target.value)} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm" />
                        <InputError message={errors.special_filter_column} className="mt-2" />
                    </div>
                    <div>
                        <InputLabel htmlFor="special_filter_value" value="Nilai Filter Kolom Khusus (opsional)" />
                        <input id="special_filter_value" type="text" value={data.special_filter_value} onChange={e => setData('special_filter_value', e.target.value)} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm" />
                        <InputError message={errors.special_filter_value} className="mt-2" />
                    </div>

                    <div className="flex items-center justify-end gap-4 pt-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300">Batal</button>
                        <PrimaryButton type="submit" disabled={processing}>{processing ? 'Menyimpan...' : 'Simpan'}</PrimaryButton>
                    </div>
                </form>
            </div>
        </div>
    );
};

// resources/js/Pages/AnalysisDigitalProduct.jsx

// ... letakkan ini di atas komponen KpiTable

// Ganti seluruh komponen QcTable Anda dengan ini

const QcTable = ({ data = [] }) => {
    const formatDate = (dateString) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleString('id-ID', {
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit'
        });
    };

    // Fungsi untuk menangani klik tombol "In Progress"
    const handleSetInProgress = (orderId) => {
        if (confirm(`Anda yakin ingin mengembalikan Order ID ${orderId} ke status "In Progress"?`)) {
            router.put(route('qc.update.progress', { order_id: orderId }), {}, {
                preserveScroll: true,
                onSuccess: () => router.reload({ preserveState: false }),
            });
        }
    };

    // Fungsi untuk menangani klik tombol "Done Close Bima"
    const handleSetDone = (orderId) => {
        if (confirm(`Anda yakin ingin mengubah status Order ID ${orderId} menjadi "Done Close Bima"?`)) {
            router.put(route('qc.update.done', { order_id: orderId }), {}, {
                preserveScroll: true,
                onSuccess: () => router.reload({ preserveState: false }),
            });
        }
    };

    return (
        <div className="overflow-x-auto text-sm">
            <p className="text-gray-500 mb-2">Menampilkan data order yang sedang dalam proses Quality Control (QC).</p>
            <table className="w-full">
                <thead className="bg-gray-50">
                    <tr className="text-left font-semibold text-gray-600">
                        <th className="p-3">No.</th>
                        <th className="p-3">Milestone</th>
                        <th className="p-3">Order ID</th>
                        <th className="p-3">Product Name</th>
                        <th className="p-3">Witel</th>
                        <th className="p-3">Customer Name</th>
                        <th className="p-3">Update Time</th>
                        <th className="p-3 text-center">Aksi</th> {/* <-- Kolom Baru */}
                    </tr>
                </thead>
                <tbody className="divide-y bg-white">
                    {data.length > 0 ? data.map((item, index) => (
                        <tr key={item.order_id} className="text-gray-700 hover:bg-gray-50">
                            <td className="p-3">{index + 1}</td>
                            <td className="p-3">{item.milestone}</td>
                            <td className="p-3 font-mono">{item.order_id}</td>
                            <td className="p-3">{item.product}</td>
                            <td className="p-3">{item.nama_witel}</td>
                            <td className="p-3">{item.customer_name}</td>
                            <td className="p-3">{formatDate(item.updated_at)}</td>
                            <td className="p-3 text-center"> {/* <-- Sel Baru */}
                                <div className="flex justify-center items-center gap-2">
                                    <button
                                        onClick={() => handleSetInProgress(item.order_id)}
                                        className="px-3 py-1 text-xs font-bold text-white bg-blue-500 rounded-md hover:bg-blue-600"
                                    >
                                        In Progress
                                    </button>
                                    <button
                                        onClick={() => handleSetDone(item.order_id)}
                                        className="px-3 py-1 text-xs font-bold text-white bg-green-500 rounded-md hover:bg-green-600"
                                    >
                                        Done Close Bima
                                    </button>
                                </div>
                            </td>
                        </tr>
                    )) : (
                        <tr>
                            <td colSpan="8" className="p-4 text-center text-gray-500">
                                Tidak ada data QC saat ini.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
};

const ProgressBar = ({ progress, text }) => (
    <div className="mt-4">
        <p className="text-sm font-semibold text-gray-700 mb-1">{text} {progress}%</p>
        <div className="w-full bg-gray-200 rounded-full">
            <div
                className="bg-blue-600 text-xs font-medium text-blue-100 text-center p-0.5 leading-none rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}>
            </div>
        </div>
    </div>
);

// Di dalam file AnalysisDigitalProduct.jsx

// Di dalam file AnalysisDigitalProduct.jsx

const TableConfigurator = ({ tableConfig, setTableConfig }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    // State tunggal yang komprehensif untuk form
    const [formState, setFormState] = useState({
        mode: 'sub-column', // 'sub-column' atau 'group-column'
        groupTitle: tableConfig[0]?.groupTitle || '', // Untuk sub-kolom
        columnTitle: '', // Untuk sub-kolom & grup baru
        initialSubColumnTitle: 'Value', // Untuk grup baru
        columnType: 'calculation', // 'data' atau 'calculation'
        operation: 'sum',
        operands: [],
    });

    // Helper untuk mendapatkan daftar semua kolom data yang bisa dihitung
    const availableColumns = useMemo(() => {
        const columns = [];
        tableConfig.forEach(group => {
            group.columns.forEach(col => {
                const processColumn = (c, parentKey = '', parentTitle = '') => {
                    if (c.subColumns) {
                        c.subColumns.forEach(sc => processColumn(sc, col.key, col.title));
                    } else if (c.type !== 'calculation') {
                        const key = parentKey ? parentKey + c.key : c.key;
                        const label = parentTitle ? `${group.groupTitle} > ${parentTitle} > ${c.title}` : `${group.groupTitle} > ${c.title}`;
                        columns.push({ label, value: key });
                    }
                };
                processColumn(col);
            });
        });
        return columns;
    }, [tableConfig]);

    // Handler input yang dinamis
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormState(prev => ({ ...prev, [name]: value }));
    };

    // Handler utama saat form disubmit
    const handleSubmit = (e) => {
        e.preventDefault();

        if (formState.mode === 'group-column') {
            // Logika untuk menambah grup kolom utama baru
            const newGroupObject = {
                groupTitle: formState.columnTitle, // Menggunakan columnTitle sebagai nama grup baru
                groupClass: 'bg-purple-600',
                columns: [{ key: `_${formState.initialSubColumnTitle.toLowerCase()}`, title: formState.initialSubColumnTitle }],
            };
            setTableConfig(prev => [...prev, newGroupObject]);
            alert(`Grup kolom "${formState.columnTitle}" berhasil ditambahkan.`);
        } else {
            // Logika untuk menambah sub-kolom baru
            const newColumnKey = `_${formState.columnTitle.toLowerCase().replace(/\s+/g, '_')}`;
            const newConfig = JSON.parse(JSON.stringify(tableConfig));
            const targetGroup = newConfig.find(g => g.groupTitle === formState.groupTitle);

            if (targetGroup) {
                let newColumnDef = { key: newColumnKey, title: formState.columnTitle };
                if (formState.columnType === 'calculation') {
                    if (formState.operands.length === 0 || formState.operands.some(op => !op)) {
                        alert('Harap pilih semua kolom operand yang dibutuhkan.');
                        return;
                    }
                    newColumnDef.type = 'calculation';
                    newColumnDef.calculation = {
                        operation: formState.operation,
                        operands: formState.operands,
                    };
                }
                targetGroup.columns.push(newColumnDef);
                setTableConfig(newConfig);
                alert(`Sub-kolom "${formState.columnTitle}" berhasil ditambahkan ke grup "${formState.groupTitle}".`);
            }
        }
    };

    const handleCheckboxOperandChange = (checked, value) => {
        setFormState(prev => {
            const currentOperands = prev.operands || [];
            if (checked) {
                // Tambahkan value ke array jika belum ada
                return { ...prev, operands: [...currentOperands, value] };
            } else {
                // Hapus value dari array
                return { ...prev, operands: currentOperands.filter(op => op !== value) };
            }
        });
    };

    // Helper untuk render input operand
    const renderOperandInputs = () => {
        switch (formState.operation) {
            case 'sum':
            case 'average':
            case 'count':
                return (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Pilih Kolom untuk Dihitung</label>
                        <div className="w-full border border-gray-300 rounded-md shadow-sm h-32 overflow-y-auto p-2 mt-1 space-y-1">
                            {availableColumns.map(col => (
                                <label key={col.value} className="flex items-center w-full p-1 rounded hover:bg-gray-100">
                                    <input
                                        type="checkbox"
                                        checked={(formState.operands || []).includes(col.value)}
                                        onChange={(e) => handleCheckboxOperandChange(e.target.checked, col.value)}
                                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                    />
                                    <span className="ml-2 text-sm text-gray-700">{col.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                );
            case 'percentage':
                return (
                    <div className="space-y-2">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Kolom Pembilang (Numerator)</label>
                            <select value={formState.operands[0] || ''} onChange={e => handleOperandChange(0, e.target.value)} className="w-full border-gray-300 rounded-md shadow-sm">
                                <option value="">Pilih Kolom</option>
                                {availableColumns.map(col => <option key={col.value} value={col.value}>{col.label}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Kolom Penyebut (Denominator)</label>
                            <select value={formState.operands[1] || ''} onChange={e => handleOperandChange(1, e.target.value)} className="w-full border-gray-300 rounded-md shadow-sm">
                                <option value="">Pilih Kolom</option>
                                {availableColumns.map(col => <option key={col.value} value={col.value}>{col.label}</option>)}
                            </select>
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    // Tambahkan state baru untuk form edit warna
    const [editGroup, setEditGroup] = useState({
        title: tableConfig[0]?.groupTitle || '',
        className: tableConfig[0]?.groupClass || '',
    });

    // Fungsi untuk menangani saat user memilih grup yang akan diedit
    const handleSelectGroupToEdit = (e) => {
        const selectedTitle = e.target.value;
        const groupToEdit = tableConfig.find(g => g.groupTitle === selectedTitle);
        if (groupToEdit) {
            setEditGroup({ title: groupToEdit.groupTitle, className: groupToEdit.groupClass });
        }
    };

    // Fungsi untuk menyimpan perubahan warna
    const handleSaveColor = () => {
        const newConfig = tableConfig.map(group => {
            if (group.groupTitle === editGroup.title) {
                return { ...group, groupClass: editGroup.className };
            }
            return group;
        });
        setTableConfig(newConfig);
        alert(`Warna untuk grup "${editGroup.title}" berhasil diubah.`);
    };

    return (
        <div className="bg-white rounded-lg shadow-md mb-6">
            <div className="flex justify-between items-center p-4 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
                <h3 className="font-semibold text-gray-700">Konfigurasi Tampilan Tabel</h3>
                <span className="text-sm font-bold text-blue-600">{isExpanded ? 'Tutup' : 'Buka'}</span>
            </div>
            {isExpanded && (
                <div className="p-6 border-t">
                    {/* 👇 Container Utama dengan Flexbox untuk layout 2 kolom 👇 */}
                    <div className="flex flex-col md:flex-row md:gap-8">

                        {/* 👉 Kolom Kiri: Aksi Utama (Lebih besar) 👈 */}
                        <div className="md:w-2/3">
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Pilih Aksi:</label>
                                    <div className="flex gap-4">
                                        <label className="flex items-center"><input type="radio" name="mode" value="sub-column" checked={formState.mode === 'sub-column'} onChange={handleInputChange} className="mr-2" /> Tambah Sub-Kolom</label>
                                        <label className="flex items-center"><input type="radio" name="mode" value="group-column" checked={formState.mode === 'group-column'} onChange={handleInputChange} className="mr-2" /> Tambah Grup Utama</label>
                                    </div>
                                </div>

                                {formState.mode === 'group-column' && (
                                    <div className="p-4 border rounded-md space-y-4 bg-gray-50">
                                        <h4 className="font-semibold text-md text-gray-800">Detail Grup Utama Baru</h4>
                                        <div>
                                            <label className="block text-sm font-medium">Nama Grup Utama Baru</label>
                                            <input type="text" name="columnTitle" value={formState.columnTitle} onChange={handleInputChange} className="w-full mt-1" required />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium">Nama Sub-Kolom Awal</label>
                                            <input type="text" name="initialSubColumnTitle" value={formState.initialSubColumnTitle} onChange={handleInputChange} className="w-full mt-1" required />
                                        </div>
                                    </div>
                                )}

                                {formState.mode === 'sub-column' && (
                                    <div className="p-4 border rounded-md space-y-4 bg-gray-50">
                                        <h4 className="font-semibold text-md text-gray-800">Detail Sub-Kolom Baru</h4>
                                        <div>
                                            <label className="block text-sm font-medium">Tambahkan ke Grup Induk</label>
                                            <select name="groupTitle" value={formState.groupTitle} onChange={handleInputChange} className="w-full mt-1">
                                                {tableConfig.map(g => <option key={g.groupTitle} value={g.groupTitle}>{g.groupTitle}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium">Nama Sub-Kolom Baru</label>
                                            <input type="text" name="columnTitle" value={formState.columnTitle} onChange={handleInputChange} className="w-full mt-1" required />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-2">Tipe Kolom:</label>
                                            <div className="flex gap-4">
                                                <label><input type="radio" name="columnType" value="calculation" checked={formState.columnType === 'calculation'} onChange={handleInputChange} className="mr-2" /> Kalkulasi</label>
                                                <label><input type="radio" name="columnType" value="data" checked={formState.columnType === 'data'} onChange={handleInputChange} className="mr-2" /> Data Biasa (dari backend)</label>
                                            </div>
                                        </div>

                                        {formState.columnType === 'calculation' && (
                                            <div className="pt-4 border-t space-y-2">
                                                <div>
                                                    <label className="block text-sm font-medium">Operasi Kalkulasi</label>
                                                    <select name="operation" value={formState.operation} onChange={handleInputChange} className="w-full mt-1">
                                                        <option value="sum">SUM (Jumlahkan)</option>
                                                        <option value="percentage">PERCENTAGE (Persentase)</option>
                                                        <option value="average">AVERAGE (Rata-rata)</option>
                                                        <option value="count">COUNT (Hitung Jumlah)</option>
                                                    </select>
                                                </div>

                                                {renderOperandInputs()}

                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="text-right pt-4">
                                    <PrimaryButton type="submit">
                                        {formState.mode === 'sub-column' ? 'Tambah Sub-Kolom' : 'Tambah Grup Kolom'}
                                    </PrimaryButton>
                                </div>
                            </form>
                        </div>

                        <div className="md:w-1/3 pt-6 mt-6 md:pt-0 md:mt-0 md:border-l md:pl-8">
                            <h4 className="font-semibold text-md text-gray-800 border-b pb-2 mb-4">Ubah Warna Grup</h4>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium">Pilih Grup</label>
                                    <select value={editGroup.title} onChange={handleSelectGroupToEdit} className="w-full mt-1">
                                        {tableConfig.map(g => <option key={g.groupTitle} value={g.groupTitle}>{g.groupTitle}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium">Kelas Warna Tailwind CSS</label>
                                    <input
                                        type="text"
                                        value={editGroup.className}
                                        onChange={e => setEditGroup({ ...editGroup, className: e.target.value })}
                                        className="w-full mt-1"
                                        placeholder="Contoh: bg-red-600"
                                    />
                                </div>
                                <div className="text-right">
                                    <PrimaryButton type="button" onClick={handleSaveColor} className="w-full">
                                        Terapkan Warna
                                    </PrimaryButton>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// ===================================================================
// KOMPONEN UTAMA ANALYSISDigitalProduct
// ===================================================================
export default function AnalysisDigitalProduct({ auth, reportData = [], currentSegment = 'SME', period = '', inProgressData = [], newData = [], newStatusData, historyData = [], accountOfficers = [], kpiData = [], qcData = [], currentInProgressYear, flash = {}, errors: pageErrors = {} }) {

    const [activeDetailView, setActiveDetailView] = useState('inprogress');
    const [witelFilter, setWitelFilter] = useState('ALL');
    const [decimalPlaces, setDecimalPlaces] = useState(5);

    const [tableConfig, setTableConfig] = useState([
        {
            groupTitle: 'In Progress',
            groupClass: 'bg-blue-600',
            columnClass: 'bg-blue-400 text-black',
            columns: [
                { key: 'in_progress_n', title: 'N', className: 'bg-blue-100 text-black' },
                { key: 'in_progress_o', title: 'O', className: 'bg-blue-100 text-black' },
                { key: 'in_progress_ae', title: 'AE', className: 'bg-blue-100 text-black' },
                { key: 'in_progress_ps', title: 'PS', className: 'bg-blue-100 text-black' },
            ],
        },
        {
            groupTitle: 'Prov Comp',
            groupClass: 'bg-orange-600',
            columnClass: 'bg-orange-400 text-black',
            subColumnClass: 'bg-orange-300 text-black',
            columns: [
                {
                    key: 'prov_comp_n', title: 'N', className: 'bg-orange-500 text-black', subColumns: [
                        { key: '_target', title: 'T', className: 'bg-orange-200 text-black' },
                        { key: '_realisasi', title: 'R', className: 'bg-orange-200 text-black' },
                        { key: '_percent', title: 'P', className: 'bg-orange-100 text-black', type: 'calculation', calculation: { operation: 'percentage', operands: ['prov_comp_n_realisasi', 'prov_comp_n_target'] } }
                    ]
                },
                {
                    key: 'prov_comp_o', title: 'O', subColumns: [
                        { key: '_target', title: 'T', className: 'bg-orange-200 text-black' },
                        { key: '_realisasi', title: 'R', className: 'bg-orange-200 text-black' },
                        { key: '_percent', title: 'P', className: 'bg-orange-100 text-black', type: 'calculation', calculation: { operation: 'percentage', operands: ['prov_comp_o_realisasi', 'prov_comp_o_target'] } }
                    ]
                },
                {
                    key: 'prov_comp_ae', title: 'AE', subColumns: [
                        { key: '_target', title: 'T', className: 'bg-orange-200 text-black' },
                        { key: '_realisasi', title: 'R', className: 'bg-orange-200 text-black' },
                        { key: '_percent', title: 'P', className: 'bg-orange-100 text-black', type: 'calculation', calculation: { operation: 'percentage', operands: ['prov_comp_ae_realisasi', 'prov_comp_ae_target'] } }
                    ]
                },
                {
                    key: 'prov_comp_ps', title: 'PS', subColumns: [
                        { key: '_target', title: 'T', className: 'bg-orange-200 text-black' },
                        { key: '_realisasi', title: 'R', className: 'bg-orange-200 text-black' },
                        { key: '_percent', title: 'P', className: 'bg-orange-100 text-black', type: 'calculation', calculation: { operation: 'percentage', operands: ['prov_comp_ps_realisasi', 'prov_comp_ps_target'] } }
                    ]
                },
            ],
        },
        {
            groupTitle: 'REVENUE (Rp Juta)',
            groupClass: 'bg-green-700',
            columnClass: 'bg-green-600 text-black',
            subColumnClass: 'bg-green-300 text-black',
            columns: [
                { key: 'revenue_n', title: 'N', subColumns: [{ key: '_target', title: 'T', className: 'bg-green-200 text-black' }, { key: '_ach', title: 'ACH', className: 'bg-green-100 text-black' }] },
                { key: 'revenue_o', title: 'O', subColumns: [{ key: '_target', title: 'T', className: 'bg-green-200 text-black' }, { key: '_ach', title: 'ACH', className: 'bg-green-100 text-black' }] },
                { key: 'revenue_ae', title: 'AE', subColumns: [{ key: '_target', title: 'T', className: 'bg-green-200 text-black' }, { key: '_ach', title: 'ACH', className: 'bg-green-100 text-black' }] },
                { key: 'revenue_ps', title: 'PS', subColumns: [{ key: '_target', title: 'T', className: 'bg-green-200 text-black' }, { key: '_ach', title: 'ACH', className: 'bg-green-100 text-black' }] },
            ],
        },
        {
            groupTitle: 'Grand Total',
            groupClass: 'bg-gray-600',
            columnClass: 'bg-gray-500',
            columns: [
                { key: 'grand_total_target', title: 'T', className: 'bg-gray-200 text-black', type: 'calculation', calculation: { operation: 'sum', operands: ['prov_comp_n_target', 'prov_comp_o_target', 'prov_comp_ae_target', 'prov_comp_ps_target'] } },
                { key: 'grand_total_realisasi', title: 'R', className: 'bg-gray-200 text-black', type: 'calculation', calculation: { operation: 'sum', operands: ['prov_comp_n_realisasi', 'prov_comp_o_realisasi', 'prov_comp_ae_realisasi', 'prov_comp_ps_realisasi'] } },
                { key: 'grand_total_persentase', title: 'P', className: 'bg-gray-100 text-black', type: 'calculation', calculation: { operation: 'percentage', operands: ['grand_total_realisasi', 'grand_total_target'] } }
            ],
        },
    ]);

    // <-- LANGKAH 2: LETAKKAN LOGIKA (STATE & EFFECT) DI SINI -->
    const [progressStates, setProgressStates] = useState({
        mentah: null,
        complete: null,
        cancel: null,
    });

    const { props: pageProps } = usePage(); // Menggunakan nama alias agar tidak konflik

    useEffect(() => {
        const { batchId, jobType } = pageProps.flash || {};

        if (batchId && jobType && progressStates[jobType] === null) {
            setProgressStates(prev => ({ ...prev, [jobType]: 0 }));

            const interval = setInterval(() => {
                axios.get(route('import.progress', { batchId }))
                    .then(response => {
                        const progress = response.data.progress;
                        setProgressStates(prev => ({ ...prev, [jobType]: progress }));

                        if (progress >= 100) {
                            clearInterval(interval);
                            setTimeout(() => {
                                setProgressStates(prev => ({ ...prev, [jobType]: null }));
                                router.reload({ preserveState: false });
                            }, 2000);
                        }
                    })
                    .catch(error => {
                        console.error("Gagal mengambil progres job:", error);
                        clearInterval(interval);
                        setProgressStates(prev => ({ ...prev, [jobType]: null }));
                    });
            }, 2000);

            return () => clearInterval(interval);
        }
    }, [pageProps.flash]);

    const { data: completeData, setData: setCompleteData, post: postComplete, processing: completeProcessing, progress: completeProgress, errors: completeErrors, reset: completeReset } = useForm({
        complete_document: null,
    });

    const submitCompleteFile = (e) => {
        e.preventDefault();
        postComplete(route('analysisDigitalProduct.uploadComplete'), {
            forceFormData: true,
            onSuccess: () => completeReset(),
        });
    };

    const { data: cancelData, setData: setCancelData, post: postCancel, processing: cancelProcessing, progress: cancelProgress, errors: cancelErrors, reset: cancelReset } = useForm({
        cancel_document: null,
    });

    const { data: statusData, setData: setStatusData, post: postStatus, processing: statusProcessing, errors: statusErrors, reset: statusReset } = useForm({
        document: null,
        type: '', // Tipe akan diatur saat tombol submit ditekan
    });

    const submitStatusFile = (e, type) => {
        e.preventDefault();
        // Set tipe ('complete' atau 'cancel') sebelum mengirim
        setStatusData('type', type);

        // Gunakan setTimeout agar state sempat terupdate sebelum post
        setTimeout(() => {
            postStatus(route('analysisDigitalProduct.uploadStatus'), {
                forceFormData: true,
                onSuccess: () => statusReset('document'),
            });
        }, 0);
    };

    // Hook untuk form unggah dokumen (tidak berubah)
    const { data: uploadData, setData: setUploadData, post: postUpload, processing, errors } = useForm({
        document: null,
    });

    const handleSyncClick = () => {
        if (confirm('Anda yakin ingin menjalankan proses sinkronisasi untuk mengubah status order menjadi complete?')) {
            router.post(route('analysisDigitalProduct.syncComplete'), {}, { preserveScroll: true });
        }
    };

    const submitCancelFile = (e) => {
        e.preventDefault();
        postCancel(route('analysisDigitalProduct.uploadCancel'), {
            forceFormData: true,
            onSuccess: () => cancelReset(),
        });
    };

    const handleSyncCancelClick = () => {
        if (confirm('Anda yakin ingin menjalankan proses sinkronisasi untuk mengubah status order menjadi CANCEL?')) {
            router.post(route('analysisDigitalProduct.syncCancel'), {}, { preserveScroll: true });
        }
    };

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingAgent, setEditingAgent] = useState(null);

    const [isCompleteSectionExpanded, setIsCompleteSectionExpanded] = useState(false);
    const [isCancelSectionExpanded, setIsCancelSectionExpanded] = useState(false);

    const openModal = (agent = null) => {
        setEditingAgent(agent);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingAgent(null);
    };

    // Handler untuk mengubah segmen (LEGS/SME)
    function handleSegmentChange(e) {
        const newSegment = e.target.value;
        // Gunakan router.get untuk memuat ulang data dari server dengan segmen baru
        router.get(route('analysisDigitalProduct.index'), { segment: newSegment, period: period }, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    }

    // Handler untuk mengubah periode (Bulan & Tahun)
    function handlePeriodChange(e) {
        const newPeriod = e.target.value;
        router.get(route('analysisDigitalProduct'), { segment: currentSegment, period: newPeriod }, {
            preserveState: true, replace: true, preserveScroll: true, in_progress_year: currentInProgressYear,
        });
    }

    function handleUploadSubmit(e) {
        e.preventDefault();
        postUpload(route('analysisDigitalProduct.upload')); // Gunakan nama yang benar
    }

    function handleInProgressYearChange(e) {
        const newYear = e.target.value;
        router.get(route('analysisDigitalProduct'), {
            segment: currentSegment,
            period: period, // Pertahankan filter utama
            in_progress_year: newYear, // Terapkan filter tahun yang baru
        }, {
            preserveState: true,
            replace: true,
            preserveScroll: true,
        });
    }

    const generateYearOptions = () => {
        const options = [];
        const currentYear = new Date().getFullYear();
        for (let i = 0; i < 5; i++) {
            const year = currentYear - i;
            options.push(<option key={year} value={year}>{year}</option>);
        }
        return options;
    };

    // Kalkulasi untuk kartu "Details"
    const detailsTotals = useMemo(() => {
        if (!reportData || reportData.length === 0) return { ogp: 0, closed: 0, total: 0 };
        const totals = reportData.reduce((acc, item) => {
            const ogp = (Number(item.in_progress_n) || 0) + (Number(item.in_progress_o) || 0) + (Number(item.in_progress_ae) || 0) + (Number(item.in_progress_ps) || 0);
            let closed = 0;
            if (currentSegment === 'SME') {
                closed = (Number(item.prov_comp_n_realisasi) || 0) + (Number(item.prov_comp_o_realisasi) || 0) + (Number(item.prov_comp_ae_realisasi) || 0) + (Number(item.prov_comp_ps_realisasi) || 0);
            } else { // LEGS
                closed = (Number(item.prov_comp_n_realisasi) || 0) + (Number(item.prov_comp_o_realisasi) || 0) + (Number(item.prov_comp_ae_realisasi) || 0) + (Number(item.prov_comp_ps_realisasi) || 0);
            }
            acc.ogp += ogp;
            acc.closed += closed;
            return acc;
        }, { ogp: 0, closed: 0 });
        return { ...totals, total: totals.ogp + totals.closed };
    }, [reportData, currentSegment]);

    const generatePeriodOptions = () => {
        const options = [];
        let date = new Date();
        for (let i = 0; i < 12; i++) {
            const year = date.getFullYear();
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const value = `${year}-${month}`;
            const label = date.toLocaleString('id-ID', { month: 'long', year: 'numeric' });
            options.push(<option key={value} value={value}>{label}</option>);
            date.setMonth(date.getMonth() - 1);
        }
        return options;
    };

    const uniqueWitelList = useMemo(() => {
        return ['ALL', ...new Set(inProgressData.map(item => item.nama_witel))];
    }, [inProgressData]);

    const filteredInProgressData = useMemo(() => {
        if (witelFilter === 'ALL') {
            return inProgressData;
        }
        return inProgressData.filter(item => item.nama_witel === witelFilter);
    }, [inProgressData, witelFilter]);

    // Komponen kecil untuk tombol Tab di bagian detail
    const DetailTabButton = ({ viewName, currentView, setView, children }) => (
        <button
            onClick={() => setView(viewName)}
            className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${currentView === viewName
                ? 'bg-blue-600 text-white shadow'
                : 'bg-white text-gray-600 hover:bg-gray-100'
                }`}
        >
            {children}
        </button>
    );

    const TabButton = ({ viewName, currentView, setView, children }) => (
        <button
            onClick={() => setView(viewName)}
            className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${currentView === viewName
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100'
                }`}
        >
            {children}
        </button>
    );

    const NewStatusTable = ({ data = [] }) => {
        const formatDate = (dateString) => {
            if (!dateString) return '-';
            return new Date(dateString).toLocaleString('id-ID', {
                year: 'numeric', month: '2-digit', day: '2-digit',
                hour: '2-digit', minute: '2-digit'
            });
        };

        const getStatusChip = (status) => {
            const lowerStatus = status?.toLowerCase() || '';
            if (lowerStatus.includes('progress')) {
                return <span className="px-2 py-1 text-xs font-semibold leading-tight text-blue-700 bg-blue-100 rounded-full">{status}</span>;
            }
            if (lowerStatus.includes('done')) {
                return <span className="px-2 py-1 text-xs font-semibold leading-tight text-green-700 bg-green-100 rounded-full">{status}</span>;
            }
            return <span className="px-2 py-1 text-xs font-semibold leading-tight text-gray-700 bg-gray-100 rounded-full">{status}</span>;
        };

        return (
            <div className="overflow-x-auto text-sm">
                <p className="text-gray-500 mb-2">Menampilkan order dengan perubahan status dari unggahan terakhir.</p>
                <table className="w-full">
                    <thead className="bg-gray-50">
                        <tr className="text-left font-semibold text-gray-600">
                            <th className="p-3">Order ID</th>
                            <th className="p-3">Witel</th>
                            <th className="p-3">Milestone Lama</th>
                            <th className="p-3">Milestone Baru</th>
                            <th className="p-3">Waktu Update</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y bg-white">
                        {data.length > 0 ? data.map((item) => (
                            <tr key={item.order_id}>
                                <td className="p-3 font-mono">{item.order_id}</td>
                                <td className="p-3">{item.nama_witel}</td>
                                <td className="p-3 text-red-600">{item.previous_milestone}</td>
                                <td className="p-3 text-green-600">{item.milestone}</td>
                                <td className="p-3 font-semibold">{formatDate(item.updated_at)}</td>
                            </tr>
                        )) : (
                            <tr><td colSpan="5" className="p-4 text-center text-gray-500">Tidak ada perubahan status pada unggahan terakhir.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        );
    };

    return (
        <AuthenticatedLayout auth={auth} header="Analysis Digital Product">
            <Head title="Analysis Digital Product" />

            {flash.success && (
                <div className="mb-4 bg-green-100 border-l-4 border-green-500 text-green-700 p-4" role="alert">
                    <p>{flash.success}</p>
                </div>
            )}
            {flash.error && (
                <div className="mb-4 bg-red-100 border-l-4 border-red-500 text-red-700 p-4" role="alert">
                    <p>{flash.error}</p>
                </div>
            )}

            {/* --- PERUBAHAN 1: Total grid diubah menjadi 4 kolom --- */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

                {/* --- PERUBAHAN 2: Kolom Kiri diberi 3 dari 4 bagian --- */}
                <div className="lg:col-span-3 space-y-6">

                    <TableConfigurator
                        tableConfig={tableConfig}
                        setTableConfig={setTableConfig}
                    />

                    {/* BAGIAN 1: DATA REPORT (SELALU TAMPIL) */}
                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <div className="flex flex-wrap justify-between items-center mb-4 gap-4">
                            <h3 className="font-semibold text-lg text-gray-800">Data Report</h3>
                            <div className="flex items-center gap-4">
                                {/* TAMBAHKAN INPUT INI */}
                                <div className="flex items-center gap-2">
                                    <label htmlFor="decimal_places" className="text-sm font-medium text-gray-600">Desimal:</label>
                                    <input
                                        id="decimal_places"
                                        type="number"
                                        min="0"
                                        max="10"
                                        value={decimalPlaces}
                                        onChange={e => setDecimalPlaces(Number(e.target.value))}
                                        className="border border-gray-300 rounded-md text-sm p-2 w-20"
                                    />
                                </div>
                                {/* AKHIR TAMBAHAN */}
                                <select value={period} onChange={handlePeriodChange} className="...">
                                    {generatePeriodOptions()}
                                </select>
                                <select value={currentSegment} onChange={handleSegmentChange} className="...">
                                    <option value="LEGS">LEGS</option>
                                    <option value="SME">SME</option>
                                </select>
                            </div>
                        </div>
                        <SmeReportTable
                            data={reportData}
                            decimalPlaces={decimalPlaces}
                            tableConfig={tableConfig}
                            setTableConfig={setTableConfig} // setTableConfig diperlukan untuk fitur drag-and-drop
                        />
                    </div>

                    {/* BAGIAN 2: TABEL DETAIL (IN PROGRESS, HISTORY, & KPI) */}
                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <div className="flex flex-wrap justify-between items-center mb-4 gap-4">
                            <div className="flex items-center gap-2 border p-1 rounded-lg bg-gray-50 w-fit">
                                <DetailTabButton viewName="inprogress" currentView={activeDetailView} setView={setActiveDetailView}>
                                    Data In Progress ({filteredInProgressData.length})
                                </DetailTabButton>
                                <DetailTabButton viewName="history" currentView={activeDetailView} setView={setActiveDetailView}>
                                    Update History ({historyData.length > 10 ? '10+' : historyData.length})
                                </DetailTabButton>
                                <DetailTabButton viewName="newstatus" currentView={activeDetailView} setView={setActiveDetailView}>
                                    Data Status Baru ({newStatusData.length})
                                </DetailTabButton>
                                <DetailTabButton viewName="qc" currentView={activeDetailView} setView={setActiveDetailView}>
                                    Data QC ({qcData.length})
                                </DetailTabButton>
                                <DetailTabButton viewName="kpi" currentView={activeDetailView} setView={setActiveDetailView}>
                                    KPI PO
                                </DetailTabButton>
                            </div>
                            {activeDetailView === 'inprogress' && (
                                <div className="flex items-center gap-4">
                                    <select value={currentInProgressYear} onChange={handleInProgressYearChange} className="border border-gray-300 rounded-md text-sm p-2">
                                        {generateYearOptions()}
                                    </select>
                                    <select value={witelFilter} onChange={e => setWitelFilter(e.target.value)} className="border border-gray-300 rounded-md text-sm p-2">
                                        {uniqueWitelList.map(witel => <option key={witel} value={witel}>{witel === 'ALL' ? 'Semua Witel' : witel}</option>)}
                                    </select>
                                    <a
                                        href={route('analysisDigitalProduct.export.inprogress', { segment: currentSegment, in_progress_year: currentInProgressYear })}
                                        className="px-3 py-1 font-bold text-white bg-green-500 rounded-md hover:bg-green-600"
                                    >
                                        Export Excel
                                    </a>
                                </div>
                            )}
                            {activeDetailView === 'kpi' && (
                                <PrimaryButton onClick={() => openModal()}>
                                    Tambah Agen
                                </PrimaryButton>
                            )}
                        </div>
                        {activeDetailView === 'inprogress' && <InProgressTable data={filteredInProgressData} />}
                        {activeDetailView === 'newstatus' && <NewStatusTable data={newStatusData} />}
                        {activeDetailView === 'history' && <HistoryTable data={historyData.slice(0, 10)} />}
                        {activeDetailView === 'qc' && <QcTable data={qcData} />} {/* <-- TAMBAHKAN INI */}
                        {activeDetailView === 'kpi' &&
                            <KpiTable
                                data={kpiData}
                                accountOfficers={accountOfficers}
                                openModal={openModal}
                            />
                        }
                    </div>
                </div>

                {/* --- PERUBAHAN 3: Kolom Kanan diberi 1 dari 4 bagian --- */}
                <div className="lg:col-span-1 space-y-6">
                    <DetailsCard totals={detailsTotals} segment={currentSegment} period={new Date(period + '-02').toLocaleString('id-ID', { month: 'long', year: 'numeric' })} />
                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <h3 className="font-semibold text-lg text-gray-800">Unggah Data Mentah</h3>
                        <p className="text-gray-500 mt-1 text-sm">Unggah Dokumen (xlsx, xls, csv) untuk memperbarui data.</p>
                        <form onSubmit={handleUploadSubmit} className="mt-4 space-y-4">
                            <div>
                                <input type="file" className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" onChange={(e) => setUploadData('document', e.target.files[0])} disabled={processing} />
                                {errors.document && <p className="text-red-500 text-xs mt-1">{errors.document}</p>}
                            </div>
                            {progressStates.mentah !== null && (
                                <ProgressBar progress={progressStates.mentah} text="Memproses file..." />
                            )}
                            <div className="flex items-center gap-4">
                                <button type="submit" disabled={processing} className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 disabled:bg-blue-400">
                                    {processing ? 'Mengunggah...' : 'Unggah Dokumen'}
                                </button>
                                {processing && (
                                    <button type="button" onClick={() => cancel()} className="px-4 py-2 bg-red-600 text-white font-semibold rounded-md hover:bg-red-700">
                                        Batal
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>
                    <EditReportForm currentSegment={currentSegment} reportData={reportData} period={period} />
                    {/* === KELOMPOK PROSES ORDER COMPLETE === */}
                    <CollapsibleCard
                        title="Proses Order Complete"
                        isExpanded={isCompleteSectionExpanded}
                        onToggle={() => setIsCompleteSectionExpanded(!isCompleteSectionExpanded)}
                    >
                        {/* CARD UNGGAH ORDER COMPLETE */}
                        <div className="bg-gray-50 p-4 rounded-md">
                            <h3 className="font-semibold text-lg text-gray-800">Unggah Order Complete</h3>
                            <p className="text-gray-500 mt-1 text-sm">Unggah file excel untuk dimasukkan ke tabel sementara.</p>
                            <form onSubmit={submitCompleteFile} className="mt-4 space-y-4">
                                <div>
                                    <div>
                                        <input
                                            type="file"
                                            name="complete_document"
                                            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                                            onChange={(e) => setCompleteData('complete_document', e.target.files[0])}
                                            disabled={completeProcessing}
                                        />
                                        {completeErrors.complete_document && <p className="text-green-700 text-xs mt-1">{completeErrors.complete_document}</p>}
                                    </div>
                                    {progressStates.complete !== null && (
                                        <ProgressBar progress={progressStates.complete} text="Memproses file..." />
                                    )}
                                </div>

                                {/*completeProgress && Progress bar*/}

                                <PrimaryButton
                                    type="submit"
                                    className="bg-green-600 hover:bg-green-700 focus:bg-green-700 active:bg-green-800"
                                    // PERBAIKAN DI SINI: Gunakan 'completeProcessing' bukan 'processing'
                                    disabled={completeProcessing}>
                                    {completeProcessing ? 'Memproses...' : 'Proses File Complete'}
                                </PrimaryButton>
                            </form>
                        </div>

                        {/* CARD SINKRONISASI DATA COMPLETE */}
                        <div className="bg-gray-50 p-4 rounded-md">
                            <h3 className="font-semibold text-lg text-gray-800">Sinkronisasi Data</h3>
                            <PrimaryButton onClick={handleSyncClick} className="mt-4 w-full justify-center bg-purple-600 ...">
                                Jalankan Sinkronisasi Order Complete
                            </PrimaryButton>
                        </div>
                    </CollapsibleCard>
                    <CollapsibleCard
                        title="Proses Order Cancel"
                        isExpanded={isCancelSectionExpanded}
                        onToggle={() => setIsCancelSectionExpanded(!isCancelSectionExpanded)}
                    >
                        {/* CARD UNGGAH ORDER CANCEL */}
                        <div className="bg-white p-6 rounded-lg shadow-md">
                            <h3 className="font-semibold text-lg text-gray-800">Unggah Order Cancel</h3>
                            <p className="text-gray-500 mt-1 text-sm">Unggah file excel berisi order yang akan di-cancel.</p>
                            <form onSubmit={submitCancelFile} className="mt-4 space-y-4">
                                <div>
                                    <input
                                        type="file"
                                        name="cancel_document"
                                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100"
                                        onChange={(e) => setCancelData('cancel_document', e.target.files[0])}
                                        disabled={cancelProcessing}
                                    />
                                    {cancelErrors.cancel_document && <p className="text-red-500 text-xs mt-1">{cancelErrors.cancel_document}</p>}
                                </div>
                                {progressStates.cancel !== null && (
                                    <ProgressBar progress={progressStates.cancel} text="Memproses file..." />
                                )}
                                <PrimaryButton
                                    type="submit"
                                    className="bg-red-600 hover:bg-red-700 focus:bg-red-700 active:bg-red-800"
                                    disabled={cancelProcessing}>
                                    {cancelProcessing ? 'Memproses...' : 'Proses File Cancel'}
                                </PrimaryButton>
                            </form>
                        </div>

                        {/* CARD SINKRONISASI DATA CANCEL */}
                        <div className="bg-white p-6 rounded-lg shadow-md">
                            <h3 className="font-semibold text-lg text-gray-800">Sinkronisasi Data Cancel</h3>
                            <p className="text-gray-500 mt-1 text-sm">
                                Jalankan proses update status pada data "In Progress" menjadi "Cancel".
                            </p>
                            <PrimaryButton
                                onClick={handleSyncCancelClick}
                                className="mt-4 w-full justify-center bg-orange-600 hover:bg-orange-700 focus:bg-orange-700 active:bg-orange-800"
                            >
                                Jalankan Sinkronisasi Order Cancel
                            </PrimaryButton>
                        </div>
                    </CollapsibleCard>
                </div>
            </div>
            <AgentFormModal isOpen={isModalOpen} onClose={closeModal} agent={editingAgent} />
        </AuthenticatedLayout>
    );
}
