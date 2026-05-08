import { useEffect, useRef } from "react";
import Constants from "expo-constants";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { registerPushToken } from "./api";

// Must be set at module level — runs before any component mounts.
// Controls how notifications are displayed when the app is in the FOREGROUND.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function getProjectId(): string | undefined {
  const extra = Constants.expoConfig?.extra as
    | { eas?: { projectId?: string }; projectId?: string }
    | undefined;
  const easConfig = (Constants as unknown as { easConfig?: { projectId?: string } }).easConfig;
  return (
    extra?.eas?.projectId ||
    extra?.projectId ||
    easConfig?.projectId
  );
}

async function setupAndroidChannels() {
  await Notifications.setNotificationChannelAsync("messages", {
    name: "Messages",
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#2563eb",
    sound: "default",
    showBadge: true,
  });
  await Notifications.setNotificationChannelAsync("calls", {
    name: "Appels",
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 500, 200, 500],
    lightColor: "#22c55e",
    sound: "default",
    showBadge: true,
    bypassDnd: true,
  });
  await Notifications.setNotificationChannelAsync("matches", {
    name: "Matchs & Notifications",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#ec4899",
    sound: "default",
    showBadge: true,
  });
  await Notifications.setNotificationChannelAsync("default", {
    name: "Général",
    importance: Notifications.AndroidImportance.DEFAULT,
    showBadge: true,
  });
}

/** Request permissions and register the Expo push token with the backend. */
export async function registerForPushNotifications(): Promise<string | null> {
  if (Platform.OS === "web") return null;

  if (Platform.OS === "android") {
    await setupAndroidChannels();
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") return null;

  let token: string;
  try {
    if (Platform.OS === "android") {
      // Native FCM token — used directly by Firebase Admin SDK on the backend
      const result = await Notifications.getDevicePushTokenAsync();
      token = result.data as string;
    } else {
      // Expo token for iOS (APNs via Expo Push Service)
      const projectId = getProjectId();
      const result = await Notifications.getExpoPushTokenAsync(
        projectId ? { projectId } : undefined,
      );
      token = result.data;
    }
  } catch {
    return null;
  }

  // Retry up to 3 times if the backend call fails
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await registerPushToken(token);
      break;
    } catch {
      if (attempt < 2) await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
    }
  }

  return token;
}

function handleNotificationTap(data: Record<string, unknown>) {
  if (data?.type === "call") {
    const room = data.call_room ? String(data.call_room) : "";
    const callType = data.call_type ? String(data.call_type) : "audio";
    const callId = data.call_id ? String(data.call_id) : undefined;
    if (room) {
      router.push({
        pathname: "/call",
        params: { room, callType, ...(callId ? { callId } : {}) },
      });
    } else {
      router.push("/(tabs)/calls");
    }
  } else if (data?.type === "message" && data?.conversation_id) {
    router.push({
      pathname: "/chat/[id]",
      params: { id: String(data.conversation_id) },
    });
  } else if (data?.type === "match" && data?.match_user_id) {
    router.push({
      pathname: "/user/[id]",
      params: { id: String(data.match_user_id) },
    });
  } else if (data?.type === "superlike" && data?.user_id) {
    router.push({
      pathname: "/user/[id]",
      params: { id: String(data.user_id) },
    });
  } else if (
    (data?.type === "order" || data?.type === "payment") &&
    data?.order_id
  ) {
    router.push({
      pathname: "/order/[id]",
      params: { id: String(data.order_id) },
    });
  } else if (String(data?.type || "").startsWith("delivery")) {
    router.push("/orders");
  }
}

/** Hook: register on login and listen for taps. Re-registers token on every mount. */
export function usePushNotifications(isLoggedIn: boolean) {
  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    if (!isLoggedIn) return;

    // Re-register on every login / app resume — ensures stale tokens are refreshed
    registerForPushNotifications();

    notificationListener.current =
      Notifications.addNotificationReceivedListener(() => {
        // Foreground display is handled by setNotificationHandler above
      });

    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data as Record<
          string,
          unknown
        >;
        handleNotificationTap(data);
      });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [isLoggedIn]);
}

/** Call once at app start to handle taps on notifications that launched the app from killed state. */
export async function handleInitialNotification() {
  const response = await Notifications.getLastNotificationResponseAsync();
  if (response) {
    const data = response.notification.request.content.data as Record<
      string,
      unknown
    >;
    handleNotificationTap(data);
  }
}
