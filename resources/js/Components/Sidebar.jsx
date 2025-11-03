import React, { useState, useEffect, useRef } from 'react';
import { Link, router } from '@inertiajs/react';
import { MdDashboard, MdAssessment, MdKeyboardArrowDown, MdWifiTethering, MdExitToApp, MdCode, MdHistory } from 'react-icons/md'; // <-- Tambahkan MdHistory
import { FiUsers, FiChevronLeft, FiChevronRight, FiUser, FiLogOut, FiX } from 'react-icons/fi';
import GoogleDriveUploader from '@/Components/GoogleDriveUploader';

// Komponen-komponen kecil (Helper components)
const Logo = ({ isSidebarOpen }) => (
    <div className="flex items-center justify-center h-20 border-b border-gray-200 relative overflow-hidden">
        <div className={`transition-opacity duration-200 ${isSidebarOpen ? 'opacity-100' : 'opacity-0'}`}>
            <h1 className="text-2xl font-bold text-red-600">Telkom<span className="text-gray-800">Indonesia</span></h1>
        </div>
        <div className={`absolute transition-opacity duration-200 ${!isSidebarOpen ? 'opacity-100' : 'opacity-0'}`}>
            {/* Pastikan path gambar ini benar di proyek Anda */}
            <img src="/images/logo telkom.png" alt="Telkom" className="h-8" onError={(e) => e.target.style.display = 'none'} />
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
            className="fixed inset-0 bg-black bg-opacity-50 z-40 flex items-center justify-center p-4" // Tambah padding
            onClick={onClose}
        >
            <div
                className="bg-white rounded-lg shadow-xl w-full max-w-2xl transform transition-all max-h-[90vh] overflow-y-auto" // Batasi tinggi & tambah scroll
                onClick={e => e.stopPropagation()}
            >
                <div className="p-6 relative">
                    <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10">
                        <FiX size={24} />
                    </button>
                    {children}
                </div>
            </div>
        </div>
    );
};

