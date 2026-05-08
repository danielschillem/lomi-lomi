import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { WSProvider } from "@/lib/ws-context";
import { ThemeProvider, useTheme } from "@/lib/theme-context";
import { usePushNotifications } from "@/lib/push-notifications";
import IncomingCallModal from "@/app/components/IncomingCallModal";

function InnerLayout() {
  const { user } = useAuth();
  const { colors } = useTheme();
  usePushNotifications(!!user);

  return (
    <>
      <StatusBar style={colors.statusBar} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.headerBg },
          headerTintColor: colors.headerText,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="login"
          options={{ title: "Connexion", headerShown: false }}
        />
        <Stack.Screen
          name="register"
          options={{ title: "Inscription", headerShown: false }}
        />
        <Stack.Screen name="chat/[id]" options={{ title: "Chat" }} />
        <Stack.Screen name="user/[id]" options={{ title: "Profil" }} />
        <Stack.Screen name="place/[id]" options={{ title: "Lieu" }} />
        <Stack.Screen name="wellness/[id]" options={{ title: "Prestataire" }} />
        <Stack.Screen name="product/[id]" options={{ title: "Produit" }} />
        <Stack.Screen name="order/[id]" options={{ title: "Commande" }} />
        <Stack.Screen name="ride/[id]" options={{ title: "Course" }} />
        <Stack.Screen
          name="edit-profile"
          options={{ title: "Modifier le profil" }}
        />
        <Stack.Screen name="photos" options={{ title: "Mes photos" }} />
        <Stack.Screen name="settings" options={{ title: "Paramètres" }} />
        <Stack.Screen
          name="blocked"
          options={{ title: "Utilisateurs bloqués" }}
        />
        <Stack.Screen name="addresses" options={{ title: "Mes adresses" }} />
        <Stack.Screen
          name="reservations"
          options={{ title: "Mes réservations" }}
        />
        <Stack.Screen name="bookings" options={{ title: "Mes rendez-vous" }} />
        <Stack.Screen name="orders" options={{ title: "Mes commandes" }} />
        <Stack.Screen name="rides" options={{ title: "Mes courses" }} />
        <Stack.Screen name="location" options={{ title: "Partage de position" }} />
        <Stack.Screen name="carte" options={{ title: "Carte des lieux" }} />
      </Stack>
      <IncomingCallModal />
    </>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <WSProvider>
          <InnerLayout />
        </WSProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
