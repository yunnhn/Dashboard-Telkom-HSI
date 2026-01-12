import React, { useState, useMemo, useEffect, useRef } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, Link } from '@inertiajs/react';

// Impor Chart.js dan komponen-komponennya (TETAP SAMA)
import {
    Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, RadialLinearScale, Title, Tooltip, Legend, Filler
} from 'chart.js';

import PieChartStatusLiveJT from '@/Components/PieChartStatusLiveJT';
import StackedBarStatusWitelJT from '@/Components/StackedBarStatusWitelJT';
import BarChartUsiaWitelJT from '@/Components/BarChartUsiaWitelJT';
import BarChartUsiaPoJT from '@/Components/BarChartUsiaPoJT';
import GroupedBarProgressWitelJT from '@/Components/GroupedBarProgressWitelJT';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import DropdownCheckbox from '@/Components/DropdownCheckbox';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, RadialLinearScale, Title, Tooltip, Legend, Filler);

const StatusBadge = ({ text, colorClass }) => (
    <span className={`px-2 py-0.5 text-xs font-semibold leading-tight rounded-full ${colorClass}`}>
        {text}
    </span>
);

const formatDateForQuery = (date) => {
    if (!date) return undefined;
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const formatRupiah = (number) => {
    if (number === null || number === undefined) return '-';
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(number);
};

export default function DashboardJT({
    auth,
    pieChartData,
    stackedBarData,
    usiaWitelData,
    usiaPoData,
    radarData,
    dataPreview,
    filters = {},
    filterOptions = {},
    isEmbed = false
}) {
    // --- STATE MANAGEMENT ---
    const witelOptions = useMemo(() => filterOptions.witelIndukList || [], [filterOptions.witelIndukList]);
    const allPoOptions = useMemo(() => filterOptions.poList || [], [filterOptions.poList]);
    const witelPoMap = useMemo(() => filterOptions.witelPoMap || {}, [filterOptions.witelPoMap]);

    // [UPDATED] Tambahkan 'search' ke localFilters
    const [localFilters, setLocalFilters] = useState(() => ({
        witels: filters.witels && Array.isArray(filters.witels) ? filters.witels : witelOptions,
        pos: filters.pos && Array.isArray(filters.pos) ? filters.pos : allPoOptions,
        startDate: filters.startDate ? new Date(filters.startDate) : new Date(),
        endDate: filters.endDate ? new Date(filters.endDate) : new Date(),

        search: filters.search || '',
    }));

    const dynamicPoOptions = useMemo(() => {
        if (!localFilters.witels || localFilters.witels.length === 0) return allPoOptions;
        let availablePos = [];
        localFilters.witels.forEach(witel => {
            const mapKey = witel.trim();
            if (witelPoMap[mapKey]) availablePos = [...availablePos, ...witelPoMap[mapKey]];
        });
        if (availablePos.length === 0) return [];
        return [...new Set(availablePos)].sort();
    }, [localFilters.witels, allPoOptions, witelPoMap]);

    const isFirstRender = useRef(true);

    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }
        if (localFilters.pos.length > 0) {
            const validPos = localFilters.pos.filter(p => dynamicPoOptions.includes(p));
            if (validPos.length !== localFilters.pos.length) {
                setLocalFilters(prev => ({ ...prev, pos: validPos }));
            }
        }
    }, [localFilters.witels, dynamicPoOptions]);

    // [UPDATED] Apply Filters sekarang menyertakan search
    const applyFilters = () => {
        const queryParams = {
            witels: localFilters.witels.length > 0 && localFilters.witels.length < witelOptions.length ? localFilters.witels : undefined,
            pos: localFilters.pos.length > 0 && localFilters.pos.length < allPoOptions.length ? localFilters.pos : undefined,
            startDate: formatDateForQuery(localFilters.startDate),
            endDate: formatDateForQuery(localFilters.endDate),
            search: localFilters.search || undefined, // Sertakan Search
        };

        const targetRoute = isEmbed ? route('dashboard.jt.embed') : route('dashboard.jt');
        router.get(targetRoute, queryParams, { replace: true, preserveState: true, preserveScroll: true });
    };

    const resetFilters = () => {
        const targetRoute = isEmbed ? route('dashboard.jt.embed') : route('dashboard.jt');
        router.get(targetRoute, {}, { preserveScroll: true });
    }

    const handleLimitChange = (value) => {
        const targetRoute = isEmbed ? route('dashboard.jt.embed') : route('dashboard.jt');
        router.get(targetRoute, { ...filters, limit: value }, { preserveScroll: true, replace: true });
    }

    const handleSearchKeyDown = (e) => {
        if (e.key === 'Enter') applyFilters();
    };

    const getStatusColor = (status) => {
        const s = status?.toLowerCase();
        if (s === 'go live' || s === 'selesai') return 'bg-green-100 text-green-800';
        if (s === 'dibatalkan' || s === 'drop') return 'bg-red-100 text-red-800';
        return 'bg-yellow-100 text-yellow-800';
    };

    // --- KONTEN UTAMA ---
    const DashboardContent = (
        <>
            {/* Panel Filter Global (TETAP SAMA) */}
            <div className="bg-white p-4 rounded-lg shadow-md mb-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Rentang Tanggal (berdasarkan Tgl. MOM)</label>
                        <DatePicker
                            selectsRange
                            startDate={localFilters.startDate}
                            endDate={localFilters.endDate}
                            onChange={(update) => setLocalFilters(prev => ({ ...prev, startDate: update[0], endDate: update[1] }))}
                            isClearable={true}
                            dateFormat="dd/MM/yyyy"
                            className="w-full border-gray-300 rounded-md shadow-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Witel</label>
                        <DropdownCheckbox
                            title="Pilih Witel"
                            options={witelOptions}
                            selectedOptions={localFilters.witels}
                            onSelectionChange={s => setLocalFilters(p => ({ ...p, witels: s }))}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">PO Name</label>
                        <DropdownCheckbox
                            title={localFilters.witels.length > 0 ? "Pilih PO (Filtered)" : "Pilih PO"}
                            options={dynamicPoOptions}
                            selectedOptions={localFilters.pos}
                            onSelectionChange={s => setLocalFilters(p => ({ ...p, pos: s }))}
                        />
                    </div>
                </div>
                <div className="flex justify-end gap-3 mt-4">
                    <button onClick={resetFilters} className="px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-md hover:bg-gray-700">Reset Filter</button>
                    <button onClick={applyFilters} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700">Terapkan Filter</button>
                </div>
            </div>

            {/* Grid Chart (TETAP SAMA) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-lg shadow-md flex flex-col lg:col-span-1">
                    <div className="flex-grow min-h-[350px]"><PieChartStatusLiveJT data={pieChartData} /></div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-md flex flex-col lg:col-span-2">
                    <div className="flex-grow min-h-[350px]"><StackedBarStatusWitelJT data={stackedBarData} /></div>
                </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
                <div className="bg-white p-6 rounded-lg shadow-md flex flex-col">
                    <div className="flex-grow min-h-[350px]"><BarChartUsiaWitelJT data={usiaWitelData} /></div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-md flex flex-col">
                    <div className="flex-grow min-h-[350px]"><BarChartUsiaPoJT data={usiaPoData} /></div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-md flex flex-col">
                    <div className="flex-grow min-h-[350px]"><GroupedBarProgressWitelJT data={radarData} /></div>
                </div>
            </div>

            {/* Tabel Data Preview (UPDATED: Search & Kolom DB) */}
            <div className="bg-white p-6 rounded-lg shadow-md mt-6">
                <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
                    <h3 className="font-semibold text-lg text-gray-800">Data Preview (Diurutkan berdasarkan Usia Tertinggi)</h3>

                    <div className="flex items-center gap-2">
                        {/* Search Input [NEW] */}
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Cari ID, NDE, Kegiatan, PO..."
                                value={localFilters.search}
                                onChange={e => setLocalFilters(prev => ({...prev, search: e.target.value}))}
                                onKeyDown={handleSearchKeyDown}
                                className="border border-gray-300 rounded-md text-sm pl-3 pr-8 py-2 w-64 focus:ring-blue-500 focus:border-blue-500"
                            />
                            <button
                                onClick={applyFilters}
                                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-blue-600"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                                </svg>
                            </button>
                        </div>

                        {/* Limit Selector */}
                        <div className="flex items-center">
                            <label htmlFor="limit-filter" className="text-sm font-semibold text-gray-600 mr-2 whitespace-nowrap">Tampilkan:</label>
                            <select
                                id="limit-filter"
                                value={filters.limit || '10'}
                                onChange={e => handleLimitChange(e.target.value)}
                                className="border border-gray-300 rounded-md text-sm p-2"
                            >
                                <option value="10">10</option>
                                <option value="50">50</option>
                                <option value="100">100</option>
                                <option value="500">500</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto pb-4">
                    <table className="w-full text-sm text-left text-gray-500 whitespace-nowrap">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                            <tr>
                                {/* Header Kolom Lengkap */}
                                <th scope="col" className="px-6 py-3">ID i-HLD</th>
                                <th scope="col" className="px-6 py-3">No NDE SPMK</th>
                                <th scope="col" className="px-6 py-3">Uraian Kegiatan</th>
                                <th scope="col" className="px-6 py-3">Segmen</th>
                                <th scope="col" className="px-6 py-3">PO Name</th>
                                <th scope="col" className="px-6 py-3">Witel Baru</th>
                                <th scope="col" className="px-6 py-3">Witel Lama</th>
                                <th scope="col" className="px-6 py-3">Region</th>
                                <th scope="col" className="px-6 py-3">Status Proyek</th>
                                <th scope="col" className="px-6 py-3">Tgl CB</th>
                                <th scope="col" className="px-6 py-3">Jenis Kegiatan</th>
                                <th scope="col" className="px-6 py-3">Revenue Plan</th>
                                <th scope="col" className="px-6 py-3">Go Live</th>
                                <th scope="col" className="px-6 py-3">Ket. TOC</th>
                                <th scope="col" className="px-6 py-3">Perihal NDE</th>
                                <th scope="col" className="px-6 py-3">MOM</th>
                                <th scope="col" className="px-6 py-3">BA Drop</th>
                                <th scope="col" className="px-6 py-3">Populasi Non Drop</th>
                                <th scope="col" className="px-6 py-3">Tgl MOM</th>
                                <th scope="col" className="px-6 py-3 text-center">Usia (Hari)</th>
                                <th scope="col" className="px-6 py-3">RAB</th>
                                <th scope="col" className="px-6 py-3">Total Port</th>
                                <th scope="col" className="px-6 py-3">Template Durasi</th>
                                <th scope="col" className="px-6 py-3">TOC</th>
                                <th scope="col" className="px-6 py-3">Umur Pekerjaan</th>
                                <th scope="col" className="px-6 py-3">Kat. Umur</th>
                                <th scope="col" className="px-6 py-3">Tomps Last Activity</th>
                                <th scope="col" className="px-6 py-3">Tomps New</th>
                                <th scope="col" className="px-6 py-3">Status i-HLD</th>
                                <th scope="col" className="px-6 py-3">ODP Go Live</th>
                                <th scope="col" className="px-6 py-3">BAK</th>
                                <th scope="col" className="px-6 py-3">Ket. Pelimpahan</th>
                                <th scope="col" className="px-6 py-3">Mitra Lokal</th>
                            </tr>
                        </thead>
                        <tbody>
                            {dataPreview?.data?.length > 0 ? (
                                dataPreview.data.map((item, index) => (
                                    <tr key={index} className="bg-white border-b hover:bg-gray-50">
                                        <td className="px-6 py-4 font-mono text-xs text-gray-700">{item.id_i_hld}</td>
                                        <td className="px-6 py-4 font-mono text-xs text-gray-700">{item.no_nde_spmk}</td>

                                        {/* Uraian Kegiatan: Bolehkan wrap sedikit jika terlalu panjang, atau pakai max-w-md */}
                                        <td className="px-6 py-4 font-medium text-gray-900 whitespace-normal min-w-[300px]" title={item.uraian_kegiatan}>
                                            {item.uraian_kegiatan}
                                        </td>

                                        <td className="px-6 py-4">{item.segmen}</td>
                                        <td className="px-6 py-4 font-semibold text-blue-600">{item.po_name}</td>
                                        <td className="px-6 py-4">{item.witel_baru}</td>
                                        <td className="px-6 py-4">{item.witel_lama}</td>
                                        <td className="px-6 py-4">{item.region}</td>

                                        <td className="px-6 py-4">
                                            <StatusBadge
                                                text={item.status_proyek?.toUpperCase()}
                                                colorClass={getStatusColor(item.status_proyek)}
                                            />
                                        </td>

                                        <td className="px-6 py-4">
                                            {item.tanggal_cb ? new Date(item.tanggal_cb).toLocaleDateString('id-ID') : '-'}
                                        </td>

                                        <td className="px-6 py-4">{item.jenis_kegiatan}</td>
                                        <td className="px-6 py-4">{formatRupiah(item.revenue_plan)}</td>
                                        <td className="px-6 py-4 text-center">{item.go_live}</td>
                                        <td className="px-6 py-4 whitespace-normal min-w-[200px]">{item.keterangan_toc}</td>
                                        <td className="px-6 py-4 whitespace-normal min-w-[200px]">{item.perihal_nde_spmk}</td>
                                        <td className="px-6 py-4">{item.mom}</td>
                                        <td className="px-6 py-4">{item.ba_drop}</td>
                                        <td className="px-6 py-4 text-center">{item.populasi_non_drop}</td>

                                        <td className="px-6 py-4 font-semibold">
                                            {item.tanggal_mom ? new Date(item.tanggal_mom).toLocaleDateString('id-ID') : '-'}
                                        </td>

                                        <td className="px-6 py-4 font-bold text-center text-red-600 bg-red-50 rounded">
                                            {item.usia}
                                        </td>

                                        <td className="px-6 py-4">{formatRupiah(item.rab)}</td>
                                        <td className="px-6 py-4">{item.total_port}</td>
                                        <td className="px-6 py-4">{item.template_durasi}</td>
                                        <td className="px-6 py-4">{item.toc}</td>
                                        <td className="px-6 py-4">{item.umur_pekerjaan}</td>
                                        <td className="px-6 py-4">{item.kategori_umur_pekerjaan}</td>
                                        <td className="px-6 py-4">{item.status_tomps_last_activity}</td>
                                        <td className="px-6 py-4">{item.status_tomps_new}</td>
                                        <td className="px-6 py-4">{item.status_i_hld}</td>
                                        <td className="px-6 py-4">{item.nama_odp_go_live}</td>
                                        <td className="px-6 py-4">{item.bak}</td>
                                        <td className="px-6 py-4 whitespace-normal min-w-[200px]">{item.keterangan_pelimpahan}</td>
                                        <td className="px-6 py-4">{item.mitra_lokal}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    {/* Colspan disesuaikan jumlah kolom (sekitar 33 kolom) */}
                                    <td colSpan="33" className="text-center py-8 text-gray-500">
                                        Tidak ada data yang cocok.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {dataPreview?.links?.length > 1 && dataPreview.total > 0 && (
                    <div className="mt-4 flex flex-col sm:flex-row justify-between items-center text-sm text-gray-600 gap-4">
                        <span>Menampilkan {dataPreview.from} sampai {dataPreview.to} dari {dataPreview.total} hasil</span>
                        <div className="flex items-center flex-wrap justify-center sm:justify-end">
                            {dataPreview.links.map((link, index) => (
                                <Link
                                    key={index}
                                    href={link.url || '#'}
                                    className={`px-3 py-1 border rounded-md mx-1 transition ${link.active ? 'bg-blue-600 text-white' : 'bg-white hover:bg-gray-100'} ${!link.url ? 'text-gray-400 cursor-not-allowed' : ''}`}
                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                    as="button"
                                    disabled={!link.url}
                                    preserveScroll
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </>
    );

    if (isEmbed) {
        return <div className="p-4 sm:p-6 bg-gray-100 font-sans">{DashboardContent}</div>;
    }

    return (
        <AuthenticatedLayout
            auth={auth} // Menggunakan 'auth' prop langsung, sesuai kode asli
            header={<h2 className="font-semibold text-xl text-gray-800 leading-tight">Dashboard Analysis JT</h2>}
        >
            <Head title="Dashboard Analysis JT" />
            <div className="py-8">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">{DashboardContent}</div>
            </div>
        </AuthenticatedLayout>
    );
}