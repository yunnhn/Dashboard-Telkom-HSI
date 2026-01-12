import React from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList
} from 'recharts';

// --- 1. DEFINISI MAPPING WARNA SPESIFIK (SESUAI REQUEST) ---
const CATEGORY_COLORS = {
    // KELOMPOK 1: Sesuai Warna Witel/Cancel by FCC
    'Null': '#5e83e6',      // Biru (Sama dg Suramadu)
    'NULL': '#5e83e6',
    'LAINNYA': '#dfa56b',   // Oranye (Sama dg Jatim Barat)
    'ODP FULL': '#a082da',  // Ungu (Sama dg Jatim Timur)
    'ODP JAUH': '#bbc67a',  // Hijau Pucat (Sama dg Nusa Tenggara)
    'TIDAK ADA ODP': '#73b3c5', // Cyan Pucat (Sama dg Bali)

    // KELOMPOK 2: Tambahan Kategori Cancel
    'DOUBLE INPUT': '#e0c668',  // Kuning Emas
    'BATAL': '#cb7eac',         // Pink/Magenta Pucat
    'KENDALA JALUR/RUTE TARIKAN': '#d2bc92', // Coklat Muda/Beige
    'KENDALA TEKNIS': '#d2bc92', // (Opsional) Mapping ke warna yang sama
    'GANTI PAKET': '#bdd7e8',   // Biru Muda Langit
    'PENDING': '#6865b2',       // Ungu Gelap/Indigo
};

const FALLBACK_COLORS = [
    '#64748B', '#94A3B8', '#CBD5E1',
    '#FCA5A5', '#FDBA74', '#FDE047'
];

const StackedBarChart = ({ data, keys, title }) => {
    // Validasi data kosong
    if (!data || data.length === 0 || !keys || keys.length === 0) {
        return (
            <div className="flex items-center justify-center w-full h-full text-gray-500 border border-dashed rounded-lg">
                Tidak ada data untuk ditampilkan.
            </div>
        );
    }

    // --- RENDER LABEL CUSTOM (VALUE ASLI) ---
    // Menampilkan angka asli di tengah bar (tidak dijumlahkan secara visual)
    const renderCustomizedLabel = (props) => {
        const { x, y, width, height, value } = props;

        // Jangan tampilkan jika nilainya 0 atau bar terlalu kecil (height < 12px)
        if (!value || value === 0 || height < 12) return null;

        return (
            <text
                x={x + width / 2}
                y={y + height / 2}
                fill="#fff"
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={10}
                fontWeight="bold"
                style={{
                    textShadow: '0px 0px 2px rgba(0,0,0,0.5)',
                    pointerEvents: 'none',
                    userSelect: 'none'
                }}
            >
                {value}
            </text>
        );
    };

    return (
        <div className="w-full h-full flex flex-col items-center">
            {title && <h4 className="text-sm font-bold text-gray-600 mb-2 uppercase">{title}</h4>}

            <ResponsiveContainer width="100%" height="95%">
                <BarChart
                    data={data}
                    // Margin bottom diperbesar agar label XAxis miring tidak terpotong
                    margin={{ top: 10, right: 10, left: -20, bottom: 60 }}
                >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />

                    <XAxis
                        dataKey="name"
                        fontSize={10}
                        tickLine={false}
                        axisLine={{ stroke: '#e5e7eb' }}
                        interval={0} // Paksa tampilkan semua label
                        angle={-30}  // Miringkan teks
                        textAnchor="end"
                        height={60}
                    />

                    <YAxis
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                    />

                    <Tooltip
                        cursor={{ fill: '#f3f4f6' }}
                        contentStyle={{ backgroundColor: '#fff', borderRadius: '6px', fontSize: '12px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)', border: 'none' }}
                    />

                    <Legend
                        layout="horizontal"
                        align="center"
                        verticalAlign="top"
                        iconType="circle"
                        wrapperStyle={{
                            fontSize: '11px',
                            paddingBottom: '20px'
                        }}
                    />

                    {keys.map((key, index) => {
                        const normalizedKey = String(key).toUpperCase().trim();

                        // 1. Cek warna di CATEGORY_COLORS
                        let barColor = CATEGORY_COLORS[key] || CATEGORY_COLORS[normalizedKey];

                        // 2. Logic Fallback & Kendala
                        if (!barColor) {
                             if (normalizedKey.startsWith('KENDALA')) {
                                 // Jika nama key diawali "KENDALA...", pakai warna Kendala Jalur
                                 barColor = CATEGORY_COLORS['KENDALA JALUR/RUTE TARIKAN'];
                             } else {
                                 // Jika tidak ketemu sama sekali, pakai warna urutan
                                 barColor = FALLBACK_COLORS[index % FALLBACK_COLORS.length];
                             }
                        }

                        return (
                            <Bar
                                key={key}
                                dataKey={key}
                                stackId="a"
                                fill={barColor}
                                barSize={40}
                                radius={[0, 0, 0, 0]}
                            >
                                {/* PENTING: LabelList untuk menampilkan angka asli */}
                                <LabelList
                                    dataKey={key}
                                    content={renderCustomizedLabel}
                                />
                            </Bar>
                        );
                    })}
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};

export default StackedBarChart;