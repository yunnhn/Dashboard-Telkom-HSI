import React, { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

export default function ReportHsi({ auth, reportData = [], grandTotal = {}, filters = {} }) {

    // --- State Filter Tanggal ---
    const [dateRange, setDateRange] = useState([
        filters?.start_date ? new Date(filters.start_date) : null, 
        filters?.end_date ? new Date(filters.end_date) : null
    ]);
    const [startDate, endDate] = dateRange;

    // Handle Filter
    const handleDateFilter = () => {
        if (startDate && endDate) {
            const format = (d) => {
                const year = d.getFullYear();
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
            };
            router.get(route('report.hsi'), { 
                start_date: format(startDate),
                end_date: format(endDate)
            }, { preserveState: true });
        }
    };

    // Handle Reset
    const handleReset = () => {
        setDateRange([null, null]);
        router.get(route('report.hsi'));
    };

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={<h2 className="font-semibold text-xl text-gray-800 leading-tight">Report Summary HSI</h2>}
        >
            <Head title="Report HSI" />

            <div className="py-8">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8 space-y-6">
                    
                    {/* --- FILTER AREA --- */}
                    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex flex-col md:flex-row gap-4">
                        <div className="w-full md:w-1/2">
                            <label className="block text-sm font-bold text-gray-700 mb-1">Filter Tanggal Order</label>
                            <div className="flex gap-2 relative z-10">
                                <div className="flex-grow">
                                    <DatePicker
                                        selectsRange={true}
                                        startDate={startDate}
                                        endDate={endDate}
                                        onChange={(update) => setDateRange(update)}
                                        isClearable={true}
                                        placeholderText="Pilih Rentang Tanggal"
                                        className="w-full border-gray-300 rounded-md text-sm shadow-sm focus:ring-indigo-500 focus:border-indigo-500 p-2"
                                        dateFormat="dd/MM/yyyy"
                                    />
                                </div>
                                <button onClick={handleDateFilter} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-bold">
                                    Filter
                                </button>
                                <button onClick={handleReset} className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded text-sm font-bold">
                                    Reset
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* --- TABEL REPORT BERTINGKAT --- */}
                    <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg border border-gray-200">
                        <div className="p-6">
                            <h3 className="text-lg font-bold text-gray-800 mb-4">Summary Report per Witel & Area</h3>
                            
                            <div className="overflow-x-auto">
                                <table className="min-w-full text-sm border-collapse border border-gray-300">
                                    <thead>
                                        {/* HEADER UTAMA */}
                                        <tr className="bg-[#1e3a8a] text-white">
                                            <th rowSpan={2} className="px-4 py-3 border border-gray-400 text-left font-bold uppercase w-1/4">
                                                WITEL / AREA
                                            </th>
                                            <th rowSpan={2} className="px-4 py-3 border border-gray-400 text-center font-bold uppercase bg-blue-900">
                                                TOTAL ORDER
                                            </th>
                                            <th colSpan={3} className="px-4 py-2 border border-gray-400 text-center font-bold uppercase bg-[#2563eb]">
                                                STATUS PROGRESS
                                            </th>
                                            <th colSpan={1} className="px-4 py-2 border border-gray-400 text-center font-bold uppercase bg-[#dc2626]">
                                                ATTENTION
                                            </th>
                                        </tr>
                                        <tr className="bg-[#1e3a8a] text-white text-xs">
                                            <th className="px-2 py-2 border border-gray-400 text-center uppercase font-semibold bg-[#3b82f6]">
                                                COMPLETED (PS)
                                            </th>
                                            <th className="px-2 py-2 border border-gray-400 text-center uppercase font-semibold bg-[#eab308] text-black">
                                                OPEN (PROSES)
                                            </th>
                                            <th className="px-2 py-2 border border-gray-400 text-center uppercase font-semibold bg-[#64748b]">
                                                CANCEL
                                            </th>
                                            <th className="px-2 py-2 border border-red-300 text-center uppercase font-bold bg-red-100 text-red-800">
                                                OPEN &gt; 30 HARI
                                            </th>
                                        </tr>
                                    </thead>

                                    <tbody className="bg-white">
                                        {reportData && reportData.length > 0 ? (
                                            reportData.map((region, rIndex) => (
                                                <React.Fragment key={rIndex}>
                                                    
                                                    {/* --- BARIS 1: HEADER REGIONAL (BIRU GELAP) --- */}
                                                    <tr className="bg-[#172554] text-white font-bold border-b border-blue-800">
                                                        <td className="px-4 py-3 border-r border-blue-400 uppercase tracking-wide">
                                                            {region.region_name}
                                                        </td>
                                                        <td className="px-4 py-3 text-center border-r border-blue-400">
                                                            {region.stats.total_order.toLocaleString()}
                                                        </td>
                                                        <td className="px-4 py-3 text-center border-r border-blue-400 bg-[#1d4ed8]">
                                                            {region.stats.total_ps.toLocaleString()}
                                                        </td>
                                                        <td className="px-4 py-3 text-center border-r border-blue-400 bg-[#a16207]">
                                                            {region.stats.total_open.toLocaleString()}
                                                        </td>
                                                        <td className="px-4 py-3 text-center border-r border-blue-400 bg-[#475569]">
                                                            {region.stats.total_cancel.toLocaleString()}
                                                        </td>
                                                        <td className="px-4 py-3 text-center border-r border-blue-400 bg-[#991b1b]">
                                                            {region.stats.open_more_30_days.toLocaleString()}
                                                        </td>
                                                    </tr>

                                                    {/* --- BARIS 2..n: DETAIL KOTA (PUTIH) --- */}
                                                    {region.details.map((city, cIndex) => (
                                                        <tr key={`${rIndex}-${cIndex}`} className="hover:bg-blue-50 text-gray-700 border-b border-gray-200">
                                                            <td className="px-8 py-2 border-l border-r border-gray-300 text-gray-600 font-medium">
                                                                {city.name}
                                                            </td>
                                                            <td className="px-4 py-2 text-center border-r border-gray-300">
                                                                {city.total_order.toLocaleString()}
                                                            </td>
                                                            <td className="px-4 py-2 text-center border-r border-gray-300 text-green-700">
                                                                {city.total_ps.toLocaleString()}
                                                            </td>
                                                            <td className="px-4 py-2 text-center border-r border-gray-300 text-yellow-600">
                                                                {city.total_open.toLocaleString()}
                                                            </td>
                                                            <td className="px-4 py-2 text-center border-r border-gray-300 text-gray-500">
                                                                {city.total_cancel.toLocaleString()}
                                                            </td>
                                                            <td className="px-4 py-2 text-center border-r border-gray-300 text-red-600 font-bold bg-red-50">
                                                                {city.open_more_30_days.toLocaleString()}
                                                            </td>
                                                        </tr>
                                                    ))}

                                                </React.Fragment>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">Tidak ada data.</td>
                                            </tr>
                                        )}
                                    </tbody>

                                    {/* FOOTER GRAND TOTAL */}
                                    <tfoot>
                                        <tr className="bg-black text-white font-bold text-sm border-t-4 border-gray-400">
                                            <td className="px-4 py-4 border-r border-gray-600 uppercase">GRAND TOTAL</td>
                                            <td className="px-4 py-4 text-center bg-blue-900 border-r border-gray-600">
                                                {grandTotal?.total_order?.toLocaleString() || 0}
                                            </td>
                                            <td className="px-4 py-4 text-center bg-[#1d4ed8] border-r border-gray-600">
                                                {grandTotal?.total_ps?.toLocaleString() || 0}
                                            </td>
                                            <td className="px-4 py-4 text-center bg-[#a16207] border-r border-gray-600">
                                                {grandTotal?.total_open?.toLocaleString() || 0}
                                            </td>
                                            <td className="px-4 py-4 text-center bg-[#475569] border-r border-gray-600">
                                                {grandTotal?.total_cancel?.toLocaleString() || 0}
                                            </td>
                                            <td className="px-4 py-4 text-center bg-[#991b1b]">
                                                {grandTotal?.open_more_30_days?.toLocaleString() || 0}
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                            <div className="mt-4 text-xs text-red-600 italic font-medium">
                                * Kolom "Open &gt; 30 Hari" menunjukkan jumlah order yang belum selesai dan tanggal ordernya sudah lebih dari 30 hari lalu.
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}