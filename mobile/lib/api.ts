import * as SecureStore from "expo-secure-store";
import Constants from "expo-constants";
import { Platform } from "react-native";

const API =
  (Constants.expoConfig?.extra?.apiUrl as string) ||
  "http://138.68.66.6/api/v1";

const storage = {
  async get(key: string): Promise<string | null> {
    if (Platform.OS === "web") {
      return localStorage.getItem(key);
    }
    return SecureStore.getItemAsync(key);
  },
  async set(key: string, value: string): Promise<void> {
    if (Platform.OS === "web") {
      localStorage.setItem(key, value);
      return;
    }
    await SecureStore.setItemAsync(key, value);
  },
  async remove(key: string): Promise<void> {
    if (Platform.OS === "web") {
      localStorage.removeItem(key);
      return;
    }
    await SecureStore.deleteItemAsync(key);
  },
};

async function getToken(): Promise<string | null> {
  try {
    return await storage.get("token");
  } catch {
    return null;
  }
}

export async function setToken(token: string) {
  await storage.set("token", token);
}

export async function clearToken() {
  await storage.remove("token");
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

/** Upload multipart (avatar, photos) — no Content-Type header (browser sets boundary) */
async function uploadFile<T>(path: string, formData: FormData): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers,
    body: formData,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Erreur ${res.status}`);
  }
  return res.json();
}

/* ===== Auth ===== */
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

export function registerPhone(data: {
  phone: string;
  username: string;
  password: string;
}) {
  return request<{
    token: string;
    user: Record<string, unknown>;
  }>("/auth/register-phone", { method: "POST", body: JSON.stringify(data) });
}

export function getProfile() {
  return request<Record<string, unknown>>("/auth/me");
}

export function changePassword(data: {
  current_password: string;
  new_password: string;
}) {
  return request<{ message: string }>("/auth/password", {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function deleteAccount() {
  return request<{ message: string }>("/auth/account", { method: "DELETE" });
}

export function sendVerification() {
  return request<{ message: string }>("/auth/send-verification", {
    method: "POST",
  });
}

/* ===== Profiles ===== */
export function updateProfile(data: Record<string, unknown>) {
  return request<Record<string, unknown>>("/profiles/me", {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function getPublicProfile(userId: number) {
  return request<Record<string, unknown>>(`/profiles/${userId}`);
}

export function getPreferences() {
  return request<Record<string, unknown>>("/preferences");
}

export function updatePreferences(data: Record<string, unknown>) {
  return request<Record<string, unknown>>("/preferences", {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function searchProfiles(query: string) {
  return request<Record<string, unknown>[]>(
    `/search?q=${encodeURIComponent(query)}`,
  );
}

/* ===== Discover ===== */
export function discover() {
  return request<Record<string, unknown>[]>("/discover");
}

/* ===== Matching ===== */
export function likeUser(targetId: number) {
  return request<{ matched: boolean; match_id?: number }>("/likes", {
    method: "POST",
    body: JSON.stringify({ target_id: targetId }),
  });
}

export function passUser(targetId: number) {
  return request<{ message: string }>("/pass", {
    method: "POST",
    body: JSON.stringify({ target_id: targetId }),
  });
}

export function getMatches() {
  return request<Record<string, unknown>[]>("/matches");
}

export function unmatch(matchId: number) {
  return request<{ message: string }>(`/matches/${matchId}`, {
    method: "DELETE",
  });
}

/* ===== Notifications ===== */
export function getNotifications() {
  return request<Record<string, unknown>[]>("/notifications");
}

export function getUnreadCount() {
  return request<{ count: number }>("/notifications/unread");
}

export function markNotificationsRead() {
  return request<{ message: string }>("/notifications/read", {
    method: "PUT",
  });
}

export function deleteNotification(id: number) {
  return request<{ message: string }>(`/notifications/${id}`, {
    method: "DELETE",
  });
}

/* ===== Messages ===== */
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

/* ===== Location ===== */
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
      angle: number;
    }[];
  }>(`/nearby?radius=${radius}`);
}

/* ===== Location Sharing ===== */
export function startLocationShare(data: {
  target_user_id: number;
  duration_minutes: number;
}) {
  return request<Record<string, unknown>>("/location/share", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateLocationShare(
  shareId: number,
  data: { latitude: number; longitude: number },
) {
  return request<Record<string, unknown>>(`/location/share/${shareId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function stopLocationShare(shareId: number) {
  return request<{ message: string }>(`/location/share/${shareId}`, {
    method: "DELETE",
  });
}

export function getActiveShares() {
  return request<Record<string, unknown>[]>("/location/shares");
}

/* ===== VTC Rides ===== */
export function requestVTCRide(data: {
  pickup_lat: number;
  pickup_lng: number;
  pickup_address: string;
  dropoff_lat: number;
  dropoff_lng: number;
  dropoff_address: string;
}) {
  return request<Record<string, unknown>>("/vtc/rides", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function getMyVTCRides() {
  return request<Record<string, unknown>[]>("/vtc/rides");
}

export function getVTCRide(rideId: number) {
  return request<Record<string, unknown>>(`/vtc/rides/${rideId}`);
}

export function updateVTCRideStatus(rideId: number, data: { status: string }) {
  return request<Record<string, unknown>>(`/vtc/rides/${rideId}/status`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

/* ===== Shop ===== */
export function getProducts() {
  return request<Record<string, unknown>[]>("/shop/products");
}

export function getProduct(id: number) {
  return request<Record<string, unknown>>(`/shop/products/${id}`);
}

export function createOrder(data: {
  items: { product_id: number; quantity: number }[];
  delivery_address_id?: number;
}) {
  return request<Record<string, unknown>>("/shop/orders", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function getOrders() {
  return request<Record<string, unknown>[]>("/shop/orders");
}

/* ===== Orange Money Payment ===== */
export function initiatePayment(data: { order_id: number; phone: string }) {
  return request<Record<string, unknown>>("/checkout", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function checkPaymentStatus(orderId: number) {
  return request<Record<string, unknown>>(`/orders/${orderId}/payment-status`);
}

/* ===== Order tracking ===== */
export function getOrderTracking(orderId: number) {
  return request<Record<string, unknown>>(`/orders/${orderId}/tracking`);
}

/* ===== Places ===== */
export function getPlaces() {
  return request<Record<string, unknown>[]>("/places");
}

export function getPlace(id: number) {
  return request<Record<string, unknown>>(`/places/${id}`);
}

/* ===== Place Reservations ===== */
export function createPlaceReservation(data: {
  place_id: number;
  date: string;
  time: string;
  guests: number;
  notes?: string;
}) {
  return request<Record<string, unknown>>("/places/reservations", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function getMyReservations() {
  return request<Record<string, unknown>[]>("/places/reservations");
}

export function cancelReservation(id: number) {
  return request<{ message: string }>(`/places/reservations/${id}/cancel`, {
    method: "PUT",
  });
}

/* ===== Wellness (Bien-être) ===== */
export function getWellnessProviders() {
  return request<Record<string, unknown>[]>("/wellness/providers");
}

export function getWellnessProvider(id: number) {
  return request<Record<string, unknown>>(`/wellness/providers/${id}`);
}

export function getWellnessService(id: number) {
  return request<Record<string, unknown>>(`/wellness/services/${id}`);
}

export function createWellnessBooking(data: {
  service_id: number;
  date: string;
  time: string;
  notes?: string;
}) {
  return request<Record<string, unknown>>("/wellness/bookings", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function getMyWellnessBookings() {
  return request<Record<string, unknown>[]>("/wellness/bookings");
}

export function cancelWellnessBooking(id: number) {
  return request<{ message: string }>(`/wellness/bookings/${id}/cancel`, {
    method: "PUT",
  });
}

export function createWellnessReview(data: {
  provider_id: number;
  rating: number;
  comment: string;
}) {
  return request<Record<string, unknown>>("/wellness/reviews", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/* ===== Safety: Reports & Blocks ===== */
export function reportUser(data: {
  reported_id: number;
  reason: string;
  details?: string;
}) {
  return request<Record<string, unknown>>("/reports", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function blockUser(data: { blocked_id: number }) {
  return request<Record<string, unknown>>("/blocks", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function unblockUser(blockId: number) {
  return request<{ message: string }>(`/blocks/${blockId}`, {
    method: "DELETE",
  });
}

export function getBlockedUsers() {
  return request<Record<string, unknown>[]>("/blocks");
}

/* ===== Upload ===== */
export function uploadAvatar(uri: string) {
  const formData = new FormData();
  const filename = uri.split("/").pop() || "avatar.jpg";
  const ext = filename.split(".").pop()?.toLowerCase() || "jpeg";
  const mimeType = ext === "png" ? "image/png" : "image/jpeg";
  formData.append("avatar", {
    uri,
    name: filename,
    type: mimeType,
  } as unknown as Blob);
  return uploadFile<{ avatar_url: string }>("/upload/avatar", formData);
}

export function uploadPhoto(uri: string) {
  const formData = new FormData();
  const filename = uri.split("/").pop() || "photo.jpg";
  const ext = filename.split(".").pop()?.toLowerCase() || "jpeg";
  const mimeType = ext === "png" ? "image/png" : "image/jpeg";
  formData.append("photo", {
    uri,
    name: filename,
    type: mimeType,
  } as unknown as Blob);
  return uploadFile<Record<string, unknown>>("/photos", formData);
}

export function getPhotos(userId: number) {
  return request<Record<string, unknown>[]>(`/users/${userId}/photos`);
}

export function deletePhoto(photoId: number) {
  return request<{ message: string }>(`/photos/${photoId}`, {
    method: "DELETE",
  });
}

/* ===== Delivery Addresses ===== */
export function getAddresses() {
  return request<Record<string, unknown>[]>("/addresses");
}

export function createAddress(data: {
  label: string;
  address: string;
  city: string;
  latitude?: number;
  longitude?: number;
  is_default?: boolean;
}) {
  return request<Record<string, unknown>>("/addresses", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateAddress(id: number, data: Record<string, unknown>) {
  return request<Record<string, unknown>>(`/addresses/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function deleteAddress(id: number) {
  return request<{ message: string }>(`/addresses/${id}`, {
    method: "DELETE",
  });
}
