import React, { useState, useEffect } from "react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Head, useForm, usePage, router } from "@inertiajs/react";
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import InputError from "@/Components/InputError";
import ListPoPreviewTable from '@/Components/Sos/ListPoPreviewTable';
import UnmappedPoList from '@/Components/Sos/UnmappedPoList';
import axios from "axios";
import toast from "react-hot-toast";

// Komponen Progress Bar Sederhana
const ProgressBar = ({ progress, text }) => (
    <div className="mt-4">
        <p className="text-sm font-semibold text-gray-700 mb-1">
            {text} {Math.round(progress)}%
        </p>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
            ></div>
        </div>
    </div>
);

export default function MasterDataPO({ auth, listPoData, unmappedPoData, poListOptions, flash }) {
    const { props } = usePage();
    const [isPoFormVisible, setIsPoFormVisible] = useState(false);
    const [poProgress, setPoProgress] = useState(null);

    return (
        <AuthenticatedLayout auth={auth} header="Master Data PO Management">
            <Head title="Master Data PO" />

            <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8 space-y-6">

                    {/* CARD 1: UPLOAD & VIEW MASTER DATA */}
                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <h3 className="font-semibold text-lg text-gray-800">Master Data PO (List PO)</h3>

                        {isPoFormVisible && (
                            <div className="mt-4 p-4 bg-gray-50 rounded-lg border animate-fade-in-down mb-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {/* Kolom Kiri: Upload Excel */}
                                    <div>
                                        <h4 className="font-semibold text-md text-gray-800 mb-2">Opsi 1: Unggah File Excel</h4>
                                        <p className="text-gray-500 text-xs mb-4">Format: .xlsx, .csv. Kolom wajib: NIPNAS, PO.</p>
                                        <form onSubmit={handlePoUploadSubmit} className="space-y-3">
                                            <input
                                                type="file"
                                                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                                                onChange={(e) => setPoUploadData("po_document", e.target.files[0])}
                                                disabled={processingPo || poProgress !== null}
                                            />
                                            <InputError message={errorsPo.po_document} />

                                            {poProgress !== null && (
                                                <ProgressBar progress={poProgress} text="Memperbarui Daftar PO..." />
                                            )}

                                            <button
                                                type="submit"
                                                disabled={processingPo || poProgress !== null}
                                                className="px-4 py-2 bg-green-600 text-white font-semibold rounded-md hover:bg-green-700 disabled:bg-green-400 text-sm"
                                            >
                                                {poProgress !== null ? 'Memproses...' : (processingPo ? "Mengunggah..." : "Unggah File")}
                                            </button>
                                        </form>
                                    </div>

                                    {/* Kolom Kanan: Input Manual */}
                                    <div className="border-l pl-8">
                                        <h4 className="font-semibold text-md text-gray-800 mb-2">Opsi 2: Tambah Manual</h4>
                                        <form onSubmit={handleManualPoSubmit} className="space-y-3">
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <InputLabel value="NIPNAS" />
                                                    <TextInput
                                                        value={manualPoData.nipnas}
                                                        onChange={e => setManualPoData('nipnas', e.target.value)}
                                                        className="w-full text-sm" placeholder="Contoh: 12345"
                                                    />
                                                    <InputError message={errorsManualPo.nipnas} />
                                                </div>
                                                <div>
                                                    <InputLabel value="Nama PO" />
                                                    <TextInput
                                                        value={manualPoData.po}
                                                        onChange={e => setManualPoData('po', e.target.value)}
                                                        className="w-full text-sm" placeholder="Contoh: PO-ABC"
                                                    />
                                                    <InputError message={errorsManualPo.po} />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-3 gap-3">
                                                <div>
                                                    <InputLabel value="Segmen" />
                                                    <TextInput value={manualPoData.segment} onChange={e => setManualPoData('segment', e.target.value)} className="w-full text-sm" />
                                                </div>
                                                <div>
                                                    <InputLabel value="Kota" />
                                                    <TextInput value={manualPoData.bill_city} onChange={e => setManualPoData('bill_city', e.target.value)} className="w-full text-sm" />
                                                </div>
                                                <div>
                                                    <InputLabel value="Witel" />
                                                    <TextInput value={manualPoData.witel} onChange={e => setManualPoData('witel', e.target.value)} className="w-full text-sm" />
                                                </div>
                                            </div>
                                            <button type="submit" disabled={processingManualPo} className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 text-sm mt-2">
                                                Simpan Manual
                                            </button>
                                        </form>
                                    </div>
                                </div>
                            </div>
                        )}

                        <hr className="my-4" />
                        <ListPoPreviewTable dataPaginator={listPoData} />
                    </div>

                    {/* CARD 2: UNMAPPED PO LIST */}
                    <div className="bg-white p-6 rounded-lg shadow-md">
                         <h3 className="font-semibold text-lg text-gray-800 mb-2">
                            Daftar PO Belum di Mapping (Data Transaksi)
                        </h3>
                        <p className="text-sm text-gray-600 mb-4">
                            Berikut adalah daftar order dari SOS/Datin yang belum memiliki PO Name yang valid. Silakan mapping manual di sini.
                        </p>

                        {/* PENTING: Pastikan UnmappedPoList diadaptasi agar mengirim request update
                           ke route 'admin.masterDataPO.updateMapping' bukannya route lama.
                           Jika UnmappedPoList menggunakan useForm internal dengan route hardcoded,
                           Anda harus mengupdate komponen tersebut atau mengoper route via props.

                           Asumsi: UnmappedPoList menerima prop 'updateRoute' atau sejenisnya,
                           atau Anda perlu mengedit file `UnmappedPoList.jsx` agar dinamis.
                        */}
                        <UnmappedPoList
                            dataPaginator={unmappedPoData}
                            poOptions={poListOptions}
                            // Jika komponen UnmappedPoList support custom route:
                            customUpdateRoute={route('admin.masterDataPO.updateMapping')}
                        />
                    </div>

                </div>
            </div>
        </AuthenticatedLayout>
    );
}
