import * as SecureStore from "expo-secure-store";
import Constants from "expo-constants";

const API =
  (Constants.expoConfig?.extra?.apiUrl as string) ||
  "http://138.68.66.6/api/v1";

async function getToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync("token");
  } catch {
    return null;
  }
}

export async function setToken(token: string) {
  await SecureStore.setItemAsync("token", token);
}

export async function clearToken() {
  await SecureStore.deleteItemAsync("token");
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API}${path}`, { ...options, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Erreur ${res.status}`);
  }

  return res.json();
}

/* ---- Auth ---- */
export function login(data: { email: string; password: string }) {
  return request<{
    token: string;
    user: {
      id: number;
      username: string;
      avatar_url: string;
      is_verified: boolean;
      role: string;
    };
  }>("/auth/login", { method: "POST", body: JSON.stringify(data) });
}

export function register(data: {
  username: string;
  email: string;
  password: string;
}) {
  return request<{
    token: string;
    user: {
      id: number;
      username: string;
      avatar_url: string;
      is_verified: boolean;
      role: string;
    };
  }>("/auth/register", { method: "POST", body: JSON.stringify(data) });
}

export function sendOTP(phone: string) {
  return request<{ message: string; phone: string; dev_code?: string }>(
    "/auth/send-otp",
    { method: "POST", body: JSON.stringify({ phone }) },
  );
}

export function verifyOTP(phone: string, code: string) {
  return request<{
    action: "login" | "register";
    token?: string;
    user?: {
      id: number;
      username: string;
      avatar_url: string;
      is_verified: boolean;
      role: string;
    };
    phone_verified?: string;
  }>("/auth/verify-otp", {
    method: "POST",
    body: JSON.stringify({ phone, code }),
  });
}

export function getProfile() {
  return request<Record<string, unknown>>("/auth/me");
}

export function updateProfile(data: Record<string, unknown>) {
  return request<Record<string, unknown>>("/profiles/me", {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function getPublicProfile(userId: number) {
  return request<Record<string, unknown>>(`/profiles/${userId}`);
}

/* ---- Discover ---- */
export function discover() {
  return request<Record<string, unknown>[]>("/discover");
}

/* ---- Matching ---- */
export function likeUser(targetId: number) {
  return request<{ matched: boolean; match_id?: number }>("/matches/like", {
    method: "POST",
    body: JSON.stringify({ target_id: targetId }),
  });
}

export function passUser(targetId: number) {
  return request<{ message: string }>("/matches/pass", {
    method: "POST",
    body: JSON.stringify({ target_id: targetId }),
  });
}

export function getMatches() {
  return request<Record<string, unknown>[]>("/matches");
}

/* ---- Messages ---- */
export function getConversations() {
  return request<Record<string, unknown>[]>("/conversations");
}

export function getMessages(conversationId: number) {
  return request<Record<string, unknown>[]>(
    `/conversations/${conversationId}/messages`,
  );
}

export function sendMessage(data: { receiver_id: number; content: string }) {
  return request<Record<string, unknown>>("/messages", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function getOrCreateConversation(userId: number) {
  return request<Record<string, unknown>>(`/conversations/with/${userId}`);
}

export function markConversationRead(conversationId: number) {
  return request<Record<string, unknown>>(
    `/conversations/${conversationId}/read`,
    { method: "PUT" },
  );
}

/* ---- Location ---- */
export function updateLocation(data: { latitude: number; longitude: number }) {
  return request<{ message: string }>("/location", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function nearbyUsers(radius: number = 10) {
  return request<{
    users: {
      id: number;
      username: string;
      avatar_url: string;
      is_online: boolean;
      distance: number;
    }[];
  }>(`/nearby?radius=${radius}`);
}
