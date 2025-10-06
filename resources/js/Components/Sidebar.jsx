// resources/js/Components/Sidebar.jsx

import React, { useState, useEffect, useRef } from 'react';
import { Link } from '@inertiajs/react';
import { MdDashboard, MdAssessment, MdKeyboardArrowDown } from 'react-icons/md';
import { FiSettings, FiUser, FiLogOut, FiUsers } from 'react-icons/fi';

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

    if (!user) return null;

    return (
        <div className="mt-auto p-4 border-t border-gray-200 relative" ref={profileRef}>
            {isProfileOpen && (
                <div className="absolute bottom-full mb-2 w-[calc(100%-2rem)] bg-white rounded-md shadow-lg border border-gray-200 py-2 z-10">
                    <div className="px-4 py-3 border-b border-gray-200">
                        <p className="font-bold text-gray-800 truncate">{user.name}</p>
                        <p className="text-sm text-gray-500 truncate">{user.email}</p>
                    </div>
                    <div className="mt-2">
                        {user.role === 'superadmin' && (
                            <Link
                                href={route('users.index')}
                                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                                onClick={() => setIsProfileOpen(false)}
                            >
                                <FiUsers className="mr-3 text-gray-500" />
                                <span>User Management</span>
                            </Link>
                        )}
                        <Link
                            href={route('profile.edit')}
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
            <div
                className="flex items-center cursor-pointer p-2 rounded-lg hover:bg-gray-100"
                onClick={() => setIsProfileOpen(!isProfileOpen)}
            >
                <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center text-white font-bold text-lg">
                    {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="ml-3 flex-grow">
                    <p className="font-semibold text-gray-800 text-sm">{user.name}</p>
                    <p className="text-xs text-gray-500 capitalize">{user.role}</p>
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
    // Menambahkan state & ref untuk dropdown baru
    const [isDashboardOpen, setIsDashboardOpen] = useState(false);
    const [isReportsOpen, setIsReportsOpen] = useState(false);

    const dashboardDropdownRef = useRef(null);
    const reportsDropdownRef = useRef(null);

    // Logika untuk menandai menu Dashboard sebagai aktif
    const isDashboardActive = route().current('dashboardDigitalProduct'); // Anda bisa menambahkan route dashboard SOS di sini nanti dengan ||

    useEffect(() => {
        function handleClickOutside(event) {
            // Menambahkan listener untuk dropdown dashboard
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
            <nav className="flex-grow pt-4">

                {/* === HANYA TAMPIL UNTUK SUPER ADMIN === */}
                {user.role === 'superadmin' && (
                    <NavLink
                        href={route('users.index')}
                        active={route().current('users.*')}
                        icon={<FiUsers size={22} />}
                    >
                        User Management
                    </NavLink>
                )}

                {/* === HANYA TAMPIL UNTUK USER & ADMIN === */}
                {(user.role === 'user' || user.role === 'admin') && (
                    <>
                        {/* [PERUBAHAN] Menu Dashboard menjadi Dropdown */}
                        <div className="relative" ref={dashboardDropdownRef}>
                            <button
                                onClick={() => setIsDashboardOpen(!isDashboardOpen)}
                                className={`w-full flex items-center px-6 py-4 text-gray-600 hover:bg-gray-100 transition duration-300 text-left ${isDashboardActive ? 'bg-gray-200 text-gray-800 font-bold' : ''}`}
                            >
                                <MdDashboard size={22} />
                                <span className="ml-4">Dashboard</span>
                                <div className="flex-grow flex justify-end">
                                    <MdKeyboardArrowDown size={20} className={`transition-transform duration-300 ${isDashboardOpen ? 'rotate-180' : ''}`} />
                                </div>
                            </button>
                            {isDashboardOpen && (
                                <div className="pl-12 pr-4 py-2 flex flex-col space-y-1 bg-white">
                                    <Link
                                        href={route('dashboardDigitalProduct')}
                                        className={`block px-4 py-2 text-sm rounded-md transition-colors ${route().current('dashboardDigitalProduct') ? 'bg-blue-100 text-blue-700 font-semibold' : 'text-gray-700 hover:bg-gray-100'}`}>
                                        Dashboard Digital Product
                                    </Link>
                                    <Link
                                        href="#"
                                        className="block px-4 py-2 text-sm text-gray-400 cursor-not-allowed rounded-md"
                                        onClick={(e) => e.preventDefault()}
                                    >
                                        Dashboard SOS
                                    </Link>
                                </div>
                            )}
                        </div>

                        {/* Menu Reports */}
                        <div className="relative" ref={reportsDropdownRef}>
                            <button
                                onClick={() => setIsReportsOpen(!isReportsOpen)}
                                className={`w-full flex items-center px-6 py-4 text-gray-600 hover:bg-gray-100 transition duration-300 text-left`}
                            >
                                <MdAssessment size={22} />
                                <span className="ml-4">Reports</span>
                                <div className="flex-grow flex justify-end">
                                    <MdKeyboardArrowDown size={20} className={`transition-transform duration-300 ${isReportsOpen ? 'rotate-180' : ''}`} />
                                </div>
                            </button>

                            {isReportsOpen && (
                                <div className="pl-12 pr-4 py-2 flex flex-col space-y-1 bg-white">
                                    {user.role === 'user' && (
                                        <>
                                            <Link href="#" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md">Aosodomoro</Link>
                                            <Link href="#" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md">Galaksi</Link>
                                        </>
                                    )}
                                    {user.role === 'admin' && (
                                        <>
                                            <Link href={route('analysisDigitalProduct.index')} className={`block px-4 py-2 text-sm rounded-md transition-colors ${route().current('analysisDigitalProduct.index') ? 'bg-blue-100 text-blue-700 font-semibold' : 'text-gray-700 hover:bg-gray-100'}`}>
                                                Report Digital Product
                                            </Link>
                                            <Link href="#" className="block px-4 py-2 text-sm text-gray-400 cursor-not-allowed rounded-md" onClick={(e) => e.preventDefault()}>
                                                Report SOS
                                            </Link>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>

                        <NavLink href="#" active={false} icon={<MdAssessment size={22} />}>
                            Action Based
                        </NavLink>
                    </>
                )}
            </nav>
            <UserProfile user={user} />
        </div>
    );
}