const UserProfile = ({ user, isSidebarOpen, onLogout }) => {
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isToolOpen, setIsToolOpen] = useState(false);
    const [isEmbedModalOpen, setIsEmbedModalOpen] = useState(false);
    const profileRef = useRef(null);

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
        setIsProfileOpen(false);
        setIsToolOpen(true);
    };

    const handleOpenEmbedTool = () => {
        setIsProfileOpen(false);
        setIsEmbedModalOpen(true);
    };

    return (
        <>
            <div className="mt-auto p-2 border-t border-gray-200 relative" ref={profileRef}>
                {isProfileOpen && (
                    <div className={`absolute bottom-full mb-2 bg-white rounded-md shadow-lg border py-2 z-20 ${isSidebarOpen ? 'w-[calc(100%-1rem)]' : 'left-full ml-2 w-56'}`}>
                        <div className="px-4 py-3 border-b">
                            <p className="font-bold text-gray-800 truncate">{user.name}</p>
                            <p className="text-sm text-gray-500 truncate">{user.email}</p>
                        </div>
                        <div className="mt-2">
                            {/* Tautan Super Admin Dipindah ke Nav Utama */}

                            {user.role === 'superadmin' && (
                                <Link href={route('tools.google-drive-test')} className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                                    <MdWifiTethering className="mr-3" size={16} /> Cek Konektivitas Google
                                </Link>
                            )}

                            {(user.role === 'superadmin' || user.role === 'admin') && (
                                <>
                                    <Link
                                        href={route('admin.merge-excel.create')}
                                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                        onClick={() => setIsProfileOpen(false)}
                                    >
                                        <MdAssessment className="mr-3" />
                                        Merge Excel
                                    </Link>
                                    <button
                                        onClick={handleOpenEmbedTool}
                                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                    >
                                        <MdCode className="mr-3" />
                                        Embed Dashboard
                                    </button>
                                </>
                            )}

                            <Link href={route('profile.edit')} className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" onClick={() => setIsProfileOpen(false)}>
                                <FiUser className="mr-3" />Edit Profile
                            </Link>
                            <button
                                onClick={onLogout} // Memanggil fungsi logout internal
                                className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-red-700 hover:bg-red-100"
                            >
                                <MdExitToApp className="text-red-500" />
                                <span>Logout</span>
                            </button>
                        </div>
                    </div>
                )}
                <div
                    className={`flex items-center cursor-pointer p-2 rounded-lg hover:bg-gray-100 ${!isSidebarOpen && 'justify-center'}`}
                    onClick={() => setIsProfileOpen(!isProfileOpen)}
                >
                    <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                        {user.name?.charAt(0).toUpperCase() || '?'}
                    </div>
                    <div className={`ml-3 flex-grow overflow-hidden transition-all duration-300 ${isSidebarOpen ? 'w-auto opacity-100' : 'w-0 opacity-0'}`}>
                        <p className="font-semibold text-gray-800 text-sm truncate">{user.name}</p>
                        <p className="text-xs text-gray-500 capitalize">{user.role}</p>
                    </div>
                </div>
            </div>

            <Modal show={isToolOpen} onClose={() => setIsToolOpen(false)}>
                <GoogleDriveUploader />
            </Modal>

            <Modal show={isEmbedModalOpen} onClose={() => setIsEmbedModalOpen(false)}>
                <h3 className="text-lg font-bold text-gray-800 mb-2">Embed Dashboard Digital Product</h3>
                <p className="text-sm text-gray-600 mb-4">
                    Salin dan tempel kode di bawah ini ke dalam file HTML di website atau aplikasi lain untuk menampilkan dashboard.
                </p>
                <textarea
                    readOnly
                    className="w-full h-32 p-3 border rounded-md font-mono text-sm bg-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={`<iframe \n  src="${route('dashboardDigitalProduct.embed')}" \n  style="border:0; width:100%; height:800px;" \n  allowfullscreen \n  scrolling="no">\n</iframe>`}
                    onClick={(e) => e.target.select()}
                />
                <div className="mt-2 text-xs text-gray-500">
                    Tips: Klik di dalam kotak untuk memilih semua teks, lalu salin (Ctrl+C). Anda bisa mengubah `width` dan `height` sesuai kebutuhan.
                </div>
            </Modal>
        </>
    );
};

