// resources/js/Pages/ReportDatin/Details.jsx
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

export default function Details({ auth, orders, pageTitle }) {

    // Tentukan kolom yang akan ditampilkan (ambil dari order pertama jika ada)
    const columns = orders.length > 0 ? Object.keys(orders[0]) : [];

    return (
        <AuthenticatedLayout
            auth={auth}
            header={<h2 className="font-semibold text-xl text-gray-800 leading-tight">{pageTitle}</h2>}
        >
            <Head title={pageTitle} />

            <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg">
                        <div className="p-6">
                            <Link
                                href={route('report.datin')} // Kembali ke halaman laporan Datin
                                className="mb-4 inline-flex items-center px-4 py-2 bg-gray-200 border border-transparent rounded-md font-semibold text-xs text-gray-700 uppercase tracking-widest hover:bg-gray-300"
                            >
                                &larr; Kembali ke Laporan Datin
                            </Link>

                            <table className="min-w-full divide-y divide-gray-200 border text-sm mt-4">
                                <thead className="bg-gray-100">
                                    <tr>
                                        {/* Render header dinamis */}
                                        {columns.map(col => (
                                            <th key={col} className="px-4 py-2 text-left uppercase">{col.replace(/_/g, ' ')}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {orders.length > 0 ? (
                                        orders.map((order, index) => (
                                            <tr key={order.order_id || index} className="hover:bg-gray-50">
                                                {/* Render data dinamis */}
                                                {columns.map(col => {
                                                    let value = order[col];
                                                    // Formatting sederhana
                                                    if (col === 'order_date' || col.endsWith('_date')) value = formatDate(value);
                                                    if (col === 'est_bc') value = formatCurrency(value);

                                                    // Buat Order ID bisa diklik
                                                    if (col === 'order_id') {
                                                        return (
                                                            <td key={col} className="px-4 py-2">
                                                                {auth.user.role === 'admin' ? (
                                                                    <Link
                                                                        href={route('admin.record.edit', { type: 'datin', id: order.order_id })}
                                                                        className="text-blue-600 hover:text-blue-800 hover:underline"
                                                                        title={`Edit detail order ${order.order_id}`}
                                                                    >
                                                                        {value}
                                                                    </Link>
                                                                ) : (
                                                                    <span>{value}</span> // Tampilkan sebagai teks biasa jika bukan admin
                                                                )}
                                                            </td>
                                                        );
                                                    }

                                                    return <td key={col} className="px-4 py-2">{value}</td>
                                                })}
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={columns.length || 1} className="text-center py-10 text-gray-500">
                                                Tidak ada data order yang ditemukan untuk filter ini.
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
