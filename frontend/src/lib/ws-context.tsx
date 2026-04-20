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

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8888/ws";

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

  const connect = useCallback(() => {
    if (!token || !user) return;

    const ws = new WebSocket(`${WS_URL}?token=${encodeURIComponent(token)}`);
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as WSEvent;
        listenersRef.current.forEach((fn) => fn(data));
      } catch {
        // ignore
      }
    };

    ws.onclose = () => {
      setConnected(false);
      wsRef.current = null;
      // Reconnect after 3s
      reconnectRef.current = setTimeout(() => {
        connect();
      }, 3000);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [token, user]);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectRef.current);
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
