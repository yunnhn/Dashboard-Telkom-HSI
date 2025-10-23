import React, { useState, useEffect, useRef } from 'react';
import { Link } from '@inertiajs/react';
import { MdDashboard, MdAssessment, MdKeyboardArrowDown, MdWifiTethering } from 'react-icons/md';
import { FiUsers, FiChevronLeft, FiChevronRight, FiUser, FiLogOut, FiX } from 'react-icons/fi';
import GoogleDriveUploader from '@/Components/GoogleDriveUploader';

// Komponen-komponen kecil (Helper components)
const Logo = ({ isSidebarOpen }) => (
    <div className="flex items-center justify-center h-20 border-b border-gray-200 relative overflow-hidden">
        <div className={`transition-opacity duration-200 ${isSidebarOpen ? 'opacity-100' : 'opacity-0'}`}>
            <h1 className="text-2xl font-bold text-red-600">Telkom<span className="text-gray-800">Indonesia</span></h1>
        </div>
        <div className={`absolute transition-opacity duration-200 ${!isSidebarOpen ? 'opacity-100' : 'opacity-0'}`}>
            <img src="/images/logo telkom.png" alt="Telkom" className="h-8" />
        </div>
    </div>
);

const NavLink = ({ href, active, icon, isSidebarOpen, children }) => (
    <div className="relative group">
        <Link
            href={href}
            className={`flex items-center py-4 text-gray-600 hover:bg-gray-100 transition-colors duration-200 ${isSidebarOpen ? 'px-6' : 'justify-center'} ${active ? 'bg-gray-200 text-gray-800 font-bold' : ''}`}
        >
            {icon}
            <span className={`ml-4 whitespace-nowrap transition-opacity duration-200 ${isSidebarOpen ? 'opacity-100' : 'opacity-0'}`}>{children}</span>
        </Link>
        {!isSidebarOpen && (
            <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 bg-gray-800 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
                {children}
            </div>
        )}
    </div>
);

// Komponen Modal yang bisa digunakan ulang
const Modal = ({ show, onClose, children }) => {
    if (!show) {
        return null;
    }
    return (
        <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40 flex items-center justify-center"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-lg shadow-xl w-full max-w-2xl transform transition-all"
                onClick={e => e.stopPropagation()}
            >
                <div className="p-6 relative">
                    <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
                        <FiX size={24} />
                    </button>
                    {children}
                </div>
            </div>
        </div>
    );
};


