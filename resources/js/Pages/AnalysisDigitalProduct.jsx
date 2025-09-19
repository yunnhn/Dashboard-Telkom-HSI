import React, { useEffect, useMemo, useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, usePage, router } from '@inertiajs/react';
import InputLabel from '@/Components/InputLabel';
import InputError from '@/Components/InputError';
import PrimaryButton from '@/Components/PrimaryButton';

// ===================================================================
// KOMPONEN-KOMPONEN KECIL (HELPERS)
// ===================================================================

const DetailsCard = ({ totals, segment, period }) => (
    <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="font-semibold text-lg text-gray-800 mb-4">Details</h3>
        <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span>Total</span><span>{totals.total}</span></div>
            <div className="flex justify-between"><span>OGP</span><span>{totals.ogp}</span></div>
            <div className="flex justify-between"><span>Closed</span><span>{totals.closed}</span></div>
            <div className="flex justify-between"><span>Segment</span><span className="font-bold">{segment}</span></div>
            <div className="flex justify-between"><span>Period</span><span className="font-bold">{period}</span></div>
        </div>
    </div>
);

const EditReportForm = ({ currentSegment, reportData, period }) => {
    // Mengambil daftar unik witel dari data laporan
    const witelList = useMemo(() => {
        if (!Array.isArray(reportData)) return [];
        return Array.from(new Set(reportData.map(item => item.nama_witel)));
    }, [reportData]);


    const { data, setData, post, processing, errors } = useForm({
        // State form diinisialisasi di sini
        targets: {},
        segment: currentSegment,
        period: period + '-01',
        document: null,
    });

    // useEffect ini akan berjalan setiap kali data laporan utama berubah
    // Fungsinya untuk mengisi form dengan data target terbaru dari server
    useEffect(() => {
        const initialTargets = {};
        reportData.forEach(item => {
            initialTargets[item.nama_witel] = {
                prov_comp: {
                    n: item.prov_comp_n_target || 0,
                    o: item.prov_comp_o_target || 0,
                    ae: item.prov_comp_ae_target || 0,
                    ps: item.prov_comp_ps_target || 0,
                },
                revenue: {
                    n: item.revenue_n_target || 0,
                    o: item.revenue_o_target || 0,
                    ae: item.revenue_ae_target || 0,
                    ps: item.revenue_ps_target || 0,
                }
            };
        });
        // setData dipanggil sekali saja untuk efisiensi
        setData(currentData => ({
            ...currentData,
            targets: initialTargets
        }));
    }, [reportData]);

    // useEffect ini akan menyinkronkan state form jika props dari parent berubah
    // Contoh: User mengubah dropdown segmen atau periode di atas
    useEffect(() => {
        setData(currentData => ({
            ...currentData,
            segment: currentSegment,
            period: period + '-01',
        }));
    }, [currentSegment, period]);


    // Fungsi untuk mengirim data form ke server
    function submit(e) {
        e.preventDefault();
        post(route('analysisDigitalProduct.targets'), {
            preserveScroll: true,
            onSuccess: () => router.reload(), // Memuat ulang data halaman setelah sukses
        });
    }

    // Fungsi untuk menangani input user di form
    const handleInputChange = (witel, metric, product, value) => {
        setData('targets', {
            ...data.targets,
            [witel]: {
                ...data.targets[witel],
                [metric]: {
                    ...data.targets[witel]?.[metric],
                    [product]: value,
                }
            }
        });
    };

    return (
        <form onSubmit={submit} className="bg-white p-6 rounded-lg shadow-md text-sm">
            <h3 className="font-semibold text-lg text-gray-800 mb-4 text-center">Edit Target</h3>

            {/* Form untuk Prov Comp Targets (hanya tampil jika segmen SME) */}
            {currentSegment === 'SME' && (
                <fieldset className="mb-4 border rounded-md p-3">
                    <legend className="text-base font-semibold px-2">Prov Comp Targets</legend>
                    {witelList.map(witel => (
                        <div key={`${witel}-prov`} className="mb-3">
                            <h4 className="font-bold text-gray-600">{witel}</h4>
                            <div className="grid grid-cols-4 gap-2 mt-1">
                                {['n', 'o', 'ae', 'ps'].map(p => (
                                    <input
                                        key={p}
                                        type="number"
                                        value={data.targets[witel]?.prov_comp?.[p] ?? ''}
                                        onChange={e => handleInputChange(witel, 'prov_comp', p, e.target.value)}
                                        placeholder={p.toUpperCase()}
                                        className="p-1 border rounded w-full"
                                    />
                                ))}
                            </div>
                        </div>
                    ))}
                </fieldset>
            )}

            {/* Form untuk Revenue Targets */}
            <fieldset className="border rounded-md p-3">
                <legend className="text-base font-semibold px-2">Revenue Targets (Rp Juta)</legend>
                {witelList.map(witel => (
                    <div key={`${witel}-rev`} className="mb-3">
                        <h4 className="font-bold text-gray-600">{witel}</h4>
                        <div className="grid grid-cols-4 gap-2 mt-1">
                            {['n', 'o', 'ae', 'ps'].map(p => (
                                <input
                                    key={p}
                                    type="number"
                                    step="0.01"
                                    value={data.targets[witel]?.revenue?.[p] ?? ''}
                                    onChange={e => handleInputChange(witel, 'revenue', p, e.target.value)}
                                    placeholder={p.toUpperCase()}
                                    className="p-1 border rounded w-full"
                                />
                            ))}
                        </div>
                    </div>
                ))}
            </fieldset>

            <button type="submit" disabled={processing} className="w-full mt-4 px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 disabled:bg-blue-400">
                {processing ? 'Menyimpan...' : 'Simpan Target'}
            </button>
        </form>
    );
};

