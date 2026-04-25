import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin } from 'lucide-react';
import { cn } from '../lib/utils'; // ← IMPORT CN

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

export default function MapPicker({ onLocationSelect, initialLocation }: MapPickerProps) {
  const defaultCenter: [number, number] = initialLocation 
    ? [initialLocation.lat, initialLocation.lng] 
    : [-2.548926, 118.014863]; // Default ke tengah Indonesia

  const [mapType, setMapType] = useState<'street' | 'satellite'>('street');

  // URL untuk berbagai tile layer
  const tileLayers = {
    street: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  };

  const attributions = {
    street: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    satellite: '&copy; <a href="https://www.esri.com">Esri</a> | Maxar, Earthstar Geographics, and the GIS User Community',
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
      </MapContainer>
      
      <p className="text-xs text-slate-500 mt-2 text-center">
        💡 Klik pada peta untuk menandai lokasi rumah Anda. Gunakan tombol di atas untuk beralih antara peta biasa dan satelit.
      </p>
    </div>
  );
}
