"use client";

import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useWS } from "@/lib/ws-context";

function canUseBrowserNotifications() {
  return typeof window !== "undefined" && "Notification" in window;
}

async function ensurePermission() {
  if (!canUseBrowserNotifications()) return false;
  if (window.Notification.permission === "granted") return true;
  if (window.Notification.permission !== "default") return false;
  return (await window.Notification.requestPermission()) === "granted";
}

function parsePayloadData(value: unknown) {
  if (typeof value !== "string" || value.length === 0) return {};
  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function notificationTarget(type: string, data: Record<string, unknown>) {
  if (type === "message" && data.conversation_id) {
    return `/messages/${data.conversation_id}`;
  }
  if ((type === "match" || type === "superlike") && (data.match_user_id || data.user_id)) {
    return `/users/${data.match_user_id || data.user_id}`;
  }
  if ((type === "order" || type === "payment" || type === "delivery") && data.order_id) {
    return `/boutique/orders/${data.order_id}`;
  }
  if (type === "message") return "/messages";
  if (type === "match") return "/matches";
  if (type === "order" || type === "payment") return "/boutique";
  return "/notifications";
}

function showBrowserNotification(title: string, body: string, target: string) {
  if (!canUseBrowserNotifications() || window.Notification.permission !== "granted") return;
  if (typeof document !== "undefined" && !document.hidden) return;

  const notification = new window.Notification(title, {
    body,
    icon: "/icon-192x192.png",
    tag: `texto-${target}`,
  });

  notification.onclick = () => {
    window.focus();
    window.location.assign(target);
    notification.close();
  };
}

export function PushNotificationsBridge() {
  const { user } = useAuth();
  const { subscribe } = useWS();

  useEffect(() => {
    if (!user) return;
    ensurePermission();
  }, [user]);

  useEffect(() => {
    if (!user) return;

    return subscribe((event) => {
      if (event.type === "message") {
        if (window.location.pathname.startsWith("/messages")) return;
        const sender = event.data.sender as { username?: string } | undefined;
        const title = sender?.username || "Nouveau message";
        const body = String(event.data.content || "Vous avez reçu un message");
        const target = notificationTarget("message", event.data);
        showBrowserNotification(title, body, target);
        return;
      }

      if (event.type === "notification" || event.type === "match") {
        const type = String(event.data.type || event.type);
        const meta = parsePayloadData(event.data.data);
        const title = String(event.data.title || "Texto");
        const body = String(event.data.body || "Nouvelle notification");
        showBrowserNotification(title, body, notificationTarget(type, meta));
      }
    });
  }, [subscribe, user]);

  return null;
}
