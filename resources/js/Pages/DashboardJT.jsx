import React, { useState, useMemo, useEffect } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, Link, usePage } from '@inertiajs/react';

// Impor Chart.js dan komponen-komponennya
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    RadialLinearScale,
    Title,
    Tooltip,
    Legend,
    Filler
} from 'chart.js';

// Impor Komponen Chart Spesifik Anda
import PieChartStatusLiveJT from '@/Components/PieChartStatusLiveJT';
import StackedBarStatusWitelJT from '@/Components/StackedBarStatusWitelJT';
import BarChartUsiaWitelJT from '@/Components/BarChartUsiaWitelJT';
import BarChartUsiaPoJT from '@/Components/BarChartUsiaPoJT';
// import RadarChartProgressWitelJT from '@/Components/RadarChartProgressWitelJT'; //radar chart yang bisa digunakan kembali dimasa depan
import GroupedBarProgressWitelJT from '@/Components/GroupedBarProgressWitelJT';

// Impor Komponen UI
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import DropdownCheckbox from '@/Components/DropdownCheckbox'; // Pastikan komponen ini ada

// Registrasi semua elemen Chart.js
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    RadialLinearScale,
    Title,
    Tooltip,
    Legend,
    Filler
);

// Komponen Badge Status
const StatusBadge = ({ text, colorClass }) => (
    <span className={`px-2 py-0.5 text-xs font-semibold leading-tight rounded-full ${colorClass}`}>
        {text}
    </span>
);

