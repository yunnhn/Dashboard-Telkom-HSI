import React, { useState, useEffect, useRef } from 'react';
import { Link, router } from '@inertiajs/react';
import { MdDashboard, MdAssessment, MdKeyboardArrowDown, MdWifiTethering, MdExitToApp, MdCode, MdHistory } from 'react-icons/md';
import { FiUsers, FiChevronLeft, FiChevronRight, FiUser, FiX } from 'react-icons/fi';
import GoogleDriveUploader from '@/Components/GoogleDriveUploader';

// --- HELPER COMPONENTS (Tetap Sama) ---
const Logo = ({ isSidebarOpen }) => (
    <div className="flex items-center justify-center h-20 border-b border-gray-200 relative overflow-hidden">
        <div className={`transition-opacity duration-200 ${isSidebarOpen ? 'opacity-100' : 'opacity-0'}`}>
            <h1 className="text-2xl font-bold text-red-600">Telkom<span className="text-gray-800">Indonesia</span></h1>
        </div>
        <div className={`absolute transition-opacity duration-200 ${!isSidebarOpen ? 'opacity-100' : 'opacity-0'}`}>
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

// --- MODAL & USER PROFILE (Tetap Sama) ---
const Modal = ({ show, onClose, children }) => {
    if (!show) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl transform transition-all max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="p-6 relative">
                    <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10"><FiX size={24} /></button>
                    {children}
                </div>
            </div>
        </div>
    );
};

const UserProfile = ({ user, isSidebarOpen, onLogout }) => {
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isToolOpen, setIsToolOpen] = useState(false);
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
                            {user.role === 'superadmin' && (
                                <Link href={route('tools.google-drive-test')} className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                                    <MdWifiTethering className="mr-3" size={16} /> Cek Konektivitas Google
                                </Link>
                            )}
                            {(user.role === 'superadmin' || user.role === 'admin') && (
                                <>
                                    <Link href={route('admin.merge-excel.create')} className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" onClick={() => setIsProfileOpen(false)}>
                                        <MdAssessment className="mr-3" /> Merge Excel
                                    </Link>
                                    <Link href={route('admin.embed.show')} className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" onClick={() => setIsProfileOpen(false)}>
                                        <MdCode className="mr-3" /> Embed Dashboard
                                    </Link>
                                </>
                            )}
                            <Link href={route('profile.edit')} className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" onClick={() => setIsProfileOpen(false)}>
                                <FiUser className="mr-3" />Edit Profile
                            </Link>
                            <button onClick={onLogout} className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-red-700 hover:bg-red-100">
                                <MdExitToApp className="text-red-500" /> <span>Logout</span>
                            </button>
                        </div>
                    </div>
                )}
                <div className={`flex items-center cursor-pointer p-2 rounded-lg hover:bg-gray-100 ${!isSidebarOpen && 'justify-center'}`} onClick={() => setIsProfileOpen(!isProfileOpen)}>
                    <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">{user.name?.charAt(0).toUpperCase() || '?'}</div>
                    <div className={`ml-3 flex-grow overflow-hidden transition-all duration-300 ${isSidebarOpen ? 'w-auto opacity-100' : 'w-0 opacity-0'}`}>
                        <p className="font-semibold text-gray-800 text-sm truncate">{user.name}</p>
                        <p className="text-xs text-gray-500 capitalize">{user.role}</p>
                    </div>
                </div>
            </div>
            <Modal show={isToolOpen} onClose={() => setIsToolOpen(false)}><GoogleDriveUploader /></Modal>
        </>
    );
};

