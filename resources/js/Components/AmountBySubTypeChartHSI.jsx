import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const AmountBySubTypeChartHSI = ({ data }) => {
    // Warna ungu
    const BAR_COLOR = '#8884d8';

    if (!data || data.length === 0) {
        return (
            <div className="flex items-center justify-center w-full h-full text-gray-400 text-sm">
                Data Kosong
            </div>
        );
    }

    return (
        // Style wrapper agar tidak "offside"
        <div className="w-full h-full" style={{ minHeight: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
                <BarChart
                    data={data}
                    // MARGIN KHUSUS HSI: Bottom besar agar label miring tidak kepotong
                    margin={{ top: 20, right: 30, left: 0, bottom: 50 }}
                >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    
                    <XAxis 
                        dataKey="sub_type" 
                        axisLine={false}
                        tickLine={false}
                        interval={0} 
                        tick={{ 
                            fontSize: 10, 
                            fill: '#6B7280',
                            // KHUSUS HSI: Label dimiringkan karena teksnya panjang-panjang
                            angle: -20, 
                            textAnchor: 'end' 
                        }}
                        height={60} // Tambah tinggi area teks bawah
                    />
                    
                    <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 11, fill: '#6B7280' }}
                    />
                    
                    <Tooltip 
                        cursor={{ fill: '#f3f4f6' }}
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                    />
                    
                    <Bar dataKey="total_amount" radius={[4, 4, 0, 0]}>
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={BAR_COLOR} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};

export default AmountBySubTypeChartHSI;