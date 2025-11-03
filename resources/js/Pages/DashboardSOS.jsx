import React, { useState, useMemo, useEffect } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, Link } from '@inertiajs/react'; // <-- Import Link
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import DropdownCheckbox from '@/Components/DropdownCheckbox';
import { Bar, Pie } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

// ===================================================================
// Komponen Chart Spesifik untuk Dashboard SOS (Tidak Berubah)
// ===================================================================
const OrdersByCategoryChart = ({ data = [] }) => {
    const chartData = useMemo(() => {
        const labels = [...new Set(data.map(item => item.kategori))].sort();
        return {
            labels,
            datasets: [
                {
                    label: '< 3 BLN',
                    data: labels.map(label => data.find(item => item.kategori === label)?.lt_3bln_total || 0),
                    backgroundColor: 'rgba(59, 130, 246, 0.7)', // Biru
                    borderColor: 'rgba(59, 130, 246, 1)',
                    borderWidth: 1,
                },
                {
                    label: '> 3 BLN',
                    data: labels.map(label => data.find(item => item.kategori === label)?.gt_3bln_total || 0),
                    backgroundColor: 'rgba(239, 68, 68, 0.7)', // Merah
                    borderColor: 'rgba(239, 68, 68, 1)',
                    borderWidth: 1,
                }
            ],
        };
    }, [data]);

    const options = { responsive: true, maintainAspectRatio: false, scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true } } };
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
                    backgroundColor: 'rgba(59, 130, 246, 0.7)', // Biru
                },
                {
                    label: '> 3 BLN (Juta)',
                    data: labels.map(label => data.find(item => item.kategori === label)?.gt_3bln_revenue || 0),
                    backgroundColor: 'rgba(239, 68, 68, 0.7)', // Merah
                }
            ],
        };
    }, [data]);

    const options = { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } };
    return <Bar options={options} data={chartData} />;
};

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
            }],
        };
    }, [data]);
    const options = { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' } } };
    return <Pie options={options} data={chartData} />;
};

// [BARU] Komponen Pagination (Meniru DashboardDigitalProduct)
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


// ===================================================================
// Komponen Utama Halaman
// ===================================================================

