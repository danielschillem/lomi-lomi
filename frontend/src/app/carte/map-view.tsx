"use client";

import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useState } from "react";
import { Map, Satellite, Mountain } from "lucide-react";

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

const tileLayers = {
  standard: {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
    label: "Standard",
    Icon: Map,
  },
  satellite: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution:
      '&copy; <a href="https://www.esri.com">Esri</a> &mdash; Sources: Esri, DigitalGlobe',
    label: "Satellite",
    Icon: Satellite,
  },
  terrain: {
    url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    attribution:
      '&copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)',
    label: "Relief",
    Icon: Mountain,
  },
} as const;

type LayerKey = keyof typeof tileLayers;

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
  const [layer, setLayer] = useState<LayerKey>("standard");

  const defaultCenter: [number, number] = userLocation
    ? userLocation
    : places.length > 0 && places[0].latitude
      ? [places[0].latitude, places[0].longitude]
      : [12.3714, -1.5197];

  const center: [number, number] =
    selected && selected.latitude
      ? [selected.latitude, selected.longitude]
      : defaultCenter;

  const currentLayer = tileLayers[layer];

  return (
    <div className="relative w-full h-full">
      <MapContainer
        center={defaultCenter}
        zoom={12}
        className="w-full h-full"
        style={{ background: "#f5f5f5", minHeight: "300px" }}
      >
        <ChangeView center={center} />
        <TileLayer
          key={layer}
          attribution={currentLayer.attribution}
          url={currentLayer.url}
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
                <div className="text-foreground">
                  <strong>{place.name}</strong>
                  <br />
                  <span className="text-xs">
                    {place.category} - {place.city}
                  </span>
                </div>
              </Popup>
            </Marker>
          ))}
        {userLocation && (
          <Marker position={userLocation} icon={userIcon}>
            <Popup>
              <div className="text-foreground text-sm font-medium">
                Votre position
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>

      {/* Layer switcher */}
      <div className="absolute top-3 right-3 z-1000 flex flex-col gap-1 bg-white rounded-xl shadow-lg border border-gray-200 p-1">
        {(Object.keys(tileLayers) as LayerKey[]).map((key) => {
          const { label, Icon } = tileLayers[key];
          return (
            <button
              key={key}
              onClick={() => setLayer(key)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                layer === key
                  ? "bg-blue-500/15 text-blue-600"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
