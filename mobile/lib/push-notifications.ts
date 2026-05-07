import { useEffect, useRef } from "react";
import Constants from "expo-constants";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { registerPushToken } from "./api";

// Configure how notifications appear when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/** Register for push notifications and save token to backend. */
export async function registerForPushNotifications(): Promise<string | null> {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined" && "Notification" in window) {
      if (window.Notification.permission === "default") {
        await window.Notification.requestPermission();
      }
    }
    return null;
  }

  // Android notification channel
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#2563eb",
    });
  }

  // Check permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    return null;
  }

  // Get Expo push token
  const constantsWithEAS = Constants as typeof Constants & {
    easConfig?: { projectId?: string };
  };
  const projectId =
    (Constants.expoConfig?.extra?.eas as { projectId?: string } | undefined)
      ?.projectId || constantsWithEAS.easConfig?.projectId;
  const tokenData = await Notifications.getExpoPushTokenAsync(
    projectId ? { projectId } : undefined,
  );
  const token = tokenData.data;

  // Save token to backend
  try {
    await registerPushToken(token);
  } catch {
    // Token will be registered on next app launch
  }

  return token;
}

/** Hook to register push and handle notification taps. */
export function usePushNotifications(isLoggedIn: boolean) {
  const notificationListener = useRef<Notifications.EventSubscription | null>(
    null,
  );
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    if (!isLoggedIn) return;

    // Register on login
    registerForPushNotifications();

    // Listen for incoming notifications (foreground)
    notificationListener.current =
      Notifications.addNotificationReceivedListener(() => {
        // Notification received in foreground - handled by the handler above
      });

    // Listen for notification taps (user opens notification)
    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data as Record<
          string,
          unknown
        >;

        if (data?.type === "message" && data?.conversation_id) {
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
      });

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(
          notificationListener.current,
        );
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, [isLoggedIn]);
}
