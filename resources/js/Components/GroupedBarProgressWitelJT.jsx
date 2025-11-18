import React from 'react';
import { Bar } from 'react-chartjs-2';

const WITEL_COLORS = [
    '#EC4899', // WITEL BALI (Pink)
    '#3B82F6', // WITEL JATIM BARAT (Blue)
    '#14B8A6', // WITEL JATIM TIMUR (Teal)
    '#F97316', // WITEL NUSA TENGGARA (Orange)
    '#8B5CF6', // WITEL SURAMADU (Purple)
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
        };
    });

    const chartData = {
        labels: labels,
        datasets: datasets,
    };

    const chartOptions = {
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
        },
        scales: {
            y: {
                beginAtZero: true,
                title: {
                    display: true,
                    text: 'Jumlah LOP'
                }
            },
            x: {
                title: {
                    display: true,
                    text: 'Tahapan Progress'
                },
                ticks: {
                    maxRotation: 25,
                    minRotation: 25,
                    autoSkip: false,
                    padding: 10,
                },

                // ===== PERUBAHAN DI SINI =====

                // 1. BUAT GRUP BAR LEBIH SEMPIT (agar spasi "n" lebih lebar)
                // Coba 0.5 untuk spasi 50%. Anda bisa atur (misal 0.4 atau 0.6)
                categoryPercentage: 0.5, // Ganti dari 0.8 atau 0.6

                // 2. BIARKAN BAR DI DALAM GRUP TETAP RAPAT
                // Angka ini (0.9) membuat bar Witel (pink, biru, dll)
                // tetap rapat di dalam grupnya. JANGAN diubah.
                barPercentage: 0.9,

                // ===== AKHIR PERUBAHAN =====
            }
        },
        // ===== PERUBAHAN JUGA DISINI: Menambah padding bawah untuk chart secara keseluruhan =====
        layout: {
            padding: {
                bottom: 20 // Tambahkan padding di bagian bawah chart
            }
        }
        // ===== AKHIR PERUBAHAN =====
    };

    return <Bar data={chartData} options={chartOptions} />;
};

export default GroupedBarProgressWitelJT;
