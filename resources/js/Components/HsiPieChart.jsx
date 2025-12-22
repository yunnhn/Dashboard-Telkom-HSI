import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const HsiPieChart = ({ data, title }) => {
    // --- PERBAIKAN DI SINI: MAPPING WARNA KONSISTEN ---
    // Kita gunakan object untuk mengunci warna berdasarkan nama Witel.
    // Warna ini dicocokkan agar mirip dengan referensi gambar yang Anda berikan.
    const WITEL_COLORS = {
        'SURAMADU': '#3B82F6',      // Biru Terang
        'JATIM TIMUR': '#F97316',   // Oranye
        'JATIM BARAT': '#A855F7',   // Ungu
        'NUSA TENGGARA': '#84CC16', // Hijau Lime/Olive
        'BALI': '#06B6D4',          // Cyan/Teal
        'Completed': '#10B981',     // (Opsional) Untuk chart Status Hijau
        'Open': '#FBBF24',          // (Opsional) Untuk chart Status Kuning
        'Cancel': '#EF4444',        // (Opsional) Untuk chart Status Merah
        'DEFAULT': '#9CA3AF'        // Fallback (Abu-abu) jika ada nama baru tak dikenal
    };
    // --------------------------------------------------


    // Cek data kosong
    if (!data || data.length === 0 || data.every(item => item.value === 0)) {
        return (
            <div className="flex items-center justify-center w-full h-[300px] text-gray-500 text-center border border-dashed rounded-lg">
                <p>Tidak ada data.</p>
            </div>
        );
    }

    // Custom Label: Menampilkan ANGKA (sama seperti sebelumnya)
    const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, value }) => {
        const RADIAN = Math.PI / 180;
        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
        const x = cx + radius * Math.cos(-midAngle * RADIAN);
        const y = cy + radius * Math.sin(-midAngle * RADIAN);

        if (value === 0) return null;

        return (
            <text 
                x={x} 
                y={y} 
                fill="white" 
                textAnchor="middle" 
                dominantBaseline="central" 
                className="text-[10px] font-bold drop-shadow-md"
            >
                {value.toLocaleString('id-ID')}
            </text>
        );
    };

    return (
        <div className="w-full h-full flex flex-col items-center">
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
                        innerRadius={50}
                        dataKey="value"
                        // 'product' adalah key yang dikirim controller berisi nama Witel (contoh: 'SURAMADU')
                        nameKey="product" 
                    >
                        {data.map((entry, index) => {
                            // --- PERBAIKAN LOGIKA PEMILIHAN WARNA ---
                            // Ambil nama witel dari data saat ini (entry.product)
                            const witelName = entry.product;
                            // Cari warnanya di map WITEL_COLORS. Jika tidak ada, pakai warna DEFAULT.
                            const color = WITEL_COLORS[witelName] || WITEL_COLORS['DEFAULT'];

                            return (
                                <Cell 
                                    key={`cell-${index}`} 
                                    fill={color} // Gunakan warna yang sudah dipetakan
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
                        wrapperStyle={{ fontSize: '11px', paddingLeft: '10px' }}
                    />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
};

export default HsiPieChart;