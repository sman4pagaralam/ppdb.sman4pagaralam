import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { LocateFixed } from 'lucide-react';
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
  autoLocate?: boolean;
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

// Komponen khusus untuk auto locate
function AutoLocate({ autoLocate, onLocationFound }: { autoLocate: boolean; onLocationFound: (lat: number, lng: number) => void }) {
  const map = useMap();
  const [hasLocated, setHasLocated] = useState(false);

  useEffect(() => {
    if (autoLocate && !hasLocated && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          map.flyTo([latitude, longitude], 16);
          onLocationFound(latitude, longitude);
          setHasLocated(true);
        },
        (error) => {
          console.error("Geolocation error:", error);
          setHasLocated(true); // Jangan coba lagi
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        }
      );
    }
  }, [autoLocate, hasLocated, map, onLocationFound]);

  return null;
}

// Komponen tombol lokasi manual
function ManualLocationButton({ onLocationFound }: { onLocationFound: (lat: number, lng: number) => void }) {
  const map = useMap();
  const [isLoading, setIsLoading] = useState(false);

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      alert("Browser Anda tidak mendukung geolokasi");
      return;
    }

    setIsLoading(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        map.flyTo([latitude, longitude], 16);
        onLocationFound(latitude, longitude);
        setIsLoading(false);
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
        setIsLoading(false);
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

export default function MapPicker({ onLocationSelect, initialLocation, autoLocate = true }: MapPickerProps) {
  const defaultCenter: [number, number] = initialLocation 
    ? [initialLocation.lat, initialLocation.lng] 
    : [-2.548926, 118.014863];

  const [mapType, setMapType] = useState<'street' | 'satellite'>('street');

  const tileLayers = {
    street: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  };

  const attributions = {
    street: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    satellite: '&copy; <a href="https://www.esri.com">Esri</a> | Maxar, Earthstar Geographics, and the GIS User Community',
  };

  const handleLocationFound = (lat: number, lng: number) => {
    onLocationSelect(lat, lng);
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
        <AutoLocate autoLocate={autoLocate} onLocationFound={handleLocationFound} />
        <ManualLocationButton onLocationFound={handleLocationFound} />
      </MapContainer>
      
      <p className="text-xs text-slate-500 mt-2 text-center">
        💡 Klik pada peta untuk menandai lokasi rumah Anda. Klik tombol <LocateFixed size={12} className="inline" /> untuk menggunakan lokasi otomatis.
      </p>
    </div>
  );
}
