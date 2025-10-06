import React, { useEffect, useMemo, useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, usePage, router, Link } from '@inertiajs/react';
import InputLabel from '@/Components/InputLabel';
import InputError from '@/Components/InputError';
import PrimaryButton from '@/Components/PrimaryButton';
import axios from 'axios';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// ===================================================================
// Helper & Utility Components
// ===================================================================

const Pagination = ({ links = [] }) => {
    if (links.length <= 3) return null;

    return (
        <div className="flex flex-wrap justify-center items-center mt-4 space-x-1">
            {links.map((link, index) => (
                <Link
                    key={index}
                    href={link.url ?? '#'}
                    className={`px-3 py-2 text-sm border rounded hover:bg-blue-600 hover:text-white transition-colors ${link.active ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'} ${!link.url ? 'text-gray-400 cursor-not-allowed' : ''}`}
                    dangerouslySetInnerHTML={{ __html: link.label }}
                    preserveScroll
                    preserveState
                />
            ))}
        </div>
    );
};


const formatPercent = (value) => {
    const num = Number(value);
    if (!isFinite(num) || num === 0) return '0.0%';
    return `${num.toFixed(1)}%`;
};
const formatRupiah = (value, decimals = 2) => (Number(value) || 0).toFixed(decimals);
const formatNumber = (value) => Number(value) || 0;
const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('id-ID', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
};

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


// ===================================================================
// Form Components
// ===================================================================

