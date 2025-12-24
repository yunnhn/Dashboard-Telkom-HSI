import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// --- 1. WARNA SPESIFIK (PRIORITAS UTAMA) ---
// Digunakan untuk Witel Besar & Status agar warnanya tetap konsisten sesuai request Anda.
const SPECIFIC_COLORS = {
    'SURAMADU': '#3B82F6',      // Biru Terang
    'JATIM TIMUR': '#F97316',   // Oranye
    'JATIM BARAT': '#A855F7',   // Ungu
    'NUSA TENGGARA': '#84CC16', // Hijau Lime/Olive
    'BALI': '#06B6D4',          // Cyan/Teal
    'JAWA TIMUR': '#EAB308',    // Kuning (Jaga-jaga jika ada label Jawa Timur)
    
    // Warna Status (Untuk chart komposisi)
    'Completed': '#10B981',     // Hijau
    'Open': '#FBBF24',          // Kuning
    'Cancel': '#EF4444',        // Merah
};

// --- 2. PALET WARNA CADANGAN (UNTUK DISTRIK / WITEL OLD) ---
// Jika nama wilayah TIDAK ADA di SPECIFIC_COLORS (misal: "JEMBER", "MATARAM"),
// maka warna diambil dari sini secara berurutan agar tetap warna-warni.
const PALETTE_COLORS = [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
    '#EC4899', '#6366F1', '#14B8A6', '#F97316', '#84CC16',
    '#06B6D4', '#D946EF', '#EAB308', '#64748B', '#A855F7',
    '#FB7185', '#2DD4BF', '#FB923C', '#A3E635', '#60A5FA',
];

const HsiPieChart = ({ data, title }) => {
    // Cek data kosong
    if (!data || data.length === 0 || data.every(item => item.value === 0)) {
        return (
            <div className="flex items-center justify-center w-full h-[300px] text-gray-500 text-center border border-dashed rounded-lg">
                <p>Tidak ada data.</p>
            </div>
        );
    }

    // Custom Label: Menampilkan ANGKA
    const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, value, percent }) => {
        // Jangan tampilkan label jika nilainya 0 atau potongannya terlalu kecil (< 5%)
        if (value === 0 || percent < 0.05) return null;

        const RADIAN = Math.PI / 180;
        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
        const x = cx + radius * Math.cos(-midAngle * RADIAN);
        const y = cy + radius * Math.sin(-midAngle * RADIAN);

        return (
            <text 
                x={x} 
                y={y} 
                fill="white" 
                textAnchor="middle" 
                dominantBaseline="central" 
                className="text-[10px] font-bold drop-shadow-md"
                style={{ pointerEvents: 'none' }}
            >
                {value.toLocaleString('id-ID')}
            </text>
        );
    };

    return (
        <div className="w-full h-full flex flex-col items-center">
            {/* Judul Opsional di dalam komponen */}
            {title && <h4 className="text-sm font-bold text-gray-600 mb-2 uppercase">{title}</h4>}
            
            <ResponsiveContainer width="100%" height={320}>
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={renderCustomizedLabel}
                        outerRadius={110}
                        innerRadius={50} // Efek Donut
                        dataKey="value"
                        nameKey="product" 
                        paddingAngle={2} // Jarak antar potongan
                    >
                        {data.map((entry, index) => {
                            const name = entry.product;
                            
                            // --- LOGIKA GABUNGAN ---
                            // 1. Cek apakah ada di SPECIFIC_COLORS?
                            let finalColor = SPECIFIC_COLORS[name];

                            // 2. Jika tidak ada (berarti ini Distrik/Witel Old), ambil dari PALETTE
                            if (!finalColor) {
                                finalColor = PALETTE_COLORS[index % PALETTE_COLORS.length];
                            }

                            return (
                                <Cell 
                                    key={`cell-${index}`} 
                                    fill={finalColor} 
                                    stroke="#fff"
                                    strokeWidth={2}
                                />
                            );
                        })}
                    </Pie>
                    <Tooltip 
                        formatter={(value) => value.toLocaleString('id-ID')}
                        contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', fontSize: '12px' }}
                    />
                    <Legend 
                        layout="vertical" 
                        verticalAlign="middle" 
                        align="right"
                        wrapperStyle={{ 
                            fontSize: '11px', 
                            paddingLeft: '10px',
                            maxHeight: '280px', // Scroll jika distrik banyak
                            overflowY: 'auto'
                        }}
                    />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
};

export default HsiPieChart;