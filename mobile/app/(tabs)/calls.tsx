import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Linking,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getConversations, getOrCreateConversation, sendMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
import {
  ConversationListItem,
  SafeConversationUser,
  getConversationLastMessageDate,
  getConversationOtherUser,
} from "@/lib/conversations";
import ScreenState from "@/app/components/ScreenState";

type CallType = "audio" | "video";

interface CallContact extends SafeConversationUser {
  conversationId: number;
  lastActivity: string;
}

export default function CallsScreen() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [callingKey, setCallingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const rows = await getConversations();
      setConversations(
        Array.isArray(rows) ? (rows as unknown as ConversationListItem[]) : [],
      );
      setError(null);
    } catch (err) {
      setError((err as Error)?.message || "Impossible de charger les contacts");
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const contacts = useMemo<CallContact[]>(() => {
    const seen = new Set<number>();
    return conversations
      .map((conversation) => {
        const other = getConversationOtherUser(conversation, user?.id);
        return {
          ...other,
          conversationId: Number(conversation.id),
          lastActivity: getConversationLastMessageDate(conversation),
        };
      })
      .filter((contact) => {
        if (!contact.id || seen.has(contact.id)) return false;
        seen.add(contact.id);
        return true;
      })
      .sort((a, b) => {
        const dateA = new Date(a.lastActivity || 0).getTime();
        const dateB = new Date(b.lastActivity || 0).getTime();
        return dateB - dateA;
      });
  }, [conversations, user?.id]);

  const startCall = async (contact: CallContact, type: CallType) => {
    const key = `${contact.id}-${type}`;
    setCallingKey(key);
    try {
      const conversation = await getOrCreateConversation(contact.id);
      const conversationId = Number(conversation.id || contact.conversationId);
      const room = `textme-${conversationId || contact.id}-${Date.now()}`;
      await sendMessage({
        receiver_id: contact.id,
        content:
          type === "video"
            ? "Invitation appel vidéo"
            : "Invitation appel audio",
        call_type: type,
        call_room: room,
      });
      const url =
        type === "video"
          ? `https://meet.jit.si/${room}`
          : `https://meet.jit.si/${room}#config.startWithVideoMuted=true`;
      await Linking.openURL(url);
    } catch {
      Alert.alert("Appel", "Impossible de démarrer l'appel.");
    } finally {
      setCallingKey(null);
    }
  };

  if (loading) {
    return (
      <ScreenState
        mode="loading"
        title="Chargement..."
        subtitle="Préparation des appels"
      />
    );
  }

  if (error && contacts.length === 0) {
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
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Appels</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          Audio et vidéo avec vos contacts TextMe
        </Text>
      </View>

      <FlatList
        data={contacts}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={contacts.length === 0 ? styles.emptyList : undefined}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
            tintColor={colors.accent}
          />
        }
        ListEmptyComponent={
          <ScreenState
            mode="empty"
            title="Aucun contact récent"
            subtitle="Démarrez une discussion pour appeler ce contact."
          />
        }
        renderItem={({ item }) => (
          <View style={[styles.row, { borderBottomColor: colors.border }]}>
            <View style={styles.avatarWrap}>
              <Image
                source={{
                  uri:
                    item.avatar_url ||
                    "https://via.placeholder.com/48/1a1a1a/666?text=?",
                }}
                style={[styles.avatar, { backgroundColor: colors.cardSecondary }]}
              />
              {item.is_online ? (
                <View style={[styles.onlineDot, { borderColor: colors.background }]} />
              ) : null}
            </View>
            <View style={styles.textWrap}>
              <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
                {item.username}
              </Text>
              <Text style={[styles.meta, { color: colors.textMuted }]}>
                {item.is_online ? "En ligne" : "Contact TextMe"}
              </Text>
            </View>
            <View style={styles.actions}>
              {(["audio", "video"] as const).map((type) => {
                const key = `${item.id}-${type}`;
                const active = callingKey === key;
                return (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.callButton,
                      {
                        backgroundColor: colors.cardSecondary,
                        borderColor: colors.border,
                      },
                    ]}
                    onPress={() => startCall(item, type)}
                    disabled={!!callingKey}
                  >
                    {active ? (
                      <ActivityIndicator size="small" color={colors.accent} />
                    ) : (
                      <Ionicons
                        name={type === "video" ? "videocam-outline" : "call-outline"}
                        size={20}
                        color={colors.text}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  emptyList: {
    flexGrow: 1,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  avatarWrap: {
    position: "relative",
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  onlineDot: {
    position: "absolute",
    right: 1,
    bottom: 1,
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: "#22c55e",
    borderWidth: 2,
  },
  textWrap: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontSize: 16,
    fontWeight: "700",
  },
  meta: {
    fontSize: 13,
    marginTop: 3,
  },
  actions: {
    flexDirection: "row",
    gap: 8,
  },
  callButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
