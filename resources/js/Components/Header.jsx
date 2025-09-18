// resources/js/Components/Header.jsx

import React from 'react';
import { FiSearch, FiBell } from 'react-icons/fi';

export default function Header({ title }) {
    return (
        <header className="bg-white shadow-sm p-4 flex justify-between items-center">
            <h1 className="text-2xl font-semibold text-gray-800">{title}</h1>
            <div className="flex items-center space-x-4">
                <FiSearch className="text-gray-500 hover:text-gray-800 cursor-pointer" size={22} />
                <FiBell className="text-gray-500 hover:text-gray-800 cursor-pointer" size={22} />
                {/* Anda bisa menambahkan dropdown user di sini nanti */}
            </div>
        </header>
    );
}
