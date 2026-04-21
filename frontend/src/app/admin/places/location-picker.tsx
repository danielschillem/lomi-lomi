"use client";

import {
  MapContainer,
  TileLayer,
  Marker,
  useMapEvents,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useState } from "react";
import { LocateFixed } from "lucide-react";

const pinIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

interface LocationPickerProps {
  latitude: number;
  longitude: number;
  onChange: (lat: number, lng: number) => void;
}

function ClickHandler({
  onChange,
}: {
  onChange: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      onChange(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function RecenterOnChange({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    if (lat && lng) {
      map.flyTo([lat, lng], map.getZoom(), { duration: 0.5 });
    }
  }, [map, lat, lng]);
  return null;
}

export default function LocationPicker({
  latitude,
  longitude,
  onChange,
}: LocationPickerProps) {
  const hasPosition = latitude !== 0 && longitude !== 0;
  const center: [number, number] = hasPosition
    ? [latitude, longitude]
    : [48.8566, 2.3522];

  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  function handleGeolocate() {
    if (!navigator.geolocation) {
      setGpsError("Géolocalisation non supportée par ce navigateur");
      return;
    }
    setGpsLoading(true);
    setGpsError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onChange(pos.coords.latitude, pos.coords.longitude);
        setGpsLoading(false);
      },
      (err) => {
        const messages: Record<number, string> = {
          1: "Permission refusée — autorisez la localisation",
          2: "Position indisponible",
          3: "Délai dépassé",
        };
        setGpsError(messages[err.code] || "Erreur de géolocalisation");
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs text-zinc-500 block">
          Cliquez sur la carte ou utilisez le GPS
        </label>
        <button
          type="button"
          onClick={handleGeolocate}
          disabled={gpsLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-500 disabled:bg-zinc-700 text-white text-xs font-medium rounded-lg transition-colors"
        >
          <LocateFixed size={14} className={gpsLoading ? "animate-spin" : ""} />
          {gpsLoading ? "Localisation…" : "Ma position GPS"}
        </button>
      </div>
      {gpsError && (
        <p className="text-xs text-red-400">{gpsError}</p>
      )}
      <div className="rounded-lg overflow-hidden border border-zinc-700 h-56">
        <MapContainer
          center={center}
          zoom={hasPosition ? 15 : 12}
          className="w-full h-full"
          style={{ background: "#18181b" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />
          <ClickHandler onChange={onChange} />
          {hasPosition && (
            <>
              <RecenterOnChange lat={latitude} lng={longitude} />
              <Marker position={[latitude, longitude]} icon={pinIcon} />
            </>
          )}
        </MapContainer>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-zinc-500 mb-1 block">Latitude</label>
          <input
            type="number"
            step="any"
            title="Latitude"
            value={latitude}
            onChange={(e) =>
              onChange(parseFloat(e.target.value) || 0, longitude)
            }
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500"
          />
        </div>
        <div>
          <label className="text-xs text-zinc-500 mb-1 block">Longitude</label>
          <input
            type="number"
            step="any"
            title="Longitude"
            value={longitude}
            onChange={(e) =>
              onChange(latitude, parseFloat(e.target.value) || 0)
            }
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500"
          />
        </div>
      </div>
    </div>
  );
}
