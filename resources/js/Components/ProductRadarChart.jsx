import React, { useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export default function ProductRadarChart({ data }) {
    // data structure: [{product: 'Antares', channel: 'NCX', total: 5}, ...]

    const chartData = useMemo(() => {
        if (!data || data.length === 0) return null;

        const products = [...new Set(data.map(item => item.product))].sort();
        const channels = [...new Set(data.map(item => item.channel))].sort();

        // [FIX] Warna Tetap agar grafik tidak berubah warna saat filter
        const channelColors = {
            'NCX': '#3b82f6',      // Biru
            'SC-One': '#ef4444',   // Merah
            'Unmapped': '#9ca3af', // Abu-abu
        };
        const defaultColors = ['#10b981', '#f59e0b', '#8b5cf6'];

        const datasets = channels.map((channelName, index) => {
            return {
                label: channelName,
                data: products.map(prod => {
                    const found = data.find(d => d.product === prod && d.channel === channelName);
                    return found ? found.total : 0;
                }),
                // Gunakan mapping warna, fallback ke default
                backgroundColor: channelColors[channelName] || defaultColors[index % defaultColors.length],
                barThickness: 25,
                borderRadius: 4,
            };
        });

        return {
            labels: products,
            datasets: datasets
        };
    }, [data]);

    const options = {
        indexAxis: 'y', // Horizontal Bar
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { position: 'bottom' },
            tooltip: { mode: 'index', intersect: false }
        },
        scales: {
            x: { stacked: true, grid: { display: false } },
            y: { stacked: true, grid: { display: false } },
        },
    };

    if (!chartData) return <div className="flex items-center justify-center h-full text-gray-500 text-sm">Tidak ada data channel.</div>;

    return (
        <div style={{ height: '300px' }}>
            <Bar data={chartData} options={options} />
        </div>
    );
}