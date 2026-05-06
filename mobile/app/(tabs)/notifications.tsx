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

  const load = useCallback(async () => {
    try {
      const res = await getNotifications(1, 100);
      const rows = Array.isArray(res) ? (res as unknown as Notification[]) : [];
      setNotifs(rows);
      setVisibleCount(PAGE_SIZE);
      setError(null);
    } catch (err) {
      setNotifs([]);
      setError((err as Error)?.message || "Impossible de charger les notifications");
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

  return (
    <View style={styles.container}>
      <FlatList
        data={notifs.slice(0, visibleCount)}
        keyExtractor={(item) => item.id.toString()}
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
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.row, !item.is_read && styles.unread]}
            onLongPress={() => handleDelete(item.id)}
          >
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
  footer: { paddingVertical: 14 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#1a1a1a",
  },
  unread: { backgroundColor: "#1a1a2a" },
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
