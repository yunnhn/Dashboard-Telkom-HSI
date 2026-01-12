import React from 'react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer
} from 'recharts';

const TrendLineChartHSI = ({ data }) => {
    // Custom Tooltip agar lebih rapi saat hover
    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white p-3 border border-gray-200 shadow-md rounded text-sm">
                    <p className="font-bold text-gray-700 mb-2">{`Tanggal: ${label}`}</p>
                    <p className="text-blue-600">{`Total Order: ${payload[0].value}`}</p>
                    <p className="text-green-600">{`Completed (PS): ${payload[1].value}`}</p>
                </div>
            );
        }
        return null;
    };

    return (
        <ResponsiveContainer width="100%" height="100%">
            <LineChart
                data={data}
                margin={{
                    top: 20,
                    right: 30,
                    left: 20,
                    bottom: 5,
                }}
            >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12 }}
                    tickMargin={10}
                />
                <YAxis />
                <Tooltip content={<CustomTooltip />} />
                <Legend verticalAlign="top" height={36}/>

                {/* Garis Total Order (Biru) */}
                <Line
                    type="monotone"
                    dataKey="total"
                    name="Total Order (Input)"
                    stroke="#2563eb"
                    strokeWidth={3}
                    activeDot={{ r: 8 }}
                    dot={false}
                />

                {/* Garis Completed PS (Hijau) */}
                <Line
                    type="monotone"
                    dataKey="ps"
                    name="Completed (PS)"
                    stroke="#16a34a"
                    strokeWidth={3}
                    dot={false}
                />
            </LineChart>
        </ResponsiveContainer>
    );
};

export default TrendLineChartHSI;