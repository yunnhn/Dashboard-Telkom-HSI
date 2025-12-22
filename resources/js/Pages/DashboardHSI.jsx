import React, { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import AmountByWitelChart from '@/Components/AmountByWitelChart';
import HsiPieChart from '@/Components/HsiPieChart';
import AmountBySubTypeChart from '@/Components/AmountBySubTypeChartHSI';
import StackedBarChart from '@/Components/StackedBarChart';

// --- 1. Import Library DatePicker & CSS-nya ---
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import "@/Components/DatePickerCustom.css"; // (Opsional) Kita buat CSS sedikit nanti biar rapi
// ----------------------------------------------

export default function DashboardHSI({ 
    auth, stats, 
    chart1, chart2, chart3, chart4, 
    chart5Data, chart5Keys, chart6Data, chart6Keys, 
    witels, filters 
}) {

    // --- 2. Setup State untuk Date Range ---
    // Konversi string 'YYYY-MM-DD' dari controller kembali ke object Date Javascript
    const [dateRange, setDateRange] = useState([
        filters.start_date ? new Date(filters.start_date) : null, 
        filters.end_date ? new Date(filters.end_date) : null
    ]);
    const [startDate, endDate] = dateRange;

    // Helper format tanggal ke 'YYYY-MM-DD' tanpa timezone shifting
    const formatDate = (date) => {
        if (!date) return '';
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    // Fungsi Apply Filter
    const applyDateFilter = () => {
        // Cek jika tanggal lengkap (Start & End terisi)
        if (startDate && endDate) {
            router.get(route('dashboard.hsi'), { 
                ...filters, 
                start_date: formatDate(startDate),
                end_date: formatDate(endDate),
            }, { preserveState: true, preserveScroll: true });
        }
    };

    // Fungsi Reset
    const resetDateFilter = () => {
        setDateRange([null, null]);
        router.get(route('dashboard.hsi'), { 
            witel_status: filters.witel_status,
            witel_layanan: filters.witel_layanan 
        }, { preserveState: true, preserveScroll: true });
    };

    const updateFilter = (key, value) => {
        router.get(route('dashboard.hsi'), { 
            ...filters, 
            [key]: value,
        }, { preserveState: true, preserveScroll: true, replace: true });
    };

    const hasData = (data) => data && data.length > 0;

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={<h2 className="font-semibold text-xl text-gray-800 leading-tight">Dashboard HSI</h2>}
        >
            <Head title="Dashboard HSI" />

            <div className="py-8">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8 space-y-6">
                    
                    {/* --- FILTER TANGGAL (MODIFIKASI SEPERTI GAMBAR) --- */}
                    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                            
                            {/* Bagian Input DatePicker Range */}
                            <div className="w-full md:w-1/3">
                                <label className="block text-sm font-bold text-gray-700 mb-1">Rentang Tanggal</label>
                                <div className="relative">
                                    <DatePicker
                                        selectsRange={true}
                                        startDate={startDate}
                                        endDate={endDate}
                                        onChange={(update) => setDateRange(update)}
                                        isClearable={true}
                                        placeholderText="Pilih Rentang Tanggal"
                                        className="w-full border-gray-300 rounded-md text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2"
                                        dateFormat="dd/MM/yyyy"
                                    />
                                </div>
                            </div>

                            {/* Tombol Aksi */}
                            <div className="flex gap-2 self-end">
                                <button 
                                    onClick={applyDateFilter}
                                    disabled={!startDate || !endDate} // Disable jika belum pilih
                                    className={`text-sm font-bold py-2 px-4 rounded shadow transition ${(!startDate || !endDate) ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
                                >
                                    Terapkan Filter
                                </button>
                                {(filters.start_date || filters.end_date) && (
                                    <button 
                                        onClick={resetDateFilter}
                                        className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-bold py-2 px-4 rounded shadow transition"
                                    >
                                        Reset
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                    {/* -------------------------------------------------- */}

                    {/* --- STATS CARDS --- */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-blue-600">
                            <div className="text-gray-500 text-xs font-bold uppercase">Total Order</div>
                            <div className="text-2xl font-bold text-gray-800">{stats.total.toLocaleString()}</div>
                        </div>
                        <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-green-500">
                            <div className="text-green-600 text-xs font-bold uppercase">Completed / PS</div>
                            <div className="text-2xl font-bold text-green-700">{stats.completed.toLocaleString()}</div>
                        </div>
                        <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-yellow-500">
                            <div className="text-yellow-600 text-xs font-bold uppercase">Open / Progress</div>
                            <div className="text-2xl font-bold text-yellow-700">{stats.open.toLocaleString()}</div>
                        </div>
                    </div>

                    {/* --- ROW 1: TOTAL ORDER & SEBARAN PS --- */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                            <h3 className="text-md font-bold text-gray-700 mb-4 text-center border-b pb-2">Total Order Regional</h3>
                            <div className="h-80 flex justify-center items-center">
                                {hasData(chart1) ? <HsiPieChart data={chart1} title="Regional" /> : <div className="text-gray-400">No Data</div>}
                            </div>
                        </div>
                        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                            <h3 className="text-md font-bold text-gray-700 mb-4 text-center border-b pb-2">Sebaran Data PS per Witel</h3>
                            <div className="h-80 flex justify-center items-center">
                                {hasData(chart4) ? <HsiPieChart data={chart4} title="Total PS" /> : <div className="text-gray-400">Data PS Kosong</div>}
                            </div>
                        </div>
                    </div>

                    {/* --- ROW 2: CANCEL FCC & CANCEL BIASA --- */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                            <div className="h-96"> 
                                {hasData(chart5Data) ? (
                                    <StackedBarChart data={chart5Data} keys={chart5Keys} title="CANCEL BY FCC (SYSTEM)" /> 
                                ) : (
                                    <div className="h-full flex items-center justify-center text-gray-400">Tidak ada data Cancel FCC</div>
                                )}
                            </div>
                        </div>
                        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                            <div className="h-96">
                                {hasData(chart6Data) ? (
                                    <StackedBarChart data={chart6Data} keys={chart6Keys} title="CANCEL (NON-FCC)" /> 
                                ) : (
                                    <div className="h-full flex items-center justify-center text-gray-400">Tidak ada data Cancel Biasa</div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* --- ROW 3: STATUS & LAYANAN --- */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
                        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 relative">
                            <div className="flex justify-between items-center border-b pb-2 mb-4">
                                <h3 className="text-md font-bold text-gray-700">Komposisi Status</h3>
                                <select className="text-xs border-gray-300 rounded" value={filters.witel_status || ''} onChange={(e) => updateFilter('witel_status', e.target.value)}>
                                    <option value="">Semua Witel</option>
                                    {witels.map((w) => <option key={w} value={w}>{w}</option>)}
                                </select>
                            </div>
                            <div className="h-80 flex justify-center items-center">
                                {hasData(chart2) ? <HsiPieChart data={chart2} title="Status" /> : <div className="text-gray-400">No Data</div>}
                            </div>
                        </div>
                        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                             <div className="flex justify-between items-center border-b pb-2 mb-4">
                                <h3 className="text-md font-bold text-gray-700">Tren Jenis Layanan</h3>
                                <select className="text-xs border-gray-300 rounded" value={filters.witel_layanan || ''} onChange={(e) => updateFilter('witel_layanan', e.target.value)}>
                                    <option value="">Semua Witel</option>
                                    {witels.map((w) => <option key={w} value={w}>{w}</option>)}
                                </select>
                            </div>
                            <div className="h-80">
                                {hasData(chart3) ? <AmountBySubTypeChart data={chart3} /> : <div className="text-gray-400">No Data</div>}
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </AuthenticatedLayout>
    );
}