export default function DashboardSOS({
    auth,
    ordersByCategory,
    revenueByCategory,
    witelDistribution,
    segmenDistribution,
    dataPreview, // <-- [BARU] Terima prop dataPreview
    filters = {},
    filterOptions = {},
}) {
    const witelOptions = useMemo(() => filterOptions.witelList || [], [filterOptions.witelList]);
    const segmenOptions = useMemo(() => filterOptions.segmenList || [], [filterOptions.segmenList]);
    const kategoriOptions = useMemo(() => filterOptions.kategoriList || [], [filterOptions.kategoriList]);
    const umurOptions = useMemo(() => filterOptions.umurList || [], [filterOptions.umurList]);

    const [localFilters, setLocalFilters] = useState({});

    useEffect(() => {
        setLocalFilters({
            witels: filters.witels && Array.isArray(filters.witels) ? filters.witels : witelOptions,
            segmens: filters.segmens && Array.isArray(filters.segmens) ? filters.segmens : segmenOptions,
            kategoris: filters.kategoris && Array.isArray(filters.kategoris) ? filters.kategoris : kategoriOptions,
            umurs: filters.umurs && Array.isArray(filters.umurs) ? filters.umurs : umurOptions,
            startDate: filters.startDate ? new Date(`${filters.startDate}T00:00:00`) : null,
            endDate: filters.endDate ? new Date(`${filters.endDate}T00:00:00`) : null,
        });
    }, [filters, witelOptions, segmenOptions, kategoriOptions, umurOptions]);

    const formatDateForQuery = (date) => {
        if (!date) return undefined;
        return date.toISOString().split('T')[0];
    };

    const applyFilters = () => {
        const queryParams = {
            witels: localFilters.witels.length > 0 && localFilters.witels.length < witelOptions.length ? localFilters.witels : undefined,
            segmens: localFilters.segmens.length > 0 && localFilters.segmens.length < segmenOptions.length ? localFilters.segmens : undefined,
            kategoris: localFilters.kategoris.length > 0 && localFilters.kategoris.length < kategoriOptions.length ? localFilters.kategoris : undefined,
            umurs: localFilters.umurs.length > 0 && localFilters.umurs.length < umurOptions.length ? localFilters.umurs : undefined,
            startDate: formatDateForQuery(localFilters.startDate),
            endDate: formatDateForQuery(localFilters.endDate),
        };
        router.get(route('dashboard.sos'), queryParams, { replace: true, preserveState: true, preserveScroll: true });
    };

    const resetFilters = () => {
        router.get(route('dashboard.sos'), {}, { preserveScroll: true });
    };

    // [BARU] Fungsi untuk mengubah limit paginasi
    const handleLimitChange = (value) => {
        const queryParams = { ...filters, limit: value };
        delete queryParams.page; // Reset ke halaman 1
        router.get(route('dashboard.sos'), queryParams, { preserveScroll: true, replace: true });
    }

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={<h2 className="font-semibold text-xl text-gray-800 leading-tight">Dashboard SOS Datin</h2>}
        >
            <Head title="Dashboard SOS Datin" />

            <div className="py-8">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8 space-y-6">

                    {/* Panel Filter Global */}
                    <div className="bg-white p-4 rounded-lg shadow-md">
                        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 items-end">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Rentang Tanggal</label>
                                <DatePicker selectsRange startDate={localFilters.startDate} endDate={localFilters.endDate} onChange={(update) => setLocalFilters(prev => ({ ...prev, startDate: update[0], endDate: update[1] }))} isClearable={true} dateFormat="dd/MM/yyyy" className="w-full border-gray-300 rounded-md shadow-sm" />
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
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                            <div className="h-80"><WitelPieChart data={witelDistribution} /></div>
                        </div>
                        <div className="bg-white p-6 rounded-lg shadow-md">
                            <h3 className="font-semibold text-lg text-gray-800">Distribusi Order by Segmen</h3>
                            <div className="h-80"><WitelPieChart data={segmenDistribution} /></div> {/* Re-use WitelPieChart component */}
                        </div>
                    </div>

                    {/* [PERBAIKAN] Tabel Data Preview */}
                    <div className="bg-white p-6 rounded-lg shadow-md mt-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-semibold text-lg text-gray-800">Data Preview</h3>
                            <div>
                                <label htmlFor="limit-filter" className="text-sm font-semibold text-gray-600 mr-2">Tampilkan:</label>
                                <select id="limit-filter" value={filters.limit || '10'} onChange={e => handleLimitChange(e.target.value)} className="border border-gray-300 rounded-md text-sm p-2">
                                    <option value="10">10 Baris</option>
                                    <option value="50">50 Baris</option>
                                    <option value="100">100 Baris</option>
                                </select>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left text-gray-500">
                                <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                                    <tr>
                                        <th scope="col" className="px-4 py-3">Order ID</th>
                                        <th scope="col" className="px-4 py-3">NIPNAS</th>
                                        <th scope="col" className="px-4 py-3">Standard Name (PO)</th>
                                        <th scope="col" className="px-4 py-3">Produk</th>
                                        <th scope="col" className="px-4 py-3">Segmen</th> {/* <-- Diubah dari Revenue */}
                                        <th scope="col" className="px-4 py-3">Witel</th> {/* <-- Kolom Baru */}
                                        <th scope="col" className="px-4 py-3">Kategori</th>
                                        <th scope="col" className="px-4 py-3">Status</th>
                                        <th scope="col" className="px-4 py-3">Umur</th>
                                        <th scope="col" className="px-4 py-3">Tgl Order</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {dataPreview?.data?.length > 0 ? (
                                        dataPreview.data.map((item) => (
                                            <tr key={item.id} className="bg-white border-b hover:bg-gray-50">
                                                <td className="px-4 py-4 font-mono">{item.order_id}</td>
                                                <td className="px-4 py-4">{item.nipnas}</td>
                                                <td className="px-4 py-4 font-medium text-gray-900">{item.standard_name}</td>
                                                <td className="px-4 py-4">{item.li_product_name}</td>
                                                <td className="px-4 py-4">{item.segmen}</td> {/* <-- Diubah dari Revenue */}
                                                <td className="px-4 py-4">{item.bill_witel}</td> {/* <-- Kolom Baru */}
                                                <td className="px-4 py-4">{item.kategori}</td>
                                                <td className="px-4 py-4">{item.li_status}</td>
                                                <td className="px-4 py-4">{item.kategori_umur}</td>
                                                <td className="px-4 py-4">{item.order_created_date ? new Date(item.order_created_date).toLocaleDateString('id-ID') : '-'}</td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr><td colSpan="10" className="text-center py-4 text-gray-500">Tidak ada data yang cocok dengan filter yang dipilih.</td></tr>
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
                </div>
            </div>
        </AuthenticatedLayout>
    );
}

