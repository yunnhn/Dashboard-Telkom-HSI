import React, { useState, useMemo, useEffect } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, Link } from '@inertiajs/react';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import DropdownCheckbox from '@/Components/DropdownCheckbox';
import { Bar, Pie } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';

// --- [1] IMPORT PLUGIN DATALABELS ---
import ChartDataLabels from 'chartjs-plugin-datalabels';

// --- [2] REGISTRASI PLUGIN ---
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, ChartDataLabels);

// [HELPER] Format Rupiah
const formatRupiah = (number) => {
    if (number === null || number === undefined) return '-';
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(number);
};

// [HELPER] Format Tanggal
const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('id-ID', {
        day: '2-digit', month: 'short', year: 'numeric'
    });
};

// --- Komponen Chart ---

// (Chart Lain Tidak Berubah)
const OrdersByCategoryChart = ({ data = [] }) => {
    const chartData = useMemo(() => {
        const labels = [...new Set(data.map(item => item.kategori))].sort();
        return {
            labels,
            datasets: [
                {
                    label: '< 3 BLN',
                    data: labels.map(label => data.find(item => item.kategori === label)?.lt_3bln_total || 0),
                    backgroundColor: 'rgba(59, 130, 246, 0.7)',
                    borderColor: 'rgba(59, 130, 246, 1)',
                    borderWidth: 1,
                    datalabels: { display: false } // Sembunyikan label di bar chart ini jika tidak ingin ramai
                },
                {
                    label: '> 3 BLN',
                    data: labels.map(label => data.find(item => item.kategori === label)?.gt_3bln_total || 0),
                    backgroundColor: 'rgba(239, 68, 68, 0.7)',
                    borderColor: 'rgba(239, 68, 68, 1)',
                    borderWidth: 1,
                    datalabels: { display: false }
                }
            ],
        };
    }, [data]);
    const options = { 
        responsive: true, 
        maintainAspectRatio: false, 
        scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true } },
        plugins: { datalabels: { display: false } } // Disable global datalabels for this chart
    };
    return <Bar options={options} data={chartData} />;
};

const RevenueByCategoryChart = ({ data = [] }) => {
    const chartData = useMemo(() => {
        const labels = [...new Set(data.map(item => item.kategori))].sort();
        return {
            labels,
            datasets: [
                {
                    label: '< 3 BLN (Juta)',
                    data: labels.map(label => data.find(item => item.kategori === label)?.lt_3bln_revenue || 0),
                    backgroundColor: 'rgba(59, 130, 246, 0.7)',
                },
                {
                    label: '> 3 BLN (Juta)',
                    data: labels.map(label => data.find(item => item.kategori === label)?.gt_3bln_revenue || 0),
                    backgroundColor: 'rgba(239, 68, 68, 0.7)',
                }
            ],
        };
    }, [data]);
    const options = { 
        responsive: true, 
        maintainAspectRatio: false, 
        scales: { y: { beginAtZero: true } },
        plugins: { datalabels: { display: false } } 
    };
    return <Bar options={options} data={chartData} />;
};

// --- [3] UPDATE WITEL PIE CHART UNTUK MENAMPILKAN ANGKA ---
const WitelPieChart = ({ data = [] }) => {
    const chartData = useMemo(() => {
        const backgroundColors = [
            '#4A90E2', '#50E3C2', '#F5A623', '#F8E71C', '#BD10E0',
            '#9013FE', '#B8E986', '#7ED321', '#E84A5F', '#FF847C'
        ];
        return {
            labels: data.map(item => item.witel),
            datasets: [{
                data: data.map(item => item.value),
                backgroundColor: data.map((_, index) => backgroundColors[index % backgroundColors.length]),
                borderColor: '#ffffff',
                borderWidth: 2,
            }],
        };
    }, [data]);

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        layout: {
            padding: 20
        },
        plugins: {
            legend: {
                position: 'right',
                labels: {
                    usePointStyle: true,
                    boxWidth: 10
                }
            },
            // KONFIGURASI DATALABELS (ANGKA)
            datalabels: {
                display: true, // Pastikan tampil
                color: '#fff', // Warna teks putih
                font: {
                    weight: 'bold',
                    size: 12
                },
                formatter: (value, ctx) => {
                    // Hanya tampilkan jika nilai > 0 agar tidak menumpuk
                    if (value > 0) {
                        return value; 
                    }
                    return null;
                },
                anchor: 'center',
                align: 'center',
                offset: 0,
            }
        }
    };
    return <Pie options={options} data={chartData} />;
};

