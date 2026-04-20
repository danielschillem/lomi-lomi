"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Users,
  Search,
  ShieldCheck,
  Shield,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Crown,
  UserCheck,
  UserX,
} from "lucide-react";
import { adminListUsers, adminUpdateUser, adminDeleteUser } from "@/lib/api";

interface User {
  id: number;
  username: string;
  email: string;
  avatar_url: string;
  role: string;
  is_verified: boolean;
  is_online: boolean;
  city: string;
  created_at: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminListUsers(page, search);
      setUsers(res.users as unknown as User[]);
      setTotal(res.total);
    } catch {
      /* ignore */
    }
    setLoading(false);
  }, [page, search]);

  useEffect(() => {
    load();
  }, [load]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput);
  }

  async function toggleRole(user: User) {
    const newRole = user.role === "admin" ? "user" : "admin";
    try {
      await adminUpdateUser(user.id, { role: newRole });
      load();
    } catch {
      /* ignore */
    }
  }

  async function toggleVerified(user: User) {
    try {
      await adminUpdateUser(user.id, { is_verified: !user.is_verified });
      load();
    } catch {
      /* ignore */
    }
  }

  async function handleDelete(user: User) {
    if (!confirm(`Supprimer l'utilisateur "${user.username}" ?`)) return;
    try {
      await adminDeleteUser(user.id);
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
          <Users className="w-6 h-6 text-violet-400" />
          Utilisateurs
        </h1>
        <span className="text-sm text-zinc-500">{total} au total</span>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Rechercher par pseudo ou email..."
          className="w-full bg-zinc-900/60 border border-zinc-800 rounded-lg pl-10 pr-4 py-3 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-violet-500 transition"
        />
      </form>

      {/* Table */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800">
              <th className="text-left px-6 py-4 text-xs text-zinc-500 uppercase tracking-wider font-medium">
                Utilisateur
              </th>
              <th className="text-left px-6 py-4 text-xs text-zinc-500 uppercase tracking-wider font-medium hidden md:table-cell">
                Email
              </th>
              <th className="text-left px-6 py-4 text-xs text-zinc-500 uppercase tracking-wider font-medium hidden sm:table-cell">
                Ville
              </th>
              <th className="text-left px-6 py-4 text-xs text-zinc-500 uppercase tracking-wider font-medium">
                Statut
              </th>
              <th className="text-right px-6 py-4 text-xs text-zinc-500 uppercase tracking-wider font-medium">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-6 py-12 text-center text-zinc-500 animate-pulse"
                >
                  Chargement...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-6 py-12 text-center text-zinc-500"
                >
                  <Users className="w-10 h-10 mx-auto mb-3 text-zinc-600" />
                  Aucun utilisateur trouvé.
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr
                  key={u.id}
                  className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-zinc-800 overflow-hidden shrink-0 flex items-center justify-center">
                        {u.avatar_url ? (
                          <img
                            src={u.avatar_url}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-xs text-zinc-500">
                            {u.username?.[0]?.toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div>
                        <span className="font-medium flex items-center gap-1.5">
                          {u.username}
                          {u.is_online && (
                            <span className="w-2 h-2 rounded-full bg-green-400" />
                          )}
                        </span>
                        <span className="text-xs text-zinc-500 block">
                          #{u.id} —{" "}
                          {new Date(u.created_at).toLocaleDateString("fr-FR")}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-zinc-400 hidden md:table-cell">
                    {u.email}
                  </td>
                  <td className="px-6 py-4 text-zinc-400 hidden sm:table-cell">
                    {u.city || "—"}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5">
                      {u.role === "admin" && (
                        <span className="text-[10px] bg-violet-500/10 text-violet-400 border border-violet-500/20 px-1.5 py-0.5 rounded-full font-medium">
                          Admin
                        </span>
                      )}
                      {u.is_verified && (
                        <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded-full font-medium">
                          Vérifié
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => toggleRole(u)}
                        title={
                          u.role === "admin"
                            ? "Rétrograder"
                            : "Promouvoir admin"
                        }
                        className="p-1.5 rounded-md hover:bg-zinc-700 transition text-zinc-500 hover:text-violet-400"
                      >
                        <Crown className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => toggleVerified(u)}
                        title={
                          u.is_verified ? "Retirer vérification" : "Vérifier"
                        }
                        className="p-1.5 rounded-md hover:bg-zinc-700 transition text-zinc-500 hover:text-emerald-400"
                      >
                        {u.is_verified ? (
                          <UserX className="w-4 h-4" />
                        ) : (
                          <UserCheck className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => handleDelete(u)}
                        title="Supprimer"
                        className="p-1.5 rounded-md hover:bg-zinc-700 transition text-zinc-500 hover:text-red-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
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
