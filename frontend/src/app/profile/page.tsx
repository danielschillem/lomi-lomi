"use client";

import { useState, useEffect, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  User,
  Settings,
  LogOut,
  Save,
  ArrowLeft,
  MapPin,
  Calendar,
  Camera,
  Mail,
  CheckCircle,
  Plus,
  Trash2,
  ImageIcon,
  Star,
  Shield,
} from "lucide-react";
import {
  getProfile,
  updateProfile,
  uploadAvatar,
  sendVerification,
  getUserPhotos,
  uploadPhoto,
  deletePhoto,
  getPrompts,
  savePrompts,
  uploadSelfie,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

interface ProfileData {
  id: number;
  username: string;
  email: string;
  bio: string;
  gender: string;
  city: string;
  birth_date: string;
  avatar_url: string;
  is_verified: boolean;
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, logout, loading: authLoading } = useAuth();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Form state
  const [bio, setBio] = useState("");
  const [gender, setGender] = useState("");
  const [city, setCity] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [uploading, setUploading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [photos, setPhotos] = useState<
    { id: number; url: string; position: number }[]
  >([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Extended profile
  const [prompts, setPrompts] = useState<
    { question: string; answer: string }[]
  >([]);
  const [savingPrompts, setSavingPrompts] = useState(false);
  const [selfieStatus, setSelfieStatus] = useState<string>("none");
  const [uploadingSelfie, setUploadingSelfie] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }
    if (user) {
      getProfile()
        .then((res) => {
          const p = res as unknown as ProfileData;
          setProfile(p);
          setBio(p.bio || "");
          setGender(p.gender || "");
          setCity(p.city || "");
          setBirthDate(p.birth_date ? p.birth_date.slice(0, 10) : "");
          getUserPhotos(p.id)
            .then(setPhotos)
            .catch(() => {});
          getPrompts()
            .then(setPrompts)
            .catch(() => {});
          // selfie_status from profile
          const extended = p as unknown as { selfie_status?: string };
          if (extended.selfie_status) setSelfieStatus(extended.selfie_status);
        })
        .catch(() => setError("Impossible de charger le profil"));
    }
  }, [user, authLoading, router]);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const res = await updateProfile({
        bio,
        gender,
        city,
        birth_date: birthDate ? new Date(birthDate).toISOString() : undefined,
      });
      const p = res as unknown as ProfileData;
      setProfile(p);
      setEditing(false);
      setSuccess("Profil mis à jour");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur de sauvegarde");
    } finally {
      setSaving(false);
    }
  }

  function handleLogout() {
    logout();
    router.push("/");
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const res = await uploadAvatar(file);
      setProfile((prev) =>
        prev ? { ...prev, avatar_url: res.avatar_url } : prev,
      );
      setSuccess("Avatar mis à jour");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur upload");
    } finally {
      setUploading(false);
    }
  }

  async function handleSendVerification() {
    setVerifying(true);
    setError("");
    try {
      await sendVerification();
      setSuccess("Email de vérification envoyé, vérifiez votre boîte");
      setTimeout(() => setSuccess(""), 5000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur vérification");
    } finally {
      setVerifying(false);
    }
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    setError("");
    try {
      const photo = await uploadPhoto(file);
      setPhotos((prev) => [...prev, photo]);
      setSuccess("Photo ajoutée");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur upload photo");
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function handleDeletePhoto(photoId: number) {
    if (!confirm("Supprimer cette photo ?")) return;
    try {
      await deletePhoto(photoId);
      setPhotos((prev) => prev.filter((p) => p.id !== photoId));
      setSuccess("Photo supprimée");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur suppression");
    }
  }

  async function handleSavePrompts() {
    setSavingPrompts(true);
    try {
      const saved = await savePrompts(prompts.filter((p) => p.answer.trim()));
      setPrompts(saved);
      setSuccess("Prompts sauvegardés");
      setTimeout(() => setSuccess(""), 3000);
    } catch {
      setError("Erreur sauvegarde prompts");
    } finally {
      setSavingPrompts(false);
    }
  }

  async function handleSelfieUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingSelfie(true);
    try {
      const res = await uploadSelfie(file);
      setSelfieStatus(res.selfie_status);
      setSuccess("Selfie soumis pour vérification");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur upload selfie");
    } finally {
      setUploadingSelfie(false);
    }
  }

  if (authLoading || (!profile && !error)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-12">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-muted hover:text-foreground transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Accueil
          </Link>
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-2 text-sm text-muted hover:text-red-400 transition"
          >
            <LogOut className="w-4 h-4" />
            Déconnexion
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-400 text-sm rounded-lg px-4 py-3 mb-6">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-50 border border-green-500/20 text-green-600 text-sm rounded-lg px-4 py-3 mb-6">
            {success}
          </div>
        )}

        <div className="bg-white/90 border border-border rounded-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-linear-to-r from-violet-50 to-pink-50 p-8">
            <div className="flex items-center gap-5">
              <div className="relative">
                <div className="w-20 h-20 rounded-full bg-surface-2 border-2 border-violet-500/50 flex items-center justify-center overflow-hidden">
                  {profile?.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt="Avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-10 h-10 text-violet-600" />
                  )}
                </div>
                <label className="absolute -bottom-1 -right-1 w-7 h-7 bg-violet-600 hover:bg-violet-700 rounded-full flex items-center justify-center cursor-pointer transition">
                  <Camera className="w-3.5 h-3.5 text-white" />
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handleAvatarUpload}
                    disabled={uploading}
                    title="Changer la photo de profil"
                  />
                </label>
              </div>
              <div>
                <h1 className="text-2xl font-bold">{profile?.username}</h1>
                <p className="text-muted text-sm">{profile?.email}</p>
                {profile?.is_verified ? (
                  <span className="inline-flex items-center gap-1 mt-1 text-xs bg-green-50 text-green-600 border border-green-500/20 px-2 py-0.5 rounded-full">
                    <CheckCircle className="w-3 h-3" /> Profil vérifié
                  </span>
                ) : (
                  <button
                    onClick={handleSendVerification}
                    disabled={verifying}
                    className="inline-flex items-center gap-1 mt-1 text-xs bg-yellow-50 text-yellow-600 border border-yellow-200 px-2 py-0.5 rounded-full hover:bg-yellow-500/20 transition"
                  >
                    <Mail className="w-3 h-3" />
                    {verifying ? "Envoi..." : "Vérifier email"}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Settings className="w-5 h-5 text-violet-600" />
                Informations
              </h2>
              {!editing && (
                <button
                  onClick={() => setEditing(true)}
                  className="text-sm text-violet-600 hover:text-violet-600 transition"
                >
                  Modifier
                </button>
              )}
            </div>

            {editing ? (
              <form onSubmit={handleSave} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Bio
                  </label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    maxLength={500}
                    rows={3}
                    placeholder="Parlez de vous en quelques mots..."
                    className="w-full bg-surface border border-border rounded-lg px-4 py-3 text-sm text-foreground placeholder:text-gray-400 focus:outline-none focus:border-violet-400 transition resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                      Genre
                    </label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      title="Genre"
                      className="w-full bg-surface border border-border rounded-lg px-4 py-3 text-sm text-foreground focus:outline-none focus:border-violet-400 transition"
                    >
                      <option value="">Non spécifié</option>
                      <option value="homme">Homme</option>
                      <option value="femme">Femme</option>
                      <option value="autre">Autre</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                      Ville
                    </label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Votre ville"
                      className="w-full bg-surface border border-border rounded-lg px-4 py-3 text-sm text-foreground placeholder:text-gray-400 focus:outline-none focus:border-violet-400 transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Date de naissance
                  </label>
                  <input
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    title="Date de naissance"
                    className="w-full bg-surface border border-border rounded-lg px-4 py-3 text-sm text-foreground focus:outline-none focus:border-violet-400 transition"
                  />
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-semibold px-6 py-2.5 rounded-lg transition text-sm"
                  >
                    <Save className="w-4 h-4" />
                    {saving ? "Sauvegarde..." : "Sauvegarder"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditing(false)}
                    className="text-sm text-muted hover:text-foreground transition px-4 py-2.5"
                  >
                    Annuler
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div>
                  <h3 className="text-xs font-medium text-muted uppercase tracking-wider mb-1">
                    Bio
                  </h3>
                  <p className="text-sm text-foreground">
                    {profile?.bio || "Aucune bio renseignée"}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-xs font-medium text-muted uppercase tracking-wider mb-1">
                      Genre
                    </h3>
                    <p className="text-sm text-foreground capitalize">
                      {profile?.gender || "Non spécifié"}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-xs font-medium text-muted uppercase tracking-wider mb-1 flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> Ville
                    </h3>
                    <p className="text-sm text-foreground">
                      {profile?.city || "Non renseignée"}
                    </p>
                  </div>
                </div>
                <div>
                  <h3 className="text-xs font-medium text-muted uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> Date de naissance
                  </h3>
                  <p className="text-sm text-foreground">
                    {profile?.birth_date
                      ? new Date(profile.birth_date).toLocaleDateString("fr-FR")
                      : "Non renseignée"}
                  </p>
                </div>
              </div>
            )}

            {/* Photo gallery */}
            <div className="mt-6 pt-6 border-t border-border">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-violet-600" />
                  Galerie photos
                </h2>
                <span className="text-xs text-muted">{photos.length}/6</span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {photos.map((photo) => (
                  <div key={photo.id} className="relative group aspect-square">
                    <img
                      src={photo.url}
                      alt={`Photo ${photo.position + 1}`}
                      className="w-full h-full object-cover rounded-lg"
                    />
                    <button
                      onClick={() => handleDeletePhoto(photo.id)}
                      title="Supprimer cette photo"
                      className="absolute top-1 right-1 w-6 h-6 bg-red-600/80 hover:bg-red-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                    >
                      <Trash2 className="w-3 h-3 text-white" />
                    </button>
                  </div>
                ))}
                {photos.length < 6 && (
                  <label className="aspect-square border-2 border-dashed border-border hover:border-violet-400 rounded-lg flex flex-col items-center justify-center cursor-pointer transition">
                    <Plus className="w-6 h-6 text-muted" />
                    <span className="text-xs text-muted mt-1">
                      {uploadingPhoto ? "Upload..." : "Ajouter"}
                    </span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={handlePhotoUpload}
                      disabled={uploadingPhoto}
                    />
                  </label>
                )}
              </div>
            </div>

            {/* Settings link */}
            <div className="mt-6 pt-6 border-t border-border space-y-6">
              {/* Selfie Verification */}
              <div>
                <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-violet-400" />
                  Vérification d&apos;identité
                </h3>
                <div
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium mb-3 ${selfieStatus === "approved" ? "bg-green-500/10 text-green-400" : selfieStatus === "pending" ? "bg-yellow-500/10 text-yellow-400" : selfieStatus === "rejected" ? "bg-red-500/10 text-red-400" : "bg-gray-700 text-gray-400"}`}
                >
                  {selfieStatus === "approved"
                    ? " Profil vérifié"
                    : selfieStatus === "pending"
                      ? " En attente de vérification"
                      : selfieStatus === "rejected"
                        ? " Refusé - réessayez"
                        : "Non vérifié"}
                </div>
                {selfieStatus !== "approved" && (
                  <label className="block cursor-pointer">
                    <div className="flex items-center gap-2 text-sm text-violet-400 hover:text-violet-300">
                      <Camera className="w-4 h-4" />
                      {uploadingSelfie
                        ? "Upload..."
                        : "Envoyer un selfie de vérification"}
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleSelfieUpload}
                      disabled={uploadingSelfie}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {/* Prompts */}
              <div>
                <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <Star className="w-4 h-4 text-yellow-400" />
                  Vos prompts
                </h3>
                <div className="space-y-3">
                  {prompts.map((p, i) => (
                    <div
                      key={i}
                      className="bg-surface-2 rounded-xl p-3 space-y-2"
                    >
                      <input
                        type="text"
                        value={p.question}
                        maxLength={200}
                        onChange={(e) => {
                          const updated = [...prompts];
                          updated[i] = {
                            ...updated[i],
                            question: e.target.value,
                          };
                          setPrompts(updated);
                        }}
                        placeholder="Question..."
                        className="w-full bg-transparent text-xs font-medium text-muted border-none outline-none"
                      />
                      <input
                        type="text"
                        value={p.answer}
                        maxLength={300}
                        onChange={(e) => {
                          const updated = [...prompts];
                          updated[i] = {
                            ...updated[i],
                            answer: e.target.value,
                          };
                          setPrompts(updated);
                        }}
                        placeholder="Votre réponse..."
                        className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-violet-400"
                      />
                      <button
                        onClick={() =>
                          setPrompts(prompts.filter((_, idx) => idx !== i))
                        }
                        className="text-xs text-red-400 hover:text-red-300"
                      >
                        Supprimer
                      </button>
                    </div>
                  ))}
                  {prompts.length < 3 && (
                    <button
                      onClick={() =>
                        setPrompts([
                          ...prompts,
                          { question: "Ma passion secrète", answer: "" },
                        ])
                      }
                      className="text-sm text-violet-400 hover:text-violet-300 flex items-center gap-1"
                    >
                      <Plus className="w-4 h-4" /> Ajouter un prompt
                    </button>
                  )}
                  <button
                    onClick={handleSavePrompts}
                    disabled={savingPrompts}
                    className="text-sm bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white px-4 py-1.5 rounded-lg transition"
                  >
                    {savingPrompts ? "..." : "Sauvegarder"}
                  </button>
                </div>
              </div>

              <Link
                href="/settings"
                className="flex items-center gap-2 text-sm text-muted hover:text-violet-600 transition"
              >
                <Settings className="w-4 h-4" />
                Paramètres du compte
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