// MODIFIKASI UTAMA DI SINI
const UserProfile = ({ user, isSidebarOpen }) => {
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isToolOpen, setIsToolOpen] = useState(false); // State terpisah untuk modal
    const profileRef = useRef(null);

    // Menutup pop-up jika klik di luar
    useEffect(() => {
        function handleClickOutside(event) {
            if (profileRef.current && !profileRef.current.contains(event.target)) {
                setIsProfileOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    if (!user) return null;

    const handleOpenConnectivityTool = () => {
        setIsProfileOpen(false); // Tutup menu profil
        setIsToolOpen(true);     // Buka modal konektivitas
    };

    return (
        <>
            <div className="mt-auto p-2 border-t border-gray-200 relative" ref={profileRef}>
                {/* Menu pop-up profil yang asli */}
                {isProfileOpen && (
                    <div className={`absolute bottom-full mb-2 bg-white rounded-md shadow-lg border py-2 z-20 ${isSidebarOpen ? 'w-[calc(100%-1rem)]' : 'left-full ml-2 w-56'}`}>
                        <div className="px-4 py-3 border-b">
                            <p className="font-bold text-gray-800 truncate">{user.name}</p>
                            <p className="text-sm text-gray-500 truncate">{user.email}</p>
                        </div>
                        <div className="mt-2">
                            {user.role === 'superadmin' && (
                                <Link href={route('users.index')} className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" onClick={() => setIsProfileOpen(false)}>
                                    <FiUsers className="mr-3" />User Management
                                </Link>
                            )}

                            {/* === PERUBAHAN DI SINI === */}
                            {/* Tombol ini sekarang hanya muncul untuk superadmin */}
                            {user.role === 'superadmin' && (
                                <button onClick={handleOpenConnectivityTool} className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                                    <MdWifiTethering className="mr-3" size={16} /> Cek Konektivitas Google
                                </button>
                            )}

                            {user.role === 'superadmin' && ( // Atau sesuaikan dengan role yang diizinkan
                                <Link
                                    href={route('admin.merge-excel.create')}
                                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                    onClick={() => setIsProfileOpen(false)}
                                >
                                    {/* Anda bisa menggunakan ikon lain jika mau */}
                                    <MdAssessment className="mr-3" />
                                    Merge Excel
                                </Link>
                            )}
                            {/* === AKHIR PERUBAHAN === */}

                            <Link href={route('profile.edit')} className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" onClick={() => setIsProfileOpen(false)}>
                                <FiUser className="mr-3" />Edit Profile
                            </Link>
                            <Link href={route('logout')} method="post" as="button" className="flex items-center w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50">
                                <FiLogOut className="mr-3" />Log Out
                            </Link>
                        </div>
                    </div>
                )}
                {/* Tampilan footer sidebar */}
                <div
                    className={`flex items-center cursor-pointer p-2 rounded-lg hover:bg-gray-100 ${!isSidebarOpen && 'justify-center'}`}
                    onClick={() => setIsProfileOpen(!isProfileOpen)}
                >
                    <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                        {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div className={`ml-3 flex-grow overflow-hidden transition-all duration-300 ${isSidebarOpen ? 'w-auto opacity-100' : 'w-0 opacity-0'}`}>
                        <p className="font-semibold text-gray-800 text-sm truncate">{user.name}</p>
                        <p className="text-xs text-gray-500 capitalize">{user.role}</p>
                    </div>
                </div>
            </div>

            {/* Modal untuk alat konektivitas */}
            <Modal show={isToolOpen} onClose={() => setIsToolOpen(false)}>
                <GoogleDriveUploader />
            </Modal>
        </>
    );
};


// Komponen Sidebar utama (logika menu tidak berubah)
export default function Sidebar({ user, isSidebarOpen, toggleSidebar, isCmsMode }) {
    const [isDashboardOpen, setIsDashboardOpen] = useState(false);
    const [isReportsOpen, setIsReportsOpen] = useState(false);
    const [isDigitalProductOpen, setIsDigitalProductOpen] = useState(false);
    const [isSosOpen, setIsSosOpen] = useState(false);
    const [isAnalysisOpen, setIsAnalysisOpen] = useState(true);

    const isDashboardActive = route().current('dashboardDigitalProduct');
    const isReportsActive = route().current('data-report.index') || route().current('galaksi.index');
    const isAdminAnalysisActive = route().current('admin.analysisDigitalProduct.index') || route().current('admin.analysisSOS.index');

    useEffect(() => {
        if (!isSidebarOpen) {
            setIsDashboardOpen(false);
            setIsReportsOpen(false);
            setIsDigitalProductOpen(false);
            setIsSosOpen(false);
            setIsAnalysisOpen(false);
        }
    }, [isSidebarOpen]);

    return (
        <div className={`flex flex-col bg-white h-screen fixed shadow-lg z-30 transition-all duration-300 ease-in-out ${isSidebarOpen ? 'w-64' : 'w-20'}`}>
            <button onClick={toggleSidebar} className="absolute -right-3 top-6 z-40 bg-white p-1 rounded-full shadow-md border hover:bg-gray-100 transition-colors">
                {isSidebarOpen ? <FiChevronLeft size={16} /> : <FiChevronRight size={16} />}
            </button>

            <Logo isSidebarOpen={isSidebarOpen} />

            <nav className="flex-grow pt-4 overflow-y-auto overflow-x-hidden">

                {user.role === 'superadmin' ? (
                    <NavLink
                        href={route('users.index')}
                        active={route().current('users.*')}
                        icon={<FiUsers size={22} />}
                        isSidebarOpen={isSidebarOpen}
                    >
                        User Management
                    </NavLink>
                ) : isCmsMode ? (
                    // --- TAMPILAN MODE CMS (HANYA UNTUK ADMIN) ---
                    <>
                        <div className="relative">
                            <button onClick={() => isSidebarOpen && setIsAnalysisOpen(!isAnalysisOpen)} className={`w-full flex items-center py-4 text-gray-600 hover:bg-gray-100 transition duration-300 text-left ${isSidebarOpen ? 'px-6' : 'justify-center'} ${isAdminAnalysisActive ? 'bg-gray-200 text-gray-800 font-bold' : ''}`}>
                                <MdAssessment size={22} />
                                <span className={`ml-4 whitespace-nowrap transition-opacity duration-200 ${isSidebarOpen ? 'opacity-100' : 'opacity-0'}`}>Analisis Report</span>
                                {isSidebarOpen && <MdKeyboardArrowDown size={20} className={`ml-auto transition-transform duration-300 ${isAnalysisOpen ? 'rotate-180' : ''}`} />}
                            </button>
                            {isSidebarOpen && isAnalysisOpen && (
                                <div className="pl-12 pr-4 py-2 flex flex-col space-y-1">
                                    <Link href={route('admin.analysisDigitalProduct.index')} className={`block px-4 py-2 text-sm rounded-md ${route().current('admin.analysisDigitalProduct.index') ? 'bg-blue-100 text-blue-700 font-semibold' : 'hover:bg-gray-100'}`}>Analisis Report Digital Product</Link>
                                    <Link href={route('admin.analysisSOS.index')} className={`block px-4 py-2 text-sm text-gray-400 cursor-not-allowed rounded-md ${route().current('admin.analysisSOS.index') ? 'bg-blue-100 text-blue-700 font-semibold' : 'hover:bg-gray-100'}`}>Analisis Report SOS</Link>
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    // --- TAMPILAN BIASA (UNTUK USER & ADMIN non-CMS) ---
                    <>
                        {/* Kode untuk menu Dashboard & Reports tidak berubah */}
                        <div className="relative">
                            <button onClick={() => isSidebarOpen && setIsDashboardOpen(!isDashboardOpen)} className={`w-full flex items-center py-4 text-gray-600 hover:bg-gray-100 transition duration-300 text-left ${isSidebarOpen ? 'px-6' : 'justify-center'} ${isDashboardActive ? 'bg-gray-200 text-gray-800 font-bold' : ''}`}>
                                <MdDashboard size={22} />
                                <span className={`ml-4 whitespace-nowrap transition-opacity duration-200 ${isSidebarOpen ? 'opacity-100' : 'opacity-0'}`}>Dashboard</span>
                                {isSidebarOpen && <MdKeyboardArrowDown size={20} className={`ml-auto transition-transform duration-300 ${isDashboardOpen ? 'rotate-180' : ''}`} />}
                            </button>
                            {isSidebarOpen && isDashboardOpen && (
                                <div className="pl-12 pr-4 py-2 flex flex-col space-y-1">
                                    <Link href={route('dashboardDigitalProduct')} className={`block px-4 py-2 text-sm rounded-md ${route().current('dashboardDigitalProduct') ? 'bg-blue-100 text-blue-700 font-semibold' : 'hover:bg-gray-100'}`}>Dashboard Digital Product</Link>
                                    <Link href="#" className="block px-4 py-2 text-sm text-gray-400 cursor-not-allowed rounded-md">Dashboard SOS</Link>
                                </div>
                            )}
                        </div>
                        <div className="relative">
                            <button onClick={() => isSidebarOpen && setIsReportsOpen(!isReportsOpen)} className={`w-full flex items-center py-4 text-gray-600 hover:bg-gray-100 transition duration-300 text-left ${isSidebarOpen ? 'px-6' : 'justify-center'} ${isReportsActive ? 'bg-gray-200 text-gray-800 font-bold' : ''}`}>
                                <MdAssessment size={22} />
                                <span className={`ml-4 whitespace-nowrap transition-opacity duration-200 ${isSidebarOpen ? 'opacity-100' : 'opacity-0'}`}>Reports</span>
                                {isSidebarOpen && <MdKeyboardArrowDown size={20} className={`ml-auto transition-transform duration-300 ${isReportsOpen ? 'rotate-180' : ''}`} />}
                            </button>
                            {isSidebarOpen && isReportsOpen && (
                                <div className="pl-8 pr-4 py-2 flex flex-col space-y-1 bg-gray-50 border-t border-b">
                                    {/* --- Sub-Dropdown: Report Digital Product --- */}
                                    <div>
                                        <button onClick={() => setIsDigitalProductOpen(!isDigitalProductOpen)} className="w-full flex items-center justify-between px-4 py-2 text-sm rounded-md text-gray-700 hover:bg-gray-200">
                                            <span>Report Digital Product</span>
                                            <MdKeyboardArrowDown size={18} className={`transition-transform duration-300 ${isDigitalProductOpen ? 'rotate-180' : ''}`} />
                                        </button>
                                        {isDigitalProductOpen && (
                                            <div className="pl-6 mt-1 space-y-1">
                                                <Link href={route('data-report.index')} className={`block px-4 py-2 text-sm rounded-md ${route().current('data-report.index') ? 'bg-blue-100 text-blue-700 font-semibold' : 'hover:bg-gray-100'}`}>Data Report</Link>
                                                <Link href={route('galaksi.index')} className={`block px-4 py-2 text-sm rounded-md ${route().current('galaksi.index') ? 'bg-blue-100 text-blue-700 font-semibold' : 'hover:bg-gray-100'}`}>Galaksi</Link>
                                            </div>
                                        )}
                                    </div>
                                    {/* --- Sub-Dropdown: Report SOS --- */}
                                    <div>
                                        <button onClick={() => setIsSosOpen(!isSosOpen)} className="w-full flex items-center justify-between px-4 py-2 text-sm rounded-md text-gray-700 hover:bg-gray-200">
                                            <span>Report SOS</span>
                                            <MdKeyboardArrowDown size={18} className={`transition-transform duration-300 ${isSosOpen ? 'rotate-180' : ''}`} />
                                        </button>
                                        {isSosOpen && (
                                            <div className="pl-6 mt-1 space-y-1">
                                                <Link href="#" className="block px-4 py-2 text-sm text-gray-400 cursor-not-allowed rounded-md">Data Report</Link>
                                                <Link href="#" className="block px-4 py-2 text-sm text-gray-400 cursor-not-allowed rounded-md">Galaksi</Link>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </nav>

            <UserProfile user={user} isSidebarOpen={isSidebarOpen} />
        </div>
    );
}
