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

interface Address {
  id: number;
  label: string;
  address: string;
  city: string;
  is_default: boolean;
}

export default function AddressesScreen() {
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
      setAddresses(res as unknown as Address[]);
    } catch {
      /* empty */
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
      await createAddress({
        label: label.trim(),
        address: addr.trim(),
        city: city.trim(),
      });
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

  return (
    <View style={styles.container}>
      <FlatList
        data={addresses}
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
        contentContainerStyle={addresses.length === 0 ? { flex: 1 } : undefined}
        ListEmptyComponent={
          <View style={styles.center}>
            <Ionicons name="location-outline" size={64} color="#333" />
            <Text style={styles.emptyText}>Aucune adresse</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onLongPress={() => handleDelete(item)}
          >
            <Ionicons name="location" size={20} color="#7c3aed" />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.label}>
                {item.label}
                {item.is_default ? " (par défaut)" : ""}
              </Text>
              <Text style={styles.addr}>{item.address}</Text>
              <Text style={styles.city}>{item.city}</Text>
            </View>
          </TouchableOpacity>
        )}
      />

      <TouchableOpacity style={styles.fab} onPress={() => setShowAdd(true)}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      <Modal visible={showAdd} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nouvelle adresse</Text>
              <TouchableOpacity onPress={() => setShowAdd(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.input}
              value={label}
              onChangeText={setLabel}
              placeholder="Nom (ex: Maison, Bureau)"
              placeholderTextColor="#666"
            />
            <TextInput
              style={styles.input}
              value={addr}
              onChangeText={setAddr}
              placeholder="Adresse"
              placeholderTextColor="#666"
            />
            <TextInput
              style={styles.input}
              value={city}
              onChangeText={setCity}
              placeholder="Ville"
              placeholderTextColor="#666"
            />
            <TouchableOpacity
              style={[styles.saveBtn, saving && { opacity: 0.5 }]}
              onPress={handleAdd}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveText}>Ajouter</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    margin: 12,
    marginBottom: 0,
    backgroundColor: "#111",
    borderRadius: 12,
    padding: 16,
  },
  label: { color: "#fff", fontSize: 15, fontWeight: "600" },
  addr: { color: "#ccc", fontSize: 14, marginTop: 2 },
  city: { color: "#999", fontSize: 13, marginTop: 2 },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#7c3aed",
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#0a0a0a",
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
  modalTitle: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  input: {
    backgroundColor: "#1a1a1a",
    color: "#fff",
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    marginBottom: 10,
  },
  saveBtn: {
    backgroundColor: "#7c3aed",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 4,
  },
  saveText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