// Helper untuk format tanggal
const formatDateForQuery = (date) => {
    if (!date) return undefined;
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
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

    // --- STATE MANAGEMENT & HOOKS ---

    // Ambil opsi filter dari props, memo-kan agar tidak re-render
    const witelOptions = useMemo(() => filterOptions.witelIndukList || [], [filterOptions.witelIndukList]);
    const poOptions = useMemo(() => filterOptions.poList || [], [filterOptions.poList]);

    // State untuk filter global (apa yang dipilih pengguna di panel)
    const [localFilters, setLocalFilters] = useState({
        witels: [],
        pos: [],
        startDate: null,
        endDate: null,
    });

    // [BARU] State untuk filter per-chart
    const [stackedBarFilters, setStackedBarFilters] = useState({ witels: [] });
    const [usiaWitelFilters, setUsiaWitelFilters] = useState({ witels: [] });
    const [usiaPoFilters, setUsiaPoFilters] = useState({ pos: [] });
    const [radarFilters, setRadarFilters] = useState({ witels: [] });

    // Sinkronkan state lokal dengan props (filter aktif) saat halaman dimuat
    useEffect(() => {
        setLocalFilters({
            // Jika filter 'witels' ada di URL, gunakan itu. Jika tidak, default ke *semua* witel.
            witels: filters.witels && Array.isArray(filters.witels) ? filters.witels : witelOptions,
            pos: filters.pos && Array.isArray(filters.pos) ? filters.pos : poOptions,
            startDate: filters.startDate ? new Date(`${filters.startDate}T00:00:00`) : null,
            endDate: filters.endDate ? new Date(`${filters.endDate}T00:00:00`) : null,
        });

        // [BARU] Inisialisasi filter per-chart agar menampilkan semua data
        setStackedBarFilters({ witels: witelOptions });
        setUsiaWitelFilters({ witels: witelOptions });
        setUsiaPoFilters({ pos: poOptions });
        setRadarFilters({ witels: witelOptions });

    }, [filters, witelOptions, poOptions]);

    // [BARU] useMemo untuk memfilter data chart secara lokal
    const filteredStackedBarData = useMemo(() =>
        stackedBarData.filter(item => stackedBarFilters.witels.includes(item.witel))
        , [stackedBarData, stackedBarFilters]);

    const filteredUsiaWitelData = useMemo(() =>
        usiaWitelData.filter(item => usiaWitelFilters.witels.includes(item.witel))
        , [usiaWitelData, usiaWitelFilters]);

    const filteredUsiaPoData = useMemo(() =>
        usiaPoData.filter(item => usiaPoFilters.pos.includes(item.po_name))
        , [usiaPoData, usiaPoFilters]);

    const filteredRadarData = useMemo(() =>
        radarData.filter(item => radarFilters.witels.includes(item.witel))
        , [radarData, radarFilters]);


    // --- FUNGSI HANDLER ---

    // Tombol "Terapkan Filter"
    const applyFilters = () => {
        const queryParams = {
            witels: localFilters.witels.length > 0 && localFilters.witels.length < witelOptions.length ? localFilters.witels : undefined,
            pos: localFilters.pos.length > 0 && localFilters.pos.length < poOptions.length ? localFilters.pos : undefined,
            startDate: formatDateForQuery(localFilters.startDate),
            endDate: formatDateForQuery(localFilters.endDate),
        };

        const targetRoute = isEmbed ? route('dashboard.jt.embed') : route('dashboard.jt');
        router.get(targetRoute, queryParams, {
            replace: true,
            preserveState: true,
            preserveScroll: true,
        });
    };

    // Tombol "Reset Filter"
    const resetFilters = () => {
        const targetRoute = isEmbed ? route('dashboard.jt.embed') : route('dashboard.jt');
        router.get(targetRoute, {}, { preserveScroll: true });
    }

    // Dropdown "Tampilkan X Baris"
    const handleLimitChange = (value) => {
        const targetRoute = isEmbed ? route('dashboard.jt.embed') : route('dashboard.jt');
        router.get(targetRoute, { ...filters, limit: value }, {
            preserveScroll: true,
            replace: true
        });
    }

    // Helper untuk styling badge status
    const getStatusColor = (status) => {
        const s = status?.toLowerCase();
        if (s === 'go live' || s === 'selesai') {
            return 'bg-green-100 text-green-800';
        }
        if (s === 'dibatalkan' || s === 'drop') {
            return 'bg-red-100 text-red-800';
        }
        return 'bg-yellow-100 text-yellow-800'; // Default untuk On Progress
    };

    // --- KONTEN UTAMA ---
    const DashboardContent = (
        <>
            {/* Panel Filter Global */}
            <div className="bg-white p-4 rounded-lg shadow-md mb-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    {/* Filter Tanggal */}
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
                    {/* Filter Witel Induk */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Witel Induk</label>
                        <DropdownCheckbox
                            title="Pilih Witel"
                            options={witelOptions}
                            selectedOptions={localFilters.witels}
                            onSelectionChange={s => setLocalFilters(p => ({ ...p, witels: s }))}
                        />
                    </div>
                    {/* Filter PO */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">PO Name</label>
                        <DropdownCheckbox
                            title="Pilih PO"
                            options={poOptions}
                            selectedOptions={localFilters.pos}
                            onSelectionChange={s => setLocalFilters(p => ({ ...p, pos: s }))}
                        />
                    </div>
                </div>
                {/* Tombol Filter */}
                <div className="flex justify-end gap-3 mt-4">
                    <button onClick={resetFilters} className="px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-md hover:bg-gray-700">Reset Filter</button>
                    <button onClick={applyFilters} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700">Terapkan Filter</button>
                </div>
            </div>

            {/* Grid Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Chart 1: Pie Chart Status (Tanpa filter lokal, karena ini Grand Total) */}
                <div className="bg-white p-6 rounded-lg shadow-md flex flex-col lg:col-span-1">
                    <div className="flex-grow min-h-[350px]">
                        <PieChartStatusLiveJT data={pieChartData} />
                    </div>
                </div>

                {/* Chart 2: Stacked Bar Status per Witel */}
                <div className="bg-white p-6 rounded-lg shadow-md flex flex-col lg:col-span-2">
                    <div className="flex-grow min-h-[350px]">
                        {/* [BARU] Menggunakan data yang sudah difilter */}
                        <StackedBarStatusWitelJT data={filteredStackedBarData} />
                    </div>
                    {/* [BARU] Filter lokal per-chart */}
                    <DropdownCheckbox
                        title="Filter Witel"
                        options={witelOptions}
                        selectedOptions={stackedBarFilters.witels}
                        onSelectionChange={s => setStackedBarFilters(p => ({ ...p, witels: s }))}
                        className="mt-4"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
                {/* Chart 3: Usia Tertinggi per Witel */}
                <div className="bg-white p-6 rounded-lg shadow-md flex flex-col">
                    <div className="flex-grow min-h-[350px]">
                        {/* [BARU] Menggunakan data yang sudah difilter */}
                        <BarChartUsiaWitelJT data={filteredUsiaWitelData} />
                    </div>
                    {/* [BARU] Filter lokal per-chart */}
                    <DropdownCheckbox
                        title="Filter Witel"
                        options={witelOptions}
                        selectedOptions={usiaWitelFilters.witels}
                        onSelectionChange={s => setUsiaWitelFilters(p => ({ ...p, witels: s }))}
                        className="mt-4"
                    />
                </div>

                {/* Chart 4: Usia Tertinggi per PO */}
                <div className="bg-white p-6 rounded-lg shadow-md flex flex-col">
                    <div className="flex-grow min-h-[350px]">
                        {/* [BARU] Menggunakan data yang sudah difilter */}
                        <BarChartUsiaPoJT data={filteredUsiaPoData} />
                    </div>
                    {/* [BARU] Filter lokal per-chart */}
                    <DropdownCheckbox
                        title="Filter PO"
                        options={poOptions}
                        selectedOptions={usiaPoFilters.pos}
                        onSelectionChange={s => setUsiaPoFilters(p => ({ ...p, pos: s }))}
                        className="mt-4"
                    />
                </div>

                {/* Chart 5: Radar Chart Progress */}
                <div className="bg-white p-6 rounded-lg shadow-md flex flex-col">
                    <div className="flex-grow min-h-[350px]">
                        {/* [BARU] Menggunakan data yang sudah difilter */}
                        <GroupedBarProgressWitelJT data={filteredRadarData} />
                    </div>
                    {/* [BARU] Filter lokal per-chart */}
                    <DropdownCheckbox
                        title="Filter Witel"
                        options={witelOptions}
                        selectedOptions={radarFilters.witels}
                        onSelectionChange={s => setRadarFilters(p => ({ ...p, witels: s }))}
                        className="mt-4"
                    />
                </div>
            </div>

            {/* Tabel Data Preview */}
            <div className="bg-white p-6 rounded-lg shadow-md mt-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold text-lg text-gray-800">Data Preview (Diurutkan berdasarkan Usia Tertinggi)</h3>
                    <div>
                        <label htmlFor="limit-filter" className="text-sm font-semibold text-gray-600 mr-2">Tampilkan:</label>
                        <select
                            id="limit-filter"
                            value={filters.limit || '10'}
                            onChange={e => handleLimitChange(e.target.value)}
                            className="border border-gray-300 rounded-md text-sm p-2"
                        >
                            <option value="10">10 Baris</option>
                            <option value="50">50 Baris</option>
                            <option value="100">100 Baris</option>
                            <option value="500">500 Baris</option>
                        </select>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3">Uraian Kegiatan</th>
                                <th scope="col" className="px-6 py-3">Witel Induk</th>
                                <th scope="col" className="px-6 py-3">Witel Baru</th>
                                <th scope="col" className="px-6 py-3">PO Name</th>
                                <th scope="col" className="px-6 py-3">Status</th>
                                <th scope="col" className="px-6 py-3">Tgl. CB</th>
                                <th scope="col" className="px-6 py-3">Usia (Hari)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {dataPreview?.data?.length > 0 ? (
                                dataPreview.data.map((item, index) => (
                                    <tr key={index} className="bg-white border-b hover:bg-gray-50">
                                        <td className="px-6 py-4 font-medium text-gray-900 max-w-xs truncate" title={item.uraian_kegiatan}>
                                            {item.uraian_kegiatan}
                                        </td>
                                        <td className="px-6 py-4">{item.witel_induk}</td>
                                        <td className="px-6 py-4">{item.witel_baru}</td>
                                        <td className="px-6 py-4">{item.po_name}</td>
                                        <td className="px-6 py-4">
                                            <StatusBadge
                                                text={item.status_proyek?.toUpperCase()}
                                                colorClass={getStatusColor(item.status_proyek)}
                                            />
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {item.tanggal_cb ? new Date(item.tanggal_cb + 'T00:00:00').toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                                        </td>
                                        <td className="px-6 py-4 font-bold text-center">{item.usia}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr><td colSpan="7" className="text-center py-4 text-gray-500">Tidak ada data yang cocok dengan filter yang dipilih.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
                {/* Paginasi */}
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
        return (
            <div className="p-4 sm:p-6 bg-gray-100 font-sans">
                {DashboardContent}
            </div>
        );
    }

    return (
        <AuthenticatedLayout
            auth={auth} // auth sudah di-pass, 'user={auth.user}' mungkin lebih tepat
            header={<h2 className="font-semibold text-xl text-gray-800 leading-tight">Dashboard Analysis JT</h2>}
        >
            <Head title="Dashboard Analysis JT" />

            <div className="py-8">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    {DashboardContent}
                </div>
            </div>

        </AuthenticatedLayout>
    );
}
