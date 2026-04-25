import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, LocateFixed, Navigation } from 'lucide-react';
import { cn } from '../lib/utils';

// Fix for default marker icons in Leaflet with React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface MapPickerProps {
  onLocationSelect: (lat: number, lng: number) => void;
  initialLocation?: { lat: number; lng: number };
}

// Komponen untuk menangani klik di peta
function LocationMarker({ onLocationSelect, initialLocation }: { onLocationSelect: (lat: number, lng: number) => void; initialLocation?: { lat: number; lng: number } }) {
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(initialLocation || null);

  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      setPosition({ lat, lng });
      onLocationSelect(lat, lng);
    },
  });

  return position === null ? null : (
    <Marker position={[position.lat, position.lng]}>
      <Popup>Lokasi Rumah Anda</Popup>
    </Marker>
  );
}

// Komponen untuk tombol "Gunakan Lokasi Saat Ini"
function LocationButton({ onLocationFound, isLoading }: { onLocationFound: (lat: number, lng: number) => void; isLoading: boolean }) {
  const map = useMap();

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      alert("Browser Anda tidak mendukung geolokasi");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        map.flyTo([latitude, longitude], 16);
        onLocationFound(latitude, longitude);
      },
      (error) => {
        console.error("Error getting location:", error);
        let errorMessage = "Tidak dapat mengambil lokasi Anda. ";
        switch(error.code) {
          case error.PERMISSION_DENIED:
            errorMessage += "Izin lokasi ditolak. Silakan izinkan akses lokasi di browser Anda.";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage += "Informasi lokasi tidak tersedia.";
            break;
          case error.TIMEOUT:
            errorMessage += "Waktu permintaan lokasi habis.";
            break;
          default:
            errorMessage += "Terjadi kesalahan.";
        }
        alert(errorMessage);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  return (
    <button
      onClick={handleGetLocation}
      disabled={isLoading}
      className="absolute bottom-3 right-3 z-[1000] bg-white rounded-full p-2 shadow-md hover:bg-gray-100 transition-colors disabled:opacity-50"
      title="Gunakan lokasi saya saat ini"
    >
      {isLoading ? (
        <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      ) : (
        <LocateFixed size={20} className="text-blue-600" />
      )}
    </button>
  );
}

export default function MapPicker({ onLocationSelect, initialLocation }: MapPickerProps) {
  const defaultCenter: [number, number] = initialLocation 
    ? [initialLocation.lat, initialLocation.lng] 
    : [-2.548926, 118.014863]; // Default ke tengah Indonesia

  const [mapType, setMapType] = useState<'street' | 'satellite'>('street');
  const [isLocating, setIsLocating] = useState(false);

  // URL untuk berbagai tile layer
  const tileLayers = {
    street: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  };

  const attributions = {
    street: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    satellite: '&copy; <a href="https://www.esri.com">Esri</a> | Maxar, Earthstar Geographics, and the GIS User Community',
  };

  const handleLocationFound = (lat: number, lng: number) => {
    setIsLocating(false);
    onLocationSelect(lat, lng);
  };

  const handleGetLocationStart = () => {
    setIsLocating(true);
  };

  // Wrapper untuk menangani loading state
  const handleGetLocation = () => {
    // Loading state akan diatur di komponen LocationButton
  };

  return (
    <div className="relative">
      {/* Tombol Toggle Peta */}
      <div className="absolute top-3 right-3 z-[1000] flex gap-2 bg-white rounded-lg shadow-md p-1">
        <button
          onClick={() => setMapType('street')}
          className={cn(
            "px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
            mapType === 'street' 
              ? "bg-blue-600 text-white" 
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          )}
        >
          Peta
        </button>
        <button
          onClick={() => setMapType('satellite')}
          className={cn(
            "px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
            mapType === 'satellite' 
              ? "bg-blue-600 text-white" 
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          )}
        >
          Satelit
        </button>
      </div>

      <MapContainer
        center={defaultCenter}
        zoom={13}
        style={{ height: "400px", width: "100%", borderRadius: "0.75rem", zIndex: 1 }}
        className="border border-slate-200"
      >
        <TileLayer
          url={tileLayers[mapType]}
          attribution={attributions[mapType]}
        />
        <LocationMarker onLocationSelect={onLocationSelect} initialLocation={initialLocation} />
        <LocationButton onLocationFound={handleLocationFound} isLoading={isLocating} />
      </MapContainer>

      {/* Fungsi untuk trigger location dari luar MapContainer */}
      <button
        onClick={() => {
          setIsLocating(true);
          if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
              (position) => {
                const { latitude, longitude } = position.coords;
                handleLocationFound(latitude, longitude);
                // Kita perlu akses ke map instance, tapi karena LocationButton sudah handle, kita trigger event
                const mapElement = document.querySelector('.leaflet-container');
                if (mapElement && (mapElement as any)._leaflet_map) {
                  const map = (mapElement as any)._leaflet_map;
                  map.flyTo([latitude, longitude], 16);
                }
                setIsLocating(false);
              },
              (error) => {
                console.error(error);
                setIsLocating(false);
                let errorMessage = "Tidak dapat mengambil lokasi. ";
                if (error.code === 1) errorMessage += "Izin lokasi ditolak.";
                else errorMessage += "Silakan coba lagi.";
                alert(errorMessage);
              }
            );
          } else {
            setIsLocating(false);
            alert("Browser Anda tidak mendukung geolokasi");
          }
        }}
        className="absolute bottom-3 right-3 z-[1000] bg-white rounded-full p-2 shadow-md hover:bg-gray-100 transition-colors flex items-center gap-2"
        title="Gunakan lokasi saya saat ini"
      >
        {isLocating ? (
          <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        ) : (
          <LocateFixed size={20} className="text-blue-600" />
        )}
      </button>
      
      <p className="text-xs text-slate-500 mt-2 text-center">
        💡 Klik pada peta untuk menandai lokasi rumah Anda. Klik tombol <LocateFixed size={12} className="inline" /> untuk menggunakan lokasi otomatis.
      </p>
    </div>
  );
}
