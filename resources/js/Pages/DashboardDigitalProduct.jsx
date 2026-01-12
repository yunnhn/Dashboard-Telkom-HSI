import React, { useState, useMemo, useEffect } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, Link } from '@inertiajs/react';

// --- IMPORT CHART COMPONENTS ---
import RevenueByWitelChart from '@/Components/RevenueByWitelChart';
import AmountByWitelChart from '@/Components/AmountByWitelChart';
import SessionSubTypeChart from '@/Components/SessionSubTypeChart';
import ProductRadarChart from '@/Components/ProductRadarChart';
import WitelPieChart from '@/Components/WitelPieChart';

// --- UTILS ---
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler, RadialLinearScale } from 'chart.js';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import DropdownCheckbox from '@/Components/DropdownCheckbox';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler, RadialLinearScale);

const StatusBadge = ({ text, color }) => (
    <span className={`px-2 py-1 text-xs font-semibold leading-tight rounded-full ${color}`}>
        {text}
    </span>
);

const formatRupiah = (number) => {
    if (number === null || number === undefined) return '-';
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(number);
};

const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('id-ID', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
};

export default function DashboardDigitalProduct({
    auth,
    revenueByWitelData,
    amountByWitelData,
    dataPreview,
    productBySegmentData,
    productByChannelData,
    productPieData,
    filters = {},
    filterOptions = {},
    isEmbed = false
}) {
    // --- KONSTANTA ---
    const NULL_BRANCH_LABEL = "Non-Telda (NCX)";

    // --- 1. SETUP OPTIONS ---
    const productOptions = useMemo(() => filterOptions.products || [], [filterOptions.products]);
    const witelOptions = useMemo(() => filterOptions.witelList || [], [filterOptions.witelList]);
    const subTypeOptions = useMemo(() => filterOptions.subTypes || [], [filterOptions.subTypes]);
    const branchOptions = useMemo(() => filterOptions.branchList || [], [filterOptions.branchList]);

    // Mapping format: [{ nama_witel: "SURAMADU", telda: "BANGKALAN" }, { nama_witel: "SURAMADU", telda: "Non-Telda (NCX)" }]
    const witelBranchMap = useMemo(() => filterOptions.witelBranchMap || [], [filterOptions.witelBranchMap]);

    // --- 2. LOCAL STATE ---
    const [localFilters, setLocalFilters] = useState({
        products: [], witels: [], subTypes: [], branches: [],
        startDate: null, endDate: null,
        search: '',
    });

    // --- 3. DYNAMIC BRANCH LOGIC ---
    // Menghitung opsi branch yang tersedia berdasarkan Witel yang dipilih
    const dynamicBranchOptions = useMemo(() => {
        // Jika tidak ada witel dipilih, tampilkan semua opsi (termasuk NCX jika ada di master)
        if (!localFilters.witels || localFilters.witels.length === 0) {
            return branchOptions;
        }

        // Ambil branch yang sesuai dengan Witel terpilih dari mapping
        const validBranches = witelBranchMap
            .filter(item => localFilters.witels.includes(item.nama_witel))
            .map(item => item.telda);

        // Unique & Sort
        return [...new Set(validBranches)].sort();
    }, [localFilters.witels, branchOptions, witelBranchMap]);

    // --- 4. AUTO-SELECT NULL/NCX LOGIC ---
    useEffect(() => {
        // Jika opsi dynamic sudah tersedia
        if (dynamicBranchOptions.length > 0) {

            // A. Simpan pilihan user saat ini yang masih VALID (ada di opsi baru)
            const currentValidSelection = localFilters.branches.filter(b => dynamicBranchOptions.includes(b));

            // B. Cek apakah opsi "Non-Telda (NCX)" tersedia di opsi saat ini?
            const isNullOptionAvailable = dynamicBranchOptions.includes(NULL_BRANCH_LABEL);

            // C. Buat array seleksi baru
            let newSelection = [...currentValidSelection];

            // D. Jika opsi NCX tersedia dan belum dipilih, TAMBAHKAN (Auto-Check)
            if (isNullOptionAvailable && !newSelection.includes(NULL_BRANCH_LABEL)) {
                newSelection.push(NULL_BRANCH_LABEL);
            }

            // E. Update State hanya jika ada perubahan isi array
            const isChanged =
                newSelection.length !== localFilters.branches.length ||
                !newSelection.every(b => localFilters.branches.includes(b));

            if (isChanged) {
                setLocalFilters(prev => ({ ...prev, branches: newSelection }));
            }
        }
    }, [dynamicBranchOptions]); // Jalankan setiap kali opsi branch berubah (krn ganti witel)

    // --- 5. INIT FILTERS ---
    useEffect(() => {
        setLocalFilters({
            products: filters.products && Array.isArray(filters.products) ? filters.products : productOptions,
            witels: filters.witels && Array.isArray(filters.witels) ? filters.witels : witelOptions,
            subTypes: filters.subTypes && Array.isArray(filters.subTypes) ? filters.subTypes : subTypeOptions,
            branches: filters.branches && Array.isArray(filters.branches) ? filters.branches : branchOptions,
            startDate: filters.startDate ? new Date(`${filters.startDate}T00:00:00`) : null,
            endDate: filters.endDate ? new Date(`${filters.endDate}T00:00:00`) : null,
            search: filters.search || '',
        });
    }, [filters, productOptions, witelOptions, subTypeOptions, branchOptions]);

    // --- 6. HANDLERS ---
    const formatDateForQuery = (date) => {
        if (!date) return undefined;
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const applyFilters = () => {
        const queryParams = {
            products: localFilters.products.length > 0 && localFilters.products.length < productOptions.length ? localFilters.products : undefined,
            witels: localFilters.witels.length > 0 && localFilters.witels.length < witelOptions.length ? localFilters.witels : undefined,
            subTypes: localFilters.subTypes.length > 0 && localFilters.subTypes.length < subTypeOptions.length ? localFilters.subTypes : undefined,
            branches: localFilters.branches.length > 0 && localFilters.branches.length < branchOptions.length ? localFilters.branches : undefined,
            startDate: formatDateForQuery(localFilters.startDate),
            endDate: formatDateForQuery(localFilters.endDate),
            search: localFilters.search || undefined,
        };
        const targetRoute = isEmbed ? route('dashboardDigitalProduct.embed') : route('dashboardDigitalProduct');
        router.get(targetRoute, queryParams, { replace: true, preserveState: true, preserveScroll: true });
    };

    const resetFilters = () => {
        const targetRoute = isEmbed ? route('dashboardDigitalProduct.embed') : route('dashboardDigitalProduct');
        router.get(targetRoute, {}, { preserveScroll: true });
    }

    const handleLimitChange = (value) => {
        const targetRoute = isEmbed ? route('dashboardDigitalProduct.embed') : route('dashboardDigitalProduct');
        router.get(targetRoute, { ...filters, limit: value }, { preserveScroll: true, replace: true });
    }

    const handleSearchKeyDown = (e) => {
        if (e.key === 'Enter') applyFilters();
    };

    const DashboardContent = (
        <>
            {/* FILTER PANEL */}
            <div className="bg-white p-4 rounded-lg shadow-md mb-6">
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 items-end">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Rentang Tanggal</label>
                        <DatePicker selectsRange startDate={localFilters.startDate} endDate={localFilters.endDate} onChange={(update) => setLocalFilters(prev => ({ ...prev, startDate: update[0], endDate: update[1] }))} isClearable={true} dateFormat="dd/MM/yyyy" className="w-full border-gray-300 rounded-md shadow-sm" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Produk</label>
                        <DropdownCheckbox title="Pilih Produk" options={productOptions} selectedOptions={localFilters.products} onSelectionChange={s => setLocalFilters(p => ({ ...p, products: s }))} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Witel</label>
                        <DropdownCheckbox title="Pilih Witel" options={witelOptions} selectedOptions={localFilters.witels} onSelectionChange={s => setLocalFilters(p => ({ ...p, witels: s }))} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Sub Type</label>
                        <DropdownCheckbox title="Pilih Sub Type" options={subTypeOptions} selectedOptions={localFilters.subTypes} onSelectionChange={s => setLocalFilters(p => ({ ...p, subTypes: s }))} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Branch (Telda)</label>
                        <DropdownCheckbox
                            title={localFilters.witels.length > 0 ? "Pilih Branch (Filtered)" : "Pilih Branch"}
                            options={dynamicBranchOptions}
                            selectedOptions={localFilters.branches}
                            onSelectionChange={s => setLocalFilters(p => ({ ...p, branches: s }))}
                        />
                    </div>
                </div>
                <div className="flex justify-end gap-3 mt-4">
                    <button onClick={resetFilters} className="px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-md hover:bg-gray-700">Reset Filter</button>
                    <button onClick={applyFilters} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700">Terapkan Filter</button>
                </div>
            </div>

            {/* CHARTS GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-lg shadow-md flex flex-col">
                    <h3 className="font-semibold text-lg text-gray-800">Revenue by Witel</h3>
                    <div className="flex-grow min-h-[300px]"><RevenueByWitelChart data={revenueByWitelData} /></div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-md flex flex-col">
                    <h3 className="font-semibold text-lg text-gray-800">Amount by Witel</h3>
                    <div className="flex-grow min-h-[300px]"><AmountByWitelChart data={amountByWitelData} /></div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h3 className="font-semibold text-lg text-gray-800 mb-4">Product by Segment</h3>
                    <div className="min-h-[350px]"><SessionSubTypeChart data={productBySegmentData} /></div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-md flex flex-col">
                    <h3 className="font-semibold text-lg text-gray-800">Product by Channel</h3>
                    <div className="flex-grow min-h-[300px]"><ProductRadarChart data={productByChannelData} /></div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-md flex flex-col">
                    <h3 className="font-semibold text-lg text-gray-800">Product Share</h3>
                    <div className="flex-grow min-h-[300px]"><WitelPieChart data={productPieData} /></div>
                </div>
            </div>

            {/* TABLE DATA PREVIEW */}
            <div className="bg-white p-6 rounded-lg shadow-md mt-6">
                <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
                    <h3 className="font-semibold text-lg text-gray-800">Data Preview</h3>
                    <div className="flex items-center gap-2">
                        {/* Search Bar */}
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Cari Order ID / Customer..."
                                value={localFilters.search}
                                onChange={e => setLocalFilters(prev => ({...prev, search: e.target.value}))}
                                onKeyDown={handleSearchKeyDown}
                                className="border border-gray-300 rounded-md text-sm pl-3 pr-8 py-2 w-64 focus:ring-blue-500 focus:border-blue-500"
                            />
                            <button onClick={applyFilters} className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-blue-600">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                                </svg>
                            </button>
                        </div>
                        {/* Limit Selector */}
                        <div className="flex items-center">
                            <label htmlFor="limit-filter" className="text-sm font-semibold text-gray-600 mr-2 whitespace-nowrap">Tampilkan:</label>
                            <select id="limit-filter" value={filters.limit || '10'} onChange={e => handleLimitChange(e.target.value)} className="border border-gray-300 rounded-md text-sm p-2">
                                <option value="10">10</option><option value="50">50</option><option value="100">100</option><option value="500">500</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto pb-4">
                <table className="w-full text-sm text-left text-gray-500 whitespace-nowrap">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                        <tr>
                            <th scope="col" className="px-6 py-3">Order ID</th>
                            <th scope="col" className="px-6 py-3">Batch ID</th>
                            <th scope="col" className="px-6 py-3">Product</th>
                            <th scope="col" className="px-6 py-3">Net Price</th>
                            <th scope="col" className="px-6 py-3">Is Template Price</th>
                            <th scope="col" className="px-6 py-3">Processed</th>
                            <th scope="col" className="px-6 py-3">Milestone</th>
                            <th scope="col" className="px-6 py-3">Prev. Milestone</th>
                            <th scope="col" className="px-6 py-3">Segment</th>
                            <th scope="col" className="px-6 py-3">Witel</th>
                            <th scope="col" className="px-6 py-3">Telda (Branch)</th>
                            <th scope="col" className="px-6 py-3">Witel Lama</th>
                            <th scope="col" className="px-6 py-3">Status WFM</th>
                            <th scope="col" className="px-6 py-3">Customer Name</th>
                            <th scope="col" className="px-6 py-3">Channel</th>
                            <th scope="col" className="px-6 py-3">Layanan</th>
                            <th scope="col" className="px-6 py-3">Filter Produk</th>
                            <th scope="col" className="px-6 py-3">Order Status</th>
                            <th scope="col" className="px-6 py-3">Sub Type</th>
                            <th scope="col" className="px-6 py-3">Status N</th>
                            <th scope="col" className="px-6 py-3">Tahun</th>
                            <th scope="col" className="px-6 py-3">Week</th>
                            <th scope="col" className="px-6 py-3">Order Date</th>
                            <th scope="col" className="px-6 py-3">Created Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        {dataPreview?.data?.length > 0 ? (
                            dataPreview.data.map((item) => (
                                <tr key={item.id} className="bg-white border-b hover:bg-gray-50">
                                    <td className="px-6 py-4 font-mono font-bold text-blue-600">{item.order_id}</td>
                                    <td className="px-6 py-4 font-mono text-xs">{item.batch_id}</td>
                                    <td className="px-6 py-4 font-medium text-gray-900">{item.product}</td>
                                    <td className="px-6 py-4">{formatRupiah(item.net_price)}</td>
                                    <td className="px-6 py-4 text-center">{item.is_template_price ? 'Yes' : 'No'}</td>
                                    <td className="px-6 py-4 text-center">{item.products_processed ? 'Yes' : 'No'}</td>
                                    <td className="px-6 py-4">{item.milestone}</td>
                                    <td className="px-6 py-4">{item.previous_milestone}</td>
                                    <td className="px-6 py-4">{item.segment}</td>
                                    <td className="px-6 py-4">{item.nama_witel}</td>
                                    <td className="px-6 py-4 font-semibold text-gray-700">{item.telda}</td>
                                    <td className="px-6 py-4">{item.witel_lama}</td>
                                    <td className="px-6 py-4">
                                        <StatusBadge
                                            text={item.status_wfm?.toUpperCase()}
                                            color={item.status_wfm === 'in progress' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}
                                        />
                                    </td>
                                    <td className="px-6 py-4">{item.customer_name}</td>
                                    <td className="px-6 py-4">{item.channel}</td>
                                    <td className="px-6 py-4 min-w-[200px] whitespace-normal">{item.layanan}</td>
                                    <td className="px-6 py-4">{item.filter_produk}</td>
                                    <td className="px-6 py-4">{item.order_status}</td>
                                    <td className="px-6 py-4">{item.order_sub_type}</td>
                                    <td className="px-6 py-4">{item.order_status_n}</td>
                                    <td className="px-6 py-4">{item.tahun}</td>
                                    <td className="px-6 py-4">{item.week}</td>
                                    <td className="px-6 py-4">{formatDate(item.order_date)}</td>
                                    <td className="px-6 py-4">{formatDate(item.order_created_date)}</td>
                                </tr>
                            ))
                        ) : (
                            <tr><td colSpan="24" className="text-center py-8 text-gray-500">Tidak ada data yang cocok.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

                {dataPreview?.links?.length > 0 && dataPreview.total > 0 && (
                    <div className="mt-4 flex flex-col sm:flex-row justify-between items-center text-sm text-gray-600 gap-4">
                        <span>Menampilkan {dataPreview.from} sampai {dataPreview.to} dari {dataPreview.total} hasil</span>
                        <div className="flex items-center flex-wrap justify-center sm:justify-end">
                            {dataPreview.links.map((link, index) => (
                                <Link key={index} href={link.url || '#'} className={`px-3 py-1 border rounded-md mx-1 transition ${link.active ? 'bg-blue-600 text-white' : 'bg-white hover:bg-gray-100'} ${!link.url ? 'text-gray-400 cursor-not-allowed' : ''}`} dangerouslySetInnerHTML={{ __html: link.label }} as="button" disabled={!link.url} preserveScroll />
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
            user={auth.user}
            header={<h2 className="font-semibold text-xl text-gray-800 leading-tight">Dashboard Digital Product</h2>}
        >
            <Head title="Dashboard Digital Product" />
            <div className="py-8">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">{DashboardContent}</div>
            </div>
        </AuthenticatedLayout>
    );
}