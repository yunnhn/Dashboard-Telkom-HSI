import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// --- 1. WARNA SPESIFIK (PRIORITAS UTAMA - SESUAI REQUEST) ---
const SPECIFIC_COLORS = {
    // --- WARNA WITEL ---
    'SURAMADU': '#5e83e6',      // Biru
    'JATIM BARAT': '#dfa56b',   // Oranye Pucat
    'JATIM TIMUR': '#a082da',   // Ungu
    'NUSA TENGGARA': '#bbc67a', // Hijau Pucat/Olive
    'BALI': '#73b3c5',          // Cyan Pucat

    // --- WARNA KATEGORI CANCEL / FALLOUT ---
    'NULL': '#5e83e6',          // Biru (Sama dg Suramadu)
    'Null': '#5e83e6',

    'LAINNYA': '#dfa56b',       // Oranye (Sama dg Jatim Barat)
    'ODP FULL': '#a082da',      // Ungu (Sama dg Jatim Timur)
    'ODP JAUH': '#bbc67a',      // Hijau Pucat (Sama dg Nusa Tenggara)
    'TIDAK ADA ODP': '#73b3c5', // Cyan Pucat (Sama dg Bali)

    'DOUBLE INPUT': '#e0c668',  // Kuning Emas
    'BATAL': '#cb7eac',         // Pink/Magenta Pucat
    'KENDALA JALUR/RUTE TARIKAN': '#d2bc92', // Coklat Muda/Beige
    'KENDALA JALUR': '#d2bc92', // Variasi nama pendek
    'GANTI PAKET': '#bdd7e8',   // Biru Muda Langit
    'PENDING': '#6865b2',       // Ungu Gelap/Indigo

    // --- WARNA STATUS UMUM (Jaga-jaga) ---
    'Completed': '#10B981',     // Hijau Standar
    'Open': '#FBBF24',          // Kuning Standar
    'Cancel': '#EF4444',        // Merah Standar
};

// --- 2. PALET WARNA CADANGAN ---
// Urutan warna jika label tidak ditemukan di SPECIFIC_COLORS
const PALETTE_COLORS = [
    '#5e83e6', '#dfa56b', '#a082da', '#bbc67a', '#73b3c5',
    '#e0c668', '#cb7eac', '#d2bc92', '#bdd7e8', '#6865b2'
];

const HsiPieChart = ({ data, title }) => {
    // Validasi Data: Pastikan data ada dan tidak semua nilainya 0
    const safeData = Array.isArray(data) ? data : [];
    const hasValidData = safeData.length > 0 && safeData.some(item => item.value > 0);

    if (!hasValidData) {
        return (
            <div className="flex items-center justify-center w-full h-[300px] text-gray-500 text-center border border-dashed rounded-lg">
                <p>Tidak ada data.</p>
            </div>
        );
    }

    // Custom Label: Menampilkan ANGKA di tengah potongan Pie
    const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, value, percent }) => {
        // Jangan tampilkan label jika nilainya 0 atau potongannya terlalu kecil (< 5%)
        if (value === 0 || percent < 0.05) return null;

        const RADIAN = Math.PI / 180;
        // Hitung posisi label agar berada di tengah radius slice
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
                style={{ pointerEvents: 'none', userSelect: 'none' }}
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
                        data={safeData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={renderCustomizedLabel}
                        outerRadius={110}
                        innerRadius={50} // Efek Donut
                        dataKey="value"
                        nameKey="product"
                        paddingAngle={2} // Jarak antar potongan
                        isAnimationActive={true}
                    >
                        {safeData.map((entry, index) => {
                            const name = entry.product || '';
                            const normalizedName = name.toString().toUpperCase().trim();

                            // --- LOGIKA PEWARNAAN ---
                            // 1. Cek apakah ada di SPECIFIC_COLORS? (Case Insensitive)
                            let finalColor = SPECIFIC_COLORS[normalizedName];

                            // 2. Cek parsial untuk kasus khusus (misal: "KENDALA JALUR...")
                            if (!finalColor) {
                                if (normalizedName.includes('KENDALA JALUR') || normalizedName.includes('RUTE TARIKAN')) {
                                    finalColor = SPECIFIC_COLORS['KENDALA JALUR/RUTE TARIKAN'];
                                }
                            }

                            // 3. Jika tetap tidak ada, ambil dari PALETTE urut
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
                        contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', fontSize: '12px', border: '1px solid #e5e7eb' }}
                        itemStyle={{ color: '#374151' }}
                    />
                    <Legend
                        layout="vertical"
                        verticalAlign="middle"
                        align="right"
                        wrapperStyle={{
                            fontSize: '11px',
                            paddingLeft: '10px',
                            maxHeight: '280px',
                            overflowY: 'auto'
                        }}
                    />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
};

export default HsiPieChart;