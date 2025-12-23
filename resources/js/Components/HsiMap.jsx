// resources/js/Components/HsiMap.jsx

import React from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

export default function HsiMap({ data }) {
    // Titik tengah peta (sekitar Bali/Jatim)
    const center = [-8.409518, 115.188919];

    // Fungsi untuk menentukan warna marker
    const getMarkerColor = (item) => {
        // 1. Cek Anomali terlebih dahulu (Prioritas Utama)
        // Jika backend menandai sebagai 'anomaly', warnai ABU-ABU.
        if (item.marker_status === 'anomaly') {
            return '#6b7280'; // Gray (Abu-abu)
        }

        // 2. Jika Valid, warnai berdasarkan status order
        const status = item.status ? item.status.toUpperCase() : '';
        if (status.includes('PS') || status.includes('COMPLETED')) {
            return '#10b981'; // Green (Hijau - Completed)
        } else if (status.includes('CANCEL')) {
            return '#ef4444'; // Red (Merah - Cancel)
        } else {
            return '#f59e0b'; // Yellow/Orange (Kuning - Open/Progress)
        }
    };

    return (
        <MapContainer center={center} zoom={7} scrollWheelZoom={true} style={{ height: "100%", width: "100%", zIndex: 0 }}>
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            {data.map((item, index) => {
                const color = getMarkerColor(item);
                // Jika anomali, buat sedikit lebih transparan agar tidak terlalu mencolok
                const opacity = item.marker_status === 'anomaly' ? 0.6 : 0.8;

                return (
                <CircleMarker 
                    key={index} 
                    center={[item.lat, item.lng]}
                    pathOptions={{ color: color, fillColor: color, fillOpacity: opacity, weight: 1 }}
                    radius={5} // Ukuran marker
                >
                    <Popup>
                        <div className="text-sm">
                            <p><strong>ID:</strong> {item.id}</p>
                            <p><strong>Customer:</strong> {item.name}</p>
                            <p><strong>Witel Data:</strong> {item.witel}</p>
                            {/* Tampilkan status anomali di popup */}
                            {item.marker_status === 'anomaly' && (
                                <p className="text-red-600 font-bold">STATUS: ANOMALI LOKASI</p>
                            )}
                             {item.actual_loc && item.marker_status === 'anomaly' && (
                                <p className="text-xs text-gray-600">(Terdeteksi di: {item.actual_loc})</p>
                            )}
                            <hr className="my-1"/>
                            <p><strong>Status:</strong> {item.status}</p>
                            <p><strong>STO:</strong> {item.sto}</p>
                        </div>
                    </Popup>
                </CircleMarker>
                );
            })}
        </MapContainer>
    );
}