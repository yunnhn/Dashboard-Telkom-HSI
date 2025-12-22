import React, { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';

export default function FlowProcessHSI({ auth, flowStats, witels, filters }) {

    const [selectedWitel, setSelectedWitel] = useState(filters.witel || '');

    const applyFilter = () => {
        router.get(route('flow.hsi'), { witel: selectedWitel }, { preserveState: true, preserveScroll: true });
    };

    const resetFilter = () => {
        setSelectedWitel('');
        router.get(route('flow.hsi'));
    };

    // Helper: Flow Card (Atas)
    const FlowCard = ({ title, count, totalForPercent, color = "bg-gray-100", borderColor="border-gray-400" }) => {
        const percent = totalForPercent > 0 ? ((count / totalForPercent) * 100).toFixed(2) : 0;
        return (
            <div className={`p-4 rounded-lg border-l-4 ${borderColor} ${color} shadow-sm flex flex-col items-center justify-center min-h-[100px]`}>
                <div className="text-xs font-bold text-gray-600 uppercase text-center mb-1">{title}</div>
                <div className="flex flex-col items-center">
                    <span className="text-2xl font-bold text-gray-800">{count?.toLocaleString()}</span>
                    {totalForPercent && <span className="text-sm font-semibold text-gray-500">({percent}%)</span>}
                </div>
            </div>
        );
    };

    // Helper: Revoke Card (Bawah)
    const RevokeCard = ({ title, count, totalForPercent, bgColor="bg-gray-200", textColor="text-gray-800", className="" }) => {
        const percent = totalForPercent > 0 ? ((count / totalForPercent) * 100).toFixed(2) : 0;
        return (
            <div className={`relative z-10 flex flex-col items-center justify-center p-3 rounded-xl shadow-md border border-gray-300 ${bgColor} w-full min-h-[80px] ${className}`}>
                <div className={`text-xs font-extrabold uppercase mb-1 text-center ${title === 'REVOKE' ? 'text-xl' : 'text-red-600'}`}>{title}</div>
                <div className="flex items-baseline gap-2">
                    <span className={`text-xl font-bold ${textColor}`}>{count?.toLocaleString()}</span>
                    {totalForPercent && <span className="text-sm font-bold text-gray-600">{percent}%</span>}
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

            <div className="py-8">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8 space-y-8">
                    
                    {/* FILTER */}
                    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                            <div className="w-full md:w-1/3">
                                <label className="block text-sm font-bold text-gray-700 mb-1">Filter Witel</label>
                                <select className="w-full border-gray-300 rounded-md text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2" value={selectedWitel} onChange={(e) => setSelectedWitel(e.target.value)}>
                                    <option value="">Semua Witel (Regional 3)</option>
                                    {witels.map((w) => <option key={w} value={w}>{w}</option>)}
                                </select>
                            </div>
                            <div className="flex gap-2 self-end">
                                <button onClick={applyFilter} className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold py-2 px-4 rounded shadow transition">Terapkan Filter</button>
                                {filters.witel && <button onClick={resetFilter} className="bg-white border border-gray-300 text-gray-700 text-sm font-bold py-2 px-4 rounded shadow transition">Reset</button>}
                            </div>
                        </div>
                    </div>

                    {flowStats && (
                        <>
                            {/* FLOW UTAMA */}
                            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 overflow-x-auto">
                                <h3 className="text-lg font-bold text-gray-800 mb-6 text-center uppercase">DATA PENGAWALAN PSB HSI {filters.witel ? `- ${filters.witel}` : '(ALL REGIONAL)'}</h3>
                                
                                {/* Header Panah */}
                                <div className="grid grid-cols-5 gap-2 mb-4 text-center text-white text-sm font-bold min-w-[900px]">
                                    <div className="bg-gray-800 py-3 rounded">Offering</div>
                                    <div className="bg-gray-800 py-3 rounded">Verification & Validation</div>
                                    <div className="bg-gray-800 py-3 rounded">Feasibility</div>
                                    <div className="bg-gray-800 py-3 rounded">Instalasi & Aktivasi</div>
                                    <div className="bg-green-600 py-3 rounded">PS</div>
                                </div>

                                {/* Data Utama */}
                                <div className="grid grid-cols-5 gap-4 mb-8 relative min-w-[900px]">
                                    <div className="bg-gray-50 p-4 rounded border border-gray-300 text-center">
                                        <div className="text-sm font-bold text-gray-600">RE</div>
                                        <div className="text-3xl font-bold mt-2">{flowStats.re?.toLocaleString()}</div>
                                    </div>
                                    <div className="bg-gray-50 p-4 rounded border border-gray-300 text-center">
                                        <div className="text-sm font-bold text-gray-600">Valid RE</div>
                                        <div className="text-3xl font-bold mt-2">{flowStats.valid_re?.toLocaleString()}</div>
                                        <div className="text-sm text-gray-500 mt-1">{flowStats.re > 0 ? ((flowStats.valid_re / flowStats.re) * 100).toFixed(2) : 0}%</div>
                                    </div>
                                    <div className="bg-gray-50 p-4 rounded border border-gray-300 text-center">
                                        <div className="text-sm font-bold text-gray-600">Valid WO</div>
                                        <div className="text-3xl font-bold mt-2">{flowStats.valid_wo?.toLocaleString()}</div>
                                        <div className="text-sm text-gray-500 mt-1">{flowStats.re > 0 ? ((flowStats.valid_wo / flowStats.re) * 100).toFixed(2) : 0}%</div>
                                    </div>
                                    <div className="bg-gray-50 p-4 rounded border border-gray-300 text-center">
                                        <div className="text-sm font-bold text-gray-600">Valid PI</div>
                                        <div className="text-3xl font-bold mt-2">{flowStats.valid_pi?.toLocaleString()}</div>
                                        <div className="text-sm text-gray-500 mt-1">{flowStats.re > 0 ? ((flowStats.valid_pi / flowStats.re) * 100).toFixed(2) : 0}%</div>
                                    </div>
                                    <div className="bg-gray-50 p-4 rounded border border-gray-300 text-center">
                                        <div className="text-sm font-bold text-gray-600">PS</div>
                                        <div className="text-3xl font-bold mt-2">{flowStats.ps_count?.toLocaleString()}</div>
                                        <div className="text-sm text-gray-500 mt-1">{flowStats.re > 0 ? ((flowStats.ps_count / flowStats.re) * 100).toFixed(2) : 0}%</div>
                                    </div>
                                </div>

                                {/* Details */}
                                <div className="grid grid-cols-4 gap-6 text-center min-w-[900px]">
                                    <div className="space-y-4">
                                        <FlowCard title="OGP Verif & Valid" count={flowStats.ogp_verif} totalForPercent={flowStats.re} color="bg-blue-50" borderColor="border-blue-400" />
                                        <FlowCard title="Cancel QC1" count={flowStats.cancel_qc1} totalForPercent={flowStats.re} color="bg-blue-50" borderColor="border-blue-400" />
                                        <FlowCard title="Cancel FCC" count={flowStats.cancel_fcc} totalForPercent={flowStats.re} color="bg-blue-50" borderColor="border-blue-400" />
                                    </div>
                                    <div className="space-y-4">
                                        <FlowCard title="Cancel WO" count={flowStats.cancel_wo} totalForPercent={flowStats.re} color="bg-blue-50" borderColor="border-blue-400" />
                                        <FlowCard title="UNSC" count={flowStats.unsc} totalForPercent={flowStats.re} color="bg-blue-50" borderColor="border-blue-400" />
                                        <FlowCard title="OGP Survey" count={flowStats.ogp_survey_count} totalForPercent={flowStats.re} color="bg-blue-50" borderColor="border-blue-400" />
                                    </div>
                                    <div className="space-y-4">
                                        <FlowCard title="Cancel" count={flowStats.cancel_instalasi} totalForPercent={flowStats.re} color="bg-blue-50" borderColor="border-blue-400" />
                                        <FlowCard title="Fallout" count={flowStats.fallout} totalForPercent={flowStats.re} color="bg-blue-50" borderColor="border-blue-400" />
                                        <FlowCard title="Revoke" count={flowStats.revoke_count} totalForPercent={flowStats.re} color="bg-blue-50" borderColor="border-blue-400" />
                                    </div>
                                    <div className="space-y-4">
                                        <FlowCard title="OGP Provisioning" count={flowStats.ogp_provi} totalForPercent={flowStats.re} color="bg-blue-50" borderColor="border-blue-400" />
                                        <div className="mt-6 p-4 bg-white border border-gray-300 rounded shadow-sm text-right">
                                            <div className="text-sm font-bold text-gray-500 mb-1">PS/RE</div>
                                            <div className="text-3xl font-bold text-gray-800 mb-4">{flowStats.re > 0 ? ((flowStats.ps_count / flowStats.re) * 100).toFixed(2) : 0}%</div>
                                            <div className="text-sm font-bold text-gray-500 mb-1">PS/PI</div>
                                            <div className="text-3xl font-bold text-gray-800">{flowStats.valid_pi > 0 ? ((flowStats.ps_count / flowStats.valid_pi) * 100).toFixed(2) : 0}%</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* REVOKE FLOW CHART (YANG SUDAH DIPERBAIKI) */}
                            <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200 overflow-x-auto">
                                
                                {/* 1. REVOKE HEADER */}
                                <div className="flex justify-center mb-12">
                                    <div className="flex flex-col items-center p-4 bg-gray-200 rounded-lg border-2 border-gray-400 shadow-md min-w-[200px] relative z-20">
                                        <span className="text-3xl font-extrabold uppercase mb-1 text-black">Revoke</span>
                                        <span className="text-2xl font-bold">{flowStats.revoke_count?.toLocaleString()}</span>
                                    </div>
                                </div>

                                <div className="flex flex-col items-center min-w-[900px]">

                                    {/* 2. TIGA CABANG UTAMA */}
                                    <div className="flex justify-center gap-8 w-full mb-0 z-20 relative">
                                        {/* Kiri: Follow Up (Induk) */}
                                        <div className="flex flex-col items-center w-1/3 relative">
                                            <RevokeCard title="FOLLOW UP COMPLETED" count={flowStats.followup_completed} totalForPercent={flowStats.revoke_count} bgColor="bg-gray-200" />
                                            {/* Garis Vertikal Turun */}
                                            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 h-8 w-1 bg-red-600"></div>
                                        </div>
                                        {/* Tengah */}
                                        <div className="flex flex-col items-center w-1/3">
                                            <RevokeCard title="REVOKE COMPLETED" count={flowStats.revoke_completed} totalForPercent={flowStats.revoke_count} bgColor="bg-gray-200" />
                                        </div>
                                        {/* Kanan */}
                                        <div className="flex flex-col items-center w-1/3">
                                            <RevokeCard title="REVOKE ORDER" count={flowStats.revoke_order} totalForPercent={flowStats.revoke_count} bgColor="bg-gray-200" />
                                        </div>
                                    </div>

                                    {/* 3. ANAK-ANAK (TREE DIAGRAM) */}
                                    <div className="w-full mt-8 relative">
                                        
                                        {/* Garis Horizontal Panjang (Lebar disesuaikan agar pas dengan anak-anak) */}
                                        <div className="absolute top-0 left-[10%] right-[10%] border-t-4 border-red-600"></div>

                                        {/* Container Anak (Flex 1 agar rata) */}
                                        <div className="flex justify-between w-full gap-4 pt-0 relative top-0 z-10">
                                            
                                            {/* Child 1: PS */}
                                            <div className="flex flex-col items-center flex-1 relative">
                                                <div className="absolute -top-0 left-1/2 -translate-x-1/2 h-8 w-1 bg-red-600 -mt-1"></div>
                                                <RevokeCard title="PS" count={flowStats.ps_revoke} totalForPercent={flowStats.followup_completed} bgColor="bg-green-500" textColor="text-white" className="mt-7" />
                                            </div>

                                            {/* Child 2: OGP PROVI */}
                                            <div className="flex flex-col items-center flex-1 relative">
                                                <div className="absolute -top-0 left-1/2 -translate-x-1/2 h-8 w-1 bg-red-600 -mt-1"></div>
                                                <RevokeCard title="OGP PROVI" count={flowStats.ogp_provi_revoke} totalForPercent={flowStats.followup_completed} bgColor="bg-gray-200" className="mt-7" />
                                            </div>

                                            {/* Child 3: FALLOUT */}
                                            <div className="flex flex-col items-center flex-1 relative">
                                                <div className="absolute -top-0 left-1/2 -translate-x-1/2 h-8 w-1 bg-red-600 -mt-1"></div>
                                                <RevokeCard title="FALLOUT" count={flowStats.fallout_revoke} totalForPercent={flowStats.followup_completed} bgColor="bg-gray-200" className="mt-7" />
                                            </div>

                                            {/* Child 4: CANCEL */}
                                            <div className="flex flex-col items-center flex-1 relative">
                                                <div className="absolute -top-0 left-1/2 -translate-x-1/2 h-8 w-1 bg-red-600 -mt-1"></div>
                                                <RevokeCard title="CANCEL" count={flowStats.cancel_revoke} totalForPercent={flowStats.followup_completed} bgColor="bg-gray-200" className="mt-7" />
                                            </div>

                                            {/* Child 5: LAIN-LAIN */}
                                            <div className="flex flex-col items-center flex-1 relative">
                                                <div className="absolute -top-0 left-1/2 -translate-x-1/2 h-8 w-1 bg-red-600 -mt-1"></div>
                                                <RevokeCard title="LAIN-LAIN" count={flowStats.lain_lain_revoke} totalForPercent={flowStats.followup_completed} bgColor="bg-gray-200" className="mt-7" />
                                            </div>
                                        </div>

                                        <div className="text-[10px] text-gray-500 mt-4 text-right w-full pr-4 leading-tight">
                                            * LAIN-LAIN : REVOKE, INPROGRES SC, SC BARU TIDAK DITEMUKAN
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}