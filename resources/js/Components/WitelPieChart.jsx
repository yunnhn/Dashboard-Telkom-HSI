import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

const WitelPieChart = ({ data }) => {
    // Definisi warna yang konsisten
    // Urutan: Antares (Ungu), Netmonk (Hijau), OCA (Kuning), Pijar (Merah)
    const COLORS_MAP = {
        'Antares': '#8b5cf6', // Ungu
        'Netmonk': '#10b981', // Hijau
        'OCA': '#f59e0b',     // Kuning
        'Pijar': '#ef4444',   // Merah
    };
    const DEFAULT_COLORS = ['#3b82f6', '#6366f1', '#ec4899']; // Fallback

    const isDataEmpty = !data || data.length === 0 || data.every(item => item.value === 0);

    if (isDataEmpty) {
        return (
            <div className="flex items-center justify-center w-full h-[300px] text-gray-500 text-center">
                <p>Tidak ada data untuk ditampilkan.</p>
            </div>
        );
    }

    const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
        const RADIAN = Math.PI / 180;
        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
        const x = cx + radius * Math.cos(-midAngle * RADIAN);
        const y = cy + radius * Math.sin(-midAngle * RADIAN);

        if (percent < 0.05) return null;

        return (
            <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" className="text-xs font-bold shadow-sm">
                {`${(percent * 100).toFixed(0)}%`}
            </text>
        );
    };

    return (
        <ResponsiveContainer width="100%" height={300}>
            <PieChart>
                <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={renderCustomizedLabel}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                    nameKey="product"
                >
                    {data.map((entry, index) => (
                        <Cell
                            key={`cell-${index}`}
                            // Gunakan mapping warna agar konsisten
                            fill={COLORS_MAP[entry.product] || DEFAULT_COLORS[index % DEFAULT_COLORS.length]}
                            stroke="#fff"
                            strokeWidth={2}
                        />
                    ))}
                </Pie>
                <Tooltip formatter={(value, name) => [value.toLocaleString('id-ID'), name]} />
                <Legend layout="vertical" verticalAlign="middle" align="right" iconType="circle" />
            </PieChart>
        </ResponsiveContainer>
    );
};

export default WitelPieChart;