const LegsReportTable = ({ data = [] }) => {
    // Kalkulasi untuk baris GRAND TOTAL
    const totals = data.reduce((acc, item) => {
        acc.in_progress_n += formatNumber(item.in_progress_n);
        acc.in_progress_o += formatNumber(item.in_progress_o);
        acc.in_progress_ae += formatNumber(item.in_progress_ae);
        acc.in_progress_ps += formatNumber(item.in_progress_ps);

        acc.prov_comp_n_realisasi += formatNumber(item.prov_comp_n_realisasi);
        acc.prov_comp_o_realisasi += formatNumber(item.prov_comp_o_realisasi);
        acc.prov_comp_ae_realisasi += formatNumber(item.prov_comp_ae_realisasi);
        acc.prov_comp_ps_realisasi += formatNumber(item.prov_comp_ps_realisasi);

        // Untuk LEGS, Prov Comp tidak memiliki target, jadi kita hitung realisasi saja.
        // Namun, Revenue memiliki target.
        acc.revenue_n_target += formatNumber(item.revenue_n_target);
        acc.revenue_n_ach += formatNumber(item.revenue_n_ach);
        acc.revenue_o_target += formatNumber(item.revenue_o_target);
        acc.revenue_o_ach += formatNumber(item.revenue_o_ach);
        acc.revenue_ae_target += formatNumber(item.revenue_ae_target);
        acc.revenue_ae_ach += formatNumber(item.revenue_ae_ach);
        acc.revenue_ps_target += formatNumber(item.revenue_ps_target);
        acc.revenue_ps_ach += formatNumber(item.revenue_ps_ach);

        return acc;
    }, {
        in_progress_n: 0, in_progress_o: 0, in_progress_ae: 0, in_progress_ps: 0,
        prov_comp_n_realisasi: 0, prov_comp_o_realisasi: 0, prov_comp_ae_realisasi: 0, prov_comp_ps_realisasi: 0,
        revenue_n_target: 0, revenue_n_ach: 0, revenue_o_target: 0, revenue_o_ach: 0,
        revenue_ae_target: 0, revenue_ae_ach: 0, revenue_ps_target: 0, revenue_ps_ach: 0,
    });

    const grandTotalRealisasi = totals.in_progress_n + totals.in_progress_o + totals.in_progress_ae + totals.in_progress_ps +
        totals.prov_comp_n_realisasi + totals.prov_comp_o_realisasi + totals.prov_comp_ae_realisasi + totals.prov_comp_ps_realisasi;

    return (
        <div className="overflow-x-auto text-xs">
            <table className="w-full border-collapse text-center">
                <thead className="bg-gray-800 text-white">
                    <tr>
                        <th className="border p-2 align-middle" rowSpan="2">WILAYAH TELKOM</th>
                        <th className="border p-2 bg-blue-600" colSpan="4">In Progress</th>
                        <th className="border p-2 bg-orange-600" colSpan="4">Proving Complete</th>
                        <th className="border p-2 bg-green-700" colSpan="8">REVENUE (Rp Juta)</th>
                        <th className="border p-2 bg-gray-600" rowSpan="2">Grand Total</th>
                    </tr>
                    <tr className="font-semibold">
                        {['N', 'O', 'AE', 'PS'].map(cat => <th key={`ip-${cat}`} className="border p-2 bg-blue-500">{cat}</th>)}
                        {['N', 'O', 'AE', 'PS'].map(cat => <th key={`pc-${cat}`} className="border p-2 bg-orange-500">{cat}</th>)}
                        {['N', 'O', 'AE', 'PS'].map(cat => <React.Fragment key={`rev-${cat}`}><th className="border p-1 bg-green-600">T</th><th className="border p-1 bg-green-600">ACH</th></React.Fragment>)}
                    </tr>
                </thead>
                <tbody>
                    {data.length > 0 ? data.map(item => {
                        const rowTotal = formatNumber(item.in_progress_n) + formatNumber(item.in_progress_o) +
                            formatNumber(item.in_progress_ae) + formatNumber(item.in_progress_ps) +
                            formatNumber(item.prov_comp_n_realisasi) + formatNumber(item.prov_comp_o_realisasi) +
                            formatNumber(item.prov_comp_ae_realisasi) + formatNumber(item.prov_comp_ps_realisasi);

                        return (
                            <tr key={item.nama_witel} className="bg-white hover:bg-gray-50">
                                <td className="border p-2 font-semibold text-left text-gray-800">{item.nama_witel}</td>

                                {/* In Progress */}
                                <td className="border p-2">{formatNumber(item.in_progress_n)}</td>
                                <td className="border p-2">{formatNumber(item.in_progress_o)}</td>
                                <td className="border p-2">{formatNumber(item.in_progress_ae)}</td>
                                <td className="border p-2">{formatNumber(item.in_progress_ps)}</td>

                                {/* Proving Complete (hanya realisasi untuk LEGS) */}
                                <td className="border p-2">{formatNumber(item.prov_comp_n_realisasi)}</td>
                                <td className="border p-2">{formatNumber(item.prov_comp_o_realisasi)}</td>
                                <td className="border p-2">{formatNumber(item.prov_comp_ae_realisasi)}</td>
                                <td className="border p-2">{formatNumber(item.prov_comp_ps_realisasi)}</td>

                                {/* Revenue (Target & Achievement) */}
                                <td className="border p-2">{formatRupiah(item.revenue_n_target)}</td>
                                <td className="border p-2 font-bold text-green-700 bg-green-50">{formatRupiah(item.revenue_n_ach)}</td>
                                <td className="border p-2">{formatRupiah(item.revenue_o_target)}</td>
                                <td className="border p-2 font-bold text-green-700 bg-green-50">{formatRupiah(item.revenue_o_ach)}</td>
                                <td className="border p-2">{formatRupiah(item.revenue_ae_target)}</td>
                                <td className="border p-2 font-bold text-green-700 bg-green-50">{formatRupiah(item.revenue_ae_ach)}</td>
                                <td className="border p-2">{formatRupiah(item.revenue_ps_target)}</td>
                                <td className="border p-2 font-bold text-green-700 bg-green-50">{formatRupiah(item.revenue_ps_ach)}</td>

                                <td className="border p-2 font-bold bg-gray-100">{rowTotal}</td>
                            </tr>
                        );
                    }) : (
                        <tr><td colSpan="21" className="text-center p-4 border text-gray-500">Tidak ada data untuk ditampilkan.</td></tr>
                    )}

                    {/* Baris Grand Total */}
                    <tr className="font-bold text-white">
                        <td className="border p-2 text-left bg-gray-800">GRAND TOTAL</td>
                        <td className="border p-2 bg-blue-600">{totals.in_progress_n}</td>
                        <td className="border p-2 bg-blue-600">{totals.in_progress_o}</td>
                        <td className="border p-2 bg-blue-600">{totals.in_progress_ae}</td>
                        <td className="border p-2 bg-blue-600">{totals.in_progress_ps}</td>

                        <td className="border p-2 bg-orange-600">{totals.prov_comp_n_realisasi}</td>
                        <td className="border p-2 bg-orange-600">{totals.prov_comp_o_realisasi}</td>
                        <td className="border p-2 bg-orange-600">{totals.prov_comp_ae_realisasi}</td>
                        <td className="border p-2 bg-orange-600">{totals.prov_comp_ps_realisasi}</td>

                        <td className="border p-2 bg-green-700">{formatRupiah(totals.revenue_n_target)}</td>
                        <td className="border p-2 bg-green-700">{formatRupiah(totals.revenue_n_ach)}</td>
                        <td className="border p-2 bg-green-700">{formatRupiah(totals.revenue_o_target)}</td>
                        <td className="border p-2 bg-green-700">{formatRupiah(totals.revenue_o_ach)}</td>
                        <td className="border p-2 bg-green-700">{formatRupiah(totals.revenue_ae_target)}</td>
                        <td className="border p-2 bg-green-700">{formatRupiah(totals.revenue_ae_ach)}</td>
                        <td className="border p-2 bg-green-700">{formatRupiah(totals.revenue_ps_target)}</td>
                        <td className="border p-2 bg-green-700">{formatRupiah(totals.revenue_ps_ach)}</td>

                        <td className="border p-2 bg-gray-600">{grandTotalRealisasi}</td>
                    </tr>
                </tbody>
            </table>
        </div>
    );
};

