import React, { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import { Filter, RotateCcw } from 'lucide-react';

export default function FlowProcessHSI({ auth, flowStats, witels, filters = {} }) {
    // State untuk filter
    const [selectedWitel, setSelectedWitel] = useState(filters.witel || '');

    // Logika Filter: Trigger saat select berubah
    const handleWitelChange = (e) => {
        const val = e.target.value;
        setSelectedWitel(val);
        router.get(route('flow.hsi'), { witel: val }, { preserveState: true, preserveScroll: true });
    };

    // Logika Reset Filter
    const resetFilter = () => {
        setSelectedWitel('');
        router.get(route('flow.hsi'), {}, { preserveState: true, preserveScroll: true });
    };

    // Hitung Rasio (Safe calculation)
    const psRePercent = flowStats?.ps_re_denominator > 0 
        ? ((flowStats.ps_count / flowStats.ps_re_denominator) * 100).toFixed(2) 
        : 0;
    const psPiPercent = flowStats?.ps_pi_denominator > 0 
        ? ((flowStats.ps_count / flowStats.ps_pi_denominator) * 100).toFixed(2) 
        : 0;

    // --- SUB-KOMPONEN UI ---

    // 1. Header Panah (Chevron)
    const HeaderStep = ({ title, color = "bg-gray-800", isLast = false, stepNumber }) => (
        <div className="relative flex-1 min-w-[120px]">
             <div 
                className={`${color} text-white font-bold h-12 flex items-center justify-center px-4 md:px-8 text-xs md:text-sm text-center relative z-10 shadow-md transition-all hover:brightness-110`}
                style={{
                    clipPath: isLast 
                        ? 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%, 100% 100%, 0% 100%, 15px 50%)' 
                        : 'polygon(0% 0%, calc(100% - 15px) 0%, 100% 50%, calc(100% - 15px) 100%, 0% 100%, 15px 50%)', 
                    marginLeft: stepNumber === 0 ? '0' : '-12px', 
                    paddingLeft: stepNumber === 0 ? '1rem' : '2rem'
                }}
            >
                {title}
            </div>
        </div>
    );

    // 2. Kartu Utama (Main Grid) - Updated: bg-slate-50, border-2
    const MainCard = ({ title, count, total, colorClass = "bg-slate-50 border-2 border-gray-300" }) => {
        const percent = total > 0 ? ((count / total) * 100).toFixed(2) + '%' : '';
        return (
            <div className={`${colorClass} rounded-lg p-3 text-center shadow-sm flex flex-col justify-center min-h-[120px] hover:shadow-md transition-shadow`}>
                <div className="text-xs md:text-sm font-bold text-gray-500 uppercase tracking-wide mb-2">{title}</div>
                <div className="flex flex-col items-center">
                    <div className="text-2xl md:text-3xl font-extrabold text-gray-800 leading-none">{count?.toLocaleString() || 0}</div>
                    {percent && <div className="text-xl md:text-2xl font-bold text-green-600 mt-1">{percent}</div>}
                </div>
            </div>
        );
    };

    // 3. Kartu Detail - Updated Style logic
    const DetailCard = ({ title, count, totalForPercent, highlight = false }) => {
        const percent = totalForPercent > 0 ? ((count / totalForPercent) * 100).toFixed(2) + '%' : '';
        return (
            <div className={`
                relative overflow-hidden rounded-lg p-3 shadow-sm border
                flex flex-col justify-center min-h-[80px] transition-all hover:translate-y-[-2px]
                ${highlight ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-100'}
            `}>
                <div className="text-[10px] md:text-[11px] font-bold text-gray-500 uppercase leading-tight mb-1">{title}</div>
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0">
                    <span className={`text-lg md:text-xl font-bold ${highlight ? 'text-red-700' : 'text-blue-900'}`}>
                        {count?.toLocaleString() || 0}
                    </span>
                    {percent && <span className={`text-lg md:text-xl font-bold ${highlight ? 'text-red-500' : 'text-blue-500'}`}>({percent})</span>}
                </div>
            </div>
        );
    };

    // 4. Kartu Tree Diagram - Updated: rounded-3xl
    const TreeCard = ({ title, count, total, color = "bg-white", borderColor = "border-gray-300", textColor = "text-gray-800" }) => {
        const percent = total > 0 ? ((count / total) * 100).toFixed(2) + '%' : '';
        return (
            <div className={`p-3 rounded-3xl border-2 ${borderColor} ${color} shadow-sm text-center w-full min-w-[110px] z-20 relative`}>
                <div className={`text-[10px] font-bold uppercase mb-2 ${textColor} opacity-80`}>{title}</div>
                <div className="flex flex-col items-center">
                    <div className={`text-xl font-extrabold ${textColor} leading-tight`}>{count?.toLocaleString() || 0}</div>
                    {percent && <div className={`text-lg font-bold ${textColor} opacity-90 mt-1`}>{percent}</div>}
                </div>
            </div>
        );
    };

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={<h2 className="font-semibold text-xl text-gray-800 leading-tight">Flow Process HSI</h2>}
        >
            <Head title="Flow Process HSI" />

            <div className="min-h-screen bg-gray-100 font-sans text-gray-900 pb-20">
                <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 py-8">

                    {/* HEADER TITLE & FILTER */}
                    <div className="flex flex-col md:flex-row justify-between items-end mb-6 gap-4 border-b border-gray-300 pb-4">
                        <div>
                            <h1 className="text-2xl font-extrabold text-gray-900 uppercase">Data Pengawalan PSB HSI</h1>
                            <p className="text-sm text-gray-500 mt-1 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                                Last Update: {new Date().toLocaleDateString()}
                            </p>
                        </div>

                        {/* FILTER SECTION */}
                        <div className="flex gap-2 items-center bg-white p-2 rounded-lg shadow-sm border border-gray-200">
                            <Filter size={16} className="text-gray-400 ml-2" />
                            <select 
                                className="bg-transparent border-none text-sm font-semibold text-gray-700 focus:ring-0 cursor-pointer min-w-[150px]"
                                value={selectedWitel}
                                onChange={handleWitelChange}
                            >
                                <option value="">All Witel</option>
                                {witels?.map((w) => (
                                    <option key={w} value={w}>{w}</option>
                                ))}
                            </select>
                            {selectedWitel && (
                                <button onClick={resetFilter} className="p-1 hover:bg-gray-100 rounded-full transition-colors" title="Reset Filter">
                                    <RotateCcw size={14} className="text-red-500" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* WRAPPER SECTION 1: Background Putih & Rounded Corners untuk Flow & Grid */}
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
                                <MainCard title="RE" count={flowStats?.re} />
                                <div className="min-h-[300px] border-2 border-transparent"></div>
                            </div>

                            {/* COLUMN 2: Valid RE + Fallout Points */}
                            <div className="space-y-3">
                                <MainCard title="Valid RE" count={flowStats?.valid_re} total={flowStats?.re} />
                                <div className="p-3 bg-slate-50 rounded-lg border-2 border-gray-100 min-h-[300px] flex flex-col gap-3">
                                    <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1 text-center">Fallout Points</div>
                                    <DetailCard title="OGP Verif & Valid" count={flowStats?.ogp_verif} totalForPercent={flowStats?.re} />
                                    <DetailCard title="Cancel QC 1" count={flowStats?.cancel_qc1} totalForPercent={flowStats?.re} highlight />
                                    <DetailCard title="Cancel FCC" count={flowStats?.cancel_fcc} totalForPercent={flowStats?.re} highlight />
                                </div>
                            </div>

                            {/* COLUMN 3: Valid WO + Process */}
                            <div className="space-y-3">
                                <MainCard title="Valid WO" count={flowStats?.valid_wo} total={flowStats?.re} />
                                <div className="p-3 bg-slate-50 rounded-lg border-2 border-gray-100 min-h-[300px] flex flex-col gap-3">
                                    <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1 text-center">Process</div>
                                    <DetailCard title="Cancel WO" count={flowStats?.cancel_wo} totalForPercent={flowStats?.re} highlight />
                                    <DetailCard title="UNSC" count={flowStats?.unsc} totalForPercent={flowStats?.re} />
                                    <DetailCard title="OGP SURVEY" count={flowStats?.ogp_survey_count} totalForPercent={flowStats?.re} />
                                </div>
                            </div>

                            {/* COLUMN 4: Valid PI + Technician */}
                            <div className="space-y-3">
                                <MainCard title="Valid PI" count={flowStats?.valid_pi} total={flowStats?.re} />
                                <div className="p-3 bg-slate-50 rounded-lg border-2 border-gray-100 min-h-[300px] flex flex-col gap-3">
                                    <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1 text-center">Technician</div>
                                    <DetailCard title="Cancel Instalasi" count={flowStats?.cancel_instalasi} totalForPercent={flowStats?.re} highlight />
                                    <DetailCard title="Fallout" count={flowStats?.fallout} totalForPercent={flowStats?.re} highlight />
                                    <DetailCard title="Revoke" count={flowStats?.revoke_count} totalForPercent={flowStats?.re} highlight />
                                </div>
                            </div>

                            {/* COLUMN 5: PS (Result) + Provisioning + Ratios */}
                            <div className="space-y-3">
                                <MainCard title="PS (COMPLETED)" count={flowStats?.ps_count} total={flowStats?.re} colorClass="bg-green-50 border-2 border-green-500" />
                                
                                <div className="p-3 bg-slate-50 rounded-lg border-2 border-gray-100 flex flex-col gap-3">
                                    <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1 text-center">Provisioning</div>
                                    <DetailCard title="OGP Provisioning" count={flowStats?.ogp_provi} totalForPercent={flowStats?.re} />
                                </div>

                                {/* RATIO BOX */}
                                <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg p-4 text-white shadow-lg flex flex-col justify-center mt-auto">
                                    <div className="mb-4 text-center">
                                        <div className="text-xs font-medium text-blue-200 uppercase mb-1">Conversion PS/RE</div>
                                        <div className="text-3xl font-bold tracking-tight">{psRePercent}<span className="text-lg">%</span></div>
                                    </div>
                                    <div className="w-full bg-blue-500/30 h-px mb-4"></div>
                                    <div className="text-center">
                                        <div className="text-xs font-medium text-blue-200 uppercase mb-1">Conversion PS/PI</div>
                                        <div className="text-3xl font-bold tracking-tight">{psPiPercent}<span className="text-lg">%</span></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ========================================================= */}
                    {/* WRAPPER SECTION 2: REVOKE FLOW CHART (TREE DIAGRAM) */}
                    {/* ========================================================= */}
                    <div className="mt-12 bg-white rounded-3xl shadow border border-gray-200 p-8">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="h-8 w-1 bg-red-500 rounded-full"></div>
                            <h3 className="text-lg font-bold text-gray-800">Analisis Revoke & Fallout</h3>
                        </div>

                        <div className="overflow-x-auto">
                            <div className="min-w-[900px] flex flex-col items-center">
                                
                                {/* LEVEL 1: ROOT */}
                                <div className="relative z-10 mb-16">
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 w-0.5 h-16 bg-gray-300"></div> {/* Line Down */}
                                    <div className="bg-red-50 border-2 border-red-200 p-4 rounded-3xl text-center shadow min-w-[200px]">
                                        <div className="text-xs font-bold text-red-600 uppercase mb-1">Total Revoke</div>
                                        <div className="text-3xl font-extrabold text-red-900">{flowStats?.revoke_count?.toLocaleString() || 0}</div>
                                    </div>
                                </div>

                                {/* LEVEL 2: BRANCHES */}
                                <div className="flex justify-center gap-10 w-full relative mb-12">
                                    {/* Connector Horizontal Bar Level 2 */}
                                    <div className="absolute -top-6 left-[20%] right-[20%] h-10 border-t-2 border-r-2 border-l-2 border-gray-300 rounded-t-3xl"></div>

                                    {/* Branch Left */}
                                    <div className="flex flex-col items-center w-1/3 relative">
                                        <TreeCard title="Follow Up Completed" count={flowStats?.followup_completed} total={flowStats?.revoke_count} borderColor="border-blue-300" textColor="text-blue-900" color="bg-blue-50" />
                                        {/* Line Down to Children */}
                                        <div className="absolute top-full left-1/2 -translate-x-1/2 w-0.5 h-12 bg-gray-300"></div>
                                    </div>

                                    {/* Branch Middle */}
                                    <div className="flex flex-col items-center w-1/3 z-10">
                                        <TreeCard title="Revoke Completed" count={flowStats?.revoke_completed} total={flowStats?.revoke_count} />
                                    </div>

                                    {/* Branch Right */}
                                    <div className="flex flex-col items-center w-1/3 z-10">
                                        <TreeCard title="Revoke Order" count={flowStats?.revoke_order} total={flowStats?.revoke_count} />
                                    </div>
                                </div>

                                {/* LEVEL 3: CHILDREN OF LEFT BRANCH */}
                                <div className="relative w-full flex justify-start pl-[5%] pr-[20%]">
                                    <div className="w-full relative pt-6">
                                        
                                        {/* HORIZONTAL CONNECTOR BRIDGE (Rounded Corners) */}
                                        <div className="absolute top-0 border-t-2 border-l-2 border-r-2 border-gray-300 rounded-t-3xl h-6" style={{ left: 'calc(10% - 1.2rem)', right: 'calc(10% - 1.2rem)' }}></div>

                                        {/* Vertical Connectors for Children */}
                                        <div className="grid grid-cols-5 gap-12">
                                            {/* Child 1: PS */}
                                            <div className="relative flex flex-col items-center">
                                                <TreeCard title="PS" count={flowStats?.ps_revoke} total={flowStats?.followup_completed} color="bg-green-50" borderColor="border-green-200" textColor="text-green-800" />
                                            </div>

                                            {/* Child 2 */}
                                            <div className="relative flex flex-col items-center">
                                                <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-0.5 h-6 bg-gray-300"></div>
                                                <TreeCard title="OGP Provi" count={flowStats?.ogp_provi_revoke} total={flowStats?.followup_completed} color="bg-yellow-50" borderColor="border-yellow-200" textColor="text-yellow-800" />
                                            </div>

                                            {/* Child 3 */}
                                            <div className="relative flex flex-col items-center">
                                                <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-0.5 h-6 bg-gray-300"></div>
                                                <TreeCard title="Fallout" count={flowStats?.fallout_revoke} total={flowStats?.followup_completed} color="bg-orange-50" borderColor="border-orange-200" textColor="text-orange-800" />
                                            </div>

                                            {/* Child 4 */}
                                            <div className="relative flex flex-col items-center">
                                                <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-0.5 h-6 bg-gray-300"></div>
                                                <TreeCard title="Cancel" count={flowStats?.cancel_revoke} total={flowStats?.followup_completed} color="bg-red-50" borderColor="border-red-200" textColor="text-red-800" />
                                            </div>

                                            {/* Child 5: Lain-Lain */}
                                            <div className="relative flex flex-col items-center">
                                                <TreeCard title="Lain-Lain" count={flowStats?.lain_lain_revoke} total={flowStats?.followup_completed} />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </AuthenticatedLayout>
    );
}