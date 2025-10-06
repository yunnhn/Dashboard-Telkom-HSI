import { Link } from '@inertiajs/react';

const Logo = () => (
    <div className="text-center">
        <h1 className="text-4xl font-bold text-red-600 drop-shadow-md">
            Telkom<span className="text-gray-800">Indonesia</span>
        </h1>
        <p className="mt-2 text-sm text-gray-700 font-medium">Digital Product & Service Analysis</p>
    </div>
);

export default function Guest({ children }) {
    return (
        // [DIUBAH] Tambahkan 'overflow-hidden' untuk mencegah scroll
        <div className="relative min-h-screen flex flex-col sm:justify-center items-center pt-6 sm:pt-0 overflow-hidden">
            {/* Background Image with Blur Effect */}
            <div
                className="absolute inset-0 bg-cover bg-center filter blur-sm"
                style={{
                    backgroundImage: "url('/images/tlt surabaya.jpg')",
                    // Skala diperbesar sedikit lagi untuk memastikan tepi tidak terlihat
                    transform: 'scale(1.1)',
                }}
            ></div>
            {/* Dark Overlay */}
            <div className="absolute inset-0 bg-black opacity-30"></div>

            {/* Content Card (Not Blurred) */}
            <div className="relative w-full sm:max-w-md mt-6 px-6 py-8 bg-white/70 shadow-2xl overflow-hidden sm:rounded-lg backdrop-blur-sm border border-white/20">
                <div className="mb-6">
                    <Logo />
                </div>
                {children}
            </div>
        </div>
    );
}

