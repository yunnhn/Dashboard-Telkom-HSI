// resources/js/Pages/Users/Index.jsx

import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';

export default function Index({ auth, users }) {
    return (
        <AuthenticatedLayout
            user={auth.user}
            // Header sekarang hanya berisi judul
            header={
                <h2 className="font-semibold text-xl text-gray-800 leading-tight">User Management</h2>
            }
        >
            <Head title="Users" />

            <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">

                    {/* Tombol "Add User" dipindah ke sini */}
                    <div className="flex justify-end mb-4">
                        <Link href={route('users.create')} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded">
                            Add User
                        </Link>
                    </div>

                    {/* Flash messages tetap sama */}
                    {auth.flash?.success && (
                        <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-4" role="alert">
                            <p>{auth.flash.success}</p>
                        </div>
                    )}
                    {auth.flash?.error && (
                        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4" role="alert">
                            <p>{auth.flash.error}</p>
                        </div>
                    )}

                    {/* ======================= PERBAIKAN TABEL DI SINI ======================= */}
                    {/* Ganti 'overflow-hidden' dengan 'overflow-x-auto' */}
                    <div className="bg-white overflow-x-auto shadow-sm sm:rounded-lg p-6">
                        {/* ======================================================================= */}
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {users.data.map((user) => (
                                    <tr key={user.id}>
                                        <td className="px-6 py-4 whitespace-nowrap">{user.name}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">{user.email}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">{user.role}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <Link href={route('users.edit', user.id)} className="text-indigo-600 hover:text-indigo-900 mr-4">
                                                Edit
                                            </Link>
                                            <Link
                                                href={route('users.destroy', user.id)}
                                                method="delete"
                                                as="button"
                                                className="text-red-600 hover:text-red-900"
                                                onBefore={() => confirm('Are you sure you want to delete this user?')}
                                            >
                                                Delete
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
