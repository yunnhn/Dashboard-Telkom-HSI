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

const BarChartUsiaWitelJT = ({ data }) => {

    // Data (dari props) harus berupa array objek:
    // [
    //   { witel: 'WITEL BALI', usia: 150 },
    //   { witel: 'WITEL JATIM BARAT', usia: 210 },
    //   ...
    // ]
    const chartData = {
        labels: data.map(d => d.witel),
        datasets: [
            {
                label: 'Usia Order Tertinggi (Hari)',
                data: data.map(d => d.usia),
                backgroundColor: '#eab308', // Dari 'rgba(54, 162, 235, 0.6)' atau semacamnya
                borderColor: '#ca8a04',
                borderWidth: 1,
            },
        ],
    };

    const options = {
        indexAxis: 'x', // Chart vertikal standar
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false, // Sembunyikan legenda jika hanya 1 dataset
            },
            title: {
                display: true,
                text: 'Usia Order "On Progress" Tertinggi per Witel',
                font: { size: 16 }
            },
        },
        scales: {
            y: {
                beginAtZero: true,
                title: {
                    display: true,
                    text: 'Usia (Hari)'
                }
            },
        },
    };

    return <Bar data={chartData} options={options} />;
};

export default BarChartUsiaWitelJT;
