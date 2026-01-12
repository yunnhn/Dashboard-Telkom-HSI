import React, { useState, useEffect } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, Link } from '@inertiajs/react';
import { FiDownload } from 'react-icons/fi';
import toast from 'react-hot-toast';
import DataReportTable from '@/Components/DataReportTable';
import InProgressTable from '@/Components/InProgressTable';

// ============================================================================
// 1. HELPER DATE (FIX TIMEZONE BUG)
// ============================================================================
const formatDateLocal = (dateInput) => {
    const d = new Date(dateInput);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0'); // Month is 0-indexed
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// ============================================================================
// 2. TEMPLATE KONFIGURASI TABEL (FALLBACK)
// ============================================================================

const smeTableConfigTemplate = [
    {
        groupTitle: "In Progress",
        groupClass: "bg-blue-600",
        columnClass: "bg-blue-400",
        columns: [
            { key: "in_progress_n", title: "N" },
            { key: "in_progress_o", title: "O" },
            { key: "in_progress_ae", title: "AE" },
            { key: "in_progress_ps", title: "PS" },
        ],
    },
    {
        groupTitle: "Prov Comp",
        groupClass: "bg-orange-600",
        columnClass: "bg-orange-400",
        subColumnClass: "bg-orange-300",
        columns: [
            {
                key: "prov_comp_n", title: "N", subColumns: [
                    { key: "_target", title: "T" },
                    { key: "_realisasi", title: "R" },
                    { key: "_percent", title: "P", type: "calculation", calculation: { operation: "percentage", operands: ["prov_comp_n_realisasi", "prov_comp_n_target"] } },
                ],
            },
            {
                key: "prov_comp_o", title: "O", subColumns: [
                    { key: "_target", title: "T" },
                    { key: "_realisasi", title: "R" },
                    { key: "_percent", title: "P", type: "calculation", calculation: { operation: "percentage", operands: ["prov_comp_o_realisasi", "prov_comp_o_target"] } },
                ],
            },
            {
                key: "prov_comp_ae", title: "AE", subColumns: [
                    { key: "_target", title: "T" },
                    { key: "_realisasi", title: "R" },
                    { key: "_percent", title: "P", type: "calculation", calculation: { operation: "percentage", operands: ["prov_comp_ae_realisasi", "prov_comp_ae_target"] } },
                ],
            },
            {
                key: "prov_comp_ps", title: "PS", subColumns: [
                    { key: "_target", title: "T" },
                    { key: "_realisasi", title: "R" },
                    { key: "_percent", title: "P", type: "calculation", calculation: { operation: "percentage", operands: ["prov_comp_ps_realisasi", "prov_comp_ps_target"] } },
                ],
            },
        ],
    },
    {
        groupTitle: "REVENUE (Rp Juta)",
        groupClass: "bg-green-700",
        columnClass: "bg-green-500",
        subColumnClass: "bg-green-300",
        columns: [
            { key: "revenue_n", title: "N", subColumns: [{ key: "_ach", title: "ACH" }, { key: "_target", title: "T" }] },
            { key: "revenue_o", title: "O", subColumns: [{ key: "_ach", title: "ACH" }, { key: "_target", title: "T" }] },
            { key: "revenue_ae", title: "AE", subColumns: [{ key: "_ach", title: "ACH" }, { key: "_target", title: "T" }] },
            { key: "revenue_ps", title: "PS", subColumns: [{ key: "_ach", title: "ACH" }, { key: "_target", title: "T" }] },
        ],
    },
    {
        groupTitle: "Grand Total",
        groupClass: "bg-gray-600",
        columnClass: "bg-gray-500",
        columns: [
            { key: "grand_total_target", title: "T", type: "calculation", calculation: { operation: "sum", operands: ["prov_comp_n_target", "prov_comp_o_target", "prov_comp_ae_target", "prov_comp_ps_target"] } },
            { key: "grand_total_realisasi", title: "R", type: "calculation", calculation: { operation: "sum", operands: ["prov_comp_n_realisasi", "prov_comp_o_realisasi", "prov_comp_ae_realisasi", "prov_comp_ps_realisasi"] } },
            { key: "grand_total_persentase", title: "P", type: "calculation", calculation: { operation: "percentage", operands: ["grand_total_realisasi", "grand_total_target"] } },
        ],
    },
];

const legsTableConfigTemplate = [
    {
        groupTitle: "In Progress", groupClass: "bg-blue-600", columnClass: "bg-blue-400",
        columns: [
            { key: "in_progress_n", title: "N" }, { key: "in_progress_o", title: "O" },
            { key: "in_progress_ae", title: "AE" }, { key: "in_progress_ps", title: "PS" },
        ],
    },
    {
        groupTitle: "Prov Comp", groupClass: "bg-orange-600", columnClass: "bg-orange-400",
        columns: [
            { key: "prov_comp_n_realisasi", title: "N" }, { key: "prov_comp_o_realisasi", title: "O" },
            { key: "prov_comp_ae_realisasi", title: "AE" }, { key: "prov_comp_ps_realisasi", title: "PS" },
        ],
    },
    {
        groupTitle: "REVENUE (Rp Juta)", groupClass: "bg-green-700", columnClass: "bg-green-500", subColumnClass: "bg-green-300",
        columns: [
            { key: "revenue_n", title: "N", subColumns: [{ key: "_ach", title: "ACH" }, { key: "_target", title: "T" }] },
            { key: "revenue_o", title: "O", subColumns: [{ key: "_ach", title: "ACH" }, { key: "_target", title: "T" }] },
            { key: "revenue_ae", title: "AE", subColumns: [{ key: "_ach", title: "ACH" }, { key: "_target", title: "T" }] },
            { key: "revenue_ps", title: "PS", subColumns: [{ key: "_ach", title: "ACH" }, { key: "_target", title: "T" }] },
        ],
    },
    {
        groupTitle: "Grand Total", groupClass: "bg-gray-600", columnClass: "bg-gray-500",
        columns: [
            {
                key: "grand_total_realisasi_legs", title: "Total", type: "calculation", calculation: {
                    operation: "sum", operands: ["prov_comp_n_realisasi", "prov_comp_o_realisasi", "prov_comp_ae_realisasi", "prov_comp_ps_realisasi"]
                },
            },
        ],
    },
];


// ============================================================================
// 3. KOMPONEN UTAMA
// ============================================================================
export default function DataReport({ smeReportData, legsReportData, inProgressData, galaksiData, filters, smeConfig, legsConfig, flash, filterOptions = {}, cutOffDate }) {
    const [smeTableConfig, setSmeTableConfig] = useState([]);
    const [legsTableConfig, setLegsTableConfig] = useState([]);

    // --- STATE TANGGAL (FIX TIMEZONE) ---
    // Inisialisasi tanggal berdasarkan waktu lokal client, bukan UTC
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Jika ada filter dari server gunakan itu, jika tidak gunakan default lokal
    const [startDate, setStartDate] = useState(filters.start_date || formatDateLocal(startOfMonth));
    const [endDate, setEndDate] = useState(filters.end_date || formatDateLocal(now));

    // STATE: Witel
    const [selectedWitel, setSelectedWitel] = useState(filters.witel || '');

    // Efek untuk menampilkan notifikasi flash message
    useEffect(() => {
        if (flash?.success) toast.success(flash.success);
        if (flash?.error) toast.error(flash.error);
    }, [flash]);

    // Efek Config Tabel
    useEffect(() => {
        setSmeTableConfig(smeConfig || smeTableConfigTemplate);
    }, [smeConfig]);

    useEffect(() => {
        setLegsTableConfig(legsConfig || legsTableConfigTemplate);
    }, [legsConfig]);

    // Efek Sinkronisasi Filter saat navigasi (Back/Forward browser)
    useEffect(() => {
        if (filters.start_date) setStartDate(filters.start_date);
        if (filters.end_date) setEndDate(filters.end_date);
        if (filters.witel) setSelectedWitel(filters.witel);
    }, [filters]);

    // --- HANDLER FILTER ---
    const handleFilterChange = (key, value) => {
        const newFilters = {
            ...filters,
            [key]: value,
            // Pastikan kedua tanggal selalu terkirim agar filter konsisten
            start_date: key === 'start_date' ? value : startDate,
            end_date: key === 'end_date' ? value : endDate,
        };

        // Hapus filter date lama (single) agar bersih
        delete newFilters.date;

        // Reset paginasi jika bukan navigasi page
        if (key !== 'in_progress_page') {
            delete newFilters.in_progress_page;
        }

        router.get(route('data-report.index'), newFilters, {
            preserveState: true,
            replace: true,
        });
    };

    // Opsi Tahun
    const generateYearOptions = () => {
        const options = [];
        const currentYear = new Date().getFullYear();
        for (let i = 0; i < 5; i++) {
            const year = currentYear - i;
            options.push(<option key={year} value={year}>{year}</option>);
        }
        return options;
    };

    // --- EXPORT HANDLERS ---
    const handleExportDataReport = () => {
        const params = new URLSearchParams({
            start_date: startDate,
            end_date: endDate,
        });
        const exportUrl = route('data-report.export') + '?' + params.toString();
        window.location.href = exportUrl;
    };

    const handleExportInProgress = () => {
        const params = new URLSearchParams({ start_date: startDate, end_date: endDate });
        if (selectedWitel) params.append('witel', selectedWitel);
        window.location.href = route('data-report.exportInProgress') + '?' + params.toString();
    };

    const renderClickableCell = (po, kpiType, channelType, value) => {
        const count = parseFloat(value) || 0;

        if (count > 0) {
            // 1. Sanitasi Tanggal: Jika kosong/undefined, jadikan null agar tidak dikirim string kosong ""
            // String kosong "" akan dianggap format tanggal invalid oleh Laravel
            const safeStartDate = startDate ? startDate : null;
            const safeEndDate = endDate ? endDate : null;

            // 2. Siapkan Parameter
            const params = {
                officer_id: po.id,
                kpi_type: kpiType,
                channel_type: channelType,
                start_date: safeStartDate,
                end_date: safeEndDate
            };

            return (
                <Link
                    href={route('data-report.details')}
                    data={params}
                    method="get"
                    className="text-blue-600 hover:text-blue-800 hover:underline font-bold cursor-pointer"
                    // Tambahkan preserveState agar scroll tidak loncat (opsional)
                    preserveState={false}
                >
                    {count}
                </Link>
            );
        }
        return <span className="text-gray-500">0</span>;
    };

    return (
        <AuthenticatedLayout header={<h2 className="font-semibold text-xl text-gray-800 leading-tight">Data Report</h2>}>
            <Head title="Data Report" />
            <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8 space-y-6">

                    {/* GLOBAL FILTER SECTION (Card Utama) */}
                    <div className="p-4 sm:p-8 bg-white shadow sm:rounded-lg">
                        <section>
                            <header className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-6 gap-4">
                                <div>
                                    <h2 className="text-lg font-medium text-gray-900">
                                        Data Report
                                        {cutOffDate && <span className="text-sm font-normal text-gray-500 ml-2 block sm:inline">(Cut Off {cutOffDate})</span>}
                                    </h2>
                                </div>

                                <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                                    {/* FILTER WITEL */}
                                    <select
                                        aria-label="Filter Witel"
                                        value={selectedWitel}
                                        onChange={e => {
                                            setSelectedWitel(e.target.value);
                                            handleFilterChange('witel', e.target.value);
                                        }}
                                        className="border-gray-300 rounded-md shadow-sm text-sm h-10"
                                    >
                                        <option value="">Semua Witel</option>
                                        {filterOptions.witelList?.map(witel => (
                                            <option key={witel} value={witel}>{witel}</option>
                                        ))}
                                    </select>

                                    {/* FILTER DATE RANGE (MIRIP GAMBAR 2 TAPI PAKAI NATIVE) */}
                                    <div className="flex items-center gap-2 bg-white p-1 rounded-md border border-gray-300 h-10">
                                        <div className="flex flex-col justify-center px-1">
                                            <span className="text-[9px] text-gray-500 font-bold uppercase leading-none">Dari</span>
                                            <input
                                                type="date"
                                                value={startDate}
                                                onChange={(e) => {
                                                    setStartDate(e.target.value);
                                                    handleFilterChange('start_date', e.target.value);
                                                }}
                                                className="border-none p-0 text-sm focus:ring-0 h-4 bg-transparent text-gray-700"
                                            />
                                        </div>
                                        <span className="text-gray-400 font-light">|</span>
                                        <div className="flex flex-col justify-center px-1">
                                            <span className="text-[9px] text-gray-500 font-bold uppercase leading-none">Sampai</span>
                                            <input
                                                type="date"
                                                value={endDate}
                                                onChange={(e) => {
                                                    setEndDate(e.target.value);
                                                    handleFilterChange('end_date', e.target.value);
                                                }}
                                                className="border-none p-0 text-sm focus:ring-0 h-4 bg-transparent text-gray-700"
                                            />
                                        </div>
                                    </div>

                                    <button
                                        onClick={handleExportDataReport}
                                        className="inline-flex items-center px-4 py-2 bg-green-600 border border-transparent rounded-md font-semibold text-xs text-white uppercase tracking-widest hover:bg-green-700 whitespace-nowrap h-10"
                                    >
                                        <FiDownload className="mr-2" />
                                        Ekspor Report
                                    </button>
                                </div>
                            </header>

                            {/* TABEL SME & LEGS (Logic Sama) */}
                            <div className="p-4 sm:p-8 bg-white shadow sm:rounded-lg mb-6 border border-gray-100">
                                <section>
                                    <h2 className="text-lg font-medium text-gray-900 mb-4">Data Report (SME)</h2>
                                    <DataReportTable data={smeReportData} decimalPlaces={0} tableConfig={smeTableConfig} segment="SME" startDate={startDate} endDate={endDate} date={endDate} />
                                </section>
                            </div>

                            <div className="p-4 sm:p-8 bg-white shadow sm:rounded-lg border border-gray-100">
                                <section>
                                    <h2 className="text-lg font-medium text-gray-900 mb-4">Data Report (LEGS)</h2>
                                    <DataReportTable data={legsReportData} decimalPlaces={0} tableConfig={legsTableConfig} segment="LEGS" startDate={startDate} endDate={endDate} date={endDate} />
                                </section>
                            </div>
                        </section>
                    </div>

                    {/* KARTU IN PROGRESS ORDERS (FILTER MENGIKUTI ATAS) */}
                    <div className="p-4 sm:p-8 bg-white shadow sm:rounded-lg">
                        <section>
                            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
                                <div>
                                    <h2 className="text-lg font-medium text-gray-900">In Progress Orders</h2>
                                    <p className="mt-1 text-sm text-gray-600">
                                        Daftar order in progress ({formatDateLocal(startDate)} s/d {formatDateLocal(endDate)}).
                                    </p>
                                </div>
                                <div className="mt-4 sm:mt-0">
                                    <button
                                        onClick={handleExportInProgress}
                                        className="inline-flex items-center px-4 py-2 bg-green-600 border border-transparent rounded-md font-semibold text-xs text-white uppercase tracking-widest hover:bg-green-700"
                                    >
                                        <FiDownload className="mr-2 h-4 w-4" />
                                        Ekspor In Progress
                                    </button>
                                </div>
                            </header>

                            {/* Tabel In Progress - Filter Tahun dan Witel khusus sudah DIHAPUS, ikut filter atas */}
                            <InProgressTable dataPaginator={inProgressData} showActions={false} />
                        </section>
                    </div>

                    <div className="p-4 sm:p-8 bg-white shadow sm:rounded-lg mb-6 border border-gray-100">
                        <section>
                            <h2 className="text-lg font-medium text-gray-900 mb-4">KPI Project Officer</h2>
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200 border text-sm">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th rowSpan="2" className="px-3 py-2 text-center font-medium text-white uppercase bg-green-600 border">NAMA PO</th>
                                            <th rowSpan="2" className="px-3 py-2 text-center font-medium text-white uppercase bg-green-600 border">WITEL</th>
                                            <th colSpan="2" className="px-3 py-2 text-center font-medium text-white uppercase bg-orange-500 border">PRODIGI DONE</th>
                                            <th colSpan="2" className="px-3 py-2 text-center font-medium text-white uppercase bg-blue-500 border">PRODIGI OGP</th>
                                            <th rowSpan="2" className="px-3 py-2 text-center font-medium text-white uppercase bg-green-600 border">TOTAL</th>
                                            <th colSpan="2" className="px-3 py-2 text-center font-medium text-white uppercase bg-yellow-400 border text-black">ACH</th>
                                        </tr>
                                        <tr>
                                            <th className="px-2 py-1 text-center font-medium text-white bg-orange-400 border">NCX</th>
                                            <th className="px-2 py-1 text-center font-medium text-white bg-orange-400 border">SCONE</th>
                                            <th className="px-2 py-1 text-center font-medium text-white bg-blue-400 border">NCX</th>
                                            <th className="px-2 py-1 text-center font-medium text-white bg-blue-400 border">SCONE</th>
                                            <th className="px-2 py-1 text-center font-medium text-black bg-yellow-300 border">Range</th>
                                            <th className="px-2 py-1 text-center font-medium text-black bg-yellow-300 border">Q3</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200 text-center">
                                        {galaksiData && galaksiData.map((po) => (
                                            <tr key={po.id} className="hover:bg-gray-50">
                                                <td className="px-3 py-2 whitespace-nowrap border text-left font-medium">{po.nama_po}</td>
                                                <td className="px-3 py-2 whitespace-nowrap border text-left">{po.witel}</td>
                                                <td className="px-3 py-2 whitespace-nowrap border">{renderClickableCell(po, 'done', 'ncx', po.done_ncx)}</td>
                                                <td className="px-3 py-2 whitespace-nowrap border">{renderClickableCell(po, 'done', 'scone', po.done_scone)}</td>
                                                <td className="px-3 py-2 whitespace-nowrap border">{renderClickableCell(po, 'ogp', 'ncx', po.ogp_ncx)}</td>
                                                <td className="px-3 py-2 whitespace-nowrap border">{renderClickableCell(po, 'ogp', 'scone', po.ogp_scone)}</td>
                                                <td className="px-3 py-2 whitespace-nowrap border font-bold">{po.total}</td>
                                                <td className="px-3 py-2 whitespace-nowrap border bg-yellow-50 font-semibold">{po.ach_range}</td>
                                                <td className="px-3 py-2 whitespace-nowrap border bg-yellow-50 font-semibold">{po.ach_q3}</td>
                                            </tr>
                                        ))}
                                        {(!galaksiData || galaksiData.length === 0) && (
                                            <tr><td colSpan="9" className="py-4 text-gray-500">Tidak ada data KPI PO.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}