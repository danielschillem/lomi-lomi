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
import { useTheme } from "@/lib/theme-context";

interface BlockedUser {
  id: number;
  blocked_user: { id: number; username: string };
  created_at: string;
}

export default function BlockedScreen() {
  const { colors } = useTheme();
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

  useEffect(() => { load(); }, [load]);

  const handleUnblock = (block: BlockedUser) => {
    Alert.alert("Débloquer", `Débloquer ${block.blocked_user.username} ?`, [
      { text: "Annuler", style: "cancel" },
      {
        text: "Débloquer",
        onPress: async () => {
          try {
            await unblockUser(block.id);
            setUsers((prev) => prev.filter((u) => u.id !== block.id));
          } catch { /* empty */ }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (users.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: "center", alignItems: "center" }}>
        <Ionicons name="happy-outline" size={64} color={colors.border} />
        <Text style={{ color: colors.textMuted, fontSize: 16, marginTop: 16 }}>Aucun utilisateur bloqué</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <FlatList
        data={users}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(); }}
            tintColor={colors.accent}
          />
        }
        renderItem={({ item }) => (
          <View style={[styles.row, { borderBottomColor: colors.border }]}>
            <View style={[styles.iconWrap, { backgroundColor: colors.cardSecondary }]}>
              <Ionicons name="ban" size={20} color={colors.error} />
            </View>
            <Text style={{ flex: 1, color: colors.text, fontSize: 15 }}>{item.blocked_user.username}</Text>
            <TouchableOpacity
              style={[styles.unblockBtn, { borderColor: colors.accent }]}
              onPress={() => handleUnblock(item)}
            >
              <Text style={{ color: colors.accent, fontSize: 13, fontWeight: "600" }}>Débloquer</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  unblockBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
});