const formatPercent = (value) => {
    let num = Number(value);
    if (!isFinite(num)) {
        num = 0; // Pastikan num adalah angka
    }

    // TAMBAHKAN LOGIKA INI: Jika angka lebih dari 100, anggap saja 100.
    if (num > 100) {
        num = 100;
    }

    return `${num.toFixed(1)}%`;
};
const formatRupiah = (value) => (Number(value) || 0).toFixed(5);
const formatNumber = (value) => Number(value) || 0;

const SmeReportTable = ({ data = [] }) => {
    // --- LANGKAH 1: TAMBAHKAN KALKULASI TOTALS DI SINI ---
    const totals = data.reduce((acc, item) => {
        acc.in_progress_n += formatNumber(item.in_progress_n);
        acc.in_progress_o += formatNumber(item.in_progress_o);
        acc.in_progress_ae += formatNumber(item.in_progress_ae);
        acc.in_progress_ps += formatNumber(item.in_progress_ps);

        acc.prov_comp_n_target += formatNumber(item.prov_comp_n_target);
        acc.prov_comp_n_realisasi += formatNumber(item.prov_comp_n_realisasi);
        acc.prov_comp_o_target += formatNumber(item.prov_comp_o_target);
        acc.prov_comp_o_realisasi += formatNumber(item.prov_comp_o_realisasi);
        acc.prov_comp_ae_target += formatNumber(item.prov_comp_ae_target);
        acc.prov_comp_ae_realisasi += formatNumber(item.prov_comp_ae_realisasi);
        acc.prov_comp_ps_target += formatNumber(item.prov_comp_ps_target);
        acc.prov_comp_ps_realisasi += formatNumber(item.prov_comp_ps_realisasi);

        acc.revenue_n_target += formatNumber(item.revenue_n_target);
        acc.revenue_n_ach += formatNumber(item.revenue_n_ach);
        acc.revenue_o_target += formatNumber(item.revenue_o_target);
        acc.revenue_o_ach += formatNumber(item.revenue_o_ach);
        acc.revenue_ae_target += formatNumber(item.revenue_ae_target);
        acc.revenue_ae_ach += formatNumber(item.revenue_ae_ach);
        acc.revenue_ps_target += formatNumber(item.revenue_ps_target);
        acc.revenue_ps_ach += formatNumber(item.revenue_ps_ach);

        return acc;
    }, {
        in_progress_n: 0, in_progress_o: 0, in_progress_ae: 0, in_progress_ps: 0,
        prov_comp_n_target: 0, prov_comp_n_realisasi: 0,
        prov_comp_o_target: 0, prov_comp_o_realisasi: 0,
        prov_comp_ae_target: 0, prov_comp_ae_realisasi: 0,
        prov_comp_ps_target: 0, prov_comp_ps_realisasi: 0,
        revenue_n_target: 0, revenue_n_ach: 0,
        revenue_o_target: 0, revenue_o_ach: 0,
        revenue_ae_target: 0, revenue_ae_ach: 0,
        revenue_ps_target: 0, revenue_ps_ach: 0,
    });

    return (
        <div className="overflow-x-auto text-xs">
            <table className="w-full border-collapse text-center">
                <thead className="bg-gray-800 text-white">
                    {/* --- PERBAIKAN KECIL PADA STRUKTUR THEAD --- */}
                    <tr>
                        <th className="border p-2 align-middle" rowSpan="3">WILAYAH TELKOM</th>
                        <th className="border p-2 bg-blue-600" colSpan="4">In Progress</th>
                        <th className="border p-2 bg-orange-600" colSpan="12">Prov Comp</th>
                        <th className="border p-2 bg-green-700" colSpan="8">REVENUE (Rp Juta)</th>
                        <th className="border p-2 bg-gray-600" rowSpan="3">Grand Total</th>
                    </tr>
                    <tr className="font-semibold">
                        <th className="border p-2 bg-blue-500" colSpan="1" rowSpan="2">N</th>
                        <th className="border p-2 bg-blue-500" colSpan="1" rowSpan="2">O</th>
                        <th className="border p-2 bg-blue-500" colSpan="1" rowSpan="2">AE</th>
                        <th className="border p-2 bg-blue-500" colSpan="1" rowSpan="2">PS</th>
                        {['N', 'O', 'AE', 'PS'].map(cat => <th key={`prov-${cat}`} className="border p-2 bg-orange-500" colSpan="3">{cat}</th>)}
                        {['N', 'O', 'AE', 'PS'].map(cat => <th key={`rev-${cat}`} className="border p-2 bg-green-600" colSpan="2">{cat}</th>)}
                    </tr>
                    <tr className="font-medium">
                        {[...Array(4)].map((_, i) => <React.Fragment key={`prov-sub-${i}`}><th className="border p-1 bg-orange-400">T</th><th className="border p-1 bg-orange-400">R</th><th className="border p-1 bg-orange-400">P</th></React.Fragment>)}
                        {[...Array(4)].map((_, i) => <React.Fragment key={`rev-sub-${i}`}><th className="border p-1 bg-green-500">T</th><th className="border p-1 bg-green-500">ACH</th></React.Fragment>)}
                    </tr>
                </thead>
                <tbody>
                    {data.length > 0 ? data.map(item => {
                        const grandTotal = formatNumber(item.prov_comp_n_realisasi) + formatNumber(item.prov_comp_o_realisasi) + formatNumber(item.prov_comp_ae_realisasi) + formatNumber(item.prov_comp_ps_realisasi);
                        return (
                            <tr key={item.nama_witel} className="bg-white hover:bg-gray-50">
                                <td className="border p-2 font-semibold text-left text-gray-800">{item.nama_witel}</td>
                                <td className="border p-2">{formatNumber(item.in_progress_n)}</td>
                                <td className="border p-2">{formatNumber(item.in_progress_o)}</td>
                                <td className="border p-2">{formatNumber(item.in_progress_ae)}</td>
                                <td className="border p-2">{formatNumber(item.in_progress_ps)}</td>

                                <td className="border p-2">{formatNumber(item.prov_comp_n_target)}</td>
                                <td className="border p-2">{formatNumber(item.prov_comp_n_realisasi)}</td>
                                <td className="border p-2 bg-orange-50">{formatPercent((item.prov_comp_n_realisasi / item.prov_comp_n_target) * 100)}</td>

                                <td className="border p-2">{formatNumber(item.prov_comp_o_target)}</td>
                                <td className="border p-2">{formatNumber(item.prov_comp_o_realisasi)}</td>
                                <td className="border p-2 bg-orange-50">{formatPercent((item.prov_comp_o_realisasi / item.prov_comp_o_target) * 100)}</td>

                                <td className="border p-2">{formatNumber(item.prov_comp_ae_target)}</td>
                                <td className="border p-2">{formatNumber(item.prov_comp_ae_realisasi)}</td>
                                <td className="border p-2 bg-orange-50">{formatPercent((item.prov_comp_ae_realisasi / item.prov_comp_ae_target) * 100)}</td>

                                <td className="border p-2">{formatNumber(item.prov_comp_ps_target)}</td>
                                <td className="border p-2">{formatNumber(item.prov_comp_ps_realisasi)}</td>
                                <td className="border p-2 bg-orange-50">{formatPercent((item.prov_comp_ps_realisasi / item.prov_comp_ps_target) * 100)}</td>

                                <td className="border p-2">{formatRupiah(item.revenue_n_target)}</td>
                                <td className="border p-2 font-bold text-green-700">{formatRupiah(item.revenue_n_ach)}</td>

                                <td className="border p-2">{formatRupiah(item.revenue_o_target)}</td>
                                <td className="border p-2 font-bold text-green-700">{formatRupiah(item.revenue_o_ach)}</td>

                                <td className="border p-2">{formatRupiah(item.revenue_ae_target)}</td>
                                <td className="border p-2 font-bold text-green-700">{formatRupiah(item.revenue_ae_ach)}</td>

                                <td className="border p-2">{formatRupiah(item.revenue_ps_target)}</td>
                                <td className="border p-2 font-bold text-green-700">{formatRupiah(item.revenue_ps_ach)}</td>

                                <td className="border p-2 font-bold bg-gray-100">{grandTotal}</td>
                            </tr>
                        )
                    }) : (
                        <tr><td colSpan="33" className="text-center p-4 border text-gray-500">Tidak ada data untuk ditampilkan.</td></tr>
                    )}

                    {/* LANGKAH 2: Baris Grand Total sekarang bisa menggunakan variabel 'totals' */}
                    <tr className="font-bold bg-gray-100 text-white">
                        <td className="border p-2 text-left bg-gray-800">GRAND TOTAL</td>
                        <td className="border p-2 bg-blue-600">{totals.in_progress_n}</td>
                        <td className="border p-2 bg-blue-600">{totals.in_progress_o}</td>
                        <td className="border p-2 bg-blue-600">{totals.in_progress_ae}</td>
                        <td className="border p-2 bg-blue-600">{totals.in_progress_ps}</td>

                        <td className="border p-2 bg-orange-600">{totals.prov_comp_n_target}</td>
                        <td className="border p-2 bg-orange-600">{totals.prov_comp_n_realisasi}</td>
                        <td className="border p-2 bg-orange-600">{formatPercent((totals.prov_comp_n_realisasi / totals.prov_comp_n_target) * 100)}</td>

                        <td className="border p-2 bg-orange-600">{totals.prov_comp_o_target}</td>
                        <td className="border p-2 bg-orange-600">{totals.prov_comp_o_realisasi}</td>
                        <td className="border p-2 bg-orange-600">{formatPercent((totals.prov_comp_o_realisasi / totals.prov_comp_o_target) * 100)}</td>

                        <td className="border p-2 bg-orange-600">{totals.prov_comp_ae_target}</td>
                        <td className="border p-2 bg-orange-600">{totals.prov_comp_ae_realisasi}</td>
                        <td className="border p-2 bg-orange-600">{formatPercent((totals.prov_comp_ae_realisasi / totals.prov_comp_ae_target) * 100)}</td>

                        <td className="border p-2 bg-orange-600">{totals.prov_comp_ps_target}</td>
                        <td className="border p-2 bg-orange-600">{totals.prov_comp_ps_realisasi}</td>
                        <td className="border p-2 bg-orange-600">{formatPercent((totals.prov_comp_ps_realisasi / totals.prov_comp_ps_target) * 100)}</td>

                        <td className="border p-2 bg-green-700">{formatRupiah(totals.revenue_n_target)}</td>
                        <td className="border p-2 bg-green-700">{formatRupiah(totals.revenue_n_ach)}</td>

                        <td className="border p-2 bg-green-700">{formatRupiah(totals.revenue_o_target)}</td>
                        <td className="border p-2 bg-green-700">{formatRupiah(totals.revenue_o_ach)}</td>

                        <td className="border p-2 bg-green-700">{formatRupiah(totals.revenue_ae_target)}</td>
                        <td className="border p-2 bg-green-700">{formatRupiah(totals.revenue_ae_ach)}</td>

                        <td className="border p-2 bg-green-700">{formatRupiah(totals.revenue_ps_target)}</td>
                        <td className="border p-2 bg-green-700">{formatRupiah(totals.revenue_ps_ach)}</td>

                        <td className="border p-2 bg-gray-600">
                            {totals.prov_comp_n_realisasi + totals.prov_comp_o_realisasi + totals.prov_comp_ae_realisasi + totals.prov_comp_ps_realisasi}
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    );
};

