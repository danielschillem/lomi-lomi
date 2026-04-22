"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Radar as RadarIcon, User, Wifi, WifiOff } from "lucide-react";
import Link from "next/link";
import { nearbyUsers } from "@/lib/api";

interface NearbyUser {
  id: number;
  username: string;
  avatar_url: string;
  is_online: boolean;
  distance: number;
  angle: number;
}

interface Props {
  className?: string;
}

export default function Radar({ className = "" }: Props) {
  const [users, setUsers] = useState<NearbyUser[]>([]);
  const [radius, setRadius] = useState(10);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [sweep, setSweep] = useState(0);
  const sweepRef = useRef<ReturnType<typeof setInterval>>(null);
  const [error, setError] = useState("");

  const loadNearby = useCallback(async () => {
    setScanning(true);
    setError("");
    try {
      const res = await nearbyUsers(radius);
      setUsers(res.users);
    } catch {
      setError("Position indisponible");
    } finally {
      setLoading(false);
      setTimeout(() => setScanning(false), 2000);
    }
  }, [radius]);

  // Initial load
  useEffect(() => {
    loadNearby();
  }, [loadNearby]);

  // Sweep animation
  useEffect(() => {
    sweepRef.current = setInterval(() => {
      setSweep((s) => (s + 2) % 360);
    }, 30);
    return () => {
      if (sweepRef.current) clearInterval(sweepRef.current);
    };
  }, []);

  // Auto-refresh every 30s
  useEffect(() => {
    const interval = setInterval(loadNearby, 30000);
    return () => clearInterval(interval);
  }, [loadNearby]);

  const onlineUsers = users.filter((u) => u.is_online);
  const offlineUsers = users.filter((u) => !u.is_online);

  return (
    <div
      className={`bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
          <RadarIcon className="w-4 h-4 text-green-400" />
          Radar de proximité
        </h3>
        <div className="flex items-center gap-2">
          <select
            value={radius}
            onChange={(e) => setRadius(Number(e.target.value))}
            className="bg-zinc-800 border border-zinc-700 text-xs text-zinc-300 rounded-lg px-2 py-1 focus:outline-none focus:border-violet-500"
            title="Rayon"
          >
            <option value={1}>1 km</option>
            <option value={5}>5 km</option>
            <option value={10}>10 km</option>
            <option value={25}>25 km</option>
            <option value={50}>50 km</option>
            <option value={100}>100 km</option>
          </select>
          <button
            onClick={loadNearby}
            disabled={scanning}
            className="text-xs text-green-400 hover:text-green-300 transition disabled:opacity-50"
            title="Scanner"
          >
            <Wifi className={`w-4 h-4 ${scanning ? "animate-pulse" : ""}`} />
          </button>
        </div>
      </div>

      {/* Radar visualization */}
      <div className="relative w-full aspect-square max-w-[280px] mx-auto mb-4">
        <svg viewBox="0 0 200 200" className="w-full h-full">
          {/* Background circles */}
          <circle
            cx="100"
            cy="100"
            r="90"
            fill="none"
            stroke="rgb(39,39,42)"
            strokeWidth="0.5"
          />
          <circle
            cx="100"
            cy="100"
            r="60"
            fill="none"
            stroke="rgb(39,39,42)"
            strokeWidth="0.5"
          />
          <circle
            cx="100"
            cy="100"
            r="30"
            fill="none"
            stroke="rgb(39,39,42)"
            strokeWidth="0.5"
          />

          {/* Cross lines */}
          <line
            x1="100"
            y1="10"
            x2="100"
            y2="190"
            stroke="rgb(39,39,42)"
            strokeWidth="0.5"
          />
          <line
            x1="10"
            y1="100"
            x2="190"
            y2="100"
            stroke="rgb(39,39,42)"
            strokeWidth="0.5"
          />

          {/* Outer ring */}
          <circle
            cx="100"
            cy="100"
            r="90"
            fill="none"
            stroke="rgb(74,222,128)"
            strokeWidth="1"
            opacity="0.3"
          />

          {/* Sweep line */}
          <line
            x1="100"
            y1="100"
            x2={100 + 90 * Math.sin((sweep * Math.PI) / 180)}
            y2={100 - 90 * Math.cos((sweep * Math.PI) / 180)}
            stroke="rgb(74,222,128)"
            strokeWidth="1"
            opacity="0.6"
          />

          {/* Sweep trail (gradient arc) */}
          <defs>
            <linearGradient id="sweepGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgb(74,222,128)" stopOpacity="0" />
              <stop
                offset="100%"
                stopColor="rgb(74,222,128)"
                stopOpacity="0.15"
              />
            </linearGradient>
          </defs>
          <path
            d={`M 100 100 L ${100 + 90 * Math.sin(((sweep - 40) * Math.PI) / 180)} ${100 - 90 * Math.cos(((sweep - 40) * Math.PI) / 180)} A 90 90 0 0 1 ${100 + 90 * Math.sin((sweep * Math.PI) / 180)} ${100 - 90 * Math.cos((sweep * Math.PI) / 180)} Z`}
            fill="url(#sweepGrad)"
          />

          {/* Center dot (you) */}
          <circle cx="100" cy="100" r="4" fill="rgb(139,92,246)" />
          <circle
            cx="100"
            cy="100"
            r="6"
            fill="none"
            stroke="rgb(139,92,246)"
            strokeWidth="1"
            opacity="0.5"
          />

          {/* User dots */}
          {users.map((u) => {
            // Map distance to radar radius (0 = center, radius = edge)
            const normalizedDist = Math.min(u.distance / radius, 1);
            const r = normalizedDist * 85; // max 85px from center
            const angleRad = (u.angle * Math.PI) / 180;
            const cx = 100 + r * Math.sin(angleRad);
            const cy = 100 - r * Math.cos(angleRad);

            return (
              <g key={u.id}>
                {/* Ping animation for online users */}
                {u.is_online && (
                  <circle
                    cx={cx}
                    cy={cy}
                    r="6"
                    fill="none"
                    stroke="rgb(74,222,128)"
                    strokeWidth="1"
                    opacity="0.4"
                  >
                    <animate
                      attributeName="r"
                      values="4;10;4"
                      dur="2s"
                      repeatCount="indefinite"
                    />
                    <animate
                      attributeName="opacity"
                      values="0.6;0;0.6"
                      dur="2s"
                      repeatCount="indefinite"
                    />
                  </circle>
                )}
                <circle
                  cx={cx}
                  cy={cy}
                  r="4"
                  fill={u.is_online ? "rgb(74,222,128)" : "rgb(113,113,122)"}
                  className="cursor-pointer"
                />
              </g>
            );
          })}

          {/* Distance labels */}
          <text
            x="100"
            y="44"
            textAnchor="middle"
            fill="rgb(82,82,91)"
            fontSize="7"
          >
            {Math.round(radius / 3)} km
          </text>
          <text
            x="100"
            y="14"
            textAnchor="middle"
            fill="rgb(82,82,91)"
            fontSize="7"
          >
            {radius} km
          </text>
        </svg>

        {/* Scanning overlay */}
        {scanning && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs text-green-400 animate-pulse bg-zinc-900/80 px-3 py-1 rounded-full">
              Scan en cours...
            </span>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="flex items-center justify-center gap-4 mb-3 text-xs">
        <span className="flex items-center gap-1 text-green-400">
          <span className="w-2 h-2 rounded-full bg-green-400" />
          {onlineUsers.length} en ligne
        </span>
        <span className="flex items-center gap-1 text-zinc-500">
          <span className="w-2 h-2 rounded-full bg-zinc-600" />
          {offlineUsers.length} hors ligne
        </span>
      </div>

      {/* Error */}
      {error && (
        <p className="text-xs text-amber-400 text-center mb-3 flex items-center justify-center gap-1">
          <WifiOff className="w-3 h-3" />
          {error}
        </p>
      )}

      {/* User list */}
      {!loading && users.length > 0 && (
        <div className="space-y-1.5 max-h-48 overflow-y-auto">
          {[...onlineUsers, ...offlineUsers].map((u) => (
            <Link
              key={u.id}
              href={`/users/${u.id}`}
              className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-zinc-800/60 transition group"
            >
              <div className="relative shrink-0">
                <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center overflow-hidden">
                  {u.avatar_url ? (
                    <img
                      src={u.avatar_url}
                      alt={u.username}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-4 h-4 text-zinc-500" />
                  )}
                </div>
                {u.is_online && (
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-zinc-900" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate group-hover:text-white transition">
                  {u.username}
                </p>
              </div>
              <span className="text-[11px] text-zinc-500 shrink-0">
                {u.distance < 1 ? "< 1 km" : `${u.distance} km`}
              </span>
            </Link>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && users.length === 0 && !error && (
        <p className="text-xs text-zinc-500 text-center py-2">
          Aucun utilisateur détecté dans un rayon de {radius} km
        </p>
      )}
    </div>
  );
}
