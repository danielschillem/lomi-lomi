import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  CallRecord,
  getCalls,
  getConversations,
  sendMessage,
  startCall as createCall,
} from "@/lib/api";
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
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [callingKey, setCallingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const rows = await getConversations();
      const callRows = await getCalls().catch(() => []);
      setConversations(
        Array.isArray(rows) ? (rows as unknown as ConversationListItem[]) : [],
      );
      setCalls(Array.isArray(callRows) ? callRows : []);
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
      const call = await createCall({
        conversation_id: contact.conversationId,
        receiver_id: contact.id,
        call_type: type,
      });
      router.push({
        pathname: "/call",
        params: { room: call.room, callType: type, callId: String(call.id), userName: user?.username },
      });
      load();
    } catch {
      try {
        const room = `textme-${contact.conversationId || contact.id}-${Date.now()}`;
        await sendMessage({
          conversation_id: contact.conversationId,
          receiver_id: contact.id,
          content:
            type === "video"
              ? "Invitation appel vidéo"
              : "Invitation appel audio",
          call_type: type,
          call_room: room,
        });
        router.push({
          pathname: "/call",
          params: { room, callType: type, userName: user?.username },
        });
      } catch {
        Alert.alert("Appel", "Impossible de démarrer l'appel.");
      }
    } finally {
      setCallingKey(null);
    }
  };

  const callPeer = (call: CallRecord) =>
    call.caller_id === user?.id ? call.receiver : call.caller;

  const callStatusLabel = (call: CallRecord) => {
    const outgoing = call.caller_id === user?.id;
    switch (call.status) {
      case "accepted":
        return outgoing ? "Appel accepté" : "Appel répondu";
      case "declined":
        return outgoing ? "Refusé" : "Refusé par vous";
      case "missed":
        return outgoing ? "Sans réponse" : "Manqué";
      case "ended":
        return "Terminé";
      case "cancelled":
        return outgoing ? "Annulé" : "Annulé par l'appelant";
      default:
        return outgoing ? "Appel sortant" : "Appel entrant";
    }
  };

  const formatCallTime = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return `${date.getDate().toString().padStart(2, "0")}/${(date.getMonth() + 1)
      .toString()
      .padStart(2, "0")} ${date.getHours().toString().padStart(2, "0")}:${date
      .getMinutes()
      .toString()
      .padStart(2, "0")}`;
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
        ListHeaderComponent={
          calls.length > 0 ? (
            <View style={styles.history}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Récents
              </Text>
              {calls.slice(0, 5).map((call) => {
                const peer = callPeer(call);
                const outgoing = call.caller_id === user?.id;
                return (
                  <View
                    key={call.id}
                    style={[
                      styles.historyRow,
                      {
                        backgroundColor: colors.card,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.historyIcon,
                        { backgroundColor: colors.cardSecondary },
                      ]}
                    >
                      <Ionicons
                        name={
                          call.call_type === "video"
                            ? "videocam-outline"
                            : outgoing
                              ? "call-outline"
                              : "call"
                        }
                        size={18}
                        color={call.status === "missed" ? colors.error : colors.text}
                      />
                    </View>
                    <View style={styles.historyText}>
                      <Text
                        style={[styles.name, { color: colors.text }]}
                        numberOfLines={1}
                      >
                        {peer?.username || "Contact TextMe"}
                      </Text>
                      <Text style={[styles.meta, { color: colors.textMuted }]}>
                        {callStatusLabel(call)} · {formatCallTime(call.created_at)}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={[
                        styles.smallCallButton,
                        {
                          backgroundColor: colors.cardSecondary,
                          borderColor: colors.border,
                        },
                      ]}
                      onPress={() => {
                        if (!peer?.id) return;
                        startCall(
                          {
                            id: peer.id,
                            username: peer.username || "Contact TextMe",
                            avatar_url: peer.avatar_url || "",
                            is_online: Boolean(peer.is_online),
                            conversationId: call.conversation_id,
                            lastActivity: call.created_at,
                          },
                          call.call_type,
                        );
                      }}
                      disabled={!!callingKey || !peer?.id}
                    >
                      <Ionicons name="call-outline" size={18} color={colors.text} />
                    </TouchableOpacity>
                  </View>
                );
              })}
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Contacts
              </Text>
            </View>
          ) : null
        }
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
  history: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "800",
    marginTop: 10,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
  },
  historyIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  historyText: {
    flex: 1,
    minWidth: 0,
  },
  smallCallButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
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
