"use client";

import { useState, useEffect, useCallback } from "react";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";
import { adminListReports, adminUpdateReport } from "@/lib/api";

interface Report {
  id: number;
  reporter_id: number;
  reported_id: number;
  reason: string;
  details: string;
  status: string;
  created_at: string;
  reporter?: { username: string };
  reported?: { username: string };
}

const statusConfig: Record<
  string,
  { icon: React.ElementType; color: string; label: string }
> = {
  pending: { icon: Clock, color: "text-yellow-400", label: "En attente" },
  reviewed: { icon: CheckCircle, color: "text-emerald-400", label: "Traité" },
  dismissed: { icon: XCircle, color: "text-zinc-500", label: "Rejeté" },
};

export default function AdminReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState("pending");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminListReports(page, filter);
      setReports(res.reports as unknown as Report[]);
      setTotal(res.total);
    } catch {
      /* ignore */
    }
    setLoading(false);
  }, [page, filter]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleAction(report: Report, newStatus: string) {
    try {
      await adminUpdateReport(report.id, newStatus);
      load();
    } catch {
      /* ignore */
    }
  }

  const totalPages = Math.ceil(total / 20) || 1;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <AlertTriangle className="w-6 h-6 text-orange-400" />
          Signalements
        </h1>
        <div className="flex items-center gap-2">
          {(["pending", "reviewed", "dismissed"] as const).map((s) => {
            const cfg = statusConfig[s];
            return (
              <button
                key={s}
                onClick={() => {
                  setFilter(s);
                  setPage(1);
                }}
                className={`text-xs px-3 py-1.5 rounded-lg border transition ${
                  filter === s
                    ? "bg-zinc-800 border-zinc-700 text-white"
                    : "border-zinc-800 text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {cfg.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="text-center text-zinc-500 py-12 animate-pulse">
            Chargement...
          </div>
        ) : reports.length === 0 ? (
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-12 text-center text-zinc-500">
            <AlertTriangle className="w-10 h-10 mx-auto mb-3 text-zinc-600" />
            Aucun signalement {filter === "pending" ? "en attente" : ""}.
          </div>
        ) : (
          reports.map((r) => {
            const cfg = statusConfig[r.status] || statusConfig.pending;
            const Icon = cfg.icon;
            return (
              <div
                key={r.id}
                className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 transition"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <Icon className={`w-4 h-4 shrink-0 ${cfg.color}`} />
                      <span className="font-medium">
                        {r.reporter?.username || `#${r.reporter_id}`}
                      </span>
                      <span className="text-zinc-600">→</span>
                      <span className="font-medium text-orange-400">
                        {r.reported?.username || `#${r.reported_id}`}
                      </span>
                      <span className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full">
                        {r.reason}
                      </span>
                    </div>
                    {r.details && (
                      <p className="text-sm text-zinc-400 ml-7 mb-2">
                        {r.details}
                      </p>
                    )}
                    <span className="text-xs text-zinc-600 ml-7">
                      {new Date(r.created_at).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  {r.status === "pending" && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleAction(r, "reviewed")}
                        title="Marquer comme traité"
                        className="inline-flex items-center gap-1.5 text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1.5 rounded-lg hover:bg-emerald-500/20 transition"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        Traiter
                      </button>
                      <button
                        onClick={() => handleAction(r, "dismissed")}
                        title="Rejeter le signalement"
                        className="inline-flex items-center gap-1.5 text-xs bg-zinc-800 text-zinc-400 border border-zinc-700 px-3 py-1.5 rounded-lg hover:bg-zinc-700 transition"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Rejeter
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-6">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-white disabled:opacity-30 transition"
          >
            <ChevronLeft className="w-4 h-4" />
            Précédent
          </button>
          <span className="text-sm text-zinc-500">
            Page {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-white disabled:opacity-30 transition"
          >
            Suivant
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
