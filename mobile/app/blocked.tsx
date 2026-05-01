import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getBlockedUsers, unblockUser } from "@/lib/api";

interface BlockedUser {
  id: number;
  blocked_user: {
    id: number;
    username: string;
  };
  created_at: string;
}

export default function BlockedScreen() {
  const [users, setUsers] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await getBlockedUsers();
      setUsers(Array.isArray(res) ? (res as unknown as BlockedUser[]) : []);
    } catch {
      setUsers([]);
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleUnblock = (block: BlockedUser) => {
    Alert.alert("Débloquer", `Débloquer ${block.blocked_user.username} ?`, [
      { text: "Annuler", style: "cancel" },
      {
        text: "Débloquer",
        onPress: async () => {
          try {
            await unblockUser(block.id);
            setUsers((prev) => prev.filter((u) => u.id !== block.id));
          } catch {
            /* empty */
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#7c3aed" />
      </View>
    );
  }

  if (users.length === 0) {
    return (
      <View style={styles.center}>
        <Ionicons name="happy-outline" size={64} color="#333" />
        <Text style={styles.emptyText}>Aucun utilisateur bloqué</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={users}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
            tintColor="#7c3aed"
          />
        }
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={styles.iconWrap}>
              <Ionicons name="ban" size={20} color="#ef4444" />
            </View>
            <Text style={styles.name}>{item.blocked_user.username}</Text>
            <TouchableOpacity
              style={styles.unblockBtn}
              onPress={() => handleUnblock(item)}
            >
              <Text style={styles.unblockText}>Débloquer</Text>
            </TouchableOpacity>
          </View>
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
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#1a1a1a",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  name: { flex: 1, color: "#fff", fontSize: 15 },
  unblockBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#7c3aed",
  },
  unblockText: { color: "#7c3aed", fontSize: 13, fontWeight: "600" },
});
