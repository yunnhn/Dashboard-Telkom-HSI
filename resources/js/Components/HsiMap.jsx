import React from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

// --- DEFINISI WARNA MARKER ---
const STATUS_COLORS = {
    'Completed': '#10B981', // Hijau (PS)
    'Cancel': '#EF4444',    // Merah (Cancel/Reject)
    'Open': '#3B82F6',      // Biru (Proses)
    'DEFAULT': '#6B7280'    // Abu-abu (Fallback)
};

const HsiMap = ({ data }) => {
    // Tentukan titik tengah peta (Default Indonesia/Jatim)
    // Jika ada data, ambil koordinat data pertama sebagai pusat
    const center = data && data.length > 0
        ? [data[0].lat, data[0].lng]
        : [-7.536064, 112.238402]; // Default Jatim

    return (
        <MapContainer
            center={center}
            zoom={8}
            scrollWheelZoom={true}
            style={{ height: "100%", width: "100%", borderRadius: "8px", zIndex: 0 }}
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {data && data.map((item, index) => {
                // Ambil warna berdasarkan status_group dari backend
                const color = STATUS_COLORS[item.status_group] || STATUS_COLORS['DEFAULT'];

                return (
                    <CircleMarker
                        key={index}
                        center={[item.lat, item.lng]}
                        pathOptions={{
                            color: color,       // Warna Garis Lingkaran
                            fillColor: color,   // Warna Isi Lingkaran
                            fillOpacity: 0.7,   // Transparansi
                            weight: 1           // Ketebalan garis luar
                        }}
                        radius={5} // Ukuran titik
                    >
                        {/* Tooltip muncul saat mouse hover */}
                        <Tooltip direction="top" offset={[0, -5]} opacity={1}>
                            <span>{item.id} - {item.witel}</span>
                        </Tooltip>

                        {/* Popup muncul saat diklik */}
                        <Popup>
                            <div className="text-sm">
                                <p><strong>Order ID:</strong> {item.id}</p>
                                <p><strong>Pelanggan:</strong> {item.name}</p>
                                <p><strong>Witel:</strong> {item.witel}</p>
                                <p><strong>STO:</strong> {item.sto}</p>
                                <p><strong>Status:</strong> {item.status}</p>
                                <p><strong>Group:</strong> <span style={{color: color, fontWeight: 'bold'}}>{item.status_group}</span></p>
                            </div>
                        </Popup>
                    </CircleMarker>
                );
            })}
        </MapContainer>
    );
};

export default HsiMap;