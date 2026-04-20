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
  return request<Record<string, unknown>[]>("/discover");
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

/* ---- Shop ---- */
export function getProducts() {
  return request<Record<string, unknown>[]>("/shop/products");
}

export function getProduct(id: number) {
  return request<Record<string, unknown>>(`/shop/products/${id}`);
}

export function createOrder(data: {
  items: { product_id: number; quantity: number }[];
}) {
  return request<Record<string, unknown>>("/shop/orders", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function getOrders() {
  return request<Record<string, unknown>[]>("/shop/orders");
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
export function getNotifications() {
  return request<Record<string, unknown>[]>("/notifications");
}

export function getUnreadCount() {
  return request<{ count: number }>("/notifications/unread");
}

export function markNotificationsRead() {
  return request<Record<string, unknown>>("/notifications/read", {
    method: "PUT",
  });
}

export function deleteNotification(id: number) {
  return request<Record<string, unknown>>(`/notifications/${id}`, {
    method: "DELETE",
  });
}

/* ---- Stripe Checkout ---- */
export function createCheckout(orderId: number) {
  return request<{ checkout_url: string; session_id: string }>("/checkout", {
    method: "POST",
    body: JSON.stringify({ order_id: orderId }),
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
