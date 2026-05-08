import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
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
  const { room, callType, callId, userName } = useLocalSearchParams<{
    room: string;
    callType: string;
    callId?: string;
    userName?: string;
  }>();

  const ended = useRef(false);
  const [meetError, setMeetError] = useState(false);
  const [retryNonce, setRetryNonce] = useState(0);
  const isVideo = callType === "video";
  const displayName = encodeURIComponent(userName || "TextMe User");

  useEffect(() => {
    if (Platform.OS !== "android") return;
    PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.CAMERA,
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
    ]).catch(() => {});
  }, []);

  // Hash params control Jitsi behaviour client-side.
  // They skip prejoin, set the display name and disable native-app prompts.
  const configHash = [
    "config.prejoinPageEnabled=false",
    "config.prejoinConfig.enabled=false",
    "config.startWithAudioMuted=false",
    `config.startWithVideoMuted=${!isVideo}`,
    "config.disableDeepLinking=true",
    "config.enableInsecureRoomNameWarning=false",
    "config.p2p.enabled=false",
    "config.resolution=360",
    "config.disableLobbyChat=true",
    "config.lobby.enabled=false",
    `userInfo.displayName=${displayName}`,
  ].join("&");

  const meetBaseUrl = "https://meet.texto.life";
  const jitsiUrl = `${meetBaseUrl}/${room}#${configHash}`;

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

      {meetError ? (
        <View style={styles.errorPanel}>
          <View style={styles.errorIcon}>
            <Ionicons name="videocam-off-outline" size={34} color="#fff" />
          </View>
          <Text style={styles.errorTitle}>Appel TextMe indisponible</Text>
          <Text style={styles.errorText}>
            Le serveur d'appel TextMe n'est pas encore accessible. Active le DNS
            de meet.texto.life, puis relance l'appel.
          </Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => {
              setMeetError(false);
              setRetryNonce((value) => value + 1);
            }}
            activeOpacity={0.85}
          >
            <Ionicons name="refresh" size={18} color="#111827" />
            <Text style={styles.retryLabel}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <WebView
          key={`${jitsiUrl}-${retryNonce}`}
          source={{ uri: jitsiUrl }}
          style={styles.webview}
          startInLoadingState
          renderLoading={() => (
            <View style={styles.loadingPanel}>
              <ActivityIndicator color="#fff" size="large" />
              <Text style={styles.loadingText}>Connexion TextMe...</Text>
            </View>
          )}
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
          onError={() => setMeetError(true)}
          onHttpError={(event) => {
            if (event.nativeEvent.statusCode >= 400) setMeetError(true);
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
      )}

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
  loadingPanel: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    backgroundColor: "#050505",
  },
  loadingText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  errorPanel: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
    backgroundColor: "#050505",
  },
  errorIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
    backgroundColor: "#2563eb",
  },
  errorTitle: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 10,
  },
  errorText: {
    color: "#cbd5e1",
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    maxWidth: 340,
  },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 24,
    backgroundColor: "#fff",
    borderRadius: 28,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  retryLabel: { color: "#111827", fontWeight: "800", fontSize: 15 },
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
