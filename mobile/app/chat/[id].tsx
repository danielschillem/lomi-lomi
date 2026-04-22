import { useEffect, useState, useRef } from "react";
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
} from "react-native";
import { useLocalSearchParams, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getMessages, sendMessage, markConversationRead } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useWS } from "@/lib/ws-context";

interface Message {
  id: number;
  content: string;
  sender_id: number;
  created_at: string;
}

export default function ChatScreen() {
  const { id, name, recipientId } = useLocalSearchParams<{
    id: string;
    name: string;
    recipientId: string;
  }>();
  const { user } = useAuth();
  const { onMessage } = useWS();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const conversationId = parseInt(id || "0", 10);
  const otherUserId = parseInt(recipientId || "0", 10);

  useEffect(() => {
    loadMessages();
    markConversationRead(conversationId).catch(() => {});
  }, [conversationId]);

  // Listen for real-time messages via WebSocket
  useEffect(() => {
    const unsub = onMessage((msg) => {
      if (
        msg.type === "new_message" &&
        msg.conversation_id === conversationId
      ) {
        const newMsg = msg as unknown as { message: Message };
        if (newMsg.message) {
          setMessages((prev) => [newMsg.message, ...prev]);
        } else {
          // Fallback: reload
          loadMessages();
        }
        markConversationRead(conversationId).catch(() => {});
      }
    });
    return unsub;
  }, [conversationId, onMessage]);

  const loadMessages = async () => {
    try {
      const res = await getMessages(conversationId);
      setMessages((res as unknown as Message[]).reverse());
    } catch {
      /* empty */
    }
    setLoading(false);
  };

  const handleSend = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      const res = await sendMessage({
        receiver_id: otherUserId,
        content: text.trim(),
      });
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
    } catch {
      /* empty */
    }
    setSending(false);
  };

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

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id.toString()}
        inverted
        contentContainerStyle={styles.messagesList}
        renderItem={({ item }) => {
          const isMe = item.sender_id === user?.id;
          return (
            <View
              style={[
                styles.bubble,
                isMe ? styles.bubbleMe : styles.bubbleOther,
              ]}
            >
              <Text style={[styles.msgText, isMe && styles.msgTextMe]}>
                {item.content}
              </Text>
              <Text style={styles.msgTime}>{formatTime(item.created_at)}</Text>
            </View>
          );
        }}
      />

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
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
  msgTime: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 11,
    marginTop: 4,
    alignSelf: "flex-end",
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
