// Tambahkan impor ikon baru ini di bagian atas file Anda
import { FiUser, FiLogOut } from 'react-icons/fi';

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