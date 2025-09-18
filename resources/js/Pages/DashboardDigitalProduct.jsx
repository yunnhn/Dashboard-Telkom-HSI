import React from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, Link } from '@inertiajs/react';
import StatsCard from '@/Components/StatsCard';
import { FaDollarSign, FaShoppingCart, FaChartPie, FaChartLine, FaUsers } from 'react-icons/fa';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import RevenueBySubTypeChart from '@/Components/RevenueBySubTypeChart';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler);

// Komponen Badge Status
const StatusBadge = ({ text, color }) => (
    <span className={`px-2 py-1 text-xs font-semibold leading-tight rounded-full ${color}`}>
        {text}
    </span>
);

// [PERBAIKAN] Menambahkan nilai default `{}` untuk prop 'filters'
export default function DashboardDigitalProduct({ auth, revenueBySubTypeData, dataPreview, filters = {} }) {

    const generatePeriodOptions = () => {
        const options = [];
        let date = new Date();
        for (let i = 0; i < 24; i++) {
            const year = date.getFullYear();
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const value = `${year}-${month}`;
            const label = date.toLocaleString('id-ID', { month: 'long', year: 'numeric' });
            options.push(<option key={value} value={value}>{label}</option>);
            date.setMonth(date.getMonth() - 1);
        }
        return options;
    };

    // Fungsi untuk menangani perubahan filter
    function handleFilterChange(key, value) {
        router.get(route('dashboardDigitalProduct'), {
            ...filters,
            [key]: value,
        }, {
            replace: true,
            preserveScroll: true,
        });
    }

    return (
        <AuthenticatedLayout
            header="Dashboard Digital Product"
        >
            <Head title="Dashboard Digital Product" />

            <div className="bg-white p-4 rounded-lg shadow-md mb-6">
                <div className="flex items-center gap-4">
                    <label htmlFor="period-filter" className="font-semibold text-gray-700">Pilih Periode:</label>
                    <select
                        id="period-filter"
                        // [PERBAIKAN] Menambahkan fallback `|| ''` untuk mencegah error jika 'period' belum ada
                        value={filters.period || ''}
                        onChange={e => handleFilterChange('period', e.target.value)}
                        className="border border-gray-300 rounded-md text-sm p-2"
                    >
                        {generatePeriodOptions()}
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6 mb-6">
                <StatsCard title="Revenue By Product" value="$250M" icon={<FaDollarSign color="white" />} color="bg-green-500" />
                <StatsCard title="Amount by Product" value="$350M" icon={<FaShoppingCart color="white" />} color="bg-blue-500" />
                <StatsCard title="Value Pie Chart" value="13B" icon={<FaChartPie color="white" />} color="bg-red-500" />
                <StatsCard title="Segment Chart" value="520" icon={<FaChartLine color="white" />} color="bg-purple-500" />
                <StatsCard title="Segment by Product" value="154" icon={<FaUsers color="white" />} color="bg-indigo-500" />
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md mt-6">
                <h3 className="font-semibold text-lg text-gray-800 mb-4">Revenue by Sub-type</h3>
                <RevenueBySubTypeChart data={revenueBySubTypeData} />
            </div>

            {/* Bagian Tabel Data Preview */}
            <div className="bg-white p-6 rounded-lg shadow-md mt-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold text-lg text-gray-800">Data Preview</h3>
                    <div>
                        <label htmlFor="limit-filter" className="text-sm font-semibold text-gray-600 mr-2">Tampilkan:</label>
                        <select
                            id="limit-filter"
                            value={filters.limit || '20'}
                            onChange={e => handleFilterChange('limit', e.target.value)}
                            className="border border-gray-300 rounded-md text-sm p-2"
                        >
                            <option value="20">20 Baris</option>
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
                                <th scope="col" className="px-6 py-3">Order ID</th>
                                <th scope="col" className="px-6 py-3">Product</th>
                                <th scope="col" className="px-6 py-3">Milestone</th>
                                <th scope="col" className="px-6 py-3">Witel</th>
                                <th scope="col" className="px-6 py-3">Status</th>
                                <th scope="col" className="px-6 py-3">Created Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            {/* [PERBAIKAN] Menambahkan pengecekan `dataPreview` sebelum mapping */}
                            {dataPreview && dataPreview.data && dataPreview.data.map((item) => (
                                <tr key={item.order_id} className="bg-white border-b hover:bg-gray-50">
                                    <td className="px-6 py-4 font-mono">{item.order_id}</td>
                                    <td className="px-6 py-4 font-medium text-gray-900">{item.product}</td>
                                    <td className="px-6 py-4 max-w-xs truncate">{item.milestone}</td>
                                    <td className="px-6 py-4">{item.nama_witel}</td>
                                    <td className="px-6 py-4">
                                        <StatusBadge
                                            text={item.status_wfm?.toUpperCase()}
                                            color={item.status_wfm === 'in progress' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}
                                        />
                                    </td>
                                    <td className="px-6 py-4">{new Date(item.order_created_date).toLocaleString('id-ID')}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {/* [PERBAIKAN] Menambahkan pengecekan `dataPreview` sebelum mapping */}
                {dataPreview && dataPreview.links && (
                    <div className="mt-4 flex justify-between items-center text-sm text-gray-600">
                        <span>
                            Menampilkan {dataPreview.from} sampai {dataPreview.to} dari {dataPreview.total} hasil
                        </span>
                        <div className="flex items-center">
                            {dataPreview.links.map((link, index) => (
                                <Link
                                    key={index}
                                    href={link.url || '#'}
                                    className={`px-3 py-1 border rounded-md mx-1 transition ${link.active ? 'bg-blue-600 text-white' : 'bg-white hover:bg-gray-100'} ${!link.url ? 'text-gray-400 cursor-not-allowed' : ''}`}
                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                    as="button"
                                    disabled={!link.url}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </AuthenticatedLayout>
    );
}

