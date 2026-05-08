import * as SecureStore from "expo-secure-store";
import Constants from "expo-constants";
import { Platform } from "react-native";

const API =
  (Constants.expoConfig?.extra?.apiUrl as string) ||
  "http://134.209.229.141/api/v1";

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

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function canRetryRequest(method?: string, status?: number) {
  const upper = (method || "GET").toUpperCase();
  if (upper !== "GET") return false;
  if (status == null) return true; // network error
  return status === 429 || status >= 500;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const retries = 2;
  const method = (options.method || "GET").toUpperCase();

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(`${API}${path}`, { ...options, headers });

      if (res.ok) {
        return res.json();
      }

      if (attempt < retries && canRetryRequest(method, res.status)) {
        await wait(250 * (attempt + 1));
        continue;
      }

      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `Erreur ${res.status}`);
    } catch (err) {
      const isNetworkError =
        err instanceof TypeError ||
        ((err as Error)?.message || "").toLowerCase().includes("network");
      if (attempt < retries && canRetryRequest(method)) {
        await wait(250 * (attempt + 1));
        continue;
      }
      if (isNetworkError) {
        throw new Error("Réseau indisponible. Vérifie ta connexion Internet.");
      }
      throw err;
    }
  }

  throw new Error("Échec de requête réseau");
}

/** Upload multipart (avatar, photos) - no Content-Type header (browser sets boundary) */
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
  return request<{ liked: boolean; is_match: boolean }>("/likes", {
    method: "POST",
    body: JSON.stringify({ liked_id: targetId }),
  });
}

