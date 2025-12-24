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
    branchMap // <--- DATA PENTING DARI BACKEND (Supaya nama branch cocok)
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
    
    const mapStatusOptions = ['Completed', 'Open', 'Cancel'];

    // --- LOGIC: OPSI BRANCH DINAMIS (MENGGUNAKAN DATA REAL DATABASE) ---
    const branchOptions = useMemo(() => {
        // Jika branchMap dari backend belum siap, return array kosong
        if (!branchMap) return [];

        if (selectedWitels.length === 0) {
            // Jika tidak ada witel dipilih, tampilkan SEMUA branch yang ada di map
            return Object.values(branchMap).flat();
        }
        // Jika witel dipilih, ambil hanya branch milik witel tersebut
        return selectedWitels.flatMap(witel => branchMap[witel] || []);
    }, [selectedWitels, branchMap]);

    // --- EFFECT: BERSIHKAN BRANCH INVALID ---
    // Jika user ganti witel, hapus branch terpilih yang tidak ada di witel baru
    useEffect(() => {
        if (selectedWitels.length > 0) {
            setSelectedBranches(prev => prev.filter(branch => branchOptions.includes(branch)));
        }
    }, [selectedWitels, branchOptions]);


    const formatDate = (date) => {
        if (!date) return '';
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    // Filter Utama (Tombol Terapkan di Atas)
    const applyFilter = () => {
        const query = {};
        if (startDate && endDate) {
            query.start_date = formatDate(startDate);
            query.end_date = formatDate(endDate);
        }
        if (selectedWitels.length > 0) {
            query.global_witel = selectedWitels;
        }
        if (selectedBranches.length > 0) {
            query.global_branch = selectedBranches;
        }
        // Jangan lupa sertakan filter map yang sedang aktif
        if (selectedMapStatus.length > 0) {
            query.map_status = selectedMapStatus;
        }

        router.get(route('dashboard.hsi'), query, { preserveState: true, preserveScroll: true });
    };

    // Filter Khusus Map (Tombol Kecil di Peta)
    const applyMapFilter = () => {
        const query = {};
        if (startDate && endDate) {
            query.start_date = formatDate(startDate);
            query.end_date = formatDate(endDate);
        }
        if (selectedWitels.length > 0) {
            query.global_witel = selectedWitels;
        }
        if (selectedBranches.length > 0) {
            query.global_branch = selectedBranches;
        }
        if (selectedMapStatus.length > 0) {
            query.map_status = selectedMapStatus;
        }

        router.get(route('dashboard.hsi'), query, { preserveState: true, preserveScroll: true, replace: true });
    };

    const resetFilter = () => {
        setDateRange([null, null]);
        setSelectedWitels([]);
        setSelectedBranches([]);
        setSelectedMapStatus([]);
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
                            {/* 1. Date */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Periode Data</label>
                                <div className="relative z-40">
                                    <DatePicker
                                        selectsRange={true}
                                        startDate={startDate}
                                        endDate={endDate}
                                        onChange={(update) => setDateRange(update)}
                                        isClearable={true}
                                        placeholderText="Pilih Rentang"
                                        className="w-full border-gray-300 rounded-md text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2.5"
                                        dateFormat="dd/MM/yyyy"
                                    />
                                </div>
                            </div>

                            {/* 2. Witel (Parent) */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Filter Witel</label>
                                <MultiSelectDropdown 
                                    options={witels} 
                                    selected={selectedWitels} 
                                    onChange={setSelectedWitels} 
                                    placeholder="Semua Witel"
                                />
                            </div>

                            {/* 3. Branch (Child - Dinamis dari DB) */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Filter Branch (Distrik)</label>
                                <MultiSelectDropdown 
                                    options={branchOptions} 
                                    selected={selectedBranches} 
                                    onChange={setSelectedBranches} 
                                    placeholder="Semua Branch"
                                />
                            </div>

                            {/* 4. Action Buttons */}
                            <div className="flex gap-2">
                                <button onClick={applyFilter} className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold py-2.5 px-4 rounded shadow transition w-full">Terapkan</button>
                                {(filters.start_date || (filters.global_witel && filters.global_witel.length > 0) || (filters.global_branch && filters.global_branch.length > 0)) && (
                                    <button onClick={resetFilter} className="bg-white border border-gray-300 text-gray-700 text-sm font-bold py-2.5 px-4 rounded shadow transition hover:bg-gray-50">Reset</button>
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
                            <div className="flex justify-between items-center border-b pb-2 mb-4">
                                <h3 className="text-md font-bold text-gray-700">Komposisi Status</h3>
                            </div>
                            <div className="h-80 flex justify-center items-center">
                                {hasData(chart2) ? <HsiPieChart data={chart2} title="Status" /> : <div className="text-gray-400">No Data</div>}
                            </div>
                        </div>
                        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                             <div className="flex justify-between items-center border-b pb-2 mb-4">
                                <h3 className="text-md font-bold text-gray-700">Tren Jenis Layanan</h3>
                            </div>
                            <div className="h-80">
                                {hasData(chart3) ? <AmountBySubTypeChart data={chart3} /> : <div className="text-gray-400">No Data</div>}
                            </div>
                        </div>
                    </div>

                    {/* SECTION 6: PETA SEBARAN */}
                    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mt-6 mb-10 relative">
                        <div className="flex flex-col md:flex-row justify-between items-center border-b pb-4 mb-4">
                            <h3 className="text-md font-bold text-gray-700">Peta Sebaran Order HSI</h3>
                            
                            {/* Filter Map Controls */}
                            <div className="flex gap-2 items-center mt-2 md:mt-0 relative z-[1002]">
                                <div className="w-48">
                                    <MultiSelectDropdown 
                                        options={mapStatusOptions} 
                                        selected={selectedMapStatus} 
                                        onChange={setSelectedMapStatus} 
                                        placeholder="Semua Status"
                                        isMapControl={true}
                                    />
                                </div>
                                <button 
                                    onClick={applyMapFilter} 
                                    className="bg-gray-800 hover:bg-gray-700 text-white text-xs font-bold py-2.5 px-4 rounded shadow transition"
                                >
                                    Filter Map
                                </button>
                            </div>
                        </div>

                        {/* MAP CONTAINER */}
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

                </div>
            </div>
        </AuthenticatedLayout>
    );
}