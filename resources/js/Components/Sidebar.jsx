// resources/js/Components/Sidebar.jsx

import React, { useState, useEffect, useRef } from 'react';
import { Link } from '@inertiajs/react';
import { MdDashboard, MdAssessment, MdKeyboardArrowDown } from 'react-icons/md';
import { FiSettings, FiUser, FiLogOut } from 'react-icons/fi'; // Impor ikon baru

const Logo = () => (
    <div className="flex items-center justify-center h-20 border-b border-gray-200">
        <h1 className="text-2xl font-bold text-red-600">Telkom<span className="text-gray-800">Indonesia</span></h1>
    </div>
);

const NavLink = ({ href, active, icon, children }) => (
    <Link
        href={href}
        className={`flex items-center px-6 py-4 text-gray-600 hover:bg-gray-100 transition duration-300 ${active ? 'bg-gray-200 text-gray-800 font-bold' : ''}`}
    >
        {icon}
        <span className="ml-4">{children}</span>
    </Link>
);

const UserProfile = ({ user }) => {
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const profileRef = useRef(null);

    // Hook untuk menutup dropdown saat klik di luar area
    useEffect(() => {
        function handleClickOutside(event) {
            if (profileRef.current && !profileRef.current.contains(event.target)) {
                setIsProfileOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    if (!user) {
        return null; // Jangan render apapun jika data user tidak ada
    }

    return (
        // Gunakan 'relative' agar dropdown bisa diposisikan dengan 'absolute'
        <div className="mt-auto p-4 border-t border-gray-200 relative" ref={profileRef}>
            {/* Menu Dropdown Profile */}
            {isProfileOpen && (
                <div className="absolute bottom-full mb-2 w-[calc(100%-2rem)] bg-white rounded-md shadow-lg border border-gray-200 py-2 z-10">
                    {/* Header Info Pengguna */}
                    <div className="px-4 py-3 border-b border-gray-200">
                        <p className="font-bold text-gray-800 truncate">{user.name}</p>
                        <p className="text-sm text-gray-500 truncate">{user.email}</p>
                    </div>
                    {/* Opsi Menu */}
                    <div className="mt-2">
                        <Link
                            href={route('profile.edit')} // Pastikan Anda memiliki route ini
                            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                            onClick={() => setIsProfileOpen(false)}
                        >
                            <FiUser className="mr-3 text-gray-500" />
                            <span>Edit Profile</span>
                        </Link>
                        <Link
                            href={route('logout')}
                            method="post"
                            as="button"
                            className="flex items-center w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                        >
                            <FiLogOut className="mr-3" />
                            <span>Log Out</span>
                        </Link>
                    </div>
                </div>
            )}

            {/* Tampilan Profil di Sidebar (Trigger Dropdown) */}
            <div
                className="flex items-center cursor-pointer p-2 rounded-lg hover:bg-gray-100"
                onClick={() => setIsProfileOpen(!isProfileOpen)}
            >
                {/* Avatar Placeholder */}
                <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center text-white font-bold text-lg">
                    {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="ml-3 flex-grow">
                    <p className="font-semibold text-gray-800 text-sm">{user.name}</p>
                    <p className="text-xs text-gray-500">Online</p>
                </div>
                <FiSettings
                    className={`text-gray-500 transition-transform duration-300 ${isProfileOpen ? 'rotate-90' : ''}`}
                    size={20}
                />
            </div>
        </div>
    );
};

export default function Sidebar({ user }) {
    const [isDashboardOpen, setIsDashboardOpen] = useState(false);
    const [isReportsOpen, setIsReportsOpen] = useState(false);

    const dashboardDropdownRef = useRef(null);
    const reportsDropdownRef = useRef(null);

    const isDashboardActive = route().current('dashboard');
    const isReportsActive = route().current('analysisDigitalProduct');

    useEffect(() => {
        function handleClickOutside(event) {
            if (dashboardDropdownRef.current && !dashboardDropdownRef.current.contains(event.target)) {
                setIsDashboardOpen(false);
            }
            if (reportsDropdownRef.current && !reportsDropdownRef.current.contains(event.target)) {
                setIsReportsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    return (
        <div className="flex flex-col w-64 bg-white h-screen fixed shadow-lg">
            <Logo />
            <nav className="flex-grow">
                {/* Menu Dashboard Dropdown */}
                <div className="relative" ref={dashboardDropdownRef}>
                    <button
                        onClick={() => setIsDashboardOpen(!isDashboardOpen)}
                        className={`w-full flex items-center px-6 py-4 text-gray-600 hover:bg-gray-100 transition duration-300 text-left ${isDashboardActive ? 'bg-gray-200 text-gray-800 font-bold' : ''}`}
                    >
                        <MdDashboard size={22} />
                        <span className="ml-4">Dashboard</span>
                        <div className="flex-grow flex justify-end">
                            <MdKeyboardArrowDown
                                size={20}
                                className={`transition-transform duration-300 ${isDashboardOpen ? 'rotate-180' : ''}`}
                            />
                        </div>
                    </button>
                    {isDashboardOpen && (
                        <div className="pl-12 pr-4 py-2 flex flex-col space-y-1 bg-white">
                            <Link
                                href={route('dashboardDigitalProduct')}
                                className={`block px-4 py-2 text-sm rounded-md transition-colors ${route().current('dashboardDigitalProduct') ? 'bg-blue-100 text-blue-700 font-semibold' : 'text-gray-700 hover:bg-gray-100'}`}
                            >
                                Digital Product Dashboard
                            </Link>
                            <Link
                                href="#"
                                className="block px-4 py-2 text-sm text-gray-400 cursor-not-allowed rounded-md"
                                onClick={(e) => e.preventDefault()}
                            >
                                Conn
                            </Link>
                        </div>
                    )}
                </div>

                {/* Menu Reports Dropdown */}
                <div className="relative" ref={reportsDropdownRef}>
                    <button
                        onClick={() => setIsReportsOpen(!isReportsOpen)}
                        className={`w-full flex items-center px-6 py-4 text-gray-600 hover:bg-gray-100 transition duration-300 text-left ${isReportsActive ? 'bg-gray-200 text-gray-800 font-bold' : ''}`}
                    >
                        <MdAssessment size={22} />
                        <span className="ml-4">Reports</span>
                        <div className="flex-grow flex justify-end">
                            <MdKeyboardArrowDown
                                size={20}
                                className={`transition-transform duration-300 ${isReportsOpen ? 'rotate-180' : ''}`}
                            />
                        </div>
                    </button>
                    {isReportsOpen && (
                        <div className="pl-12 pr-4 py-2 flex flex-col space-y-1 bg-white">
                            <Link
                                href={route('analysisDigitalProduct.index')}
                                className={`block px-4 py-2 text-sm rounded-md transition-colors ${route().current('analysisDigitalProduct.index') ? 'bg-blue-100 text-blue-700 font-semibold' : 'text-gray-700 hover:bg-gray-100'}`}
                            >
                                Report Digital Product
                            </Link>
                            <Link
                                href="#"
                                className="block px-4 py-2 text-sm text-gray-400 cursor-not-allowed rounded-md"
                                onClick={(e) => e.preventDefault()}
                            >
                                Report Analisis Conn
                            </Link>
                        </div>
                    )}
                </div>

                <NavLink href="#" active={false} icon={<MdAssessment size={22} />}>
                    Action Based
                </NavLink>
            </nav>
            {/* Memanggil komponen UserProfile yang baru */}
            <UserProfile user={user} />
        </div>
    );
}