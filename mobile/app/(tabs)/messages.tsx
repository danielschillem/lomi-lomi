import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getConversations } from "@/lib/api";

interface Conversation {
  id: number;
  other_user: {
    id: number;
    username: string;
    avatar_url: string;
    is_online: boolean;
  };
  last_message?: {
    content: string;
    created_at: string;
    sender_id: number;
  };
  unread_count: number;
}

export default function MessagesScreen() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await getConversations();
      setConversations(
        Array.isArray(res) ? (res as unknown as Conversation[]) : [],
      );
    } catch {
      setConversations([]);
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "à l'instant";
    if (mins < 60) return `${mins}min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}j`;
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#7c3aed" />
      </View>
    );
  }

  if (conversations.length === 0) {
    return (
      <View style={styles.center}>
        <Ionicons name="chatbubble-outline" size={64} color="#333" />
        <Text style={styles.emptyText}>Pas encore de conversations</Text>
        <Text style={styles.emptySubtext}>
          Commence par liker des profils !
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#7c3aed"
          />
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.row}
            onPress={() =>
              router.push({
                pathname: "/chat/[id]",
                params: {
                  id: item.id,
                  name: item.other_user.username,
                  recipientId: item.other_user.id,
                },
              })
            }
          >
            <View style={styles.avatarWrap}>
              <Image
                source={{
                  uri:
                    item.other_user.avatar_url ||
                    "https://via.placeholder.com/48/1a1a1a/666?text=?",
                }}
                style={styles.avatar}
              />
              {item.other_user.is_online && <View style={styles.onlineDot} />}
            </View>
            <View style={styles.textWrap}>
              <View style={styles.topRow}>
                <Text style={styles.name}>{item.other_user.username}</Text>
                {item.last_message && (
                  <Text style={styles.time}>
                    {timeAgo(item.last_message.created_at)}
                  </Text>
                )}
              </View>
              <View style={styles.bottomRow}>
                <Text style={styles.lastMsg} numberOfLines={1}>
                  {item.last_message?.content ||
                    "Nouveau match ! Dis bonjour 👋"}
                </Text>
                {item.unread_count > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{item.unread_count}</Text>
                  </View>
                )}
              </View>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
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
  emptyText: { color: "#666", fontSize: 16, marginTop: 16 },
  emptySubtext: { color: "#444", fontSize: 14, marginTop: 4 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#1a1a1a",
  },
  avatarWrap: { position: "relative" },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#1a1a1a",
  },
  onlineDot: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#22c55e",
    borderWidth: 2,
    borderColor: "#0a0a0a",
  },
  textWrap: { flex: 1, marginLeft: 12 },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  name: { fontSize: 16, fontWeight: "600", color: "#fff" },
  time: { fontSize: 12, color: "#666" },
  lastMsg: { fontSize: 14, color: "#999", flex: 1, marginRight: 8 },
  badge: {
    backgroundColor: "#7c3aed",
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
  },
  badgeText: { color: "#fff", fontSize: 12, fontWeight: "bold" },
});
