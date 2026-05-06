import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type ScreenStateMode = "loading" | "empty" | "error";

interface ScreenStateProps {
  mode: ScreenStateMode;
  title: string;
  subtitle?: string;
  buttonLabel?: string;
  onPressButton?: () => void;
}

export default function ScreenState({
  mode,
  title,
  subtitle,
  buttonLabel,
  onPressButton,
}: ScreenStateProps) {
  if (mode === "loading") {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#7c3aed" />
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
    );
  }

  return (
    <View style={styles.center}>
      <Ionicons
        name={mode === "error" ? "warning-outline" : "information-circle-outline"}
        size={56}
        color={mode === "error" ? "#ef4444" : "#333"}
      />
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {buttonLabel && onPressButton ? (
        <TouchableOpacity style={styles.button} onPress={onPressButton}>
          <Text style={styles.buttonText}>{buttonLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    backgroundColor: "#0a0a0a",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  title: {
    color: "#fff",
    fontSize: 16,
    marginTop: 12,
    textAlign: "center",
    fontWeight: "600",
  },
  subtitle: {
    color: "#888",
    fontSize: 14,
    marginTop: 8,
    textAlign: "center",
  },
  button: {
    marginTop: 18,
    backgroundColor: "#7c3aed",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
  },
});
