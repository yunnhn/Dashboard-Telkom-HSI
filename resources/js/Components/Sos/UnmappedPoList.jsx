import React, { useState } from 'react';
import { useForm, Link } from '@inertiajs/react';
import Modal from '@/Components/Modal';
import TextInput from '@/Components/TextInput';
import InputLabel from '@/Components/InputLabel';
import InputError from '@/Components/InputError';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import { PencilIcon } from '@heroicons/react/24/solid';

// Komponen Pagination
const Pagination = ({ links = [] }) => {
    if (links.length <= 3) return null;
    return (
        <div className="flex flex-wrap justify-center items-center mt-4 space-x-1">
            {links.map((link, index) => (
                <Link
                    key={index}
                    href={link.url ?? "#"}
                    className={`px-3 py-2 text-sm border rounded hover:bg-blue-600 hover:text-white transition-colors ${link.active ? "bg-blue-600 text-white" : "bg-white text-gray-700"} ${!link.url ? "text-gray-400 cursor-not-allowed" : ""}`}
                    dangerouslySetInnerHTML={{ __html: link.label }}
                    preserveScroll
                    preserveState
                />
            ))}
        </div>
    );
};

export default function UnmappedPoList({ dataPaginator, poOptions = [] }) {
    const { data: unmappedData, links } = dataPaginator;
    const [modalData, setModalData] = useState(null);

    const { data, setData, post, processing, errors, reset } = useForm({
        order_id: '',
        po_name: '',
        nipnas: '',
        segmen: '', // State untuk Segmen
        bill_city: '',
        witel_baru: '',
    });

    const openModal = (item) => {
        setModalData(item);
        setData({
            order_id: item.order_id,
            po_name: item.po_name === 'PO_TIDAK_TERDEFINISI' ? '' : item.po_name,
            nipnas: item.nipnas,
            segmen: item.segmen || '', // Load segmen yang ada
            bill_city: item.bill_city || '',
            witel_baru: item.witel_baru || '',
        });
    };

    const closeModal = () => {
        setModalData(null);
        reset();
    };

    const submit = (e) => {
        e.preventDefault();
        post(route('admin.analysisSOS.updatePoName'), {
            preserveScroll: true,
            onSuccess: () => closeModal(),
        });
    };

    return (
        <>
            <div className="overflow-x-auto">
                <table className="min-w-full bg-white border border-gray-200 text-sm">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="py-2 px-4 border text-left">Order ID</th>
                            <th className="py-2 px-4 border text-left">NIPNAS</th>
                            <th className="py-2 px-4 border text-left">Nama Pelanggan</th>
                            <th className="py-2 px-4 border text-left">Cust City</th>
                            <th className="py-2 px-4 border text-left">Serv City</th>
                            <th className="py-2 px-4 border text-left">Bill Witel</th>
                            <th className="py-2 px-4 border text-left">Bill City</th>
                            <th className="py-2 px-4 border text-center">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="text-gray-700">
                        {unmappedData.length > 0 ? (
                            unmappedData.map((item) => (
                                <tr key={item.id} className="border-b hover:bg-gray-50">
                                    <td className="py-2 px-4 border">{item.order_id}</td>
                                    <td className="py-2 px-4 border">{item.nipnas}</td>
                                    <td className="py-2 px-4 border">{item.standard_name}</td>
                                    <td className="py-2 px-4 border">{item.cust_city}</td>
                                    <td className="py-2 px-4 border">{item.serv_city}</td>
                                    <td className="py-2 px-4 border">{item.bill_witel}</td>
                                    <td className="py-2 px-4 border">{item.bill_city}</td>
                                    <td className="py-2 px-4 border text-center">
                                        <button
                                            onClick={() => openModal(item)}
                                            className="p-1 bg-yellow-500 text-white rounded hover:bg-yellow-600"
                                            title="Edit PO Name"
                                        >
                                            <PencilIcon className="h-4 w-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="8" className="py-4 px-4 border text-center text-gray-500">
                                    Tidak ada data PO yang belum ter-mapping.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <Pagination links={links} />

            {/* Modal untuk Edit PO Name */}
            <Modal show={modalData !== null} onClose={closeModal}>
                <form onSubmit={submit} className="p-6">
                    <h2 className="text-lg font-medium text-gray-900">
                        Update Mapping PO
                    </h2>
                    <p className="mt-1 text-sm text-gray-600 mb-4">
                        Perbarui PO Name untuk NIPNAS: <span className="font-bold">{modalData?.nipnas}</span> ({modalData?.standard_name})
                    </p>

                    {/* Input PO Name (Dropdown) */}
                    <div className="mt-4">
                        <InputLabel htmlFor="po_name" value="Pilih PO Name (AM)" />
                        <select
                            id="po_name"
                            value={data.po_name}
                            onChange={(e) => setData('po_name', e.target.value)}
                            className="mt-1 block w-full border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 rounded-md shadow-sm"
                            required
                        >
                            <option value="">-- Pilih Account Manager --</option>
                            {poOptions.map((po, index) => (
                                <option key={index} value={po}>
                                    {po}
                                </option>
                            ))}
                        </select>
                        <InputError message={errors.po_name} className="mt-2" />
                    </div>

                    {/* Input Bill City */}
                    <div className="mt-4">
                        <InputLabel htmlFor="bill_city" value="Bill City (Kota Tagihan)" />
                        <TextInput
                            id="bill_city"
                            value={data.bill_city}
                            onChange={(e) => setData('bill_city', e.target.value)}
                            className="mt-1 block w-full bg-gray-50"
                            placeholder="Contoh: SURABAYA"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            *Ubah kota jika mapping Witel gagal.
                        </p>
                    </div>

                    {/* Input Bill Witel */}
                    <div className="mt-4">
                        <InputLabel htmlFor="witel_baru" value="Bill Witel (Witel Tagihan)" />
                        <TextInput
                            id="witel_baru"
                            value={data.witel_baru}
                            onChange={(e) => setData('witel_baru', e.target.value)}
                            className="mt-1 block w-full bg-gray-50"
                            placeholder="Contoh: SURAMADU"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            *Isi manual 5 Witel Utama (BALI, SURAMADU, dll) jika mapping otomatis gagal.
                        </p>
                    </div>

                    {/* [BARU] Input Segmen */}
                    <div className="mt-4">
                        <InputLabel htmlFor="segmen" value="Segmen" />
                        <TextInput
                            id="segmen"
                            value={data.segmen}
                            onChange={(e) => setData('segmen', e.target.value)}
                            className="mt-1 block w-full bg-gray-50"
                            placeholder="Contoh: 1. SME"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            *Segmen dari order ini (isi manual jika data kosong).
                        </p>
                    </div>

                    <div className="mt-6 flex justify-end">
                        <SecondaryButton onClick={closeModal}>Batal</SecondaryButton>
                        <PrimaryButton className="ms-3" disabled={processing}>
                            {processing ? 'Menyimpan...' : 'Simpan & Sinkronisasi'}
                        </PrimaryButton>
                    </div>
                </form>
            </Modal>
        </>
    );
}
