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
import { useFocusEffect } from "@react-navigation/native";
import PremiumGate from "@/app/components/PremiumGate";
import { getMatches, unmatch, getOrCreateConversation } from "@/lib/api";
import { useTheme } from "@/lib/theme-context";
import ScreenState from "@/app/components/ScreenState";

interface Match {
  id: number;
  matched_user?: {
    id: number;
    username: string;
    avatar_url: string;
    is_online: boolean;
  };
  user1?: {
    id: number;
    username: string;
    avatar_url: string;
    is_online: boolean;
  };
  user2?: {
    id: number;
    username: string;
    avatar_url: string;
    is_online: boolean;
  };
  user1_id?: number;
  user2_id?: number;
  created_at: string;
}

function MatchesScreenInner() {
  const PAGE_SIZE = 20;
  const { colors } = useTheme();
  const [matches, setMatches] = useState<Match[]>([]);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getMatchedUser = useCallback(
    (match: Match) => {
      if (match.matched_user) return match.matched_user;
      return match.user2 || match.user1 || null;
    },
    [],
  );

  const load = useCallback(async () => {
    try {
      const res = await getMatches();
      const rows = Array.isArray(res) ? (res as unknown as Match[]) : [];
      setMatches(rows);
      setVisibleCount(PAGE_SIZE);
      setError(null);
    } catch (err) {
      setMatches([]);
      setError((err as Error)?.message || "Impossible de charger les matchs");
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
    if (visibleCount >= matches.length) return;
    setVisibleCount((prev) => prev + PAGE_SIZE);
  };

  const handleChat = async (match: Match) => {
    const matchedUser = getMatchedUser(match);
    if (!matchedUser) return;
    try {
      const conv = await getOrCreateConversation(matchedUser.id);
      const c = conv as { id: number };
      router.push({
        pathname: "/chat/[id]",
        params: {
          id: c.id,
          name: matchedUser.username,
          recipientId: matchedUser.id,
        },
      });
    } catch {
      Alert.alert("Erreur", "Impossible d'ouvrir le chat pour le moment.");
    }
  };

  const handleUnmatch = (match: Match) => {
    const matchedUser = getMatchedUser(match);
    if (!matchedUser) return;
    Alert.alert(
      "Unmatch",
      `Supprimer le match avec ${matchedUser.username} ?`,
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
              Alert.alert("Erreur", "Impossible de supprimer ce match.");
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
    return <ScreenState mode="loading" title="Chargement..." subtitle="Récupération des matchs" />;
  }

  if (error && matches.length === 0) {
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
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <FlatList
        data={matches.slice(0, visibleCount)}
        keyExtractor={(item) => item.id.toString()}
        ListEmptyComponent={
          <ScreenState
            mode="empty"
            title="Pas encore de matchs"
            subtitle="Continue de swiper pour trouver des matchs !"
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
          visibleCount < matches.length ? (
            <View style={styles.footer}>
              <ActivityIndicator size="small" color={colors.accent} />
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          (() => {
            const matchedUser = getMatchedUser(item);
            if (!matchedUser) return null;
            return (
          <TouchableOpacity
            style={[styles.row, { borderBottomColor: colors.border }]}
            onPress={() =>
              router.push({
                pathname: "/user/[id]",
                params: { id: matchedUser.id },
              })
            }
            onLongPress={() => handleUnmatch(item)}
          >
            <View style={styles.avatarWrap}>
              <Image
                source={{
                  uri:
                    matchedUser.avatar_url ||
                    "https://via.placeholder.com/56/1a1a1a/666?text=?",
                }}
                style={[styles.avatar, { backgroundColor: colors.cardSecondary }]}
              />
              {matchedUser.is_online && (
                <View style={[styles.onlineDot, { borderColor: colors.background }]} />
              )}
            </View>
            <View style={styles.textWrap}>
              <Text style={[styles.name, { color: colors.text }]}>
                {matchedUser.username}
              </Text>
              <Text style={[styles.time, { color: colors.textMuted }]}>
                Match {timeAgo(item.created_at)}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.chatBtn, { backgroundColor: colors.cardSecondary }]}
              onPress={() => handleChat(item)}
            >
              <Ionicons name="chatbubble" size={20} color={colors.accent} />
            </TouchableOpacity>
          </TouchableOpacity>
            );
          })()
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  footer: { paddingVertical: 14 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
  },
  avatarWrap: { position: "relative" },
  avatar: { width: 56, height: 56, borderRadius: 28 },
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
  textWrap: { flex: 1, marginLeft: 12 },
  name: { fontSize: 16, fontWeight: "600" },
  time: { fontSize: 13, marginTop: 2 },
  chatBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
});

export default function MatchesScreen() {
  return (
    <PremiumGate feature="Matchs" icon="people-outline" tone="#8b5cf6">
      <MatchesScreenInner />
    </PremiumGate>
  );
}
