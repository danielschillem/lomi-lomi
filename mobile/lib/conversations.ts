export interface ConversationUser {
  id?: number;
  username?: string;
  avatar_url?: string;
  is_online?: boolean;
}

export interface ConversationLastMessage {
  content?: string;
  created_at?: string;
  sender_id?: number;
  image_url?: string;
}

export interface ConversationListItem {
  id: number;
  created_at?: string;
  updated_at?: string;
  user1_id?: number;
  user2_id?: number;
  user1?: ConversationUser | null;
  user2?: ConversationUser | null;
  other_user?: ConversationUser | null;
  last_message?: ConversationLastMessage | string | null;
  unread_count?: number;
}

export interface SafeConversationUser {
  id: number;
  username: string;
  avatar_url: string;
  is_online: boolean;
}

function asNumber(value: unknown) {
  const numberValue = Number(value || 0);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function normalizeUser(
  user?: ConversationUser | null,
  fallbackId = 0,
): SafeConversationUser {
  const id = asNumber(user?.id) || fallbackId;
  return {
    id,
    username: user?.username || (id > 0 ? `Utilisateur #${id}` : "Utilisateur"),
    avatar_url: user?.avatar_url || "",
    is_online: Boolean(user?.is_online),
  };
}

export function getConversationOtherUser(
  conversation: ConversationListItem,
  currentUserId?: number,
) {
  const ownId = asNumber(currentUserId);
  const user1Id = asNumber(conversation.user1_id ?? conversation.user1?.id);
  const user2Id = asNumber(conversation.user2_id ?? conversation.user2?.id);

  if (conversation.other_user?.id) {
    return normalizeUser(conversation.other_user);
  }

  if (ownId > 0 && user1Id === ownId) {
    return normalizeUser(conversation.user2, user2Id);
  }

  if (ownId > 0 && user2Id === ownId) {
    return normalizeUser(conversation.user1, user1Id);
  }

  return normalizeUser(
    conversation.other_user || conversation.user1 || conversation.user2,
    user1Id || user2Id,
  );
}

export function getConversationRecipientId(
  conversation: ConversationListItem,
  currentUserId?: number,
) {
  return getConversationOtherUser(conversation, currentUserId).id;
}

export function getConversationLastMessageContent(
  conversation: ConversationListItem,
) {
  const lastMessage = conversation.last_message;
  if (!lastMessage) return "";
  if (typeof lastMessage === "string") return lastMessage;
  if (lastMessage.content) return lastMessage.content;
  if (lastMessage.image_url) return "Image";
  return "";
}

export function getConversationLastMessageDate(
  conversation: ConversationListItem,
) {
  const lastMessage = conversation.last_message;
  if (lastMessage && typeof lastMessage !== "string" && lastMessage.created_at) {
    return lastMessage.created_at;
  }
  return conversation.updated_at || conversation.created_at || "";
}
