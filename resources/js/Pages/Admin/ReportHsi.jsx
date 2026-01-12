import React, { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, router } from '@inertiajs/react';

export default function ReportHsiAdmin({ auth, hsiData, filters }) {
    // State Search
    const [search, setSearch] = useState(filters.search || '');

    // State Upload Form
    // Default format langsung ke 'd/m/Y' sesuai request
    const { data, setData, post, reset, errors } = useForm({
        file: null,
        date_format: 'd/m/Y',
    });

    // 1. Handle Search
    const handleSearch = (e) => {
        if (e.key === 'Enter') {
            router.get(route('admin.report_hsi.index'), { search }, { preserveState: true });
        }
    };

    // 2. Handle Upload (PENTING: forceFormData: true)
    const handleUpload = (e) => {
        e.preventDefault();

        if (!data.file) {
            alert("Pilih file terlebih dahulu!");
            return;
        }

        // Tampilkan alert manual jika ingin memberi feedback ke user tanpa mengubah tombol
        // alert("Proses upload dimulai. Mohon tunggu...");

        post(route('admin.report_hsi.store'), {
            forceFormData: true,
            onSuccess: () => {
                reset('file');
                alert('Upload Berhasil!');
                router.reload({ only: ['hsiData'] });
            },
            onError: (err) => {
                console.error(err);
                alert('Gagal Upload. Cek konsol atau pastikan format file benar.');
            }
        });
    };

    // 3. Handle Reset Database
    const handleResetDb = () => {
        if (window.confirm('PERINGATAN: Apakah Anda yakin ingin MENGHAPUS SEMUA DATA? Tindakan ini tidak bisa dibatalkan.')) {
            router.delete(route('admin.report_hsi.destroy_all'), {
                onSuccess: () => alert('Database berhasil dikosongkan.'),
                onError: () => alert('Gagal mereset database.')
            });
        }
    };

    // 4. Handle Delete Single
    const handleDelete = (id) => {
        if (window.confirm('Hapus data baris ini?')) {
            router.delete(route('admin.report_hsi.destroy', id), {
                preserveScroll: true,
                onSuccess: () => console.log('Deleted'),
            });
        }
    };

    // 5. Pagination
    const handlePageChange = (url) => {
        if (url) {
            router.get(url, { search }, { preserveState: true, preserveScroll: true });
        }
    };

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={<h2 className="font-semibold text-xl text-gray-800 leading-tight">Admin - Kelola Data HSI</h2>}
        >
            <Head title="Admin HSI" />

            <div className="py-8">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8 space-y-6">

                    {/* --- PANEL UPLOAD --- */}
                    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                        <div className="flex flex-col md:flex-row justify-between gap-6">

                            {/* FORM UPLOAD */}
                            <form onSubmit={handleUpload} className="flex-1 flex flex-col gap-4">
                                <h3 className="font-bold text-lg text-gray-700">Import Data Excel</h3>

                                {/* Error Message dari Backend */}
                                {errors.file && <div className="text-red-500 text-sm">{errors.file}</div>}

                                <div className="flex flex-col md:flex-row gap-4 items-end">
                                    <div className="w-full">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">File Excel/CSV/ZIP</label>
                                        <input
                                            type="file"
                                            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 border border-gray-300 rounded-md cursor-pointer"
                                            onChange={e => setData('file', e.target.files[0])}
                                            accept=".xlsx,.xls,.csv,.zip"
                                        />
                                        {/* Progress bar dihapus sesuai permintaan */}
                                    </div>

                                    <div className="min-w-[150px]">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Format Tanggal</label>
                                        <select
                                            className="border-gray-300 rounded-md text-sm shadow-sm focus:ring-blue-500 focus:border-blue-500 w-full p-2"
                                            value={data.date_format}
                                            onChange={e => setData('date_format', e.target.value)}
                                        >
                                            {/* URUTAN DITUKAR: d/m/Y Paling Atas */}
                                            <option value="d/m/Y">Hari/Bulan/Thn (Indo)</option>
                                            <option value="m/d/Y">Bulan/Hari/Thn (Excel Default)</option>
                                            <option value="Y-m-d">Tahun-Bulan-Hari (SQL)</option>
                                        </select>
                                    </div>

                                    <button
                                        type="submit"
                                        // Disabled dihapus agar tombol selalu aktif secara visual
                                        className="font-bold py-2 px-6 rounded shadow text-white transition bg-blue-600 hover:bg-blue-700"
                                    >
                                        Upload
                                    </button>
                                </div>
                            </form>

                            {/* TOMBOL RESET DB */}
                            <div className="flex items-end border-l pl-6 border-gray-300">
                                <button
                                    onClick={handleResetDb}
                                    className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded shadow whitespace-nowrap"
                                >
                                    Reset / Kosongkan Database
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* --- TABEL DATA --- */}
                    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-lg text-gray-700">
                                Data Preview <span className="text-sm font-normal text-gray-500">({hsiData?.total || 0} Rows)</span>
                            </h3>
                            <input
                                type="text"
                                placeholder="Cari Order ID..."
                                className="border-gray-300 rounded-md text-sm shadow-sm focus:ring-blue-500 focus:border-blue-500 w-1/3 p-2"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onKeyDown={handleSearch}
                            />
                        </div>

                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 text-sm">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left font-medium text-gray-500">Order ID</th>
                                        <th className="px-4 py-3 text-left font-medium text-gray-500">Tanggal</th>
                                        <th className="px-4 py-3 text-left font-medium text-gray-500">Pelanggan</th>
                                        <th className="px-4 py-3 text-left font-medium text-gray-500">Witel</th>
                                        <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
                                        <th className="px-4 py-3 text-center font-medium text-gray-500">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {hsiData && hsiData.data && hsiData.data.length > 0 ? (
                                        hsiData.data.map((item) => (
                                            <tr key={item.id} className="hover:bg-gray-50 transition">
                                                <td className="px-4 py-3 font-medium text-blue-600">{item.order_id || item.track_id}</td>
                                                <td className="px-4 py-3 text-gray-500">{item.order_date}</td>
                                                <td className="px-4 py-3 text-gray-900 font-semibold">{item.customer_name}</td>
                                                <td className="px-4 py-3 text-gray-500">{item.witel}</td>
                                                <td className="px-4 py-3">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-semibold
                                                        ${item.kelompok_status === 'PS' ? 'bg-green-100 text-green-800' :
                                                          item.kelompok_status === 'CANCEL' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}
                                                    `}>
                                                        {item.kelompok_status}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <button
                                                        onClick={() => handleDelete(item.id)}
                                                        className="text-red-600 hover:text-red-900 font-bold px-2 py-1 hover:bg-red-50 rounded"
                                                        title="Hapus baris ini"
                                                    >
                                                        X
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="6" className="text-center py-8 text-gray-500 italic">
                                                Tidak ada data. Silakan upload file Excel.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination Controls */}
                        {hsiData && hsiData.links && (
                            <div className="mt-4 flex justify-end gap-1">
                                {hsiData.links.map((link, i) => (
                                    <button
                                        key={i}
                                        onClick={() => handlePageChange(link.url)}
                                        disabled={!link.url || link.active}
                                        className={`px-3 py-1 border rounded text-xs transition
                                            ${link.active ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 hover:bg-gray-100'}
                                            ${!link.url ? 'opacity-50 cursor-not-allowed' : ''}
                                        `}
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </AuthenticatedLayout>
    );
}