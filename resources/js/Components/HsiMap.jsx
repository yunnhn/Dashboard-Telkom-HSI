import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// --- Fix Icon Leaflet di React/Vite ---
// Tanpa fix ini, icon marker default seringkali tidak muncul (broken image).
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34]
});

L.Marker.prototype.options.icon = DefaultIcon;

// --- Custom Icon Berwarna (Opsional tapi Bagus) ---
// Kita buat fungsi sederhana untuk mengganti warna filter CSS atau pakai circle marker
// Untuk simplifikasi, kita pakai marker default dulu. 
// Jika ingin warna, cara termudah tanpa aset gambar tambahan adalah CircleMarker.

import { CircleMarker } from 'react-leaflet';

export default function HsiMap({ data }) {
    // Pusat peta default (misal tengah-tengah area Jatim/Bali)
    // Sesuaikan dengan rata-rata koordinat data Anda jika perlu
    const defaultCenter = [-8.409518, 115.188919]; // Koordinat Bali sebagai default

    // Tentukan warna berdasarkan status
    const getColor = (status) => {
        const s = status ? status.toUpperCase() : '';
        if (s.includes('PS') || s.includes('COMPLETED')) return 'green';
        if (s.includes('CANCEL') || s.includes('DECLINE')) return 'red';
        if (s.includes('FALLOUT') || s.includes('UNSC')) return 'orange';
        return 'blue'; // Default / In Progress
    };

    return (
        <div className="h-96 w-full rounded-lg overflow-hidden border border-gray-300 z-0 relative">
            <MapContainer 
                center={defaultCenter} 
                zoom={8} 
                scrollWheelZoom={true} 
                style={{ height: "100%", width: "100%", zIndex: 0 }}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                
                {data.map((point, idx) => (
                    // Validasi: pastikan lat/lng ada dan bukan 0
                    (point.lat && point.lng && point.lat !== 0 && point.lng !== 0) ? (
                        <CircleMarker 
                            key={idx} 
                            center={[point.lat, point.lng]}
                            pathOptions={{ color: getColor(point.status), fillColor: getColor(point.status), fillOpacity: 0.7 }}
                            radius={6} // Ukuran titik
                        >
                            <Popup>
                                <div className="text-sm">
                                    <p className="font-bold text-gray-800">{point.name || 'No Name'}</p>
                                    <div className="mt-1 text-xs text-gray-600 space-y-1">
                                        <p><strong>Order ID:</strong> {point.id}</p>
                                        <p><strong>Witel:</strong> {point.witel}</p>
                                        <p><strong>STO:</strong> {point.sto}</p>
                                        <p><strong>Status:</strong> <span className={`font-bold text-${getColor(point.status)}-600`}>{point.status}</span></p>
                                    </div>
                                </div>
                            </Popup>
                        </CircleMarker>
                    ) : null
                ))}
            </MapContainer>
        </div>
    );
}