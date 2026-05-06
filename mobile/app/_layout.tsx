import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { WSProvider } from "@/lib/ws-context";
import { usePushNotifications } from "@/lib/push-notifications";

function InnerLayout() {
  const { user } = useAuth();
  usePushNotifications(!!user);

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: "#0a0a0a" },
          headerTintColor: "#fff",
          contentStyle: { backgroundColor: "#0a0a0a" },
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
    </>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <WSProvider>
        <InnerLayout />
      </WSProvider>
    </AuthProvider>
  );
}
