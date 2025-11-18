// resources/js/Pages/SuperAdmin/RollbackPage.jsx

import React from 'react';
import { useState } from 'react';
import { Head, useForm } from '@inertiajs/react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { FiAlertTriangle } from 'react-icons/fi';
import Swal from 'sweetalert2';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import InputLabel from '@/Components/InputLabel';
import InputError from '@/Components/InputError';

/**
 * [BARU] Komponen Tab Button
 */
const TabButton = ({ active, onClick, children }) => (
    <button
        onClick={onClick}
        className={`px-4 py-2 font-medium text-sm rounded-t-lg focus:outline-none ${active
            ? 'bg-white border-b-2 border-red-500 text-red-600'
            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
    >
        {children}
    </button>
);

/**
 * [BARU] Komponen Form Rollback (Bisa Digunakan Ulang)
 */
const RollbackForm = ({ title, description, routeName, recentBatches }) => {
    const { data, setData, post, processing, errors, reset } = useForm({
        batch_id: "",
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        Swal.fire({
            title: 'Anda Yakin?',
            html: `Aksi ini akan <b>MENGHAPUS PERMANEN</b> semua data (${title}) terkait Batch ID:<br/><code>${data.batch_id}</code><br/><br/>Operasi ini tidak dapat dibatalkan!`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Ya, Lanjutkan Rollback!',
            cancelButtonText: 'Batal'
        }).then((result) => {
            if (result.isConfirmed) {
                post(route(routeName), {
                    preserveScroll: true,
                    onSuccess: () => {
                        Swal.fire({
                            title: 'Berhasil!',
                            text: 'Proses rollback telah berhasil dijalankan.',
                            icon: 'success',
                            timer: 2000,
                            showConfirmButton: false,
                        });
                        reset('batch_id');
                    },
                    onError: (error) => {
                        console.error("Rollback failed:", error);
                        Swal.fire({
                            title: 'Gagal!',
                            text: error.batch_id || 'Terjadi kesalahan saat melakukan rollback. Silakan cek log untuk detail.',
                            icon: 'error',
                        });
                    }
                });
            }
        });
    };

    const handleSelectBatch = (batchId) => {
        setData('batch_id', batchId);
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 lg:gap-8">
            {/* Kolom Utama (Form) */}
            <div className="lg:col-span-2">
                <div className="bg-white overflow-hidden sm:rounded-b-lg sm:rounded-r-lg">
                    <div className="p-6 md:p-8 space-y-6">
                        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md" role="alert">
                            <p className="font-bold flex items-center">
                                <FiAlertTriangle className="mr-2 h-5 w-5" aria-hidden="true" />
                                Peringatan Keras!
                            </p>
                            <p className="mt-1">{description}</p>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <InputLabel htmlFor={`batch_id_${routeName}`} value={`Batch ID (${title}) untuk Di-Rollback`} />
                                <input
                                    id={`batch_id_${routeName}`}
                                    name="batch_id"
                                    type="text"
                                    value={data.batch_id}
                                    onChange={(e) => setData("batch_id", e.target.value)}
                                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                    placeholder="Masukkan atau pilih Batch ID dari daftar..."
                                    required
                                />
                                <InputError message={errors.batch_id} className="mt-2" />
                            </div>
                            <button
                                type="submit"
                                disabled={processing || !data.batch_id}
                                className="w-full flex justify-center items-center px-4 py-2 bg-red-600 border border-transparent rounded-md font-semibold text-xs text-white uppercase tracking-widest hover:bg-red-700 active:bg-red-800 disabled:opacity-50 transition"
                            >
                                {processing ? "Memproses..." : `Jalankan Rollback ${title}`}
                            </button>
                        </form>
                    </div>
                </div>
            </div>

            {/* Kolom Sidebar (Daftar Batch) */}
            <div className="lg:col-span-1 mt-8 lg:mt-0">
                <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg">
                    <div className="p-6">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">
                            Riwayat Batch {title}
                        </h3>
                        {recentBatches && recentBatches.length > 0 ? (
                            <>
                                <ul className="space-y-3 max-h-96 overflow-y-auto pr-2">
                                    {recentBatches.map((batch) => (
                                        <li key={batch.batch_id} className="flex justify-between items-center p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                                            <div className="flex flex-col min-w-0 mr-3">
                                                <span className="text-sm font-mono text-gray-700 truncate" title={batch.batch_id}>
                                                    {batch.batch_id}
                                                </span>
                                                {batch.last_upload_time && (
                                                    <span className="text-xs text-gray-500 mt-1">
                                                        {format(new Date(batch.last_upload_time), 'dd MMM yyyy, HH:mm', { locale: id })}
                                                    </span>
                                                )}
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => handleSelectBatch(batch.batch_id)}
                                                className="flex-shrink-0 px-3 py-1 text-xs bg-indigo-100 text-indigo-800 font-semibold rounded-full hover:bg-indigo-200 transition-colors"
                                                aria-label={`Pilih batch ${batch.batch_id}`}
                                            >
                                                Pilih
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                                <p className="text-xs text-gray-500 mt-4">
                                    Menampilkan 20 batch terakhir.
                                </p>
                            </>
                        ) : (
                            <p className="text-sm text-gray-500">
                                Belum ada riwayat batch upload yang tercatat untuk {title}.
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};


/**
 * [MODIFIKASI] Halaman Rollback Utama dengan TABS
 */
export default function RollbackPage({ auth, recentBatches, recentBatchesJT, recentBatchesDatin }) {
    const [activeTab, setActiveTab] = useState('dp'); // dp, jt, datin

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={<h2 className="font-semibold text-xl text-gray-800 leading-tight">Super Admin: Rollback Batch Upload</h2>}
        >
            <Head title="Rollback Batch Upload" />

            <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    {/* Navigasi Tab */}
                    <div className="flex border-b border-gray-200">
                        <TabButton active={activeTab === 'dp'} onClick={() => setActiveTab('dp')}>
                            Digital Product
                        </TabButton>
                        <TabButton active={activeTab === 'jt'} onClick={() => setActiveTab('jt')}>
                            Analysis JT
                        </TabButton>
                        <TabButton active={activeTab === 'datin'} onClick={() => setActiveTab('datin')}>
                            Analysis Datin
                        </TabButton>
                    </div>

                    {/* Konten Tab */}
                    <div className="mt-6">
                        {activeTab === 'dp' && (
                            <RollbackForm
                                title="Digital Product"
                                description="Fitur ini akan menghapus data dari tabel 'document_data', 'order_products', dan 'update_logs'."
                                routeName="superadmin.rollback.execute"
                                recentBatches={recentBatches}
                            />
                        )}
                        {activeTab === 'jt' && (
                            <RollbackForm
                                title="Analysis JT"
                                description="Fitur ini akan menghapus data dari tabel 'spmk_mom'."
                                routeName="superadmin.rollback.executeJT"
                                recentBatches={recentBatchesJT}
                            />
                        )}
                        {activeTab === 'datin' && (
                            <RollbackForm
                                title="Analysis Datin"
                                description="Fitur ini akan menghapus data dari tabel 'sos_data'."
                                routeName="superadmin.rollback.executeDatin"
                                recentBatches={recentBatchesDatin}
                            />
                        )}
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
