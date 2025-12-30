import React, { useState, useEffect, useMemo, useRef } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

// --- KOMPONEN DROPDOWN REUSABLE ---
const MultiSelectDropdown = ({ options, selected, onChange, placeholder }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setIsOpen(false);
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
            <div className="w-full border border-gray-300 rounded-md p-2 bg-white cursor-pointer flex justify-between items-center text-sm shadow-sm" onClick={() => setIsOpen(!isOpen)}>
                <span className="truncate text-gray-700 select-none">{selected.length > 0 ? `${selected.length} Dipilih` : placeholder}</span>
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </div>
            {isOpen && (
                <div className="absolute left-0 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto z-50">
                    {options.map((option) => (
                        <div key={option} className="flex items-center p-2 hover:bg-gray-100 cursor-pointer" onClick={() => toggleOption(option)}>
                            <input type="checkbox" checked={selected.includes(option)} readOnly className="mr-2 h-4 w-4 text-blue-600 border-gray-300 rounded pointer-events-none" />
                            <span className="text-sm text-gray-700 select-none">{option}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default function FlowProcessHSI({ auth, flowStats, witels, branchMap, filters = {}, detailData, activeCategory }) {
    
    // --- 1. STATE & FILTER LOGIC ---
    const [dateRange, setDateRange] = useState([
        filters.start_date ? new Date(filters.start_date) : null, 
        filters.end_date ? new Date(filters.end_date) : null
    ]);
    const [startDate, endDate] = dateRange;
    
    const [selectedWitels, setSelectedWitels] = useState(Array.isArray(filters.global_witel) ? filters.global_witel : []);
    const [selectedBranches, setSelectedBranches] = useState(Array.isArray(filters.global_branch) ? filters.global_branch : []);

    // --- LOGIC: OPSI BRANCH DINAMIS ---
    const branchOptions = useMemo(() => {
        if (!branchMap) return [];
        if (selectedWitels.length === 0) return Object.values(branchMap).flat();
        return selectedWitels.flatMap(witel => branchMap[witel] || []);
    }, [selectedWitels, branchMap]);

    // Reset branch jika witel berubah
    useEffect(() => {
        if (selectedWitels.length > 0) {
            setSelectedBranches(prev => prev.filter(branch => branchOptions.includes(branch)));
        }
    }, [selectedWitels, branchOptions]);

    // --- UTILS ---
    const formatDate = (date) => {
        if (!date) return '';
        const y = date.getFullYear(); const m = String(date.getMonth() + 1).padStart(2, '0'); const d = String(date.getDate()).padStart(2, '0'); return `${y}-${m}-${d}`;
    };

    // --- ACTIONS ---
    const applyFilter = () => {
        const query = {};
        if (startDate && endDate) { 
            query.start_date = formatDate(startDate); 
            query.end_date = formatDate(endDate); 
        }
        if (selectedWitels.length > 0) query.global_witel = selectedWitels;
        if (selectedBranches.length > 0) query.global_branch = selectedBranches;
        
        // Reset detail jika filter utama berubah, atau pertahankan jika diinginkan
        // query.detail_category = activeCategory; 

        router.get(route('flow.hsi'), query, { preserveState: true, preserveScroll: true });
    };

    const resetFilter = () => {
        setDateRange([null, null]); setSelectedWitels([]); setSelectedBranches([]);
        router.get(route('flow.hsi'), {}, { preserveState: true, preserveScroll: true });
    };

    // --- INTERACTIVE ACTIONS (DETAIL & EXPORT) ---
    const handleCardClick = (categoryName) => {
        const query = {};
        if (startDate && endDate) { 
            query.start_date = formatDate(startDate); 
            query.end_date = formatDate(endDate); 
        }
        if (selectedWitels.length > 0) query.global_witel = selectedWitels;
        if (selectedBranches.length > 0) query.global_branch = selectedBranches;
        
        // Set Kategori Aktif
        query.detail_category = categoryName;

        router.get(route('flow.hsi'), query, { 
            preserveState: true, 
            preserveScroll: true, 
            only: ['detailData', 'activeCategory', 'filters'] 
        });

        // Scroll ke bagian detail setelah data load (opsional, bisa pakai useEffect juga)
        setTimeout(() => {
            document.getElementById('detail-section')?.scrollIntoView({ behavior: 'smooth' });
        }, 500);
    };

    const handleExportDetail = () => {
        if (!activeCategory) return;
        
        const query = { 
            ...filters, 
            export_detail: true, 
            detail_category: activeCategory 
        };
        // Gunakan window.location agar browser mendownload file tanpa refresh SPA
        const url = route('flow.hsi') + '?' + new URLSearchParams(query).toString(); // Pastikan route() menghasilkan base url yang benar
        
        // Jika route('flow.hsi') sudah ada query string, logic ini mungkin perlu disesuaikan.
        // Cara paling aman dengan Inertia/Laravel Ziggy:
        // window.location.href = route('flow.hsi', query); 
        // Tapi kadang Inertia menghandle ini sebagai visit. 
        // Jadi paling aman manual build URL atau pastikan backend handle non-inertia request.
        
        window.location.href = route('flow.hsi', query);
    };

    const handlePageChange = (url) => {
        if(url) {
            router.get(url, {}, { 
                preserveState: true, 
                preserveScroll: true, 
                only: ['detailData'] 
            });
        }
    }

    // --- 2. CALCULATIONS (RASIO) ---
    const psRePercent = flowStats?.ps_re_denominator > 0 
        ? ((flowStats.ps_count / flowStats.ps_re_denominator) * 100).toFixed(2) 
        : 0;
        
    const psPiPercent = flowStats?.ps_pi_denominator > 0 
        ? ((flowStats.ps_count / flowStats.ps_pi_denominator) * 100).toFixed(2) 
        : 0;

    const complyCount = flowStats?.comply_count || 0; 
    const complyDenominator = flowStats?.ps_count || 1; 
    const complyPercent = flowStats?.ps_count > 0 
        ? ((complyCount / complyDenominator) * 100).toFixed(2) 
        : 0;


    // --- 3. SUB-KOMPONEN UI (MODIFIED WITH ONCLICK) ---

    const HeaderStep = ({ title, color = "bg-gray-800", isLast = false, stepNumber }) => (
        <div className="relative flex-1 min-w-[120px]">
             <div className={`${color} text-white font-bold h-12 flex items-center justify-center px-4 md:px-8 text-xs md:text-sm text-center relative z-10 shadow-md transition-all hover:brightness-110`}
                style={{ clipPath: isLast ? 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%, 100% 100%, 0% 100%, 15px 50%)' : 'polygon(0% 0%, calc(100% - 15px) 0%, 100% 50%, calc(100% - 15px) 100%, 0% 100%, 15px 50%)', marginLeft: stepNumber === 0 ? '0' : '-12px', paddingLeft: stepNumber === 0 ? '1rem' : '2rem' }}>
                {title}
            </div>
        </div>
    );

    const MainCard = ({ title, count, total, colorClass = "bg-slate-50 border-2 border-gray-300", onClick }) => {
        const percent = total > 0 ? ((count / total) * 100).toFixed(2) + '%' : '';
        return (
            <div 
                onClick={onClick}
                className={`${colorClass} rounded-lg p-3 text-center shadow-sm flex flex-col justify-center min-h-[120px] 
                hover:shadow-lg hover:scale-105 transition-all cursor-pointer`}
            >
                <div className="text-xs md:text-sm font-bold text-gray-500 uppercase tracking-wide mb-2">{title}</div>
                <div className="flex flex-col items-center">
                    <div className="text-2xl md:text-3xl font-extrabold text-gray-800 leading-none">{count?.toLocaleString() || 0}</div>
                    {percent && <div className="text-xl md:text-2xl font-bold text-green-600 mt-1">{percent}</div>}
                </div>
            </div>
        );
    };

    const DetailCard = ({ title, count, totalForPercent, highlight = false, onClick }) => {
        const percent = totalForPercent > 0 ? ((count / totalForPercent) * 100).toFixed(2) + '%' : '';
        return (
            <div 
                onClick={onClick}
                className={`relative overflow-hidden rounded-lg p-3 shadow-sm border flex flex-col justify-center min-h-[80px] 
                transition-all hover:translate-y-[-2px] hover:shadow-md cursor-pointer
                ${highlight ? 'bg-red-50 border-red-200 hover:bg-red-100' : 'bg-blue-50 border-blue-100 hover:bg-blue-100'}`}
            >
                <div className="text-[10px] md:text-[11px] font-bold text-gray-500 uppercase leading-tight mb-1">{title}</div>
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0">
                    <span className={`text-lg md:text-xl font-bold ${highlight ? 'text-red-700' : 'text-blue-900'}`}>{count?.toLocaleString() || 0}</span>
                    {percent && <span className={`text-lg md:text-xl font-bold ${highlight ? 'text-red-500' : 'text-blue-500'}`}>({percent})</span>}
                </div>
            </div>
        );
    };

    const TreeCard = ({ title, count, total, color = "bg-white", borderColor = "border-gray-300", textColor = "text-gray-800", onClick }) => {
        const percent = total > 0 ? ((count / total) * 100).toFixed(2) + '%' : '';
        return (
            <div 
                onClick={onClick}
                className={`p-3 rounded-3xl border-2 ${borderColor} ${color} shadow-sm text-center w-full min-w-[110px] z-20 relative 
                hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer`}
            >
                <div className={`text-[10px] font-bold uppercase mb-2 ${textColor} opacity-80`}>{title}</div>
                <div className="flex flex-col items-center">
                    <div className={`text-xl font-extrabold ${textColor} leading-tight`}>{count?.toLocaleString() || 0}</div>
                    {percent && <div className={`text-lg font-bold ${textColor} opacity-90 mt-1`}>{percent}</div>}
                </div>
            </div>
        );
    };

    return (
        <AuthenticatedLayout user={auth.user} header={<h2 className="font-semibold text-xl text-gray-800 leading-tight">Flow Process HSI</h2>}>
            <Head title="Flow Process HSI" />
            <div className="min-h-screen bg-gray-100 font-sans text-gray-900 pb-20">
                <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 py-8">

                    {/* HEADER TITLE & FILTER */}
                    <div className="mb-6 border-b border-gray-300 pb-4">
                        <h1 className="text-2xl font-extrabold text-gray-900 uppercase">Data Pengawalan PSB HSI</h1>
                        <p className="text-sm text-gray-500 mt-1 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span> Last Update: {new Date().toLocaleDateString()}
                        </p>
                    </div>

                    {/* FILTER SECTION */}
                    <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 mb-8">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Periode Data</label>
                                <div className="relative z-40"><DatePicker selectsRange={true} startDate={startDate} endDate={endDate} onChange={(u) => setDateRange(u)} isClearable={true} placeholderText="Pilih Rentang" className="w-full border-gray-300 rounded-md text-sm shadow-sm p-2.5" dateFormat="dd/MM/yyyy" /></div>
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
                                <button onClick={applyFilter} className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold py-2.5 px-4 rounded shadow w-full">Terapkan</button>
                                {(filters.start_date || (filters.global_witel && filters.global_witel.length > 0) || (filters.global_branch && filters.global_branch.length > 0)) && <button onClick={resetFilter} className="bg-white border border-gray-300 text-gray-700 text-sm font-bold py-2.5 px-4 rounded shadow">Reset</button>}
                            </div>
                        </div>
                    </div>

                    {/* MAIN WRAPPER - FLOWCHART */}
                    <div className="bg-white rounded-3xl shadow border border-gray-200 p-6 md:p-8 mb-8">
                        
                        {/* FLOW CHEVRONS */}
                        <div className="flex w-full mb-8 overflow-x-auto pb-4 no-scrollbar pl-2">
                            <HeaderStep title="OFFERING" stepNumber={0} />
                            <HeaderStep title="VERIFICATION & VALID" stepNumber={1} />
                            <HeaderStep title="FEASIBILITY" stepNumber={2} />
                            <HeaderStep title="INSTALASI & AKTIVASI" stepNumber={3} />
                            <HeaderStep title="PS" color="bg-green-600" isLast={true} stepNumber={4} />
                        </div>

                        {/* GRID DASHBOARD */}
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                            
                            {/* COLUMN 1: RE */}
                            <div className="space-y-3">
                                <MainCard title="RE" count={flowStats?.re} onClick={() => handleCardClick('RE')} />
                                <div className="min-h-[300px] border-2 border-transparent"></div>
                            </div>

                            {/* COLUMN 2: Valid RE + Fallout */}
                            <div className="space-y-3">
                                <MainCard title="Valid RE" count={flowStats?.valid_re} total={flowStats?.re} onClick={() => handleCardClick('Valid RE')} />
                                <div className="p-3 bg-slate-50 rounded-lg border-2 border-gray-100 min-h-[300px] flex flex-col gap-3">
                                    <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1 text-center">Fallout Points</div>
                                    <DetailCard title="OGP Verif & Valid" count={flowStats?.ogp_verif} totalForPercent={flowStats?.re} onClick={() => handleCardClick('OGP Verif & Valid')} />
                                    <DetailCard title="Cancel QC 1" count={flowStats?.cancel_qc1} totalForPercent={flowStats?.re} highlight onClick={() => handleCardClick('Cancel QC 1')} />
                                    <DetailCard title="Cancel FCC" count={flowStats?.cancel_fcc} totalForPercent={flowStats?.re} highlight onClick={() => handleCardClick('Cancel FCC')} />
                                </div>
                            </div>

                            {/* COLUMN 3: Valid WO + Process */}
                            <div className="space-y-3">
                                <MainCard title="Valid WO" count={flowStats?.valid_wo} total={flowStats?.re} onClick={() => handleCardClick('Valid WO')} />
                                <div className="p-3 bg-slate-50 rounded-lg border-2 border-gray-100 min-h-[300px] flex flex-col gap-3">
                                    <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1 text-center">Process</div>
                                    <DetailCard title="Cancel WO" count={flowStats?.cancel_wo} totalForPercent={flowStats?.re} highlight onClick={() => handleCardClick('Cancel WO')} />
                                    <DetailCard title="UNSC" count={flowStats?.unsc} totalForPercent={flowStats?.re} onClick={() => handleCardClick('UNSC')} />
                                    <DetailCard title="OGP SURVEY" count={flowStats?.ogp_survey_count} totalForPercent={flowStats?.re} onClick={() => handleCardClick('OGP SURVEY')} />
                                </div>
                            </div>

                            {/* COLUMN 4: Valid PI + Technician */}
                            <div className="space-y-3">
                                <MainCard title="Valid PI" count={flowStats?.valid_pi} total={flowStats?.re} onClick={() => handleCardClick('Valid PI')} />
                                <div className="p-3 bg-slate-50 rounded-lg border-2 border-gray-100 min-h-[300px] flex flex-col gap-3">
                                    <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1 text-center">Technician</div>
                                    <DetailCard title="Cancel Instalasi" count={flowStats?.cancel_instalasi} totalForPercent={flowStats?.re} highlight onClick={() => handleCardClick('Cancel Instalasi')} />
                                    <DetailCard title="Fallout" count={flowStats?.fallout} totalForPercent={flowStats?.re} highlight onClick={() => handleCardClick('Fallout')} />
                                    <DetailCard title="Revoke" count={flowStats?.revoke_count} totalForPercent={flowStats?.re} highlight onClick={() => handleCardClick('Revoke')} />
                                </div>
                            </div>

                            {/* COLUMN 5: PS + Provisioning + RATIO BOX */}
                            <div className="space-y-3">
                                <MainCard title="PS (COMPLETED)" count={flowStats?.ps_count} total={flowStats?.re} colorClass="bg-green-50 border-2 border-green-500" onClick={() => handleCardClick('PS (COMPLETED)')} />
                                
                                <div className="p-3 bg-slate-50 rounded-lg border-2 border-gray-100 flex flex-col gap-3">
                                    <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1 text-center">Provisioning</div>
                                    <DetailCard title="OGP Provisioning" count={flowStats?.ogp_provi} totalForPercent={flowStats?.re} onClick={() => handleCardClick('OGP Provisioning')} />
                                </div>

                                {/* RATIO BOX */}
                                <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg p-4 text-white shadow-lg flex flex-col justify-center mt-auto gap-3">
                                    {/* Item 1: PS/RE */}
                                    <div className="text-center">
                                        <div className="text-[10px] md:text-xs font-medium text-blue-200 uppercase mb-1">Conversion PS/RE</div>
                                        <div className="text-2xl md:text-3xl font-bold tracking-tight">{psRePercent}<span className="text-sm md:text-lg">%</span></div>
                                    </div>
                                    <div className="w-full bg-blue-500/30 h-px"></div>
                                    {/* Item 2: PS/PI */}
                                    <div className="text-center">
                                        <div className="text-[10px] md:text-xs font-medium text-blue-200 uppercase mb-1">Conversion PS/PI</div>
                                        <div className="text-2xl md:text-3xl font-bold tracking-tight">{psPiPercent}<span className="text-sm md:text-lg">%</span></div>
                                    </div>
                                    <div className="w-full bg-blue-500/30 h-px"></div>
                                    {/* ITEM 3: COMPLY */}
                                    <div className="text-center">
                                        <div className="text-[10px] md:text-xs font-medium text-blue-200 uppercase mb-1">Comply</div>
                                        <div className="text-2xl md:text-3xl font-bold tracking-tight text-green-300">
                                            {complyPercent}<span className="text-sm md:text-lg">%</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* WRAPPER SECTION 2: REVOKE FLOW CHART (TREE DIAGRAM) */}
                    <div className="mt-12 bg-white rounded-3xl shadow border border-gray-200 p-8">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="h-8 w-1 bg-red-500 rounded-full"></div>
                            <h3 className="text-lg font-bold text-gray-800">Analisis Revoke & Fallout</h3>
                        </div>

                        <div className="overflow-x-auto">
                            <div className="min-w-[900px] flex flex-col items-center">
                                {/* LEVEL 1 */}
                                <div className="relative z-10 mb-16">
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 w-0.5 h-16 bg-gray-300"></div>
                                    <div 
                                        className="bg-red-50 border-2 border-red-200 p-4 rounded-3xl text-center shadow min-w-[200px] cursor-pointer hover:bg-red-100 transition-colors"
                                        onClick={() => handleCardClick('Total Revoke')}
                                    >
                                        <div className="text-xs font-bold text-red-600 uppercase mb-1">Total Revoke</div>
                                        <div className="text-3xl font-extrabold text-red-900">{flowStats?.revoke_count?.toLocaleString() || 0}</div>
                                    </div>
                                </div>
                                {/* LEVEL 2 */}
                                <div className="flex justify-center gap-10 w-full relative mb-12">
                                    <div className="absolute -top-6 left-[20%] right-[20%] h-10 border-t-2 border-r-2 border-l-2 border-gray-300 rounded-t-3xl"></div>
                                    <div className="flex flex-col items-center w-1/3 relative">
                                        <TreeCard title="Follow Up Completed" count={flowStats?.followup_completed} total={flowStats?.revoke_count} borderColor="border-blue-300" textColor="text-blue-900" color="bg-blue-50" onClick={() => handleCardClick('Follow Up Completed')} />
                                        <div className="absolute top-full left-1/2 -translate-x-1/2 w-0.5 h-12 bg-gray-300"></div>
                                    </div>
                                    <div className="flex flex-col items-center w-1/3 z-10">
                                        <TreeCard title="Revoke Completed" count={flowStats?.revoke_completed} total={flowStats?.revoke_count} onClick={() => handleCardClick('Revoke Completed')} />
                                    </div>
                                    <div className="flex flex-col items-center w-1/3 z-10">
                                        <TreeCard title="Revoke Order" count={flowStats?.revoke_order} total={flowStats?.revoke_count} onClick={() => handleCardClick('Revoke Order')} />
                                    </div>
                                </div>
                                {/* LEVEL 3 */}
                                <div className="relative w-full flex justify-start pl-[5%] pr-[20%]">
                                    <div className="w-full relative pt-6">
                                        <div className="absolute top-0 border-t-2 border-l-2 border-r-2 border-gray-300 rounded-t-3xl h-6" style={{ left: 'calc(10% - 1.2rem)', right: 'calc(10% - 1.2rem)' }}></div>
                                        <div className="grid grid-cols-5 gap-12">
                                            <div className="relative flex flex-col items-center">
                                                <TreeCard title="PS" count={flowStats?.ps_revoke} total={flowStats?.followup_completed} color="bg-green-50" borderColor="border-green-200" textColor="text-green-800" onClick={() => handleCardClick('PS Revoke')} />
                                            </div>
                                            <div className="relative flex flex-col items-center">
                                                <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-0.5 h-6 bg-gray-300"></div>
                                                <TreeCard title="OGP Provi" count={flowStats?.ogp_provi_revoke} total={flowStats?.followup_completed} color="bg-yellow-50" borderColor="border-yellow-200" textColor="text-yellow-800" onClick={() => handleCardClick('OGP Provi Revoke')} />
                                            </div>
                                            <div className="relative flex flex-col items-center">
                                                <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-0.5 h-6 bg-gray-300"></div>
                                                <TreeCard title="Fallout" count={flowStats?.fallout_revoke} total={flowStats?.followup_completed} color="bg-orange-50" borderColor="border-orange-200" textColor="text-orange-800" onClick={() => handleCardClick('Fallout Revoke')} />
                                            </div>
                                            <div className="relative flex flex-col items-center">
                                                <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-0.5 h-6 bg-gray-300"></div>
                                                <TreeCard title="Cancel" count={flowStats?.cancel_revoke} total={flowStats?.followup_completed} color="bg-red-50" borderColor="border-red-200" textColor="text-red-800" onClick={() => handleCardClick('Cancel Revoke')} />
                                            </div>
                                            <div className="relative flex flex-col items-center">
                                                <TreeCard title="Lain-Lain" count={flowStats?.lain_lain_revoke} total={flowStats?.followup_completed} onClick={() => handleCardClick('Lain-Lain Revoke')} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* DETAIL DATA TABLE SECTION (SHOW ONLY IF ACTIVE) */}
                    {activeCategory && (
                        <div className="mt-12 bg-white rounded-3xl shadow border border-gray-200 p-8 scroll-mt-20" id="detail-section">
                            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="h-8 w-1 bg-blue-600 rounded-full"></div>
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-800">Detail Data: <span className="text-blue-600">{activeCategory}</span></h3>
                                        <p className="text-sm text-gray-500">Menampilkan daftar order untuk kategori terpilih.</p>
                                    </div>
                                </div>
                                <button 
                                    onClick={handleExportDetail}
                                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg shadow flex items-center gap-2 text-sm font-bold transition-colors"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                                    Export Excel
                                </button>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200 text-sm">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Order ID</th>
                                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Tgl Order</th>
                                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Nama Customer</th>
                                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Witel</th>
                                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Layanan</th>
                                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status Group</th>
                                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Resume Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {detailData && detailData.data && detailData.data.length > 0 ? (
                                            detailData.data.map((item, idx) => (
                                                <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-6 py-4 whitespace-nowrap font-medium text-blue-600">{item.order_id}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">{item.order_date}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap font-bold text-gray-800">{item.customer_name}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-gray-600">{item.witel}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">{item.type_layanan}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                                            item.kelompok_status === 'PS' ? 'bg-green-100 text-green-800' : 
                                                            (item.kelompok_status && item.kelompok_status.includes('CANCEL')) ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                                                        }`}>
                                                            {item.kelompok_status}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-xs text-gray-500 max-w-xs truncate" title={item.status_resume}>
                                                        {item.status_resume}
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="7" className="px-6 py-10 text-center text-gray-500 italic">Tidak ada data detail untuk kategori ini.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            {detailData && detailData.links && (
                                <div className="mt-4 flex justify-end gap-2">
                                    {detailData.links.map((link, i) => (
                                        <button
                                            key={i}
                                            onClick={() => handlePageChange(link.url)}
                                            disabled={!link.url || link.active}
                                            className={`px-3 py-1 text-xs rounded ${link.active ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'} disabled:opacity-50`}
                                            dangerouslySetInnerHTML={{ __html: link.label }}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                </div>
            </div>
        </AuthenticatedLayout>
    );
}