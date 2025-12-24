import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// --- 1. DEFINISI MAPPING WARNA SPESIFIK ---
const CATEGORY_COLORS = {
    'Null': '#3B82F6',      // Biru Terang (Bright Blue) - Sesuai Backend 'Null'
    'LAINNYA': '#0F766E',   
    'TIDAK ADA ODP': '#06B6D4', 
    'ODP FULL': '#A855F7',   
    'ODP JAUH': '#F97316',   
    'PENDING': '#EAB308',    
    'ODP RUSAK': '#B45309',  
    'GANTI PAKET': '#EC4899',
    'DOUBLE INPUT': '#84CC16',
    'BATAL': '#6366F1',      
    'KENDALA JALUR/RUTE TARIKAN': '#7DD3FC', 
    'KENDALA TEKNIS': '#7DD3FC',
};

const FALLBACK_COLORS = [
    '#64748B', '#94A3B8', '#CBD5E1', 
    '#FCA5A5', '#FDBA74', '#FDE047'  
];

const StackedBarChart = ({ data, keys, title }) => {
    if (!data || data.length === 0 || !keys || keys.length === 0) {
        return (
            <div className="flex items-center justify-center w-full h-full text-gray-500 border border-dashed rounded-lg">
                Tidak ada data untuk ditampilkan.
            </div>
        );
    }

    const renderCustomizedLabel = (props) => {
        const { x, y, width, height, value } = props;
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
                    pointerEvents: 'none' 
                }} 
            >
                {value}
            </text>
        );
    };

    return (
        <div className="w-full h-full flex flex-col items-center">
            {title && <h4 className="text-sm font-bold text-gray-600 mb-2 uppercase">{title}</h4>}
            
            <ResponsiveContainer width="100%" height="90%">
                <BarChart
                    data={data}
                    // Tambahkan margin bottom agar teks miring tidak terpotong
                    margin={{ top: 10, right: 5, left: -10, bottom: 20 }} 
                >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    
                    {/* --- PERBAIKAN DI SINI (XAxis) --- */}
                    <XAxis 
                        dataKey="name" 
                        fontSize={10} // Perkecil sedikit font
                        tickLine={false}
                        axisLine={{ stroke: '#e5e7eb' }}
                        interval={0} // Paksa tampilkan semua label
                        angle={-30}  // Miringkan teks 30 derajat
                        textAnchor="end" // Jangkar di ujung agar rapi saat miring
                        height={60} // Beri ruang tinggi ekstra untuk teks miring
                    />
                    
                    <YAxis 
                        fontSize={11} 
                        tickLine={false}
                        axisLine={false}
                    />
                    <Tooltip 
                        cursor={{ fill: '#f3f4f6' }}
                        contentStyle={{ backgroundColor: '#fff', borderRadius: '6px', fontSize: '12px', zIndex: 100 }}
                    />
                    
                    <Legend 
                        layout="vertical"      
                        align="right"          
                        verticalAlign="middle" 
                        iconType="circle"      
                        wrapperStyle={{ 
                            fontSize: '11px',  
                            paddingLeft: '15px', 
                            maxWidth: '120px', // Batasi lebar legend agar grafik lebih luas
                            lineHeight: '18px' 
                        }}
                    />

                    {keys.map((key, index) => {
                        const normalizedKey = String(key).toUpperCase().trim();
                        let barColor = CATEGORY_COLORS[key] || CATEGORY_COLORS[normalizedKey];
                        
                        if (!barColor) {
                             if (normalizedKey.startsWith('KENDALA')) {
                                 barColor = CATEGORY_COLORS['KENDALA JALUR/RUTE TARIKAN'];
                             } else {
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