"use client";

import { useState, useEffect, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Settings,
  Lock,
  Trash2,
  Sliders,
  Save,
  AlertTriangle,
} from "lucide-react";
import {
  changePassword,
  deleteAccount,
  getPreferences,
  updatePreferences,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

export default function SettingsPage() {
  const router = useRouter();
  const { user, loading: authLoading, logout } = useAuth();

  // Password
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [pwdMsg, setPwdMsg] = useState("");
  const [pwdError, setPwdError] = useState("");
  const [pwdLoading, setPwdLoading] = useState(false);

  // Delete account
  const [deletePwd, setDeletePwd] = useState("");
  const [showDelete, setShowDelete] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // Preferences
  const [minAge, setMinAge] = useState(18);
  const [maxAge, setMaxAge] = useState(99);
  const [maxDistance, setMaxDistance] = useState(50);
  const [prefGender, setPrefGender] = useState("");
  const [prefMsg, setPrefMsg] = useState("");
  const [prefLoading, setPrefLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }
    if (user) {
      getPreferences()
        .then((p) => {
          if (p.min_age) setMinAge(p.min_age as number);
          if (p.max_age) setMaxAge(p.max_age as number);
          if (p.max_distance) setMaxDistance(p.max_distance as number);
          if (p.gender) setPrefGender(p.gender as string);
        })
        .catch(() => {});
    }
  }, [user, authLoading, router]);

  async function handleChangePassword(e: FormEvent) {
    e.preventDefault();
    setPwdMsg("");
    setPwdError("");

    if (newPwd !== confirmPwd) {
      setPwdError("Les mots de passe ne correspondent pas");
      return;
    }
    if (newPwd.length < 8) {
      setPwdError(
        "Le nouveau mot de passe doit contenir au moins 8 caractères",
      );
      return;
    }

    setPwdLoading(true);
    try {
      const res = await changePassword({
        current_password: currentPwd,
        new_password: newPwd,
      });
      setPwdMsg(res.message);
      setCurrentPwd("");
      setNewPwd("");
      setConfirmPwd("");
    } catch (err) {
      setPwdError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setPwdLoading(false);
    }
  }

  async function handleDeleteAccount() {
    if (!deletePwd) {
      setDeleteError("Mot de passe requis");
      return;
    }
    setDeleteLoading(true);
    setDeleteError("");
    try {
      await deleteAccount(deletePwd);
      logout();
      router.push("/");
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setDeleteLoading(false);
    }
  }

  async function handleSavePreferences(e: FormEvent) {
    e.preventDefault();
    setPrefMsg("");
    setPrefLoading(true);
    try {
      await updatePreferences({
        min_age: minAge,
        max_age: maxAge,
        max_distance: maxDistance,
        gender: prefGender,
      });
      setPrefMsg("Préférences sauvegardées");
    } catch {
      setPrefMsg("Erreur lors de la sauvegarde");
    } finally {
      setPrefLoading(false);
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-zinc-400">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-12">
      <div className="max-w-xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <Link
            href="/profile"
            className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Profil
          </Link>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Settings className="w-5 h-5 text-violet-400" />
            Paramètres
          </h1>
          <div className="w-16" />
        </div>

        {/* Preferences */}
        <section className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Sliders className="w-5 h-5 text-violet-400" />
            Préférences de découverte
          </h2>
          <form onSubmit={handleSavePreferences} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">
                  Âge minimum
                </label>
                <input
                  type="number"
                  min={18}
                  max={99}
                  value={minAge}
                  onChange={(e) => setMinAge(Number(e.target.value))}
                  title="Âge minimum"
                  className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">
                  Âge maximum
                </label>
                <input
                  type="number"
                  min={18}
                  max={99}
                  value={maxAge}
                  onChange={(e) => setMaxAge(Number(e.target.value))}
                  title="Âge maximum"
                  className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">
                Distance max ({maxDistance} km)
              </label>
              <input
                type="range"
                min={5}
                max={200}
                value={maxDistance}
                onChange={(e) => setMaxDistance(Number(e.target.value))}
                title="Distance maximale"
                className="w-full accent-violet-500"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">
                Genre recherché
              </label>
              <select
                value={prefGender}
                onChange={(e) => setPrefGender(e.target.value)}
                title="Genre recherché"
                className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
              >
                <option value="">Tous</option>
                <option value="homme">Homme</option>
                <option value="femme">Femme</option>
                <option value="non-binaire">Non-binaire</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={prefLoading}
              className="w-full bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition text-sm flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              {prefLoading ? "Sauvegarde..." : "Sauvegarder"}
            </button>
            {prefMsg && (
              <p className="text-sm text-green-400 text-center">{prefMsg}</p>
            )}
          </form>
        </section>

        {/* Change Password */}
        <section className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Lock className="w-5 h-5 text-violet-400" />
            Changer le mot de passe
          </h2>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <input
              type="password"
              placeholder="Mot de passe actuel"
              value={currentPwd}
              onChange={(e) => setCurrentPwd(e.target.value)}
              className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-violet-500"
            />
            <input
              type="password"
              placeholder="Nouveau mot de passe"
              value={newPwd}
              onChange={(e) => setNewPwd(e.target.value)}
              className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-violet-500"
            />
            <input
              type="password"
              placeholder="Confirmer le nouveau mot de passe"
              value={confirmPwd}
              onChange={(e) => setConfirmPwd(e.target.value)}
              className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-violet-500"
            />
            <button
              type="submit"
              disabled={pwdLoading}
              className="w-full bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition text-sm"
            >
              {pwdLoading ? "Modification..." : "Modifier le mot de passe"}
            </button>
            {pwdMsg && (
              <p className="text-sm text-green-400 text-center">{pwdMsg}</p>
            )}
            {pwdError && (
              <p className="text-sm text-red-400 text-center">{pwdError}</p>
            )}
          </form>
        </section>

        {/* Delete Account */}
        <section className="bg-zinc-900/60 border border-red-900/30 rounded-2xl p-6">
          <h2 className="text-lg font-semibold mb-2 flex items-center gap-2 text-red-400">
            <Trash2 className="w-5 h-5" />
            Zone dangereuse
          </h2>
          <p className="text-sm text-zinc-400 mb-4">
            La suppression de votre compte est irréversible. Toutes vos données
            seront effacées.
          </p>
          {!showDelete ? (
            <button
              onClick={() => setShowDelete(true)}
              className="w-full border border-red-600 text-red-400 hover:bg-red-600/10 font-semibold py-2.5 rounded-lg transition text-sm"
            >
              Supprimer mon compte
            </button>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-red-400 bg-red-900/20 rounded-lg px-3 py-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                Confirmez avec votre mot de passe
              </div>
              <input
                type="password"
                placeholder="Mot de passe"
                value={deletePwd}
                onChange={(e) => setDeletePwd(e.target.value)}
                className="w-full bg-zinc-800/50 border border-red-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-red-500"
              />
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowDelete(false);
                    setDeletePwd("");
                    setDeleteError("");
                  }}
                  className="flex-1 border border-zinc-700 text-zinc-400 hover:text-white py-2.5 rounded-lg transition text-sm"
                >
                  Annuler
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleteLoading}
                  className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition text-sm"
                >
                  {deleteLoading ? "Suppression..." : "Confirmer"}
                </button>
              </div>
              {deleteError && (
                <p className="text-sm text-red-400 text-center">
                  {deleteError}
                </p>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
