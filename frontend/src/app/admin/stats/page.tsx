"use client";

import { useState, useEffect } from "react";
import {
  BarChart3,
  TrendingUp,
  Users,
  Heart,
  MessageCircle,
  ShoppingCart,
} from "lucide-react";
import { adminGetStatsTimeline } from "@/lib/api";

interface DayStat {
  day: string;
  count: number;
  total?: number;
}

function MiniChart({
  data,
  color,
  label,
}: {
  data: DayStat[];
  color: string;
  label: string;
}) {
  const max = Math.max(...data.map((d) => d.count), 1);
  const total = data.reduce((s, d) => s + d.count, 0);

  return (
    <div>
      <div className="flex items-end gap-[2px] h-36">
        {data.map((d, i) => (
          <div
            key={i}
            className="flex-1 rounded-t-sm transition-all hover:opacity-80"
            style={{
              height: `${(d.count / max) * 100}%`,
              minHeight: d.count > 0 ? "4px" : "1px",
              backgroundColor: d.count > 0 ? color : "#27272a",
            }}
            title={`${d.day}: ${d.count}`}
          />
        ))}
      </div>
      <div className="flex items-center justify-between mt-3">
        <span className="text-xs text-zinc-500">{label}</span>
        <span className="text-sm font-semibold" style={{ color }}>
          {total}
        </span>
      </div>
    </div>
  );
}

export default function AdminStatsPage() {
  const [timeline, setTimeline] = useState<{
    signups: DayStat[];
    matches: DayStat[];
    messages: DayStat[];
    orders: DayStat[];
  } | null>(null);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    adminGetStatsTimeline(days)
      .then(setTimeline)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [days]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-zinc-500">
          Chargement des statistiques...
        </div>
      </div>
    );
  }

  const revenueTotal = (timeline?.orders ?? []).reduce(
    (s, d) => s + (d.total ?? 0),
    0,
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-emerald-400" />
          Statistiques
        </h1>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          title="Période"
          className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-white"
        >
          <option value={7}>7 jours</option>
          <option value={30}>30 jours</option>
          <option value={90}>90 jours</option>
        </select>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <Users className="w-5 h-5 text-violet-400" />
            <h2 className="font-semibold">Inscriptions</h2>
          </div>
          {timeline?.signups.length ? (
            <MiniChart
              data={timeline.signups}
              color="#8b5cf6"
              label={`${days} derniers jours`}
            />
          ) : (
            <p className="text-zinc-600 text-sm h-36 flex items-center justify-center">
              Aucune donnée
            </p>
          )}
        </div>

        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <Heart className="w-5 h-5 text-pink-400" />
            <h2 className="font-semibold">Matches</h2>
          </div>
          {timeline?.matches.length ? (
            <MiniChart
              data={timeline.matches}
              color="#ec4899"
              label={`${days} derniers jours`}
            />
          ) : (
            <p className="text-zinc-600 text-sm h-36 flex items-center justify-center">
              Aucune donnée
            </p>
          )}
        </div>

        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <MessageCircle className="w-5 h-5 text-blue-400" />
            <h2 className="font-semibold">Messages</h2>
          </div>
          {timeline?.messages.length ? (
            <MiniChart
              data={timeline.messages}
              color="#3b82f6"
              label={`${days} derniers jours`}
            />
          ) : (
            <p className="text-zinc-600 text-sm h-36 flex items-center justify-center">
              Aucune donnée
            </p>
          )}
        </div>

        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <ShoppingCart className="w-5 h-5 text-green-400" />
            <h2 className="font-semibold">Commandes</h2>
          </div>
          {timeline?.orders.length ? (
            <>
              <MiniChart
                data={timeline.orders}
                color="#22c55e"
                label={`${days} derniers jours`}
              />
              <div className="mt-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-green-400" />
                <span className="text-sm text-zinc-400">
                  Revenus : {Math.round(revenueTotal)} FCFA
                </span>
              </div>
            </>
          ) : (
            <p className="text-zinc-600 text-sm h-36 flex items-center justify-center">
              Aucune donnée
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
