import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/lib/theme-context";

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
  const { colors } = useTheme();

  if (mode === "loading") {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: "center", alignItems: "center", paddingHorizontal: 24 }}>
        <ActivityIndicator size="large" color={colors.accent} />
        {subtitle ? (
          <Text style={{ color: colors.textMuted, fontSize: 14, marginTop: 8, textAlign: "center" }}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: "center", alignItems: "center", paddingHorizontal: 24 }}>
      <Ionicons
        name={mode === "error" ? "warning-outline" : "information-circle-outline"}
        size={56}
        color={mode === "error" ? colors.error : colors.border}
      />
      <Text style={{ color: colors.text, fontSize: 16, marginTop: 12, textAlign: "center", fontWeight: "600" }}>
        {title}
      </Text>
      {subtitle ? (
        <Text style={{ color: colors.textMuted, fontSize: 14, marginTop: 8, textAlign: "center" }}>
          {subtitle}
        </Text>
      ) : null}
      {buttonLabel && onPressButton ? (
        <TouchableOpacity
          style={{ marginTop: 18, backgroundColor: colors.accent, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10 }}
          onPress={onPressButton}
        >
          <Text style={{ color: "#fff", fontWeight: "600" }}>{buttonLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}
