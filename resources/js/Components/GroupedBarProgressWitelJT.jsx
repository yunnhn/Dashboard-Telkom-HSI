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

// UBAH WARNA DISINI: Menggunakan Gradasi Kuning/Emas (Gold)
// Agar senada dengan grafik "Top 3 On Progress"
const WITEL_COLORS = [
    '#854d0e', // WITEL 1: Yellow-800 (Paling Gelap / Bawah)
    '#a16207', // WITEL 2: Yellow-700
    '#ca8a04', // WITEL 3: Yellow-600
    '#eab308', // WITEL 4: Yellow-500
    '#fde047', // WITEL 5: Yellow-300 (Paling Cerah / Atas)
];

const GroupedBarProgressWitelJT = ({ data }) => {
    const labels = ['INITIAL', 'SURVEY & DRM', 'PERIZINAN & MOS', 'INSTALASI', 'FI-OGP LIVE'];

    const datasets = data.map((witelData, index) => {
        return {
            label: witelData.witel,
            data: [
                witelData.initial,
                witelData.survey_drm,
                witelData.perizinan_mos,
                witelData.instalasi,
                witelData.fi_ogp_live,
            ],
            backgroundColor: WITEL_COLORS[index % WITEL_COLORS.length],
            borderColor: '#ffffff',
            borderWidth: 1,
        };
    });

    const chartData = {
        labels: labels,
        datasets: datasets,
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            title: {
                display: true,
                text: 'Perbandingan Progress Deploy per Witel',
                font: { size: 16 },
                padding: { bottom: 20 }
            },
            legend: {
                position: 'bottom',
            },
            tooltip: {
                mode: 'index',
                intersect: false,
            }
        },
        scales: {
            x: {
                stacked: true,
                title: {
                    display: true,
                    text: 'Tahapan Progress'
                },
                grid: {
                    display: false
                }
            },
            y: {
                stacked: true,
                beginAtZero: true,
                title: {
                    display: true,
                    text: 'Jumlah LOP'
                }
            },
        },
        layout: {
            padding: { bottom: 20 }
        }
    };

    return <Bar data={chartData} options={options} />;
};

export default GroupedBarProgressWitelJT;
