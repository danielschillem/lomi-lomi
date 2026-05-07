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
import { useTheme } from "@/lib/theme-context";

export default function ProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const [product, setProduct] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const productId = Number.parseInt(id || "", 10);
  const isValidProductId = Number.isFinite(productId) && productId > 0;

  const loadProduct = async () => {
    setLoadError(null);
    if (!isValidProductId) {
      setProduct(null);
      setLoading(false);
      return;
    }
    try {
      const res = await getProduct(productId);
      setProduct(res);
    } catch (e: unknown) {
      setLoadError((e as Error).message || "Impossible de charger le produit.");
    }
    setLoading(false);
  };

  useEffect(() => {
    void loadProduct();
  }, [isValidProductId, productId]);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (!isValidProductId) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.textMuted, fontSize: 16 }}>Produit introuvable</Text>
      </View>
    );
  }

  if (loadError && !product) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.textMuted, fontSize: 16 }}>{loadError}</Text>
        <TouchableOpacity
          style={[styles.retryBtn, { backgroundColor: colors.accent }]}
          onPress={() => {
            setLoading(true);
            void loadProduct();
          }}
        >
          <Text style={styles.retryText}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!product) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.textMuted, fontSize: 16 }}>Produit introuvable</Text>
      </View>
    );
  }

  const p = product;
  const formatPrice = (price: number) =>
    price.toLocaleString("fr-FR") + " FCFA";

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: (p.name as string) || "Produit" }} />
      <Image
        source={{
          uri:
            (p.image_url as string) ||
            "https://via.placeholder.com/400/1a1a1a/666?text=Produit",
        }}
        style={[styles.image, { backgroundColor: colors.cardSecondary }]}
      />
      <View style={styles.body}>
        <Text style={[styles.name, { color: colors.text }]}>{p.name as string}</Text>
        <Text style={[styles.price, { color: colors.accent }]}>
          {formatPrice((p.price as number) || 0)}
        </Text>
        {p.category && (
          <View style={[styles.badge, { backgroundColor: colors.cardSecondary }]}>
            <Text style={{ color: colors.accent, fontSize: 12, fontWeight: "600" }}>{p.category as string}</Text>
          </View>
        )}
        <Text style={{ color: colors.textSecondary, fontSize: 15, lineHeight: 22, marginTop: 16 }}>{(p.description as string) || ""}</Text>
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
  container: { flex: 1 },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  image: { width: "100%", height: 300 },
  body: { padding: 20 },
  name: { fontSize: 22, fontWeight: "bold" },
  price: {
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 8,
  },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 8,
  },
  stockRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 16,
  },
  stockText: { fontSize: 14, fontWeight: "500" },
  retryBtn: {
    marginTop: 12,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  retryText: { color: "#fff", fontSize: 14, fontWeight: "600" },
});
