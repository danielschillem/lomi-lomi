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
import { useFocusEffect } from "@react-navigation/native";
import { getConversations } from "@/lib/api";
import ScreenState from "@/app/components/ScreenState";

interface Conversation {
  id: number;
  other_user?: {
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
  const PAGE_SIZE = 20;
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await getConversations();
      const rows = Array.isArray(res) ? (res as unknown as Conversation[]) : [];
      setConversations(rows);
      setVisibleCount(PAGE_SIZE);
      setError(null);
    } catch (err) {
      setConversations([]);
      setError((err as Error)?.message || "Impossible de charger les conversations");
    }
    setLoading(false);
    setRefreshing(false);
  }, [PAGE_SIZE]);

  useEffect(() => {
    load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    setError(null);
    load();
  };

  const loadMore = () => {
    if (visibleCount >= conversations.length) return;
    setVisibleCount((prev) => prev + PAGE_SIZE);
  };

  const getSafeUser = (conversation: Conversation) => {
    if (conversation.other_user) return conversation.other_user;
    return {
      id: 0,
      username: "Utilisateur",
      avatar_url: "",
      is_online: false,
    };
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
      <ScreenState mode="loading" title="Chargement..." subtitle="Récupération des conversations" />
    );
  }

  if (error && conversations.length === 0) {
    return (
      <ScreenState
        mode="error"
        title="Erreur de chargement"
        subtitle={error}
        buttonLabel="Réessayer"
        onPressButton={() => {
          setLoading(true);
          load();
        }}
      />
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={conversations.slice(0, visibleCount)}
        keyExtractor={(item) => item.id.toString()}
        ListEmptyComponent={
          <ScreenState
            mode="empty"
            title="Pas encore de conversations"
            subtitle="Commence par liker des profils !"
          />
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#7c3aed"
          />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        ListFooterComponent={
          visibleCount < conversations.length ? (
            <View style={styles.footer}>
              <ActivityIndicator size="small" color="#7c3aed" />
            </View>
          ) : null
        }
        renderItem={({ item }) => {
          const otherUser = getSafeUser(item);
          const canOpenChat = Boolean(item.other_user?.id);

          return (
            <TouchableOpacity
              style={[styles.row, !canOpenChat && styles.rowDisabled]}
              disabled={!canOpenChat}
              onPress={() =>
                router.push({
                  pathname: "/chat/[id]",
                  params: {
                    id: item.id,
                    name: otherUser.username,
                    recipientId: otherUser.id,
                  },
                })
              }
            >
              <View style={styles.avatarWrap}>
                <Image
                  source={{
                    uri:
                      otherUser.avatar_url ||
                      "https://via.placeholder.com/48/1a1a1a/666?text=?",
                  }}
                  style={styles.avatar}
                />
                {otherUser.is_online && <View style={styles.onlineDot} />}
              </View>
              <View style={styles.textWrap}>
                <View style={styles.topRow}>
                  <Text style={styles.name}>{otherUser.username}</Text>
                  {item.last_message && (
                    <Text style={styles.time}>
                      {timeAgo(item.last_message.created_at)}
                    </Text>
                  )}
                </View>
                <View style={styles.bottomRow}>
                  <Text style={styles.lastMsg} numberOfLines={1}>
                    {item.last_message?.content ||
                      "Nouveau match ! Dis bonjour "}
                  </Text>
                  {item.unread_count > 0 && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{item.unread_count}</Text>
                    </View>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a0a" },
  footer: {
    paddingVertical: 14,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#1a1a1a",
  },
  rowDisabled: {
    opacity: 0.7,
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
