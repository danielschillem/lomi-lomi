import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, router } from "expo-router";
import {
  getNotifications,
  markNotificationsRead,
  updateNotificationRead,
  updateNotificationsRead,
  deleteNotification,
  deleteNotifications,
} from "@/lib/api";
import ScreenState from "@/app/components/ScreenState";

interface AppNotification {
  id: number;
  type: string;
  title?: string;
  body?: string;
  content?: string;
  data?: string;
  is_read: boolean;
  created_at: string;
}

export default function NotificationsScreen() {
  const PAGE_SIZE = 20;
  const [notifs, setNotifs] = useState<AppNotification[]>([]);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await getNotifications(1, 100);
      const rows = Array.isArray(res) ? (res as unknown as AppNotification[]) : [];
      setNotifs(rows);
      setVisibleCount(PAGE_SIZE);
      setError(null);
    } catch (err) {
      setNotifs([]);
      setError((err as Error)?.message || "Impossible de charger les notifications");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [PAGE_SIZE]);

  useEffect(() => {
    load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    setSelectionMode(false);
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    setError(null);
    clearSelection();
    load();
  };

  const loadMore = () => {
    if (visibleCount >= notifs.length) return;
    setVisibleCount((prev) => prev + PAGE_SIZE);
  };

  const parseData = (item: AppNotification) => {
    try {
      return item.data ? (JSON.parse(item.data) as Record<string, unknown>) : {};
    } catch {
      return {};
    }
  };

  const navigateFromNotification = (item: AppNotification) => {
    const data = parseData(item);

    if (item.type === "message" && data.conversation_id) {
      router.push({
        pathname: "/chat/[id]",
        params: { id: String(data.conversation_id) },
      });
      return;
    }

    if ((item.type === "match" || item.type === "superlike") && (data.match_user_id || data.user_id)) {
      router.push({
        pathname: "/user/[id]",
        params: { id: String(data.match_user_id || data.user_id) },
      });
      return;
    }

    if ((item.type === "order" || item.type === "payment" || item.type === "delivery") && data.order_id) {
      router.push({
        pathname: "/order/[id]",
        params: { id: String(data.order_id) },
      });
      return;
    }

    if (item.type === "match") router.push("/(tabs)/matches");
    if (item.type === "message") router.push("/(tabs)/messages");
    if (item.type === "order" || item.type === "payment") router.push("/orders");
  };

  const markIds = async (ids: number[], isRead: boolean) => {
    if (ids.length === 0 || actionLoading) return;

    const previous = notifs;
    setActionLoading(true);
    setNotifs((prev) =>
      prev.map((n) => (ids.includes(n.id) ? { ...n, is_read: isRead } : n)),
    );

    try {
      if (ids.length === 1) {
        await updateNotificationRead(ids[0], isRead);
      } else {
        await updateNotificationsRead(ids, isRead);
      }
      clearSelection();
    } catch (err) {
      setNotifs(previous);
      Alert.alert("Erreur", (err as Error)?.message || "Action impossible");
    } finally {
      setActionLoading(false);
    }
  };

  const openNotification = async (item: AppNotification) => {
    if (selectionMode || selectedIds.size > 0) {
      toggleSelection(item.id);
      return;
    }

    if (!item.is_read) {
      await markIds([item.id], true);
    }
    navigateFromNotification(item);
  };

  const toggleSelection = (id: number) => {
    setSelectionMode(true);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAllVisible = () => {
    setSelectionMode(true);
    const visibleIds = notifs.slice(0, visibleCount).map((n) => n.id);
    setSelectedIds((prev) =>
      prev.size === visibleIds.length ? new Set() : new Set(visibleIds),
    );
  };

  const handleMarkAllRead = async () => {
    const unreadIds = notifs.filter((n) => !n.is_read).map((n) => n.id);
    if (unreadIds.length === 0 || actionLoading) return;

    const previous = notifs;
    setActionLoading(true);
    setNotifs((prev) => prev.map((n) => ({ ...n, is_read: true })));

    try {
      await markNotificationsRead();
    } catch (err) {
      setNotifs(previous);
      Alert.alert("Erreur", (err as Error)?.message || "Action impossible");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = (id: number) => {
    Alert.alert("Supprimer", "Supprimer cette notification ?", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Supprimer",
        style: "destructive",
        onPress: async () => {
          const previous = notifs;
          setNotifs((prev) => prev.filter((n) => n.id !== id));
          try {
            await deleteNotification(id);
          } catch (err) {
            setNotifs(previous);
            Alert.alert("Erreur", (err as Error)?.message || "Suppression impossible");
          }
        },
      },
    ]);
  };

  const handleBulkDelete = () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0 || actionLoading) return;

    Alert.alert("Supprimer", `Supprimer ${ids.length} notification(s) ?`, [
      { text: "Annuler", style: "cancel" },
      {
        text: "Supprimer",
        style: "destructive",
        onPress: async () => {
          const previous = notifs;
          setActionLoading(true);
          setNotifs((prev) => prev.filter((n) => !ids.includes(n.id)));
          try {
            await deleteNotifications(ids);
            clearSelection();
          } catch (err) {
            setNotifs(previous);
            Alert.alert("Erreur", (err as Error)?.message || "Suppression impossible");
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "match":
        return "heart" as const;
      case "like":
      case "superlike":
        return "heart-outline" as const;
      case "message":
        return "chatbubble" as const;
      case "order":
        return "bag" as const;
      case "payment":
        return "card" as const;
      case "delivery":
        return "bicycle" as const;
      default:
        return "notifications" as const;
    }
  };

  const notificationText = (item: AppNotification) =>
    item.body || item.content || item.title || "Notification";

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
    return <ScreenState mode="loading" title="Chargement..." subtitle="Récupération des notifications" />;
  }

  if (error && notifs.length === 0) {
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

  const unreadCount = notifs.filter((n) => !n.is_read).length;
  const selectedCount = selectedIds.size;
  const selected = Array.from(selectedIds);
  const isSelecting = selectionMode || selectedCount > 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>Notifications</Text>
          <Text style={styles.subtitle}>
            {isSelecting
              ? `${selectedCount} sélectionnée(s)`
              : `${unreadCount} non lue(s)`}
          </Text>
        </View>

        {isSelecting ? (
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.headerIconButton} onPress={selectAllVisible}>
              <Ionicons name="checkbox-outline" size={20} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.headerIconButton, selectedCount === 0 && styles.disabledButton]}
              disabled={selectedCount === 0 || actionLoading}
              onPress={() => markIds(selected, true)}
            >
              <Ionicons name="mail-open" size={20} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.headerIconButton, selectedCount === 0 && styles.disabledButton]}
              disabled={selectedCount === 0 || actionLoading}
              onPress={() => markIds(selected, false)}
            >
              <Ionicons name="mail-unread" size={20} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.headerIconButton, styles.dangerButton, selectedCount === 0 && styles.disabledButton]}
              disabled={selectedCount === 0 || actionLoading}
              onPress={handleBulkDelete}
            >
              <Ionicons name="trash" size={20} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerIconButton} onPress={clearSelection}>
              <Ionicons name="close" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[styles.headerButton, unreadCount === 0 && styles.disabledButton]}
              disabled={unreadCount === 0 || actionLoading}
              onPress={handleMarkAllRead}
            >
              <Ionicons name="checkmark-done" size={17} color="#fff" />
              <Text style={styles.headerButtonText}>Tout lu</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.headerIconButton, notifs.length === 0 && styles.disabledButton]}
              disabled={notifs.length === 0}
              onPress={() => setSelectionMode(true)}
            >
              <Ionicons name="checkbox" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      <FlatList
        data={notifs.slice(0, visibleCount)}
        keyExtractor={(item) => item.id.toString()}
        extraData={`${selectedCount}-${selectionMode}-${actionLoading}`}
        ListEmptyComponent={
          <ScreenState mode="empty" title="Aucune notification" subtitle="Tu es à jour pour le moment." />
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
          visibleCount < notifs.length ? (
            <View style={styles.footer}>
              <ActivityIndicator size="small" color="#7c3aed" />
            </View>
          ) : null
        }
        renderItem={({ item }) => {
          const checked = selectedIds.has(item.id);
          return (
            <TouchableOpacity
              style={[
                styles.row,
                !item.is_read && styles.unread,
                checked && styles.selected,
              ]}
              onPress={() => openNotification(item)}
              onLongPress={() => toggleSelection(item.id)}
              activeOpacity={0.78}
            >
              {isSelecting ? (
                <View style={styles.selectionWrap}>
                  <Ionicons
                    name={checked ? "checkbox" : "square-outline"}
                    size={22}
                    color={checked ? "#7c3aed" : "#777"}
                  />
                </View>
              ) : null}

              <View style={styles.iconWrap}>
                <Ionicons name={getIcon(item.type)} size={24} color="#7c3aed" />
              </View>

              <View style={styles.textWrap}>
                {item.title ? <Text style={styles.itemTitle}>{item.title}</Text> : null}
                <Text style={styles.content}>{notificationText(item)}</Text>
                <Text style={styles.time}>{timeAgo(item.created_at)}</Text>
              </View>

              {!isSelecting ? (
                <View style={styles.rowActions}>
                  <TouchableOpacity
                    style={styles.rowActionButton}
                    disabled={actionLoading}
                    onPress={(event) => {
                      event.stopPropagation();
                      markIds([item.id], !item.is_read);
                    }}
                  >
                    <Ionicons
                      name={item.is_read ? "mail-unread" : "mail-open"}
                      size={18}
                      color="#d8c7ff"
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.rowActionButton}
                    disabled={actionLoading}
                    onPress={(event) => {
                      event.stopPropagation();
                      handleDelete(item.id);
                    }}
                  >
                    <Ionicons name="trash-outline" size={18} color="#f87171" />
                  </TouchableOpacity>
                </View>
              ) : null}
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a0a" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#1a1a1a",
  },
  headerText: { flex: 1, minWidth: 0 },
  title: { color: "#fff", fontSize: 22, fontWeight: "800" },
  subtitle: { color: "#888", fontSize: 12, marginTop: 3 },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginLeft: 12,
  },
  headerButton: {
    height: 36,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: "#7c3aed",
  },
  headerButtonText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  headerIconButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#242424",
  },
  dangerButton: { backgroundColor: "#7f1d1d" },
  disabledButton: { opacity: 0.42 },
  footer: { paddingVertical: 14 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 80,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#1a1a1a",
  },
  unread: { backgroundColor: "#151524" },
  selected: { backgroundColor: "#231b33" },
  selectionWrap: {
    width: 28,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#1a1a1a",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  textWrap: { flex: 1, minWidth: 0 },
  itemTitle: { color: "#fff", fontSize: 14, fontWeight: "700", marginBottom: 2 },
  content: { color: "#ddd", fontSize: 14, lineHeight: 20 },
  time: { color: "#666", fontSize: 12, marginTop: 4 },
  rowActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginLeft: 10,
  },
  rowActionButton: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#181818",
  },
});