// --- KOMPONEN UTAMA SIDEBAR (UPDATE DI SINI) ---
export default function Sidebar({ user, isSidebarOpen, toggleSidebar, isCmsMode, onLogout }) {
    const [isDashboardOpen, setIsDashboardOpen] = useState(false);
    const [isConnectivityOpen, setIsConnectivityOpen] = useState(false);
    const [isReportsOpen, setIsReportsOpen] = useState(false);
    const [isDigitalProductOpen, setIsDigitalProductOpen] = useState(false);
    const [isSosOpen, setIsSosOpen] = useState(false);
    const [isAnalysisConnOpen, setIsAnalysisConnOpen] = useState(false);
    const [isAnalysisOpen, setIsAnalysisOpen] = useState(true);

    // Cek Route Aktif
    const isDashboardActive = route().current('dashboardDigitalProduct') || 
                              route().current('dashboard.sos') || 
                              route().current('dashboard.jt') || 
                              route().current('dashboard.hsi') ||
                              route().current('flow.hsi'); 

    const isReportsActive = route().current('data-report.index') || 
                            route().current('galaksi.index') || 
                            route().current('report.datin') || 
                            route().current('report.jt') || 
                            route().current('report.hsi');

    // PERBAIKAN: Menggunakan nama route yang benar (admin.report_hsi.index)
    const isAdminAnalysisActive = route().current('admin.analysisDigitalProduct.index') || 
                                  route().current('admin.analysisSOS.index') ||
                                  route().current('admin.report_hsi.index'); // <-- Update ini juga agar menu induk aktif

    const isUserManagementActive = route().current('superadmin.users.*');
    const isRollbackActive = route().current('superadmin.rollback.show');

    useEffect(() => {
        if (isSidebarOpen && isAdminAnalysisActive) setIsAnalysisOpen(true);
        
        if (isSidebarOpen && isReportsActive) {
            setIsReportsOpen(true);
            if (route().current('data-report.index') || route().current('galaksi.index')) {
                setIsDigitalProductOpen(true);
            }
            if (route().current('report.datin') || route().current('report.jt') || route().current('report.hsi')) {
                setIsSosOpen(true);
            }
        }

        if (isSidebarOpen && isDashboardActive) {
            setIsDashboardOpen(true);
            // Buka dropdown connectivity jika salah satu dashboard connectivity aktif
            if (route().current('dashboard.sos') || route().current('dashboard.jt') || route().current('dashboard.hsi') || route().current('flow.hsi')) {
                setIsConnectivityOpen(true);
            }
        }

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
        <div className={`flex flex-col bg-white h-screen fixed shadow-lg z-30 transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0 lg:w-64' : '-translate-x-full lg:translate-x-0 lg:w-20'}`}>
            <button onClick={toggleSidebar} className="hidden lg:block absolute -right-3 top-6 z-40 bg-white p-1 rounded-full shadow-md border hover:bg-gray-100 transition-colors">
                {isSidebarOpen ? <FiChevronLeft size={16} /> : <FiChevronRight size={16} />}
            </button>

            <Logo isSidebarOpen={isSidebarOpen} />

            <nav className="flex-grow pt-4 overflow-y-auto overflow-x-hidden">
                
                {/* --- SUPER ADMIN --- */}
                {hasRole('superadmin') && (
                    <>
                        <NavLink href={route('superadmin.users.index')} active={isUserManagementActive} icon={<FiUsers size={22} />} isSidebarOpen={isSidebarOpen}>User Management</NavLink>
                        <NavLink href={route('superadmin.rollback.show')} active={isRollbackActive} icon={<MdHistory size={22} />} isSidebarOpen={isSidebarOpen}>Rollback Batch</NavLink>
                    </>
                )}

                {/* --- ADMIN CMS --- */}
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
                                                <Link href={route('admin.analysisJT.index')} className={`block px-4 py-2 text-sm rounded-md ${route().current('admin.analysisJT.index') ? 'bg-blue-100 text-blue-700 font-semibold' : 'hover:bg-gray-100'}`}>Report Jaringan Tambahan</Link>
                                                <Link href={route('admin.analysisSOS.index')} className={`block px-4 py-2 text-sm rounded-md ${route().current('admin.analysisSOS.index') ? 'bg-blue-100 text-blue-700 font-semibold' : 'hover:bg-gray-100'}`}>Report Datin</Link>
                                                
                                                {/* --- PERBAIKAN DI SINI: MENGGUNAKAN UNDERSCORE --- */}
                                                <Link 
                                                    href={route('admin.report_hsi.index')} 
                                                    className={`block px-4 py-2 text-sm rounded-md ${route().current('admin.report_hsi.index') ? 'bg-blue-100 text-blue-700 font-semibold' : 'hover:bg-gray-100'}`}
                                                >
                                                    Report HSI
                                                </Link>
                                                
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                            <div className={`px-6 w-full items-center py-4 text-gray-600 hover:bg-gray-100 transition duration-300 text-left`}>
                                <Link href={route('admin.masterDataPO.index')} className={`block px-4 py-2 text-sm rounded-md ${route().current('admin.masterDataPO.index') ? 'bg-blue-100 text-blue-700 font-semibold' : 'hover:bg-gray-100'}`}>Master Data PO</Link>
                            </div>
                        </div>
                    </>
                )}

                {/* --- USER / ADMIN NON-CMS --- */}
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
                                    <Link href={route('dashboardDigitalProduct')} className={`block px-4 py-2 text-sm rounded-md text-left ${route().current('dashboardDigitalProduct') ? 'bg-blue-100 text-blue-700 font-semibold' : 'hover:bg-gray-100'}`}>Dashboard Digital Product</Link>
                                    <div>
                                        <button onClick={() => setIsConnectivityOpen(!isConnectivityOpen)} className="w-full flex items-center text-left justify-between px-4 py-2 text-sm rounded-md text-gray-700 hover:bg-gray-200">
                                            <span>Dashboard Connectivity</span>
                                            <MdKeyboardArrowDown size={18} className={`transition-transform duration-300 ${isConnectivityOpen ? 'rotate-180' : ''}`} />
                                        </button>
                                        {isConnectivityOpen && (
                                            <div className="pl-6 mt-1 space-y-1">
                                                <Link href={route('dashboard.jt')} className={`block px-4 py-2 text-sm rounded-md text-left ${route().current('dashboard.jt') ? 'bg-blue-100 text-blue-700 font-semibold' : 'text-gray-700 hover:bg-gray-100'}`}>Dashboard Jaringan Tambahan</Link>
                                                <Link href={route('dashboard.sos')} className={`block px-4 py-2 text-sm rounded-md text-left ${route().current('dashboard.sos') ? 'bg-blue-100 text-blue-700 font-semibold' : 'text-gray-700 hover:bg-gray-100'}`}>Dashboard Datin</Link>
                                                
                                                {/* ========================================= */}
                                                {/* MENU BARU HSI (GRAFIK & FLOW)             */}
                                                {/* ========================================= */}
                                                <Link href={route('dashboard.hsi')} className={`block px-4 py-2 text-sm rounded-md text-left ${route().current('dashboard.hsi') ? 'bg-blue-100 text-blue-700 font-semibold' : 'text-gray-700 hover:bg-gray-100'}`}>Dashboard HSI</Link>
                                                <Link href={route('flow.hsi')} className={`block px-4 py-2 text-sm rounded-md text-left ${route().current('flow.hsi') ? 'bg-blue-100 text-blue-700 font-semibold' : 'text-gray-700 hover:bg-gray-100'}`}>Flow Process HSI</Link>
                                                {/* ========================================= */}

                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* REPORTS SECTION */}
                        <div className="relative">
                            <button onClick={() => isSidebarOpen && setIsReportsOpen(!isReportsOpen)} className={`w-full flex items-center py-4 text-gray-600 hover:bg-gray-100 transition duration-300 text-left ${isSidebarOpen ? 'px-6' : 'justify-center'} ${isReportsActive ? 'bg-gray-200 text-gray-800 font-bold' : ''}`}>
                                <MdAssessment size={22} />
                                <span className={`ml-4 whitespace-nowrap transition-opacity duration-200 ${isSidebarOpen ? 'opacity-100' : 'opacity-0'}`}>Reports</span>
                                {isSidebarOpen && <MdKeyboardArrowDown size={20} className={`ml-auto transition-transform duration-300 ${isReportsOpen ? 'rotate-180' : ''}`} />}
                            </button>
                            {isSidebarOpen && isReportsOpen && (
                                <div className="pl-8 pr-4 py-2 flex flex-col space-y-1 bg-gray-50 border-t border-b">
                                    <Link href={route('data-report.index')} className={`block px-4 py-2 text-sm rounded-md text-left ${route().current('data-report.index') ? 'bg-blue-100 text-blue-700 font-semibold' : 'hover:bg-gray-100'}`}>Report Digital Product</Link>
                                    <div>
                                        <button onClick={() => setIsSosOpen(!isSosOpen)} className="w-full flex items-center justify-between px-4 py-2 text-sm rounded-md text-gray-700 hover:bg-gray-200 text-left">
                                            <span>Report Connectivity</span>
                                            <MdKeyboardArrowDown size={18} className={`transition-transform duration-300 ${isSosOpen ? 'rotate-180' : ''}`} />
                                        </button>
                                        {isSosOpen && (
                                            <div className="pl-6 mt-1 space-y-1">
                                                <Link href={route('report.jt')} className={`block px-4 py-2 text-sm rounded-md text-left ${route().current('report.jt') ? 'bg-blue-100 text-blue-700 font-semibold' : 'text-gray-700 hover:bg-gray-100'}`}>Report Jaringan Tambahan</Link>
                                                <Link href={route('report.datin')} className={`block px-4 py-2 text-sm rounded-md text-left ${route().current('report.datin') ? 'bg-blue-100 text-blue-700 font-semibold' : 'text-gray-700 hover:bg-gray-100'}`}>Report Datin</Link>
                                                <Link href={route('report.hsi')} className={`block px-4 py-2 text-sm rounded-md text-left ${route().current('report.hsi') ? 'bg-blue-100 text-blue-700 font-semibold' : 'text-gray-700 hover:bg-gray-100'}`}>Report HSI</Link>
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