import { Redirect } from "expo-router";
import { useAuth } from "@/lib/auth-context";
import { ActivityIndicator, View } from "react-native";
import { useTheme } from "@/lib/theme-context";

export default function Index() {
  const { colors } = useTheme();
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (!user) return <Redirect href="/login" />;
  return <Redirect href="/(tabs)/discover" />;
}
