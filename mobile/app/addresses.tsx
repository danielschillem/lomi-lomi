import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getAddresses, createAddress, deleteAddress } from "@/lib/api";
import { useTheme } from "@/lib/theme-context";

interface Address {
  id: number;
  label: string;
  address: string;
  city: string;
  is_default: boolean;
}

export default function AddressesScreen() {
  const { colors } = useTheme();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [label, setLabel] = useState("");
  const [addr, setAddr] = useState("");
  const [city, setCity] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await getAddresses();
      setAddresses(Array.isArray(res) ? (res as unknown as Address[]) : []);
    } catch {
      setAddresses([]);
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleAdd = async () => {
    if (!label.trim() || !addr.trim() || !city.trim()) {
      Alert.alert("Erreur", "Remplissez tous les champs");
      return;
    }
    setSaving(true);
    try {
      await createAddress({ label: label.trim(), address: addr.trim(), city: city.trim() });
      setShowAdd(false);
      setLabel("");
      setAddr("");
      setCity("");
      load();
    } catch (e: unknown) {
      Alert.alert("Erreur", (e as Error).message);
    }
    setSaving(false);
  };

  const handleDelete = (a: Address) => {
    Alert.alert("Supprimer", `Supprimer l'adresse "${a.label}" ?`, [
      { text: "Annuler", style: "cancel" },
      {
        text: "Supprimer",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteAddress(a.id);
            setAddresses((prev) => prev.filter((x) => x.id !== a.id));
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

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <FlatList
        data={addresses}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(); }}
            tintColor={colors.accent}
          />
        }
        contentContainerStyle={addresses.length === 0 ? { flex: 1 } : undefined}
        ListEmptyComponent={
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
            <Ionicons name="location-outline" size={64} color={colors.border} />
            <Text style={{ color: colors.textMuted, fontSize: 16, marginTop: 16 }}>Aucune adresse</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.card, { backgroundColor: colors.card }]}
            onLongPress={() => handleDelete(item)}
          >
            <Ionicons name="location" size={20} color={colors.accent} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={{ color: colors.text, fontSize: 15, fontWeight: "600" }}>
                {item.label}{item.is_default ? " (par défaut)" : ""}
              </Text>
              <Text style={{ color: colors.textSecondary, fontSize: 14, marginTop: 2 }}>{item.address}</Text>
              <Text style={{ color: colors.textMuted, fontSize: 13, marginTop: 2 }}>{item.city}</Text>
            </View>
          </TouchableOpacity>
        )}
      />

      <TouchableOpacity style={[styles.fab, { backgroundColor: colors.accent }]} onPress={() => setShowAdd(true)}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      <Modal visible={showAdd} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={styles.modalHeader}>
              <Text style={{ color: colors.text, fontSize: 18, fontWeight: "bold" }}>Nouvelle adresse</Text>
              <TouchableOpacity onPress={() => setShowAdd(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBg, color: colors.inputText }]}
              value={label}
              onChangeText={setLabel}
              placeholder="Nom (ex: Maison, Bureau)"
              placeholderTextColor={colors.placeholder}
            />
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBg, color: colors.inputText }]}
              value={addr}
              onChangeText={setAddr}
              placeholder="Adresse"
              placeholderTextColor={colors.placeholder}
            />
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBg, color: colors.inputText }]}
              value={city}
              onChangeText={setCity}
              placeholder="Ville"
              placeholderTextColor={colors.placeholder}
            />
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: colors.accent }, saving && { opacity: 0.5 }]}
              onPress={handleAdd}
              disabled={saving}
            >
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Ajouter</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    margin: 12,
    marginBottom: 0,
    borderRadius: 12,
    padding: 16,
  },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  input: {
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    marginBottom: 10,
  },
  saveBtn: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 4,
  },
  saveText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
