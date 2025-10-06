import React, { useState } from 'react';
import Sidebar from '@/Components/Sidebar';
import Header from '@/Components/Header';
import { usePage } from '@inertiajs/react';

export default function AuthenticatedLayout({ header, children }) {
    const user = usePage().props.auth?.user;

    // State untuk mengontrol status buka/tutup sidebar
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    // Fungsi untuk mengubah state (toggle)
    const toggleSidebar = () => {
        setIsSidebarOpen(prevState => !prevState);
    };

    if (!user) {
        return (
            <div className="flex h-screen items-center justify-center bg-gray-100">
                <div className="text-lg font-semibold text-gray-600">
                    Authenticating...
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 font-sans">
            {/* Sidebar sekarang menerima props untuk mengontrolnya */}
            <Sidebar
                user={user}
                isSidebarOpen={isSidebarOpen}
                toggleSidebar={toggleSidebar}
            />

            {/* Konten utama menyesuaikan marginnya secara dinamis */}
            <div className={`transition-all duration-300 ease-in-out ${isSidebarOpen ? 'ml-64' : 'ml-20'}`}>
                <Header user={user} pageHeader={header} />
                <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
                    {children}
                </main>
            </div>
        </div>
    );
}

