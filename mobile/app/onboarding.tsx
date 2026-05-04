import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Modal,
  FlatList,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import {
  updateProfile,
  uploadAvatar,
  savePrompts,
  completeOnboarding,
} from "@/lib/api";

const PROMPT_QUESTIONS = [
  "Mon endroit favori à Ouagadougou / Bobo-Dioulasso",
  "Ce qui me fait sourire chaque matin",
  "Ma passion secrète",
  "Mon plat burkinabè préféré",
  "Ce que je cherche vraiment",
  "La qualité que j'admire le plus chez l'autre",
  "Mon weekend idéal",
  "Un rêve que j'ai pour l'avenir",
];

const STEPS = ["Photo", "Profil", "Préférences", "Prompts"] as const;

const CITIES = [
  "Ouagadougou",
  "Bobo-Dioulasso",
  "Koudougou",
  "Banfora",
  "Ouahigouya",
];

const GENDERS: { value: string; label: string }[] = [
  { value: "homme", label: "Un homme" },
  { value: "femme", label: "Une femme" },
  { value: "autre", label: "Autre" },
];

const INTERESTED_IN: { value: string; label: string }[] = [
  { value: "femme", label: "Des femmes" },
  { value: "homme", label: "Des hommes" },
  { value: "tout", label: "Tout le monde" },
];

const RELATION_TYPES: { value: string; label: string }[] = [
  { value: "relation_serieuse", label: "Relation sérieuse" },
  { value: "amitie", label: "Amitié" },
  { value: "casual", label: "Casual" },
  { value: "mariage", label: "Mariage" },
];

interface PromptEntry {
  question: string;
  answer: string;
}

