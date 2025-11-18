import React, { useMemo } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import GalaksiReportTable from '@/Components/Sos/GalaksiReportTable'; // Impor tabel Galaksi

// ===================================================================
// Konfigurasi Tabel (Salin dari AnalysisSOS.jsx)
// ===================================================================
export const sosTableConfigTemplateAOMO = [
    { key: 'witel', title: 'WITEL', type: 'fixed', visible: true, configurable: false },
    {
        groupTitle: "<3BLN", groupClass: "bg-blue-400 text-white", columnClass: "bg-blue-800 text-white",
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
        groupTitle: ">3BLN", groupClass: "bg-blue-400 text-white", columnClass: "bg-blue-800 text-white",
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

export const sosTableConfigTemplateSODORO = [
    { key: 'witel', title: 'WITEL', type: 'fixed', visible: true, configurable: false },
    {
        groupTitle: "<3BLN", groupClass: "bg-red-800 text-white", columnClass: "bg-red-800 text-white",
        columns: [
            { key: "provide_order_lt_3bln", title: "PROVIDE ORDER", type: "numeric", visible: true },
            { key: "in_process_lt_3bln", title: "IN PROCESS", type: "numeric", visible: true },
            { key: "ready_to_bill_lt_3bln", title: "READY TO BILL", type: "numeric", visible: true },
        ],
    },
    { key: 'total_lt_3bln', title: '<3BLN Total', headerClass: 'bg-red-800 text-white', type: 'numeric', isTotal: true, visible: true },
    {
        groupTitle: ">3BLN", groupClass: "bg-red-800 text-white", columnClass: "bg-red-800 text-white",
        columns: [
            { key: "provide_order_gt_3bln", title: "PROVIDE ORDER", type: "numeric", visible: true },
            { key: "in_process_gt_3bln", title: "IN PROCESS", type: "numeric", visible: true },
            { key: "ready_to_bill_gt_3bln", title: "READY TO BILL", type: "numeric", visible: true },
        ],
    },
    { key: 'total_gt_3bln', title: '>3BLN Total', headerClass: 'bg-red-800 text-white', type: 'numeric', isTotal: true, visible: true },
    { key: 'grand_total_order', title: 'Grand Total Order', headerClass: 'bg-red-800 text-white font-bold', isTotal: true, visible: true }
];

// ===================================================================
// Komponen Tabel (Salin dari AnalysisSOS.jsx)
// ===================================================================
const SosReportTable = ({ data, tableConfig, viewMode }) => {
    const renderClickableCell = (item, column, segment, formattedValue) => {
        const numericValue = item[column.key] ?? 0;

        // Kolom ini tidak bisa diklik
        const nonClickableKeys = ['witel', 'total_lt_3bln', 'total_gt_3bln', 'grand_total_order'];
        if (nonClickableKeys.includes(column.key) || numericValue === 0) {
            return formattedValue;
        }

        // Tentukan warna link (putih di latar gelap, biru di latar putih)
        const linkClass = item.isTotal
            ? "text-white hover:text-gray-200 hover:underline font-bold"
            : "text-gray-800 hover:text-gray-500 hover:underline";

        return (
            <Link
                href={route('report.datin.sosDetails')}
                data={{
                    segment: segment, // 'SME', 'GOV', 'PRIVATE'
                    witel: item.witel, // 'SME', 'BALI', 'JATIM BARAT', 'TOTAL'
                    kpi_key: column.key, // 'provide_order_lt_3bln', dll.
                    view_mode: viewMode
                }}
                className={linkClass}
                title={`Lihat detail ${column.key} untuk ${item.witel}`}
            >
                {formattedValue}
            </Link>
        );
    };

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

    const renderTableHeaders = () => {
        return (
            <>
                <tr>
                    <th rowSpan="2" className={`py-3 px-4 border text-left left-0 z-20 font-bold ${headerThemeClass}`}>
                        WITEL
                    </th>
                    {tableConfig.map((item) => {
                        if (item.type === 'fixed') return null;
                        const colSpan = item.groupTitle ? item.columns.filter(c => c.visible).length : 1;
                        const rowSpan = item.groupTitle ? 1 : 2;
                        const className = `py-2 px-4 border text-center font-medium select-none ${item.groupClass || item.headerClass || ''}`;
                        return (
                            <th key={item.groupTitle || item.key} colSpan={colSpan} rowSpan={rowSpan} className={className}>
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
                                <th key={col.key} className={`py-2 px-4 border text-center font-medium select-none ${item.columnClass || ''} ${col.headerClass || ''}`}>
                                    {col.title}
                                </th>
                            ) : null
                        );
                    })}
                </tr>
            </>
        );
    };

    let currentSegment = '';
    const segmentTotalNames = ['SME', 'GOV', 'PRIVATE', 'SOE'];

    return (
        <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-200 text-sm">
                <thead className="text-gray-600 uppercase text-xs">
                    {renderTableHeaders()}
                </thead>
                <tbody className="text-gray-700">
                    {data.map((item, rowIndex) => {
                        if (item.isTotal) {
                            const isGrandTotal = item.witel === 'GRAND TOTAL';
                            const segmentTotalNames = ['SME', 'GOV', 'PRIVATE', 'SOE'];
                            const isSegmentTotal = segmentTotalNames.includes(item.witel);

                            if (isSegmentTotal) {
                                currentSegment = item.witel;
                            }

                            let rowClass = '';
                            if (isGrandTotal) rowClass = grandTotalRowClass;
                            else if (isSegmentTotal) rowClass = segmentTotalRowClass;
                            else rowClass = 'bg-gray-200 font-bold';

                            return (
                                <tr key={rowIndex} className={rowClass}>
                                    <td className={`py-2 px-4 border text-left left-0 z-10 font-bold ${rowClass}`}>
                                        {item.witel}
                                    </td>
                                    {tableConfig.slice(1).flatMap(config => {
                                        if (config.columns) {
                                            return config.columns.map(col => (
                                                col.visible ? (
                                                    <td key={`${item.witel}-${col.key}`} className="py-2 px-4 border text-center">
                                                        {renderClickableCell(item, col, (isGrandTotal ? currentSegment : item.witel), renderCell(item, col))}
                                                    </td>
                                                ) : null
                                            ));
                                        } else if (config.key && config.visible) {
                                            return (
                                                <td key={`${item.witel}-${config.key}`} className="py-2 px-4 border text-center">
                                                    {renderClickableCell(item, config, (isGrandTotal ? currentSegment : item.witel), renderCell(item, config))}
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
                                <td className="py-3 px-4 border text-left left-0 z-10 bg-white">
                                    {item.witel}
                                </td>
                                {tableConfig.slice(1).flatMap(configItem => {
                                    if (configItem.columns) {
                                        return configItem.columns.map(col =>
                                            col.visible ? (
                                                <td key={`${item.witel}-${col.key}`} className="py-3 px-4 border text-center">
                                                    {renderClickableCell(item, col, currentSegment, renderCell(item, col))}
                                                </td>
                                            ) : null
                                        );
                                    }
                                    if (configItem.key && configItem.visible) {
                                        return (
                                            <td key={`${item.witel}-${configItem.key}`} className="py-3 px-4 border text-center">
                                                {renderClickableCell(item, configItem, currentSegment, renderCell(item, configItem))}
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
// Komponen Utama Halaman (Layout Baru)
// ===================================================================
export default function ReportDatin({ auth, reportData = [], galaksiData = [], savedConfigAomo, savedConfigSodoro }) {

    const aomoConfig = useMemo(() => {
        return savedConfigAomo && savedConfigAomo.length > 0
            ? savedConfigAomo
            : sosTableConfigTemplateAOMO;
    }, [savedConfigAomo]);

    const sodoroConfig = useMemo(() => {
        return savedConfigSodoro && savedConfigSodoro.length > 0
            ? savedConfigSodoro
            : sosTableConfigTemplateSODORO;
    }, [savedConfigSodoro]);

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={<h2 className="font-semibold text-xl text-gray-800 leading-tight">Report Datin</h2>}
        >
            <Head title="Report Datin" />

            <div className="py-8">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8 space-y-6">

                    {/* --- CARD 1: DATA REPORT --- */}
                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <h3 className="font-semibold text-lg text-gray-800">
                            Data Report (Tampilan AO MO)
                        </h3>
                        <div className="mt-4">
                            <SosReportTable data={reportData} tableConfig={aomoConfig} viewMode="AOMO" />
                        </div>

                        <h3 className="font-semibold text-lg text-gray-800 mt-8 pt-6 border-t">
                            Data Report (Tampilan SO DO RO)
                        </h3>
                        <div className="mt-4">
                            <SosReportTable data={reportData} tableConfig={sodoroConfig} viewMode="SODORO" />
                        </div>
                    </div>

                    {/* --- CARD 2: GALAKSI --- */}
                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-semibold text-lg text-gray-800">
                                Posisi Galaksi (Order In Progress)
                            </h3>
                            {/* Tombol ekspor bisa ditambahkan di sini jika perlu */}
                        </div>
                        <GalaksiReportTable galaksiData={galaksiData} />
                    </div>

                </div>
            </div>
        </AuthenticatedLayout>
    );
}