const WitelBarChart = ({ data = [] }) => {
    const chartData = useMemo(() => {
        const labels = data.map(item => item.witel).reverse();
        const values = data.map(item => item.value).reverse();
        return {
            labels: labels,
            datasets: [{
                label: 'Jumlah Order',
                data: values,
                backgroundColor: '#4A90E2',
                borderColor: '#3B82F6',
                borderWidth: 1,
            }],
        };
    }, [data]);
    const options = {
        indexAxis: 'y',
        responsive: true, maintainAspectRatio: false,
        plugins: { 
            legend: { display: false }, 
            title: { display: false },
            datalabels: { // Tampilkan angka di ujung bar juga agar bagus
                display: true,
                color: '#444',
                anchor: 'end',
                align: 'end',
                formatter: (value) => value > 0 ? value : ''
            }
        },
        scales: { 
            x: { beginAtZero: true, title: { display: true, text: 'Jumlah Order' } }, 
            y: { ticks: { autoSkip: false } } 
        }
    };
    return <Bar options={options} data={chartData} />;
};

const Pagination = ({ links = [] }) => {
    if (links.length <= 3) return null;
    return (
        <div className="flex items-center flex-wrap justify-center sm:justify-end">
            {links.map((link, index) => (
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
    );
};

export default function DashboardSOS({
    auth,
    ordersByCategory,
    revenueByCategory,
    witelDistribution,
    segmenDistribution,
    dataPreview,
    filters = {},
    filterOptions = {},
    isEmbed = false
}) {
    const witelOptions = useMemo(() => filterOptions.witelList || [], [filterOptions.witelList]);
    const segmenOptions = useMemo(() => filterOptions.segmenList || [], [filterOptions.segmenList]);
    const kategoriOptions = useMemo(() => filterOptions.kategoriList || [], [filterOptions.kategoriList]);
    const umurOptions = useMemo(() => filterOptions.umurList || [], [filterOptions.umurList]);

    const [localFilters, setLocalFilters] = useState(() => ({
        witels: filters.witels && Array.isArray(filters.witels) ? filters.witels : witelOptions,
        segmens: filters.segmens && Array.isArray(filters.segmens) ? filters.segmens : segmenOptions,
        kategoris: filters.kategoris && Array.isArray(filters.kategoris) ? filters.kategoris : kategoriOptions,
        umurs: filters.umurs && Array.isArray(filters.umurs) ? filters.umurs : umurOptions,
        startDate: filters.startDate ? new Date(filters.startDate) : new Date(),
        endDate: filters.endDate ? new Date(filters.endDate) : new Date(),
        search: filters.search || '',
    }));

    const formatDateForQuery = (date) => {
        if (!date) return undefined;
        const offset = date.getTimezoneOffset();
        const localDate = new Date(date.getTime() - (offset * 60 * 1000));
        return localDate.toISOString().split('T')[0];
    };

    const applyFilters = () => {
        const queryParams = {
            witels: localFilters.witels.length > 0 && localFilters.witels.length < witelOptions.length ? localFilters.witels : undefined,
            segmens: localFilters.segmens.length > 0 && localFilters.segmens.length < segmenOptions.length ? localFilters.segmens : undefined,
            kategoris: localFilters.kategoris.length > 0 && localFilters.kategoris.length < kategoriOptions.length ? localFilters.kategoris : undefined,
            umurs: localFilters.umurs.length > 0 && localFilters.umurs.length < umurOptions.length ? localFilters.umurs : undefined,
            startDate: formatDateForQuery(localFilters.startDate),
            endDate: formatDateForQuery(localFilters.endDate),
            search: localFilters.search || undefined,
        };
        const targetRoute = isEmbed ? route('dashboard.sos.embed') : route('dashboard.sos');
        router.get(targetRoute, queryParams, { replace: true, preserveState: true, preserveScroll: true });
    };

    const resetFilters = () => {
        const targetRoute = isEmbed ? route('dashboard.sos.embed') : route('dashboard.sos');
        router.get(targetRoute, {}, { preserveScroll: true });
    };

    const handleLimitChange = (value) => {
        const targetRoute = isEmbed ? route('dashboard.sos.embed') : route('dashboard.sos');
        router.get(targetRoute, { ...filters, limit: value }, { preserveScroll: true, replace: true });
    }

    const handleSearchKeyDown = (e) => {
        if (e.key === 'Enter') applyFilters();
    };

    const DashboardContent = (
        <>
            {/* Panel Filter Global */}
            <div className="bg-white p-4 rounded-lg shadow-md mb-6">
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 items-end">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Rentang Tanggal</label>
                        <DatePicker
                            selectsRange
                            startDate={localFilters.startDate}
                            endDate={localFilters.endDate}
                            onChange={(update) => setLocalFilters(prev => ({ ...prev, startDate: update[0], endDate: update[1] }))}
                            isClearable={false}
                            dateFormat="dd/MM/yyyy"
                            className="w-full border-gray-300 rounded-md shadow-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Witel</label>
                        <DropdownCheckbox title="Pilih Witel" options={witelOptions} selectedOptions={localFilters.witels || []} onSelectionChange={s => setLocalFilters(p => ({ ...p, witels: s }))} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Segmen</label>
                        <DropdownCheckbox title="Pilih Segmen" options={segmenOptions} selectedOptions={localFilters.segmens || []} onSelectionChange={s => setLocalFilters(p => ({ ...p, segmens: s }))} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
                        <DropdownCheckbox title="Pilih Kategori" options={kategoriOptions} selectedOptions={localFilters.kategoris || []} onSelectionChange={s => setLocalFilters(p => ({ ...p, kategoris: s }))} />
                    </div>
                </div>
                <div className="flex justify-end gap-3 mt-4">
                    <button onClick={resetFilters} className="px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-md hover:bg-gray-700">Reset</button>
                    <button onClick={applyFilters} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700">Terapkan</button>
                </div>
            </div>

            {/* Grid Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h3 className="font-semibold text-lg text-gray-800">Jumlah Order by Kategori</h3>
                    <div className="h-80"><OrdersByCategoryChart data={ordersByCategory} /></div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h3 className="font-semibold text-lg text-gray-800">Estimasi Revenue by Kategori (Juta)</h3>
                    <div className="h-80"><RevenueByCategoryChart data={revenueByCategory} /></div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h3 className="font-semibold text-lg text-gray-800">Distribusi Order by Witel</h3>
                    <div className="h-80"><WitelBarChart data={witelDistribution} /></div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h3 className="font-semibold text-lg text-gray-800">Distribusi Order by Segmen</h3>
                    <div className="h-80"><WitelPieChart data={segmenDistribution} /></div>
                </div>
            </div>

            {/* Tabel Data Preview */}
            <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
                    <h3 className="font-semibold text-lg text-gray-800">Data Preview</h3>
                    
                    <div className="flex items-center gap-2">
                        {/* INPUT SEARCH */}
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Cari Nama/ID/Produk..."
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
                            <select id="limit-filter" value={filters.limit || '10'} onChange={e => handleLimitChange(e.target.value)} className="border border-gray-300 rounded-md text-sm p-2">
                                <option value="10">10</option>
                                <option value="50">50</option>
                                <option value="100">100</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto pb-4">
                    <table className="w-full text-sm text-left text-gray-500 whitespace-nowrap">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                            <tr>
                                <th className="px-6 py-3">Order ID</th>
                                <th className="px-6 py-3">Order Date</th>
                                <th className="px-6 py-3">NIPNAS</th>
                                <th className="px-6 py-3">Standard Name (PO)</th>
                                <th className="px-6 py-3">Produk</th>
                                <th className="px-6 py-3">Revenue</th>
                                <th className="px-6 py-3">Segmen</th>
                                <th className="px-6 py-3">Sub Segmen</th>
                                <th className="px-6 py-3">Kategori</th>
                                <th className="px-6 py-3">Kategori Umur</th>
                                <th className="px-6 py-3">Umur Order</th>
                                <th className="px-6 py-3">Bill Witel</th>
                                <th className="px-6 py-3">Cust Witel</th>
                                <th className="px-6 py-3">Service Witel</th>
                                <th className="px-6 py-3">Status</th>
                                <th className="px-6 py-3">Milestone</th>
                                <th className="px-6 py-3">Biaya Pasang</th>
                                <th className="px-6 py-3">Harga Bulanan</th>
                                <th className="px-6 py-3">Lama Kontrak (Hari)</th>
                                <th className="px-6 py-3">Bill City</th>
                                <th className="px-6 py-3">Tipe Order</th>
                                <th className="px-6 py-3">Witel Baru</th>
                            </tr>
                        </thead>
                        <tbody>
                            {dataPreview?.data?.length > 0 ? (
                                dataPreview.data.map((item) => (
                                    <tr key={item.id} className="bg-white border-b hover:bg-gray-50">
                                        <td className="px-6 py-4 font-mono font-bold text-blue-600">{item.order_id}</td>
                                        <td className="px-6 py-4">{formatDate(item.order_created_date)}</td>
                                        <td className="px-6 py-4 font-mono">{item.nipnas}</td>
                                        <td className="px-6 py-4 font-medium text-gray-900">{item.standard_name}</td>
                                        <td className="px-6 py-4">{item.li_product_name}</td>
                                        <td className="px-6 py-4 font-semibold text-green-600">{formatRupiah(item.revenue)}</td>
                                        <td className="px-6 py-4">{item.segmen}</td>
                                        <td className="px-6 py-4">{item.sub_segmen}</td>
                                        <td className="px-6 py-4">{item.kategori}</td>
                                        <td className="px-6 py-4">{item.kategori_umur}</td>
                                        <td className="px-6 py-4 text-center">{item.umur_order}</td>
                                        <td className="px-6 py-4">{item.bill_witel}</td>
                                        <td className="px-6 py-4">{item.cust_witel}</td>
                                        <td className="px-6 py-4">{item.service_witel}</td>
                                        <td className="px-6 py-4">{item.li_status}</td>
                                        <td className="px-6 py-4">{item.li_milestone}</td>
                                        <td className="px-6 py-4">{formatRupiah(item.biaya_pasang)}</td>
                                        <td className="px-6 py-4">{formatRupiah(item.hrg_bulanan)}</td>
                                        <td className="px-6 py-4 text-center">{item.lama_kontrak_hari}</td>
                                        <td className="px-6 py-4">{item.bill_city}</td>
                                        <td className="px-6 py-4">{item.tipe_order}</td>
                                        <td className="px-6 py-4">{item.witel_baru}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr><td colSpan="22" className="text-center py-8 text-gray-500">Tidak ada data yang cocok dengan filter yang dipilih.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Links */}
                {dataPreview?.links?.length > 0 && dataPreview.total > 0 && (
                    <div className="mt-4 flex flex-col sm:flex-row justify-between items-center text-sm text-gray-600 gap-4">
                        <span>Menampilkan {dataPreview.from} sampai {dataPreview.to} dari {dataPreview.total} hasil</span>
                        <Pagination links={dataPreview.links} />
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
            user={auth.user}
            header={<h2 className="font-semibold text-xl text-gray-800 leading-tight">Dashboard SOS Datin</h2>}
        >
            <Head title="Dashboard SOS Datin" />
            <div className="py-8">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8 space-y-6">
                    {DashboardContent}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}