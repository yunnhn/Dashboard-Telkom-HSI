// File: resources/js/Pages/Admin/EmbedInfo.jsx

import React from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm } from '@inertiajs/react';
import { Transition } from '@headlessui/react';

const SuperAdminEmbedPanel = ({ embedSettings, auth }) => {

    // Hanya tampilkan panel ini untuk superadmin
    if (auth.user.role !== 'superadmin') {
        return null;
    }

    // Inisialisasi useForm dengan data dari controller
    const { data, setData, post, processing, errors, recentlySuccessful } = useForm(embedSettings);

    const handleSubmit = (e) => {
        e.preventDefault();
        post(route('admin.embed.save')); // Route 'post' tetap sama
    };

    // [BARU] Helper untuk me-render form per dashboard
    const configMap = [
        { key: 'jt', name: 'Dashboard Analysis JT (Jaringan Tambahan)' },
        { key: 'datin', name: 'Dashboard Datin (SOS)' },
        { key: 'digitalProduct', name: 'Dashboard Digital Product' },
    ];

    return (
        <div className="mb-8 p-6 bg-yellow-50 border border-yellow-300 rounded-lg">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Panel Super Admin: Dashboard Eksternal</h3>
            <p className="text-sm text-gray-700 mb-6">
                Ganti dashboard bawaan dengan URL eksternal (misal: Power BI) secara individual.
            </p>

            <form onSubmit={handleSubmit} className="space-y-8">
                {/* Loop melalui setiap dashboard yang bisa dikonfigurasi */}
                {configMap.map((dashboard) => (
                    <div key={dashboard.key} className="p-4 border border-gray-200 rounded-md">
                        <h4 className="text-lg font-semibold text-gray-800 mb-3">{dashboard.name}</h4>

                        <fieldset className="space-y-3">
                            {/* Opsi 1: Bawaan */}
                            <div className="flex items-center">
                                <input
                                    id={`${dashboard.key}-disabled`}
                                    name={`${dashboard.key}-choice`}
                                    type="radio"
                                    className="h-4 w-4 text-blue-600 border-gray-300"
                                    checked={!data[dashboard.key].enabled}
                                    onChange={() => setData(dashboard.key, { ...data[dashboard.key], enabled: false })}
                                />
                                <label htmlFor={`${dashboard.key}-disabled`} className="ml-3 block text-sm font-medium text-gray-700">
                                    Gunakan Dashboard Bawaan (Internal)
                                </label>
                            </div>

                            {/* Opsi 2: Eksternal */}
                            <div className="flex items-center">
                                <input
                                    id={`${dashboard.key}-enabled`}
                                    name={`${dashboard.key}-choice`}
                                    type="radio"
                                    className="h-4 w-4 text-blue-600 border-gray-300"
                                    checked={data[dashboard.key].enabled}
                                    onChange={() => setData(dashboard.key, { ...data[dashboard.key], enabled: true })}
                                />
                                <label htmlFor={`${dashboard.key}-enabled`} className="ml-3 block text-sm font-medium text-gray-700">
                                    Gunakan Dashboard Eksternal (Embed)
                                </label>
                            </div>
                        </fieldset>

                        {/* Input URL */}
                        <Transition
                            show={data[dashboard.key].enabled}
                            enter="transition-all duration-150"
                            enterFrom="opacity-0 max-h-0"
                            enterTo="opacity-100 max-h-40"
                            leave="transition-all duration-150"
                            leaveFrom="opacity-100 max-h-40"
                            leaveTo="opacity-0 max-h-0"
                        >
                            <div className="mt-4 pl-7">
                                <label htmlFor={`${dashboard.key}-url`} className="block text-xs font-medium text-gray-600">
                                    URL Embed Eksternal
                                </label>
                                <input
                                    type="url"
                                    id={`${dashboard.key}-url`}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm"
                                    value={data[dashboard.key].url || ''}
                                    onChange={(e) => setData(dashboard.key, { ...data[dashboard.key], url: e.target.value })}
                                    placeholder="https://... (URL lengkap dari iframe src)"
                                    disabled={!data[dashboard.key].enabled}
                                />
                                {/* Tampilkan error spesifik per field */}
                                {errors[`${dashboard.key}.url`] && <p className="mt-2 text-sm text-red-600">{errors[`${dashboard.key}.url`]}</p>}
                            </div>
                        </Transition>
                    </div>
                ))}

                {/* Tombol Simpan */}
                <div className="flex items-center gap-4 pt-4 border-t border-gray-200">
                    <button
                        type="submit"
                        className="inline-flex items-center px-4 py-2 bg-blue-600 border border-transparent rounded-md font-semibold text-xs text-white uppercase tracking-widest hover:bg-blue-700"
                        disabled={processing}
                    >
                        {processing ? 'Menyimpan...' : 'Simpan Semua Pengaturan'}
                    </button>
                    <Transition show={recentlySuccessful} enter="transition-opacity" leave="transition-opacity" leaveTo="opacity-0">
                        <p className="text-sm font-medium text-green-600">Tersimpan.</p>
                    </Transition>
                </div>
            </form>
        </div>
    );
};

// Komponen helper untuk kotak kode
const CodeBlock = ({ title, embedUrl }) => {
    // Pastikan route() ada
    if (typeof route === 'undefined') {
        console.error('Fungsi route() Ziggy tidak ditemukan.');
        return null;
    }

    const embedCode = `<iframe
    src="${embedUrl}"
    style="border:0; width:100%; height:100vh;"
    allowfullscreen
    scrolling="yes">
</iframe>`;

    return (
        <div className="mb-8">
            <h3 className="text-xl font-semibold text-gray-800 mb-3">{title}</h3>
            <p className="text-sm text-gray-600 mb-3">
                Salin dan tempel kode ini ke dalam HTML website Anda. Anda bisa menyesuaikan `height` sesuai kebutuhan.
            </p>
            <textarea
                readOnly
                className="w-full h-40 p-3 border rounded-md font-mono text-sm bg-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={embedCode}
                onClick={(e) => e.target.select()}
            />
            <div className="mt-2 text-xs text-gray-500">
                Tips: Klik di dalam kotak untuk memilih semua teks, lalu salin (Ctrl+C).
            </div>
        </div>
    );
};

export default function EmbedInfo({ auth, embedSettings }) {
    return (
        <AuthenticatedLayout
            auth={auth}
            header={<h2 className="font-semibold text-xl text-gray-800 leading-tight">Embed Dashboard</h2>}
        >
            <Head title="Cara Embed Dashboard" />

            <div className="py-8">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg">
                        <div className="p-6 text-gray-900">

                            {/* Panel Super Admin akan tampil di sini JIKA user adalah superadmin */}
                            <SuperAdminEmbedPanel auth={auth} embedSettings={embedSettings} />

                            <hr className="my-8 border-gray-300" />

                            <h2 className="text-2xl font-bold mb-4">Cara Membagikan Dashboard (Embed Bawaan)</h2>
                            <p className="mb-6 text-gray-700">
                                Gunakan kode `iframe` di bawah ini untuk menyematkan dashboard bawaan aplikasi ini ke halaman web lain.
                            </p>

                            <CodeBlock
                                title="Dashboard Analysis JT (Jaringan Tambahan)"
                                embedUrl={route('dashboard.jt.embed')}
                            />
                            <CodeBlock
                                title="Dashboard Digital Product"
                                embedUrl={route('dashboardDigitalProduct.embed')}
                            />
                            <CodeBlock
                                title="Dashboard Datin (SOS)"
                                embedUrl={route('dashboard.sos.embed')}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
