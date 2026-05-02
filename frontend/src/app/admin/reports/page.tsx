"use client";

import { useState, useEffect, useCallback } from "react";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  XCircle,
  Clock,
  Ban,
} from "lucide-react";
import { adminListReports, adminUpdateReport, adminBanUser } from "@/lib/api";

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
  pending: { icon: Clock, color: "text-yellow-600", label: "En attente" },
  reviewed: { icon: CheckCircle, color: "text-emerald-600", label: "Traité" },
  dismissed: { icon: XCircle, color: "text-muted", label: "Rejeté" },
};

export default function AdminReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState("pending");
  const [loading, setLoading] = useState(true);
  const [banTarget, setBanTarget] = useState<Report | null>(null);
  const [banReason, setBanReason] = useState("");
  const [banLoading, setBanLoading] = useState(false);

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

  async function handleBan() {
    if (!banTarget) return;
    setBanLoading(true);
    try {
      await adminBanUser(banTarget.reported_id, true, banReason);
      await adminUpdateReport(banTarget.id, "reviewed");
      setBanTarget(null);
      setBanReason("");
      load();
    } catch {
      /* ignore */
    }
    setBanLoading(false);
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
                    ? "bg-surface-2 border-border text-foreground"
                    : "border-border text-muted hover:text-foreground"
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
          <div className="text-center text-muted py-12 animate-pulse">
            Chargement...
          </div>
        ) : reports.length === 0 ? (
          <div className="bg-white/90 border border-border rounded-xl p-12 text-center text-muted">
            <AlertTriangle className="w-10 h-10 mx-auto mb-3 text-muted/60" />
            Aucun signalement {filter === "pending" ? "en attente" : ""}.
          </div>
        ) : (
          reports.map((r) => {
            const cfg = statusConfig[r.status] || statusConfig.pending;
            const Icon = cfg.icon;
            return (
              <div
                key={r.id}
                className="bg-white/90 border border-border rounded-xl p-5 hover:border-border transition"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <Icon className={`w-4 h-4 shrink-0 ${cfg.color}`} />
                      <span className="font-medium">
                        {r.reporter?.username || `#${r.reporter_id}`}
                      </span>
                      <span className="text-muted/60">→</span>
                      <span className="font-medium text-orange-400">
                        {r.reported?.username || `#${r.reported_id}`}
                      </span>
                      <span className="text-[10px] bg-surface-2 text-muted px-2 py-0.5 rounded-full">
                        {r.reason}
                      </span>
                    </div>
                    {r.details && (
                      <p className="text-sm text-muted ml-7 mb-2">
                        {r.details}
                      </p>
                    )}
                    <span className="text-xs text-muted/60 ml-7">
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
                        className="inline-flex items-center gap-1.5 text-xs bg-emerald-50 text-emerald-600 border border-emerald-200 px-3 py-1.5 rounded-lg hover:bg-emerald-500/20 transition"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        Traiter
                      </button>
                      <button
                        onClick={() => setBanTarget(r)}
                        title="Bannir l'utilisateur signalé"
                        className="inline-flex items-center gap-1.5 text-xs bg-red-50 text-red-600 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-100 transition"
                      >
                        <Ban className="w-3.5 h-3.5" />
                        Bannir
                      </button>
                      <button
                        onClick={() => handleAction(r, "dismissed")}
                        title="Rejeter le signalement"
                        className="inline-flex items-center gap-1.5 text-xs bg-surface-2 text-muted border border-border px-3 py-1.5 rounded-lg hover:bg-gray-100 transition"
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
            className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground disabled:opacity-30 transition"
          >
            <ChevronLeft className="w-4 h-4" />
            Précédent
          </button>
          <span className="text-sm text-muted">
            Page {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground disabled:opacity-30 transition"
          >
            Suivant
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {banTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 m-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-1 flex items-center gap-2">
              <Ban className="w-5 h-5 text-red-500" />
              Bannir{" "}
              {banTarget.reported?.username || `#${banTarget.reported_id}`}
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              Raison du signalement : {banTarget.reason}
              {banTarget.details ? ` - ${banTarget.details}` : ""}
            </p>
            <textarea
              value={banReason}
              onChange={(e) => setBanReason(e.target.value)}
              placeholder="Raison du bannissement (optionnel)"
              className="w-full border border-gray-200 rounded-lg p-3 text-sm mb-4 focus:ring-2 focus:ring-red-300 focus:border-red-300 outline-none resize-none"
              rows={3}
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setBanTarget(null);
                  setBanReason("");
                }}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition"
              >
                Annuler
              </button>
              <button
                onClick={handleBan}
                disabled={banLoading}
                className="px-4 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 transition disabled:opacity-50"
              >
                {banLoading ? "..." : "Confirmer le bannissement"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
