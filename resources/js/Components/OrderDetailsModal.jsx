// resources/js/Components/DetailsModal.jsx
// (File ini adalah modifikasi/pengganti dari OrderDetailsModal.jsx)

import React, { useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

// Helper untuk format tanggal
const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
        return new Date(dateString).toLocaleDateString('id-ID', {
            day: '2-digit', month: 'short', year: 'numeric',
        });
    } catch (e) { return dateString; }
};

// [BARU] Konfigurasi untuk setiap tipe data
// Ini adalah kunci untuk membuat modal generik
const modalConfig = {
    datin: {
        headers: [
            { key: 'order_id', title: 'Order ID' },
            { key: 'product', title: 'Produk' },
            { key: 'customer_name', title: 'Customer' },
            { key: 'milestone', title: 'Milestone', editable: true,
              options: ['Pre-Order', 'On-Process', 'Done'] }, // [CONTOH OPSI]
            { key: 'order_created_date', title: 'Tgl Order', type: 'date' },
        ],
        identifierKey: 'order_id', // Kunci unik untuk update
    },
    galaksi: {
        headers: [
            { key: 'order_id', title: 'Order ID' },
            { key: 'product', title: 'Produk' },
            { key: 'customer_name', title: 'Customer' },
            { key: 'milestone', title: 'Milestone', editable: true,
              options: ['Pre-Order', 'On-Process', 'Done'] }, // [CONTOH OPSI]
            { key: 'order_created_date', title: 'Tgl Order', type: 'date' },
        ],
        identifierKey: 'order_id',
    },
    jt: {
        headers: [
            { key: 'ihld', title: 'IHLD' },
            { key: 'uraian_kegiatan', title: 'Nama Project' },
            { key: 'status_tomps', title: 'Status TOMPS', editable: true,
              options: ['INITIAL', 'SURVEY & DRM', 'PERIZINAN & MOS', 'INSTALASI', 'FI - OGP GOLIVE'] },
            { key: 'tgl_mom', title: 'Tgl MOM', type: 'date' },
            { key: 'revenue', title: 'Revenue', type: 'currency' },
        ],
        identifierKey: 'ihld',
    }
};

// Komponen Row yang bisa diedit
const EditableRow = ({ item, config, type, isAdmin, onSuccess }) => {

    const [status, setStatus] = useState(
        // Cari field pertama yang 'editable' untuk status
        item[config.headers.find(h => h.editable)?.key]
    );
    const [isLoading, setIsLoading] = useState(false);

    const handleStatusChange = (e) => {
        const newStatus = e.target.value;
        const fieldConfig = config.headers.find(h => h.editable);
        if (!fieldConfig) return;

        setIsLoading(true);
        const identifier = item[config.identifierKey];

        axios.put(route('data.updateStatus'), {
            type: type,
            identifier: identifier,
            field: fieldConfig.key, // Kolom yang di-update (misal: 'milestone')
            new_status: newStatus,
        })
        .then(response => {
            setStatus(newStatus);
            toast.success(response.data.message || 'Status diupdate!');
            onSuccess(); // Panggil callback untuk refresh data di halaman induk
        })
        .catch(error => {
            toast.error(error.response?.data?.error || 'Gagal update status.');
            // Rollback state jika gagal
            setStatus(item[fieldConfig.key]);
        })
        .finally(() => {
            setIsLoading(false);
        });
    };

    const formatCell = (value, type) => {
        if (type === 'date') return formatDate(value);
        if (type === 'currency') return parseFloat(value).toLocaleString('id-ID');
        return value;
    };

    return (
        <tr className={`hover:bg-gray-50 ${isLoading ? 'opacity-50' : ''}`}>
            {config.headers.map(header => {
                const value = item[header.key];

                // Jika kolom ini 'editable' DAN user adalah admin
                if (header.editable && isAdmin) {
                    return (
                        <td key={header.key} className="px-4 py-2">
                            <select
                                value={status}
                                onChange={handleStatusChange}
                                disabled={isLoading}
                                className="border-gray-300 rounded-md shadow-sm text-sm"
                            >
                                {header.options.map(opt => (
                                    <option key={opt} value={opt}>{opt}</option>
                                ))}
                            </select>
                        </td>
                    );
                }

                // Jika tidak, tampilkan sebagai teks biasa
                return (
                    <td key={header.key} className="px-4 py-2 whitespace-nowrap">
                        {formatCell(value, header.type)}
                    </td>
                );
            })}
        </tr>
    );
};


// Komponen Modal Utama
export default function DetailsModal({ isOpen, onClose, title, items, isLoading, type, auth, onSuccess }) {
    if (!isOpen) return null;

    // Tentukan user admin atau bukan
    // Asumsi role disimpan di auth.user.role
    const isAdmin = auth.user?.role === 'admin';

    // Ambil konfigurasi tabel berdasarkan 'type'
    const config = modalConfig[type];

    if (!config) {
        console.error(`Tipe modal "${type}" tidak valid.`);
        return null;
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">{title}</h2>
                    <button onClick={onClose} className="text-gray-600 hover:text-gray-900 text-2xl">&times;</button>
                </div>

                <div className="overflow-y-auto">
                    {isLoading ? (
                        <div className="text-center py-10">Memuat data...</div>
                    ) : (
                        <table className="min-w-full divide-y divide-gray-200 border text-sm">
                            <thead className="bg-gray-100">
                                <tr>
                                    {config.headers.map(header => (
                                        <th key={header.key} className="px-4 py-2 text-left">{header.title}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {items.length > 0 ? (
                                    items.map((item, index) => (
                                        <EditableRow
                                            key={item[config.identifierKey] || index}
                                            item={item}
                                            config={config}
                                            type={type}
                                            isAdmin={isAdmin}
                                            onSuccess={onSuccess}
                                        />
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={config.headers.length} className="text-center py-10 text-gray-500">
                                            Tidak ada data yang ditemukan.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
}
