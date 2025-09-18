// resources/js/Components/StatsCard.jsx
import React from 'react';

export default function StatsCard({ title, value, icon, color }) {
    return (
        <div className="bg-white p-4 rounded-lg shadow-md flex items-center">
            <div className={`p-3 rounded-full mr-4 ${color}`}>
                {icon}
            </div>
            <div>
                <p className="text-sm text-gray-500">{title}</p>
                <p className="text-xl font-bold text-gray-800">{value}</p>
            </div>
        </div>
    );
}
