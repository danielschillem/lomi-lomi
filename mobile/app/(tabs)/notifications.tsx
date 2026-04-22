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
import {
  getNotifications,
  markNotificationsRead,
  deleteNotification,
} from "@/lib/api";

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
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await getNotifications();
      setNotifs(res as unknown as Notification[]);
    } catch {
      /* empty */
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    // Mark all as read on mount
    markNotificationsRead().catch(() => {});
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    load();
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
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#7c3aed" />
      </View>
    );
  }

  if (notifs.length === 0) {
    return (
      <View style={styles.center}>
        <Ionicons name="notifications-off-outline" size={64} color="#333" />
        <Text style={styles.emptyText}>Aucune notification</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={notifs}
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
  center: {
    flex: 1,
    backgroundColor: "#0a0a0a",
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: { color: "#666", fontSize: 16, marginTop: 16 },
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
