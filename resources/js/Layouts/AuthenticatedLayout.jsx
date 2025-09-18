// resources/js/Layouts/AuthenticatedLayout.jsx

import React from 'react';
import Sidebar from '@/Components/Sidebar'; // <-- Mengimpor komponen Sidebar baru kita
import Header from '@/Components/Header';   // <-- Mengimpor komponen Header baru kita
import { usePage } from '@inertiajs/react'; // <-- Kita masih butuh ini untuk mendapatkan data user

// Kita ubah sedikit props agar cocok dengan Dashboard.jsx bawaan Breeze
export default function AuthenticatedLayout({ header, children }) {

    // Kita ambil data user yang sedang login dari Inertia
    const { auth } = usePage().props;

    return (
        <div className="min-h-screen bg-gray-50">
            {/* 1. Render Sidebar di sisi kiri dan kirimkan data user ke dalamnya */}
            <Sidebar user={auth.user} />

            {/* 2. Buat container untuk konten utama dengan margin kiri seukuran lebar sidebar (w-64 -> ml-64) */}
            <div className="ml-64">

                {/* 3. Render Header di bagian atas konten utama */}
                {/* Kita teruskan prop 'header' dari Dashboard.jsx ke prop 'title' di komponen Header kita */}
                <Header title={header} />

                <main>
                    {/* 4. Render konten halaman (children) di sini, dibungkus dengan padding */}
                    <div className="p-6">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
