import React, { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

export default function ReportHsi({ auth, reportData = [], grandTotal = {}, filters = {} }) {
    // ... (Filter logic tetap sama) ...

    return (
        <AuthenticatedLayout
           // ... (Header tetap sama) ...
        >
            <Head title="Report HSI" />

            <div className="py-8">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8 space-y-6">
                    {/* ... (Div Filter tetap sama) ... */}

                    <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg border border-gray-200">
                        <div className="p-6">
                            <h3 className="text-lg font-bold text-gray-800 mb-4">Summary Report per Witel & Area</h3>
                            
                            <div className="overflow-x-auto">
                                <table className="min-w-full text-sm border-collapse border border-gray-300">
                                    <thead>
                                        {/* HEADER BARIS 1 */}
                                        <tr className="bg-[#1e3a8a] text-white">
                                            <th rowSpan={2} className="px-4 py-3 border border-gray-400 text-left font-bold uppercase w-1/4">WITEL / AREA</th>
                                            <th rowSpan={2} className="px-4 py-3 border border-gray-400 text-center font-bold uppercase bg-blue-900">TOTAL ORDER</th>
                                            
                                            {/* ColSpan jadi 3 saja karena kolom attention hilang */}
                                            <th colSpan={3} className="px-4 py-2 border border-gray-400 text-center font-bold uppercase bg-[#2563eb]">STATUS PROGRESS</th>
                                            
                                            {/* --- HAPUS HEADER 'ATTENTION' DI SINI --- */}
                                        </tr>
                                        
                                        {/* HEADER BARIS 2 */}
                                        <tr className="bg-[#1e3a8a] text-white text-xs">
                                            <th className="px-2 py-2 border border-gray-400 text-center uppercase font-semibold bg-[#3b82f6]">COMPLETED (PS)</th>
                                            <th className="px-2 py-2 border border-gray-400 text-center uppercase font-semibold bg-[#eab308] text-black">OPEN (PROSES)</th>
                                            <th className="px-2 py-2 border border-gray-400 text-center uppercase font-semibold bg-[#64748b]">CANCEL</th>
                                            
                                            {/* --- HAPUS HEADER 'OPEN > 30 HARI' DI SINI --- */}
                                        </tr>
                                    </thead>

                                    <tbody className="bg-white">
                                        {reportData && reportData.length > 0 ? (
                                            reportData.map((region, rIndex) => (
                                                <React.Fragment key={rIndex}>
                                                    
                                                    {/* REGIONAL ROW (BIRU) */}
                                                    <tr className="bg-[#172554] text-white font-bold border-b border-blue-800">
                                                        <td className="px-4 py-3 border-r border-blue-400 uppercase tracking-wide">{region.region_name}</td>
                                                        <td className="px-4 py-3 text-center border-r border-blue-400">{region.stats.total_order.toLocaleString()}</td>
                                                        <td className="px-4 py-3 text-center border-r border-blue-400 bg-[#1d4ed8]">{region.stats.total_ps.toLocaleString()}</td>
                                                        <td className="px-4 py-3 text-center border-r border-blue-400 bg-[#a16207]">{region.stats.total_open.toLocaleString()}</td>
                                                        <td className="px-4 py-3 text-center border-r border-blue-400 bg-[#475569]">{region.stats.total_cancel.toLocaleString()}</td>
                                                        
                                                        {/* --- HAPUS CELL DATA MERAH REGIONAL --- */}
                                                    </tr>

                                                    {/* CITY ROWS (PUTIH) */}
                                                    {region.details.map((city, cIndex) => (
                                                        <tr key={`${rIndex}-${cIndex}`} className="hover:bg-blue-50 text-gray-700 border-b border-gray-200">
                                                            <td className="px-8 py-2 border-l border-r border-gray-300 text-gray-600 font-medium">{city.name}</td>
                                                            <td className="px-4 py-2 text-center border-r border-gray-300">{city.total_order.toLocaleString()}</td>
                                                            <td className="px-4 py-2 text-center border-r border-gray-300 text-green-700">{city.total_ps.toLocaleString()}</td>
                                                            <td className="px-4 py-2 text-center border-r border-gray-300 text-yellow-600">{city.total_open.toLocaleString()}</td>
                                                            <td className="px-4 py-2 text-center border-r border-gray-300 text-gray-500">{city.total_cancel.toLocaleString()}</td>

                                                            {/* --- HAPUS CELL DATA MERAH CITY --- */}
                                                        </tr>
                                                    ))}

                                                </React.Fragment>
                                            ))
                                        ) : (
                                            <tr>
                                                {/* colSpan jadi 5 karena kolom berkurang 1 */}
                                                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">Tidak ada data.</td>
                                            </tr>
                                        )}
                                    </tbody>

                                    {/* FOOTER */}
                                    <tfoot>
                                        <tr className="bg-black text-white font-bold text-sm border-t-4 border-gray-400">
                                            <td className="px-4 py-4 border-r border-gray-600 uppercase">GRAND TOTAL</td>
                                            <td className="px-4 py-4 text-center bg-blue-900 border-r border-gray-600">{grandTotal?.total_order?.toLocaleString() || 0}</td>
                                            <td className="px-4 py-4 text-center bg-[#1d4ed8] border-r border-gray-600">{grandTotal?.total_ps?.toLocaleString() || 0}</td>
                                            <td className="px-4 py-4 text-center bg-[#a16207] border-r border-gray-600">{grandTotal?.total_open?.toLocaleString() || 0}</td>
                                            <td className="px-4 py-4 text-center bg-[#475569] border-r border-gray-600">{grandTotal?.total_cancel?.toLocaleString() || 0}</td>

                                            {/* --- HAPUS CELL DATA MERAH FOOTER --- */}
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}