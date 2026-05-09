"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type FormEvent,
} from "react";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";
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
  Phone,
  Video,
  Car,
  X,
  Loader2,
  Image as ImageIcon,
  Mic,
  Search,
  Trash2,
  Pencil,
  ChevronUp,
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
  deleteMessage,
  editMessage,
  searchMessages,
  uploadMessageImage,
  uploadMessageAudio,
  initiateConnectionPayment,
  confirmConnectionPayment,
  checkConnectionPaid,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useWS } from "@/lib/ws-context";
import OMPaymentModal from "@/components/OMPaymentModal";

interface Message {
  id: number;
  sender_id: number;
  content: string;
  image_url?: string;
  audio_url?: string;
  call_type?: "audio" | "video";
  call_room?: string;
  latitude?: number;
  longitude?: number;
  created_at: string;
  is_read: boolean;
  is_edited?: boolean;
  sender?: { id: number; username: string; avatar_url?: string };
}

interface ConvUser {
  id: number;
  username: string;
  avatar_url?: string;
  is_online?: boolean;
}

const CALL_MEET_BASE_URL = "https://meet.texto.life";

function buildCallUrl(room: string, type: "audio" | "video") {
  const toolbarButtons = encodeURIComponent(
    JSON.stringify(["microphone", "camera", "toggle-camera", "hangup"]),
  );
  const config = [
    "config.prejoinPageEnabled=false",
    "config.prejoinConfig.enabled=false",
    "config.startAudioMuted=10",
    "config.startVideoMuted=10",
    "config.startWithAudioMuted=false",
    `config.startWithVideoMuted=${type === "audio"}`,
    "config.startSilent=false",
    "config.disableInitialGUM=false",
    "config.disableDeepLinking=true",
    "config.enableInsecureRoomNameWarning=false",
    "config.p2p.enabled=false",
    `config.toolbarButtons=${toolbarButtons}`,
    "config.toolbarConfig.alwaysVisible=true",
    "config.disableInviteFunctions=true",
    "config.disablePolls=true",
    "config.disableReactions=true",
    "config.disableRemoteVideoMenu=true",
    "config.disableProfile=true",
    "config.disableShortcuts=true",
    "config.hideConferenceSubject=true",
    "config.disableModeratorIndicator=true",
    "config.participantsPane.enabled=false",
    "config.speakerStats.disabled=true",
    "config.whiteboard.enabled=false",
  ].join("&");

  return `${CALL_MEET_BASE_URL}/${encodeURIComponent(room)}#${config}`;
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

  // Pagination state
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Search state
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Message[]>([]);
  const [searching, setSearching] = useState(false);

  // Edit/Delete state
  const [contextMenuMsg, setContextMenuMsg] = useState<number | null>(null);
  const [editingMsg, setEditingMsg] = useState<{
    id: number;
    content: string;
  } | null>(null);

  // Image upload state
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  // Connection payment state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [connectionPaid, setConnectionPaid] = useState(false);
  const [paymentChecked, setPaymentChecked] = useState(false);

  useEffect(() => {
    if (!receiverId) return;
    setPaymentChecked(false);
    checkConnectionPaid(receiverId)
      .then((res) => setConnectionPaid(Boolean(res?.paid)))
      .catch(() => {})
      .finally(() => setPaymentChecked(true));
  }, [receiverId]);

  // Load conversation metadata to get receiverId and other user info
  useEffect(() => {
    if (!user) return;
    getConversations()
      .then((convos) => {
        const conv = (
          (convos ?? []) as unknown as Array<{
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

  const loadMessages = useCallback(async () => {
    try {
      const res = await getMessages(conversationId, { limit: 50 });
      const msgs = (res.messages ?? []) as unknown as Message[];
      setMessages(msgs);
      setHasMore(res.has_more ?? false);
      deriveReceiver(msgs);
      // Mark as read
      markConversationRead(conversationId).catch(() => {});
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [conversationId, deriveReceiver]);

  // Load messages initially
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }
    if (user) {
      loadMessages();
    }
  }, [user, authLoading, router, loadMessages]);

  // Load older messages (infinite scroll)
  async function loadOlderMessages() {
    if (loadingMore || !hasMore || messages.length === 0) return;
    setLoadingMore(true);
    try {
      const oldestId = messages[0].id;
      const container = scrollContainerRef.current;
      const prevHeight = container?.scrollHeight ?? 0;
      const res = await getMessages(conversationId, {
        limit: 50,
        before: oldestId,
      });
      const older = (res.messages ?? []) as unknown as Message[];
      setMessages((prev) => [...older, ...prev]);
      setHasMore(res.has_more ?? false);
      // Maintain scroll position
      requestAnimationFrame(() => {
        if (container) {
          container.scrollTop = container.scrollHeight - prevHeight;
        }
      });
    } catch {
      // ignore
    } finally {
      setLoadingMore(false);
    }
  }

  // Handle scroll to top for loading older messages
  function handleScroll(e: React.UIEvent<HTMLDivElement>) {
    const el = e.currentTarget;
    if (el.scrollTop < 80 && hasMore && !loadingMore) {
      loadOlderMessages();
    }
  }

  // Search messages
  async function handleSearch() {
    if (!searchQuery.trim() || searchQuery.length < 2) return;
    setSearching(true);
    try {
      const res = await searchMessages(conversationId, searchQuery);
      setSearchResults((res.messages ?? []) as unknown as Message[]);
    } catch {
      // ignore
    } finally {
      setSearching(false);
    }
  }

  // Delete message
  async function handleDeleteMessage(msgId: number) {
    try {
      await deleteMessage(msgId);
      setMessages((prev) => prev.filter((m) => m.id !== msgId));
    } catch {
      // ignore
    }
    setContextMenuMsg(null);
  }

  // Edit message
  async function handleEditMessage() {
    if (!editingMsg || !editingMsg.content.trim()) return;
    try {
      await editMessage(editingMsg.id, editingMsg.content);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === editingMsg.id
            ? { ...m, content: editingMsg.content, is_edited: true }
            : m,
        ),
      );
    } catch {
      // ignore
    }
    setEditingMsg(null);
    setContextMenuMsg(null);
  }

  // Image upload
  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !receiverId) return;
    setUploadingImage(true);
    try {
      const { image_url } = await uploadMessageImage(file);
      const res = (await sendMessage({
        receiver_id: receiverId,
        content: "",
        image_url,
      })) as unknown as Message;
      setMessages((prev) => [...prev, res]);
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    } catch {
      // ignore
    } finally {
      setUploadingImage(false);
      if (imageInputRef.current) imageInputRef.current.value = "";
    }
  }

  async function handleAudioUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !receiverId) return;
    setUploadingAudio(true);
    try {
      const { audio_url } = await uploadMessageAudio(file);
      const res = (await sendMessage({
        receiver_id: receiverId,
        content: "",
        audio_url,
      })) as unknown as Message;
      setMessages((prev) => [...prev, res]);
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    } catch {
      // ignore
    } finally {
      setUploadingAudio(false);
      if (audioInputRef.current) audioInputRef.current.value = "";
    }
  }

  async function startCall(type: "audio" | "video") {
    if (!receiverId) return;
    const room = `texto-${conversationId}-${Date.now()}`;
    try {
      const res = (await sendMessage({
        receiver_id: receiverId,
        content:
          type === "video"
            ? "Invitation appel vidéo"
            : "Invitation appel audio",
        call_type: type,
        call_room: room,
      })) as unknown as Message;
      setMessages((prev) => [...prev, res]);
      window.open(buildCallUrl(room, type), "_blank");
    } catch {
      // ignore
    }
  }

  function shareCurrentLocationInChat() {
    if (!receiverId) return;
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = (await sendMessage({
            receiver_id: receiverId,
            content: "Position partagée",
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          })) as unknown as Message;
          setMessages((prev) => [...prev, res]);
        } catch {
          // ignore
        }
      },
      () => {},
      { enableHighAccuracy: true },
    );
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
          image_url: d.image_url as string | undefined,
          audio_url: d.audio_url as string | undefined,
          call_type: d.call_type as "audio" | "video" | undefined,
          call_room: d.call_room as string | undefined,
          latitude: d.latitude as number | undefined,
          longitude: d.longitude as number | undefined,
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
          new Notification(`${senderName} - Texto`, {
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

      // Message deleted via WS
      if (event.type === "message_deleted") {
        const d = event.data as Record<string, unknown>;
        if ((d.conversation_id as number) === conversationId) {
          setMessages((prev) =>
            prev.filter((m) => m.id !== (d.message_id as number)),
          );
        }
      }

      // Message edited via WS
      if (event.type === "message_edited") {
        const d = event.data as Record<string, unknown>;
        if ((d.conversation_id as number) === conversationId) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === (d.message_id as number)
                ? { ...m, content: d.content as string, is_edited: true }
                : m,
            ),
          );
        }
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
          if (locationWatchRef.current !== null) {
            navigator.geolocation.clearWatch(locationWatchRef.current);
            locationWatchRef.current = null;
          }
          setActiveShare(null);
          setSharingLocation(false);
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

  // Typing indicator - send via shared WS
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
      setConnectionPaid(true);
    } catch (err) {
      const msg = (err as Error).message || "";
      if (msg === "connection_required") {
        setShowPaymentModal(true);
      }
    } finally {
      setSending(false);
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="shrink-0 bg-surface/80 backdrop-blur-md border-b border-border px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <Link
            href="/messages"
            className="text-muted hover:text-foreground transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          {otherUser ? (
            <Link
              href={`/users/${otherUser.id}`}
              className="flex items-center gap-3 flex-1 min-w-0"
            >
              <div className="relative w-9 h-9 rounded-full bg-surface-2 flex items-center justify-center overflow-hidden shrink-0">
                {otherUser.avatar_url ? (
                  <Image
                    src={otherUser.avatar_url}
                    alt={otherUser.username}
                    width={36}
                    height={36}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-5 h-5 text-muted" />
                )}
                {otherUser.is_online && (
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="font-semibold text-sm truncate">
                  {otherUser.username}
                </h1>
                <p className="text-xs text-muted flex items-center gap-1">
                  <Shield className="w-3 h-3" />
                  Messagerie sécurisée
                </p>
              </div>
            </Link>
          ) : (
            <>
              <div className="w-9 h-9 rounded-full bg-surface-2 flex items-center justify-center shrink-0">
                <User className="w-5 h-5 text-muted" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="font-semibold text-sm">Conversation</h1>
                <p className="text-xs text-muted flex items-center gap-1">
                  <Shield className="w-3 h-3" />
                  Messagerie sécurisée
                </p>
              </div>
            </>
          )}
          {/* Action buttons */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => startCall("audio")}
              className="p-2 rounded-lg text-muted hover:text-green-600 hover:bg-gray-100 transition"
              title="Appel audio"
            >
              <Phone className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => startCall("video")}
              className="p-2 rounded-lg text-muted hover:text-blue-600 hover:bg-gray-100 transition"
              title="Appel vidéo"
            >
              <Video className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setShowSearch(!showSearch);
                if (showSearch) {
                  setSearchQuery("");
                  setSearchResults([]);
                }
              }}
              className={`p-2 rounded-lg transition ${
                showSearch
                  ? "bg-blue-600 text-white"
                  : "text-muted hover:text-foreground hover:bg-gray-100"
              }`}
              title="Rechercher"
            >
              <Search className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                if (sharingLocation) stopSharingLocation();
                else startSharing();
              }}
              className={`p-2 rounded-lg transition ${
                sharingLocation
                  ? "bg-green-600 text-white"
                  : "text-muted hover:text-foreground hover:bg-gray-100"
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
              }}
              className={`p-2 rounded-lg transition ${
                showVTCForm
                  ? "bg-blue-600 text-white"
                  : "text-muted hover:text-foreground hover:bg-gray-100"
              }`}
              title="Commander un VTC"
            >
              <Car className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Search bar */}
      {showSearch && (
        <div className="shrink-0 bg-surface border-b border-border px-4 py-2.5">
          <div className="max-w-2xl mx-auto">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSearch();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher dans la conversation..."
                className="flex-1 bg-surface-2 border border-border rounded-lg px-3 py-1.5 text-sm text-foreground placeholder:text-gray-400 focus:outline-none focus:border-blue-400 transition"
                autoFocus
              />
              <button
                type="submit"
                disabled={searching || searchQuery.length < 2}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm px-3 py-1.5 rounded-lg transition"
              >
                {searching ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
              </button>
            </form>
            {searchResults.length > 0 && (
              <div className="mt-2 max-h-40 overflow-y-auto space-y-1">
                {searchResults.map((r) => (
                  <button
                    key={r.id}
                    className="w-full text-left text-xs bg-surface-2 hover:bg-surface-2/80 rounded-lg px-3 py-2 transition"
                    onClick={() => {
                      const el = document.getElementById(`msg-${r.id}`);
                      if (el) {
                        el.scrollIntoView({
                          behavior: "smooth",
                          block: "center",
                        });
                        el.classList.add("ring-2", "ring-blue-400");
                        setTimeout(
                          () =>
                            el.classList.remove("ring-2", "ring-blue-400"),
                          2000,
                        );
                      }
                    }}
                  >
                    <span className="text-muted">
                      {new Date(r.created_at).toLocaleDateString("fr-FR")}
                    </span>{" "}
                    - {r.content.slice(0, 80)}
                    {r.content.length > 80 ? "..." : ""}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

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
              className="text-xs text-green-600 hover:text-green-300 transition flex items-center gap-1"
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
                className="text-xs text-blue-600 hover:text-blue-300 transition"
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
        <div className="shrink-0 bg-surface/90 border-b border-border px-4 py-4">
          <div className="max-w-2xl mx-auto space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Car className="w-4 h-4 text-blue-600" />
                Commander un VTC
              </h3>
              <button
                onClick={() => setShowVTCForm(false)}
                className="text-muted hover:text-foreground transition"
                title="Fermer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-muted">
              Envoyez un VTC chercher {otherUser?.username || "votre contact"}{" "}
              pour un rendez-vous
            </p>
            <input
              type="text"
              value={vtcPickupAddress}
              onChange={(e) => setVtcPickupAddress(e.target.value)}
              placeholder="Adresse de prise en charge (ou position actuelle)"
              title="Adresse de prise en charge"
              className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-gray-400 focus:outline-none focus:border-blue-400 transition"
            />
            <input
              type="text"
              value={vtcDropoffAddress}
              onChange={(e) => setVtcDropoffAddress(e.target.value)}
              placeholder="Adresse de destination"
              title="Adresse de destination"
              className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-gray-400 focus:outline-none focus:border-blue-400 transition"
            />
            <input
              type="text"
              value={vtcNote}
              onChange={(e) => setVtcNote(e.target.value)}
              placeholder="Note pour le chauffeur (optionnel)"
              title="Note"
              className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-gray-400 focus:outline-none focus:border-blue-400 transition"
            />
            <button
              onClick={handleRequestVTC}
              disabled={vtcRequesting}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold py-2.5 rounded-lg transition flex items-center justify-center gap-2"
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
        <div className="shrink-0 bg-blue-900/30 border-b border-blue-800/50 px-4 py-3">
          <div className="max-w-2xl mx-auto space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-blue-600">
                <Car className="w-4 h-4" />
                <span className="font-medium">
                  Course VTC -{" "}
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
                        : "bg-gray-100 text-foreground"
                }`}
              >
                {activeRide.status === "pending"
                  ? "..."
                  : activeRide.status === "accepted"
                    ? ""
                    : activeRide.status === "in_progress"
                      ? ">"
                      : "•"}{" "}
                {activeRide.status}
              </span>
            </div>
            <div className="text-xs text-muted space-y-1">
              {activeRide.pickup_address && (
                <p className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-green-600" />
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
                <p className="text-muted italic">Note : {activeRide.note}</p>
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
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto px-4 py-6"
        onScroll={handleScroll}
      >
        <div className="max-w-2xl mx-auto space-y-3">
          {/* Load more indicator */}
          {hasMore && (
            <div className="text-center py-2">
              {loadingMore ? (
                <Loader2 className="w-5 h-5 animate-spin mx-auto text-muted" />
              ) : (
                <button
                  onClick={loadOlderMessages}
                  className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 mx-auto"
                >
                  <ChevronUp className="w-3 h-3" />
                  Charger les messages précédents
                </button>
              )}
            </div>
          )}
          {messages.length === 0 ? (
            paymentChecked && !connectionPaid ? (
              <div className="mx-auto max-w-md bg-linear-to-br from-blue-50 to-blue-50 border border-blue-200 rounded-2xl p-6 text-center">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-blue-600 flex items-center justify-center">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-semibold text-base mb-1">
                  Débloquez la conversation
                </h3>
                <p className="text-sm text-muted mb-4">
                  Pour discuter avec{" "}
                  <span className="text-foreground font-medium">
                    {otherUser?.username || "cet utilisateur"}
                  </span>
                  , un paiement unique de{" "}
                  <span className="text-foreground font-semibold">
                    250 FCFA
                  </span>{" "}
                  via Orange Money est requis.
                </p>
                <button
                  onClick={() => setShowPaymentModal(true)}
                  className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2.5 rounded-lg transition text-sm"
                >
                  Débloquer pour 250 FCFA
                </button>
                <p className="text-[11px] text-muted mt-3">
                  Paiement unique, valable à vie pour cette conversation.
                </p>
              </div>
            ) : (
              <div className="text-center text-muted text-sm py-12">
                <Shield className="w-8 h-8 mx-auto mb-3 text-muted/60" />
                Envoyez le premier message !
              </div>
            )
          ) : (
            messages.map((msg) => {
              const isMine = msg.sender_id === user?.id;
              return (
                <div
                  key={msg.id}
                  id={`msg-${msg.id}`}
                  className={`flex ${isMine ? "justify-end" : "justify-start"} group relative`}
                  onContextMenu={(e) => {
                    if (isMine) {
                      e.preventDefault();
                      setContextMenuMsg(
                        contextMenuMsg === msg.id ? null : msg.id,
                      );
                    }
                  }}
                >
                  {/* Context menu for own messages */}
                  {isMine && contextMenuMsg === msg.id && (
                    <div className="absolute right-0 top-0 -mt-8 bg-surface border border-border rounded-lg shadow-lg flex items-center gap-1 px-1 py-0.5 z-10">
                      <button
                        onClick={() => {
                          setEditingMsg({
                            id: msg.id,
                            content: msg.content,
                          });
                          setContextMenuMsg(null);
                        }}
                        className="p-1.5 rounded hover:bg-surface-2 text-muted hover:text-foreground transition"
                        title="Modifier"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteMessage(msg.id)}
                        className="p-1.5 rounded hover:bg-red-50 text-muted hover:text-red-600 transition"
                        title="Supprimer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setContextMenuMsg(null)}
                        className="p-1.5 rounded hover:bg-surface-2 text-muted hover:text-foreground transition"
                        title="Fermer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}

                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                      isMine
                        ? "bg-blue-600 text-white rounded-br-md"
                        : "bg-surface-2 text-foreground rounded-bl-md"
                    }`}
                  >
                    {/* Edit mode */}
                    {editingMsg?.id === msg.id ? (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={editingMsg.content}
                          onChange={(e) =>
                            setEditingMsg({
                              ...editingMsg,
                              content: e.target.value,
                            })
                          }
                          className="w-full bg-white/20 rounded px-2 py-1 text-sm outline-none"
                          autoFocus
                          placeholder="Modifier le message..."
                          title="Modifier le message"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleEditMessage();
                            if (e.key === "Escape") setEditingMsg(null);
                          }}
                        />
                        <div className="flex gap-1 justify-end">
                          <button
                            onClick={() => setEditingMsg(null)}
                            className="text-[10px] opacity-70 hover:opacity-100"
                          >
                            Annuler
                          </button>
                          <button
                            onClick={handleEditMessage}
                            className="text-[10px] font-medium"
                          >
                            Enregistrer
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* Image in message */}
                        {msg.image_url && (
                          <a
                            href={msg.image_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block mb-1"
                            title="Ouvrir l'image dans un nouvel onglet"
                            aria-label="Ouvrir l'image dans un nouvel onglet"
                          >
                            <Image
                              src={msg.image_url}
                              alt="Image"
                              width={640}
                              height={360}
                              className="max-w-full rounded-lg max-h-60 object-cover"
                            />
                          </a>
                        )}
                        {msg.audio_url && (
                          <audio
                            controls
                            src={msg.audio_url}
                            className="mb-2 w-full max-w-xs"
                          />
                        )}
                        {msg.call_type && msg.call_room && (
                          <button
                            onClick={() =>
                              window.open(
                                buildCallUrl(msg.call_room!, msg.call_type!),
                                "_blank",
                              )
                            }
                            className="mb-2 inline-flex items-center gap-2 rounded-lg bg-blue-500/20 px-3 py-1.5 text-xs"
                          >
                            {msg.call_type === "video" ? (
                              <Video className="h-3.5 w-3.5" />
                            ) : (
                              <Phone className="h-3.5 w-3.5" />
                            )}
                            Rejoindre l&apos;appel
                          </button>
                        )}
                        {typeof msg.latitude === "number" &&
                          typeof msg.longitude === "number" && (
                            <button
                              onClick={() =>
                                openInMaps(msg.latitude as number, msg.longitude as number)
                              }
                              className="mb-2 inline-flex items-center gap-2 rounded-lg bg-blue-500/20 px-3 py-1.5 text-xs"
                            >
                              <MapPin className="h-3.5 w-3.5" />
                              Ouvrir la position
                            </button>
                          )}
                        {msg.content && <p>{msg.content}</p>}
                      </>
                    )}
                    <div
                      className={`flex items-center gap-1 mt-1 ${
                        isMine ? "justify-end" : ""
                      }`}
                    >
                      <span
                        className={`text-[10px] ${
                          isMine ? "text-blue-200" : "text-muted"
                        }`}
                      >
                        {new Date(msg.created_at).toLocaleTimeString("fr-FR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      {msg.is_edited && (
                        <span
                          className={`text-[9px] ${
                            isMine ? "text-blue-200" : "text-muted"
                          }`}
                        >
                          (modifié)
                        </span>
                      )}
                      {isMine &&
                        (msg.is_read ? (
                          <CheckCheck className="w-3.5 h-3.5 text-blue-600" />
                        ) : (
                          <Check className="w-3 h-3 text-blue-600/60" />
                        ))}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          {typingUser && (
            <div className="flex justify-start">
              <div className="bg-surface-2 text-muted text-sm rounded-2xl rounded-bl-md px-4 py-2.5 animate-pulse">
                écrit…
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input */}
      <div className="shrink-0 border-t border-border bg-surface/80 backdrop-blur-md px-4 py-3">
        <form
          onSubmit={handleSend}
          className="max-w-2xl mx-auto flex items-center gap-3"
        >
          {/* Image upload button */}
          <input
            type="file"
            ref={imageInputRef}
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={handleImageUpload}
            title="Envoyer une image"
          />
          <input
            type="file"
            ref={audioInputRef}
            accept="audio/*"
            className="hidden"
            onChange={handleAudioUpload}
            title="Envoyer une note vocale"
          />
          <button
            type="button"
            onClick={() => imageInputRef.current?.click()}
            disabled={uploadingImage}
            title="Envoyer une image"
            className="w-10 h-10 rounded-full text-muted hover:text-blue-600 hover:bg-surface-2 disabled:opacity-50 flex items-center justify-center transition"
          >
            {uploadingImage ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ImageIcon className="w-4 h-4" />
            )}
          </button>
          <button
            type="button"
            onClick={() => audioInputRef.current?.click()}
            disabled={uploadingAudio}
            title="Envoyer une note vocale"
            className="w-10 h-10 rounded-full text-muted hover:text-blue-600 hover:bg-surface-2 disabled:opacity-50 flex items-center justify-center transition"
          >
            {uploadingAudio ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Mic className="w-4 h-4" />
            )}
          </button>
          <button
            type="button"
            onClick={shareCurrentLocationInChat}
            title="Partager la position"
            className="w-10 h-10 rounded-full text-muted hover:text-blue-600 hover:bg-surface-2 flex items-center justify-center transition"
          >
            <MapPin className="w-4 h-4" />
          </button>
          <input
            type="text"
            value={content}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder="Votre message..."
            className="flex-1 bg-surface border border-border rounded-full px-5 py-2.5 text-sm text-foreground placeholder:text-gray-400 focus:outline-none focus:border-blue-400 transition"
          />
          <button
            type="submit"
            disabled={sending || !content.trim()}
            title="Envoyer"
            className="w-10 h-10 rounded-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center transition"
          >
            <Send className="w-4 h-4 text-white" />
          </button>
        </form>
      </div>

      {/* Payment Modal for connection fee */}
      <OMPaymentModal
        open={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onSuccess={() => {
          setShowPaymentModal(false);
          setConnectionPaid(true);
          // Re-send the message automatically
          if (content.trim() && receiverId) {
            sendMessage({ receiver_id: receiverId, content: content.trim() })
              .then((res) => {
                setMessages((prev) => [...prev, res as unknown as Message]);
                setContent("");
              })
              .catch(() => {});
          }
        }}
        title="Mise en relation"
        description={`Pour discuter avec ${otherUser?.username || "cet utilisateur"}, un paiement unique de 250 FCFA est requis.`}
        amount={250}
        initiatePayment={() => initiateConnectionPayment(receiverId)}
        confirmPayment={(paymentId, phone, otp) =>
          confirmConnectionPayment(paymentId, phone, otp)
        }
      />
    </div>
  );
}
