const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8888/api/v1";

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

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

/* ---- OTP Auth ---- */
export function sendOTP(phone: string) {
  return request<{ message: string; phone: string; dev_code?: string }>(
    "/auth/send-otp",
    {
      method: "POST",
      body: JSON.stringify({ phone }),
    },
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

export function registerPhone(data: { username: string; phone: string }) {
  return request<{
    token: string;
    user: {
      id: number;
      username: string;
      avatar_url: string;
      is_verified: boolean;
      role: string;
    };
  }>("/auth/register-phone", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/* ---- Profile ---- */
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

export function changePassword(data: {
  current_password: string;
  new_password: string;
}) {
  return request<{ message: string }>("/auth/password", {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function deleteAccount(password: string) {
  return request<{ message: string }>("/auth/account", {
    method: "DELETE",
    body: JSON.stringify({ password }),
  });
}

/* ---- Preferences ---- */
export function getPreferences() {
  return request<Record<string, unknown>>("/preferences");
}

export function updatePreferences(data: Record<string, unknown>) {
  return request<Record<string, unknown>>("/preferences", {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

/* ---- Discover ---- */
export function discover() {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  return fetch(`${API}/discover`, { headers }).then(async (res) => {
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `Erreur ${res.status}`);
    }
    const profiles = (await res.json()) as Record<string, unknown>[];
    const recycled = res.headers.get("X-Discover-Recycled") === "true";
    return { profiles, recycled };
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
    radius: number;
    center: { latitude: number; longitude: number };
  }>(`/nearby?radius=${radius}`);
}

export function searchProfiles(query: string) {
  return request<Record<string, unknown>[]>(
    `/search?q=${encodeURIComponent(query)}`,
  );
}

/* ---- Messages ---- */
export function getConversations() {
  return request<Record<string, unknown>[]>("/conversations");
}

export function getMessages(
  conversationId: number,
  opts?: { limit?: number; before?: number },
) {
  const params = new URLSearchParams();
  if (opts?.limit) params.set("limit", String(opts.limit));
  if (opts?.before) params.set("before", String(opts.before));
  const qs = params.toString();
  return request<{ messages: Record<string, unknown>[]; has_more: boolean }>(
    `/conversations/${conversationId}/messages${qs ? `?${qs}` : ""}`,
  );
}

export function sendMessage(data: {
  receiver_id: number;
  content: string;
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

export function deleteMessage(messageId: number) {
  return request<Record<string, unknown>>(`/messages/${messageId}`, {
    method: "DELETE",
  });
}

export function editMessage(messageId: number, content: string) {
  return request<Record<string, unknown>>(`/messages/${messageId}`, {
    method: "PUT",
    body: JSON.stringify({ content }),
  });
}

export function searchMessages(conversationId: number, q: string) {
  return request<{ messages: Record<string, unknown>[] }>(
    `/messages/search?conversation_id=${conversationId}&q=${encodeURIComponent(q)}`,
  );
}

export function uploadMessageImage(file: File) {
  const formData = new FormData();
  formData.append("image", file);
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;
  return fetch(`${API}/messages/upload-image`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  }).then((r) => r.json() as Promise<{ image_url: string }>);
}

export function uploadMessageAudio(file: File) {
  const formData = new FormData();
  formData.append("audio", file);
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;
  return fetch(`${API}/messages/upload-audio`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  }).then((r) => r.json() as Promise<{ audio_url: string }>);
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

/* ---- Location Sharing ---- */
export function startLocationShare(data: {
  receiver_id: number;
  latitude: number;
  longitude: number;
  duration?: number;
}) {
  return request<{
    id: number;
    sender_id: number;
    receiver_id: number;
    latitude: number;
    longitude: number;
    is_active: boolean;
    expires_at: string;
  }>("/location/share", { method: "POST", body: JSON.stringify(data) });
}

export function updateLocationShare(
  shareId: number,
  data: { latitude: number; longitude: number },
) {
  return request<{ updated: boolean }>(`/location/share/${shareId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function stopLocationShare(shareId: number) {
  return request<{ message: string }>(`/location/share/${shareId}`, {
    method: "DELETE",
  });
}

export function getActiveLocationShares() {
  return request<
    {
      id: number;
      sender_id: number;
      receiver_id: number;
      latitude: number;
      longitude: number;
      is_active: boolean;
      expires_at: string;
      sender?: { id: number; username: string; avatar_url?: string };
      receiver?: { id: number; username: string; avatar_url?: string };
    }[]
  >("/location/shares");
}

/* ---- VTC Rides ---- */
export function requestVTCRide(data: {
  passenger_id: number;
  pickup_lat: number;
  pickup_lng: number;
  pickup_address: string;
  dropoff_lat: number;
  dropoff_lng: number;
  dropoff_address: string;
  note?: string;
}) {
  return request<Record<string, unknown>>("/vtc/rides", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function getMyVTCRides() {
  return request<Record<string, unknown>[]>("/vtc/rides");
}

export function getVTCRide(id: number) {
  return request<Record<string, unknown>>(`/vtc/rides/${id}`);
}

export function updateVTCRideStatus(id: number, status: string) {
  return request<{ message: string; status: string }>(
    `/vtc/rides/${id}/status`,
    { method: "PUT", body: JSON.stringify({ status }) },
  );
}

export function updateVTCDriverLocation(
  rideId: number,
  data: { latitude: number; longitude: number },
) {
  return request<{ updated: boolean }>(`/vtc/rides/${rideId}/driver-location`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

/* ---- Shop ---- */
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

/* ---- Delivery Tracking ---- */
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

/* ---- Places ---- */
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

/* ---- Likes / Matches ---- */
export function likeUser(likedId: number) {
  return request<{ liked: boolean; is_match: boolean }>("/likes", {
    method: "POST",
    body: JSON.stringify({ liked_id: likedId }),
  });
}

export function passUser(passedId: number) {
  return request<{ passed: boolean }>("/pass", {
    method: "POST",
    body: JSON.stringify({ passed_id: passedId }),
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

/* ---- Notifications ---- */
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
  return request<Record<string, unknown>>("/notifications/read", {
    method: "PUT",
  });
}

export function markNotificationsUnread() {
  return request<Record<string, unknown>>("/notifications/unread", {
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
  return request<Record<string, unknown>>("/notifications", {
    method: "PATCH",
    body: JSON.stringify({ ids, is_read: isRead }),
  });
}

export function deleteNotification(id: number) {
  return request<Record<string, unknown>>(`/notifications/${id}`, {
    method: "DELETE",
  });
}

export function deleteNotifications(ids: number[]) {
  return request<Record<string, unknown>>("/notifications", {
    method: "DELETE",
    body: JSON.stringify({ ids }),
  });
}

/* ---- Orange Money (XML-RPC BF) ---- */
export function getOMUssdCode(orderId: number) {
  return request<{
    order_id: number;
    amount: number;
    currency: string;
    ussd_code: string;
    test_mode?: boolean;
    message: string;
  }>("/om/ussd-code", {
    method: "POST",
    body: JSON.stringify({ order_id: orderId }),
  });
}

export function confirmOMPayment(orderId: number, phone: string, otp: string) {
  return request<{
    status: string;
    transaction_id?: string;
    amount?: number;
    currency?: string;
    message?: string;
    error?: string;
    error_code?: string;
  }>("/om/confirm", {
    method: "POST",
    body: JSON.stringify({ order_id: orderId, phone, otp }),
  });
}

export function checkPaymentStatus(orderId: number) {
  return request<{
    order_id: number;
    status: string;
    transaction_id: string;
  }>(`/orders/${orderId}/payment-status`);
}

/* ---- Service Payments (connection, reservation, booking) ---- */
export function checkConnectionPaid(targetUserId: number) {
  return request<{ paid: boolean; amount: number }>(
    `/pay/connection/${targetUserId}`,
  );
}

export function initiateConnectionPayment(targetUserId: number) {
  return request<{
    payment_id: number;
    amount: number;
    currency: string;
    ussd_code: string;
    message: string;
    test_mode?: boolean;
    already_paid?: boolean;
  }>("/pay/connection/initiate", {
    method: "POST",
    body: JSON.stringify({ target_user_id: targetUserId }),
  });
}

export function confirmConnectionPayment(
  paymentId: number,
  phone: string,
  otp: string,
) {
  return request<{
    status: string;
    transaction_id?: string;
    message?: string;
  }>("/pay/connection/confirm", {
    method: "POST",
    body: JSON.stringify({ payment_id: paymentId, phone, otp }),
  });
}

export function initiateReservationPayment(reservationId: number) {
  return request<{
    payment_id: number;
    amount: number;
    currency: string;
    ussd_code: string;
    message: string;
    test_mode?: boolean;
    already_paid?: boolean;
  }>("/pay/reservation/initiate", {
    method: "POST",
    body: JSON.stringify({ reservation_id: reservationId }),
  });
}

export function confirmReservationPayment(
  paymentId: number,
  phone: string,
  otp: string,
) {
  return request<{
    status: string;
    transaction_id?: string;
    message?: string;
  }>("/pay/reservation/confirm", {
    method: "POST",
    body: JSON.stringify({ payment_id: paymentId, phone, otp }),
  });
}

export function initiateBookingPayment(bookingId: number) {
  return request<{
    payment_id: number;
    amount: number;
    currency: string;
    ussd_code: string;
    message: string;
    test_mode?: boolean;
    already_paid?: boolean;
  }>("/pay/booking/initiate", {
    method: "POST",
    body: JSON.stringify({ booking_id: bookingId }),
  });
}

export function confirmBookingPayment(
  paymentId: number,
  phone: string,
  otp: string,
) {
  return request<{
    status: string;
    transaction_id?: string;
    message?: string;
  }>("/pay/booking/confirm", {
    method: "POST",
    body: JSON.stringify({ payment_id: paymentId, phone, otp }),
  });
}

/* ---- Upload ---- */
export async function uploadAvatar(file: File) {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const formData = new FormData();
  formData.append("avatar", file);

  const res = await fetch(`${API}/upload/avatar`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Erreur ${res.status}`);
  }
  return res.json() as Promise<{ avatar_url: string; message: string }>;
}

export async function uploadMedia(file: File) {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const formData = new FormData();
  formData.append("image", file);

  const res = await fetch(`${API}/upload/media`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Erreur ${res.status}`);
  }
  return res.json() as Promise<{ image_url: string; message: string }>;
}

/* ---- Photo gallery ---- */
export async function uploadPhoto(file: File) {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const formData = new FormData();
  formData.append("photo", file);

  const res = await fetch(`${API}/photos`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Erreur ${res.status}`);
  }
  return res.json() as Promise<{
    id: number;
    url: string;
    position: number;
  }>;
}

export function getUserPhotos(userId: number) {
  return request<{ id: number; url: string; position: number }[]>(
    `/users/${userId}/photos`,
  );
}

export function deletePhoto(photoId: number) {
  return request<{ message: string }>(`/photos/${photoId}`, {
    method: "DELETE",
  });
}

/* ---- Email Verification ---- */
export function sendVerification() {
  return request<{ message: string }>("/auth/send-verification", {
    method: "POST",
  });
}

/* ---- Admin ---- */
export function adminGetStats() {
  return request<Record<string, unknown>>("/admin/stats");
}

export function adminGetStatsTimeline(days = 30) {
  return request<{
    signups: { day: string; count: number }[];
    matches: { day: string; count: number }[];
    messages: { day: string; count: number }[];
    orders: { day: string; count: number; total: number }[];
  }>(`/admin/stats/timeline?days=${days}`);
}

export function adminListUsers(page = 1, search = "") {
  const qs = new URLSearchParams({ page: String(page) });
  if (search) qs.set("search", search);
  return request<{
    users: Record<string, unknown>[];
    total: number;
    page: number;
  }>(`/admin/users?${qs}`);
}

export function adminUpdateUser(id: number, data: Record<string, unknown>) {
  return request<Record<string, unknown>>(`/admin/users/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function adminDeleteUser(id: number) {
  return request<Record<string, unknown>>(`/admin/users/${id}`, {
    method: "DELETE",
  });
}

export function adminCreateProduct(data: Record<string, unknown>) {
  return request<Record<string, unknown>>("/admin/products", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function adminUpdateProduct(id: number, data: Record<string, unknown>) {
  return request<Record<string, unknown>>(`/admin/products/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function adminDeleteProduct(id: number) {
  return request<Record<string, unknown>>(`/admin/products/${id}`, {
    method: "DELETE",
  });
}

export function adminCreatePlace(data: Record<string, unknown>) {
  return request<Record<string, unknown>>("/admin/places", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function adminUpdatePlace(id: number, data: Record<string, unknown>) {
  return request<Record<string, unknown>>(`/admin/places/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function adminDeletePlace(id: number) {
  return request<Record<string, unknown>>(`/admin/places/${id}`, {
    method: "DELETE",
  });
}

export function adminListOrders(page = 1) {
  return request<{
    orders: Record<string, unknown>[];
    total: number;
    page: number;
  }>(`/admin/orders?page=${page}`);
}

export function adminUpdateOrderStatus(id: number, status: string) {
  return request<Record<string, unknown>>(`/admin/orders/${id}/status`, {
    method: "PUT",
    body: JSON.stringify({ status }),
  });
}

/* ---- Safety: Report & Block ---- */
export function reportUser(data: {
  reported_id: number;
  reason: string;
  details?: string;
}) {
  return request<{ message: string; id: number }>("/reports", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function blockUser(blockedId: number) {
  return request<{ message: string }>("/blocks", {
    method: "POST",
    body: JSON.stringify({ blocked_id: blockedId }),
  });
}

export function unblockUser(id: number) {
  return request<{ message: string }>(`/blocks/${id}`, { method: "DELETE" });
}

export function getBlockedUsers() {
  return request<Record<string, unknown>[]>("/blocks");
}

/* ---- Admin: Reports ---- */
export function adminListReports(page = 1, status = "pending") {
  return request<{
    reports: Record<string, unknown>[];
    total: number;
    page: number;
  }>(`/admin/reports?page=${page}&status=${status}`);
}

export function adminUpdateReport(id: number, status: string) {
  return request<Record<string, unknown>>(`/admin/reports/${id}`, {
    method: "PUT",
    body: JSON.stringify({ status }),
  });
}

export function adminBanUser(id: number, banned: boolean, reason = "") {
  return request<{ message: string }>(`/admin/users/${id}/ban`, {
    method: "PUT",
    body: JSON.stringify({ banned, reason }),
  });
}

export function adminGetReportCount(userId: number) {
  return request<{ user_id: number; pending_reports: number }>(
    `/admin/users/${userId}/reports-count`,
  );
}

/* ---- Wellness ---- */
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
  return request<{
    provider: Record<string, unknown>;
    reviews: Record<string, unknown>[];
  }>(`/wellness/providers/${id}`);
}

export function getWellnessService(id: number) {
  return request<Record<string, unknown>>(`/wellness/services/${id}`);
}

export function createWellnessBooking(data: {
  service_id: number;
  date: string;
  start_time: string;
  persons: number;
  guest_id?: number;
  notes?: string;
}) {
  return request<Record<string, unknown>>("/wellness/bookings", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function getWellnessBookings() {
  return request<Record<string, unknown>[]>("/wellness/bookings");
}

/* ---- Auth: Mot de passe oublié ---- */
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

/* ---- Premium ---- */
export function getPremiumPlans() {
  return request<{
    plans: {
      id: string;
      name: string;
      price: number;
      duration_days: number;
      features: string[];
    }[];
  }>("/premium/plans");
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

/* ---- Événements ---- */
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

/* ---- Prompts profil ---- */
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

export function completeOnboarding() {
  return request<{ message: string }>("/onboarding/complete", {
    method: "POST",
  });
}

export async function uploadSelfie(file: File) {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const formData = new FormData();
  formData.append("selfie", file);

  const res = await fetch(`${API}/upload/selfie`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Erreur ${res.status}`);
  }
  return res.json() as Promise<{
    selfie_url: string;
    selfie_status: string;
    message: string;
  }>;
}

/* ---- Super Like / Rewind / Qui m'a liké ---- */
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
  }>("/likes/me");
}

export function cancelWellnessBooking(id: number) {
  return request<{ message: string }>(`/wellness/bookings/${id}/cancel`, {
    method: "PUT",
  });
}

export function createWellnessReview(data: {
  booking_id: number;
  rating: number;
  comment: string;
}) {
  return request<Record<string, unknown>>("/wellness/reviews", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/* ---- Admin Wellness ---- */
export function adminCreateProvider(data: Record<string, unknown>) {
  return request<Record<string, unknown>>("/admin/wellness/providers", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function adminUpdateProvider(id: number, data: Record<string, unknown>) {
  return request<Record<string, unknown>>(`/admin/wellness/providers/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function adminDeleteProvider(id: number) {
  return request<Record<string, unknown>>(`/admin/wellness/providers/${id}`, {
    method: "DELETE",
  });
}

export function adminCreateWellnessService(data: Record<string, unknown>) {
  return request<Record<string, unknown>>("/admin/wellness/services", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function adminUpdateWellnessService(
  id: number,
  data: Record<string, unknown>,
) {
  return request<Record<string, unknown>>(`/admin/wellness/services/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function adminDeleteWellnessService(id: number) {
  return request<Record<string, unknown>>(`/admin/wellness/services/${id}`, {
    method: "DELETE",
  });
}

export function adminSetProviderAvailability(
  providerId: number,
  slots: { day_of_week: number; start_time: string; end_time: string }[],
) {
  return request<Record<string, unknown>[]>(
    `/admin/wellness/providers/${providerId}/availability`,
    { method: "PUT", body: JSON.stringify(slots) },
  );
}

export function adminListWellnessBookings(page = 1, status = "") {
  const qs = new URLSearchParams({ page: String(page) });
  if (status) qs.set("status", status);
  return request<{
    bookings: Record<string, unknown>[];
    total: number;
    page: number;
  }>(`/admin/wellness/bookings?${qs}`);
}

export function adminUpdateWellnessBookingStatus(id: number, status: string) {
  return request<Record<string, unknown>>(
    `/admin/wellness/bookings/${id}/status`,
    { method: "PUT", body: JSON.stringify({ status }) },
  );
}

/* ---- Owner Dashboard ---- */
export function ownerGetStats() {
  return request<{
    places: number;
    products: number;
    wellness: number;
    orders: number;
    revenue: number;
    bookings: number;
    reservations: number;
  }>("/owner/stats");
}

export function ownerGetPlaces() {
  return request<{ places: Record<string, unknown>[] }>("/owner/places");
}

export function ownerUpdatePlace(id: number, data: Record<string, unknown>) {
  return request<Record<string, unknown>>(`/owner/places/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function ownerGetProducts() {
  return request<{ products: Record<string, unknown>[] }>("/owner/products");
}

export function ownerCreateProduct(data: Record<string, unknown>) {
  return request<Record<string, unknown>>("/owner/products", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function ownerUpdateProduct(id: number, data: Record<string, unknown>) {
  return request<Record<string, unknown>>(`/owner/products/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function ownerDeleteProduct(id: number) {
  return request<Record<string, unknown>>(`/owner/products/${id}`, {
    method: "DELETE",
  });
}

export function ownerGetOrders(page = 1) {
  return request<{
    orders: Record<string, unknown>[];
    total: number;
    page: number;
  }>(`/owner/orders?page=${page}`);
}

export function ownerUpdateOrderStatus(id: number, status: string) {
  return request<Record<string, unknown>>(`/owner/orders/${id}/status`, {
    method: "PUT",
    body: JSON.stringify({ status }),
  });
}

export function ownerGetWellnessBookings(page = 1) {
  return request<{
    bookings: Record<string, unknown>[];
    total: number;
    page: number;
  }>(`/owner/wellness/bookings?page=${page}`);
}

export function ownerUpdateBookingStatus(id: number, status: string) {
  return request<Record<string, unknown>>(
    `/owner/wellness/bookings/${id}/status`,
    { method: "PUT", body: JSON.stringify({ status }) },
  );
}

export function ownerGetReservations(page = 1) {
  return request<{
    reservations: Record<string, unknown>[];
    total: number;
    page: number;
  }>(`/owner/reservations?page=${page}`);
}

export function ownerUpdateReservationStatus(id: number, status: string) {
  return request<Record<string, unknown>>(`/owner/reservations/${id}/status`, {
    method: "PUT",
    body: JSON.stringify({ status }),
  });
}

/* ---- Delivery Addresses ---- */
export function getDeliveryAddresses() {
  return request<{
    addresses: {
      id: number;
      label: string;
      full_name: string;
      phone: string;
      address: string;
      city: string;
      postal_code: string;
      country: string;
      is_default: boolean;
    }[];
  }>("/addresses");
}

export function createDeliveryAddress(data: {
  label?: string;
  full_name: string;
  phone?: string;
  address: string;
  city: string;
  postal_code?: string;
  country?: string;
  is_default?: boolean;
}) {
  return request<Record<string, unknown>>("/addresses", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateDeliveryAddress(
  id: number,
  data: Record<string, unknown>,
) {
  return request<Record<string, unknown>>(`/addresses/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function deleteDeliveryAddress(id: number) {
  return request<Record<string, unknown>>(`/addresses/${id}`, {
    method: "DELETE",
  });
}

/* ---- Place Reservations ---- */
export function createPlaceReservation(data: {
  place_id: number;
  date: string;
  end_date?: string;
  persons?: number;
  notes?: string;
}) {
  return request<Record<string, unknown>>("/places/reservations", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function getMyPlaceReservations() {
  return request<{ reservations: Record<string, unknown>[] }>(
    "/places/reservations",
  );
}

export function cancelPlaceReservation(id: number) {
  return request<Record<string, unknown>>(`/places/reservations/${id}/cancel`, {
    method: "PUT",
  });
}

/* ---- Order Tracking ---- */
export function getOrderTracking(orderId: number) {
  return request<{
    order: Record<string, unknown>;
    tracking: { step: string; label: string; done: boolean }[];
  }>(`/orders/${orderId}/tracking`);
}

/* ---- Push Notifications ---- */
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
