import React from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';

// Terima 'headerTitle' dari controller
export default function ExternalEmbed({ auth, embedUrl, headerTitle = 'Dashboard' }) {
    return (
        <AuthenticatedLayout
            auth={auth}
            // Gunakan headerTitle dinamis di sini
            header={<h2 className="font-semibold text-xl text-gray-800 leading-tight">{headerTitle}</h2>}
        >
            <Head title={headerTitle} />

            {/* Iframe akan mengisi sisa area konten */}
            <div className="py-0" style={{ height: 'calc(100vh - 65px)' }}> {/* Sesuaikan 65px jika tinggi header Anda berbeda */}
                <iframe
                    src={embedUrl}
                    style={{ width: '100%', height: '100%', border: 'none' }}
                    allowFullScreen
                ></iframe>
            </div>
        </AuthenticatedLayout>
    );
}
