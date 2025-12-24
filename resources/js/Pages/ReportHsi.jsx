import React, { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

export default function ReportHsi({ auth, reportData, totals, filters = {} }) {

    // Helper untuk format angka
    const formatNumber = (num) => {
        return new Intl.NumberFormat('id-ID').format(num);
    };

    // Helper warna conditional
    const getPsReColor = (value) => {
        const num = parseFloat(value);
        if (isNaN(num)) return '';
        // Contoh logika: Merah jika < 80, Hijau jika >= 80
        return num >= 80 ? 'bg-[#24c55f] text-white font-bold' : 'bg-[#e65253] text-white font-bold';
    };

    const colors = {
        blue: 'bg-[#3e81f4]',
        red: 'bg-[#e65253]',
        green: 'bg-[#24c55f]',
        gray: 'bg-[#6b717f]',
    };

    const totalRowStyle = "bg-[#cccccc] text-[#464647] font-bold border-slate-400";

    // --- Filter State ---
    const [startDate, setStartDate] = useState(filters.start_date ? new Date(filters.start_date) : null);
    const [endDate, setEndDate] = useState(filters.end_date ? new Date(filters.end_date) : null);

    const handleFilter = () => {
        const query = {};
        if (startDate && endDate) {
            query.start_date = startDate.toISOString().split('T')[0];
            query.end_date = endDate.toISOString().split('T')[0];
        }
        router.get(route('report.hsi'), query, { preserveState: true });
    };

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={<h2 className="font-semibold text-xl text-gray-800 leading-tight">Report HSI</h2>}
        >
            <Head title="Report HSI" />

            <div className="py-6">
                <div className="max-w-[99%] mx-auto sm:px-2 lg:px-4">
                    <div className="bg-white overflow-hidden shadow-xl sm:rounded-lg">
                        
                        {/* HEADER & FILTER */}
                        <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-gray-800 uppercase tracking-wide">
                                Performance Report HSI Per Witel
                            </h3>
                            
                            <div className="flex gap-2 items-center">
                                <DatePicker 
                                    selected={startDate} 
                                    onChange={(date) => setStartDate(date)} 
                                    selectsStart
                                    startDate={startDate}
                                    endDate={endDate}
                                    placeholderText="Start Date"
                                    className="border border-gray-300 rounded text-xs p-1"
                                />
                                <DatePicker 
                                    selected={endDate} 
                                    onChange={(date) => setEndDate(date)} 
                                    selectsEnd
                                    startDate={startDate}
                                    endDate={endDate}
                                    placeholderText="End Date"
                                    className="border border-gray-300 rounded text-xs p-1"
                                />
                                <button onClick={handleFilter} className="bg-blue-600 text-white text-xs px-3 py-1 rounded hover:bg-blue-700">Go</button>
                            </div>
                        </div>

                        <div className="overflow-x-auto max-h-[80vh]">
                            <table className="w-full text-[10px] border-collapse border border-slate-400 text-center font-sans">
                                
                                <thead className="text-white font-bold uppercase tracking-wider sticky top-0 z-20 shadow-sm">
                                    <tr>
                                        <th className={`border border-slate-300 p-2 min-w-[150px] sticky left-0 z-30 ${colors.blue}`} rowSpan={4}>Witel</th>
                                        <th className={`border border-slate-300 p-1 ${colors.blue}`} rowSpan={4}>PRE PI</th>
                                        <th className={`border border-slate-300 p-1 ${colors.blue}`} rowSpan={4}>Registered (RE)</th>
                                        <th className={`border border-slate-300 p-1 ${colors.gray}`} rowSpan={4}>Inpro SC</th>
                                        <th className={`border border-slate-300 p-1 ${colors.gray}`} rowSpan={4}>QC 1</th>
                                        <th className={`border border-slate-300 p-1 ${colors.gray}`} rowSpan={4}>FCC</th>
                                        <th className={`border border-slate-300 p-1 ${colors.red}`} rowSpan={4}>RJCT FCC</th>
                                        <th className={`border border-slate-300 p-1 ${colors.gray}`} rowSpan={4}>Survey Manja</th>
                                        <th className={`border border-slate-300 p-1 ${colors.gray}`} rowSpan={4}>UN-SC</th>
                                        <th className={`border border-slate-300 p-1 ${colors.gray}`} colSpan={13}>OGP</th>
                                        <th className={`border border-slate-300 p-1 ${colors.green}`} rowSpan={4}>JML COMP (PS)</th>
                                        <th className={`border border-slate-300 p-1 ${colors.red}`} colSpan={5}>CANCEL</th>
                                        <th className={`border border-slate-300 p-1 ${colors.red}`} rowSpan={4}>REVOKE</th>
                                        <th className={`border border-slate-300 p-1 ${colors.blue}`} colSpan={3}>PERFORMANCE</th>
                                    </tr>
                                    <tr>
                                        <th className={`border border-slate-300 p-1 ${colors.gray}`} colSpan={3}>PI</th>
                                        <th className={`border border-slate-300 p-1 ${colors.gray}`} rowSpan={3}>TOTAL PI</th>
                                        <th className={`border border-slate-300 p-1 ${colors.gray}`} colSpan={7}>FALLOUT</th>
                                        <th className={`border border-slate-300 p-1 ${colors.gray}`} rowSpan={3}>TOTAL FALLOUT</th>
                                        <th className={`border border-slate-300 p-1 ${colors.gray}`} rowSpan={3}>ACT COMP (QC2)</th>
                                        
                                        <th className={`border border-slate-300 p-1 ${colors.red}`} rowSpan={3}>KNDL Plgn</th>
                                        <th className={`border border-slate-300 p-1 ${colors.red}`} rowSpan={3}>KNDL Teknis</th>
                                        <th className={`border border-slate-300 p-1 ${colors.red}`} rowSpan={3}>KNDL System</th>
                                        <th className={`border border-slate-300 p-1 ${colors.red}`} rowSpan={3}>KNDL Others</th>
                                        <th className={`border border-slate-300 p-1 ${colors.red}`} rowSpan={3}>TOTAL CANCEL</th>

                                        <th className={`border border-slate-300 p-1 ${colors.blue}`} rowSpan={3}>PI/RE</th>
                                        <th className={`border border-slate-300 p-1 ${colors.blue}`} rowSpan={3}>PS/RE</th>
                                        <th className={`border border-slate-300 p-1 ${colors.blue}`} rowSpan={3}>PS/PI</th>
                                    </tr>
                                    <tr>
                                        <th className={`border border-slate-300 p-1 ${colors.gray}`} rowSpan={2}>&lt; 1 Hari</th>
                                        <th className={`border border-slate-300 p-1 ${colors.gray}`} rowSpan={2}>1-3 Hari</th>
                                        <th className={`border border-slate-300 p-1 ${colors.gray}`} rowSpan={2}>&gt; 3 Hari</th>
                                        <th className={`border border-slate-300 p-1 ${colors.gray}`} colSpan={4}>WFM</th>
                                        <th className={`border border-slate-300 p-1 ${colors.gray}`} rowSpan={2}>UIM</th>
                                        <th className={`border border-slate-300 p-1 ${colors.gray}`} rowSpan={2}>ASP</th>
                                        <th className={`border border-slate-300 p-1 ${colors.gray}`} rowSpan={2}>OSM</th>
                                    </tr>
                                    <tr>
                                        <th className={`border border-slate-300 p-1 ${colors.gray}`}>KNDL Plgn</th>
                                        <th className={`border border-slate-300 p-1 ${colors.gray}`}>KNDL Teknis</th>
                                        <th className={`border border-slate-300 p-1 ${colors.gray}`}>KNDL System</th>
                                        <th className={`border border-slate-300 p-1 ${colors.gray}`}>KNDL Others</th>
                                    </tr>
                                </thead>

                                <tbody className="bg-white text-gray-700">
                                    {reportData.map((row, index) => (
                                        <tr 
                                            key={index} 
                                            className={`
                                                transition-colors 
                                                ${row.row_type === 'main' ? 'bg-slate-100' : 'bg-white hover:bg-blue-50'}
                                                ${row.row_type === 'main' ? 'font-bold text-black border-t-2 border-slate-300' : ''}
                                            `}
                                        >
                                            {/* Logic Tampilan Kolom Witel */}
                                            <td className={`border border-slate-300 p-1 text-left sticky left-0 z-10 px-2 
                                                ${row.row_type === 'main' ? 'bg-slate-100 font-extrabold uppercase' : 'bg-inherit pl-6'}
                                            `}>
                                                {row.witel_display}
                                            </td>
                                            
                                            <td className="border border-slate-300 p-1">{formatNumber(row.pre_pi)}</td>
                                            <td className="border border-slate-300 p-1">{formatNumber(row.registered)}</td>
                                            <td className="border border-slate-300 p-1">{formatNumber(row.inprogress_sc)}</td>
                                            <td className="border border-slate-300 p-1">{formatNumber(row.qc1)}</td>
                                            <td className="border border-slate-300 p-1">{formatNumber(row.fcc)}</td>
                                            <td className="border border-slate-300 p-1">{formatNumber(row.cancel_by_fcc)}</td>
                                            <td className="border border-slate-300 p-1">{formatNumber(row.survey_new_manja)}</td>
                                            <td className="border border-slate-300 p-1">{formatNumber(row.unsc)}</td>

                                            <td className="border border-slate-300 p-1">{formatNumber(row.pi_under_1_hari)}</td>
                                            <td className="border border-slate-300 p-1">{formatNumber(row.pi_1_3_hari)}</td>
                                            <td className="border border-slate-300 p-1">{formatNumber(row.pi_over_3_hari)}</td>
                                            <td className="border border-slate-300 p-1 bg-slate-50">{formatNumber(row.total_pi)}</td>
                                            
                                            <td className="border border-slate-300 p-1">{formatNumber(row.fo_wfm_kndl_plgn)}</td>
                                            <td className="border border-slate-300 p-1">{formatNumber(row.fo_wfm_kndl_teknis)}</td>
                                            <td className="border border-slate-300 p-1">{formatNumber(row.fo_wfm_kndl_sys)}</td>
                                            <td className="border border-slate-300 p-1">{formatNumber(row.fo_wfm_others)}</td>
                                            
                                            <td className="border border-slate-300 p-1">{formatNumber(row.fo_uim)}</td>
                                            <td className="border border-slate-300 p-1">{formatNumber(row.fo_asp)}</td>
                                            <td className="border border-slate-300 p-1">{formatNumber(row.fo_osm)}</td>
                                            <td className="border border-slate-300 p-1 bg-slate-50">{formatNumber(row.total_fallout)}</td>
                                            
                                            <td className="border border-slate-300 p-1">{formatNumber(row.act_comp)}</td>
                                            <td className="border border-slate-300 p-1 bg-slate-50">{formatNumber(row.jml_comp_ps)}</td>

                                            <td className="border border-slate-300 p-1">{formatNumber(row.cancel_kndl_plgn)}</td>
                                            <td className="border border-slate-300 p-1">{formatNumber(row.cancel_kndl_teknis)}</td>
                                            <td className="border border-slate-300 p-1">{formatNumber(row.cancel_kndl_sys)}</td>
                                            <td className="border border-slate-300 p-1">{formatNumber(row.cancel_others)}</td>
                                            <td className="border border-slate-300 p-1 bg-slate-50">{formatNumber(row.total_cancel)}</td>

                                            <td className="border border-slate-300 p-1">{formatNumber(row.revoke)}</td>

                                            <td className="border border-slate-300 p-1">{row.pi_re_percent}%</td>
                                            <td className={`border border-slate-300 p-1 ${getPsReColor(row.ps_re_percent)}`}>
                                                {row.ps_re_percent}%
                                            </td>
                                            <td className="border border-slate-300 p-1">{row.ps_pi_percent}%</td>
                                        </tr>
                                    ))}
                                </tbody>

                                <tfoot className="sticky bottom-0 z-20">
                                    <tr className={totalRowStyle}>
                                        <td className="border border-slate-400 p-2 sticky left-0 z-30 bg-[#cccccc]">TOTAL</td>
                                        <td className="border border-slate-400 p-1">{formatNumber(totals.pre_pi)}</td>
                                        <td className="border border-slate-400 p-1">{formatNumber(totals.registered)}</td>
                                        <td className="border border-slate-400 p-1">{formatNumber(totals.inprogress_sc)}</td>
                                        <td className="border border-slate-400 p-1">{formatNumber(totals.qc1)}</td>
                                        <td className="border border-slate-400 p-1">{formatNumber(totals.fcc)}</td>
                                        <td className="border border-slate-400 p-1">{formatNumber(totals.cancel_by_fcc)}</td>
                                        <td className="border border-slate-400 p-1">{formatNumber(totals.survey_new_manja)}</td>
                                        <td className="border border-slate-400 p-1">{formatNumber(totals.unsc)}</td>

                                        <td className="border border-slate-400 p-1">{formatNumber(totals.pi_under_1_hari)}</td>
                                        <td className="border border-slate-400 p-1">{formatNumber(totals.pi_1_3_hari)}</td>
                                        <td className="border border-slate-400 p-1">{formatNumber(totals.pi_over_3_hari)}</td>
                                        <td className="border border-slate-400 p-1">{formatNumber(totals.total_pi)}</td>

                                        <td className="border border-slate-400 p-1">{formatNumber(totals.fo_wfm_kndl_plgn)}</td>
                                        <td className="border border-slate-400 p-1">{formatNumber(totals.fo_wfm_kndl_teknis)}</td>
                                        <td className="border border-slate-400 p-1">{formatNumber(totals.fo_wfm_kndl_sys)}</td>
                                        <td className="border border-slate-400 p-1">{formatNumber(totals.fo_wfm_others)}</td>

                                        <td className="border border-slate-400 p-1">{formatNumber(totals.fo_uim)}</td>
                                        <td className="border border-slate-400 p-1">{formatNumber(totals.fo_asp)}</td>
                                        <td className="border border-slate-400 p-1">{formatNumber(totals.fo_osm)}</td>
                                        <td className="border border-slate-400 p-1">{formatNumber(totals.total_fallout)}</td>
                                        <td className="border border-slate-400 p-1">{formatNumber(totals.act_comp)}</td>

                                        <td className="border border-slate-400 p-1">{formatNumber(totals.jml_comp_ps)}</td>

                                        <td className="border border-slate-400 p-1">{formatNumber(totals.cancel_kndl_plgn)}</td>
                                        <td className="border border-slate-400 p-1">{formatNumber(totals.cancel_kndl_teknis)}</td>
                                        <td className="border border-slate-400 p-1">{formatNumber(totals.cancel_kndl_sys)}</td>
                                        <td className="border border-slate-400 p-1">{formatNumber(totals.cancel_others)}</td>
                                        <td className="border border-slate-400 p-1">{formatNumber(totals.total_cancel)}</td>

                                        <td className="border border-slate-400 p-1">{formatNumber(totals.revoke)}</td>

                                        <td className="border border-slate-400 p-1">{totals.pi_re_percent}%</td>
                                        <td className={`border border-slate-400 p-1 ${getPsReColor(totals.ps_re_percent)}`}>
                                            {totals.ps_re_percent}%
                                        </td>
                                        <td className="border border-slate-400 p-1">{totals.ps_pi_percent}%</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}