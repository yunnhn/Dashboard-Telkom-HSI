import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// --- 1. DEFINISI MAPPING WARNA SPESIFIK (Sesuai Gambar Referensi) ---
const CATEGORY_COLORS = {
    // Kategori Utama dari Gambar
    'null': '#3B82F6',          // Biru Terang (Bright Blue)
    'LAINNYA': '#0F766E',       // Hijau Tua Teal (Dark Teal)
    'TIDAK ADA ODP': '#06B6D4', // Biru Muda Cyan (Cyan)
    'ODP FULL': '#A855F7',      // Ungu (Purple)
    'ODP JAUH': '#F97316',      // Oranye (Orange)
    'PENDING': '#EAB308',       // Kuning Emas (Yellow Gold)
    'ODP RUSAK': '#B45309',     // Coklat/Oranye Gelap (Dark Orange/Tan)
    'GANTI PAKET': '#EC4899',   // Pink Merah Muda (Pink)
    'DOUBLE INPUT': '#84CC16',  // Hijau Lime (Lime Green)
    'BATAL': '#6366F1',         // Biru Indigo (Indigo)
    'KENDALA JALUR/RUTE TARIKAN': '#7DD3FC', // Biru Langit (Sky Blue) - Asumsi untuk "KENDALA..."
    // Tambahkan variasi lain jika perlu, misalnya:
    'KENDALA TEKNIS': '#7DD3FC',
};

// Warna cadangan (Fallback) jika ada kategori baru yang belum terdaftar di atas
const FALLBACK_COLORS = [
    '#64748B', '#94A3B8', '#CBD5E1', // Variasi Abu-abu
    '#FCA5A5', '#FDBA74', '#FDE047'  // Warna pastel cerah lainnya
];
// -------------------------------------------------------------------


const StackedBarChart = ({ data, keys, title }) => {
    // Validasi data kosong
    if (!data || data.length === 0 || !keys || keys.length === 0) {
        return (
            <div className="flex items-center justify-center w-full h-full text-gray-500 border border-dashed rounded-lg">
                Tidak ada data untuk ditampilkan.
            </div>
        );
    }

    // Fungsi Render Label Angka di Dalam Bar
    const renderCustomizedLabel = (props) => {
        const { x, y, width, height, value } = props;
        // Sembunyikan label jika nilainya 0 atau bar terlalu pendek
        if (!value || value === 0 || height < 12) return null;

        return (
            <text 
                x={x + width / 2} 
                y={y + height / 2} 
                fill="#fff" // Warna teks putih
                textAnchor="middle" 
                dominantBaseline="central"
                fontSize={10}
                fontWeight="bold"
                style={{ 
                    textShadow: '0px 0px 2px rgba(0,0,0,0.5)', // Shadow agar terbaca di warna terang
                    pointerEvents: 'none' 
                }} 
            >
                {value}
            </text>
        );
    };

    return (
        <div className="w-full h-full flex flex-col items-center">
            {/* Judul Grafik */}
            {title && <h4 className="text-sm font-bold text-gray-600 mb-4 uppercase">{title}</h4>}
            
            <ResponsiveContainer width="100%" height="85%">
                <BarChart
                    data={data}
                    margin={{ top: 10, right: 5, left: -10, bottom: 5 }}
                >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis 
                        dataKey="name" 
                        fontSize={11} 
                        tickLine={false}
                        axisLine={{ stroke: '#e5e7eb' }}
                        interval={0} 
                    />
                    <YAxis 
                        fontSize={11} 
                        tickLine={false}
                        axisLine={false}
                    />
                    <Tooltip 
                        cursor={{ fill: '#f3f4f6' }}
                        contentStyle={{ backgroundColor: '#fff', borderRadius: '6px', fontSize: '12px' }}
                    />
                    
                    <Legend 
                        layout="vertical"      
                        align="right"          
                        verticalAlign="middle" 
                        iconType="circle"      
                        wrapperStyle={{ 
                            fontSize: '11px',  
                            paddingLeft: '15px', 
                            maxWidth: '200px', 
                            lineHeight: '18px' 
                        }}
                    />

                    {/* Looping Keys untuk membuat Stacked Bar */}
                    {keys.map((key, index) => {
                        // --- 2. LOGIKA PEMILIHAN WARNA BARU ---
                        // Normalisasi key (ubah ke string & uppercase) agar pencocokan lebih aman
                        const normalizedKey = String(key).toUpperCase().trim();
                        
                        // Coba ambil warna dari map CATEGORY_COLORS.
                        // Jika tidak ada, gunakan warna dari FALLBACK_COLORS berdasarkan urutan (index).
                        let barColor = CATEGORY_COLORS[key] || CATEGORY_COLORS[normalizedKey];
                        
                        if (!barColor) {
                             // Logika pencocokan parsial untuk menangani "KENDALA ..." yang panjang
                             if (normalizedKey.startsWith('KENDALA')) {
                                 barColor = CATEGORY_COLORS['KENDALA JALUR/RUTE TARIKAN'];
                             } else {
                                 barColor = FALLBACK_COLORS[index % FALLBACK_COLORS.length];
                             }
                        }
                        // --------------------------------------

                        return (
                            <Bar 
                                key={key} 
                                dataKey={key} 
                                stackId="a" 
                                fill={barColor} // Gunakan warna yang sudah ditentukan
                                barSize={40} 
                                radius={index === keys.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                                label={renderCustomizedLabel}
                            />
                        );
                    })}
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};

export default StackedBarChart;