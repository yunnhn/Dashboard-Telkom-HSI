// resources/js/Components/ProductRadarChart.jsx

import React from 'react';
// [FIX] Tambahkan Tooltip dan Legend ke dalam import
import { Radar, RadarChart, PolarGrid, Legend, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';

const ProductRadarChart = ({ data }) => {
    if (!data || data.length === 0) {
        return <div className="text-center text-gray-500 p-4">No data available</div>;
    }

    const witelColors = {
        'BALI': '#8884d8',
        'JATIM BARAT': '#82ca9d',
        'JATIM TIMUR': '#ffc658',
        'NUSA TENGGARA': '#ff8042',
        'SURAMADU': '#0088FE',
    };

    return (
        <ResponsiveContainer width="100%" height={300}>
            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
                <PolarGrid />
                <PolarAngleAxis dataKey="product_name" />
                <PolarRadiusAxis />
                <Tooltip />
                <Legend />
                {Object.keys(witelColors).map(witel => (
                    <Radar key={witel} name={witel} dataKey={witel} stroke={witelColors[witel]} fill={witelColors[witel]} fillOpacity={0.6} />
                ))}
            </RadarChart>
        </ResponsiveContainer>
    );
};

export default ProductRadarChart;
