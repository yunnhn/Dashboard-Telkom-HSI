// resources/js/Pages/Galaksi/ShowDetails.jsx
// [FILE BARU]

import React from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';

// Helper untuk format tanggal
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

export default function ShowDetails({ auth, orders, pageTitle }) {
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
                                href={route('galaksi.index')} // Asumsi nama route Anda
                                className="mb-4 inline-flex items-center px-4 py-2 bg-gray-200 border border-transparent rounded-md font-semibold text-xs text-gray-700 uppercase tracking-widest hover:bg-gray-300"
                            >
                                &larr; Kembali ke Galaksi
                            </Link>

                            <table className="min-w-full divide-y divide-gray-200 border text-sm mt-4">
                                <thead className="bg-gray-100">
                                    <tr>
                                        <th className="px-4 py-2 text-left">Order ID</th>
                                        <th className="px-4 py-2 text-left">Produk</th>
                                        <th className="px-4 py-2 text-left">Customer</th>
                                        <th className="px-4 py-2 text-left">Milestone</th>
                                        <th className="px-4 py-2 text-left">Tgl Order</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {orders.length > 0 ? (
                                        orders.map((order, index) => (
                                            <tr key={order.order_id + '-' + index} className="hover:bg-gray-50">
                                                <td className="px-4 py-2">
                                                    {auth.user.role === 'admin' ? (
                                                        <Link
                                                            href={route('admin.record.edit', { type: 'galaksi', id: order.order_id })}
                                                            className="text-blue-600 hover:text-blue-800 hover:underline"
                                                            title={`Edit detail order ${order.order_id}`}
                                                        >
                                                            {order.order_id}
                                                        </Link>
                                                    ) : (
                                                        <span>{order.order_id}</span> // Tampilkan sebagai teks biasa jika bukan admin
                                                    )}
                                                </td>
                                                <td className="px-4 py-2">{order.product}</td>
                                                <td className="px-4 py-2">{order.customer_name}</td>
                                                <td className="px-4 py-2">{order.milestone}</td>
                                                <td className="px-4 py-2 whitespace-nowrap">{formatDate(order.order_created_date)}</td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="5" className="text-center py-10 text-gray-500">
                                                Tidak ada data order yang ditemukan.
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