export default function Sidebar({ user, isSidebarOpen, toggleSidebar, isCmsMode, onLogout }) {
    const [isDashboardOpen, setIsDashboardOpen] = useState(false);
    const [isConnectivityOpen, setIsConnectivityOpen] = useState(false);
    const [isReportsOpen, setIsReportsOpen] = useState(false);
    const [isDigitalProductOpen, setIsDigitalProductOpen] = useState(false);
    const [isSosOpen, setIsSosOpen] = useState(false);
    const [isAnalysisConnOpen, setIsAnalysisConnOpen] = useState(false);
    const [isAnalysisOpen, setIsAnalysisOpen] = useState(true); // Default open untuk admin

    // Cek route aktif menggunakan Inertia
    const isDashboardActive = route().current('dashboardDigitalProduct') || route().current('dashboard.sos');
    const isReportsActive = route().current('data-report.index') || route().current('galaksi.index');
    const isAdminAnalysisActive = route().current('admin.analysisDigitalProduct.index') || route().current('admin.analysisSOS.index');
    const isUserManagementActive = route().current('superadmin.users.*'); // <-- Sesuaikan dengan route group Anda
    const isRollbackActive = route().current('superadmin.rollback.show'); // <-- Sesuaikan dengan route group Anda

    useEffect(() => {
        if (isSidebarOpen && isAdminAnalysisActive) setIsAnalysisOpen(true);
        if (isSidebarOpen && isReportsActive) {
            setIsReportsOpen(true);
            if (route().current('data-report.index') || route().current('galaksi.index')) {
                setIsDigitalProductOpen(true);
            }
        }
        if (isSidebarOpen && isDashboardActive) setIsDashboardOpen(true);

        if (!isSidebarOpen) {
            setIsDashboardOpen(false);
            setIsConnectivityOpen(false);
            setIsReportsOpen(false);
            setIsDigitalProductOpen(false);
            setIsSosOpen(false);
            setIsAnalysisConnOpen(false);
            setIsAnalysisOpen(false);
        }
    }, [isSidebarOpen, isAdminAnalysisActive, isReportsActive, isDashboardActive]);

    const hasRole = (roleName) => user?.role === roleName;

    const showUserSidebar = !hasRole('superadmin') && (!hasRole('admin') || (hasRole('admin') && !isCmsMode));

    const showAdminCmsSidebar = hasRole('admin') && isCmsMode;

    return (
        <div className={`flex flex-col bg-white h-screen fixed shadow-lg z-30 transition-transform duration-300 ease-in-out
            ${isSidebarOpen ? 'translate-x-0 lg:w-64' : '-translate-x-full lg:translate-x-0 lg:w-20'}`}
        >
            <button
                onClick={toggleSidebar}
                className="hidden lg:block absolute -right-3 top-6 z-40 bg-white p-1 rounded-full shadow-md border hover:bg-gray-100 transition-colors"
            >
                {isSidebarOpen ? <FiChevronLeft size={16} /> : <FiChevronRight size={16} />}
            </button>

            <Logo isSidebarOpen={isSidebarOpen} />

            <nav className="flex-grow pt-4 overflow-y-auto overflow-x-hidden">

                {/* === TAMPILAN UNTUK SUPER ADMIN === */}
                {hasRole('superadmin') && (
                    <>
                        <NavLink href={route('superadmin.users.index')} active={isUserManagementActive} icon={<FiUsers size={22} />} isSidebarOpen={isSidebarOpen}>
                            User Management
                        </NavLink>
                        <NavLink href={route('superadmin.rollback.show')} active={isRollbackActive} icon={<MdHistory size={22} />} isSidebarOpen={isSidebarOpen}>
                            Rollback Batch
                        </NavLink>
                    </>
                )}

                {/* === TAMPILAN UNTUK ADMIN (CMS MODE) === */}
                {showAdminCmsSidebar && (
                    <>
                        <div className="relative">
                            <button onClick={() => isSidebarOpen && setIsAnalysisOpen(!isAnalysisOpen)} className={`w-full flex items-center py-4 text-gray-600 hover:bg-gray-100 transition duration-300 text-left ${isSidebarOpen ? 'px-6' : 'justify-center'} ${isAdminAnalysisActive ? 'bg-gray-200 text-gray-800 font-bold' : ''}`}>
                                <MdAssessment size={22} />
                                <span className={`ml-4 whitespace-nowrap transition-opacity duration-200 ${isSidebarOpen ? 'opacity-100' : 'opacity-0'}`}>Analisis Report</span>
                                {isSidebarOpen && <MdKeyboardArrowDown size={20} className={`ml-auto transition-transform duration-300 ${isAnalysisOpen ? 'rotate-180' : ''}`} />}
                            </button>
                            {isSidebarOpen && isAnalysisOpen && (
                                <div className="pl-12 pr-4 py-2 flex flex-col space-y-1">
                                    <Link href={route('admin.analysisDigitalProduct.index')} className={`block px-4 py-2 text-sm rounded-md ${route().current('admin.analysisDigitalProduct.index') ? 'bg-blue-100 text-blue-700 font-semibold' : 'hover:bg-gray-100'}`}>Report Digital Product</Link>
                                    <div>
                                        <button onClick={() => setIsAnalysisConnOpen(!isAnalysisConnOpen)} className="w-full flex items-center justify-between px-4 py-2 text-sm rounded-md hover:bg-gray-200">
                                            <span>Report Connectivity</span>
                                            <MdKeyboardArrowDown size={18} className={`transition-transform duration-300 ${isAnalysisConnOpen ? 'rotate-180' : ''}`} />
                                        </button>
                                        {isAnalysisConnOpen && (
                                            <div className="pl-6 mt-1 space-y-1">
                                                <Link href="#" className="block px-4 py-2 text-sm text-gray-400 cursor-not-allowed rounded-md">Report Jaringan Tambahan</Link>
                                                <Link href={route('admin.analysisSOS.index')} className={`block px-4 py-2 text-sm rounded-md ${route().current('admin.analysisSOS.index') ? 'bg-blue-100 text-blue-700 font-semibold' : 'hover:bg-gray-100'}`}>Report Datin</Link>
                                                <Link href="#" className="block px-4 py-2 text-sm text-gray-400 cursor-not-allowed rounded-md">Report HSI</Link>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </>
                )}

                {/* === TAMPILAN UNTUK USER BIASA (DAN ADMIN NON-CMS MODE) === */}
                {showUserSidebar && (
                    <>
                        <div className="relative">
                            <button onClick={() => isSidebarOpen && setIsDashboardOpen(!isDashboardOpen)} className={`w-full flex items-center py-4 text-gray-600 hover:bg-gray-100 transition duration-300 text-left ${isSidebarOpen ? 'px-6' : 'justify-center'} ${isDashboardActive ? 'bg-gray-200 text-gray-800 font-bold' : ''}`}>
                                <MdDashboard size={22} />
                                <span className={`ml-4 whitespace-nowrap transition-opacity duration-200 ${isSidebarOpen ? 'opacity-100' : 'opacity-0'}`}>Dashboard</span>
                                {isSidebarOpen && <MdKeyboardArrowDown size={20} className={`ml-auto transition-transform duration-300 ${isDashboardOpen ? 'rotate-180' : ''}`} />}
                            </button>
                            {isSidebarOpen && isDashboardOpen && (
                                <div className="pl-12 pr-4 py-2 flex flex-col space-y-1 bg-gray-50 border-t border-b">
                                    <Link href={route('dashboardDigitalProduct')} className={`block px-4 py-2 text-sm rounded-md ${route().current('dashboardDigitalProduct') ? 'bg-blue-100 text-blue-700 font-semibold' : 'hover:bg-gray-100'}`}>Dashboard Digital Product</Link>

                                    {/* [LANGKAH 3] Ganti Link statis menjadi komponen dropdown baru */}
                                    <div>
                                        <button onClick={() => setIsConnectivityOpen(!isConnectivityOpen)} className="w-full flex items-center text-left justify-between px-4 py-2 text-sm rounded-md text-gray-700 hover:bg-gray-200">
                                            <span>Dashboard Connectivity</span>
                                            <MdKeyboardArrowDown size={18} className={`transition-transform duration-300 ${isConnectivityOpen ? 'rotate-180' : ''}`} />
                                        </button>
                                        {isConnectivityOpen && (
                                            <div className="pl-6 mt-1 space-y-1">
                                                <Link href="#" className="block px-4 py-2 text-sm text-gray-400 cursor-not-allowed rounded-md text-left">Dashboard Jaringan Tambahan</Link>
                                                <Link
                                                    href={route('dashboard.sos')}
                                                    className={`block px-4 py-2 text-sm rounded-md text-left ${route().current('dashboard.sos') ? 'bg-blue-100 text-blue-700 font-semibold' : 'text-gray-700 hover:bg-gray-100'}`}
                                                >
                                                    Dashboard Datin
                                                </Link>
                                                <Link href="#" className="block px-4 py-2 text-sm text-gray-400 cursor-not-allowed rounded-md text-left">Dashboard HSI</Link>
                                            </div>
                                        )}
                                    </div>

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
                                    <div>
                                        <button onClick={() => setIsSosOpen(!isSosOpen)} className="w-full flex items-center justify-between px-4 py-2 text-sm rounded-md text-gray-700 hover:bg-gray-200">
                                            <span>Report Connectivity</span>
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

            <UserProfile user={user} isSidebarOpen={isSidebarOpen} onLogout={onLogout} />
        </div>
    );
}
