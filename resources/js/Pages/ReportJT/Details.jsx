// resources/js/Pages/ReportJT/Details.jsx
// [FILE BARU]

import React from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';

// Helper format tanggal
const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
        return new Date(dateString).toLocaleDateString('id-ID', {
            day: '2-digit', month: 'short', year: 'numeric',
        });
    } catch (e) {
        return dateString;
    }
};

// Helper format mata uang
const formatCurrency = (value) => {
    const num = parseFloat(value);
    if (isNaN(num)) {
        return 0;
    }
    return num.toLocaleString('id-ID', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    });
};

export default function Details({ auth, orders, pageTitle, filters }) {

    const title = `Detail JT: ${filters.witel} (${filters.kpi_key})`;

    return (
        <AuthenticatedLayout
            auth={auth}
            header={<h2 className="font-semibold text-xl text-gray-800 leading-tight">{title}</h2>}
        >
            <Head title={title} />

            <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg">
                        <div className="p-6">
                            <Link
                                href={route('report.jt')} // Kembali ke halaman laporan JT
                                className="mb-4 inline-flex items-center px-4 py-2 bg-gray-200 border border-transparent rounded-md font-semibold text-xs text-gray-700 uppercase tracking-widest hover:bg-gray-300"
                            >
                                &larr; Kembali ke Laporan JT
                            </Link>

                            <table className="min-w-full divide-y divide-gray-200 border text-sm mt-4">
                                <thead className="bg-gray-100">
                                    <tr>
                                        <th className="px-4 py-2 text-left">IHLD</th>
                                        <th className="px-4 py-2 text-left">Uraian Kegiatan</th>
                                        <th className="px-4 py-2 text-left">Witel Lama</th>
                                        <th className="px-4 py-2 text-left">Status TOMPS</th>
                                        <th className="px-4 py-2 text-left">Tgl MOM</th>
                                        <th className="px-4 py-2 text-right">Revenue</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {orders.length > 0 ? (
                                        orders.map((order) => (
                                            <tr key={order.ihld} className="hover:bg-gray-50">
                                                <td className="px-4 py-2">
                                                    {/* Link ke Halaman Editor Universal Anda */}
                                                    {auth.user.role === 'admin' ? (
                                                        <Link
                                                            href={route('admin.record.edit', { type: 'jt', id: order.ihld })}
                                                            className="text-blue-600 hover:text-blue-800 hover:underline"
                                                            title={`Edit detail project ${order.ihld}`}
                                                        >
                                                            {order.ihld}
                                                        </Link>
                                                    ) : (
                                                        <span>{order.ihld}</span> // Tampilkan sebagai teks biasa jika bukan admin
                                                    )}
                                                </td>
                                                <td className="px-4 py-2">{order.uraian_kegiatan}</td>
                                                <td className="px-4 py-2">{order.witel_lama}</td>
                                                <td className="px-4 py-2">{order.status_tomps}</td>
                                                <td className="px-4 py-2 whitespace-nowrap">{formatDate(order.tgl_mom)}</td>
                                                <td className="px-4 py-2 text-right whitespace-nowrap">{formatCurrency(order.revenue)}</td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="6" className="text-center py-10 text-gray-500">
                                                Tidak ada data project yang ditemukan untuk filter ini.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
