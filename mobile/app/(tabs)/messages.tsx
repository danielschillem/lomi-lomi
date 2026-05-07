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
  TextInput,
} from "react-native";
import { router } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { getConversations } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
import {
  ConversationListItem,
  getConversationLastMessageContent,
  getConversationLastMessageDate,
  getConversationOtherUser,
  getConversationRecipientId,
} from "@/lib/conversations";
import ScreenState from "@/app/components/ScreenState";

export default function MessagesScreen() {
  const PAGE_SIZE = 20;
  const { user } = useAuth();
  const { colors } = useTheme();
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "unread" | "online">("all");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await getConversations();
      const rows = Array.isArray(res)
        ? (res as unknown as ConversationListItem[])
        : [];
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

  const timeAgo = (dateStr: string) => {
    const timestamp = new Date(dateStr).getTime();
    if (!Number.isFinite(timestamp)) return "";
    const diff = Date.now() - timestamp;
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

  const unreadCount = conversations.filter((c) => (c.unread_count || 0) > 0).length;
  const filtered = conversations.filter((item) => {
    const other = getConversationOtherUser(item, user?.id);
    const name = (other.username || "").toLowerCase();
    const msg = getConversationLastMessageContent(item).toLowerCase();
    const q = search.trim().toLowerCase();
    const matchesSearch = !q || name.includes(q) || msg.includes(q);
    if (!matchesSearch) return false;
    if (filter === "unread") return (item.unread_count || 0) > 0;
    if (filter === "online") return !!other.is_online;
    return true;
  });

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Discussions</Text>
        <View style={[styles.searchWrap, { backgroundColor: colors.cardSecondary }]}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Rechercher..."
            placeholderTextColor={colors.placeholder}
            style={[styles.searchInput, { color: colors.inputText }]}
          />
        </View>
        <View style={styles.filtersRow}>
          {[
            { key: "all", label: "Toutes" },
            { key: "unread", label: `Non lues ${unreadCount}` },
            { key: "online", label: "En ligne" },
          ].map((opt) => {
            const active = filter === (opt.key as "all" | "unread" | "online");
            return (
              <TouchableOpacity
                key={opt.key}
                onPress={() => setFilter(opt.key as "all" | "unread" | "online")}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: active ? colors.accent : colors.background,
                    borderColor: active ? colors.accent : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    { color: active ? "#fff" : colors.textSecondary },
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
      <FlatList
        data={filtered.slice(0, visibleCount)}
        keyExtractor={(item) => item.id.toString()}
        ListEmptyComponent={
          <ScreenState
            mode="empty"
            title="Aucune conversation"
            subtitle="Aucun résultat pour ce filtre."
          />
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent}
          />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        ListFooterComponent={
          visibleCount < conversations.length ? (
            <View style={styles.footer}>
              <ActivityIndicator size="small" color={colors.accent} />
            </View>
          ) : null
        }
        renderItem={({ item }) => {
          const otherUser = getConversationOtherUser(item, user?.id);
          const recipientId = getConversationRecipientId(item, user?.id);
          const messageDate = getConversationLastMessageDate(item);
          const messageTime = messageDate ? timeAgo(messageDate) : "";
          const lastMessage = getConversationLastMessageContent(item);
          const canOpenChat =
            Number.isFinite(Number(item.id)) && Number(item.id) > 0;

          return (
            <TouchableOpacity
              style={[
                styles.row,
                { borderBottomColor: colors.border },
                !canOpenChat && styles.rowDisabled,
              ]}
              disabled={!canOpenChat}
              onPress={() =>
                router.push({
                  pathname: "/chat/[id]",
                  params: {
                    id: String(item.id),
                    name: otherUser.username,
                    recipientId: String(recipientId),
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
                  style={[styles.avatar, { backgroundColor: colors.cardSecondary }]}
                />
                {otherUser.is_online && (
                  <View style={[styles.onlineDot, { borderColor: colors.background }]} />
                )}
              </View>
              <View style={styles.textWrap}>
                <View style={styles.topRow}>
                  <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
                    {otherUser.username}
                  </Text>
                  {!!messageTime && (
                    <Text style={[styles.time, { color: colors.textMuted }]}>
                      {messageTime}
                    </Text>
                  )}
                </View>
                <View style={styles.bottomRow}>
                  <Text style={[styles.lastMsg, { color: colors.textSecondary }]} numberOfLines={1}>
                    {lastMessage || "Nouveau match ! Dis bonjour "}
                  </Text>
                  {(item.unread_count || 0) > 0 && (
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
  header: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    gap: 10,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: "800",
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 24,
    paddingHorizontal: 14,
    height: 48,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  filtersRow: {
    flexDirection: "row",
    gap: 8,
  },
  filterChip: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: "600",
  },
  footer: { paddingVertical: 14 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  rowDisabled: { opacity: 0.7 },
  avatarWrap: { position: "relative" },
  avatar: { width: 52, height: 52, borderRadius: 26 },
  onlineDot: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#22c55e",
    borderWidth: 2,
  },
  textWrap: { flex: 1, marginLeft: 10 },
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
  name: { fontSize: 15, fontWeight: "700", flex: 1, marginRight: 8 },
  time: { fontSize: 12 },
  lastMsg: { fontSize: 14, flex: 1, marginRight: 8 },
  badge: {
    backgroundColor: "#2563eb",
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
  },
  badgeText: { color: "#fff", fontSize: 12, fontWeight: "bold" },
});
