"use client";

import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect } from "react";

// Fix default marker icons in Next.js
const icon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

// Marqueur bleu pour la position de l'utilisateur
const userIcon = L.divIcon({
  html: '<div style="width:16px;height:16px;background:#3b82f6;border:3px solid #fff;border-radius:50%;box-shadow:0 0 8px rgba(59,130,246,0.6)"></div>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
  className: "",
});

interface Place {
  id: number;
  name: string;
  description: string;
  category: string;
  address: string;
  city: string;
  latitude: number;
  longitude: number;
  image_url: string;
  phone: string;
  website: string;
  rating: number;
  is_partner: boolean;
}

interface MapViewProps {
  places: Place[];
  onSelect: (place: Place) => void;
  selected: Place | null;
  userLocation?: [number, number] | null;
}

function ChangeView({
  center,
  zoom,
}: {
  center: [number, number];
  zoom?: number;
}) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, zoom ?? map.getZoom(), { duration: 1 });
  }, [map, center, zoom]);
  return null;
}

export default function MapView({
  places,
  onSelect,
  selected,
  userLocation,
}: MapViewProps) {
  const defaultCenter: [number, number] = userLocation
    ? userLocation
    : places.length > 0 && places[0].latitude
      ? [places[0].latitude, places[0].longitude]
      : [48.8566, 2.3522];

  const center: [number, number] =
    selected && selected.latitude
      ? [selected.latitude, selected.longitude]
      : defaultCenter;

  return (
    <MapContainer
      center={defaultCenter}
      zoom={12}
      className="w-full h-full min-h-100"
      style={{ background: "#18181b" }}
    >
      <ChangeView center={center} />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />
      {places
        .filter((p) => p.latitude && p.longitude)
        .map((place) => (
          <Marker
            key={place.id}
            position={[place.latitude, place.longitude]}
            icon={icon}
            eventHandlers={{ click: () => onSelect(place) }}
          >
            <Popup>
              <div className="text-zinc-900">
                <strong>{place.name}</strong>
                <br />
                <span className="text-xs">
                  {place.category} — {place.city}
                </span>
              </div>
            </Popup>
          </Marker>
        ))}
      {userLocation && (
        <Marker position={userLocation} icon={userIcon}>
          <Popup>
            <div className="text-zinc-900 text-sm font-medium">
              Votre position
            </div>
          </Popup>
        </Marker>
      )}
    </MapContainer>
  );
}
