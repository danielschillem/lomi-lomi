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
  Linking,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { useLocalSearchParams, Stack, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  getMessages,
  sendMessage,
  uploadMessageImage,
  markConversationRead,
  editMessage,
  deleteMessage,
  searchMessages,
  startCall as createCall,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
import { useWS } from "@/lib/ws-context";

interface Message {
  id: number;
  content: string;
  image_url?: string;
  audio_url?: string;
  call_type?: "audio" | "video";
  call_room?: string;
  latitude?: number;
  longitude?: number;
  sender_id: number;
  created_at: string;
  is_read?: boolean;
  is_edited?: boolean;
  pending?: boolean;
  failed?: boolean;
}

export default function ChatScreen() {
  const { id, name, recipientId, isGroup } = useLocalSearchParams<{
    id: string;
    name: string;
    recipientId: string;
    isGroup?: string;
  }>();
  const { user } = useAuth();
  const { colors } = useTheme();
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
  const [opInProgress, setOpInProgress] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingSendRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const conversationId = parseInt(id || "0", 10);
  const otherUserId = parseInt(recipientId || "0", 10);
  const isValidConversationId = Number.isFinite(conversationId) && conversationId > 0;
  const isValidReceiverId = Number.isFinite(otherUserId) && otherUserId > 0;
  const isGroupChat = isGroup === "1" || isGroup === "true";
  const canSendMessage = isValidConversationId && (isValidReceiverId || isGroupChat);
  const canCall = isValidReceiverId && !isGroupChat;

  const buildMessagePayload = (extra: {
    content?: string;
    image_url?: string;
    audio_url?: string;
    call_type?: "audio" | "video";
    call_room?: string;
    latitude?: number;
    longitude?: number;
  }) => ({
    conversation_id: conversationId,
    receiver_id: isValidReceiverId ? otherUserId : undefined,
    ...extra,
  });

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
        next[existingIndex] = { ...next[existingIndex], ...incoming, pending: false, failed: false };
        return next;
      }
      return [incoming, ...prev];
    });
  };

  useEffect(() => {
    const unsub = onMessage((msg) => {
      const data = normalizeEventData(msg as unknown as Record<string, unknown>);

      if (msg.type === "message") {
        const eventConvID = Number(data.conversation_id || 0);
        if (eventConvID !== conversationId) return;
        const incoming: Message = {
          id: Number(data.id || Date.now()),
          content: String(data.content || ""),
          image_url: data.image_url ? String(data.image_url) : undefined,
          audio_url: data.audio_url ? String(data.audio_url) : undefined,
          call_type: data.call_type ? (String(data.call_type) as "audio" | "video") : undefined,
          call_room: data.call_room ? String(data.call_room) : undefined,
          latitude: typeof data.latitude === "number" ? (data.latitude as number) : undefined,
          longitude: typeof data.longitude === "number" ? (data.longitude as number) : undefined,
          sender_id: Number(data.sender_id || 0),
          created_at: String(data.created_at || new Date().toISOString()),
          is_read: Boolean(data.is_read),
          is_edited: Boolean(data.is_edited),
        };
        upsertMessage(incoming);
        if (incoming.sender_id !== user?.id) markConversationRead(conversationId).catch(() => {});
      }

      if (msg.type === "read_receipt") {
        const eventConvID = Number(data.conversation_id || 0);
        const messageID = Number(data.message_id || 0);
        if (eventConvID !== conversationId || messageID <= 0) return;
        setMessages((prev) => prev.map((m) => (m.id === messageID ? { ...m, is_read: true } : m)));
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
              ? { ...m, content: String(data.content || m.content), is_edited: Boolean(data.is_edited) }
              : m,
          ),
        );
      }

      if (msg.type === "typing") {
        const fromUser = Number(data.from_user_id || 0);
        if (!fromUser || fromUser !== otherUserId) return;
        setTypingActive(true);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => setTypingActive(false), 2500);
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
      const rows = Array.isArray(res.messages) ? (res.messages as unknown as Message[]) : [];
      setMessages(rows);
      setSearchMode(true);
    } catch {
      Alert.alert("Recherche", "Impossible de rechercher les messages.");
    }
    setSearching(false);
  };

  const handleSend = async () => {
    if (!text.trim() || sending || !canSendMessage) return;
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
      const res = await sendMessage(buildMessagePayload({ content }));
      if (res) {
        const sent = res as unknown as Message;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempId
              ? { ...m, id: sent.id || Date.now(), created_at: sent.created_at || m.created_at, pending: false, failed: false }
              : m,
          ),
        );
      }
    } catch (err) {
      setMessages((prev) => prev.map((m) => m.id === tempId ? { ...m, pending: false, failed: true } : m));
    }
    setSending(false);
  };

  const sendImageFromUri = async (uri: string) => {
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
      const res = await sendMessage(
        buildMessagePayload({ content: text.trim() || " ", image_url: imageUrl }),
      );
      const sent = res as unknown as Message;
      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempId
            ? { ...m, id: sent.id || Date.now(), content: sent.content || m.content, image_url: imageUrl, created_at: sent.created_at || m.created_at, pending: false, failed: false }
            : m,
        ),
      );
      setText("");
    } catch {
      setMessages((prev) => prev.map((m) => m.id === tempId ? { ...m, pending: false, failed: true } : m));
      Alert.alert("Photo", "Impossible d'envoyer cette image.");
    }
    setSending(false);
  };

  const handleSendImage = async () => {
    if (sending || !canSendMessage) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== "granted") {
      Alert.alert("Photo", "Autorise l'accès à la galerie pour envoyer une image.");
      return;
    }
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: false,
    });
    if (picked.canceled || !picked.assets?.length) return;
    await sendImageFromUri(picked.assets[0].uri);
  };

  const handleTakePhoto = async () => {
    if (sending || !canSendMessage) return;
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (perm.status !== "granted") {
      Alert.alert("Caméra", "Autorise l'accès à la caméra pour prendre une photo.");
      return;
    }
    const picked = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: false,
    });
    if (picked.canceled || !picked.assets?.length) return;
    await sendImageFromUri(picked.assets[0].uri);
  };

  const shareLocation = async () => {
    if (!canSendMessage || sending) return;
    const perm = await Location.requestForegroundPermissionsAsync();
    if (perm.status !== "granted") {
      Alert.alert("Position", "Autorise la localisation pour partager ta position.");
      return;
    }
    const loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    try {
      const res = await sendMessage(
        buildMessagePayload({
          content: "Position partagée",
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        }),
      );
      if (res) {
        const sent = res as unknown as Message;
        setMessages((prev) => [sent, ...prev]);
      }
    } catch {
      Alert.alert("Position", "Impossible de partager la position.");
    }
  };

  const startCall = async (type: "audio" | "video") => {
    if (!canCall || sending) return;
    try {
      const call = await createCall({
        conversation_id: conversationId,
        receiver_id: otherUserId,
        call_type: type,
      });
      router.push({
        pathname: "/call",
        params: { room: call.room, callType: type, callId: String(call.id) },
      });
    } catch {
      try {
        const room = `textme-${conversationId}-${Date.now()}`;
        const res = await sendMessage(
          buildMessagePayload({
            content:
              type === "video"
                ? "Invitation appel vidéo"
                : "Invitation appel audio",
            call_type: type,
            call_room: room,
          }),
        );
        if (res) {
          const sent = res as unknown as Message;
          setMessages((prev) => [sent, ...prev]);
        }
        router.push({
          pathname: "/call",
          params: { room, callType: type },
        });
      } catch {
        Alert.alert("Appel", "Impossible de démarrer l'appel.");
      }
    }
  };

  const onTypingChange = (value: string) => {
    setText(value);
    if (!isValidReceiverId || isGroupChat || !value.trim()) return;
    if (!typingSendRef.current) {
      wsSend({ type: "typing", data: { to_user_id: otherUserId } });
      typingSendRef.current = setTimeout(() => { typingSendRef.current = null; }, 1500);
    }
  };

  const startEdit = (msg: Message) => {
    if (msg.sender_id !== user?.id) return;
    setEditingMessageId(msg.id);
    setEditingText(msg.content || "");
  };

  const cancelEdit = () => { setEditingMessageId(null); setEditingText(""); };

  const saveEdit = async () => {
    if (!editingMessageId || !editingText.trim()) return;
    setOpInProgress(true);
    try {
      await editMessage(editingMessageId, editingText.trim());
      setMessages((prev) =>
        prev.map((m) => m.id === editingMessageId ? { ...m, content: editingText.trim(), is_edited: true } : m),
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
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={90}
    >
      <Stack.Screen options={{ title: name || "Chat", headerBackTitle: "Retour" }} />

      <View style={styles.searchRow}>
        <TouchableOpacity
          style={[styles.iconBtn, { backgroundColor: colors.cardSecondary }]}
          onPress={() => startCall("audio")}
          disabled={sending || !canCall}
        >
          <Ionicons name="call-outline" size={18} color={sending || !canCall ? colors.textMuted : colors.text} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.iconBtn, { backgroundColor: colors.cardSecondary }]}
          onPress={() => startCall("video")}
          disabled={sending || !canCall}
        >
          <Ionicons name="videocam-outline" size={18} color={sending || !canCall ? colors.textMuted : colors.text} />
        </TouchableOpacity>
        <TextInput
          style={[styles.searchInput, { backgroundColor: colors.inputBg, color: colors.inputText }]}
          value={searchText}
          onChangeText={setSearchText}
          placeholder="Rechercher dans la conversation"
          placeholderTextColor={colors.placeholder}
          returnKeyType="search"
          onSubmitEditing={handleSearchMessages}
        />
        <TouchableOpacity style={[styles.iconBtn, { backgroundColor: colors.accent }]} onPress={handleSearchMessages}>
          {searching ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="search" size={18} color="#fff" />
          )}
        </TouchableOpacity>
        {searchMode && (
          <TouchableOpacity
            style={[styles.iconBtn, { backgroundColor: colors.cardSecondary }]}
            onPress={() => { setSearchText(""); setSearchMode(false); loadMessages(); }}
          >
            <Ionicons name="close" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {typingActive && (
        <View style={styles.typingWrap}>
          <Text style={[styles.typingText, { color: colors.textMuted }]}>
            {name || "Utilisateur"} est en train d&apos;écrire...
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
                  { text: "Supprimer", style: "destructive", onPress: () => confirmDelete(item.id) },
                ]);
              }}
              style={[
                styles.bubble,
                isMe
                  ? styles.bubbleMe
                  : [styles.bubbleOther, { backgroundColor: colors.cardSecondary }],
              ]}
            >
              <Text style={[styles.msgText, { color: isMe ? "#fff" : colors.text }]}>
                {item.content}
              </Text>
              {!!item.image_url && (
                <Image source={{ uri: item.image_url }} style={styles.msgImage} />
              )}
              {!!item.audio_url && (
                <TouchableOpacity
                  style={[styles.inlineAction, { backgroundColor: isMe ? "rgba(255,255,255,0.22)" : colors.border }]}
                  onPress={() => Linking.openURL(item.audio_url as string)}
                >
                  <Ionicons name="play-circle-outline" size={16} color={isMe ? "#fff" : colors.text} />
                  <Text style={{ color: isMe ? "#fff" : colors.text, fontSize: 12 }}>Lire la note vocale</Text>
                </TouchableOpacity>
              )}
              {!!item.call_type && !!item.call_room && (
                <TouchableOpacity
                  style={[styles.inlineAction, { backgroundColor: isMe ? "rgba(255,255,255,0.22)" : colors.border }]}
                  onPress={() =>
                    router.push({
                      pathname: "/call",
                      params: { room: item.call_room, callType: item.call_type },
                    })
                  }
                >
                  <Ionicons
                    name={item.call_type === "video" ? "videocam-outline" : "call-outline"}
                    size={16}
                    color={isMe ? "#fff" : colors.text}
                  />
                  <Text style={{ color: isMe ? "#fff" : colors.text, fontSize: 12 }}>
                    Rejoindre l&apos;appel
                  </Text>
                </TouchableOpacity>
              )}
              {typeof item.latitude === "number" && typeof item.longitude === "number" && (
                <TouchableOpacity
                  style={[styles.inlineAction, { backgroundColor: isMe ? "rgba(255,255,255,0.22)" : colors.border }]}
                  onPress={() => Linking.openURL(`https://www.google.com/maps?q=${item.latitude},${item.longitude}`)}
                >
                  <Ionicons name="location-outline" size={16} color={isMe ? "#fff" : colors.text} />
                  <Text style={{ color: isMe ? "#fff" : colors.text, fontSize: 12 }}>Voir la position</Text>
                </TouchableOpacity>
              )}
              {item.is_edited && (
                <Text style={[styles.edited, { color: isMe ? "rgba(255,255,255,0.5)" : colors.textMuted }]}>
                  modifié
                </Text>
              )}
              <Text style={[styles.msgTime, { color: isMe ? "rgba(255,255,255,0.5)" : colors.textMuted }]}>
                {formatTime(item.created_at)}
              </Text>
              {isMe && (
                <Text style={[styles.deliveryState, { color: "rgba(255,255,255,0.62)" }]}>
                  {item.pending ? "Envoi..." : item.failed ? "Erreur" : item.is_read ? "Lu" : "Envoyé"}
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
            color={latestOwnMessageRead ? colors.accent : colors.textMuted}
          />
          <Text style={[styles.readReceiptText, { color: colors.textMuted }]}>
            {latestOwnMessageRead ? "Dernier message lu" : "Dernier message envoyé"}
          </Text>
        </View>
      )}

      {editingMessageId && (
        <View style={styles.editRow}>
          <TextInput
            style={[styles.editInput, { backgroundColor: colors.inputBg, color: colors.inputText }]}
            value={editingText}
            onChangeText={setEditingText}
            placeholder="Modifier le message"
            placeholderTextColor={colors.placeholder}
          />
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.accent }]}
            onPress={saveEdit}
            disabled={opInProgress}
          >
            <Ionicons name="checkmark" size={18} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.cardSecondary }]}
            onPress={cancelEdit}
          >
            <Ionicons name="close" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      )}

      <View style={[styles.inputRow, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: colors.cardSecondary, marginRight: 8 }]}
          onPress={handleTakePhoto}
          disabled={sending || !canSendMessage}
        >
          <Ionicons name="camera-outline" size={20} color={sending || !canSendMessage ? colors.textMuted : colors.text} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: colors.cardSecondary, marginRight: 8 }]}
          onPress={handleSendImage}
          disabled={sending || !canSendMessage}
        >
          <Ionicons name="image" size={20} color={sending || !canSendMessage ? colors.textMuted : colors.text} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: colors.cardSecondary, marginRight: 8 }]}
          onPress={shareLocation}
          disabled={sending || !canSendMessage}
        >
          <Ionicons name="location-outline" size={20} color={sending || !canSendMessage ? colors.textMuted : colors.text} />
        </TouchableOpacity>
        <TextInput
          style={[styles.input, { backgroundColor: colors.inputBg, color: colors.inputText, marginRight: 8 }]}
          value={text}
          onChangeText={onTypingChange}
          placeholder="Message..."
          placeholderTextColor={colors.placeholder}
          multiline
          maxLength={2000}
        />
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: text.trim() && canSendMessage ? colors.accent : colors.cardSecondary }]}
          onPress={handleSend}
          disabled={!text.trim() || sending || !canSendMessage}
        >
          <Ionicons name="send" size={20} color={text.trim() && canSendMessage ? "#fff" : colors.textMuted} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  messagesList: { paddingHorizontal: 12, paddingVertical: 8 },
  bubble: { maxWidth: "80%", padding: 12, borderRadius: 16, marginVertical: 2 },
  bubbleMe: { backgroundColor: "#2563eb", alignSelf: "flex-end", borderBottomRightRadius: 4 },
  bubbleOther: { alignSelf: "flex-start", borderBottomLeftRadius: 4 },
  msgText: { fontSize: 15, lineHeight: 20 },
  msgImage: { width: 190, height: 190, borderRadius: 12, marginTop: 8 },
  inlineAction: {
    marginTop: 8,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
  },
  msgTime: { fontSize: 11, marginTop: 4, alignSelf: "flex-end" },
  edited: { fontSize: 10, marginTop: 2 },
  deliveryState: { fontSize: 10, marginTop: 2, alignSelf: "flex-end" },
  typingWrap: { paddingHorizontal: 16, paddingBottom: 4 },
  typingText: { fontSize: 12 },
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
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
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
  readReceiptText: { fontSize: 11 },
  editRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingBottom: 8,
    gap: 8,
  },
  editInput: {
    flex: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  actionBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
  },
});
