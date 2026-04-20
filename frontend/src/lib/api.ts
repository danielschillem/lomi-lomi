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
  return request<{ token: string; user: { id: number; username: string } }>(
    "/auth/register",
    { method: "POST", body: JSON.stringify(data) },
  );
}

export function login(data: { email: string; password: string }) {
  return request<{ token: string; user: { id: number; username: string } }>(
    "/auth/login",
    { method: "POST", body: JSON.stringify(data) },
  );
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

export function passUser() {
  return request<{ passed: boolean }>("/pass", { method: "POST" });
}

export function getMatches() {
  return request<Record<string, unknown>[]>("/matches");
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
