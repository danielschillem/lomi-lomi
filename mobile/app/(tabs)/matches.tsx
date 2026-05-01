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
  Alert,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getMatches, unmatch, getOrCreateConversation } from "@/lib/api";

interface Match {
  id: number;
  matched_user: {
    id: number;
    username: string;
    avatar_url: string;
    is_online: boolean;
  };
  created_at: string;
}

export default function MatchesScreen() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await getMatches();
      setMatches(Array.isArray(res) ? (res as unknown as Match[]) : []);
    } catch {
      setMatches([]);
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

  const handleChat = async (match: Match) => {
    try {
      const conv = await getOrCreateConversation(match.matched_user.id);
      const c = conv as { id: number };
      router.push({
        pathname: "/chat/[id]",
        params: {
          id: c.id,
          name: match.matched_user.username,
          recipientId: match.matched_user.id,
        },
      });
    } catch {
      /* empty */
    }
  };

  const handleUnmatch = (match: Match) => {
    Alert.alert(
      "Unmatch",
      `Supprimer le match avec ${match.matched_user.username} ?`,
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Unmatch",
          style: "destructive",
          onPress: async () => {
            try {
              await unmatch(match.id);
              setMatches((prev) => prev.filter((m) => m.id !== match.id));
            } catch {
              /* empty */
            }
          },
        },
      ],
    );
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

  if (matches.length === 0) {
    return (
      <View style={styles.center}>
        <Ionicons name="heart-dislike-outline" size={64} color="#333" />
        <Text style={styles.emptyText}>Pas encore de matchs</Text>
        <Text style={styles.emptySubtext}>
          Continue de swiper pour trouver des matchs !
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={matches}
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
                pathname: "/user/[id]",
                params: { id: item.matched_user.id },
              })
            }
            onLongPress={() => handleUnmatch(item)}
          >
            <View style={styles.avatarWrap}>
              <Image
                source={{
                  uri:
                    item.matched_user.avatar_url ||
                    "https://via.placeholder.com/56/1a1a1a/666?text=?",
                }}
                style={styles.avatar}
              />
              {item.matched_user.is_online && <View style={styles.onlineDot} />}
            </View>
            <View style={styles.textWrap}>
              <Text style={styles.name}>{item.matched_user.username}</Text>
              <Text style={styles.time}>Match {timeAgo(item.created_at)}</Text>
            </View>
            <TouchableOpacity
              style={styles.chatBtn}
              onPress={() => handleChat(item)}
            >
              <Ionicons name="chatbubble" size={20} color="#7c3aed" />
            </TouchableOpacity>
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
  name: { color: "#fff", fontSize: 16, fontWeight: "600" },
  time: { color: "#666", fontSize: 13, marginTop: 2 },
  chatBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#1a1a1a",
    justifyContent: "center",
    alignItems: "center",
  },
});
