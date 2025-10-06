import React, { useState, useEffect, useMemo } from 'react'; // [TAMBAH] import useMemo
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm } from '@inertiajs/react';
import InputLabel from '@/Components/InputLabel';
import InputError from '@/Components/InputError';
import PrimaryButton from '@/Components/PrimaryButton';

// Komponen Modal Edit Agent (ini sudah benar)
const AgentFormModal = ({ isOpen, onClose, agent }) => {
    // ... (tidak ada perubahan di sini)
    const { data, setData, post, put, processing, errors, reset } = useForm({
        name: '', display_witel: '', filter_witel_lama: '',
        special_filter_column: '', special_filter_value: '',
    });

    useEffect(() => {
        if (agent) {
            setData({
                name: agent.name || '',
                display_witel: agent.display_witel || '',
                filter_witel_lama: agent.filter_witel_lama || '',
                special_filter_column: agent.special_filter_column || '',
                special_filter_value: agent.special_filter_value || '',
            });
        } else {
            reset();
        }
    }, [agent, isOpen]);

    const handleSubmit = (e) => {
        e.preventDefault();
        const onSuccess = () => onClose();
        if (agent) {
            put(route('account-officers.update', agent.id), { onSuccess, preserveScroll: true });
        } else {
            post(route('account-officers.store'), { onSuccess, preserveScroll: true });
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
                <h2 className="text-lg font-bold mb-4">{agent ? 'Edit Agen' : 'Tambah Agen Baru'}</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <InputLabel htmlFor="name" value="Nama PO" />
                        <input id="name" type="text" value={data.name} onChange={e => setData('name', e.target.value)} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm" required />
                        <InputError message={errors.name} className="mt-2" />
                    </div>
                    <div>
                        <InputLabel htmlFor="display_witel" value="Display Witel" />
                        <input id="display_witel" type="text" value={data.display_witel} onChange={e => setData('display_witel', e.target.value)} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm" required />
                        <InputError message={errors.display_witel} className="mt-2" />
                    </div>
                    <div>
                        <InputLabel htmlFor="filter_witel_lama" value="Filter Witel Lama (sesuai data mentah)" />
                        <input id="filter_witel_lama" type="text" value={data.filter_witel_lama} onChange={e => setData('filter_witel_lama', e.target.value)} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm" required />
                        <InputError message={errors.filter_witel_lama} className="mt-2" />
                    </div>
                    <div>
                        <InputLabel htmlFor="special_filter_column" value="Filter Kolom Khusus (opsional)" />
                        <input id="special_filter_column" type="text" value={data.special_filter_column} onChange={e => setData('special_filter_column', e.target.value)} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm" />
                        <InputError message={errors.special_filter_column} className="mt-2" />
                    </div>
                    <div>
                        <InputLabel htmlFor="special_filter_value" value="Nilai Filter Kolom Khusus (opsional)" />
                        <input id="special_filter_value" type="text" value={data.special_filter_value} onChange={e => setData('special_filter_value', e.target.value)} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm" />
                        <InputError message={errors.special_filter_value} className="mt-2" />
                    </div>
                    <div className="flex items-center justify-end gap-4 pt-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300">Batal</button>
                        <PrimaryButton type="submit" disabled={processing}>{processing ? 'Menyimpan...' : 'Simpan'}</PrimaryButton>
                    </div>
                </form>
            </div>
        </div>
    );
};


// Komponen Utama Halaman
export default function GalaksiIndex({ auth, kpiData = [], accountOfficers = [] }) { // [DIUBAH] Menerima 'kpiData' dan diberi nilai default array kosong
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingAgent, setEditingAgent] = useState(null);

    const openModal = (agent = null) => {
        setEditingAgent(agent);
        setIsModalOpen(true);
    };
    const closeModal = () => {
        setIsModalOpen(false);
        setEditingAgent(null);
    };

    return (
        <AuthenticatedLayout
            auth={auth}
            header="GApai! kawaL! AKSI!"
        >
            <Head title="GALAKSI REPORT" />

            <div className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-bold text-gray-800 mb-4">GApai! kawaL! AKSI!</h2>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 border">
                        {/* ... Bagian <thead> tabel tidak berubah ... */}
                        <thead className="bg-gray-50">
                            <tr>
                                <th rowSpan="2" className="px-4 py-2 text-center text-xs font-medium text-white uppercase tracking-wider border bg-green-600">NAMA PO</th>
                                <th rowSpan="2" className="px-4 py-2 text-center text-xs font-medium text-white uppercase tracking-wider border bg-green-600">WITEL</th>
                                <th colSpan="2" className="px-4 py-2 text-center text-xs font-medium text-white uppercase tracking-wider border bg-orange-500">PRODIGI DONE</th>
                                <th colSpan="2" className="px-4 py-2 text-center text-xs font-medium text-white uppercase tracking-wider border bg-blue-500">PRODIGI OGP</th>
                                <th rowSpan="2" className="px-4 py-2 text-center text-xs font-medium text-white uppercase tracking-wider border bg-green-600">TOTAL</th>
                                <th colSpan="2" className="px-4 py-2 text-center text-xs font-medium text-white uppercase tracking-wider border bg-yellow-400">ACH</th>
                                {auth.user.role !== 'user' && (
                                    <th rowSpan="2" className="px-4 py-2 text-center text-xs font-medium text-white uppercase tracking-wider border bg-gray-600">AKSI</th>)}
                            </tr>
                            <tr>
                                <th className="px-4 py-2 text-center text-xs font-medium text-white uppercase tracking-wider border bg-orange-400">NCX</th>
                                <th className="px-4 py-2 text-center text-xs font-medium text-white uppercase tracking-wider border bg-orange-400">SCONE</th>
                                <th className="px-4 py-2 text-center text-xs font-medium text-white uppercase tracking-wider border bg-blue-400">NCX</th>
                                <th className="px-4 py-2 text-center text-xs font-medium text-white uppercase tracking-wider border bg-blue-400">SCONE</th>
                                <th className="px-4 py-2 text-center text-xs font-medium text-white uppercase tracking-wider border bg-yellow-300">YTD</th>
                                <th className="px-4 py-2 text-center text-xs font-medium text-white uppercase tracking-wider border bg-yellow-300">Q3</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {/* [DIUBAH] Melakukan map pada 'kpiData' */}
                            {kpiData.map((po) => (
                                <tr key={po.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-2 whitespace-nowrap border font-medium">{po.nama_po}</td>
                                    <td className="px-4 py-2 whitespace-nowrap border">{po.witel}</td>
                                    <td className="px-4 py-2 whitespace-nowrap border text-center">{po.done_ncx}</td>
                                    <td className="px-4 py-2 whitespace-nowrap border text-center">{po.done_scone}</td>
                                    <td className="px-4 py-2 whitespace-nowrap border text-center">{po.ogp_ncx}</td>
                                    <td className="px-4 py-2 whitespace-nowrap border text-center">{po.ogp_scone}</td>
                                    <td className="px-4 py-2 whitespace-nowrap border text-center font-bold">{po.total}</td>
                                    <td className="px-4 py-2 whitespace-nowrap border text-center font-bold bg-yellow-100">{po.ach_ytd}</td>
                                    <td className="px-4 py-2 whitespace-nowrap border text-center font-bold bg-yellow-100">{po.ach_q3}</td>
                                    {auth.user.role !== 'user' && (
                                        <td className="px-4 py-2 whitespace-nowrap border text-center">
                                            <button
                                                onClick={() => openModal(accountOfficers.find(a => a.id === po.id))}
                                                className="text-indigo-600 hover:text-indigo-900 text-xs font-semibold"
                                            >
                                                Edit
                                            </button>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <AgentFormModal isOpen={isModalOpen} onClose={closeModal} agent={editingAgent} />
        </AuthenticatedLayout>
    );
}
