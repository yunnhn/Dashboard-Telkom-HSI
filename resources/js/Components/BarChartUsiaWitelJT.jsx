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

const BarChartUsiaWitelJT = ({ data }) => {
    const chartData = useMemo(() => {
        // 1. Siapkan Labels unik
        // Pastikan data ada sebelum di-map
        if (!data) return { labels: [], datasets: [] };

        const labels = [...new Set(data.map(d => d.witel_induk))].sort();

        // 2. Siapkan Array untuk Data (Angka) dan Project (String) secara terpisah
        const rank1Data = [], rank1Project = [];
        const rank2Data = [], rank2Project = [];
        const rank3Data = [], rank3Project = [];

        labels.forEach(label => {
            // Cari data rank 1, 2, 3. Gunakan '==' untuk loose equality (jika rank string/number)
            const r1 = data.find(d => d.witel_induk === label && d.rank == 1);
            const r2 = data.find(d => d.witel_induk === label && d.rank == 2);
            const r3 = data.find(d => d.witel_induk === label && d.rank == 3);

            // Masukkan Angka ke Data, dan Nama Proyek ke Array terpisah
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
                // URUTAN DIBALIK: Dari Rank 3 (Hijau) -> Rank 2 (Kuning) -> Rank 1 (Merah)
                {
                    label: 'Rank 3',
                    data: rank3Data,
                    projects: rank3Project,
                    backgroundColor: '#22c55e', // Hijau
                    borderWidth: 1,
                    barThickness: 30,
                },
                {
                    label: 'Rank 2',
                    data: rank2Data,
                    projects: rank2Project,
                    backgroundColor: '#eab308', // Kuning
                    borderWidth: 1,
                    barThickness: 30,
                },
                {
                    label: 'Rank 1 (Tertinggi)',
                    data: rank1Data, // Gunakan Array Angka Murni
                    projects: rank1Project, // Simpan nama proyek di sini
                    backgroundColor: '#ef4444', // Merah
                    borderWidth: 1,
                    barThickness: 30,
                },
            ],
        };
    }, [data]);

    const options = {
        indexAxis: 'y', // Horizontal
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: true, position: 'bottom' },
            title: {
                display: true,
                text: 'Top 3 Usia Order Tertinggi per Witel',
                font: { size: 16 }
            },
            tooltip: {
                callbacks: {
                    // Custom Tooltip membaca dari array 'projects' di dataset
                    label: function(context) {
                        const val = context.raw; // Nilai angka langsung
                        if (val === 0) return null; // Sembunyikan jika 0

                        // Ambil nama proyek berdasarkan index data saat ini
                        // Pastikan dataset projects ada sebelum diakses
                        const proj = context.dataset.projects ? context.dataset.projects[context.dataIndex] : '-';
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
                ticks: { autoSkip: false }
            },
        },
    };

    return (
        <div className="h-full w-full">
            <Bar data={chartData} options={options} />
        </div>
    );
};

export default BarChartUsiaWitelJT;
