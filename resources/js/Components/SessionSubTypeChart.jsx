// resources/js/Components/SessionSubTypeChart.jsx

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, LabelList } from 'recharts';

const SessionSubTypeChart = ({ data }) => {
    if (!data) {
        return <div className="text-center text-gray-500 p-4">Loading...</div>;
    }

    const totalAll = data.reduce((acc, entry) => acc + entry.total, 0);

    const chartData = data.map(item => ({
        ...item,
        percentage: totalAll > 0 ? ((item.total / totalAll) * 100).toFixed(2) : 0,
    }));

    const colors = ['#8884d8', '#ff8042', '#ffc658', '#e83e8c', '#82ca9d'];

    const renderCustomizedLabel = (props) => {
        const { x, y, width, height, payload } = props;

        // [FIX] Tambahkan pengecekan 'payload' untuk menghindari error
        if (payload && payload.total > 0) {
            return (
                <g>
                    <text x={x + width + 10} y={y + height / 2} fill="#666" textAnchor="start" dominantBaseline="middle">
                        {payload.total}  ({payload.percentage}%)
                    </text>
                </g>
            );
        }
        return null;
    };

    return (
        <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 100, left: 10, bottom: 5 }}>
                <XAxis type="number" hide />
                <YAxis
                    dataKey="sub_type"
                    type="category"
                    axisLine={false}
                    tickLine={false}
                    width={40}
                    tick={{ fill: '#333', fontWeight: 'bold' }}
                />
                <Bar dataKey="total" barSize={20} radius={[10, 10, 10, 10]}>
                    {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                    ))}
                    <LabelList dataKey="total" content={renderCustomizedLabel} />
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );
};

export default SessionSubTypeChart;
