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
import { ArrowLeft, Send, User, Shield, Check, CheckCheck } from "lucide-react";
import {
  getMessages,
  sendMessage,
  markConversationRead,
  getConversations,
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
    });
  }, [user, conversationId, subscribe]);

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
              className="flex items-center gap-3"
            >
              <div className="relative w-9 h-9 rounded-full bg-zinc-800 flex items-center justify-center overflow-hidden">
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
              <div className="flex-1">
                <h1 className="font-semibold text-sm">{otherUser.username}</h1>
                <p className="text-xs text-zinc-500 flex items-center gap-1">
                  <Shield className="w-3 h-3" />
                  Messagerie sécurisée
                </p>
              </div>
            </Link>
          ) : (
            <>
              <div className="w-9 h-9 rounded-full bg-zinc-800 flex items-center justify-center">
                <User className="w-5 h-5 text-zinc-500" />
              </div>
              <div className="flex-1">
                <h1 className="font-semibold text-sm">Conversation</h1>
                <p className="text-xs text-zinc-500 flex items-center gap-1">
                  <Shield className="w-3 h-3" />
                  Messagerie sécurisée
                </p>
              </div>
            </>
          )}
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-2xl mx-auto space-y-3">
          {messages.length === 0 ? (
            <div className="text-center text-zinc-500 text-sm py-12">
              <Lock className="w-8 h-8 mx-auto mb-3 text-zinc-600" />
              Envoyez le premier message. Vos échanges sont chiffrés.
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
