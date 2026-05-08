import { useEffect, useRef } from "react";
import {
  PermissionsAndroid,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { WebView, WebViewNavigation } from "react-native-webview";
import { useLocalSearchParams, router, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { updateCallStatus } from "@/lib/api";

export default function CallScreen() {
  const { room, callType, callId } = useLocalSearchParams<{
    room: string;
    callType: string;
    callId?: string;
  }>();

  const ended = useRef(false);

  useEffect(() => {
    if (Platform.OS !== "android") return;
    PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.CAMERA,
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
    ]).catch(() => {});
  }, []);

  // Force desktop mode via URL param so Jitsi skips the "open native app" redirect
  const jitsiUrl =
    callType === "video"
      ? `https://meet.jit.si/${room}?skipPrejoin=true`
      : `https://meet.jit.si/${room}?skipPrejoin=true#config.startWithVideoMuted=true`;

  const endCall = async () => {
    if (ended.current) return;
    ended.current = true;
    if (callId) {
      updateCallStatus(Number(callId), "ended").catch(() => {});
    }
    router.back();
  };

  // Detect when Jitsi redirects to its goodbye page after leaving
  const onNavigationStateChange = (nav: WebViewNavigation) => {
    if (
      nav.url.includes("/close") ||
      nav.url.includes("close3.html") ||
      nav.url === "about:blank"
    ) {
      endCall();
    }
  };

  // Inject JS: listen to Jitsi's internal hangup event and post a message back
  const injectedJS = `
    (function() {
      var interval = setInterval(function() {
        var hangup = document.querySelector('[data-testid="hangup-button"], .toolbox-button[aria-label*="Leave"], .toolbox-button[aria-label*="Quitter"], button[aria-label*="Leave meeting"], button[aria-label*="End call"]');
        if (hangup) {
          clearInterval(interval);
          hangup.addEventListener('click', function() {
            window.ReactNativeWebView.postMessage('ended');
          });
        }
      }, 1500);
    })();
    true;
  `;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar hidden />

      <WebView
        source={{ uri: jitsiUrl }}
        style={styles.webview}
        // Desktop UA: prevents Jitsi from detecting Android and redirecting to intent://
        userAgent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
        // Block intent:// and market:// deep links; WebView can't handle them
        onShouldStartLoadWithRequest={(req: { url: string }) => {
          const { url } = req;
          if (url.startsWith("intent://") || url.startsWith("market://") || url.startsWith("org.jitsi.meet://")) {
            return false;
          }
          return true;
        }}
        mediaCapturePermissionGrantType="grant"
        injectedJavaScript={injectedJS}
        onMessage={(e) => {
          if (e.nativeEvent.data === "ended") endCall();
        }}
        onNavigationStateChange={onNavigationStateChange}
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        javaScriptEnabled
        domStorageEnabled
        allowsFullscreenVideo
        originWhitelist={["https://*", "http://*", "about:*"]}
        mixedContentMode="always"
      />

      {/* Floating end-call button stays reachable */}
      <TouchableOpacity style={styles.endBtn} onPress={endCall} activeOpacity={0.85}>
        <Ionicons name="call" size={26} color="#fff" style={styles.endIcon} />
        <Text style={styles.endLabel}>Terminer</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  webview: { flex: 1 },
  endBtn: {
    position: "absolute",
    bottom: 36,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#ef4444",
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: 40,
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  endIcon: { transform: [{ rotate: "135deg" }] },
  endLabel: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
