// resources/js/Pages/Tools/GoogleDriveTest.jsx

import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import GoogleDriveUploader from '@/Components/GoogleDriveUploader'; // Import komponen yang sudah ada
import { Head } from '@inertiajs/react';

export default function GoogleDriveTest({ auth }) {
    return (
        <AuthenticatedLayout
            user={auth.user}
            header={<h2 className="font-semibold text-xl text-gray-800 leading-tight">Alat Tes Jaringan</h2>}
        >
            <Head title="Alat Tes Jaringan ke Google Drive" />

            <div className="py-12">
                <div className="max-w-4xl mx-auto sm:px-6 lg:px-8">
                    <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg p-6">
                        {/* Render komponen uploader Anda di sini */}
                        <GoogleDriveUploader />
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
