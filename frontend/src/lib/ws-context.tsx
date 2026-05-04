"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { useAuth } from "./auth-context";

function resolveWsUrl(): string {
  const raw = process.env.NEXT_PUBLIC_WS_URL || "/ws";
  if (/^wss?:\/\//i.test(raw)) return raw;
  if (typeof window === "undefined") return "ws://localhost:8888/ws";
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  const path = raw.startsWith("/") ? raw : `/${raw}`;
  return `${proto}//${window.location.host}${path}`;
}

interface WSEvent {
  type: string;
  data: Record<string, unknown>;
}

type WSListener = (event: WSEvent) => void;

interface WSCtx {
  send: (msg: WSEvent) => void;
  subscribe: (listener: WSListener) => () => void;
  connected: boolean;
}

const WSContext = createContext<WSCtx>({
  send: () => {},
  subscribe: () => () => {},
  connected: false,
});

export function WSProvider({ children }: { children: ReactNode }) {
  const { token, user } = useAuth();
  const wsRef = useRef<WebSocket | null>(null);
  const listenersRef = useRef<Set<WSListener>>(new Set());
  const [connected, setConnected] = useState(false);
  const reconnectRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const backoffRef = useRef(1000); // start at 1s
  const pingIntervalRef = useRef<ReturnType<typeof setInterval>>(undefined);

  const connect = useCallback(() => {
    if (!token || !user) return;

    const ws = new WebSocket(
      `${resolveWsUrl()}?token=${encodeURIComponent(token)}`,
    );
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      backoffRef.current = 1000; // reset backoff on successful connect

      // Respond to server pings automatically (browser handles pong frames)
      // But also send application-level pings as heartbeat
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "ping", data: {} }));
        }
      }, 30000);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as WSEvent;
        // Ignore pong responses
        if (data.type === "pong") return;
        listenersRef.current.forEach((fn) => fn(data));
      } catch {
        // ignore
      }
    };

    ws.onclose = () => {
      setConnected(false);
      wsRef.current = null;
      clearInterval(pingIntervalRef.current);
      // Exponential backoff: 1s, 2s, 4s, 8s, 16s, max 30s
      const delay = backoffRef.current;
      backoffRef.current = Math.min(backoffRef.current * 2, 30000);
      reconnectRef.current = setTimeout(() => {
        connect();
      }, delay);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [token, user]);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectRef.current);
      clearInterval(pingIntervalRef.current);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [connect]);

  const send = useCallback((msg: WSEvent) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  const subscribe = useCallback((listener: WSListener) => {
    listenersRef.current.add(listener);
    return () => {
      listenersRef.current.delete(listener);
    };
  }, []);

  return (
    <WSContext.Provider value={{ send, subscribe, connected }}>
      {children}
    </WSContext.Provider>
  );
}

export function useWS() {
  return useContext(WSContext);
}
