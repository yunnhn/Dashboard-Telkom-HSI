import React, { useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';

// Registrasi komponen ChartJS yang dibutuhkan
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export default function SessionSubTypeChart({ data }) {
    // Data yang diterima dari controller: [{product: 'A', segment: 'SME', total: 10}, ...]

    const chartData = useMemo(() => {
        if (!data || data.length === 0) return null;

        // 1. Ambil list Product unik untuk Sumbu Y
        const products = [...new Set(data.map(item => item.product))].sort();

        // 2. Ambil list Segment unik untuk Legend (SME, LEGS, dll)
        const segments = [...new Set(data.map(item => item.segment))].sort();

        // 3. Warna untuk setiap segment
        const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088FE'];

        // 4. Buat Datasets
        const datasets = segments.map((segment, index) => {
            return {
                label: segment, // Legend
                data: products.map(prod => {
                    const found = data.find(d => d.product === prod && d.segment === segment);
                    return found ? found.total : 0;
                }),
                backgroundColor: colors[index % colors.length],
                barThickness: 25, // Ketebalan bar
            };
        });

        return {
            labels: products, // Sumbu Y
            datasets: datasets
        };
    }, [data]);

    const options = {
        indexAxis: 'y', // Horizontal Chart
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'bottom', // Legend di bawah
            },
            tooltip: {
                mode: 'index',
                intersect: false,
            },
        },
        scales: {
            x: {
                stacked: true, // Stacked Bar
                grid: { display: false },
                title: { display: true, text: 'Jumlah' }
            },
            y: {
                stacked: true, // Stacked Bar
                grid: { display: false },
                title: { display: true, text: 'Product' }
            },
        },
    };

    if (!chartData) {
        return <div className="flex items-center justify-center h-full text-gray-500">Tidak ada data segment.</div>;
    }

    return (
        <div style={{ height: '350px' }}>
            <Bar data={chartData} options={options} />
        </div>
    );
}
