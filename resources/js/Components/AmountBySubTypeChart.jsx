// resources/js/Components/AmountBySubTypeChart.jsx

import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Komponen chart baru untuk menampilkan Jumlah Order
export default function AmountBySubTypeChart({ data }) {
    console.log('Data yang diterima oleh Amount Chart:', data);

    const { chartData, products, colors } = useMemo(() => {
        if (!Array.isArray(data) || data.length === 0) {
            return { chartData: [], products: [], colors: [] };
        }

        const pivotedData = {};
        const productSet = new Set();
        const subTypeOrder = ['AO', 'SO', 'DO', 'MO', 'RO'];

        data.forEach(item => {
            productSet.add(item.product);
            if (!pivotedData[item.sub_type]) {
                pivotedData[item.sub_type] = { sub_type: item.sub_type };
            }
            // [UBAH] Gunakan 'total_amount' dari controller
            pivotedData[item.sub_type][item.product] = item.total_amount;
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

    if (!Array.isArray(data) || data.length === 0) {
        return <div className="text-center text-gray-500 p-8">Tidak ada data order untuk ditampilkan pada periode ini.</div>;
    }

    return (
        <ResponsiveContainer width="100%" height={400}>
            <BarChart
                data={chartData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="sub_type" />
                {/* [UBAH] Hapus formatter Rupiah dari YAxis */}
                <YAxis />
                {/* [UBAH] Ganti format tooltip menjadi angka biasa */}
                <Tooltip formatter={(value, name) => [value, name]} />
                <Legend />
                {products.map(product => (
                    <Bar key={product} dataKey={product} stackId="a" fill={colors[product]} />
                ))}
            </BarChart>
        </ResponsiveContainer>
    );
}
