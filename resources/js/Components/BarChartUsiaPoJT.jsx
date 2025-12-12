import React, { useMemo } from 'react';
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

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const BarChartUsiaPoJT = ({ data }) => {
    const chartData = useMemo(() => {
        // 1. Siapkan Labels unik (Menggunakan fixed_po_name sesuai kode Anda yang jalan)
        if (!data) return { labels: [], datasets: [] };

        const labels = [...new Set(data.map(d => d.fixed_po_name))].sort();

        // 2. Siapkan Array
        const rank1Data = [], rank1Project = [];
        const rank2Data = [], rank2Project = [];
        const rank3Data = [], rank3Project = [];

        labels.forEach(label => {
            // Cari data rank 1, 2, 3 berdasarkan fixed_po_name
            const r1 = data.find(d => d.fixed_po_name === label && d.rank == 1);
            const r2 = data.find(d => d.fixed_po_name === label && d.rank == 2);
            const r3 = data.find(d => d.fixed_po_name === label && d.rank == 3);

            // Masukkan Angka & Nama Proyek
            rank1Data.push(r1 ? parseInt(r1.usia) : 0);
            rank1Project.push(r1 ? r1.uraian_kegiatan : '-');

            rank2Data.push(r2 ? parseInt(r2.usia) : 0);
            rank2Project.push(r2 ? r2.uraian_kegiatan : '-');

            rank3Data.push(r3 ? parseInt(r3.usia) : 0);
            rank3Project.push(r3 ? r3.uraian_kegiatan : '-');
        });

        return {
            labels: labels,
            datasets: [
                // Rank 3: Hijau (Paling Kiri/Bawah)
                {
                    label: 'Rank 3',
                    data: rank3Data,
                    projects: rank3Project,
                    backgroundColor: '#22c55e', // Hijau
                    borderWidth: 1,
                    barThickness: 15, // Membuat batang lebih ramping (memberi jarak)
                    maxBarThickness: 20,
                },
                // Rank 2: Kuning (Tengah)
                {
                    label: 'Rank 2',
                    data: rank2Data,
                    projects: rank2Project,
                    backgroundColor: '#eab308', // Kuning
                    borderWidth: 1,
                    barThickness: 15,
                    maxBarThickness: 20,
                },
                // Rank 1: Merah (Paling Kanan/Atas)
                {
                    label: 'Rank 1 (Tertinggi)',
                    data: rank1Data,
                    projects: rank1Project,
                    backgroundColor: '#ef4444', // Merah
                    borderWidth: 1,
                    barThickness: 15,
                    maxBarThickness: 20,
                },
            ],
        };
    }, [data]);

    const options = {
        indexAxis: 'y', // Horizontal Bar Chart
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: true, position: 'bottom' },
            title: {
                display: true,
                text: 'Top 3 Usia Order Tertinggi per PO',
                font: { size: 16 }
            },
            tooltip: {
                callbacks: {
                    label: function(context) {
                        const val = context.raw;
                        if (val === 0) return null; // Sembunyikan tooltip jika nilai 0
                        const proj = context.dataset.projects[context.dataIndex];
                        return `${context.dataset.label}: ${val} Hari (${proj})`;
                    }
                }
            }
        },
        scales: {
            x: {
                stacked: true,
                beginAtZero: true,
                title: { display: true, text: 'Usia (Hari)' }
            },
            y: {
                stacked: true,
                ticks: {
                    autoSkip: false, // Pastikan semua label PO muncul
                    font: { size: 11 } // Ukuran font label sedikit diperkecil agar muat
                }
            },
        },
        layout: {
            padding: {
                left: 10,
                right: 20, // Memberi ruang di kanan
                top: 10,
                bottom: 10
            }
        }
    };

    return (
        <div className="h-full w-full">
            <Bar data={chartData} options={options} />
        </div>
    );
};

export default BarChartUsiaPoJT;
