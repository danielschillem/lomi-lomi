"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  User,
  MapPin,
  BadgeCheck,
  Calendar,
  MessageCircle,
  Flag,
  ImageIcon,
} from "lucide-react";
import { getPublicProfile, sendMessage, reportUser } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

interface Photo {
  id: number;
  url: string;
  position: number;
}

interface Profile {
  id: number;
  username: string;
  bio: string;
  avatar_url: string;
  gender: string;
  city: string;
  is_verified: boolean;
  is_online: boolean;
  created_at: string;
  photos?: Photo[];
}

export default function UserProfilePage() {
  const router = useRouter();
  const params = useParams();
  const userId = Number(params.id);
  const { user, loading: authLoading } = useAuth();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showReport, setShowReport] = useState(false);
  const [reported, setReported] = useState(false);
  const [messaging, setMessaging] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }
    if (user) {
      getPublicProfile(userId)
        .then((p) => setProfile(p as unknown as Profile))
        .catch(() => setError("Profil introuvable"))
        .finally(() => setLoading(false));
    }
  }, [user, authLoading, router, userId]);

  async function handleSendMessage() {
    if (!profile) return;
    setMessaging(true);
    try {
      const res = await sendMessage({
        receiver_id: profile.id,
        content: `Salut ${profile.username} !`,
      });
      const convId =
        (res as Record<string, unknown>).conversation_id ??
        (res as Record<string, unknown>).id;
      router.push(`/messages/${convId}`);
    } catch {
      router.push("/messages");
    }
  }

  async function handleReport(reason: string) {
    if (!profile) return;
    try {
      await reportUser({ reported_id: profile.id, reason });
      setReported(true);
      setShowReport(false);
    } catch {
      // ignore
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted">Chargement...</div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <User className="w-16 h-16 text-muted/60 mx-auto mb-4" />
          <p className="text-muted">{error || "Profil introuvable"}</p>
          <Link
            href="/discover"
            className="inline-block mt-4 text-violet-600 hover:text-violet-600 text-sm"
          >
            Retour à la découverte
          </Link>
        </div>
      </div>
    );
  }

  const isMe = user?.id === profile.id;
  const photos = profile.photos ?? [];

  return (
    <div className="min-h-screen px-4 py-12">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 text-sm text-muted hover:text-foreground transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour
          </button>
        </div>

        <div className="bg-white/90 border border-border rounded-2xl overflow-hidden">
          {/* Avatar */}
          <div className="relative h-48 bg-gradient-to-br from-violet-600/30 to-pink-600/20 flex items-center justify-center">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.username}
                className="w-28 h-28 rounded-full object-cover border-4 border-white"
              />
            ) : (
              <div className="w-28 h-28 rounded-full bg-surface-2 flex items-center justify-center border-4 border-white">
                <User className="w-14 h-14 text-muted" />
              </div>
            )}
            {profile.is_online && (
              <span className="absolute bottom-4 left-1/2 translate-x-8 w-5 h-5 bg-green-500 rounded-full border-3 border-white" />
            )}
          </div>

          {/* Info */}
          <div className="p-6 text-center">
            <h1 className="text-2xl font-bold flex items-center justify-center gap-2">
              {profile.username}
              {profile.is_verified && (
                <BadgeCheck className="w-5 h-5 text-violet-600" />
              )}
            </h1>

            {profile.city && (
              <p className="text-sm text-muted flex items-center justify-center gap-1 mt-1">
                <MapPin className="w-3.5 h-3.5" />
                {profile.city}
              </p>
            )}

            {profile.gender && (
              <span className="inline-block mt-2 px-3 py-1 rounded-full text-xs bg-surface-2 text-foreground">
                {profile.gender}
              </span>
            )}

            <p className="text-sm text-muted flex items-center justify-center gap-1 mt-3">
              <Calendar className="w-3.5 h-3.5" />
              Membre depuis{" "}
              {new Date(profile.created_at).toLocaleDateString("fr-FR", {
                month: "long",
                year: "numeric",
              })}
            </p>

            {profile.bio && (
              <div className="mt-4 bg-surface rounded-xl p-4 text-sm text-foreground text-left">
                {profile.bio}
              </div>
            )}

            {/* Photo gallery */}
            {photos.length > 0 && (
              <div className="mt-4">
                <h3 className="text-xs font-medium text-muted uppercase tracking-wider mb-2 flex items-center gap-1 justify-center">
                  <ImageIcon className="w-3 h-3" />
                  Photos ({photos.length})
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  {photos.map((photo) => (
                    <div
                      key={photo.id}
                      className="aspect-square rounded-lg overflow-hidden"
                    >
                      <img
                        src={photo.url}
                        alt={`Photo ${photo.position + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            {!isMe && (
              <div className="mt-6 space-y-3">
                <div className="flex gap-3">
                  <button
                    onClick={handleSendMessage}
                    disabled={messaging}
                    className="flex-1 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition text-sm flex items-center justify-center gap-2"
                  >
                    <MessageCircle className="w-4 h-4" />
                    {messaging ? "Envoi..." : "Message"}
                  </button>
                  <button
                    onClick={() => setShowReport(!showReport)}
                    disabled={reported}
                    className="flex-1 border border-border text-muted hover:text-foreground py-2.5 rounded-lg transition text-sm flex items-center justify-center gap-2"
                  >
                    <Flag className="w-4 h-4" />
                    {reported ? "Signalé" : "Signaler"}
                  </button>
                </div>

                {showReport && (
                  <div className="bg-surface rounded-lg p-3 space-y-1">
                    {["spam", "fake", "harassment", "inappropriate"].map(
                      (r) => (
                        <button
                          key={r}
                          onClick={() => handleReport(r)}
                          className="w-full text-left px-3 py-1.5 text-sm text-foreground hover:bg-gray-100 rounded transition capitalize"
                        >
                          {r === "harassment"
                            ? "Harcèlement"
                            : r === "fake"
                              ? "Faux profil"
                              : r === "inappropriate"
                                ? "Inapproprié"
                                : "Spam"}
                        </button>
                      ),
                    )}
                  </div>
                )}
              </div>
            )}

            {isMe && (
              <div className="mt-6">
                <Link
                  href="/settings"
                  className="inline-flex items-center gap-2 text-sm text-violet-600 hover:text-violet-600"
                >
                  Modifier mes paramètres
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
