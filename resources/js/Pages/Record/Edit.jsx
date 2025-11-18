// resources/js/Pages/Record/Edit.jsx

import React, { useEffect } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, Link } from '@inertiajs/react';
import PrimaryButton from '@/Components/PrimaryButton';
import InputLabel from '@/Components/InputLabel';
import InputError from '@/Components/InputError';
import toast from 'react-hot-toast';

export default function Edit({ auth, record, columns, type, pageTitle, flash }) {

    const { data, setData, put, processing, errors } = useForm(record);

    useEffect(() => {
        if (flash?.success) {
            toast.success(flash.success);
        }
    }, [flash]);

    const renderInput = (col) => {
        const value = data[col] || '';
        const isReadOnly = auth.user.role !== 'admin';

        if (value.length > 100 || String(value).includes('\n')) {
            return (
                <textarea
                    id={col}
                    value={value}
                    onChange={(e) => setData(col, e.target.value)}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
                    rows={4}
                    readOnly={isReadOnly}
                />
            );
        }

        return (
            <input
                id={col}
                type="text"
                value={value}
                onChange={(e) => setData(col, e.target.value)}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
                readOnly={isReadOnly}
            />
        );
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (auth.user.role !== 'admin') {
            toast.error('Anda tidak punya izin untuk menyimpan.');
            return;
        }

        // [UPDATE] Logika dinamis untuk mengirim ID yang benar
        // JT pakai 'id', Datin/Digital Product pakai 'order_id'
        const routeId = (type === 'jt') ? record.id : record.order_id;

        // [UPDATE] Pastikan nama route konsisten ('admin.record.update')
        put(route('admin.record.update', { type: type, id: routeId }), {
            preserveScroll: true,
        });
    };

    return (
        <AuthenticatedLayout
            auth={auth}
            header={<h2 className="font-semibold text-xl text-gray-800 leading-tight">{pageTitle}</h2>}
        >
            <Head title={`Edit ${type}`} />

            <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg">
                        <form onSubmit={handleSubmit} className="p-6 space-y-6">

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {columns.map((col) => (
                                    <div key={col}>
                                        <InputLabel
                                            htmlFor={col}
                                            value={col.replace(/_/g, ' ').toUpperCase()}
                                        />
                                        {renderInput(col)}
                                        <InputError message={errors[col]} className="mt-2" />
                                    </div>
                                ))}
                            </div>

                            <div className="flex items-center gap-4 mt-6">
                                {auth.user.role === 'admin' && (
                                    <PrimaryButton disabled={processing}>
                                        {processing ? 'Menyimpan...' : 'Simpan Perubahan'}
                                    </PrimaryButton>
                                )}
                                <Link
                                    href="#"
                                    onClick={() => window.history.back()} // Cara kembali yang lebih aman
                                    className="inline-flex items-center px-4 py-2 bg-gray-200 border border-transparent rounded-md font-semibold text-xs text-gray-700 uppercase tracking-widest hover:bg-gray-300"
                                >
                                    Kembali
                                </Link>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
