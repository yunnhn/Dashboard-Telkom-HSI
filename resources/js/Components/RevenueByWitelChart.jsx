import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const formatToJuta = (value) => {
    if (value === 0) return '0';
    return `Rp ${(value / 1000000).toFixed(0)} Jt`;
};

export default function RevenueByWitelChart({ data }) {
    const { chartData, products, colors } = useMemo(() => {
        if (!Array.isArray(data) || data.length === 0) {
            return { chartData: [], products: [], colors: [] };
        }

        const pivotedData = {};
        const productSet = new Set();

        data.forEach(item => {
            // Lewati jika nama_witel null
            if (!item.nama_witel) return;

            productSet.add(item.product);

            if (!pivotedData[item.nama_witel]) {
                pivotedData[item.nama_witel] = { nama_witel: item.nama_witel };
            }
            pivotedData[item.nama_witel][item.product] = item.total_revenue;
        });

        // Urutkan Witel secara Alfabet (A-Z)
        const chartData = Object.values(pivotedData).sort((a, b) =>
            a.nama_witel.localeCompare(b.nama_witel)
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
        return <div className="flex items-center justify-center h-[400px] text-gray-500">Tidak ada data revenue witel.</div>;
    }

    return (
        <ResponsiveContainer width="100%" height={400}>
            <BarChart
                data={chartData}
                margin={{ top: 20, right: 30, left: 50, bottom: 60 }} // Bottom besar agar label witel muat
            >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                    dataKey="nama_witel"
                    angle={-45}
                    textAnchor="end"
                    interval={0}
                    height={70}
                    tick={{fontSize: 11}}
                />
                <YAxis
                    width={80}
                    tickFormatter={formatToJuta}
                    tick={{fontSize: 10}}
                />
                <Tooltip formatter={(value) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(value)} />
                <Legend verticalAlign="top" wrapperStyle={{lineHeight: '40px'}} />
                {products.map(product => (
                    <Bar key={product} dataKey={product} stackId="a" fill={colors[product]} />
                ))}
            </BarChart>
        </ResponsiveContainer>
    );
}
