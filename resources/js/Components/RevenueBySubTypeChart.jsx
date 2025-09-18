// resources/js/Components/RevenueBySubTypeChart.jsx

import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const formatToJuta = (value) => {
    if (value === 0) return '0';
    return `Rp ${(value / 1000000).toFixed(2)} Jt`;
};

export default function RevenueBySubTypeChart({ data }) {
    // Baris ini akan membantu Anda melihat tipe data asli di console browser (Tekan F12)
    console.log('Data yang diterima oleh Chart:', data);

    const { chartData, products, colors } = useMemo(() => {
        // [PERBAIKAN] Menggunakan Array.isArray() untuk pengecekan yang lebih aman
        if (!Array.isArray(data) || data.length === 0) {
            return { chartData: [], products: [], colors: [] };
        }

        const pivotedData = {};
        const productSet = new Set();
        const subTypeOrder = ['AO', 'SO', 'DO', 'MO', 'RO'];

        // Baris ini sekarang aman karena sudah melewati pengecekan Array.isArray()
        data.forEach(item => {
            productSet.add(item.product);
            if (!pivotedData[item.sub_type]) {
                pivotedData[item.sub_type] = { sub_type: item.sub_type };
            }
            pivotedData[item.sub_type][item.product] = item.total_revenue;
        });

        subTypeOrder.forEach(subType => {
            if (!pivotedData[subType]) {
                pivotedData[subType] = { sub_type: subType };
            }
        });

        const chartData = Object.values(pivotedData).sort((a, b) =>
            subTypeOrder.indexOf(a.sub_type) - subTypeOrder.indexOf(b.sub_type)
        );

        const products = Array.from(productSet);

        const colorPalette = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088FE', '#00C49F', '#FFBB28'];
        const colors = products.reduce((acc, product, index) => {
            acc[product] = colorPalette[index % colorPalette.length];
            return acc;
        }, {});

        return { chartData, products, colors };
    }, [data]);

    // [PERBAIKAN] Pengecekan di sini juga diubah menjadi Array.isArray()
    if (!Array.isArray(data) || data.length === 0) {
        return <div className="text-center text-gray-500 p-8">Tidak ada data revenue untuk ditampilkan pada periode ini.</div>;
    }

    return (
        <ResponsiveContainer width="100%" height={400}>
            <BarChart
                data={chartData}
                margin={{ top: 20, right: 30, left: 50, bottom: 5 }}
            >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="sub_type" />
                <YAxis tickFormatter={formatToJuta} />
                <Tooltip formatter={(value) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(value)} />
                <Legend />
                {products.map(product => (
                    <Bar key={product} dataKey={product} stackId="a" fill={colors[product]} />
                ))}
            </BarChart>
        </ResponsiveContainer>
    );
}
