import { useEffect, useState, useRef, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Image,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  getMessages,
  sendMessage,
  uploadMessageImage,
  markConversationRead,
  editMessage,
  deleteMessage,
  searchMessages,
  initiateConnectionPayment,
  confirmConnectionPayment,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useWS } from "@/lib/ws-context";
import OMPaymentModal from "@/app/components/OMPaymentModal";

interface Message {
  id: number;
  content: string;
  image_url?: string;
  sender_id: number;
  created_at: string;
  is_read?: boolean;
  is_edited?: boolean;
  pending?: boolean;
  failed?: boolean;
}

export default function ChatScreen() {
  const { id, name, recipientId } = useLocalSearchParams<{
    id: string;
    name: string;
    recipientId: string;
  }>();
  const { user } = useAuth();
  const { onMessage, send: wsSend } = useWS();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [typingActive, setTypingActive] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<number | null>(null);
  const [editingText, setEditingText] = useState("");
  const [searchText, setSearchText] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchMode, setSearchMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [opInProgress, setOpInProgress] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingSendRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const conversationId = parseInt(id || "0", 10);
  const otherUserId = parseInt(recipientId || "0", 10);
  const isValidConversationId =
    Number.isFinite(conversationId) && conversationId > 0;
  const isValidReceiverId = Number.isFinite(otherUserId) && otherUserId > 0;

  useEffect(() => {
    if (!isValidConversationId) {
      setMessages([]);
      setLoading(false);
      return;
    }
    loadMessages();
    markConversationRead(conversationId).catch(() => {});
  }, [conversationId, isValidConversationId]);

  const normalizeEventData = (event: Record<string, unknown>) => {
    const raw = (event.data as Record<string, unknown>) || event;
    return raw;
  };

  const upsertMessage = (incoming: Message) => {
    setMessages((prev) => {
      const existingIndex = prev.findIndex((m) => m.id === incoming.id);
      if (existingIndex >= 0) {
        const next = [...prev];
        next[existingIndex] = {
          ...next[existingIndex],
          ...incoming,
          pending: false,
          failed: false,
        };
        return next;
      }
      return [incoming, ...prev];
    });
  };

  useEffect(() => {
    const unsub = onMessage((msg) => {
      const data = normalizeEventData(
        msg as unknown as Record<string, unknown>,
      );

      if (msg.type === "message") {
        const eventConvID = Number(data.conversation_id || 0);
        if (eventConvID !== conversationId) return;

        const incoming: Message = {
          id: Number(data.id || Date.now()),
          content: String(data.content || ""),
          image_url: data.image_url ? String(data.image_url) : undefined,
          sender_id: Number(data.sender_id || 0),
          created_at: String(data.created_at || new Date().toISOString()),
          is_read: Boolean(data.is_read),
          is_edited: Boolean(data.is_edited),
        };

        upsertMessage(incoming);
        if (incoming.sender_id !== user?.id) {
          markConversationRead(conversationId).catch(() => {});
        }
      }

      if (msg.type === "read_receipt") {
        const eventConvID = Number(data.conversation_id || 0);
        const messageID = Number(data.message_id || 0);
        if (eventConvID !== conversationId || messageID <= 0) return;

        setMessages((prev) =>
          prev.map((m) => (m.id === messageID ? { ...m, is_read: true } : m)),
        );
      }

      if (msg.type === "message_deleted") {
        const eventConvID = Number(data.conversation_id || 0);
        const messageID = Number(data.message_id || 0);
        if (eventConvID !== conversationId || messageID <= 0) return;

        setMessages((prev) => prev.filter((m) => m.id !== messageID));
      }

      if (msg.type === "message_edited") {
        const eventConvID = Number(data.conversation_id || 0);
        const messageID = Number(data.message_id || 0);
        if (eventConvID !== conversationId || messageID <= 0) return;

        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageID
              ? {
                  ...m,
                  content: String(data.content || m.content),
                  is_edited: Boolean(data.is_edited),
                }
              : m,
          ),
        );
      }

      if (msg.type === "typing") {
        const fromUser = Number(data.from_user_id || 0);
        if (!fromUser || fromUser !== otherUserId) return;
        setTypingActive(true);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(
          () => setTypingActive(false),
          2500,
        );
      }
    });
    return unsub;
  }, [conversationId, onMessage, otherUserId, user?.id]);

  const loadMessages = async () => {
    if (!isValidConversationId) return;
    try {
      const res = await getMessages(conversationId);
      const msgs = (res as { messages?: unknown[] })?.messages;
      const arr = Array.isArray(msgs) ? (msgs as unknown as Message[]) : [];
      setMessages(arr.reverse());
      setSearchMode(false);
    } catch {
      setMessages([]);
    }
    setLoading(false);
  };

  const handleSearchMessages = async () => {
    const q = searchText.trim();
    if (q.length < 2 || !isValidConversationId) {
      setSearchMode(false);
      loadMessages();
      return;
    }
    setSearching(true);
    try {
      const res = await searchMessages(conversationId, q);
      const rows = Array.isArray(res.messages)
        ? (res.messages as unknown as Message[])
        : [];
      setMessages(rows);
      setSearchMode(true);
    } catch {
      Alert.alert("Recherche", "Impossible de rechercher les messages.");
    }
    setSearching(false);
  };

  const handleSend = async () => {
    if (!text.trim() || sending || !isValidReceiverId) return;
    const content = text.trim();
    const tempId = -Date.now();
    const optimistic: Message = {
      id: tempId,
      content,
      sender_id: user?.id || 0,
      created_at: new Date().toISOString(),
      pending: true,
      failed: false,
      is_read: false,
      is_edited: false,
    };

    setMessages((prev) => [optimistic, ...prev]);
    setText("");
    setSending(true);
    try {
      const res = await sendMessage({
        receiver_id: otherUserId,
        content,
      });
      if (res) {
        const sent = res as unknown as Message;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempId
              ? {
                  ...m,
                  id: sent.id || Date.now(),
                  created_at: sent.created_at || m.created_at,
                  pending: false,
                  failed: false,
                }
              : m,
          ),
        );
      }
    } catch (err) {
      const msg = (err as Error).message || "";
      if (msg === "connection_required") {
        setShowPayment(true);
        setText(content);
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
      } else {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempId ? { ...m, pending: false, failed: true } : m,
          ),
        );
      }
    }
    setSending(false);
  };

  const handleSendImage = async () => {
    if (sending || !isValidReceiverId) return;

    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== "granted") {
      Alert.alert(
        "Photo",
        "Autorise l'acces a la galerie pour envoyer une image.",
      );
      return;
    }

    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: false,
    });

    if (picked.canceled || !picked.assets?.length) return;

    const uri = picked.assets[0].uri;
    const tempId = -Date.now();
    const optimistic: Message = {
      id: tempId,
      content: text.trim() || "",
      image_url: uri,
      sender_id: user?.id || 0,
      created_at: new Date().toISOString(),
      pending: true,
      failed: false,
      is_read: false,
    };

    setMessages((prev) => [optimistic, ...prev]);
    setSending(true);

    try {
      const up = await uploadMessageImage(uri);
      const imageUrl = up.image_url;
      const res = await sendMessage({
        receiver_id: otherUserId,
        content: text.trim() || " ",
        image_url: imageUrl,
      });

      const sent = res as unknown as Message;
      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempId
            ? {
                ...m,
                id: sent.id || Date.now(),
                content: sent.content || m.content,
                image_url: imageUrl,
                created_at: sent.created_at || m.created_at,
                pending: false,
                failed: false,
              }
            : m,
        ),
      );
      setText("");
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempId ? { ...m, pending: false, failed: true } : m,
        ),
      );
      Alert.alert("Photo", "Impossible d'envoyer cette image.");
    }

    setSending(false);
  };

  const onTypingChange = (value: string) => {
    setText(value);
    if (!isValidReceiverId) return;
    if (!value.trim()) return;

    if (!typingSendRef.current) {
      wsSend({ type: "typing", data: { to_user_id: otherUserId } });
      typingSendRef.current = setTimeout(() => {
        typingSendRef.current = null;
      }, 1500);
    }
  };

  const startEdit = (msg: Message) => {
    if (msg.sender_id !== user?.id) return;
    setEditingMessageId(msg.id);
    setEditingText(msg.content || "");
  };

  const cancelEdit = () => {
    setEditingMessageId(null);
    setEditingText("");
  };

  const saveEdit = async () => {
    if (!editingMessageId || !editingText.trim()) return;
    setOpInProgress(true);
    try {
      await editMessage(editingMessageId, editingText.trim());
      setMessages((prev) =>
        prev.map((m) =>
          m.id === editingMessageId
            ? { ...m, content: editingText.trim(), is_edited: true }
            : m,
        ),
      );
      cancelEdit();
    } catch {
      Alert.alert("Modification", "Impossible de modifier ce message.");
    }
    setOpInProgress(false);
  };

  const confirmDelete = (messageId: number) => {
    Alert.alert("Supprimer", "Supprimer ce message ?", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Supprimer",
        style: "destructive",
        onPress: async () => {
          setOpInProgress(true);
          try {
            await deleteMessage(messageId);
            setMessages((prev) => prev.filter((m) => m.id !== messageId));
          } catch {
            Alert.alert("Suppression", "Impossible de supprimer ce message.");
          }
          setOpInProgress(false);
        },
      },
    ]);
  };

  const latestOwnMessageRead = useMemo(() => {
    const mine = messages.find((m) => m.sender_id === user?.id);
    return Boolean(mine?.is_read);
  }, [messages, user?.id]);

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#7c3aed" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={90}
    >
      <Stack.Screen
        options={{ title: name || "Chat", headerBackTitle: "Retour" }}
      />

      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          value={searchText}
          onChangeText={setSearchText}
          placeholder="Rechercher dans la conversation"
          placeholderTextColor="#666"
          returnKeyType="search"
          onSubmitEditing={handleSearchMessages}
        />
        <TouchableOpacity style={styles.iconBtn} onPress={handleSearchMessages}>
          {searching ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="search" size={18} color="#fff" />
          )}
        </TouchableOpacity>
        {searchMode && (
          <TouchableOpacity
            style={styles.iconBtnSecondary}
            onPress={() => {
              setSearchText("");
              setSearchMode(false);
              loadMessages();
            }}
          >
            <Ionicons name="close" size={18} color="#9ca3af" />
          </TouchableOpacity>
        )}
      </View>

      {typingActive && (
        <View style={styles.typingWrap}>
          <Text style={styles.typingText}>
            {name || "Utilisateur"} est en train d'ecrire...
          </Text>
        </View>
      )}

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id.toString()}
        inverted
        contentContainerStyle={styles.messagesList}
        renderItem={({ item }) => {
          const isMe = item.sender_id === user?.id;
          return (
            <TouchableOpacity
              activeOpacity={0.9}
              onLongPress={() => {
                if (!isMe || item.pending) return;
                Alert.alert("Message", "Choisis une action", [
                  { text: "Annuler", style: "cancel" },
                  { text: "Modifier", onPress: () => startEdit(item) },
                  {
                    text: "Supprimer",
                    style: "destructive",
                    onPress: () => confirmDelete(item.id),
                  },
                ]);
              }}
              style={[
                styles.bubble,
                isMe ? styles.bubbleMe : styles.bubbleOther,
              ]}
            >
              <Text style={[styles.msgText, isMe && styles.msgTextMe]}>
                {item.content}
              </Text>
              {!!item.image_url && (
                <Image
                  source={{ uri: item.image_url }}
                  style={styles.msgImage}
                />
              )}
              {item.is_edited && <Text style={styles.edited}>modifie</Text>}
              <Text style={styles.msgTime}>{formatTime(item.created_at)}</Text>

              {isMe && (
                <Text style={styles.deliveryState}>
                  {item.pending
                    ? "Envoi..."
                    : item.failed
                      ? "Erreur"
                      : item.is_read
                        ? "Lu"
                        : "Envoye"}
                </Text>
              )}
            </TouchableOpacity>
          );
        }}
      />

      {messages.length > 0 && (
        <View style={styles.readReceiptRow}>
          <Ionicons
            name={latestOwnMessageRead ? "checkmark-done" : "checkmark"}
            size={14}
            color={latestOwnMessageRead ? "#7c3aed" : "#777"}
          />
          <Text style={styles.readReceiptText}>
            {latestOwnMessageRead
              ? "Dernier message lu"
              : "Dernier message envoye"}
          </Text>
        </View>
      )}

      {editingMessageId && (
        <View style={styles.editRow}>
          <TextInput
            style={styles.editInput}
            value={editingText}
            onChangeText={setEditingText}
            placeholder="Modifier le message"
            placeholderTextColor="#666"
          />
          <TouchableOpacity
            style={styles.editAction}
            onPress={saveEdit}
            disabled={opInProgress}
          >
            <Ionicons name="checkmark" size={18} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.editActionGhost} onPress={cancelEdit}>
            <Ionicons name="close" size={18} color="#9ca3af" />
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.inputRow}>
        <TouchableOpacity
          style={styles.attachBtn}
          onPress={handleSendImage}
          disabled={sending || !isValidReceiverId}
        >
          <Ionicons
            name="image"
            size={20}
            color={sending || !isValidReceiverId ? "#666" : "#fff"}
          />
        </TouchableOpacity>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={onTypingChange}
          placeholder="Message..."
          placeholderTextColor="#666"
          multiline
          maxLength={2000}
        />
        <TouchableOpacity
          style={[styles.sendBtn, !text.trim() && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!text.trim() || sending}
        >
          <Ionicons
            name="send"
            size={20}
            color={text.trim() ? "#fff" : "#666"}
          />
        </TouchableOpacity>
      </View>

      <OMPaymentModal
        visible={showPayment}
        onClose={() => setShowPayment(false)}
        onSuccess={() => {
          setShowPayment(false);
          // Re-send after payment
          if (text.trim()) {
            sendMessage({ receiver_id: otherUserId, content: text.trim() })
              .then((res) => {
                if (res) {
                  const sent = res as unknown as Message;
                  setMessages((prev) => [
                    {
                      id: sent.id || Date.now(),
                      content: text.trim(),
                      sender_id: user?.id || 0,
                      created_at: new Date().toISOString(),
                    },
                    ...prev,
                  ]);
                  setText("");
                }
              })
              .catch(() => {});
          }
        }}
        title="Mise en relation"
        description={`Pour discuter avec ${name || "cet utilisateur"}, un paiement unique de 250 FCFA est requis.`}
        amount={250}
        initiatePayment={() => initiateConnectionPayment(otherUserId)}
        confirmPayment={(paymentId, phone, otp) =>
          confirmConnectionPayment(paymentId, phone, otp)
        }
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a0a" },
  center: {
    flex: 1,
    backgroundColor: "#0a0a0a",
    justifyContent: "center",
    alignItems: "center",
  },
  messagesList: { paddingHorizontal: 12, paddingVertical: 8 },
  bubble: {
    maxWidth: "80%",
    padding: 12,
    borderRadius: 16,
    marginVertical: 2,
  },
  bubbleMe: {
    backgroundColor: "#7c3aed",
    alignSelf: "flex-end",
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: "#1a1a1a",
    alignSelf: "flex-start",
    borderBottomLeftRadius: 4,
  },
  msgText: { color: "#ccc", fontSize: 15, lineHeight: 20 },
  msgTextMe: { color: "#fff" },
  msgImage: {
    width: 190,
    height: 190,
    borderRadius: 12,
    marginTop: 8,
    backgroundColor: "#0f0f0f",
  },
  msgTime: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 11,
    marginTop: 4,
    alignSelf: "flex-end",
  },
  edited: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 10,
    marginTop: 2,
  },
  deliveryState: {
    color: "rgba(255,255,255,0.62)",
    fontSize: 10,
    marginTop: 2,
    alignSelf: "flex-end",
  },
  typingWrap: {
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  typingText: {
    color: "#9ca3af",
    fontSize: 12,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 6,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    backgroundColor: "#1a1a1a",
    borderRadius: 10,
    color: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#7c3aed",
    justifyContent: "center",
    alignItems: "center",
  },
  iconBtnSecondary: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#1a1a1a",
    justifyContent: "center",
    alignItems: "center",
  },
  readReceiptRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingBottom: 6,
  },
  readReceiptText: {
    color: "#9ca3af",
    fontSize: 11,
  },
  editRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingBottom: 8,
    gap: 8,
  },
  editInput: {
    flex: 1,
    backgroundColor: "#111827",
    borderRadius: 10,
    color: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  editAction: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#7c3aed",
    justifyContent: "center",
    alignItems: "center",
  },
  editActionGhost: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#1a1a1a",
    justifyContent: "center",
    alignItems: "center",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "#1a1a1a",
    backgroundColor: "#0a0a0a",
  },
  attachBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#1a1a1a",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  input: {
    flex: 1,
    backgroundColor: "#1a1a1a",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: "#fff",
    fontSize: 15,
    maxHeight: 100,
    marginRight: 8,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#7c3aed",
    justifyContent: "center",
    alignItems: "center",
  },
  sendBtnDisabled: { backgroundColor: "#1a1a1a" },
});
