import { useState, useEffect } from "react";
import {
  View,
  Text,
  Image,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/lib/auth-context";
import { getPhotos, uploadPhoto, deletePhoto, uploadAvatar } from "@/lib/api";
import { useTheme } from "@/lib/theme-context";

interface Photo {
  id: number;
  url: string;
}

export default function PhotosScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => { loadPhotos(); }, []);

  const loadPhotos = async () => {
    try {
      if (user?.id) {
        const res = await getPhotos(user.id);
        setPhotos(Array.isArray(res) ? (res as unknown as Photo[]) : []);
      }
    } catch {
      setPhotos([]);
    }
    setLoading(false);
  };

  const pickAndUpload = async (isAvatar: boolean) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: isAvatar ? [1, 1] : [4, 3],
      quality: 0.8,
    });
    if (result.canceled) return;
    setUploading(true);
    try {
      const uri = result.assets[0].uri;
      if (isAvatar) {
        await uploadAvatar(uri);
        Alert.alert("Succès", "Avatar mis à jour");
      } else {
        await uploadPhoto(uri);
        Alert.alert("Succès", "Photo ajoutée");
        loadPhotos();
      }
    } catch (e: unknown) {
      Alert.alert("Erreur", (e as Error).message);
    }
    setUploading(false);
  };

  const handleDelete = (photoId: number) => {
    Alert.alert("Supprimer", "Supprimer cette photo ?", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Supprimer",
        style: "destructive",
        onPress: async () => {
          try {
            await deletePhoto(photoId);
            setPhotos((prev) => prev.filter((p) => p.id !== photoId));
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
      <View style={styles.btnRow}>
        <TouchableOpacity
          style={[styles.uploadBtn, { backgroundColor: colors.accent }]}
          onPress={() => pickAndUpload(true)}
          disabled={uploading}
        >
          <Ionicons name="person-circle" size={20} color="#fff" />
          <Text style={styles.uploadText}>Changer l'avatar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.uploadBtn, { backgroundColor: colors.accent }]}
          onPress={() => pickAndUpload(false)}
          disabled={uploading}
        >
          <Ionicons name="add-circle" size={20} color="#fff" />
          <Text style={styles.uploadText}>Ajouter une photo</Text>
        </TouchableOpacity>
      </View>

      {uploading && <ActivityIndicator size="small" color={colors.accent} style={{ marginVertical: 12 }} />}

      <FlatList
        data={photos}
        numColumns={3}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.grid}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.photoWrap} onLongPress={() => handleDelete(item.id)}>
            <Image source={{ uri: item.url }} style={[styles.photo, { backgroundColor: colors.cardSecondary }]} />
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="images-outline" size={48} color={colors.border} />
            <Text style={{ color: colors.textMuted, fontSize: 14, marginTop: 8 }}>Aucune photo</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  btnRow: { flexDirection: "row", gap: 8, padding: 16 },
  uploadBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  uploadText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  grid: { padding: 4 },
  photoWrap: { flex: 1 / 3, aspectRatio: 1, padding: 2 },
  photo: { width: "100%", height: "100%", borderRadius: 4 },
  empty: { alignItems: "center", paddingTop: 60 },
});
