import { useEffect, useState, useCallback } from "react";
import { Ionicons } from "@expo/vector-icons";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Pressable,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import {
  getNotifications,
  markNotificationsRead,
  deleteNotification,
} from "@/lib/api";
import ScreenState from "@/app/components/ScreenState";

interface Notification {
  id: number;
  type: string;
  content: string;
  is_read: boolean;
  created_at: string;
  from_user_id?: number;
  from_username?: string;
}

export default function NotificationsScreen() {
  const PAGE_SIZE = 20;
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const load = useCallback(async () => {
    try {
      const res = await getNotifications(1, 100);
      const rows = Array.isArray(res) ? (res as unknown as Notification[]) : [];
      setNotifs(rows);
      setVisibleCount(PAGE_SIZE);
      setError(null);
    } catch (err) {
      setNotifs([]);
      setError(
        (err as Error)?.message || "Impossible de charger les notifications",
      );
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

  useEffect(() => {
    // Mark all as read on mount
    markNotificationsRead().catch(() => {});
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    setError(null);
    load();
  };

  const loadMore = () => {
    if (visibleCount >= notifs.length) return;
    setVisibleCount((prev) => prev + PAGE_SIZE);
  };

  const handleDelete = (id: number) => {
    Alert.alert("Supprimer", "Supprimer cette notification ?", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Supprimer",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteNotification(id);
            setNotifs((prev) => prev.filter((n) => n.id !== id));
          } catch {
            /* empty */
          }
        },
      },
    ]);
  };

  const handleSelect = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleDeleteSelected = () => {
    if (selected.size === 0) return;
    Alert.alert("Supprimer", `Supprimer ${selected.size} notification(s) ?`, [
      { text: "Annuler", style: "cancel" },
      {
        text: "Supprimer",
        style: "destructive",
        onPress: async () => {
          try {
            const ids = Array.from(selected);
            await Promise.all(ids.map((id) => deleteNotification(id)));
            setNotifs((prev) => prev.filter((n) => !selected.has(n.id)));
            setSelected(new Set());
            setSelectMode(false);
          } catch {
            /* empty */
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
        return "heart-outline" as const;
      case "message":
        return "chatbubble" as const;
      default:
        return "notifications" as const;
    }
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
      <ScreenState
        mode="loading"
        title="Chargement..."
        subtitle="Récupération des notifications"
      />
    );
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

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        {selectMode ? (
          <>
            <Pressable
              style={styles.topBarBtn}
              onPress={handleDeleteSelected}
              disabled={selected.size === 0}
            >
              <Ionicons
                name="trash"
                size={22}
                color={selected.size === 0 ? "#888" : "#f44"}
              />
              <Text
                style={[
                  styles.topBarText,
                  { color: selected.size === 0 ? "#888" : "#f44" },
                ]}
              >
                Supprimer
              </Text>
            </Pressable>
            <Pressable
              style={styles.topBarBtn}
              onPress={() => {
                setSelectMode(false);
                setSelected(new Set());
              }}
            >
              <Ionicons name="close" size={22} color="#fff" />
              <Text style={styles.topBarText}>Annuler</Text>
            </Pressable>
          </>
        ) : (
          <Pressable
            style={styles.topBarBtn}
            onPress={() => setSelectMode(true)}
          >
            <Ionicons name="checkmark-circle-outline" size={22} color="#fff" />
            <Text style={styles.topBarText}>Sélectionner</Text>
          </Pressable>
        )}
      </View>
      <FlatList
        data={notifs.slice(0, visibleCount)}
        keyExtractor={(item) => item.id.toString()}
        ListEmptyComponent={
          <ScreenState
            mode="empty"
            title="Aucune notification"
            subtitle="Tu es à jour pour le moment."
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
          visibleCount < notifs.length ? (
            <View style={styles.footer}>
              <ActivityIndicator size="small" color="#7c3aed" />
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.row,
              !item.is_read && styles.unread,
              selectMode && styles.selectableRow,
            ]}
            onLongPress={() => setSelectMode(true)}
            onPress={() => {
              if (selectMode) {
                handleSelect(item.id);
              } else {
                // future: marquer comme lu individuellement ici
              }
            }}
          >
            {selectMode && (
              <View style={styles.checkboxWrap}>
                <Ionicons
                  name={selected.has(item.id) ? "checkbox" : "square-outline"}
                  size={22}
                  color={selected.has(item.id) ? "#7c3aed" : "#888"}
                />
              </View>
            )}
            <View style={styles.iconWrap}>
              <Ionicons name={getIcon(item.type)} size={24} color="#7c3aed" />
            </View>
            <View style={styles.textWrap}>
              <Text style={styles.content}>{item.content}</Text>
              <Text style={styles.time}>{timeAgo(item.created_at)}</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a0a" },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#181828",
    borderBottomWidth: 1,
    borderBottomColor: "#222",
  },
  topBarBtn: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 18,
  },
  topBarText: {
    color: "#fff",
    fontSize: 15,
    marginLeft: 6,
  },
  footer: { paddingVertical: 14 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#1a1a1a",
  },
  selectableRow: {
    paddingLeft: 0,
  },
  unread: { backgroundColor: "#1a1a2a" },
  checkboxWrap: {
    width: 32,
    alignItems: "center",
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
  textWrap: { flex: 1 },
  content: { color: "#fff", fontSize: 14, lineHeight: 20 },
  time: { color: "#666", fontSize: 12, marginTop: 4 },
});
