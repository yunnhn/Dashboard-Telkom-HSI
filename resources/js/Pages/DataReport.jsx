import React, { useState, useEffect, useMemo } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, Link } from '@inertiajs/react';
import { FiDownload } from 'react-icons/fi';
import toast from 'react-hot-toast';

import DataReportTable from '@/Components/DataReportTable';
import InProgressTable from '@/Components/InProgressTable';

// ============================================================================
// TEMPLATE KONFIGURASI TABEL (FALLBACK)
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
// KOMPONEN UTAMA
// ============================================================================
export default function DataReport({ smeReportData, legsReportData, inProgressData, filters, smeConfig, legsConfig, flash, filterOptions = {}, cutOffDate }) {
    const [smeTableConfig, setSmeTableConfig] = useState([]);
    const [legsTableConfig, setLegsTableConfig] = useState([]);
    const [selectedWitel, setSelectedWitel] = useState(filters.witel || '');

    const currentMonth = filters.month || new Date().toISOString().slice(0, 7);

    // Efek untuk menampilkan notifikasi flash message dari backend
    useEffect(() => {
        if (flash?.success) toast.success(flash.success);
        if (flash?.error) toast.error(flash.error);
    }, [flash]);

    // Efek untuk mengatur konfigurasi tabel berdasarkan segmen dan data dari server
    useEffect(() => {
        setSmeTableConfig(smeConfig || smeTableConfigTemplate);
    }, [smeConfig]);

    // Efek untuk mengatur konfigurasi tabel LEGS
    useEffect(() => {
        setLegsTableConfig(legsConfig || legsTableConfigTemplate);
    }, [legsConfig]);

    // Efek untuk menyinkronkan state filter Witel dengan props dari Inertia
    useEffect(() => {
        setSelectedWitel(filters.witel || '');
    }, [filters.witel]);

    // Fungsi untuk menangani semua perubahan filter
    const handleFilterChange = (key, value) => {
        const newFilters = { ...filters, [key]: value };
        // Reset paginasi saat filter diubah agar kembali ke halaman 1
        if (key !== 'in_progress_page') {
            delete newFilters.in_progress_page;
        }
        router.get(route('data-report.index'), newFilters, {
            preserveState: true,
            replace: true,
        });
    };

    // Fungsi untuk menghasilkan opsi periode (bulan)
    const generatePeriodOptions = () => {
        const options = [];
        let date = new Date();
        for (let i = 0; i < 24; i++) {
            const year = date.getFullYear();
            const month = (date.getMonth() + 1).toString().padStart(2, "0");
            const value = `${year}-${month}`;
            const label = date.toLocaleString("id-ID", { month: "long", year: "numeric" });
            options.push(<option key={value} value={value}>{label}</option>);
            date.setMonth(date.getMonth() - 1);
        }
        return options;
    };

    // Fungsi untuk menghasilkan opsi tahun
    const generateYearOptions = () => {
        const options = [];
        const currentYear = new Date().getFullYear();
        for (let i = 0; i < 5; i++) {
            const year = currentYear - i;
            options.push(<option key={year} value={year}>{year}</option>);
        }
        return options;
    };

    // Fungsi untuk membuat input tersembunyi pada form
    const createHiddenInput = (form, name, value) => {
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = name;
        input.value = value;
        form.appendChild(input);
    };

    // Fungsi untuk Ekspor Data Report Utama
    const handleExportDataReport = () => {
        // 1. Siapkan parameter yang akan dikirim
        const params = new URLSearchParams({
            month: filters.month || new Date().toISOString().slice(0, 7),
            // Anda tidak perlu lagi mengirim 'segment' karena controller akan mengambil keduanya
        });

        // 2. Buat URL lengkap ke rute ekspor
        const exportUrl = route('data-report.export') + '?' + params.toString();

        // 3. Arahkan browser ke URL tersebut untuk memicu download
        window.location.href = exportUrl;
    };

    const handleExportInProgress = () => {
        // Siapkan parameter berdasarkan filter yang aktif di halaman
        const params = new URLSearchParams({
            year: filters.year || new Date().getFullYear(),
        });

        // Tambahkan witel hanya jika dipilih
        if (filters.witel) {
            params.append('witel', filters.witel);
        }

        // Buat URL lengkap dan arahkan browser ke sana
        const exportUrl = route('data-report.exportInProgress') + '?' + params.toString();

        window.location.href = exportUrl;
    };

    return (
        <AuthenticatedLayout header={<h2 className="font-semibold text-xl text-gray-800 leading-tight">Data Report</h2>}>
            <Head title="Data Report" />
            <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8 space-y-6">
                    {/* KARTU DATA REPORT (MENGGUNAKAN FILTER BULAN) */}
                    <div className="p-4 sm:p-8 bg-white shadow sm:rounded-lg">
                        <section>
                            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
                                <h2 className="text-lg font-medium text-gray-900 mb-4">
                                    Data Report
                                    {cutOffDate && <span className="text-sm font-normal text-gray-500 ml-2">(Cut Off {cutOffDate})</span>}
                                </h2>
                                <div className="flex items-center gap-4 mt-4 sm:mt-0">
                                    <button
                                        onClick={handleExportDataReport}
                                        className="inline-flex items-center px-4 py-2 bg-green-600 border border-transparent rounded-md font-semibold text-xs text-white uppercase tracking-widest hover:bg-green-700"
                                    >
                                        <FiDownload className="mr-2" />
                                        Ekspor Data Report
                                    </button>
                                    <select value={filters.month} onChange={(e) => handleFilterChange('month', e.target.value)} className="border-gray-300 rounded-md shadow-sm">
                                        {generatePeriodOptions()}
                                    </select>
                                </div>
                            </header>

                            {/* KARTU DATA REPORT (SME) */}
                            <div className="p-4 sm:p-8 bg-white shadow sm:rounded-lg">
                                <section>
                                    <h2 className="text-lg font-medium text-gray-900 mb-4">Data Report (SME)</h2>
                                    <DataReportTable
                                        data={smeReportData}
                                        decimalPlaces={0}
                                        tableConfig={smeTableConfig}
                                        segment="SME"  // <-- [TAMBAHKAN INI]
                                        month={currentMonth} // <-- [TAMBAHKAN INI]
                                    />
                                </section>
                            </div>

                            {/* KARTU DATA REPORT (LEGS) */}
                            <div className="p-4 sm:p-8 bg-white shadow sm:rounded-lg">
                                <section>
                                    <h2 className="text-lg font-medium text-gray-900 mb-4">Data Report (LEGS)</h2>
                                    <DataReportTable
                                        data={legsReportData}
                                        decimalPlaces={0}
                                        tableConfig={legsTableConfig}
                                        segment="LEGS" // <-- [TAMBAHKAN INI]
                                        month={currentMonth} // <-- [TAMBAHKAN INI]
                                    />
                                </section>
                            </div>
                        </section>
                    </div>

                    {/* KARTU IN PROGRESS ORDERS (MENGGUNAKAN FILTER TAHUN) */}
                    <div className="p-4 sm:p-8 bg-white shadow sm:rounded-lg">
                        <section>
                            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
                                <div>
                                    <h2 className="text-lg font-medium text-gray-900">In Progress Orders</h2>
                                    <p className="mt-1 text-sm text-gray-600">Daftar order yang sedang dalam proses.</p>
                                </div>
                                <div className="flex flex-wrap items-center sm:justify-end gap-4 mt-4 sm:mt-0">
                                    <button
                                        onClick={handleExportInProgress}
                                        className="inline-flex items-center px-4 py-2 bg-green-600 border border-transparent rounded-md font-semibold text-xs text-white uppercase tracking-widest hover:bg-green-700"
                                    >
                                        <FiDownload className="mr-2 h-4 w-4" />
                                        Ekspor Data In Progress
                                    </button>
                                    <select
                                        aria-label="Filter by Year"
                                        value={filters.year || new Date().getFullYear()}
                                        onChange={e => handleFilterChange('year', e.target.value)}
                                        className="border-gray-300 rounded-md shadow-sm text-sm"
                                    >
                                        {generateYearOptions()}
                                    </select>
                                    <select
                                        aria-label="Filter by Witel"
                                        value={selectedWitel}
                                        onChange={e => {
                                            const newWitel = e.target.value;
                                            setSelectedWitel(newWitel);
                                            handleFilterChange('witel', newWitel);
                                        }}
                                        className="border-gray-300 rounded-md shadow-sm text-sm"
                                    >
                                        <option value="">Semua Witel</option>
                                        {filterOptions.witelList?.map(witel => (
                                            <option key={witel} value={witel}>{witel}</option>
                                        ))}
                                    </select>
                                </div>
                            </header>
                            <InProgressTable dataPaginator={inProgressData} showActions={false} />
                        </section>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
