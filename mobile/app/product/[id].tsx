import { useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useLocalSearchParams, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getProduct } from "@/lib/api";

export default function ProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [product, setProduct] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await getProduct(parseInt(id || "0", 10));
        setProduct(res);
      } catch {
        /* empty */
      }
      setLoading(false);
    })();
  }, [id]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#7c3aed" />
      </View>
    );
  }

  if (!product) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>Produit introuvable</Text>
      </View>
    );
  }

  const p = product;
  const formatPrice = (price: number) =>
    price.toLocaleString("fr-FR") + " FCFA";

  return (
    <ScrollView style={styles.container}>
      <Stack.Screen options={{ title: (p.name as string) || "Produit" }} />
      <Image
        source={{
          uri:
            (p.image_url as string) ||
            "https://via.placeholder.com/400/1a1a1a/666?text=Produit",
        }}
        style={styles.image}
      />
      <View style={styles.body}>
        <Text style={styles.name}>{p.name as string}</Text>
        <Text style={styles.price}>
          {formatPrice((p.price as number) || 0)}
        </Text>
        {p.category && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{p.category as string}</Text>
          </View>
        )}
        <Text style={styles.desc}>{(p.description as string) || ""}</Text>
        <View style={styles.stockRow}>
          <Ionicons
            name={(p.stock as number) > 0 ? "checkmark-circle" : "close-circle"}
            size={18}
            color={(p.stock as number) > 0 ? "#22c55e" : "#ef4444"}
          />
          <Text
            style={[
              styles.stockText,
              { color: (p.stock as number) > 0 ? "#22c55e" : "#ef4444" },
            ]}
          >
            {(p.stock as number) > 0
              ? `${p.stock} en stock`
              : "Rupture de stock"}
          </Text>
        </View>
      </View>
    </ScrollView>
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
  emptyText: { color: "#666", fontSize: 16 },
  image: { width: "100%", height: 300, backgroundColor: "#1a1a1a" },
  body: { padding: 20 },
  name: { color: "#fff", fontSize: 22, fontWeight: "bold" },
  price: {
    color: "#7c3aed",
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 8,
  },
  badge: {
    backgroundColor: "#1a1a2a",
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 8,
  },
  badgeText: { color: "#7c3aed", fontSize: 12, fontWeight: "600" },
  desc: { color: "#ccc", fontSize: 15, lineHeight: 22, marginTop: 16 },
  stockRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 16,
  },
  stockText: { fontSize: 14, fontWeight: "500" },
});
