import React, { useState, useRef, useEffect, useMemo } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import HsiPieChart from '@/Components/HsiPieChart';
import AmountBySubTypeChart from '@/Components/AmountBySubTypeChartHSI';
import StackedBarChart from '@/Components/StackedBarChart';
import HsiMap from '@/Components/HsiMap';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

// --- KOMPONEN DROPDOWN (Reusable) ---
const MultiSelectDropdown = ({ options, selected, onChange, placeholder, isMapControl = false }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const toggleOption = (value) => {
        const newSelected = selected.includes(value)
            ? selected.filter((item) => item !== value)
            : [...selected, value];
        onChange(newSelected);
    };

    return (
        <div className="relative w-full" ref={dropdownRef}>
            <div 
                className="w-full border border-gray-300 rounded-md p-2 bg-white cursor-pointer flex justify-between items-center text-sm shadow-sm"
                onClick={() => setIsOpen(!isOpen)}
            >
                <span className="truncate text-gray-700 select-none">
                    {selected.length > 0 ? `${selected.length} Dipilih` : placeholder}
                </span>
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </div>
            
            {isOpen && (
                <div className={`absolute left-0 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto ${isMapControl ? 'z-[1001]' : 'z-50'}`}>
                    {options.map((option) => (
                        <div 
                            key={option} 
                            className="flex items-center p-2 hover:bg-gray-100 cursor-pointer"
                            onClick={() => toggleOption(option)}
                        >
                            <input 
                                type="checkbox" 
                                checked={selected.includes(option)} 
                                readOnly 
                                className="mr-2 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 pointer-events-none"
                            />
                            <span className="text-sm text-gray-700 select-none">{option}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default function DashboardHSI({ 
    auth, stats, mapData, 
    chart1, chart2, chart3, chart4, 
    chart5Data, chart5Keys, chart6Data, chart6Keys, 
    witels, filters, dimensionLabel,
    branchMap,
    tableData // <--- TERIMA DATA TABEL
}) {

    const [dateRange, setDateRange] = useState([
        filters.start_date ? new Date(filters.start_date) : null, 
        filters.end_date ? new Date(filters.end_date) : null
    ]);
    const [startDate, endDate] = dateRange;
    
    // State Filter
    const [selectedWitels, setSelectedWitels] = useState(Array.isArray(filters.global_witel) ? filters.global_witel : []);
    const [selectedBranches, setSelectedBranches] = useState(Array.isArray(filters.global_branch) ? filters.global_branch : []);
    const [selectedMapStatus, setSelectedMapStatus] = useState(Array.isArray(filters.map_status) ? filters.map_status : []);
    
    // Search State
    const [searchQuery, setSearchQuery] = useState(filters.search || '');

    const mapStatusOptions = ['Completed', 'Open', 'Cancel'];

    const branchOptions = useMemo(() => {
        if (!branchMap) return [];
        if (selectedWitels.length === 0) return Object.values(branchMap).flat();
        return selectedWitels.flatMap(witel => branchMap[witel] || []);
    }, [selectedWitels, branchMap]);

    useEffect(() => {
        if (selectedWitels.length > 0) {
            setSelectedBranches(prev => prev.filter(branch => branchOptions.includes(branch)));
        }
    }, [selectedWitels, branchOptions]);


    const formatDate = (date) => {
        if (!date) return '';
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    };

    const applyFilter = (overrideParams = {}) => {
        const query = {
            search: searchQuery, 
            ...overrideParams
        };

        if (startDate && endDate) {
            query.start_date = formatDate(startDate);
            query.end_date = formatDate(endDate);
        }
        if (selectedWitels.length > 0) query.global_witel = selectedWitels;
        if (selectedBranches.length > 0) query.global_branch = selectedBranches;
        if (selectedMapStatus.length > 0) query.map_status = selectedMapStatus;

        router.get(route('dashboard.hsi'), query, { preserveState: true, preserveScroll: true });
    };

    const applyMapFilter = () => {
        applyFilter();
    };

    const handleSearchEnter = (e) => {
        if (e.key === 'Enter') {
            applyFilter({ search: searchQuery, page: 1 });
        }
    };

    const handlePageChange = (url) => {
        if (url) {
            router.get(url, {}, { preserveState: true, preserveScroll: true });
        }
    };

    const resetFilter = () => {
        setDateRange([null, null]);
        setSelectedWitels([]);
        setSelectedBranches([]);
        setSelectedMapStatus([]);
        setSearchQuery('');
        router.get(route('dashboard.hsi'), {}, { preserveState: true, preserveScroll: true });
    };

    const hasData = (data) => data && data.length > 0;

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={<h2 className="font-semibold text-xl text-gray-800 leading-tight">Dashboard HSI - Overview</h2>}
        >
            <Head title="Dashboard HSI" />

            <div className="py-8">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8 space-y-6">
                    
                    {/* SECTION 1: GLOBAL FILTER */}
                    <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Periode Data</label>
                                <div className="relative z-40">
                                    <DatePicker
                                        selectsRange={true} startDate={startDate} endDate={endDate}
                                        onChange={(update) => setDateRange(update)} isClearable={true}
                                        placeholderText="Pilih Rentang" className="w-full border-gray-300 rounded-md text-sm shadow-sm p-2.5"
                                        dateFormat="dd/MM/yyyy"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Filter Witel</label>
                                <MultiSelectDropdown options={witels} selected={selectedWitels} onChange={setSelectedWitels} placeholder="Semua Witel" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Filter Branch</label>
                                <MultiSelectDropdown options={branchOptions} selected={selectedBranches} onChange={setSelectedBranches} placeholder="Semua Branch" />
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => applyFilter({ page: 1 })} className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold py-2.5 px-4 rounded shadow w-full">Terapkan</button>
                                {(filters.start_date || (filters.global_witel && filters.global_witel.length > 0) || (filters.global_branch && filters.global_branch.length > 0)) && (
                                    <button onClick={resetFilter} className="bg-white border border-gray-300 text-gray-700 text-sm font-bold py-2.5 px-4 rounded shadow">Reset</button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* SECTION 2: STATS CARDS */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-blue-600">
                            <div className="text-gray-500 text-xs font-bold uppercase">Total Order</div>
                            <div className="text-2xl font-bold text-gray-800">{stats.total.toLocaleString()}</div>
                        </div>
                        <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-green-500">
                            <div className="text-green-600 text-xs font-bold uppercase">Completed / PS</div>
                            <div className="text-2xl font-bold text-green-700">{stats.completed.toLocaleString()}</div>
                        </div>
                        <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-yellow-500">
                            <div className="text-yellow-600 text-xs font-bold uppercase">Open / Progress</div>
                            <div className="text-2xl font-bold text-yellow-700">{stats.open.toLocaleString()}</div>
                        </div>
                    </div>

                    {/* CHART ROW 1 */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                            <h3 className="text-md font-bold text-gray-700 mb-4 text-center border-b pb-2">Total Order per {dimensionLabel}</h3>
                            <div className="h-80 flex justify-center items-center">
                                {hasData(chart1) ? <HsiPieChart data={chart1} title={dimensionLabel} /> : <div className="text-gray-400">No Data</div>}
                            </div>
                        </div>
                        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                            <h3 className="text-md font-bold text-gray-700 mb-4 text-center border-b pb-2">Sebaran PS per {dimensionLabel}</h3>
                            <div className="h-80 flex justify-center items-center">
                                {hasData(chart4) ? <HsiPieChart data={chart4} title={dimensionLabel} /> : <div className="text-gray-400">Data PS Kosong</div>}
                            </div>
                        </div>
                    </div>

                    {/* CHART ROW 2 */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                            <div className="h-96"> 
                                {hasData(chart5Data) ? <StackedBarChart data={chart5Data} keys={chart5Keys} title={`CANCEL BY FCC (${dimensionLabel})`} /> : <div className="h-full flex items-center justify-center text-gray-400">Tidak ada data Cancel FCC</div>}
                            </div>
                        </div>
                        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                            <div className="h-96">
                                {hasData(chart6Data) ? <StackedBarChart data={chart6Data} keys={chart6Keys} title={`CANCEL NON-FCC (${dimensionLabel})`} /> : <div className="h-full flex items-center justify-center text-gray-400">Tidak ada data Cancel Biasa</div>}
                            </div>
                        </div>
                    </div>

                    {/* CHART ROW 3 */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                            <div className="flex justify-between items-center border-b pb-2 mb-4"><h3 className="text-md font-bold text-gray-700">Komposisi Status</h3></div>
                            <div className="h-80 flex justify-center items-center">
                                {hasData(chart2) ? <HsiPieChart data={chart2} title="Status" /> : <div className="text-gray-400">No Data</div>}
                            </div>
                        </div>
                        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                             <div className="flex justify-between items-center border-b pb-2 mb-4"><h3 className="text-md font-bold text-gray-700">Tren Jenis Layanan</h3></div>
                            <div className="h-80">
                                {hasData(chart3) ? <AmountBySubTypeChart data={chart3} /> : <div className="text-gray-400">No Data</div>}
                            </div>
                        </div>
                    </div>

                    {/* SECTION 6: PETA SEBARAN */}
                    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mt-6 mb-10 relative">
                        <div className="flex flex-col md:flex-row justify-between items-center border-b pb-4 mb-4">
                            <h3 className="text-md font-bold text-gray-700">Peta Sebaran Order HSI</h3>
                            <div className="flex gap-2 items-center mt-2 md:mt-0 relative z-[1002]">
                                <div className="w-48">
                                    <MultiSelectDropdown options={mapStatusOptions} selected={selectedMapStatus} onChange={setSelectedMapStatus} placeholder="Semua Status" isMapControl={true} />
                                </div>
                                <button onClick={applyMapFilter} className="bg-gray-800 hover:bg-gray-700 text-white text-xs font-bold py-2.5 px-4 rounded shadow transition">Filter Map</button>
                            </div>
                        </div>
                        <div className="h-96 w-full z-0 relative">
                            {mapData && mapData.length > 0 ? (
                                <HsiMap data={mapData} />
                            ) : (
                                <div className="h-full flex items-center justify-center text-gray-400 bg-gray-50 rounded border border-dashed border-gray-300">
                                    <p className="text-center">Data koordinat tidak tersedia dengan filter ini.</p>
                                </div>
                            )}
                        </div>
                        <div className="flex gap-4 mt-2 justify-center text-xs text-gray-600">
                            <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-500 block"></span> Completed (PS)</div>
                            <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-blue-500 block"></span> Open/Proses</div>
                            <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-500 block"></span> Cancel</div>
                        </div>
                    </div>

                    {/* ================================================= */}
                    {/* BAGIAN BARU: DATA PREVIEW TABLE                   */}
                    {/* ================================================= */}
                    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mt-8 mb-10">
                        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                            <h3 className="text-lg font-bold text-gray-800">Data Preview</h3>
                            
                            {/* SEARCH BAR */}
                            <div className="relative w-full md:w-1/3">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                </div>
                                <input
                                    type="text"
                                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                    placeholder="Cari Order ID / Nama / Layanan..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyDown={handleSearchEnter}
                                />
                            </div>
                        </div>

                        {/* TABLE */}
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        {/* HEADER TABLE */}
                                        {['Order ID', 'Order Date', 'Customer Name', 'Witel', 'STO', 'Layanan', 'Status Group', 'Detail Status'].map((head) => (
                                            <th key={head} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                                                {head}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {tableData && tableData.data.length > 0 ? (
                                        tableData.data.map((row, idx) => (
                                            <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">{row.order_id}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.order_date}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">{row.customer_name}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.witel}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.sto}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.type_layanan}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                                        ${row.kelompok_status === 'PS' ? 'bg-green-100 text-green-800' : 
                                                          (row.kelompok_status === 'CANCEL' || row.kelompok_status === 'REJECT_FCC') ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                                        {row.kelompok_status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500 max-w-xs truncate" title={row.status_resume}>
                                                    {row.status_resume}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="8" className="px-6 py-10 text-center text-sm text-gray-500 bg-gray-50">
                                                Tidak ada data ditemukan.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* PAGINATION */}
                        {tableData && tableData.links && (
                            <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 mt-4">
                                <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                                    <div>
                                        <p className="text-sm text-gray-700">
                                            Showing <span className="font-medium">{tableData.from}</span> to <span className="font-medium">{tableData.to}</span> of <span className="font-medium">{tableData.total}</span> results
                                        </p>
                                    </div>
                                    <div>
                                        <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                                            {tableData.links.map((link, i) => (
                                                <button
                                                    key={i}
                                                    onClick={() => handlePageChange(link.url)}
                                                    disabled={!link.url || link.active}
                                                    className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold focus:z-20 
                                                        ${link.active ? 'z-10 bg-blue-600 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600' : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:outline-offset-0'}
                                                        ${!link.url ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                                                        ${i === 0 ? 'rounded-l-md' : ''}
                                                        ${i === tableData.links.length - 1 ? 'rounded-r-md' : ''}
                                                    `}
                                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                                />
                                            ))}
                                        </nav>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </AuthenticatedLayout>
    );
}