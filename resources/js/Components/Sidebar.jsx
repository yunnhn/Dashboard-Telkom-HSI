// resources/js/Components/Sidebar.jsx

import React, { useState, useEffect, useRef } from 'react';
import { Link } from '@inertiajs/react';
import { MdDashboard, MdAnalytics, MdAssessment, MdKeyboardArrowDown } from 'react-icons/md';
import { FiSettings } from 'react-icons/fi';

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

const UserProfile = ({ name }) => (
    <div className="mt-auto p-4 border-t border-gray-200">
        <div className="flex items-center">
            <div className="ml-4">
                <p className="font-semibold text-gray-800">{name}</p>
            </div>
            <FiSettings className="ml-auto text-gray-500 hover:text-gray-800 cursor-pointer" size={20} />
        </div>
    </div>
);

export default function Sidebar({ user }) {
    // [PERBAIKAN] Buat state & ref terpisah untuk setiap dropdown
    const [isDashboardOpen, setIsDashboardOpen] = useState(false);
    const [isReportsOpen, setIsReportsOpen] = useState(false);

    const dashboardDropdownRef = useRef(null);
    const reportsDropdownRef = useRef(null);

    // Menentukan apakah menu "Dashboard" atau isinya sedang aktif
    const isDashboardActive = route().current('dashboard'); // Anda bisa menambahkan route lain di sini dengan ||

    // Menentukan apakah menu "Reports" atau isinya sedang aktif
    const isReportsActive = route().current('analysisDigitalProduct');

    // Hook untuk menutup dropdown saat klik di luar area
    useEffect(() => {
        function handleClickOutside(event) {
            // Cek untuk dropdown Dashboard
            if (dashboardDropdownRef.current && !dashboardDropdownRef.current.contains(event.target)) {
                setIsDashboardOpen(false);
            }
            // Cek untuk dropdown Reports
            if (reportsDropdownRef.current && !reportsDropdownRef.current.contains(event.target)) {
                setIsReportsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []); // Dependency array kosong agar hook hanya berjalan sekali

    return (
        <div className="flex flex-col w-64 bg-white h-screen fixed shadow-lg">
            <Logo />
            <nav className="flex-grow">

                <div className="relative" ref={dashboardDropdownRef}>
                    <button
                        onClick={() => setIsDashboardOpen(!isDashboardOpen)}
                        className={`w-full flex items-center px-6 py-4 text-gray-600 hover:bg-gray-100 transition duration-300 text-left ${isDashboardActive ? 'bg-gray-200 text-gray-800 font-bold' : ''
                            }`}
                    >
                        <MdDashboard size={22} />
                        <span className="ml-4">Dashboard</span>
                        <div className="flex-grow flex justify-end">
                            <MdKeyboardArrowDown
                                size={20}
                                className={`transition-transform duration-300 ${isDashboardOpen ? 'rotate-180' : ''
                                    }`}
                            />
                        </div>
                    </button>

                    {isDashboardOpen && (
                        <div className="pl-12 pr-4 py-2 flex flex-col space-y-1 bg-white">
                            <Link
                                href={route('dashboardDigitalProduct')}
                                className={`block px-4 py-2 text-sm rounded-md transition-colors ${route().current('dashboardDigitalProduct')
                                    ? 'bg-blue-100 text-blue-700 font-semibold'
                                    : 'text-gray-700 hover:bg-gray-100'
                                    }`}
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

                <div className="relative" ref={reportsDropdownRef}>
                    <button
                        onClick={() => setIsReportsOpen(!isReportsOpen)}
                        className={`w-full flex items-center px-6 py-4 text-gray-600 hover:bg-gray-100 transition duration-300 text-left ${isReportsActive ? 'bg-gray-200 text-gray-800 font-bold' : ''
                            }`}
                    >
                        <MdAssessment size={22} />
                        <span className="ml-4">Reports</span>
                        <div className="flex-grow flex justify-end">
                            <MdKeyboardArrowDown
                                size={20}
                                className={`transition-transform duration-300 ${isReportsOpen ? 'rotate-180' : ''
                                    }`}
                            />
                        </div>
                    </button>

                    {isReportsOpen && (
                        <div className="pl-12 pr-4 py-2 flex flex-col space-y-1 bg-white">
                            <Link
                                href={route('analysisDigitalProduct.index')}
                                className={`block px-4 py-2 text-sm rounded-md transition-colors ${route().current('analysisDigitalProduct.index')
                                    ? 'bg-blue-100 text-blue-700 font-semibold'
                                    : 'text-gray-700 hover:bg-gray-100'
                                    }`}
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
            {user && <UserProfile name={user.name} />}
        </div>
    );
}
