import React from 'react';
import { Pie } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    ArcElement,
    Tooltip,
    Legend,
    Title
} from 'chart.js';
// Jika Anda ingin menampilkan angka di dalam chart seperti screenshot Anda,
// Anda perlu mendaftarkan 'chartjs-plugin-datalabels'
// import ChartDataLabels from 'chartjs-plugin-datalabels';
// ChartJS.register(ArcElement, Tooltip, Legend, Title, ChartDataLabels);

ChartJS.register(ArcElement, Tooltip, Legend, Title);

const PieChartStatusLiveJT = ({ data }) => {

    // Data (dari props) harus berupa objek seperti:
    // { doneGolive: 457, blmGolive: 62, drop: 30 }
    const chartData = {
        labels: [
            `DONE GOLIVE (${data.doneGolive || 0})`,
            `BLM GOLIVE (${data.blmGolive || 0})`,
            `DROP (${data.drop || 0})`
        ],
        datasets: [
            {
                label: 'Jumlah LOP',
                data: [
                    data.doneGolive || 0,
                    data.blmGolive || 0,
                    data.drop || 0,
                ],
                backgroundColor: [
                    '#228B22', // Hijau (Done Golive)
                    '#DAA520', // Emas/Oranye (Belum Golive)
                    '#B22222', // Merah (Drop)
                ],
                borderColor: [
                    '#ffffff',
                    '#ffffff',
                    '#ffffff',
                ],
                borderWidth: 2,
            },
        ],
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
                text: 'Ringkasan Status Total LOP',
                font: { size: 16 }
            },
            // Opsi untuk 'chartjs-plugin-datalabels' (jika Anda menginstalnya)
            // datalabels: {
            //     formatter: (value, ctx) => {
            //         const sum = ctx.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
            //         const percentage = ((value / sum) * 100).toFixed(1) + '%';
            //         return `${value}\n(${percentage})`;
            //     },
            //     color: '#fff',
            //     font: { weight: 'bold', size: 12 }
            // }
            tooltip: {
                callbacks: {
                    label: function (context) {
                        let label = context.dataset.label || '';
                        if (label) {
                            label += ': ';
                        }
                        const value = context.parsed;
                        const sum = context.dataset.data.reduce((a, b) => a + b, 0);
                        const percentage = ((value / sum) * 100).toFixed(1) + '%';
                        label += `${value} (${percentage})`;
                        return label;
                    }
                }
            }
        },
    };

    return <Pie data={chartData} options={options} />;
};

export default PieChartStatusLiveJT;
