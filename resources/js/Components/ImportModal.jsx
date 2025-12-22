import React, { useState } from 'react';
import { useForm } from '@inertiajs/react';

export default function ImportModal({ show, onClose }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        file: null,
        date_format: 'm/d/Y', // Default kita set ke US Format (Bulan/Tanggal) sesuai kasus Anda
    });

    const [isSuccess, setIsSuccess] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();
        
        // Ganti 'dashboard.import' dengan nama route di web.php Anda yang mengarah ke fungsi import tadi
        post(route('dashboard.import'), {
            onSuccess: () => {
                setIsSuccess(true);
                reset();
                // Tutup modal setelah 2 detik (opsional)
                setTimeout(() => {
                    setIsSuccess(false);
                    onClose();
                }, 2000);
            },
        });
    };

    if (!show) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 overflow-hidden">
                
                {/* Header Modal */}
                <div className="bg-gray-100 px-6 py-4 border-b flex justify-between items-center">
                    <h3 className="text-lg font-bold text-gray-800">Upload Data HSI</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 font-bold text-xl">&times;</button>
                </div>

                {/* Body Modal */}
                <div className="p-6">
                    {isSuccess ? (
                        <div className="p-4 bg-green-100 text-green-700 rounded mb-4 text-center">
                            ✅ Berhasil Import Data!
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            
                            {/* INPUT FILE */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">File Excel (.xlsx, .csv)</label>
                                <input
                                    type="file"
                                    onChange={(e) => setData('file', e.target.files[0])}
                                    accept=".xlsx,.xls,.csv"
                                    className="block w-full text-sm text-gray-500
                                        file:mr-4 file:py-2 file:px-4
                                        file:rounded-md file:border-0
                                        file:text-sm file:font-semibold
                                        file:bg-blue-50 file:text-blue-700
                                        hover:file:bg-blue-100 border border-gray-300 rounded-md"
                                />
                                {errors.file && <div className="text-red-500 text-xs mt-1">{errors.file}</div>}
                            </div>

                            {/* --- PILIHAN FORMAT TANGGAL (FITUR UTAMA) --- */}
                            <div className="bg-yellow-50 p-3 rounded-md border border-yellow-200">
                                <label className="block text-sm font-bold text-gray-800 mb-1">
                                    Pilih Format Tanggal Excel
                                </label>
                                <p className="text-xs text-gray-600 mb-2">
                                    Lihat kolom tanggal di Excel Anda. Bagaimana urutannya?
                                </p>
                                
                                <select
                                    value={data.date_format}
                                    onChange={(e) => setData('date_format', e.target.value)}
                                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                                >
                                    {/* Opsi 1: US Format (Kasus Anda: 12/4 = 4 Des) */}
                                    <option value="m/d/Y">Bulan/Tanggal/Tahun (Contoh: 12/31/2025)</option>
                                    
                                    {/* Opsi 2: Indo/UK Format (Kasus Umum: 31/12) */}
                                    <option value="d/m/Y">Tanggal/Bulan/Tahun (Contoh: 31/12/2025)</option>
                                    
                                    {/* Opsi 3: DB Format */}
                                    <option value="Y-m-d">Tahun-Bulan-Tanggal (Contoh: 2025-12-31)</option>
                                </select>
                                {errors.date_format && <div className="text-red-500 text-xs mt-1">{errors.date_format}</div>}
                            </div>
                            {/* ------------------------------------------- */}

                            {/* Tombol Submit */}
                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 text-sm font-medium"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className={`px-4 py-2 rounded text-white text-sm font-bold transition ${processing ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
                                >
                                    {processing ? 'Sedang Mengupload...' : 'Import Data'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}