// ===================================================================
// KOMPONEN TABEL BARU: IN PROGRESS
// ===================================================================
const InProgressTable = ({ data = [] }) => {

    const handleCompleteClick = (orderId) => {
        if (confirm(`Anda yakin ingin mengubah status Order ID: ${orderId} menjadi "Complete"?`)) {
            router.put(route('manual.update.complete', { order_id: orderId }), {}, {
                preserveScroll: true,
            });
        }
    };

    const handleCancelClick = (orderId) => {
        if (confirm(`Anda yakin ingin membatalkan Order ID: ${orderId}? Statusnya akan diubah menjadi 'CANCEL'.`)) {
            router.put(route('manual.update.cancel', { order_id: orderId }), {}, {
                preserveScroll: true,
            });
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleString('id-ID', {
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit'
        });
    };

    return (
        <div className="overflow-x-auto text-sm">
            <table className="w-full">
                <thead className="bg-gray-50">
                    <tr className="text-left font-semibold text-gray-600">
                        {/* ... header tabel tidak berubah ... */}
                        <th className="p-3">No.</th>
                        <th className="p-3">Milestone</th>
                        <th className="p-3">Segment</th>
                        <th className="p-3">Status Order</th>
                        <th className="p-3">Product Name</th>
                        <th className="p-3">Order ID</th>
                        <th className="p-3">Witel</th>
                        <th className="p-3">Customer Name</th>
                        <th className="p-3">Order Created Date</th>
                        <th className="p-3 text-center">Action</th>
                    </tr>
                </thead>
                <tbody className="divide-y bg-white">
                    {data.length > 0 ? data.map((item, index) => (
                        <tr key={item.order_id} className="text-gray-700 hover:bg-gray-50">
                            <td className="p-3">{index + 1}</td>
                            <td className="p-3">{item.milestone}</td>
                            <td className="p-3">{item.segment}</td>
                            <td className="p-3 whitespace-nowrap">
                                <span className="px-2 py-1 font-semibold leading-tight text-blue-700 bg-blue-100 rounded-full">
                                    {item.order_status_n}
                                </span>
                            </td>
                            <td className="p-3">{item.product_name}</td>
                            <td className="p-3 font-mono">{item.order_id}</td>
                            <td className="p-3">{item.nama_witel}</td>
                            <td className="p-3">{item.customer_name}</td>
                            <td className="p-3">{formatDate(item.order_created_date)}</td>

                            <td className="p-3 text-center">
                                <div className="flex justify-center items-center gap-2">
                                    <button
                                        onClick={() => handleCompleteClick(item.order_id)}
                                        className="px-3 py-1 text-xs font-bold text-white bg-green-500 rounded-md hover:bg-green-600"
                                    >
                                        COMPLETE
                                    </button>
                                    <button
                                        onClick={() => handleCancelClick(item.order_id)}
                                        className="px-3 py-1 text-xs font-bold text-white bg-red-500 rounded-md hover:bg-red-600"
                                    >
                                        CANCEL
                                    </button>
                                </div>
                            </td>
                        </tr>
                    )) : (
                        <tr>
                            <td colSpan="10" className="p-4 text-center text-gray-500">
                                Tidak ada data yang sesuai dengan filter.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
};

// ===================================================================
// KOMPONEN TABEL BARU: HISTORY
// ===================================================================
const HistoryTable = ({ data = [] }) => {

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleString('id-ID', {
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', second: '2-digit'
        });
    };

    return (
        <div className="overflow-x-auto text-sm">
            <p className="text-gray-500 mb-2">Menampilkan 10 data terbaru yang diperbarui.</p>
            <table className="w-full whitespace-nowrap">
                <thead className="bg-gray-50">
                    <tr className="text-left font-semibold text-gray-600">
                        <th className="p-3">No.</th>
                        <th className="p-3">Milestone Baru</th>
                        <th className="p-3">Status Order</th>
                        <th className="p-3">Status Order Baru</th>
                        <th className="p-3">Product Name</th>
                        <th className="p-3">Order ID</th>
                        <th className="p-3">Witel</th>
                        <th className="p-3">Customer Name</th>
                        <th className="p-3">Order Created Date</th>
                        <th className="p-3">Update Time</th>
                    </tr>
                </thead>
                <tbody className="divide-y bg-white">
                    {data.length > 0 ? data.map((item, index) => (
                        <tr key={item.order_id} className="text-gray-700 hover:bg-gray-50">
                            <td className="p-3">{index + 1}</td>
                            <td className="p-3">{item.milestone}</td>
                            <td className="p-3">
                                <span className="px-2 py-1 font-semibold leading-tight text-blue-700 bg-blue-100 rounded-full">
                                    IN PROGRESS
                                </span>
                            </td>
                            <td className="p-3">
                                <span className={`px-2 py-1 font-semibold leading-tight rounded-full ${item.order_status_n.toUpperCase() === 'CANCEL'
                                    ? 'text-red-700 bg-red-100'
                                    : 'text-green-700 bg-green-100'
                                    }`}>
                                    {item.order_status_n.toUpperCase()}
                                </span>
                            </td>
                            <td className="p-3">{item.product_name}</td>
                            <td className="p-3 font-mono">{item.order_id}</td>
                            <td className="p-3">{item.nama_witel}</td>
                            <td className="p-3">{item.customer_name}</td>
                            <td className="p-3">{formatDate(item.order_created_date)}</td>
                            <td className="p-3 font-semibold">{formatDate(item.updated_at)}</td>
                        </tr>
                    )) : (
                        <tr>
                            <td colSpan="10" className="p-4 text-center text-gray-500">
                                Belum ada data yang diperbarui secara manual.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
};

const KpiTable = ({ data = [] }) => {
    return (
        <div className="overflow-x-auto text-sm">
            <table className="min-w-full divide-y divide-gray-200 border">
                <thead className="bg-gray-50">
                    <tr>
                        <th rowSpan="2" className="px-4 py-2 text-left text-xs font-medium text-white uppercase tracking-wider border bg-green-600">NAMA PO</th>
                        <th rowSpan="2" className="px-4 py-2 text-left text-xs font-medium text-white uppercase tracking-wider border bg-green-600">WITEL</th>
                        <th colSpan="2" className="px-4 py-2 text-center text-xs font-medium text-white uppercase tracking-wider border bg-orange-500">PRODIGI DONE</th>
                        <th colSpan="2" className="px-4 py-2 text-center text-xs font-medium text-white uppercase tracking-wider border bg-blue-500">PRODIGI OGP</th>
                        <th rowSpan="2" className="px-4 py-2 text-left text-xs font-medium text-white uppercase tracking-wider border bg-green-600">TOTAL</th>
                        <th colSpan="2" className="px-4 py-2 text-center text-xs font-medium text-white uppercase tracking-wider border bg-green-600">ACH</th>
                    </tr>
                    <tr>
                        <th className="px-4 py-2 text-center text-xs font-medium text-white uppercase tracking-wider border bg-orange-400">NCX</th>
                        <th className="px-4 py-2 text-center text-xs font-medium text-white uppercase tracking-wider border bg-orange-400">SCONE</th>
                        <th className="px-4 py-2 text-center text-xs font-medium text-white uppercase tracking-wider border bg-blue-400">NCX</th>
                        <th className="px-4 py-2 text-center text-xs font-medium text-white uppercase tracking-wider border bg-blue-400">SCONE</th>
                        <th className="px-4 py-2 text-center text-xs font-medium text-white uppercase tracking-wider border bg-green-400">YTD</th>
                        <th className="px-4 py-2 text-center text-xs font-medium text-white uppercase tracking-wider border bg-green-400">Q3</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {data.map((po) => (
                        <tr key={po.nama_po} className="hover:bg-gray-50">
                            <td className="px-4 py-2 whitespace-nowrap border font-medium">{po.nama_po}</td>
                            <td className="px-4 py-2 whitespace-nowrap border">{po.witel}</td>
                            <td className="px-4 py-2 whitespace-nowrap border text-center">{po.done_ncx}</td>
                            <td className="px-4 py-2 whitespace-nowrap border text-center">{po.done_scone}</td>
                            <td className="px-4 py-2 whitespace-nowrap border text-center">{po.ogp_ncx}</td>
                            <td className="px-4 py-2 whitespace-nowrap border text-center">{po.ogp_scone}</td>
                            <td className="px-4 py-2 whitespace-nowrap border text-center font-bold">{po.total}</td>
                            <td className="px-4 py-2 whitespace-nowrap border text-center font-bold bg-yellow-200">{po.ach_ytd}</td>
                            <td className="px-4 py-2 whitespace-nowrap border text-center font-bold bg-yellow-200">{po.ach_q3}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

function handleInProgressYearChange(e) {
    const newYear = e.target.value;
    router.get(route('analysisDigitalProduct'), {
        segment: currentSegment,
        period: period, // Pertahankan filter utama
        in_progress_year: newYear, // Terapkan filter tahun yang baru
    }, {
        preserveState: true,
        replace: true,
        preserveScroll: true,
    });
}

const generateYearOptions = () => {
    const options = [];
    const currentYear = new Date().getFullYear();
    for (let i = 0; i < 5; i++) {
        const year = currentYear - i;
        options.push(<option key={year} value={year}>{year}</option>);
    }
    return options;
};

// ===================================================================
// KOMPONEN UTAMA ANALYSISDigitalProduct
// ===================================================================
// Ganti seluruh fungsi AnalysisDigitalProduct di file AnalysisDigitalProduct.jsx dengan ini
export default function AnalysisDigitalProduct({ reportData = [], currentSegment = 'SME', period = '', inProgressData = [], newData = [], historyData = [], kpiData = [], currentInProgressYear, flash = {}, errors: pageErrors = {} }) {

    const [activeDetailView, setActiveDetailView] = useState('inprogress');
    const [witelFilter, setWitelFilter] = useState('ALL');

    // Hook untuk form unggah dokumen (tidak berubah)
    const { data: uploadData, setData: setUploadData, post: postUpload, processing, progress, errors } = useForm({
        document: null,
    });

    const {
        data: completeData,
        setData: setCompleteData,
        post: postComplete,
        processing: completeProcessing,
        progress: completeProgress,
        errors: completeErrors,
        reset: completeReset
    } = useForm({
        complete_document: null,
    });

    const submitCompleteFile = (e) => {
        e.preventDefault();
        postComplete(route('analysisDigitalProduct.uploadComplete'), {
            forceFormData: true,
            onSuccess: () => completeReset(),
        });
    };

    const handleSyncClick = () => {
        if (confirm('Anda yakin ingin menjalankan proses sinkronisasi untuk mengubah status order menjadi complete?')) {
            router.post(route('analysisDigitalProduct.syncComplete'), {}, {
                preserveScroll: true,
            });
        }
    };

    // Handler untuk mengubah segmen (LEGS/SME)
    function handleSegmentChange(e) {
        const newSegment = e.target.value;
        router.get(route('analysisDigitalProduct'), { segment: newSegment, period: period }, {
            preserveState: true, replace: true, preserveScroll: true, in_progress_year: currentInProgressYear,
        });
    }

    // Handler untuk mengubah periode (Bulan & Tahun)
    function handlePeriodChange(e) {
        const newPeriod = e.target.value;
        router.get(route('analysisDigitalProduct'), { segment: currentSegment, period: newPeriod }, {
            preserveState: true, replace: true, preserveScroll: true, in_progress_year: currentInProgressYear,
        });
    }

    // Handler untuk submit form unggah
    function handleUploadSubmit(e) {
        e.preventDefault();
        postUpload(route('analysisDigitalProduct.upload'), { forceFormData: true });
    }

    // Kalkulasi untuk kartu "Details"
    const detailsTotals = useMemo(() => {
        if (!reportData || reportData.length === 0) return { ogp: 0, closed: 0, total: 0 };
        const totals = reportData.reduce((acc, item) => {
            const ogp = (Number(item.in_progress_n) || 0) + (Number(item.in_progress_o) || 0) + (Number(item.in_progress_ae) || 0) + (Number(item.in_progress_ps) || 0);
            let closed = 0;
            if (currentSegment === 'SME') {
                closed = (Number(item.prov_comp_n_realisasi) || 0) + (Number(item.prov_comp_o_realisasi) || 0) + (Number(item.prov_comp_ae_realisasi) || 0) + (Number(item.prov_comp_ps_realisasi) || 0);
            } else { // LEGS
                closed = (Number(item.prov_comp_n_realisasi) || 0) + (Number(item.prov_comp_o_realisasi) || 0) + (Number(item.prov_comp_ae_realisasi) || 0) + (Number(item.prov_comp_ps_realisasi) || 0);
            }
            acc.ogp += ogp;
            acc.closed += closed;
            return acc;
        }, { ogp: 0, closed: 0 });
        return { ...totals, total: totals.ogp + totals.closed };
    }, [reportData, currentSegment]);

    const generatePeriodOptions = () => {
        const options = [];
        let date = new Date();
        for (let i = 0; i < 12; i++) {
            const year = date.getFullYear();
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const value = `${year}-${month}`;
            const label = date.toLocaleString('id-ID', { month: 'long', year: 'numeric' });
            options.push(<option key={value} value={value}>{label}</option>);
            date.setMonth(date.getMonth() - 1);
        }
        return options;
    };

    const uniqueWitelList = useMemo(() => {
        return ['ALL', ...new Set(inProgressData.map(item => item.nama_witel))];
    }, [inProgressData]);

    const filteredInProgressData = useMemo(() => {
        if (witelFilter === 'ALL') {
            return inProgressData;
        }
        return inProgressData.filter(item => item.nama_witel === witelFilter);
    }, [inProgressData, witelFilter]);

    // Komponen kecil untuk tombol Tab di bagian detail
    const DetailTabButton = ({ viewName, currentView, setView, children }) => (
        <button
            onClick={() => setView(viewName)}
            className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${currentView === viewName
                ? 'bg-blue-600 text-white shadow'
                : 'bg-white text-gray-600 hover:bg-gray-100'
                }`}
        >
            {children}
        </button>
    );

    const TabButton = ({ viewName, currentView, setView, children }) => (
        <button
            onClick={() => setView(viewName)}
            className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${currentView === viewName
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100'
                }`}
        >
            {children}
        </button>
    );

    const NewDataTable = ({ data = [] }) => {
        const formatDate = (dateString) => {
            if (!dateString) return '-';
            return new Date(dateString).toLocaleString('id-ID', {
                year: 'numeric', month: '2-digit', day: '2-digit',
                hour: '2-digit', minute: '2-digit'
            });
        };

        const getStatusChip = (status) => {
            const lowerStatus = status?.toLowerCase() || '';
            if (lowerStatus.includes('progress')) {
                return <span className="px-2 py-1 text-xs font-semibold leading-tight text-blue-700 bg-blue-100 rounded-full">{status}</span>;
            }
            if (lowerStatus.includes('done')) {
                return <span className="px-2 py-1 text-xs font-semibold leading-tight text-green-700 bg-green-100 rounded-full">{status}</span>;
            }
            return <span className="px-2 py-1 text-xs font-semibold leading-tight text-gray-700 bg-gray-100 rounded-full">{status}</span>;
        };

        return (
            <div className="overflow-x-auto text-sm">
                <p className="text-gray-500 mb-2">Menampilkan 10 data terbaru yang diunggah.</p>
                <table className="w-full">
                    <thead className="bg-gray-50">
                        <tr className="text-left font-semibold text-gray-600">
                            <th className="p-3">No.</th>
                            <th className="p-3">Milestone</th>
                            <th className="p-3">Order Status</th>
                            <th className="p-3">Product Name</th>
                            <th className="p-3">Order ID</th>
                            <th className="p-3">Witel</th>
                            <th className="p-3">Customer Name</th>
                            <th className="p-3">Created Time</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y bg-white">
                        {data.length > 0 ? data.map((item, index) => (
                            <tr key={item.order_id} className="text-gray-700 hover:bg-gray-50">
                                <td className="p-3">{index + 1}</td>
                                <td className="p-3 whitespace-normal">{item.milestone}</td>
                                <td className="p-3">{getStatusChip(item.order_status_n)}</td>
                                <td className="p-3">{item.product_name}</td>
                                <td className="p-3 font-mono">{item.order_id}</td>
                                <td className="p-3">{item.nama_witel}</td>
                                <td className="p-3">{item.customer_name}</td>
                                <td className="p-3 font-semibold">{formatDate(item.created_at)}</td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan="8" className="p-4 text-center text-gray-500">
                                    Belum ada data baru yang diunggah.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        );
    };

    return (
        <AuthenticatedLayout header="Analysis Digital Product">
            <Head title="Analysis Digital Product" />

            {/* Notifikasi Flash Messages */}
            {flash.success && (
                <div className="mb-4 bg-green-100 border-l-4 border-green-500 text-green-700 p-4" role="alert">
                    <p>{flash.success}</p>
                </div>
            )}
            {flash.error && (
                <div className="mb-4 bg-red-100 border-l-4 border-red-500 text-red-700 p-4" role="alert">
                    <p>{flash.error}</p>
                </div>
            )}

            {/* --- PERUBAHAN 1: Total grid diubah menjadi 4 kolom --- */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

                {/* --- PERUBAHAN 2: Kolom Kiri diberi 3 dari 4 bagian --- */}
                <div className="lg:col-span-3 space-y-6">

                    {/* BAGIAN 1: DATA REPORT (SELALU TAMPIL) */}
                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <div className="flex flex-wrap justify-between items-center mb-4 gap-4">
                            <h3 className="font-semibold text-lg text-gray-800">Data Report</h3>
                            <div className="flex items-center gap-4">
                                <select value={period} onChange={handlePeriodChange} className="border border-gray-300 rounded-md text-sm p-2">
                                    {generatePeriodOptions()}
                                </select>
                                <select value={currentSegment} onChange={handleSegmentChange} className="border border-gray-300 rounded-md text-sm p-2">
                                    <option value="LEGS">LEGS</option>
                                    <option value="SME">SME</option>
                                </select>
                            </div>
                        </div>
                        {currentSegment === 'SME' ? <SmeReportTable data={reportData} /> : <LegsReportTable data={reportData} />}
                    </div>

                    {/* BAGIAN 2: TABEL DETAIL (IN PROGRESS, HISTORY, & KPI) */}
                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <div className="flex flex-wrap justify-between items-center mb-4 gap-4">
                            <div className="flex items-center gap-2 border p-1 rounded-lg bg-gray-50 w-fit">
                                <DetailTabButton viewName="inprogress" currentView={activeDetailView} setView={setActiveDetailView}>
                                    Data In Progress ({filteredInProgressData.length})
                                </DetailTabButton>
                                <DetailTabButton viewName="history" currentView={activeDetailView} setView={setActiveDetailView}>
                                    Update History ({historyData.length > 10 ? '10+' : historyData.length})
                                </DetailTabButton>
                                <DetailTabButton viewName="newdata" currentView={activeDetailView} setView={setActiveDetailView}>
                                    Data Baru ({newData.length})
                                </DetailTabButton>
                                <DetailTabButton viewName="kpi" currentView={activeDetailView} setView={setActiveDetailView}>
                                    KPI PO
                                </DetailTabButton>
                            </div>
                            {activeDetailView === 'inprogress' && (
                                <div className="flex items-center gap-4">
                                    <select value={currentInProgressYear} onChange={handleInProgressYearChange} className="border border-gray-300 rounded-md text-sm p-2">
                                        {generateYearOptions()}
                                    </select>
                                    <select value={witelFilter} onChange={e => setWitelFilter(e.target.value)} className="border border-gray-300 rounded-md text-sm p-2">
                                        {uniqueWitelList.map(witel => <option key={witel} value={witel}>{witel === 'ALL' ? 'Semua Witel' : witel}</option>)}
                                    </select>
                                </div>
                            )}
                        </div>
                        {activeDetailView === 'inprogress' && <InProgressTable data={filteredInProgressData} />}
                        {activeDetailView === 'newdata' && <NewDataTable data={newData} />}
                        {activeDetailView === 'history' && <HistoryTable data={historyData.slice(0, 10)} />}
                        {activeDetailView === 'kpi' && <KpiTable data={kpiData} />}
                    </div>
                </div>

                {/* --- PERUBAHAN 3: Kolom Kanan diberi 1 dari 4 bagian --- */}
                <div className="lg:col-span-1 space-y-6">
                    <DetailsCard totals={detailsTotals} segment={currentSegment} period={new Date(period + '-02').toLocaleString('id-ID', { month: 'long', year: 'numeric' })} />
                    <EditReportForm currentSegment={currentSegment} reportData={reportData} period={period} />
                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <h3 className="font-semibold text-lg text-gray-800">Unggah Data Mentah</h3>
                        <p className="text-gray-500 mt-1 text-sm">Unggah Dokumen (xlsx, xls, csv) untuk memperbarui data.</p>
                        <form onSubmit={handleUploadSubmit} className="mt-4 space-y-4">
                            <div>
                                <input type="file" className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" onChange={(e) => setUploadData('document', e.target.files[0])} disabled={processing} />
                                {errors.document && <p className="text-red-500 text-xs mt-1">{errors.document}</p>}
                            </div>
                            {progress && (
                                <div className="w-full bg-gray-200 rounded-full"><div className="bg-blue-600 text-xs font-medium text-blue-100 text-center p-0.5 leading-none rounded-full" style={{ width: `${progress.percentage}%` }}>{progress.percentage}%</div></div>
                            )}
                            <div className="flex items-center gap-4">
                                <button type="submit" disabled={processing} className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 disabled:bg-blue-400">
                                    {processing ? 'Mengunggah...' : 'Unggah Dokumen'}
                                </button>
                                {processing && (
                                    <button type="button" onClick={() => cancel()} className="px-4 py-2 bg-red-600 text-white font-semibold rounded-md hover:bg-red-700">
                                        Batal
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>
                    {/* CARD UNGGAH ORDER COMPLETE */}
                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <h3 className="font-semibold text-lg text-gray-800">Unggah Order Complete</h3>
                        <p className="text-gray-500 mt-1 text-sm">Unggah file excel untuk dimasukkan ke tabel sementara.</p>
                        <form onSubmit={submitCompleteFile} className="mt-4 space-y-4">
                            <div>
                                <input
                                    type="file"
                                    name="complete_document"
                                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                                    onChange={(e) => setCompleteData('complete_document', e.target.files[0])}
                                    disabled={completeProcessing}
                                />
                                {completeErrors.complete_document && <p className="text-red-500 text-xs mt-1">{completeErrors.complete_document}</p>}
                            </div>

                            {completeProgress && (
                                <div className="w-full bg-gray-200 rounded-full">
                                    <div
                                        className="bg-green-600 text-xs font-medium text-green-100 text-center p-0.5 leading-none rounded-full"
                                        style={{ width: `${completeProgress.percentage}%` }}>
                                        {completeProgress.percentage}%
                                    </div>
                                </div>
                            )}
                            <PrimaryButton
                                type="submit"
                                className="bg-green-600 hover:bg-green-700 focus:bg-green-700 active:bg-green-800"
                                disabled={completeProcessing}>
                                {completeProcessing ? 'Memproses...' : 'Proses File Complete'}
                            </PrimaryButton>
                        </form>
                    </div>
                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <h3 className="font-semibold text-lg text-gray-800">Sinkronisasi Data</h3>
                        <p className="text-gray-500 mt-1 text-sm">
                            Setelah mengunggah file "Order Complete", tekan tombol di bawah ini untuk
                            menjalankan proses update status pada data "In Progress".
                        </p>
                        <PrimaryButton
                            onClick={handleSyncClick}
                            className="mt-4 w-full justify-center bg-purple-600 hover:bg-purple-700 focus:bg-purple-700 active:bg-purple-800"
                        >
                            Jalankan Sinkronisasi Order Complete
                        </PrimaryButton>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