const EditReportForm = ({ currentSegment, reportData, period }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    const witelList = useMemo(() => {
        if (!Array.isArray(reportData)) return [];
        return Array.from(new Set(reportData.map(item => item.nama_witel)));
    }, [reportData]);

    // Definisikan produk untuk label dan input agar lebih rapi
    const products = [
        { key: 'n', label: 'Netmonk' },
        { key: 'o', label: 'OCA' },
        { key: 'ae', label: 'Antares' },
        { key: 'ps', label: 'Pijar Sekolah' }
    ];

    const { data, setData, post, processing, errors } = useForm({
        targets: {},
        segment: currentSegment,
        period: period + '-01',
    });

    // ... (useEffect dan fungsi lainnya tetap sama) ...
    useEffect(() => {
        const initialTargets = {};
        reportData.forEach(item => {
            initialTargets[item.nama_witel] = {
                prov_comp: {
                    n: item.prov_comp_n_target || 0, o: item.prov_comp_o_target || 0,
                    ae: item.prov_comp_ae_target || 0, ps: item.prov_comp_ps_target || 0,
                },
                revenue: {
                    n: item.revenue_n_target || 0, o: item.revenue_o_target || 0,
                    ae: item.revenue_ae_target || 0, ps: item.revenue_ps_target || 0,
                }
            };
        });
        setData(currentData => ({ ...currentData, targets: initialTargets }));
    }, [reportData]);

    useEffect(() => {
        setData(currentData => ({ ...currentData, segment: currentSegment, period: period + '-01' }));
    }, [currentSegment, period]);

    function submit(e) {
        e.preventDefault();
        post(route('analysisDigitalProduct.targets'), { preserveScroll: true, });
    }

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
    // ===================================================================

    return (
        <form onSubmit={submit} className="bg-white p-6 rounded-lg shadow-md text-sm">
            <div className="flex justify-between items-center cursor-pointer mb-4" onClick={() => setIsExpanded(!isExpanded)}>
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

                                    {/* TAMBAHKAN LABEL DI SINI */}
                                    <div className="grid grid-cols-4 gap-2 mt-2 mb-1 px-1">
                                        {products.map(p => (
                                            <label key={p.key} className="text-xs font-semibold text-gray-500">{p.label}</label>
                                        ))}
                                    </div>

                                    <div className="grid grid-cols-4 gap-2">
                                        {products.map(p => (
                                            <input
                                                key={p.key}
                                                type="number"
                                                value={data.targets[witel]?.prov_comp?.[p.key] ?? ''}
                                                onChange={e => handleInputChange(witel, 'prov_comp', p.key, e.target.value)}
                                                placeholder={p.label}
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

                                {/* TAMBAHKAN LABEL DI SINI JUGA */}
                                <div className="grid grid-cols-4 gap-2 mt-2 mb-1 px-1">
                                    {products.map(p => (
                                        <label key={p.key} className="text-xs font-semibold text-gray-500">{p.label}</label>
                                    ))}
                                </div>

                                <div className="grid grid-cols-4 gap-2">
                                    {products.map(p => (
                                        <input
                                            key={p.key}
                                            type="number"
                                            step="0.01"
                                            value={data.targets[witel]?.revenue?.[p.key] ?? ''}
                                            onChange={e => handleInputChange(witel, 'revenue', p.key, e.target.value)}
                                            placeholder={p.label}
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
    }, [agent, isOpen]);

    const handleSubmit = (e) => {
        e.preventDefault();
        const onSuccess = () => {
            onClose();
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

// ===================================================================
// Main Table Components
// ===================================================================

const SmeReportTable = ({ data = [], decimalPlaces, tableConfig, setTableConfig }) => {
    const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

    const findColumnDefinition = (keyToFind) => {
        for (const group of tableConfig) {
            for (const col of group.columns) {
                if (col.key === keyToFind) return { colDef: col, parentColDef: null };
                if (col.subColumns) {
                    for (const subCol of col.subColumns) {
                        if ((col.key + subCol.key) === keyToFind) {
                            return { colDef: subCol, parentColDef: col };
                        }
                    }
                }
            }
        }
        return { colDef: null, parentColDef: null };
    };

    const getCellValue = (item, columnDef, parentColumnDef = null) => {
        const fullKey = parentColumnDef ? parentColumnDef.key + columnDef.key : columnDef.key;

        if (columnDef.type === 'calculation') {
            const { operation, operands } = columnDef.calculation;
            const values = operands.map(opKey => {
                const { colDef: opDef, parentColDef: opParentDef } = findColumnDefinition(opKey);
                if (!opDef) return 0;
                return opDef.type === 'calculation'
                    ? getCellValue(item, opDef, opParentDef)
                    : formatNumber(item[opKey]);
            });

            switch (operation) {
                case 'percentage':
                    const [numerator, denominator] = values;
                    if (denominator === 0) return formatPercent(0);
                    return formatPercent((numerator / denominator) * 100);
                case 'sum':
                    return formatNumber(values.reduce((a, b) => a + b, 0));
                case 'average':
                    if (values.length === 0) return 0;
                    return formatNumber(values.reduce((a, b) => a + b, 0) / values.length);
                case 'count':
                    return values.filter(v => v !== 0).length;
                default:
                    return 'N/A';
            }
        }

        if (fullKey.startsWith('revenue_')) {
            return formatRupiah(item[fullKey], decimalPlaces);
        }
        return formatNumber(item[fullKey]);
    };

    const totals = useMemo(() => {
        const initialTotals = {};
        tableConfig.forEach(group => {
            group.columns.forEach(col => {
                if (col.subColumns) {
                    col.subColumns.forEach(sc => {
                        if (sc.type !== 'calculation') {
                            const key = col.key + sc.key;
                            initialTotals[key] = data.reduce((sum, item) => sum + formatNumber(item[key]), 0);
                        }
                    });
                } else if (col.type !== 'calculation') {
                    const key = col.key;
                    initialTotals[key] = data.reduce((sum, item) => sum + formatNumber(item[key]), 0);
                }
            });
        });
        return initialTotals;
    }, [data, tableConfig]);

    const handleDragEnd = (event) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const activeType = active.data.current?.type;
        const overType = over.data.current?.type;

        if (activeType === 'group' && overType === 'group') {
            setTableConfig((config) => {
                const oldIndex = config.findIndex(g => g.groupTitle === active.id);
                const newIndex = config.findIndex(g => g.groupTitle === over.id);
                return arrayMove(config, oldIndex, newIndex);
            });
        } else if (activeType === 'column' && overType === 'column') {
            const parentGroupTitle = active.data.current?.parentGroupTitle;
            const overParentGroupTitle = over.data.current?.parentGroupTitle;

            if (parentGroupTitle !== overParentGroupTitle) return;

            setTableConfig((config) => {
                const newConfig = JSON.parse(JSON.stringify(config));
                const group = newConfig.find(g => g.groupTitle === parentGroupTitle);
                if (!group) return config;

                const getColKey = (id) => id.toString().split('.').pop();
                const activeColKey = getColKey(active.id);
                const overColKey = getColKey(over.id);

                const oldIndex = group.columns.findIndex(c => c.key === activeColKey);
                const newIndex = group.columns.findIndex(c => c.key === overColKey);

                if (oldIndex !== -1 && newIndex !== -1) {
                    group.columns = arrayMove(group.columns, oldIndex, newIndex);
                }

                return newConfig;
            });
        }
    };

    const DraggableHeaderCell = ({ group }) => {
        const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: group.groupTitle, data: { type: 'group' } });
        const style = { transform: CSS.Transform.toString(transform), transition };
        const colSpan = group.columns.reduce((sum, col) => sum + (col.subColumns?.length || 1), 0);

        return (
            <th ref={setNodeRef} style={style} {...attributes} {...listeners} className={`border p-2 ${group.groupClass} cursor-grab`} colSpan={colSpan}>
                {group.groupTitle}
            </th>
        );
    };

    const DraggableColumnHeader = ({ group, col }) => {
        const uniqueId = `${group.groupTitle}.${col.key}`;
        const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
            id: uniqueId,
            data: { type: 'column', parentGroupTitle: group.groupTitle }
        });
        const style = { transform: CSS.Transform.toString(transform), transition };
        return (
            <th ref={setNodeRef} style={style} {...attributes} {...listeners} key={col.key} className={`border p-2 ${group.columnClass || 'bg-gray-700'} cursor-grab`} colSpan={col.subColumns?.length || 1} rowSpan={col.subColumns ? 1 : 2}>
                {col.title}
            </th>
        );
    };

    return (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <div className="overflow-x-auto text-xs">
                <table className="w-full border-collapse text-center">
                    <thead className="bg-gray-800 text-white">
                        <tr>
                            <th className="border p-2 align-middle" rowSpan={3}>WILAYAH TELKOM</th>
                            <SortableContext items={tableConfig.map(g => g.groupTitle)} strategy={horizontalListSortingStrategy}>
                                {tableConfig.map(group => <DraggableHeaderCell key={group.groupTitle} group={group} />)}
                            </SortableContext>
                        </tr>
                        <tr className="font-semibold">
                            {tableConfig.map(group => (
                                <SortableContext key={`${group.groupTitle}-cols`} items={group.columns.map(c => `${group.groupTitle}.${c.key}`)} strategy={horizontalListSortingStrategy}>
                                    {group.columns.map(col => (
                                        <DraggableColumnHeader key={col.key} group={group} col={col} />
                                    ))}
                                </SortableContext>
                            ))}
                        </tr>
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
                        {data.length > 0 ? data.map(item => (
                            <tr key={item.nama_witel} className="bg-white hover:bg-gray-50 text-black">
                                <td className="border p-2 font-semibold text-left">{item.nama_witel}</td>
                                {tableConfig.map(group =>
                                    group.columns.map(col =>
                                        col.subColumns ? (
                                            col.subColumns.map(subCol => (
                                                <td key={`${item.nama_witel}-${col.key}-${subCol.key}`} className={`border p-2 ${subCol.cellClassName || ''}`}>
                                                    {getCellValue(item, subCol, col)}
                                                </td>
                                            ))
                                        ) : (
                                            <td key={`${item.nama_witel}-${col.key}`} className={`border p-2 ${col.cellClassName || ''}`}>
                                                {getCellValue(item, col)}
                                            </td>
                                        )
                                    )
                                )}
                            </tr>
                        )) : (
                            <tr><td colSpan={100} className="text-center p-4 border text-gray-500">Tidak ada data.</td></tr>
                        )}
                        <tr className="font-bold text-white">
                            <td className="border p-2 text-left bg-gray-800">GRAND TOTAL</td>
                            {tableConfig.map(group =>
                                group.columns.map(col =>
                                    col.subColumns ? (
                                        col.subColumns.map(subCol => (
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
        </DndContext>
    );
};

const InProgressTable = ({ dataPaginator = { data: [], links: [], from: 0 } }) => {
    const handleCompleteClick = (orderId) => {
        router.put(route('manual.update.complete', { order_id: orderId }), {}, { preserveScroll: true, onSuccess: () => router.reload({ preserveState: false }) });
    };
    const handleCancelClick = (orderId) => {
        router.put(route('manual.update.cancel', { order_id: orderId }), {}, { preserveScroll: true, onSuccess: () => router.reload({ preserveState: false }) });
    };
    return (
        <>
            <div className="overflow-x-auto text-sm">
                <table className="w-full">
                    <thead className="bg-gray-50">
                        <tr className="text-left font-semibold text-gray-600">
                            <th className="p-3">No.</th><th className="p-3">Milestone</th><th className="p-3">Status Order</th><th className="p-3">Product Name</th><th className="p-3">Order ID</th><th className="p-3">Witel</th><th className="p-3">Customer Name</th><th className="p-3">Order Created Date</th><th className="p-3 text-center">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y bg-white">
                        {dataPaginator.data.length > 0 ? dataPaginator.data.map((item, index) => (
                            <tr key={item.order_id} className="text-gray-700 hover:bg-gray-50">
                                <td className="p-3">{dataPaginator.from + index}</td>
                                <td className="p-3">{item.milestone}</td>
                                <td className="p-3 whitespace-nowrap"><span className="px-2 py-1 font-semibold leading-tight text-blue-700 bg-blue-100 rounded-full">{item.order_status_n}</span></td>
                                <td className="p-3">{item.product_name ?? item.product}</td><td className="p-3 font-mono">{item.order_id}</td><td className="p-3">{item.nama_witel}</td><td className="p-3">{item.customer_name}</td><td className="p-3">{formatDate(item.order_created_date)}</td>
                                <td className="p-3 text-center">
                                    <div className="flex justify-center items-center gap-2">
                                        <button onClick={() => handleCompleteClick(item.order_id)} className="px-3 py-1 text-xs font-bold text-white bg-green-500 rounded-md hover:bg-green-600">COMPLETE</button>
                                        <button onClick={() => handleCancelClick(item.order_id)} className="px-3 py-1 text-xs font-bold text-white bg-red-500 rounded-md hover:bg-red-600">CANCEL</button>
                                    </div>
                                </td>
                            </tr>
                        )) : (<tr><td colSpan="9" className="p-4 text-center text-gray-500">Tidak ada data yang sesuai dengan filter.</td></tr>)}
                    </tbody>
                </table>
            </div>
            <Pagination links={dataPaginator.links} />
        </>
    );
};

const CompleteTable = ({ dataPaginator = { data: [], links: [] } }) => {
    const handleSetInProgress = (orderId) => { if (confirm(`Anda yakin ingin mengembalikan Order ID ${orderId} ke status "In Progress"?`)) { router.put(route('complete.update.progress', { documentData: orderId }), {}, { preserveScroll: true, onSuccess: () => router.reload({ preserveState: false }) }); } };
    const handleSetCancel = (orderId) => { if (confirm(`Anda yakin ingin mengubah status Order ID ${orderId} menjadi "Cancel"?`)) { router.put(route('complete.update.cancel', { documentData: orderId }), {}, { preserveScroll: true, onSuccess: () => router.reload({ preserveState: false }) }); } };

    // [TAMBAHKAN] Fungsi baru untuk mengirim order ke QC
    const handleSetQc = (orderId) => {
        if (confirm(`Anda yakin ingin mengirim Order ID ${orderId} kembali ke proses QC? Status WFM akan dikosongkan.`)) {
            router.put(route('complete.update.qc', { documentData: orderId }), {}, { preserveScroll: true, onSuccess: () => router.reload({ preserveState: false }) });
        }
    };

    return (
        <>
            <div className="overflow-x-auto text-sm">
                <p className="text-gray-500 mb-2">Menampilkan data order yang sudah berstatus "Complete".</p>
                <table className="w-full">
                    <thead className="bg-gray-50">
                        <tr className="text-left font-semibold text-gray-600">
                            <th className="p-3">No.</th><th className="p-3">Milestone</th><th className="p-3">Order ID</th><th className="p-3">Product Name</th><th className="p-3">Witel</th><th className="p-3">Customer Name</th><th className="p-3">Update Time</th><th className="p-3 text-center">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y bg-white">
                        {dataPaginator.data.length > 0 ? dataPaginator.data.map((item, index) => (
                            <tr key={item.order_id} className="text-gray-700 hover:bg-gray-50">
                                <td className="p-3">{dataPaginator.from + index}</td><td className="p-3">{item.milestone}</td><td className="p-3 font-mono">{item.order_id}</td><td className="p-3">{item.product_name ?? item.product}</td><td className="p-3">{item.nama_witel}</td><td className="p-3">{item.customer_name}</td><td className="p-3">{formatDate(item.updated_at)}</td>
                                <td className="p-3 text-center">
                                    <div className="flex justify-center items-center gap-2">
                                        <button onClick={() => handleSetInProgress(item.order_id)} className="px-3 py-1 text-xs font-bold text-white bg-blue-500 rounded-md hover:bg-blue-600">Ke In Progress</button>

                                        {/* [TAMBAHKAN] Tombol baru "Kirim ke QC" */}
                                        <button onClick={() => handleSetQc(item.order_id)} className="px-3 py-1 text-xs font-bold text-white bg-yellow-500 rounded-md hover:bg-yellow-600">Kirim ke QC</button>

                                        <button onClick={() => handleSetCancel(item.order_id)} className="px-3 py-1 text-xs font-bold text-white bg-red-500 rounded-md hover:bg-red-600">Ke Cancel</button>
                                    </div>
                                </td>
                            </tr>
                        )) : (<tr><td colSpan="8" className="p-4 text-center text-gray-500">Tidak ada data Complete saat ini.</td></tr>)}
                    </tbody>
                </table>
            </div>
            <Pagination links={dataPaginator.links} />
        </>
    );
};

// GANTI SELURUH KOMPONEN QcTable ANDA DENGAN INI
const QcTable = ({ dataPaginator = { data: [], links: [], from: 0 } }) => {
    // ... (fungsi-fungsi handler Anda biarkan sama)
    const handleSetInProgress = (orderId) => { /* ... */ };
    const handleSetDone = (orderId) => { /* ... */ };
    const handleSetCancel = (orderId) => { /* ... */ };

    return (
        <>
            <div className="overflow-x-auto text-sm">
                <p className="text-gray-500 mb-2">Menampilkan data order yang sedang dalam proses Quality Control (QC).</p>
                <table className="w-full">
                    <thead className="bg-gray-50">
                        {/* ... (kode thead Anda) ... */}
                    </thead>
                    <tbody className="divide-y bg-white">
                        {dataPaginator.data.length > 0 ? dataPaginator.data.map((item, index) => (
                            // [FIX] Tambahkan key={item.id} yang unik pada elemen <tr>
                            <tr key={item.id} className="text-gray-700 hover:bg-gray-50">
                                <td className="p-3">{dataPaginator.from + index}</td>
                                <td className="p-3">{item.milestone}</td>
                                <td className="p-3 font-mono">{item.order_id}</td>
                                <td className="p-3">{item.product}</td>
                                <td className="p-3">{item.nama_witel}</td>
                                <td className="p-3">{item.customer_name}</td>
                                <td className="p-3">{formatDate(item.updated_at)}</td>
                                <td className="p-3 text-center">
                                    <div className="flex justify-center items-center gap-2">
                                        <button onClick={() => handleSetInProgress(item.order_id)} className="px-3 py-1 text-xs font-bold text-white bg-blue-500 rounded-md hover:bg-blue-600">In Progress</button>
                                        <button onClick={() => handleSetDone(item.order_id)} className="px-3 py-1 text-xs font-bold text-white bg-green-500 rounded-md hover:bg-green-600">Done Bima</button>
                                        <button onClick={() => handleSetCancel(item.order_id)} className="px-3 py-1 text-xs font-bold text-white bg-red-500 rounded-md hover:bg-red-600">Cancel</button>
                                    </div>
                                </td>
                            </tr>
                        )) : (<tr><td colSpan="8" className="p-4 text-center text-gray-500">Tidak ada data QC saat ini.</td></tr>)}
                    </tbody>
                </table>
            </div>
            <Pagination links={dataPaginator.links} />
        </>
    );
};

// GANTI SELURUH KOMPONEN HistoryTable ANDA DENGAN INI
const HistoryTable = ({ historyData = { data: [], links: [] } }) => { // <-- Menerima objek historyData
    const formatDateFull = (dateString) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleString('id-ID', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
    };
    const StatusChip = ({ text }) => {
        const lowerText = text.toLowerCase();
        let colorClasses = 'bg-gray-100 text-gray-800';
        if (lowerText.includes('progress')) { colorClasses = 'bg-blue-100 text-blue-800'; }
        else if (lowerText.includes('bima')) { colorClasses = 'bg-green-100 text-green-800'; }
        else if (lowerText.includes('cancel')) { colorClasses = 'bg-red-100 text-red-800'; }
        return (<span className={`px-2 py-1 text-xs font-semibold leading-tight rounded-full ${colorClasses}`}>{text}</span>);
    };
    return (
        <div className="overflow-x-auto text-sm">
            {historyData.data.length > 0 &&
                <p className="text-gray-500 mb-2">Menampilkan data histori update.</p>
            }
            <table className="w-full whitespace-nowrap">
                <thead className="bg-gray-50">
                    <tr className="text-left font-semibold text-gray-600">
                        <th className="p-3">Waktu Update</th><th className="p-3">Order ID</th><th className="p-3">Customer</th><th className="p-3">Witel</th><th className="p-3">Status Lama</th><th className="p-3">Status Baru</th><th className="p-3">Sumber</th>
                    </tr>
                </thead>
                <tbody className="divide-y bg-white">
                    {/* Mengakses array .data dari historyData */}
                    {historyData.data.length > 0 ? historyData.data.map((item) => (
                        <tr key={item.id} className="text-gray-700 hover:bg-gray-50">
                            <td className="p-3 font-semibold">{formatDateFull(item.created_at)}</td><td className="p-3 font-mono">{item.order_id}</td><td className="p-3">{item.customer_name}</td><td className="p-3">{item.nama_witel}</td><td className="p-3"><StatusChip text={item.status_lama} /></td><td className="p-3"><StatusChip text={item.status_baru} /></td><td className="p-3 font-medium text-gray-600">{item.sumber_update}</td>
                        </tr>
                    )) : (
                        <tr><td colSpan="7" className="p-4 text-center text-gray-500">Belum ada histori update yang tercatat.</td></tr>
                    )}
                </tbody>
            </table>
            <Pagination links={historyData.links} />
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
                    {/* [FIX] Tambahkan .filter(Boolean) untuk membuang data null sebelum mapping */}
                    {data.filter(Boolean).map((po) => (
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
                                <button onClick={() => openModal(accountOfficers.find(a => a.id === po.id))} className="text-indigo-600 hover:text-indigo-900 text-xs font-semibold">Edit</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

// ===================================================================
// Table Configurator Component
// ===================================================================

const TableConfigurator = ({ tableConfig, setTableConfig, currentSegment }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [formState, setFormState] = useState({
        mode: 'sub-column',
        groupTitle: tableConfig[0]?.groupTitle || '',
        columnTitle: '',
        columnType: 'calculation',
        operation: 'sum',
        operands: [],
        initialSubColumnTitle: 'Value',
    });
    const [editGroup, setEditGroup] = useState({
        title: tableConfig[0]?.groupTitle || '',
        className: tableConfig[0]?.groupClass || '',
    });
    const [columnToDelete, setColumnToDelete] = useState('');

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
        return columns.sort((a, b) => a.label.localeCompare(b.label));
    }, [tableConfig]);

    const deletableColumns = useMemo(() => {
        const columns = [];
        tableConfig.forEach(group => {
            group.columns.forEach(col => {
                if (col.subColumns && col.subColumns.length > 0) {
                    col.subColumns.forEach(sc => {
                        columns.push({ label: `${group.groupTitle} > ${col.title} > ${sc.title}`, value: `${group.groupTitle}.${col.key}.${sc.key}` });
                    });
                } else {
                    columns.push({ label: `${group.groupTitle} > ${col.title}`, value: `${group.groupTitle}.${col.key}` });
                }
            });
        });
        return columns;
    }, [tableConfig]);

    useEffect(() => {
        const currentGroupExists = tableConfig.some(g => g.groupTitle === editGroup.title);
        if (!currentGroupExists && tableConfig.length > 0) {
            setEditGroup({ title: tableConfig[0].groupTitle, className: tableConfig[0].groupClass || '' });
        }
        const currentFormGroupExists = tableConfig.some(g => g.groupTitle === formState.groupTitle);
        if (!currentFormGroupExists && tableConfig.length > 0) {
            setFormState(prev => ({ ...prev, groupTitle: tableConfig[0].groupTitle }));
        }
        if (deletableColumns.length > 0) {
            const selectionExists = deletableColumns.some(c => c.value === columnToDelete);
            if (!selectionExists) {
                setColumnToDelete(deletableColumns[0].value);
            }
        } else {
            setColumnToDelete('');
        }
    }, [tableConfig, deletableColumns, columnToDelete, editGroup.title, formState.groupTitle]);

    const handleResetConfig = () => {
        if (confirm("Anda yakin ingin mengembalikan tampilan tabel ke pengaturan awal? Semua kolom tambahan, urutan, dan perubahan warna akan hilang.")) {
            // Buat kunci dinamis berdasarkan segmen yang aktif
            const storageKey = `userTableConfig_${currentSegment}`;
            // Hapus kunci yang benar dari localStorage
            localStorage.removeItem(storageKey);
            // Muat ulang halaman
            window.location.reload();
        }
    };

    const handleDeleteColumn = () => {
        if (!columnToDelete) {
            alert("Silakan pilih kolom yang akan dihapus.");
            return;
        }
        const selectedColumnLabel = deletableColumns.find(c => c.value === columnToDelete)?.label;
        if (confirm(`Anda yakin ingin menghapus kolom "${selectedColumnLabel}"? Aksi ini tidak dapat dibatalkan.`)) {
            const [groupTitle, colKey, subColKey] = columnToDelete.split('.');
            const newConfig = JSON.parse(JSON.stringify(tableConfig));
            const targetGroup = newConfig.find(g => g.groupTitle === groupTitle);
            if (targetGroup) {
                if (subColKey) {
                    const targetCol = targetGroup.columns.find(c => c.key === colKey);
                    if (targetCol && targetCol.subColumns) {
                        targetCol.subColumns = targetCol.subColumns.filter(sc => sc.key !== subColKey);
                        if (targetCol.subColumns.length === 0) {
                            targetGroup.columns = targetGroup.columns.filter(c => c.key !== colKey);
                        }
                    }
                } else {
                    targetGroup.columns = targetGroup.columns.filter(c => c.key !== colKey);
                }

                if (targetGroup.columns.length === 0) {
                    const finalConfig = newConfig.filter(g => g.groupTitle !== groupTitle);
                    setTableConfig(finalConfig);
                } else {
                    setTableConfig(newConfig);
                }
                alert("Kolom berhasil dihapus.");
            }
        }
    };

    const handleInputChange = (e) => {
        const { name, value, type } = e.target;
        if (type === 'radio' && name === 'mode') {
            setFormState(prev => ({ ...prev, mode: value, columnTitle: '', operands: [], columnType: 'calculation' }));
        } else {
            setFormState(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleOperandChange = (index, value) => {
        setFormState(prev => {
            const newOperands = [...(prev.operands || [])];
            newOperands[index] = value;
            return { ...prev, operands: newOperands };
        });
    };

    const handleCheckboxOperandChange = (checked, value) => {
        setFormState(prev => {
            const currentOperands = prev.operands || [];
            if (checked) {
                return { ...prev, operands: [...currentOperands, value] };
            } else {
                return { ...prev, operands: currentOperands.filter(op => op !== value) };
            }
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (formState.mode === 'group-column') {
            const newGroupObject = {
                groupTitle: formState.columnTitle,
                groupClass: 'bg-purple-600',
                columnClass: 'bg-purple-500', // Warna turunan default
                subColumnClass: 'bg-purple-400', // Warna turunan default
                columns: [{
                    key: `_${formState.initialSubColumnTitle.toLowerCase().replace(/\s+/g, '_')}`,
                    title: formState.initialSubColumnTitle,
                    type: 'data'
                }],
            };
            setTableConfig(prev => [...prev, newGroupObject]);
            alert(`Grup kolom "${formState.columnTitle}" berhasil ditambahkan.`);
        } else {
            const newColumnKey = `_${formState.columnTitle.toLowerCase().replace(/\s+/g, '_')}`;
            const newConfig = JSON.parse(JSON.stringify(tableConfig));
            const targetGroup = newConfig.find(g => g.groupTitle === formState.groupTitle);
            if (targetGroup) {
                let newColumnDef = {
                    key: newColumnKey,
                    title: formState.columnTitle,
                    type: formState.columnType
                };
                if (formState.columnType === 'calculation') {
                    if (formState.operation === 'percentage' && (formState.operands.length < 2 || !formState.operands[0] || !formState.operands[1])) {
                        alert('Untuk Persentase, harap pilih kolom Pembilang dan Penyebut.');
                        return;
                    }
                    if (['sum', 'average', 'count'].includes(formState.operation) && formState.operands.length === 0) {
                        alert(`Untuk operasi ${formState.operation.toUpperCase()}, harap pilih minimal satu kolom.`);
                        return;
                    }
                    newColumnDef.calculation = { operation: formState.operation, operands: formState.operands };
                }
                targetGroup.columns.push(newColumnDef);
                setTableConfig(newConfig);
                alert(`Sub-kolom "${formState.columnTitle}" berhasil ditambahkan ke grup "${formState.groupTitle}".`);
            }
        }
    };

    const handleSelectGroupToEdit = (e) => {
        const selectedTitle = e.target.value;
        const groupToEdit = tableConfig.find(g => g.groupTitle === selectedTitle);
        if (groupToEdit) {
            setEditGroup({ title: groupToEdit.groupTitle, className: groupToEdit.groupClass || '' });
        }
    };

    /**
     * Menyesuaikan tingkat kecerahan dari kelas warna Tailwind.
     * @param {string} className - Kelas CSS input, e.g., 'bg-blue-600'.
     * @param {number} amount - Jumlah yang akan ditambah/dikurangi, e.g., -100.
     * @returns {string} Kelas CSS baru atau kelas asli jika tidak valid.
     */
    const adjustTailwindColor = (className, amount) => {
        if (typeof className !== 'string') return className;

        const match = className.match(/(bg|text|border)-(\w+)-(\d{2,3})/);
        if (match) {
            const [, prefix, color, brightnessStr] = match;
            const brightness = parseInt(brightnessStr, 10);
            let newBrightness = brightness + amount;

            // Pastikan nilai tetap dalam rentang valid Tailwind (50-950)
            newBrightness = Math.max(50, Math.min(950, newBrightness));

            return `${prefix}-${color}-${newBrightness}`;
        }
        return className; // Kembalikan kelas asli jika format tidak cocok
    };

    const handleSaveColor = () => {
        const baseClass = editGroup.className;
        const columnClass = adjustTailwindColor(baseClass, -100);
        const subColumnClass = adjustTailwindColor(baseClass, -200);

        const newConfig = tableConfig.map(group => {
            if (group.groupTitle === editGroup.title) {
                return {
                    ...group,
                    groupClass: baseClass,
                    columnClass: columnClass,
                    subColumnClass: subColumnClass
                };
            }
            return group;
        });

        setTableConfig(newConfig);
        alert(`Warna untuk grup "${editGroup.title}" dan turunannya berhasil diubah.`);
    };

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
                                    <input type="checkbox" checked={(formState.operands || []).includes(col.value)} onChange={(e) => handleCheckboxOperandChange(e.target.checked, col.value)} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
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
            default: return null;
        }
    };

    return (
        <div className="bg-white rounded-lg shadow-md mb-6">
            <div className="flex justify-between items-center p-4 cursor-pointer hover:bg-gray-50" onClick={() => setIsExpanded(!isExpanded)}>
                <h3 className="font-semibold text-gray-700">Konfigurasi Tampilan Tabel</h3>
                <button type="button" className="text-sm font-bold text-blue-600 hover:underline">{isExpanded ? 'Tutup' : 'Buka'}</button>
            </div>
            {isExpanded && (
                <div className="p-6 border-t">
                    <div className="flex flex-col md:flex-row md:gap-8">
                        {/* Kolom Kiri */}
                        <div className="flex-grow md:w-2/3">
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Pilih Aksi:</label>
                                    <div className="flex gap-4">
                                        <label className="flex items-center">
                                            <input type="radio" name="mode" value="sub-column" checked={formState.mode === 'sub-column'} onChange={handleInputChange} className="mr-2 h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500" /> Tambah Sub-Kolom
                                        </label>
                                        <label className="flex items-center">
                                            <input type="radio" name="mode" value="group-column" checked={formState.mode === 'group-column'} onChange={handleInputChange} className="mr-2 h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500" /> Tambah Grup Utama
                                        </label>
                                    </div>
                                </div>
                                {formState.mode === 'group-column' && (
                                    <div className="p-4 border rounded-md space-y-4 bg-gray-50">
                                        <h4 className="font-semibold text-md text-gray-800">Detail Grup Utama Baru</h4>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Nama Grup Utama Baru</label>
                                            <input type="text" name="columnTitle" value={formState.columnTitle} onChange={handleInputChange} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm" required />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Nama Sub-Kolom Awal</label>
                                            <input type="text" name="initialSubColumnTitle" value={formState.initialSubColumnTitle} onChange={handleInputChange} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm" required />
                                        </div>
                                    </div>
                                )}
                                {formState.mode === 'sub-column' && (
                                    <div className="p-4 border rounded-md space-y-4 bg-gray-50">
                                        <h4 className="font-semibold text-md text-gray-800">Detail Sub-Kolom Baru</h4>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Tambahkan ke Grup Induk</label>
                                            <select name="groupTitle" value={formState.groupTitle} onChange={handleInputChange} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm">
                                                {tableConfig.map(g => <option key={g.groupTitle} value={g.groupTitle}>{g.groupTitle}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Nama Sub-Kolom Baru</label>
                                            <input type="text" name="columnTitle" value={formState.columnTitle} onChange={handleInputChange} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm" required />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Tipe Kolom:</label>
                                            <div className="flex gap-4">
                                                <label className="flex items-center">
                                                    <input type="radio" name="columnType" value="target" checked={formState.columnType === 'target'} onChange={handleInputChange} className="mr-2" /> Target Manual
                                                </label>
                                                <label className="flex items-center">
                                                    <input type="radio" name="columnType" value="calculation" checked={formState.columnType === 'calculation'} onChange={handleInputChange} className="mr-2" /> Kalkulasi
                                                </label>
                                            </div>
                                        </div>
                                        {formState.columnType === 'calculation' && (
                                            <div className="pt-4 border-t space-y-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700">Operasi Kalkulasi</label>
                                                    <select name="operation" value={formState.operation} onChange={handleInputChange} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm">
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
                                    <PrimaryButton type="submit">{formState.mode === 'sub-column' ? 'Tambah Sub-Kolom' : 'Tambah Grup Kolom'}</PrimaryButton>
                                </div>
                            </form>
                        </div>
                        {/* Kolom Kanan */}
                        <div className="md:w-1/3 pt-6 mt-6 md:pt-0 md:mt-0 md:border-l md:pl-8 space-y-8">
                            <div>
                                <div className="flex justify-between items-center border-b pb-2 mb-4">
                                    <h4 className="font-semibold text-md text-gray-800">Opsi Tampilan</h4>
                                    <button onClick={handleResetConfig} className="text-xs text-red-600 hover:underline font-semibold">Reset Tampilan</button>
                                </div>
                                <div className="space-y-4">
                                    <h5 className="font-semibold text-sm text-gray-700">Ubah Warna Grup</h5>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Pilih Grup</label>
                                        <select value={editGroup.title} onChange={handleSelectGroupToEdit} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm">
                                            {tableConfig.map(g => <option key={g.groupTitle} value={g.groupTitle}>{g.groupTitle}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Kelas Warna Dasar Tailwind CSS</label>
                                        <input type="text" value={editGroup.className} onChange={e => setEditGroup({ ...editGroup, className: e.target.value })} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm" placeholder="Contoh: bg-red-600" />
                                        <p className="mt-1 text-xs text-gray-500">
                                            Warna sub-kolom akan diatur ke kecerahan -100 & -200 secara otomatis.
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <PrimaryButton type="button" onClick={handleSaveColor} className="w-full justify-center">Terapkan Warna</PrimaryButton>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <h5 className="font-semibold text-sm text-gray-700 pt-4 border-t">Hapus Kolom</h5>
                                <div className="space-y-4 mt-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Pilih Kolom untuk Dihapus</label>
                                        <select value={columnToDelete} onChange={e => setColumnToDelete(e.target.value)} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm" disabled={deletableColumns.length === 0}>
                                            {deletableColumns.length > 0 ? (deletableColumns.map(col => <option key={col.value} value={col.value}>{col.label}</option>)) : (<option>Tidak ada kolom untuk dihapus</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <button type="button" onClick={handleDeleteColumn} className="w-full justify-center px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:bg-red-300" disabled={deletableColumns.length === 0}>
                                            Hapus Kolom Terpilih
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const smeTableConfigTemplate = [
    // In Progress (Tetap Sama)
    {
        groupTitle: 'In Progress', groupClass: 'bg-blue-600', columnClass: 'bg-blue-400',
        columns: [
            { key: 'in_progress_n', title: 'N' },
            { key: 'in_progress_o', title: 'O' },
            { key: 'in_progress_ae', title: 'AE' },
            { key: 'in_progress_ps', title: 'PS' }
        ]
    },
    // Prov Comp (Urutan diubah menjadi T, R, P)
    {
        groupTitle: 'Prov Comp', groupClass: 'bg-orange-600', columnClass: 'bg-orange-400', subColumnClass: 'bg-orange-300',
        columns: [
            { key: 'prov_comp_n', title: 'N', subColumns: [{ key: '_target', title: 'T' }, { key: '_realisasi', title: 'R' }, { key: '_percent', title: 'P', type: 'calculation', calculation: { operation: 'percentage', operands: ['prov_comp_n_realisasi', 'prov_comp_n_target'] } }] },
            { key: 'prov_comp_o', title: 'O', subColumns: [{ key: '_target', title: 'T' }, { key: '_realisasi', title: 'R' }, { key: '_percent', title: 'P', type: 'calculation', calculation: { operation: 'percentage', operands: ['prov_comp_o_realisasi', 'prov_comp_o_target'] } }] },
            { key: 'prov_comp_ae', title: 'AE', subColumns: [{ key: '_target', title: 'T' }, { key: '_realisasi', title: 'R' }, { key: '_percent', title: 'P', type: 'calculation', calculation: { operation: 'percentage', operands: ['prov_comp_ae_realisasi', 'prov_comp_ae_target'] } }] },
            { key: 'prov_comp_ps', title: 'PS', subColumns: [{ key: '_target', title: 'T' }, { key: '_realisasi', title: 'R' }, { key: '_percent', title: 'P', type: 'calculation', calculation: { operation: 'percentage', operands: ['prov_comp_ps_realisasi', 'prov_comp_ps_target'] } }] }
        ]
    },
    // REVENUE (Urutan diubah menjadi ACH, T)
    {
        groupTitle: 'REVENUE (Rp Juta)', groupClass: 'bg-green-700', columnClass: 'bg-green-500', subColumnClass: 'bg-green-300',
        columns: [
            { key: 'revenue_n', title: 'N', subColumns: [{ key: '_ach', title: 'ACH' }, { key: '_target', title: 'T' }] },
            { key: 'revenue_o', title: 'O', subColumns: [{ key: '_ach', title: 'ACH' }, { key: '_target', title: 'T' }] },
            { key: 'revenue_ae', title: 'AE', subColumns: [{ key: '_ach', title: 'ACH' }, { key: '_target', title: 'T' }] },
            { key: 'revenue_ps', title: 'PS', subColumns: [{ key: '_ach', title: 'ACH' }, { key: '_target', title: 'T' }] }
        ]
    },
    {
        groupTitle: 'Grand Total', groupClass: 'bg-gray-600', columnClass: 'bg-gray-500',
        columns: [
            { key: 'grand_total_target', title: 'T', type: 'calculation', calculation: { operation: 'sum', operands: ['prov_comp_n_target', 'prov_comp_o_target', 'prov_comp_ae_target', 'prov_comp_ps_target'] } },
            { key: 'grand_total_realisasi', title: 'R', type: 'calculation', calculation: { operation: 'sum', operands: ['prov_comp_n_realisasi', 'prov_comp_o_realisasi', 'prov_comp_ae_realisasi', 'prov_comp_ps_realisasi'] } },
            { key: 'grand_total_persentase', title: 'P', type: 'calculation', calculation: { operation: 'percentage', operands: ['grand_total_realisasi', 'grand_total_target'] } }
        ]
    },
];

const legsTableConfigTemplate = [
    { groupTitle: 'In Progress', groupClass: 'bg-blue-600', columnClass: 'bg-blue-400', columns: [{ key: 'in_progress_n', title: 'N' }, { key: 'in_progress_o', title: 'O' }, { key: 'in_progress_ae', title: 'AE' }, { key: 'in_progress_ps', title: 'PS' }] },
    { groupTitle: 'Prov Comp', groupClass: 'bg-orange-600', columnClass: 'bg-orange-400', columns: [{ key: 'prov_comp_n_realisasi', title: 'N' }, { key: 'prov_comp_o_realisasi', title: 'O' }, { key: 'prov_comp_ae_realisasi', title: 'AE' }, { key: 'prov_comp_ps_realisasi', title: 'PS' }] },
    { groupTitle: 'REVENUE (Rp Juta)', groupClass: 'bg-green-700', columnClass: 'bg-green-500', subColumnClass: 'bg-green-300', columns: [{ key: 'revenue_n', title: 'N', subColumns: [{ key: '_ach', title: 'ACH' }, { key: '_target', title: 'T' }] }, { key: 'revenue_o', title: 'O', subColumns: [{ key: '_ach', title: 'ACH' }, { key: '_target', title: 'T' }] }, { key: 'revenue_ae', title: 'AE', subColumns: [{ key: '_ach', title: 'ACH' }, { key: '_target', title: 'T' }] }, { key: 'revenue_ps', title: 'PS', subColumns: [{ key: '_ach', title: 'ACH' }, { key: '_target', title: 'T' }] }] },
    { groupTitle: 'Grand Total', groupClass: 'bg-purple-600', columnClass: 'bg-purple-500', columns: [{ key: 'grand_total_realisasi_legs', title: 'Total', type: 'calculation', calculation: { operation: 'sum', operands: ['prov_comp_n_realisasi', 'prov_comp_o_realisasi', 'prov_comp_ae_realisasi', 'prov_comp_ps_realisasi'] } }] },
];

const CustomTargetForm = ({ tableConfig, witelList, initialData, period, segment }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    const customTargetColumns = useMemo(() => {
        const targets = [];
        tableConfig.forEach(group => {
            group.columns.forEach(col => {
                if (col.type === 'target') {
                    targets.push({ key: col.key, title: col.title });
                }
            });
        });
        return targets;
    }, [tableConfig]);

    const { data, setData, post, processing, errors } = useForm({
        targets: {},
        period: period,
        segment: segment,
    });

    useEffect(() => {
        setData('targets', initialData || {});
    }, [initialData]);

    const handleInputChange = (targetKey, witel, value) => {
        setData('targets', {
            ...data.targets,
            [targetKey]: {
                ...data.targets[targetKey],
                [witel]: value,
            }
        });
    };

    function submit(e) {
        e.preventDefault();
        post(route('analysisDigitalProduct.saveCustomTargets'), {
            preserveScroll: true,
        });
    }

    if (customTargetColumns.length === 0) {
        return null;
    }

    return (
        <form onSubmit={submit} className="bg-white p-6 rounded-lg shadow-md text-sm">
            <div className="flex justify-between items-center cursor-pointer mb-4" onClick={() => setIsExpanded(!isExpanded)}>
                <h3 className="font-semibold text-lg text-gray-800">Edit Target Kustom</h3>
                <button type="button" className="text-blue-600 text-sm font-bold hover:underline p-2">
                    {isExpanded ? 'Minimize' : 'Expand'}
                </button>
            </div>

            {isExpanded && (
                <div className="mt-4 space-y-6">
                    {customTargetColumns.map(col => (
                        <fieldset key={col.key} className="border rounded-md p-3">
                            <legend className="text-base font-semibold px-2">{col.title}</legend>
                            {/* [FIX] Kelas grid diubah agar lebih rapi */}
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-2">
                                {witelList.map(witel => (
                                    <div key={witel}>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">{witel}</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={data.targets[col.key]?.[witel] ?? ''}
                                            onChange={e => handleInputChange(col.key, witel, e.target.value)}
                                            className="p-1 border rounded w-full"
                                            placeholder="0"
                                        />
                                    </div>
                                ))}
                            </div>
                        </fieldset>
                    ))}
                    <button type="submit" disabled={processing} className="w-full mt-4 px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 disabled:bg-blue-400">
                        {processing ? 'Menyimpan...' : 'Simpan Target Kustom'}
                    </button>
                </div>
            )}
        </form>
    );
};

// ===================================================================
// Main Page Component
// ===================================================================
export default function AnalysisDigitalProduct({
    auth,
    reportData = [],
    currentSegment = 'SME',
    period = '',
    inProgressData = { data: [], links: [] },
    completeData = { data: [], links: [] },
    historyData = { data: [], links: [], total: 0 },
    accountOfficers = [],
    kpiData = [],
    qcData = { data: [], links: [] },
    currentInProgressYear,
    filters = {},
    flash = {},
    errors: pageErrors = {},
    customTargets = {}
}) {

    const [activeDetailView, setActiveDetailView] = useState('inprogress');
    const [search, setSearch] = useState(filters.search || '');
    const [decimalPlaces, setDecimalPlaces] = useState(2);
    const [selectedWitel, setSelectedWitel] = useState(filters.witel || '');

    const witelList = ['BALI', 'JATIM BARAT', 'JATIM TIMUR', 'NUSA TENGGARA', 'SURAMADU'];

    const handleExportReport = () => {
        // 1. Buat elemen form secara dinamis
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = route('analysisDigitalProduct.export.report');
        form.style.display = 'none'; // Sembunyikan form

        // 2. Buat input untuk CSRF token
        const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');
        const csrfInput = document.createElement('input');
        csrfInput.type = 'hidden';
        csrfInput.name = '_token';
        csrfInput.value = csrfToken;
        form.appendChild(csrfInput);

        // 3. Buat input untuk filter (segment & period)
        const segmentInput = document.createElement('input');
        segmentInput.type = 'hidden';
        segmentInput.name = 'segment';
        segmentInput.value = currentSegment;
        form.appendChild(segmentInput);

        const periodInput = document.createElement('input');
        periodInput.type = 'hidden';
        periodInput.name = 'period';
        periodInput.value = period;
        form.appendChild(periodInput);

        // 4. Buat input untuk data Details (Total, OGP, Closed)
        const detailsInput = document.createElement('input');
        detailsInput.type = 'hidden';
        detailsInput.name = 'details';
        // Ambil data dari 'detailsTotals' yang sudah Anda hitung
        detailsInput.value = JSON.stringify(detailsTotals);
        form.appendChild(detailsInput);

        // 4.5 Buat input untuk konfigurasi tabel (kode ini sudah ada)
        const configInput = document.createElement('input');
        configInput.type = 'hidden';
        configInput.name = 'table_config';
        configInput.value = JSON.stringify(tableConfig); // Ubah state tableConfig menjadi string JSON
        form.appendChild(configInput);

        // 5. Tambahkan form ke body, submit, lalu hapus
        document.body.appendChild(form);
        form.submit();
        document.body.removeChild(form);
    };

    const tableConfigStorageKey = `userTableConfig_${currentSegment}`;

    const [tableConfig, setTableConfig] = useState(
        currentSegment === 'LEGS' ? legsTableConfigTemplate : smeTableConfigTemplate
    );

    useEffect(() => {
        // Coba muat konfigurasi yang tersimpan untuk segmen saat ini
        const savedConfig = localStorage.getItem(tableConfigStorageKey);

        if (savedConfig) {
            // Jika ada, gunakan konfigurasi yang tersimpan
            setTableConfig(JSON.parse(savedConfig));
        } else {
            // Jika tidak ada, atur ke template default yang sesuai
            setTableConfig(currentSegment === 'LEGS' ? legsTableConfigTemplate : smeTableConfigTemplate);
        }
    }, [currentSegment]);

    useEffect(() => {
        try {
            localStorage.setItem(tableConfigStorageKey, JSON.stringify(tableConfig));
        } catch (error) {
            console.error("Gagal menyimpan konfigurasi ke localStorage:", error);
        }
    }, [tableConfig, tableConfigStorageKey]);

    const [progressStates, setProgressStates] = useState({ mentah: null, complete: null, cancel: null });
    const { props: pageProps } = usePage();
    useEffect(() => {
        // 1. Baca batch_id dan job_type dari parameter URL
        const urlParams = new URLSearchParams(window.location.search);
        const batchId = urlParams.get('batch_id');
        const jobType = urlParams.get('job_type');

        // Fungsi untuk membersihkan URL setelah proses selesai
        const cleanUrl = () => {
            const currentUrl = new URL(window.location.href);
            currentUrl.searchParams.delete('batch_id');
            currentUrl.searchParams.delete('job_type');
            // Ganti URL di history browser tanpa me-reload halaman
            window.history.replaceState({}, document.title, currentUrl.toString());
        };

        // 2. Jalankan polling jika parameter ditemukan dan job belum berjalan
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
                                cleanUrl(); // Bersihkan URL sebelum reload
                                router.reload({ preserveState: false, preserveScroll: true });
                            }, 2000);
                        }
                    })
                    .catch(error => {
                        console.error("Gagal mengambil progres job:", error);
                        clearInterval(interval);
                        setProgressStates(prev => ({ ...prev, [jobType]: null }));
                        cleanUrl(); // Bersihkan URL jika terjadi error
                    });
            }, 2000);

            // Cleanup function jika komponen di-unmount sebelum job selesai
            return () => clearInterval(interval);
        }
    }, []);

    const { data: uploadData, setData: setUploadData, post: postUpload, processing, errors, cancel } = useForm({ document: null });
    const { data: completeDataForm, setData: setCompleteDataForm, post: postComplete, processing: completeProcessing, errors: completeErrors, reset: completeReset } = useForm({ complete_document: null });
    const { data: cancelDataForm, setData: setCancelDataForm, post: postCancel, processing: cancelProcessing, errors: cancelErrors, reset: cancelReset } = useForm({ cancel_document: null });

    const submitCompleteFile = (e) => {
        e.preventDefault();
        postComplete(route('analysisDigitalProduct.uploadComplete'), {
            // forceFormData: true, // Opsi ini biasanya tidak perlu karena Inertia otomatis mendeteksi file
            onSuccess: () => {
                toast.success('File berhasil diunggah! Proses impor berjalan di latar belakang.');
                completeReset('complete_document'); // Reset field input file saja
            },
            onError: () => {
                toast.error('Gagal mengunggah file. Pastikan format sudah benar.');
            }
        });
    };

    const handleSyncCompleteClick = () => { // <-- NAMA DIGANTI
        if (confirm('Anda yakin ingin menjalankan sinkronisasi data order complete?')) {
            router.post(route('analysisDigitalProduct.syncCompletedOrders'), {}, {
                preserveScroll: true,
                onStart: () => toast.loading('Memulai sinkronisasi complete...'),
                onSuccess: (page) => {
                    toast.dismiss();
                    const { success, error, info } = page.props.flash;
                    if (success) toast.success(success);
                    if (error) toast.error(error);
                    if (info) toast.info(info);
                },
                onError: () => {
                    toast.dismiss();
                    toast.error('Terjadi kesalahan saat menghubungi server.');
                }
            });
        }
    };
    const submitCancelFile = (e) => { e.preventDefault(); postCancel(route('analysisDigitalProduct.uploadCancel'), { forceFormData: true, onSuccess: () => cancelReset() }); };
    const handleSyncCancelClick = () => { if (confirm('Anda yakin ingin menjalankan proses sinkronisasi untuk mengubah status order menjadi CANCEL?')) { router.post(route('analysisDigitalProduct.syncCancel'), {}, { preserveScroll: true }); } };

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingAgent, setEditingAgent] = useState(null);
    const [isCompleteSectionExpanded, setIsCompleteSectionExpanded] = useState(false);
    const [isCancelSectionExpanded, setIsCancelSectionExpanded] = useState(false);

    const openModal = (agent = null) => { setEditingAgent(agent); setIsModalOpen(true); };
    const closeModal = () => { setIsModalOpen(false); setEditingAgent(null); };

    const handleFilterChange = (newFilters) => {
        const query = {
            search: search,
            segment: currentSegment,
            period: period,
            in_progress_year: currentInProgressYear,
            witel: selectedWitel, // Sertakan witel saat ini
            ...newFilters
        };

        Object.keys(query).forEach(key => {
            if (query[key] === '' || query[key] === null || query[key] === undefined) {
                delete query[key];
            }
        });

        router.get(route('analysisDigitalProduct.index'), query, {
            preserveState: true,
            preserveScroll: true,
            replace: true
        });
    };

    const handleSearch = (e) => {
        e.preventDefault();
        handleFilterChange({ search: search, page: 1 });
    };

    function handleSegmentChange(e) { handleFilterChange({ segment: e.target.value, page: 1 }); }
    function handlePeriodChange(e) { handleFilterChange({ period: e.target.value, page: 1 }); }
    function handleInProgressYearChange(e) {
        handleFilterChange({ in_progress_year: e.target.value, page: 1 });
    }

    function handleUploadSubmit(e) {
        e.preventDefault();
        postUpload(route('analysisDigitalProduct.upload'));
    }

    const exportUrl = useMemo(() => {
        const params = new URLSearchParams({
            segment: currentSegment,
            in_progress_year: currentInProgressYear,
        });
        if (selectedWitel) {
            params.append('witel', selectedWitel);
        }
        return `${route('analysisDigitalProduct.export.inprogress')}?${params.toString()}`;
    }, [currentSegment, currentInProgressYear, selectedWitel]);
    function handleWitelChange(e) {
        const newWitel = e.target.value;
        setSelectedWitel(newWitel); // Menggunakan setter yang benar
        handleFilterChange({ witel: newWitel, page: 1 });
    }

    const detailsTotals = useMemo(() => {
        if (!reportData || reportData.length === 0) return { ogp: 0, closed: 0, total: 0 };
        const totals = reportData.reduce((acc, item) => {
            const ogp = (Number(item.in_progress_n) || 0) + (Number(item.in_progress_o) || 0) + (Number(item.in_progress_ae) || 0) + (Number(item.in_progress_ps) || 0);
            const closed = (Number(item.prov_comp_n_realisasi) || 0) + (Number(item.prov_comp_o_realisasi) || 0) + (Number(item.prov_comp_ae_realisasi) || 0) + (Number(item.prov_comp_ps_realisasi) || 0);
            acc.ogp += ogp;
            acc.closed += closed;
            return acc;
        }, { ogp: 0, closed: 0 });
        return { ...totals, total: totals.ogp + totals.closed };
    }, [reportData, currentSegment]);

    const generatePeriodOptions = () => {
        const options = [];
        // Mulai dari tanggal 1 bulan ini untuk menghindari bug
        let date = new Date();
        date.setDate(1);

        for (let i = 0; i < 24; i++) {
            const year = date.getFullYear();
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const value = `${year}-${month}`;
            const label = date.toLocaleString('id-ID', { month: 'long', year: 'numeric' });

            options.push(<option key={value} value={value}>{label}</option>);

            // Pindah ke tanggal 1 bulan sebelumnya
            date.setMonth(date.getMonth() - 1);
        }
        return options;
    };

    const generateYearOptions = () => {
        const options = [];
        const currentYear = new Date().getFullYear();
        for (let i = 0; i < 5; i++) {
            const year = currentYear - i;
            options.push(<option key={year} value={year}>{year}</option>);
        }
        return options;
    };

    const DetailTabButton = ({ viewName, currentView, setView, children }) => (
        <button onClick={() => setView(viewName)} className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${currentView === viewName ? 'bg-blue-600 text-white shadow' : 'bg-white text-gray-600 hover:bg-gray-100'}`}>{children}</button>
    );

    const handleClearHistory = () => {
        if (confirm('Anda yakin ingin menghapus seluruh data histori? Aksi ini tidak dapat dibatalkan.')) {
            router.post(route('analysisDigitalProduct.clearHistory'), {}, {
                preserveScroll: true,
            });
        }
    };

    return (
        <AuthenticatedLayout auth={auth} header="Analysis Digital Product">
            <Head title="Analysis Digital Product" />

            {flash.success && (<div className="mb-4 bg-green-100 border-l-4 border-green-500 text-green-700 p-4" role="alert"><p>{flash.success}</p></div>)}
            {flash.error && (<div className="mb-4 bg-red-100 border-l-4 border-red-500 text-red-700 p-4" role="alert"><p>{flash.error}</p></div>)}

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="lg:col-span-3 space-y-6">
                    {/* [DIKEMBALIKAN] Komponen Konfigurator Tabel */}
                    <TableConfigurator
                        tableConfig={tableConfig}
                        setTableConfig={setTableConfig}
                        currentSegment={currentSegment}
                    />

                    {/* [DIKEMBALIKAN] Komponen Tabel Laporan Utama */}
                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <div className="flex flex-wrap justify-between items-center mb-4 gap-4">
                            <h3 className="font-semibold text-lg text-gray-800">Data Report</h3>
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={handleExportReport}
                                    className="px-4 py-2 text-sm font-bold text-white bg-green-600 rounded-md hover:bg-green-700 whitespace-nowrap"
                                >
                                    Ekspor Excel
                                </button>
                                <div className="flex items-center gap-2">
                                    <label htmlFor="decimal_places" className="text-sm font-medium text-gray-600">Desimal:</label>
                                    <input id="decimal_places" type="number" min="0" max="10" value={decimalPlaces} onChange={e => setDecimalPlaces(Number(e.target.value))} className="border border-gray-300 rounded-md text-sm p-2 w-20" />
                                </div>
                                <select value={period} onChange={handlePeriodChange} className="border border-gray-300 rounded-md text-sm p-2">
                                    {generatePeriodOptions()}
                                </select>
                                <select value={currentSegment} onChange={handleSegmentChange} className="border border-gray-300 rounded-md text-sm p-2">
                                    <option value="LEGS">LEGS</option>
                                    <option value="SME">SME</option>
                                </select>
                            </div>
                        </div>
                        <SmeReportTable data={reportData} decimalPlaces={decimalPlaces} tableConfig={tableConfig} setTableConfig={setTableConfig} />
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <div className="flex flex-wrap justify-between items-center mb-4 gap-4">
                            <div className="flex items-center gap-2 border p-1 rounded-lg bg-gray-50 w-fit">
                                <DetailTabButton viewName="inprogress" currentView={activeDetailView} setView={setActiveDetailView}>In Progress ({inProgressData.total})</DetailTabButton>
                                <DetailTabButton viewName="complete" currentView={activeDetailView} setView={setActiveDetailView}>Complete ({completeData.total})</DetailTabButton>
                                <DetailTabButton viewName="qc" currentView={activeDetailView} setView={setActiveDetailView}>QC ({qcData.total})</DetailTabButton>
                                <DetailTabButton viewName="history" currentView={activeDetailView} setView={setActiveDetailView}>History ({historyData.total})</DetailTabButton>
                                <DetailTabButton viewName="kpi" currentView={activeDetailView} setView={setActiveDetailView}>KPI PO</DetailTabButton>
                            </div>

                            {(activeDetailView === 'inprogress' || activeDetailView === 'complete' || activeDetailView === 'qc') && (
                                <div className="flex items-center gap-4 flex-wrap">
                                    <form onSubmit={handleSearch} className="flex items-center gap-2">
                                        <input
                                            type="text"
                                            value={search}
                                            onChange={e => setSearch(e.target.value)}
                                            placeholder="Cari Order ID..."
                                            className="border border-gray-300 rounded-md text-sm p-2 w-48"
                                        />
                                        <PrimaryButton type="submit">Cari</PrimaryButton>
                                    </form>
                                </div>
                            )}
                            {activeDetailView === 'inprogress' && (
                                <div className="flex items-center gap-2 flex-wrap">
                                    {/* Filter Witel BARU */}
                                    <select
                                        value={selectedWitel}
                                        onChange={handleWitelChange}
                                        className="border border-gray-300 rounded-md text-sm p-2"
                                    >
                                        <option value="">Semua Witel</option>
                                        {witelList.map(w => <option key={w} value={w}>{w}</option>)}
                                    </select>

                                    {/* Filter Tahun yang sudah ada */}
                                    <select
                                        value={currentInProgressYear}
                                        onChange={handleInProgressYearChange}
                                        className="border border-gray-300 rounded-md text-sm p-2"
                                    >
                                        {/* Panggil fungsi generateYearOptions di sini jika ada */}
                                        <option value="2025">2025</option>
                                        <option value="2024">2024</option>
                                        <option value="2023">2023</option>
                                    </select>

                                    {/* Tombol Export yang sudah dinamis */}
                                    <a
                                        href={exportUrl}
                                        className="px-3 py-2 text-sm font-bold text-white bg-green-600 rounded-md hover:bg-green-700"
                                    >
                                        Export Excel
                                    </a>
                                </div>
                            )}
                            {activeDetailView === 'history' && (
                                <div className="w-full md:w-auto flex items-center gap-2">
                                    {/* Tombol Export Excel (menggunakan tag <a> untuk download) */}
                                    <a
                                        href={route('analysisDigitalProduct.export.history')}
                                        className="w-full px-4 py-2 text-sm font-bold text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none"
                                    >
                                        Export Excel
                                    </a>

                                    {/* Tombol Kosongkan History yang sudah ada */}
                                    <button
                                        onClick={handleClearHistory}
                                        className="w-full px-4 py-2 text-sm font-bold text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none"
                                    >
                                        Clear History
                                    </button>
                                </div>
                            )}
                            {activeDetailView === 'kpi' && (
                                <div className="w-full md:w-auto">
                                    <a
                                        href={route('analysisDigitalProduct.export.kpiPo')}
                                        className="inline-block px-4 py-2 text-sm font-bold text-white bg-green-600 rounded-md hover:bg-green-700"
                                    >
                                        Ekspor Excel
                                    </a>
                                </div>
                            )}
                        </div>

                        {activeDetailView === 'inprogress' && <InProgressTable dataPaginator={inProgressData} />}
                        {activeDetailView === 'complete' && <CompleteTable dataPaginator={completeData} />}
                        {activeDetailView === 'history' && <HistoryTable historyData={historyData} />}
                        {activeDetailView === 'qc' && <QcTable dataPaginator={qcData} />}
                        {activeDetailView === 'kpi' && <KpiTable data={kpiData} accountOfficers={accountOfficers} openModal={openModal} />}
                    </div>
                </div>

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
                            {progressStates.mentah !== null && (<ProgressBar progress={progressStates.mentah} text="Memproses file..." />)}
                            <div className="flex items-center gap-4">
                                <button type="submit" disabled={processing} className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 disabled:bg-blue-400">
                                    {processing ? 'Mengunggah...' : 'Unggah Dokumen'}
                                </button>
                                {processing && (<button type="button" onClick={() => cancel()} className="px-4 py-2 bg-red-600 text-white font-semibold rounded-md hover:bg-red-700">Batal</button>)}
                            </div>
                        </form>
                    </div>
                    <CustomTargetForm
                        tableConfig={tableConfig}
                        witelList={witelList}
                        initialData={customTargets}
                        period={period}
                        segment={currentSegment}
                    />
                    <EditReportForm currentSegment={currentSegment} reportData={reportData} period={period} />
                    <CollapsibleCard title="Proses Order Complete" isExpanded={isCompleteSectionExpanded} onToggle={() => setIsCompleteSectionExpanded(!isCompleteSectionExpanded)}>
                        <div className="bg-gray-50 p-4 rounded-md">
                            <h3 className="font-semibold text-lg text-gray-800">Unggah & Sinkronisasi Order Complete</h3>
                            <p className="text-gray-500 mt-1 text-sm">
                                Unggah file excel untuk langsung mengubah status order 'in progress' menjadi 'complete'.
                            </p>
                            <form onSubmit={submitCompleteFile} className="mt-4 space-y-4">
                                <div>
                                    <input
                                        type="file"
                                        name="complete_document"
                                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                                        onChange={(e) => setCompleteDataForm('complete_document', e.target.files[0])}
                                        disabled={completeProcessing}
                                    />
                                    {completeErrors.complete_document && <p className="text-red-500 text-xs mt-1">{completeErrors.complete_document}</p>}
                                </div>

                                {/* Progress bar tidak lagi diperlukan karena prosesnya sekarang sinkron/langsung */}

                                <PrimaryButton
                                    type="submit"
                                    className="bg-green-600 hover:bg-green-700 focus:bg-green-700 active:bg-green-800"
                                    disabled={completeProcessing}
                                >
                                    {completeProcessing ? 'Memproses...' : 'Proses File Complete'}
                                </PrimaryButton>
                            </form>
                        </div>
                    </CollapsibleCard>
                    <CollapsibleCard title="Proses Order Cancel" isExpanded={isCancelSectionExpanded} onToggle={() => setIsCancelSectionExpanded(!isCancelSectionExpanded)}>
                        <div className="bg-gray-50 p-4 rounded-md">
                            <h3 className="font-semibold text-lg text-gray-800">Unggah Order Cancel</h3>
                            <p className="text-gray-500 mt-1 text-sm">Unggah file excel berisi order yang akan di-cancel.</p>
                            <form onSubmit={submitCancelFile} className="mt-4 space-y-4">
                                <div>
                                    <input type="file" name="cancel_document" className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100" onChange={(e) => setCancelDataForm('cancel_document', e.target.files[0])} disabled={cancelProcessing} />
                                    {cancelErrors.cancel_document && <p className="text-red-500 text-xs mt-1">{cancelErrors.cancel_document}</p>}
                                </div>
                                {progressStates.cancel !== null && (<ProgressBar progress={progressStates.cancel} text="Memproses file..." />)}
                                <PrimaryButton type="submit" className="bg-red-600 hover:bg-red-700 focus:bg-red-700 active:bg-red-800" disabled={cancelProcessing}>
                                    {cancelProcessing ? 'Memproses...' : 'Proses File Cancel'}
                                </PrimaryButton>
                            </form>
                        </div>
                    </CollapsibleCard>
                </div>
            </div>
            <AgentFormModal isOpen={isModalOpen} onClose={closeModal} agent={editingAgent} />
        </AuthenticatedLayout>
    );
}