export function passUser(targetId: number) {
  return request<{ passed: boolean }>("/pass", {
    method: "POST",
    body: JSON.stringify({ passed_id: targetId }),
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
export function getNotifications(page?: number, limit?: number) {
  const qs = new URLSearchParams();
  if (page != null) qs.set("page", String(page));
  if (limit != null) qs.set("limit", String(limit));
  const q = qs.toString();
  return request<Record<string, unknown>[]>(
    `/notifications${q ? `?${q}` : ""}`,
  );
}

export function getUnreadCount() {
  return request<{ count: number }>("/notifications/unread");
}

export function markNotificationsRead() {
  return request<{ message: string }>("/notifications/read", {
    method: "PUT",
  });
}

export function markNotificationsUnread() {
  return request<{ message: string }>("/notifications/unread", {
    method: "PUT",
  });
}

export function updateNotificationRead(id: number, isRead: boolean) {
  return request<Record<string, unknown>>(`/notifications/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ is_read: isRead }),
  });
}

export function updateNotificationsRead(ids: number[], isRead: boolean) {
  return request<{ message: string; updated: number }>("/notifications", {
    method: "PATCH",
    body: JSON.stringify({ ids, is_read: isRead }),
  });
}

export function deleteNotification(id: number) {
  return request<{ message: string }>(`/notifications/${id}`, {
    method: "DELETE",
  });
}

export function deleteNotifications(ids: number[]) {
  return request<{ message: string; deleted: number }>("/notifications", {
    method: "DELETE",
    body: JSON.stringify({ ids }),
  });
}

/* ===== Messages ===== */
export function getConversations() {
  return request<Record<string, unknown>[]>("/conversations");
}

export function getMessages(conversationId: number) {
  return request<{ messages: Record<string, unknown>[]; has_more: boolean }>(
    `/conversations/${conversationId}/messages`,
  );
}

export function sendMessage(data: {
  conversation_id?: number;
  receiver_id?: number;
  content?: string;
  image_url?: string;
  audio_url?: string;
  call_type?: "audio" | "video";
  call_room?: string;
  latitude?: number;
  longitude?: number;
}) {
  return request<Record<string, unknown>>("/messages", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export type CallType = "audio" | "video";
export type CallStatus =
  | "ringing"
  | "accepted"
  | "declined"
  | "missed"
  | "ended"
  | "cancelled";

export interface CallRecord {
  id: number;
  conversation_id: number;
  caller_id: number;
  receiver_id: number;
  call_type: CallType;
  room: string;
  status: CallStatus;
  created_at: string;
  accepted_at?: string;
  ended_at?: string;
  caller?: {
    id: number;
    username: string;
    avatar_url?: string;
    is_online?: boolean;
  };
  receiver?: {
    id: number;
    username: string;
    avatar_url?: string;
    is_online?: boolean;
  };
}

export function getCalls(limit: number = 50) {
  return request<CallRecord[]>(`/calls?limit=${limit}`);
}

export function startCall(data: {
  conversation_id?: number;
  receiver_id?: number;
  call_type: CallType;
}) {
  return request<CallRecord>("/calls", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateCallStatus(callId: number, status: CallStatus) {
  return request<CallRecord>(`/calls/${callId}/status`, {
    method: "PUT",
    body: JSON.stringify({ status }),
  });
}

export function uploadMessageImage(uri: string) {
  const formData = new FormData();
  const filename = uri.split("/").pop() || "message.jpg";
  const ext = filename.split(".").pop()?.toLowerCase() || "jpeg";
  const mimeType = ext === "png" ? "image/png" : "image/jpeg";
  formData.append("image", {
    uri,
    name: filename,
    type: mimeType,
  } as unknown as Blob);
  return uploadFile<{ image_url: string }>("/messages/upload-image", formData);
}

export function uploadMessageAudio(uri: string) {
  const formData = new FormData();
  const filename = uri.split("/").pop() || "voice.m4a";
  const ext = filename.split(".").pop()?.toLowerCase() || "m4a";
  const mimeType =
    ext === "mp3"
      ? "audio/mpeg"
      : ext === "wav"
        ? "audio/wav"
        : ext === "ogg"
          ? "audio/ogg"
          : "audio/mp4";
  formData.append("audio", {
    uri,
    name: filename,
    type: mimeType,
  } as unknown as Blob);
  return uploadFile<{ audio_url: string }>("/messages/upload-audio", formData);
}

export function editMessage(messageId: number, content: string) {
  return request<Record<string, unknown>>(`/messages/${messageId}`, {
    method: "PUT",
    body: JSON.stringify({ content }),
  });
}

export function deleteMessage(messageId: number) {
  return request<{ message: string }>(`/messages/${messageId}`, {
    method: "DELETE",
  });
}

export function searchMessages(conversationId: number, query: string) {
  const qs = new URLSearchParams({
    conversation_id: String(conversationId),
    q: query,
  });
  return request<{ messages: Record<string, unknown>[] }>(
    `/messages/search?${qs.toString()}`,
  );
}

export function getOrCreateConversation(userId: number) {
  return request<Record<string, unknown>>(`/conversations/with/${userId}`);
}

export function createGroupConversation(data: {
  title: string;
  member_ids: number[];
  avatar_url?: string;
}) {
  return request<Record<string, unknown>>("/conversations/groups", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function getConversationMembers(conversationId: number) {
  return request<{ members: Record<string, unknown>[] }>(
    `/conversations/${conversationId}/members`,
  );
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
  target_user_id?: number;
  receiver_id?: number;
  latitude?: number;
  longitude?: number;
  duration_minutes?: number;
  duration?: number;
}) {
  const payload = {
    receiver_id: data.receiver_id ?? data.target_user_id,
    target_user_id: data.target_user_id ?? data.receiver_id,
    latitude: data.latitude,
    longitude: data.longitude,
    duration: data.duration ?? data.duration_minutes,
    duration_minutes: data.duration_minutes ?? data.duration,
  };
  return request<Record<string, unknown>>("/location/share", {
    method: "POST",
    body: JSON.stringify(payload),
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

/* ===== Orange Money Payment (XML-RPC BF) ===== */
export function getOMUssdCode(orderId: number) {
  return request<Record<string, unknown>>("/om/ussd-code", {
    method: "POST",
    body: JSON.stringify({ order_id: orderId }),
  });
}

export function confirmOMPayment(orderId: number, phone: string, otp: string) {
  return request<Record<string, unknown>>("/om/confirm", {
    method: "POST",
    body: JSON.stringify({ order_id: orderId, phone, otp }),
  });
}

export function checkPaymentStatus(orderId: number) {
  return request<Record<string, unknown>>(`/orders/${orderId}/payment-status`);
}

/* ===== Service Payments (connection, reservation, booking) ===== */
export interface OMInitiateResponse {
  payment_id: number;
  ussd_code: string;
  already_paid?: boolean;
  test_mode?: boolean;
}

export interface OMConfirmResponse {
  status: string;
  transaction_id?: string;
  message?: string;
}

export function checkConnectionPaid(targetUserId: number) {
  return request<{ paid: boolean }>(`/pay/connection/${targetUserId}`);
}

export function initiateConnectionPayment(targetUserId: number) {
  return request<OMInitiateResponse>("/pay/connection/initiate", {
    method: "POST",
    body: JSON.stringify({ target_user_id: targetUserId }),
  });
}

export function confirmConnectionPayment(
  paymentId: number,
  phone: string,
  otp: string,
) {
  return request<OMConfirmResponse>("/pay/connection/confirm", {
    method: "POST",
    body: JSON.stringify({ payment_id: paymentId, phone, otp }),
  });
}

export function initiateReservationPayment(reservationId: number) {
  return request<OMInitiateResponse>("/pay/reservation/initiate", {
    method: "POST",
    body: JSON.stringify({ reservation_id: reservationId }),
  });
}

export function confirmReservationPayment(
  paymentId: number,
  phone: string,
  otp: string,
) {
  return request<OMConfirmResponse>("/pay/reservation/confirm", {
    method: "POST",
    body: JSON.stringify({ payment_id: paymentId, phone, otp }),
  });
}

export function initiateBookingPayment(bookingId: number) {
  return request<OMInitiateResponse>("/pay/booking/initiate", {
    method: "POST",
    body: JSON.stringify({ booking_id: bookingId }),
  });
}

export function confirmBookingPayment(
  paymentId: number,
  phone: string,
  otp: string,
) {
  return request<OMConfirmResponse>("/pay/booking/confirm", {
    method: "POST",
    body: JSON.stringify({ payment_id: paymentId, phone, otp }),
  });
}

/* ===== Order tracking ===== */
export function getOrderTracking(orderId: number) {
  return request<Record<string, unknown>>(`/orders/${orderId}/tracking`);
}

/* ===== Places ===== */
export function getPlaces(params?: { city?: string; category?: string }) {
  const qs = new URLSearchParams();
  if (params?.city) qs.set("city", params.city);
  if (params?.category) qs.set("category", params.category);
  const q = qs.toString();
  return request<Record<string, unknown>[]>(`/places${q ? `?${q}` : ""}`);
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
export function getWellnessProviders(params?: {
  category?: string;
  city?: string;
  mobile?: boolean;
}) {
  const qs = new URLSearchParams();
  if (params?.category) qs.set("category", params.category);
  if (params?.city) qs.set("city", params.city);
  if (params?.mobile) qs.set("mobile", "true");
  const q = qs.toString();
  return request<Record<string, unknown>[]>(
    `/wellness/providers${q ? `?${q}` : ""}`,
  );
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
  time?: string;
  start_time?: string;
  persons?: number;
  guest_id?: number;
  notes?: string;
}) {
  const payload = {
    service_id: data.service_id,
    date: data.date,
    start_time: data.start_time ?? data.time,
    time: data.time ?? data.start_time,
    persons: data.persons ?? 1,
    guest_id: data.guest_id,
    notes: data.notes,
  };
  return request<Record<string, unknown>>("/wellness/bookings", {
    method: "POST",
    body: JSON.stringify(payload),
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

/* ===== Push Notifications ===== */
export function registerPushToken(token: string) {
  return request<{ message: string }>("/push/register", {
    method: "POST",
    body: JSON.stringify({ token }),
  });
}

export function unregisterPushToken() {
  return request<{ message: string }>("/push/register", {
    method: "DELETE",
  });
}

/* ===== Auth: forgot/reset password ===== */
export function forgotPassword(email: string) {
  return request<{ message: string; dev_token?: string }>(
    "/auth/forgot-password",
    {
      method: "POST",
      body: JSON.stringify({ email }),
    },
  );
}

export function resetPassword(data: { token: string; password: string }) {
  return request<{ message: string }>("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/* ===== Onboarding ===== */
export function completeOnboarding() {
  return request<{ message: string }>("/onboarding/complete", {
    method: "POST",
  });
}

export function getPrompts() {
  return request<{ id: number; question: string; answer: string }[]>(
    "/prompts",
  );
}

export function savePrompts(prompts: { question: string; answer: string }[]) {
  return request<{ id: number; question: string; answer: string }[]>(
    "/prompts",
    {
      method: "POST",
      body: JSON.stringify(prompts),
    },
  );
}

/** Upload a selfie photo (URI from expo-image-picker / camera) */
export function uploadSelfie(uri: string) {
  const formData = new FormData();
  const filename = uri.split("/").pop() || "selfie.jpg";
  const ext = (filename.split(".").pop() || "jpg").toLowerCase();
  const mimeType = ext === "png" ? "image/png" : "image/jpeg";
  formData.append("selfie", {
    uri,
    name: filename,
    type: mimeType,
  } as unknown as Blob);
  return uploadFile<{ message: string; verified: boolean }>(
    "/upload/selfie",
    formData,
  );
}

/* ===== Premium ===== */
export interface PremiumPlan {
  id: string;
  name: string;
  price: number;
  duration_days: number;
  features: string[];
}

export function getPremiumPlans() {
  return request<{ plans: PremiumPlan[] }>("/premium/plans");
}

export function getMySubscription() {
  return request<{
    is_premium: boolean;
    plan?: string;
    ends_at?: string;
    status?: string;
  }>("/premium/me");
}

export function subscribePremium(data: {
  plan: string;
  phone: string;
  tx_id?: string;
}) {
  return request<{ message: string; ends_at: string }>("/premium/subscribe", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function cancelSubscription() {
  return request<{ message: string }>("/premium/subscribe", {
    method: "DELETE",
  });
}

export function superLike(likedId: number) {
  return request<{ super_liked: boolean; is_match: boolean }>("/superlikes", {
    method: "POST",
    body: JSON.stringify({ liked_id: likedId }),
  });
}

export function rewind() {
  return request<{ rewound: string; user_id: number }>("/rewind", {
    method: "POST",
  });
}

export function whoLikedMe() {
  return request<{
    count: number;
    profiles: {
      id?: number;
      username?: string;
      avatar_url?: string;
      city?: string;
      type?: string;
      blurred?: boolean;
    }[];
    upgrade: boolean;
    message?: string;
  }>("/who-liked-me");
}

/* ===== Événements ===== */
export function getEvents(params?: { city?: string; category?: string }) {
  const qs = new URLSearchParams();
  if (params?.city) qs.set("city", params.city);
  if (params?.category) qs.set("category", params.category);
  const q = qs.toString();
  return request<Record<string, unknown>[]>(`/events${q ? `?${q}` : ""}`);
}

export function getEvent(id: number) {
  return request<Record<string, unknown>>(`/events/${id}`);
}

export function attendEvent(
  id: number,
  status: "going" | "interested" | "cancelled",
) {
  return request<{ message: string }>(`/events/${id}/attend`, {
    method: "POST",
    body: JSON.stringify({ status }),
  });
}

export function getMyEvents() {
  return request<Record<string, unknown>[]>("/events/me");
}

/* ===== Delivery (livreur) ===== */
export type DeliveryStatus =
  | "pending"
  | "accepted"
  | "picking_up"
  | "picked_up"
  | "delivering"
  | "delivered"
  | "canceled";

export interface DeliveryTracking {
  id: number;
  order_id: number;
  client_id: number;
  delivery_person_id?: number;
  status: DeliveryStatus;
  pickup_lat: number;
  pickup_lng: number;
  pickup_address: string;
  dropoff_lat: number;
  dropoff_lng: number;
  dropoff_address: string;
  delivery_person_lat: number;
  delivery_person_lng: number;
  accepted_at?: string;
  picked_up_at?: string;
  delivered_at?: string;
  note?: string;
  delivery_person?: { id: number; username: string; avatar_url?: string };
  order?: Record<string, unknown>;
}

export function getDeliveryByOrder(orderId: number) {
  return request<DeliveryTracking>(`/shop/orders/${orderId}/delivery`);
}

export function getDelivery(deliveryId: number) {
  return request<DeliveryTracking>(`/delivery/${deliveryId}`);
}

export function getAvailableDeliveries() {
  return request<DeliveryTracking[]>("/delivery/available");
}

export function getMyDeliveries() {
  return request<DeliveryTracking[]>("/delivery/mine");
}

export function acceptDelivery(deliveryId: number) {
  return request<DeliveryTracking>(`/delivery/${deliveryId}/accept`, {
    method: "POST",
  });
}

export function updateDeliveryStatus(
  deliveryId: number,
  status: DeliveryStatus,
) {
  return request<{ status: DeliveryStatus; message: string }>(
    `/delivery/${deliveryId}/status`,
    { method: "PUT", body: JSON.stringify({ status }) },
  );
}

export function updateDeliveryLocation(
  deliveryId: number,
  latitude: number,
  longitude: number,
) {
  return request<{ updated: boolean }>(`/delivery/${deliveryId}/location`, {
    method: "PUT",
    body: JSON.stringify({ latitude, longitude }),
  });
}

export function createDeliveryRequest(
  orderId: number,
  data: {
    pickup_lat: number;
    pickup_lng: number;
    pickup_address: string;
    dropoff_lat?: number;
    dropoff_lng?: number;
    dropoff_address?: string;
    note?: string;
  },
) {
  return request<DeliveryTracking>(`/shop/orders/${orderId}/delivery`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/* ===== Aliases (legacy code in mobile/) =====
 * Several screens were written before mobile/lib/api.ts split shop-payment
 * helpers; expose unified names that delegate to the existing functions.
 */
export function initiatePayment(data: { order_id: number; phone?: string }) {
  return getOMUssdCode(data.order_id);
}

export function getUserPhotos(userId: number) {
  return getPhotos(userId);
}

export function getActiveLocationShares() {
  return getActiveShares();
}

export function cancelPlaceReservation(id: number) {
  return cancelReservation(id);
}

export function getMyPlaceReservations() {
  return getMyReservations();
}
