import React, { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, router } from '@inertiajs/react';

export default function ReportHsi({ auth, hsiData, filters, flash }) { // Tambahkan props flash jika ada
    const [showUploadModal, setShowUploadModal] = useState(false);
    
    // Form Helper dari Inertia
    const { data, setData, post, processing, errors, reset } = useForm({
        file: null,
        date_format: 'm/d/Y', // Default Format
    });

    // Handle Search
    const [searchTerm, setSearchTerm] = useState(filters.search || '');
    const handleSearch = (e) => {
        e.preventDefault();
        router.get(route('admin.report.hsi.index'), { search: searchTerm }, { preserveState: true });
    };

    // Handle Upload
    const handleUpload = (e) => {
        e.preventDefault();
        post(route('admin.report.hsi.import'), {
            onSuccess: () => {
                setShowUploadModal(false);
                reset();
                alert("Upload Berhasil!"); // Feedback sederhana
            },
        });
    };

    // Handle Reset DB
    const handleResetDb = () => {
        if(confirm("YAKIN HAPUS SEMUA DATA? Data tidak bisa dikembalikan!")) {
            router.delete(route('admin.report.hsi.reset'));
        }
    };

    // Handle Delete Single
    const handleDelete = (id) => {
        if(confirm("Hapus data ini?")) {
            router.delete(route('admin.report.hsi.destroy', id));
        }
    };

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={<h2 className="font-semibold text-xl text-gray-800 leading-tight">Admin Report HSI</h2>}
        >
            <Head title="Admin HSI" />

            <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    
                    {/* --- FEEDBACK MESSAGE (JIKA ADA DARI CONTROLLER) --- */}
                    {flash?.success && (
                        <div className="mb-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
                            {flash.success}
                        </div>
                    )}
                    {flash?.error && (
                        <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                            {flash.error}
                        </div>
                    )}

                    {/* --- TOOLBAR (SEARCH & ACTIONS) --- */}
                    <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                        <form onSubmit={handleSearch} className="flex gap-2 w-full md:w-auto">
                            <input 
                                type="text" 
                                placeholder="Cari Order / Witel..." 
                                className="border border-gray-300 rounded px-3 py-2 text-sm w-full md:w-64"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            <button type="submit" className="bg-gray-600 text-white px-4 py-2 rounded text-sm hover:bg-gray-700">
                                Cari
                            </button>
                        </form>

                        <div className="flex gap-2">
                            <button 
                                onClick={() => setShowUploadModal(true)}
                                className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-bold hover:bg-blue-700 shadow"
                            >
                                + Import Excel
                            </button>
                            <button 
                                onClick={handleResetDb}
                                className="bg-red-600 text-white px-4 py-2 rounded text-sm font-bold hover:bg-red-700 shadow"
                            >
                                ⚠️ Reset Database
                            </button>
                        </div>
                    </div>

                    {/* --- TABEL DATA --- */}
                    <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase">No Order</th>
                                    <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase">Witel</th>
                                    <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase">Tgl Order</th>
                                    <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase">Status</th>
                                    <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase">Layanan</th>
                                    <th className="px-4 py-3 text-center font-medium text-gray-500 uppercase">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {hsiData.data.length > 0 ? (
                                    hsiData.data.map((item) => (
                                        <tr key={item.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-3 font-medium text-gray-900">{item.nomor_order}</td>
                                            <td className="px-4 py-3 text-gray-600">{item.witel}</td>
                                            <td className="px-4 py-3 text-gray-600">{item.order_date}</td>
                                            <td className="px-4 py-3 text-gray-600">{item.status_resume}</td>
                                            <td className="px-4 py-3 text-gray-600">{item.type_layanan}</td>
                                            <td className="px-4 py-3 text-center">
                                                <button 
                                                    onClick={() => handleDelete(item.id)}
                                                    className="text-red-600 hover:text-red-900 font-bold"
                                                >
                                                    Hapus
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="6" className="px-4 py-8 text-center text-gray-400">
                                            Tidak ada data. Silakan import Excel.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Sederhana */}
                    <div className="mt-4 flex justify-center gap-2">
                        {hsiData.links.map((link, k) => (
                            <button
                                key={k}
                                onClick={() => link.url && router.get(link.url)}
                                dangerouslySetInnerHTML={{ __html: link.label }}
                                className={`px-3 py-1 rounded border text-xs ${link.active ? 'bg-blue-600 text-white' : 'bg-white text-gray-600'} ${!link.url ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100'}`}
                                disabled={!link.url}
                            />
                        ))}
                    </div>

                </div>
            </div>

            {/* --- MODAL UPLOAD (DENGAN DROPDOWN PILIHAN FORMAT) --- */}
            {showUploadModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
                        <div className="px-6 py-4 border-b flex justify-between items-center">
                            <h3 className="text-lg font-bold text-gray-800">Import Data HSI</h3>
                            <button onClick={() => setShowUploadModal(false)} className="text-gray-500 font-bold text-xl">&times;</button>
                        </div>
                        
                        <form onSubmit={handleUpload} className="p-6 space-y-4">
                            
                            {/* Input File */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Pilih File Excel</label>
                                <input 
                                    type="file" 
                                    accept=".xlsx,.xls,.csv"
                                    onChange={(e) => setData('file', e.target.files[0])}
                                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                />
                                {errors.file && <div className="text-red-500 text-xs mt-1">{errors.file}</div>}
                            </div>

                            {/* --- INPUT FORMAT TANGGAL (INI YANG ANDA CARI) --- */}
                            <div className="bg-yellow-50 p-4 rounded border border-yellow-200">
                                <label className="block text-sm font-bold text-gray-800 mb-1">
                                    Format Tanggal di Excel?
                                </label>
                                <p className="text-xs text-gray-600 mb-2">
                                    Cek Excel Anda. Apakah "12/4/2025" berarti 4 Desember (Bulan duluan) atau 12 April (Tanggal duluan)?
                                </p>
                                <select 
                                    value={data.date_format}
                                    onChange={(e) => setData('date_format', e.target.value)}
                                    className="w-full border-gray-300 rounded text-sm focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="m/d/Y">Bulan/Tanggal/Tahun (Contoh: 12/31/2025)</option>
                                    <option value="d/m/Y">Tanggal/Bulan/Tahun (Contoh: 31/12/2025)</option>
                                    <option value="Y-m-d">Tahun-Bulan-Tanggal (Contoh: 2025-12-31)</option>
                                </select>
                                {errors.date_format && <div className="text-red-500 text-xs mt-1">{errors.date_format}</div>}
                            </div>
                            {/* ----------------------------------------------- */}

                            <div className="flex justify-end pt-2">
                                <button 
                                    type="button" 
                                    onClick={() => setShowUploadModal(false)}
                                    className="mr-2 px-4 py-2 text-gray-600 bg-gray-200 rounded hover:bg-gray-300 font-medium text-sm"
                                >
                                    Batal
                                </button>
                                <button 
                                    type="submit" 
                                    disabled={processing}
                                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-bold text-sm disabled:opacity-50"
                                >
                                    {processing ? 'Mengupload...' : 'Upload Data'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}