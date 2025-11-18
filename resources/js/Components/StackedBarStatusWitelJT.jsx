import React from 'react';
import { Bar } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
} from 'chart.js';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
);

const StackedBarStatusWitelJT = ({ data }) => {

    // Data (dari props) harus berupa array objek:
    // [
    //   { witel: 'WITEL BALI', golive: 80, blmGolive: 8, drop: 5 },
    //   { witel: 'WITEL JATIM BARAT', golive: 153, blmGolive: 8, drop: 4 },
    //   ...
    // ]
    const chartData = {
        labels: data.map(d => d.witel),
        datasets: [
            {
                label: 'GOLIVE',
                data: data.map(d => d.golive),
                backgroundColor: '#228B22', // Hijau
            },
            {
                label: 'BELUM GOLIVE',
                data: data.map(d => d.blmGolive),
                backgroundColor: '#DAA520', // Emas/Oranye
            },
            {
                label: 'DROP',
                data: data.map(d => d.drop),
                backgroundColor: '#B22222', // Merah
            },
        ],
    };

    const options = {
        indexAxis: 'y', // Membuat chart menjadi horizontal
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top',
            },
            title: {
                display: true,
                text: 'Status LOP per Witel Induk',
                font: { size: 16 }
            },
            tooltip: {
                mode: 'index',
                intersect: false,
            },
        },
        scales: {
            x: {
                stacked: true, // Menumpuk pada sumbu X
            },
            y: {
                stacked: true, // Menumpuk pada sumbu Y
            },
        },
    };

    return <Bar data={chartData} options={options} />;
};

export default StackedBarStatusWitelJT;
