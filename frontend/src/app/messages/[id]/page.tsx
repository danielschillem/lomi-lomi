"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type FormEvent,
} from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Send,
  User,
  Shield,
  Check,
  CheckCheck,
  MapPin,
  Navigation,
  Car,
  X,
  Loader2,
  Phone,
} from "lucide-react";
import {
  getMessages,
  sendMessage,
  markConversationRead,
  getConversations,
  startLocationShare,
  updateLocationShare,
  stopLocationShare,
  getActiveLocationShares,
  requestVTCRide,
  updateVTCRideStatus,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useWS } from "@/lib/ws-context";

interface Message {
  id: number;
  sender_id: number;
  content: string;
  created_at: string;
  is_read: boolean;
  sender?: { id: number; username: string; avatar_url?: string };
}

interface ConvUser {
  id: number;
  username: string;
  avatar_url?: string;
  is_online?: boolean;
}

export default function ChatPage() {
  const router = useRouter();
  const params = useParams();
  const conversationId = Number(params.id);
  const { user, loading: authLoading } = useAuth();
  const { subscribe, send: wsSend } = useWS();

  const [messages, setMessages] = useState<Message[]>([]);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [typingUser, setTypingUser] = useState<number | null>(null);
  const [receiverId, setReceiverId] = useState<number>(0);
  const [otherUser, setOtherUser] = useState<ConvUser | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const typingSendRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Location sharing state
  const [showActions, setShowActions] = useState(false);
  const [activeShare, setActiveShare] = useState<{
    id: number;
    sender_id: number;
    latitude: number;
    longitude: number;
    expires_at: string;
  } | null>(null);
  const [incomingShare, setIncomingShare] = useState<{
    id: number;
    sender_id: number;
    username: string;
    latitude: number;
    longitude: number;
    expires_at: string;
  } | null>(null);
  const [sharingLocation, setSharingLocation] = useState(false);
  const locationWatchRef = useRef<number | null>(null);

  // VTC state
  const [showVTCForm, setShowVTCForm] = useState(false);
  const [vtcPickupAddress, setVtcPickupAddress] = useState("");
  const [vtcDropoffAddress, setVtcDropoffAddress] = useState("");
  const [vtcNote, setVtcNote] = useState("");
  const [vtcRequesting, setVtcRequesting] = useState(false);
  const [activeRide, setActiveRide] = useState<{
    id: number;
    status: string;
    pickup_address: string;
    dropoff_address: string;
    driver_lat: number;
    driver_lng: number;
    requester_id: number;
    passenger_id: number;
    note: string;
  } | null>(null);

  // Load conversation metadata to get receiverId and other user info
  useEffect(() => {
    if (!user) return;
    getConversations()
      .then((convos) => {
        const conv = (
          convos as unknown as Array<{
            id: number;
            user1_id: number;
            user2_id: number;
            user1: ConvUser;
            user2: ConvUser;
          }>
        ).find((c) => c.id === conversationId);
        if (conv) {
          const other = conv.user1_id === user.id ? conv.user2 : conv.user1;
          setReceiverId(other.id);
          setOtherUser(other);
        }
      })
      .catch(() => {});
  }, [user, conversationId]);

  // Fallback: derive receiver from messages
  const deriveReceiver = useCallback(
    (msgs: Message[]) => {
      if (!user || receiverId) return;
      const other = msgs.find((m) => m.sender_id !== user.id);
      if (other) {
        setReceiverId(other.sender_id);
        if (other.sender) {
          setOtherUser({
            id: other.sender.id,
            username: other.sender.username,
            avatar_url: other.sender.avatar_url,
          });
        }
      }
    },
    [user, receiverId],
  );

  // Load messages initially
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }
    if (user) {
      loadMessages();
    }
  }, [user, authLoading, router, conversationId]);

  async function loadMessages() {
    try {
      const res = (await getMessages(conversationId)) as unknown as Message[];
      setMessages(res);
      deriveReceiver(res);
      // Mark as read
      markConversationRead(conversationId).catch(() => {});
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  // Listen for WS events via shared provider
  useEffect(() => {
    if (!user) return;
    return subscribe((event) => {
      if (
        event.type === "message" &&
        (event.data as Record<string, unknown>)?.conversation_id ===
          conversationId
      ) {
        const d = event.data as Record<string, unknown>;
        const newMsg: Message = {
          id: d.id as number,
          sender_id: d.sender_id as number,
          content: d.content as string,
          created_at: d.created_at as string,
          is_read: d.is_read as boolean,
          sender: d.sender as Message["sender"],
        };
        setMessages((prev) => [...prev, newMsg]);
        markConversationRead(conversationId).catch(() => {});
        if (document.hidden && Notification.permission === "granted") {
          const senderName =
            ((d.sender as Record<string, unknown>)?.username as string) ||
            "Quelqu'un";
          new Notification(`${senderName} — Lomi Lomi`, {
            body: d.content as string,
            icon: "/icon-192.png",
          });
        }
      }

      if (
        event.type === "typing" &&
        (event.data as Record<string, unknown>)?.from_user_id !== user.id
      ) {
        setTypingUser(
          (event.data as Record<string, unknown>).from_user_id as number,
        );
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => setTypingUser(null), 3000);
      }

      if (
        event.type === "read_receipt" &&
        (event.data as Record<string, unknown>)?.conversation_id ===
          conversationId
      ) {
        const msgId = (event.data as Record<string, unknown>)
          .message_id as number;
        setMessages((prev) =>
          prev.map((m) => (m.id === msgId ? { ...m, is_read: true } : m)),
        );
      }

      // Location sharing events
      if (event.type === "location_share_started") {
        const d = event.data as Record<string, unknown>;
        if ((d.sender_id as number) === receiverId || receiverId === 0) {
          setIncomingShare({
            id: d.share_id as number,
            sender_id: d.sender_id as number,
            username: d.username as string,
            latitude: d.latitude as number,
            longitude: d.longitude as number,
            expires_at: d.expires_at as string,
          });
        }
      }

      if (event.type === "location_update") {
        const d = event.data as Record<string, unknown>;
        setIncomingShare((prev) =>
          prev && prev.id === (d.share_id as number)
            ? {
                ...prev,
                latitude: d.latitude as number,
                longitude: d.longitude as number,
              }
            : prev,
        );
      }

      if (event.type === "location_share_stopped") {
        const d = event.data as Record<string, unknown>;
        setIncomingShare((prev) =>
          prev && prev.id === (d.share_id as number) ? null : prev,
        );
        if (activeShare && activeShare.id === (d.share_id as number)) {
          stopSharingLocation();
        }
      }

      // VTC events
      if (event.type === "vtc_ride_requested") {
        const d = event.data as Record<string, unknown>;
        if ((d.requester_id as number) === receiverId || receiverId === 0) {
          setActiveRide({
            id: d.ride_id as number,
            status: "pending",
            pickup_address: d.pickup_address as string,
            dropoff_address: d.dropoff_address as string,
            driver_lat: 0,
            driver_lng: 0,
            requester_id: d.requester_id as number,
            passenger_id: user.id,
            note: (d.note as string) || "",
          });
        }
      }

      if (event.type === "vtc_ride_updated") {
        const d = event.data as Record<string, unknown>;
        setActiveRide((prev) =>
          prev && prev.id === (d.ride_id as number)
            ? { ...prev, status: d.status as string }
            : prev,
        );
      }

      if (event.type === "vtc_driver_location") {
        const d = event.data as Record<string, unknown>;
        setActiveRide((prev) =>
          prev && prev.id === (d.ride_id as number)
            ? {
                ...prev,
                driver_lat: d.latitude as number,
                driver_lng: d.longitude as number,
              }
            : prev,
        );
      }
    });
  }, [user, conversationId, subscribe, receiverId, activeShare]);

  // Auto-scroll on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Request notification permission on mount
  useEffect(() => {
    if (
      typeof Notification !== "undefined" &&
      Notification.permission === "default"
    ) {
      Notification.requestPermission();
    }
  }, []);

  // Load existing location shares on mount
  useEffect(() => {
    if (!user || !receiverId) return;
    getActiveLocationShares()
      .then((shares) => {
        const myShare = shares.find(
          (s) =>
            s.sender_id === user.id &&
            s.receiver_id === receiverId &&
            s.is_active,
        );
        if (myShare) {
          setActiveShare(myShare);
          setSharingLocation(true);
        }
        const theirShare = shares.find(
          (s) =>
            s.sender_id === receiverId &&
            s.receiver_id === user.id &&
            s.is_active,
        );
        if (theirShare) {
          setIncomingShare({
            id: theirShare.id,
            sender_id: theirShare.sender_id,
            username: theirShare.sender?.username || "",
            latitude: theirShare.latitude,
            longitude: theirShare.longitude,
            expires_at: theirShare.expires_at,
          });
        }
      })
      .catch(() => {});
  }, [user, receiverId]);

  // Clean up geolocation watch on unmount
  useEffect(() => {
    return () => {
      if (locationWatchRef.current !== null) {
        navigator.geolocation.clearWatch(locationWatchRef.current);
      }
    };
  }, []);

  // --- Location sharing functions ---
  async function startSharing() {
    if (!receiverId || sharingLocation) return;
    setSharingLocation(true);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const share = await startLocationShare({
            receiver_id: receiverId,
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            duration: 30,
          });
          setActiveShare(share);

          // Start watching position
          locationWatchRef.current = navigator.geolocation.watchPosition(
            (p) => {
              if (share.id) {
                updateLocationShare(share.id, {
                  latitude: p.coords.latitude,
                  longitude: p.coords.longitude,
                }).catch(() => {});
                // Also relay via WS for low-latency
                wsSend({
                  type: "location_update",
                  data: {
                    to_user_id: receiverId,
                    share_id: share.id,
                    latitude: p.coords.latitude,
                    longitude: p.coords.longitude,
                  },
                });
              }
            },
            () => {},
            { enableHighAccuracy: true, maximumAge: 5000 },
          );
        } catch {
          setSharingLocation(false);
        }
      },
      () => {
        setSharingLocation(false);
        alert(
          "Impossible d'accéder à votre position. Vérifiez les permissions.",
        );
      },
      { enableHighAccuracy: true },
    );
  }

  function stopSharingLocation() {
    if (locationWatchRef.current !== null) {
      navigator.geolocation.clearWatch(locationWatchRef.current);
      locationWatchRef.current = null;
    }
    if (activeShare) {
      stopLocationShare(activeShare.id).catch(() => {});
    }
    setActiveShare(null);
    setSharingLocation(false);
  }

  function openInMaps(lat: number, lng: number) {
    window.open(`https://www.google.com/maps?q=${lat},${lng}`, "_blank");
  }

  // --- VTC functions ---
  async function handleRequestVTC() {
    if (!receiverId || vtcRequesting) return;
    setVtcRequesting(true);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const ride = await requestVTCRide({
            passenger_id: receiverId,
            pickup_lat: pos.coords.latitude,
            pickup_lng: pos.coords.longitude,
            pickup_address: vtcPickupAddress || "Position actuelle",
            dropoff_lat: 0,
            dropoff_lng: 0,
            dropoff_address: vtcDropoffAddress || "À définir",
            note: vtcNote,
          });
          const r = ride as Record<string, unknown>;
          setActiveRide({
            id: r.id as number,
            status: "pending",
            pickup_address: vtcPickupAddress || "Position actuelle",
            dropoff_address: vtcDropoffAddress || "À définir",
            driver_lat: 0,
            driver_lng: 0,
            requester_id: user!.id,
            passenger_id: receiverId,
            note: vtcNote,
          });
          setShowVTCForm(false);
          setVtcPickupAddress("");
          setVtcDropoffAddress("");
          setVtcNote("");
        } catch {
          // ignore
        } finally {
          setVtcRequesting(false);
        }
      },
      () => {
        setVtcRequesting(false);
        alert("Position requise pour commander un VTC");
      },
      { enableHighAccuracy: true },
    );
  }

  async function handleRideAction(status: string) {
    if (!activeRide) return;
    try {
      await updateVTCRideStatus(activeRide.id, status);
      if (status === "cancelled" || status === "completed") {
        setActiveRide(null);
      } else {
        setActiveRide((prev) => (prev ? { ...prev, status } : null));
      }
    } catch {
      // ignore
    }
  }

  // Typing indicator — send via shared WS
  function handleInputChange(value: string) {
    setContent(value);
    if (!receiverId) return;

    // Throttle: send at most once per second
    if (!typingSendRef.current) {
      wsSend({ type: "typing", data: { to_user_id: receiverId } });
      typingSendRef.current = setTimeout(() => {
        typingSendRef.current = undefined;
      }, 1000);
    }
  }

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    if (!content.trim() || sending || !receiverId) return;

    setSending(true);
    try {
      const res = (await sendMessage({
        receiver_id: receiverId,
        content: content.trim(),
      })) as unknown as Message;
      // Add to local messages (WS push is for the OTHER user)
      setMessages((prev) => [...prev, res]);
      setContent("");
    } catch {
      // ignore
    } finally {
      setSending(false);
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-zinc-400">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="shrink-0 bg-zinc-900/80 backdrop-blur-md border-b border-zinc-800 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <Link
            href="/messages"
            className="text-zinc-400 hover:text-white transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          {otherUser ? (
            <Link
              href={`/users/${otherUser.id}`}
              className="flex items-center gap-3 flex-1 min-w-0"
            >
              <div className="relative w-9 h-9 rounded-full bg-zinc-800 flex items-center justify-center overflow-hidden shrink-0">
                {otherUser.avatar_url ? (
                  <img
                    src={otherUser.avatar_url}
                    alt={otherUser.username}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-5 h-5 text-zinc-500" />
                )}
                {otherUser.is_online && (
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-zinc-900" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="font-semibold text-sm truncate">
                  {otherUser.username}
                </h1>
                <p className="text-xs text-zinc-500 flex items-center gap-1">
                  <Shield className="w-3 h-3" />
                  Messagerie sécurisée
                </p>
              </div>
            </Link>
          ) : (
            <>
              <div className="w-9 h-9 rounded-full bg-zinc-800 flex items-center justify-center shrink-0">
                <User className="w-5 h-5 text-zinc-500" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="font-semibold text-sm">Conversation</h1>
                <p className="text-xs text-zinc-500 flex items-center gap-1">
                  <Shield className="w-3 h-3" />
                  Messagerie sécurisée
                </p>
              </div>
            </>
          )}
          {/* Action buttons */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => {
                if (sharingLocation) stopSharingLocation();
                else startSharing();
              }}
              className={`p-2 rounded-lg transition ${
                sharingLocation
                  ? "bg-green-600 text-white"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-800"
              }`}
              title={
                sharingLocation ? "Arrêter le partage" : "Partager ma position"
              }
            >
              <Navigation className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setShowVTCForm(!showVTCForm);
                setShowActions(false);
              }}
              className={`p-2 rounded-lg transition ${
                showVTCForm
                  ? "bg-violet-600 text-white"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-800"
              }`}
              title="Commander un VTC"
            >
              <Car className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Location sharing banner */}
      {sharingLocation && activeShare && (
        <div className="shrink-0 bg-green-900/30 border-b border-green-800/50 px-4 py-2.5">
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-green-300">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <MapPin className="w-4 h-4" />
              <span>Vous partagez votre position en direct</span>
            </div>
            <button
              onClick={stopSharingLocation}
              className="text-xs text-green-400 hover:text-green-300 transition flex items-center gap-1"
            >
              <X className="w-3 h-3" />
              Arrêter
            </button>
          </div>
        </div>
      )}

      {/* Incoming location share */}
      {incomingShare && (
        <div className="shrink-0 bg-blue-900/30 border-b border-blue-800/50 px-4 py-2.5">
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-blue-300">
              <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
              <MapPin className="w-4 h-4" />
              <span>
                {incomingShare.username ||
                  otherUser?.username ||
                  "L'autre utilisateur"}{" "}
                partage sa position
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  openInMaps(incomingShare.latitude, incomingShare.longitude)
                }
                className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg transition flex items-center gap-1"
              >
                <Navigation className="w-3 h-3" />
                Voir sur la carte
              </button>
              <button
                onClick={() => {
                  stopLocationShare(incomingShare.id).catch(() => {});
                  setIncomingShare(null);
                }}
                className="text-xs text-blue-400 hover:text-blue-300 transition"
                title="Fermer"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VTC Form */}
      {showVTCForm && (
        <div className="shrink-0 bg-zinc-900/90 border-b border-zinc-800 px-4 py-4">
          <div className="max-w-2xl mx-auto space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Car className="w-4 h-4 text-violet-400" />
                Commander un VTC
              </h3>
              <button
                onClick={() => setShowVTCForm(false)}
                className="text-zinc-400 hover:text-white transition"
                title="Fermer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-zinc-500">
              Envoyez un VTC chercher {otherUser?.username || "votre contact"}{" "}
              pour un rendez-vous
            </p>
            <input
              type="text"
              value={vtcPickupAddress}
              onChange={(e) => setVtcPickupAddress(e.target.value)}
              placeholder="Adresse de prise en charge (ou position actuelle)"
              title="Adresse de prise en charge"
              className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-violet-500 transition"
            />
            <input
              type="text"
              value={vtcDropoffAddress}
              onChange={(e) => setVtcDropoffAddress(e.target.value)}
              placeholder="Adresse de destination"
              title="Adresse de destination"
              className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-violet-500 transition"
            />
            <input
              type="text"
              value={vtcNote}
              onChange={(e) => setVtcNote(e.target.value)}
              placeholder="Note pour le chauffeur (optionnel)"
              title="Note"
              className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-violet-500 transition"
            />
            <button
              onClick={handleRequestVTC}
              disabled={vtcRequesting}
              className="w-full bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-sm font-semibold py-2.5 rounded-lg transition flex items-center justify-center gap-2"
            >
              {vtcRequesting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Car className="w-4 h-4" />
              )}
              Envoyer un VTC
            </button>
          </div>
        </div>
      )}

      {/* Active VTC Ride banner */}
      {activeRide && (
        <div className="shrink-0 bg-violet-900/30 border-b border-violet-800/50 px-4 py-3">
          <div className="max-w-2xl mx-auto space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-violet-300">
                <Car className="w-4 h-4" />
                <span className="font-medium">
                  Course VTC —{" "}
                  {activeRide.status === "pending"
                    ? "En attente"
                    : activeRide.status === "accepted"
                      ? "Acceptée"
                      : activeRide.status === "in_progress"
                        ? "En cours"
                        : activeRide.status}
                </span>
              </div>
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${
                  activeRide.status === "pending"
                    ? "bg-amber-500/20 text-amber-300"
                    : activeRide.status === "accepted"
                      ? "bg-green-500/20 text-green-300"
                      : activeRide.status === "in_progress"
                        ? "bg-blue-500/20 text-blue-300"
                        : "bg-zinc-500/20 text-zinc-300"
                }`}
              >
                {activeRide.status === "pending"
                  ? "⏳"
                  : activeRide.status === "accepted"
                    ? "✓"
                    : activeRide.status === "in_progress"
                      ? "🚗"
                      : "•"}{" "}
                {activeRide.status}
              </span>
            </div>
            <div className="text-xs text-zinc-400 space-y-1">
              {activeRide.pickup_address && (
                <p className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-green-400" />
                  Départ : {activeRide.pickup_address}
                </p>
              )}
              {activeRide.dropoff_address && (
                <p className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-red-400" />
                  Arrivée : {activeRide.dropoff_address}
                </p>
              )}
              {activeRide.note && (
                <p className="text-zinc-500 italic">Note : {activeRide.note}</p>
              )}
            </div>
            {activeRide.driver_lat !== 0 && activeRide.driver_lng !== 0 && (
              <button
                onClick={() =>
                  openInMaps(activeRide.driver_lat, activeRide.driver_lng)
                }
                className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg transition flex items-center gap-1 w-fit"
              >
                <Navigation className="w-3 h-3" />
                Position du chauffeur
              </button>
            )}
            <div className="flex gap-2 pt-1">
              {activeRide.status === "pending" &&
                activeRide.passenger_id === user?.id && (
                  <button
                    onClick={() => handleRideAction("accepted")}
                    className="text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg transition"
                  >
                    Accepter
                  </button>
                )}
              {(activeRide.status === "pending" ||
                activeRide.status === "accepted") && (
                <button
                  onClick={() => handleRideAction("cancelled")}
                  className="text-xs bg-red-600/80 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg transition"
                >
                  Annuler
                </button>
              )}
              {activeRide.status === "in_progress" && (
                <button
                  onClick={() => handleRideAction("completed")}
                  className="text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg transition"
                >
                  Terminée
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-2xl mx-auto space-y-3">
          {messages.length === 0 ? (
            <div className="text-center text-zinc-500 text-sm py-12">
              <Shield className="w-8 h-8 mx-auto mb-3 text-zinc-600" />
              Envoyez le premier message !
            </div>
          ) : (
            messages.map((msg) => {
              const isMine = msg.sender_id === user?.id;
              return (
                <div
                  key={msg.id}
                  className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                      isMine
                        ? "bg-violet-600 text-white rounded-br-md"
                        : "bg-zinc-800 text-zinc-200 rounded-bl-md"
                    }`}
                  >
                    <p>{msg.content}</p>
                    <div
                      className={`flex items-center gap-1 mt-1 ${
                        isMine ? "justify-end" : ""
                      }`}
                    >
                      <span
                        className={`text-[10px] ${
                          isMine ? "text-violet-200" : "text-zinc-500"
                        }`}
                      >
                        {new Date(msg.created_at).toLocaleTimeString("fr-FR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      {isMine &&
                        (msg.is_read ? (
                          <CheckCheck className="w-3.5 h-3.5 text-violet-300" />
                        ) : (
                          <Check className="w-3 h-3 text-violet-300/60" />
                        ))}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          {typingUser && (
            <div className="flex justify-start">
              <div className="bg-zinc-800 text-zinc-400 text-sm rounded-2xl rounded-bl-md px-4 py-2.5 animate-pulse">
                écrit…
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input */}
      <div className="shrink-0 border-t border-zinc-800 bg-zinc-900/80 backdrop-blur-md px-4 py-3">
        <form
          onSubmit={handleSend}
          className="max-w-2xl mx-auto flex items-center gap-3"
        >
          <input
            type="text"
            value={content}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder="Votre message..."
            className="flex-1 bg-zinc-800/50 border border-zinc-700 rounded-full px-5 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-violet-500 transition"
          />
          <button
            type="submit"
            disabled={sending || !content.trim()}
            title="Envoyer"
            className="w-10 h-10 rounded-full bg-violet-600 hover:bg-violet-700 disabled:opacity-50 flex items-center justify-center transition"
          >
            <Send className="w-4 h-4 text-white" />
          </button>
        </form>
      </div>
    </div>
  );
}
