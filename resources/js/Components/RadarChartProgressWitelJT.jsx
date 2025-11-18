import React from 'react';
import { Radar } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    RadialLinearScale,
    PointElement,
    LineElement,
    Filler,
    Tooltip,
    Legend,
    Title
} from 'chart.js';

ChartJS.register(
    RadialLinearScale,
    PointElement,
    LineElement,
    Filler,
    Tooltip,
    Legend,
    Title
);

// Warna dasar untuk dataset
const CHART_COLORS = [
    'rgba(255, 99, 132, 0.4)',
    'rgba(54, 162, 235, 0.4)',
    'rgba(255, 206, 86, 0.4)',
    'rgba(75, 192, 192, 0.4)',
    'rgba(153, 102, 255, 0.4)',
    'rgba(255, 159, 64, 0.4)'
];
const CHART_BORDER_COLORS = [
    'rgb(255, 99, 132)',
    'rgb(54, 162, 235)',
    'rgb(255, 206, 86)',
    'rgb(75, 192, 192)',
    'rgb(153, 102, 255)',
    'rgb(255, 159, 64)'
];

const RadarChartProgressWitelJT = ({ data }) => {

    // Data (dari props) harus berupa array objek:
    // [
    //   { witel: 'WITEL BALI', initial: 5, survey_drm: 2, perizinan_mos: 1, ... },
    //   { witel: 'WITEL JATIM BARAT', initial: 10, survey_drm: 1, ... },
    //   ...
    // ]

    // Sumbu/Label untuk Radar Chart
    const labels = ['INITIAL', 'SURVEY & DRM', 'PERIZINAN & MOS', 'INSTALASI', 'FI-OGP LIVE'];
    // Kunci data yang sesuai (dari controller)
    const dataKeys = ['initial', 'survey_drm', 'perizinan_mos', 'instalasi', 'fi_ogp_live'];

    const chartData = {
        labels: labels,
        datasets: data.map((item, index) => ({
            label: item.witel,
            data: dataKeys.map(key => item[key] || 0),
            backgroundColor: CHART_COLORS[index % CHART_COLORS.length],
            borderColor: CHART_BORDER_COLORS[index % CHART_BORDER_COLORS.length],
            borderWidth: 1,
            fill: true,
        })),
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top',
            },
            title: {
                display: true,
                text: 'Perbandingan Progress Deploy per Witel',
                font: { size: 16 }
            },
        },
        scales: {
            r: { // Sumbu radial (angka)
                beginAtZero: true,
                ticks: {
                    stepSize: 1 // Jika jumlahnya kecil, step 1 lebih baik
                }
            }
        },
    };

    return <Radar data={chartData} options={options} />;
};

export default RadarChartProgressWitelJT;