export default function OnboardingScreen() {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  // Step 0 - Photo
  const [avatarUri, setAvatarUri] = useState<string | null>(null);

  // Step 1 - Bio
  const [bio, setBio] = useState("");
  const [city, setCity] = useState("");
  const [birthdate, setBirthdate] = useState("");

  // Step 2 - Preferences
  const [gender, setGender] = useState("homme");
  const [interestedIn, setInterestedIn] = useState("femme");
  const [lookingFor, setLookingFor] = useState("relation_serieuse");

  // Step 3 - Prompts
  const [prompts, setPrompts] = useState<PromptEntry[]>([
    { question: PROMPT_QUESTIONS[0], answer: "" },
    { question: PROMPT_QUESTIONS[4], answer: "" },
  ]);

  // Modals for picker selection
  const [pickerOpen, setPickerOpen] = useState<
    | "city"
    | "gender"
    | "interestedIn"
    | "lookingFor"
    | { kind: "promptQuestion"; index: number }
    | null
  >(null);

  const handlePickAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]) {
      setAvatarUri(result.assets[0].uri);
    }
  };

  const handleNext = async () => {
    setLoading(true);
    try {
      if (step === 0) {
        if (avatarUri) await uploadAvatar(avatarUri);
        setStep(1);
      } else if (step === 1) {
        await updateProfile({ bio, city, birthdate });
        setStep(2);
      } else if (step === 2) {
        await updateProfile({
          gender,
          interested_in: interestedIn,
          looking_for_type: lookingFor,
        });
        setStep(3);
      } else if (step === 3) {
        const filtered = prompts.filter((p) => p.answer.trim().length > 0);
        if (filtered.length > 0) await savePrompts(filtered);
        await completeOnboarding();
        router.replace("/(tabs)/discover");
      }
    } catch (e: unknown) {
      Alert.alert("Erreur", e instanceof Error ? e.message : "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    if (step < 3) {
      setStep(step + 1);
    } else {
      handleNext();
    }
  };

  const updatePromptQuestion = (index: number, question: string) => {
    const updated = [...prompts];
    updated[index] = { ...updated[index], question };
    setPrompts(updated);
  };

  const updatePromptAnswer = (index: number, answer: string) => {
    const updated = [...prompts];
    updated[index] = { ...updated[index], answer };
    setPrompts(updated);
  };

  const renderPickerModal = () => {
    let title = "";
    let options: { value: string; label: string }[] = [];
    let onSelect: (val: string) => void = () => {};

    if (pickerOpen === "city") {
      title = "Choisir une ville";
      options = CITIES.map((c) => ({ value: c, label: c }));
      onSelect = setCity;
    } else if (pickerOpen === "gender") {
      title = "Je suis";
      options = GENDERS;
      onSelect = setGender;
    } else if (pickerOpen === "interestedIn") {
      title = "Je cherche";
      options = INTERESTED_IN;
      onSelect = setInterestedIn;
    } else if (pickerOpen === "lookingFor") {
      title = "Type de relation";
      options = RELATION_TYPES;
      onSelect = setLookingFor;
    } else if (pickerOpen && typeof pickerOpen === "object") {
      title = "Choisir une question";
      options = PROMPT_QUESTIONS.map((q) => ({ value: q, label: q }));
      const idx = pickerOpen.index;
      onSelect = (val) => updatePromptQuestion(idx, val);
    }

    return (
      <Modal
        visible={pickerOpen !== null}
        animationType="slide"
        transparent
        onRequestClose={() => setPickerOpen(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>{title}</Text>
            <FlatList
              data={options}
              keyExtractor={(o) => o.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.optionRow}
                  onPress={() => {
                    onSelect(item.value);
                    setPickerOpen(null);
                  }}
                >
                  <Text style={styles.optionText}>{item.label}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity
              style={styles.modalClose}
              onPress={() => setPickerOpen(null)}
            >
              <Text style={styles.modalCloseText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.brand}>Lomi Lomi</Text>

        {/* Progress steps */}
        <View style={styles.steps}>
          {STEPS.map((label, i) => {
            const done = i < step;
            const active = i === step;
            return (
              <View key={label} style={styles.stepItem}>
                <View
                  style={[
                    styles.stepDot,
                    done && styles.stepDotDone,
                    active && styles.stepDotActive,
                  ]}
                >
                  {done ? (
                    <Ionicons name="checkmark" size={14} color="#fff" />
                  ) : (
                    <Text
                      style={[
                        styles.stepDotText,
                        active && styles.stepDotTextActive,
                      ]}
                    >
                      {i + 1}
                    </Text>
                  )}
                </View>
                <Text
                  style={[
                    styles.stepLabel,
                    active && styles.stepLabelActive,
                    done && styles.stepLabelDone,
                  ]}
                >
                  {label}
                </Text>
              </View>
            );
          })}
        </View>

        <View style={styles.card}>
          {step === 0 && (
            <View style={styles.center}>
              <Text style={styles.title}>Ajoutez votre photo</Text>
              <Text style={styles.subtitle}>
                Une belle photo augmente vos chances de 5x !
              </Text>
              <TouchableOpacity
                style={styles.avatarBtn}
                onPress={handlePickAvatar}
              >
                {avatarUri ? (
                  <Image source={{ uri: avatarUri }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Ionicons name="camera" size={36} color="#a78bfa" />
                  </View>
                )}
              </TouchableOpacity>
              <Text style={styles.hint}>Touchez pour choisir une photo</Text>
            </View>
          )}

          {step === 1 && (
            <View>
              <Text style={styles.title}>Présentez-vous</Text>
              <Text style={styles.label}>Bio</Text>
              <TextInput
                style={[styles.input, styles.textarea]}
                value={bio}
                onChangeText={setBio}
                placeholder="Parlez de vous en quelques mots…"
                placeholderTextColor="#666"
                multiline
                maxLength={500}
                numberOfLines={4}
              />
              <Text style={styles.label}>Ville</Text>
              <TouchableOpacity
                style={styles.selectInput}
                onPress={() => setPickerOpen("city")}
              >
                <Text
                  style={[
                    styles.selectInputText,
                    !city && styles.selectInputPlaceholder,
                  ]}
                >
                  {city || "Choisir…"}
                </Text>
                <Ionicons name="chevron-down" size={18} color="#9ca3af" />
              </TouchableOpacity>
              <Text style={styles.label}>Date de naissance (AAAA-MM-JJ)</Text>
              <TextInput
                style={styles.input}
                value={birthdate}
                onChangeText={setBirthdate}
                placeholder="1995-01-15"
                placeholderTextColor="#666"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          )}

          {step === 2 && (
            <View>
              <Text style={styles.title}>Vos préférences</Text>
              <Text style={styles.label}>Je suis</Text>
              <TouchableOpacity
                style={styles.selectInput}
                onPress={() => setPickerOpen("gender")}
              >
                <Text style={styles.selectInputText}>
                  {GENDERS.find((g) => g.value === gender)?.label}
                </Text>
                <Ionicons name="chevron-down" size={18} color="#9ca3af" />
              </TouchableOpacity>

              <Text style={styles.label}>Je cherche</Text>
              <TouchableOpacity
                style={styles.selectInput}
                onPress={() => setPickerOpen("interestedIn")}
              >
                <Text style={styles.selectInputText}>
                  {INTERESTED_IN.find((g) => g.value === interestedIn)?.label}
                </Text>
                <Ionicons name="chevron-down" size={18} color="#9ca3af" />
              </TouchableOpacity>

              <Text style={styles.label}>Type de relation</Text>
              <TouchableOpacity
                style={styles.selectInput}
                onPress={() => setPickerOpen("lookingFor")}
              >
                <Text style={styles.selectInputText}>
                  {RELATION_TYPES.find((r) => r.value === lookingFor)?.label}
                </Text>
                <Ionicons name="chevron-down" size={18} color="#9ca3af" />
              </TouchableOpacity>
            </View>
          )}

          {step === 3 && (
            <View>
              <Text style={styles.title}>Vos prompts</Text>
              <Text style={styles.subtitle}>
                Répondez à ces questions pour vous démarquer.
              </Text>
              {prompts.map((p, i) => (
                <View key={i} style={{ marginBottom: 12 }}>
                  <TouchableOpacity
                    style={styles.selectInput}
                    onPress={() =>
                      setPickerOpen({ kind: "promptQuestion", index: i })
                    }
                  >
                    <Text style={styles.selectInputText} numberOfLines={1}>
                      {p.question}
                    </Text>
                    <Ionicons name="chevron-down" size={18} color="#9ca3af" />
                  </TouchableOpacity>
                  <TextInput
                    style={styles.input}
                    value={p.answer}
                    onChangeText={(t) => updatePromptAnswer(i, t)}
                    placeholder="Votre réponse…"
                    placeholderTextColor="#666"
                    maxLength={200}
                  />
                </View>
              ))}
              {prompts.length < 3 ? (
                <TouchableOpacity
                  onPress={() =>
                    setPrompts([
                      ...prompts,
                      {
                        question:
                          PROMPT_QUESTIONS[prompts.length + 1] ||
                          PROMPT_QUESTIONS[0],
                        answer: "",
                      },
                    ])
                  }
                >
                  <Text style={styles.addPromptText}>+ Ajouter un prompt</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          )}

          {/* Buttons */}
          <View style={styles.actions}>
            {step > 0 ? (
              <TouchableOpacity
                style={[styles.button, styles.buttonGhost]}
                onPress={() => setStep(step - 1)}
                disabled={loading}
              >
                <Text style={styles.buttonGhostText}>Retour</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              style={[
                styles.button,
                styles.buttonPrimary,
                loading && styles.buttonDisabled,
              ]}
              onPress={handleNext}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonPrimaryText}>
                  {step === 3 ? "Terminer" : "Suivant"}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={handleSkip} style={styles.skipBtn}>
            <Text style={styles.skipText}>
              {step === 3 ? "Terminer plus tard" : "Passer cette étape"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {renderPickerModal()}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a0a" },
  scroll: { padding: 24, paddingTop: 60, paddingBottom: 40 },
  brand: {
    color: "#a78bfa",
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 24,
    letterSpacing: 1.5,
  },
  steps: {
    flexDirection: "row",
    marginBottom: 24,
    gap: 6,
  },
  stepItem: { flex: 1, alignItems: "center", gap: 4 },
  stepDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#1f1f23",
    alignItems: "center",
    justifyContent: "center",
  },
  stepDotActive: { backgroundColor: "#7c3aed" },
  stepDotDone: { backgroundColor: "#22c55e" },
  stepDotText: { color: "#666", fontSize: 13, fontWeight: "700" },
  stepDotTextActive: { color: "#fff" },
  stepLabel: { color: "#555", fontSize: 11 },
  stepLabelActive: { color: "#fff", fontWeight: "600" },
  stepLabelDone: { color: "#9ca3af" },
  card: {
    backgroundColor: "#111114",
    borderWidth: 1,
    borderColor: "#1f1f23",
    borderRadius: 16,
    padding: 20,
  },
  center: { alignItems: "center" },
  title: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    color: "#9ca3af",
    fontSize: 13,
    textAlign: "center",
    marginBottom: 16,
  },
  hint: { color: "#666", fontSize: 12, marginTop: 8 },
  avatarBtn: { marginVertical: 16 },
  avatar: {
    width: 128,
    height: 128,
    borderRadius: 64,
    borderWidth: 3,
    borderColor: "#7c3aed",
  },
  avatarPlaceholder: {
    width: 128,
    height: 128,
    borderRadius: 64,
    backgroundColor: "#1f1239",
    borderWidth: 2,
    borderColor: "#7c3aed",
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    color: "#9ca3af",
    fontSize: 13,
    marginBottom: 6,
    marginTop: 8,
  },
  input: {
    backgroundColor: "#1a1a1a",
    borderWidth: 1,
    borderColor: "#2a2a2a",
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: "#fff",
  },
  textarea: { minHeight: 80, textAlignVertical: "top" },
  selectInput: {
    backgroundColor: "#1a1a1a",
    borderWidth: 1,
    borderColor: "#2a2a2a",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  selectInputText: { color: "#fff", fontSize: 15, flex: 1, marginRight: 8 },
  selectInputPlaceholder: { color: "#666" },
  addPromptText: { color: "#a78bfa", fontSize: 14, marginTop: 4 },
  actions: { flexDirection: "row", gap: 10, marginTop: 24 },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonPrimary: { backgroundColor: "#7c3aed" },
  buttonPrimaryText: { color: "#fff", fontSize: 15, fontWeight: "600" },
  buttonGhost: { backgroundColor: "#1f1f23" },
  buttonGhostText: { color: "#e5e7eb", fontSize: 15, fontWeight: "500" },
  buttonDisabled: { opacity: 0.6 },
  skipBtn: { marginTop: 12, alignItems: "center", paddingVertical: 8 },
  skipText: { color: "#6b7280", fontSize: 13 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#1a1a1a",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "70%",
    paddingTop: 16,
  },
  modalTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 12,
  },
  optionRow: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#333",
  },
  optionText: { color: "#fff", fontSize: 15 },
  modalClose: {
    padding: 16,
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#333",
  },
  modalCloseText: { color: "#a78bfa", fontSize: 15, fontWeight: "600" },
});
