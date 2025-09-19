// resources/js/Components/WitelPieChart.jsx
import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const WitelPieChart = ({ data }) => {
    if (!data || data.length === 0) {
        return <div className="text-center text-gray-500 p-4">No data available</div>;
    }

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

    return (
        <ResponsiveContainer width="100%" height={300}>
            <PieChart>
                <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    nameKey="nama_witel"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                    {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                </Pie>
                <Tooltip />
                <Legend />
            </PieChart>
        </ResponsiveContainer>
    );
};

export default WitelPieChart;
