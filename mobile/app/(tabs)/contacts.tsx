import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  createGroupConversation,
  getConversations,
  getOrCreateConversation,
  searchProfiles,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
import {
  ConversationListItem,
  SafeConversationUser,
  getConversationOtherUser,
} from "@/lib/conversations";
import ScreenState from "@/app/components/ScreenState";

type TextMeContact = SafeConversationUser & {
  phone_last4?: string;
};

function normalizeProfile(row: Record<string, unknown>): TextMeContact {
  return {
    id: Number(row.id || 0),
    username: String(row.username || "Utilisateur"),
    avatar_url: String(row.avatar_url || ""),
    is_online: Boolean(row.is_online),
    phone_last4: row.phone_last4 ? String(row.phone_last4) : undefined,
  };
}

export default function ContactsScreen() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TextMeContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searching, setSearching] = useState(false);
  const [openingId, setOpeningId] = useState<number | null>(null);
  const [groupModalVisible, setGroupModalVisible] = useState(false);
  const [groupTitle, setGroupTitle] = useState("");
  const [selectedMemberIds, setSelectedMemberIds] = useState<number[]>([]);
  const [creatingGroup, setCreatingGroup] = useState(false);

  const load = useCallback(async () => {
    try {
      const rows = await getConversations();
      setConversations(
        Array.isArray(rows) ? (rows as unknown as ConversationListItem[]) : [],
      );
    } catch {
      setConversations([]);
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const knownContacts = useMemo<TextMeContact[]>(() => {
    const seen = new Set<number>();
    return conversations
      .map((conversation) => getConversationOtherUser(conversation, user?.id))
      .filter((contact) => {
        if (!contact.id || seen.has(contact.id)) return false;
        seen.add(contact.id);
        return true;
      })
      .sort((a, b) => a.username.localeCompare(b.username));
  }, [conversations, user?.id]);

  const localContacts = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return knownContacts;
    return knownContacts.filter((contact) =>
      contact.username.toLowerCase().includes(q),
    );
  }, [knownContacts, query]);

  const visibleContacts = query.trim().length >= 2 ? results : localContacts;

  const runSearch = async () => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      const rows = await searchProfiles(q);
      const normalized = rows
        .map((row) => normalizeProfile(row))
        .filter((contact) => contact.id > 0 && contact.id !== user?.id);
      setResults(normalized);
    } catch {
      setResults([]);
      Alert.alert("Recherche", "Impossible de rechercher ce contact.");
    } finally {
      setSearching(false);
    }
  };

  const openChat = async (contact: TextMeContact) => {
    setOpeningId(contact.id);
    try {
      const conversation = await getOrCreateConversation(contact.id);
      const conversationId = Number(conversation.id);
      if (!conversationId) throw new Error("Conversation invalide");
      router.push({
        pathname: "/chat/[id]",
        params: {
          id: String(conversationId),
          name: contact.username,
          recipientId: String(contact.id),
          isGroup: "0",
        },
      });
    } catch {
      Alert.alert("Discussion", "Impossible d'ouvrir cette discussion.");
    } finally {
      setOpeningId(null);
    }
  };

  const toggleGroupMember = (contactId: number) => {
    setSelectedMemberIds((prev) =>
      prev.includes(contactId)
        ? prev.filter((id) => id !== contactId)
        : [...prev, contactId],
    );
  };

  const createGroup = async () => {
    const title = groupTitle.trim();
    if (title.length < 2) {
      Alert.alert("Groupe", "Ajoute un nom de groupe.");
      return;
    }
    if (selectedMemberIds.length < 1) {
      Alert.alert("Groupe", "Sélectionne au moins un contact.");
      return;
    }

    setCreatingGroup(true);
    try {
      const group = await createGroupConversation({
        title,
        member_ids: selectedMemberIds,
      });
      const conversationId = Number(group.id);
      if (!conversationId) throw new Error("Groupe invalide");
      setGroupModalVisible(false);
      setGroupTitle("");
      setSelectedMemberIds([]);
      await load();
      router.push({
        pathname: "/chat/[id]",
        params: {
          id: String(conversationId),
          name: title,
          recipientId: "0",
          isGroup: "1",
        },
      });
    } catch (err) {
      Alert.alert(
        "Groupe",
        (err as Error)?.message || "Impossible de créer ce groupe.",
      );
    } finally {
      setCreatingGroup(false);
    }
  };

  if (loading) {
    return (
      <ScreenState
        mode="loading"
        title="Chargement..."
        subtitle="Récupération des contacts"
      />
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: colors.text }]}>Contacts</Text>
          <TouchableOpacity
            style={[styles.groupButton, { backgroundColor: colors.cardSecondary }]}
            onPress={() => setGroupModalVisible(true)}
          >
            <Ionicons name="people-outline" size={20} color={colors.text} />
          </TouchableOpacity>
        </View>
        <View style={[styles.searchWrap, { backgroundColor: colors.cardSecondary }]}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            value={query}
            onChangeText={(value) => {
              setQuery(value);
              if (value.trim().length < 2) setResults([]);
            }}
            onSubmitEditing={runSearch}
            placeholder="Nom ou contact TextMe"
            placeholderTextColor={colors.placeholder}
            returnKeyType="search"
            style={[styles.searchInput, { color: colors.inputText }]}
          />
          <TouchableOpacity
            style={[styles.searchButton, { backgroundColor: colors.accent }]}
            onPress={runSearch}
            disabled={searching}
          >
            {searching ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={visibleContacts}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={visibleContacts.length === 0 ? styles.emptyList : undefined}
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
            title={query.trim() ? "Aucun contact trouvé" : "Aucun contact"}
            subtitle={
              query.trim()
                ? "Vérifiez le nom saisi ou lancez une autre recherche."
                : "Vos contacts apparaîtront ici après vos premières discussions."
            }
          />
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.row, { borderBottomColor: colors.border }]}
            onPress={() => openChat(item)}
            disabled={openingId !== null}
          >
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
                {item.phone_last4
                  ? `Téléphone se termine par ${item.phone_last4}`
                  : item.is_online
                    ? "En ligne"
                    : "Contact TextMe"}
              </Text>
            </View>
            {openingId === item.id ? (
              <ActivityIndicator size="small" color={colors.accent} />
            ) : (
              <Ionicons name="chatbubble-outline" size={21} color={colors.textMuted} />
            )}
          </TouchableOpacity>
        )}
      />

      <Modal
        animationType="slide"
        transparent
        visible={groupModalVisible}
        onRequestClose={() => setGroupModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalSheet,
              { backgroundColor: colors.background, borderColor: colors.border },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Nouveau groupe
              </Text>
              <TouchableOpacity
                style={[styles.groupButton, { backgroundColor: colors.cardSecondary }]}
                onPress={() => setGroupModalVisible(false)}
              >
                <Ionicons name="close" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>

            <TextInput
              value={groupTitle}
              onChangeText={setGroupTitle}
              placeholder="Nom du groupe"
              placeholderTextColor={colors.placeholder}
              style={[
                styles.groupInput,
                {
                  backgroundColor: colors.inputBg,
                  color: colors.inputText,
                  borderColor: colors.border,
                },
              ]}
            />

            <Text style={[styles.modalHint, { color: colors.textMuted }]}>
              Sélectionnés : {selectedMemberIds.length}
            </Text>

            <FlatList
              data={visibleContacts}
              keyExtractor={(item) => `group-${item.id}`}
              style={styles.memberList}
              ListEmptyComponent={
                <Text style={[styles.modalHint, { color: colors.textMuted }]}>
                  Recherchez un contact TextMe, puis sélectionnez-le.
                </Text>
              }
              renderItem={({ item }) => {
                const selected = selectedMemberIds.includes(item.id);
                return (
                  <TouchableOpacity
                    style={[styles.memberRow, { borderBottomColor: colors.border }]}
                    onPress={() => toggleGroupMember(item.id)}
                  >
                    <Image
                      source={{
                        uri:
                          item.avatar_url ||
                          "https://via.placeholder.com/48/1a1a1a/666?text=?",
                      }}
                      style={[
                        styles.memberAvatar,
                        { backgroundColor: colors.cardSecondary },
                      ]}
                    />
                    <Text
                      style={[styles.memberName, { color: colors.text }]}
                      numberOfLines={1}
                    >
                      {item.username}
                    </Text>
                    <Ionicons
                      name={selected ? "checkbox" : "square-outline"}
                      size={22}
                      color={selected ? colors.accent : colors.textMuted}
                    />
                  </TouchableOpacity>
                );
              }}
            />

            <TouchableOpacity
              style={[
                styles.createGroupButton,
                {
                  backgroundColor:
                    groupTitle.trim().length >= 2 && selectedMemberIds.length > 0
                      ? colors.accent
                      : colors.cardSecondary,
                },
              ]}
              onPress={createGroup}
              disabled={
                creatingGroup ||
                groupTitle.trim().length < 2 ||
                selectedMemberIds.length === 0
              }
            >
              {creatingGroup ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons
                    name="checkmark"
                    size={18}
                    color={
                      groupTitle.trim().length >= 2 && selectedMemberIds.length > 0
                        ? "#fff"
                        : colors.textMuted
                    }
                  />
                  <Text
                    style={[
                      styles.createGroupText,
                      {
                        color:
                          groupTitle.trim().length >= 2 &&
                          selectedMemberIds.length > 0
                            ? "#fff"
                            : colors.textMuted,
                      },
                    ]}
                  >
                    Créer le groupe
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    gap: 10,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
  },
  groupButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    paddingLeft: 14,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    height: 46,
    fontSize: 15,
  },
  searchButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 4,
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    maxHeight: "86%",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderWidth: 1,
    padding: 16,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "800",
  },
  groupInput: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 16,
  },
  modalHint: {
    fontSize: 13,
    marginTop: 10,
    marginBottom: 8,
  },
  memberList: {
    maxHeight: 330,
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  memberAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },
  memberName: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
  },
  createGroupButton: {
    minHeight: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    marginTop: 14,
  },
  createGroupText: {
    fontSize: 15,
    fontWeight: "800",
  },
});
