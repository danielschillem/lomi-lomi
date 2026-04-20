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
import { ArrowLeft, Send, User, Lock, Check, CheckCheck } from "lucide-react";
import { getMessages, sendMessage, markConversationRead } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

interface Message {
  id: number;
  sender_id: number;
  content: string;
  created_at: string;
  is_read: boolean;
  sender?: { id: number; username: string; avatar_url?: string };
}

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8888/ws";

export default function ChatPage() {
  const router = useRouter();
  const params = useParams();
  const conversationId = Number(params.id);
  const { user, loading: authLoading } = useAuth();

  const [messages, setMessages] = useState<Message[]>([]);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [typingUser, setTypingUser] = useState<number | null>(null);
  const [receiverId, setReceiverId] = useState<number>(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const typingSendRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Derive receiver ID from first message not sent by current user
  const deriveReceiver = useCallback(
    (msgs: Message[]) => {
      if (!user) return;
      const other = msgs.find((m) => m.sender_id !== user.id);
      if (other) setReceiverId(other.sender_id);
    },
    [user],
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

  // WebSocket connection
  useEffect(() => {
    if (!user) return;

    const ws = new WebSocket(`${WS_URL}/${user.id}`);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (
          data.type === "message" &&
          data.data?.conversation_id === conversationId
        ) {
          const newMsg: Message = {
            id: data.data.id,
            sender_id: data.data.sender_id,
            content: data.data.content,
            created_at: data.data.created_at,
            is_read: data.data.is_read,
            sender: data.data.sender,
          };
          setMessages((prev) => [...prev, newMsg]);
          // Mark as read immediately since we're viewing
          markConversationRead(conversationId).catch(() => {});
          // Browser notification if tab not focused
          if (document.hidden && Notification.permission === "granted") {
            const senderName = data.data.sender?.username || "Quelqu'un";
            new Notification(`${senderName} — Lomi Lomi`, {
              body: data.data.content,
              icon: "/icon-192.png",
            });
          }
        }

        if (data.type === "typing" && data.data?.from_user_id !== user.id) {
          setTypingUser(data.data.from_user_id);
          clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = setTimeout(
            () => setTypingUser(null),
            3000,
          );
        }

        if (
          data.type === "read_receipt" &&
          data.data?.conversation_id === conversationId
        ) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === data.data.message_id ? { ...m, is_read: true } : m,
            ),
          );
        }
      } catch {
        // ignore parse errors
      }
    };

    ws.onerror = () => {};
    ws.onclose = () => {};

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [user, conversationId]);

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

  // Typing indicator — send via WS
  function handleInputChange(value: string) {
    setContent(value);
    if (
      !wsRef.current ||
      wsRef.current.readyState !== WebSocket.OPEN ||
      !receiverId
    )
      return;

    // Throttle: send at most once per second
    if (!typingSendRef.current) {
      wsRef.current.send(
        JSON.stringify({ type: "typing", data: { to_user_id: receiverId } }),
      );
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
          <div className="w-9 h-9 rounded-full bg-zinc-800 flex items-center justify-center">
            <User className="w-5 h-5 text-zinc-500" />
          </div>
          <div className="flex-1">
            <h1 className="font-semibold text-sm">Conversation</h1>
            <p className="text-xs text-zinc-500 flex items-center gap-1">
              <Lock className="w-3 h-3" />
              Chiffrement de bout en bout
            </p>
          </div>
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
