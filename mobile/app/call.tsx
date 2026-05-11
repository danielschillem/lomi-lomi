import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Linking,
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

type SearchParam = string | string[] | undefined;

const normalizeParam = (value: SearchParam) => {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
};

const getInitials = (name: string) => {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) {
    return "TM";
  }

  return parts
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
};

const formatDuration = (seconds: number) => {
  const minutes = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const remainingSeconds = (seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${remainingSeconds}`;
};

export default function CallScreen() {
  const params = useLocalSearchParams<{
    room?: string | string[];
    callType?: string | string[];
    callId?: string | string[];
    userName?: string | string[];
  }>();

  const webViewRef = useRef<WebView>(null);
  const ended = useRef(false);
  const room = normalizeParam(params.room) || "";
  const callTypeValue = normalizeParam(params.callType) || "audio";
  const callIdValue = normalizeParam(params.callId);
  const contactName = normalizeParam(params.userName) || "TextMe";
  const isVideo = callTypeValue === "video";

  const [meetError, setMeetError] = useState(false);
  const [permissionsReady, setPermissionsReady] = useState(Platform.OS !== "android");
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);
  const [webLoaded, setWebLoaded] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [lastMediaWarning, setLastMediaWarning] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [micMuted, setMicMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(!isVideo);

  const displayName = encodeURIComponent(contactName || "TextMe User");
  const toolbarButtons = encodeURIComponent(
    JSON.stringify(["microphone", "camera", "toggle-camera", "hangup"]),
  );

  useEffect(() => {
    setCameraOff(!isVideo);
  }, [isVideo, retryNonce]);

  useEffect(() => {
    if (!webLoaded) {
      setElapsedSeconds(0);
      return undefined;
    }

    const timer = setInterval(() => {
      setElapsedSeconds((value) => value + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [webLoaded]);

  useEffect(() => {
    if (!room) {
      setMeetError(true);
    }
  }, [room]);

  useEffect(() => {
    let cancelled = false;

    const requestPermissions = async () => {
      setPermissionError(null);
      setLastMediaWarning(null);

      if (Platform.OS !== "android") {
        setPermissionsReady(true);
        return;
      }

      try {
        const permissions = [
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          ...(isVideo ? [PermissionsAndroid.PERMISSIONS.CAMERA] : []),
        ];

        const result = await PermissionsAndroid.requestMultiple(permissions);
        if (cancelled) {
          return;
        }

        const missing = permissions.filter(
          (permission) => result[permission] !== PermissionsAndroid.RESULTS.GRANTED,
        );
        const blocked = missing.some(
          (permission) => result[permission] === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN,
        );

        if (missing.length > 0) {
          setPermissionsReady(false);
          setPermissionError(
            blocked
              ? "Android bloque l'acces au micro ou a la camera. Ouvre les reglages TextMe pour les autoriser."
              : "TextMe a besoin du micro et de la camera pour lancer cet appel.",
          );
          return;
        }

        setPermissionsReady(true);
      } catch (error) {
        if (!cancelled) {
          setPermissionsReady(false);
          setPermissionError("Impossible de verifier les permissions micro et camera.");
        }
      }
    };

    requestPermissions();

    return () => {
      cancelled = true;
    };
  }, [isVideo, retryNonce]);

  const configHash = useMemo(
    () =>
      [
        "config.prejoinPageEnabled=false",
        "config.prejoinConfig.enabled=false",
        "config.startAudioMuted=10",
        "config.startVideoMuted=10",
        "config.startWithAudioMuted=false",
        `config.startWithVideoMuted=${isVideo ? "false" : "true"}`,
        "config.startSilent=false",
        "config.disableInitialGUM=false",
        "config.disableDeepLinking=true",
        "config.enableInsecureRoomNameWarning=false",
        "config.p2p.enabled=false",
        `config.toolbarButtons=${toolbarButtons}`,
        "config.toolbarConfig.alwaysVisible=false",
        "config.disableInviteFunctions=true",
        "config.disablePolls=true",
        "config.disableReactions=true",
        "config.disableRemoteVideoMenu=true",
        "config.disableProfile=true",
        "config.disableShortcuts=true",
        "config.hideConferenceSubject=true",
        "config.disableModeratorIndicator=true",
        "config.participantsPane.enabled=false",
        "config.speakerStats.disabled=true",
        "config.whiteboard.enabled=false",
        "config.resolution=360",
        "config.disableLobbyChat=true",
        "config.lobby.enabled=false",
        `userInfo.displayName=${displayName}`,
      ].join("&"),
    [displayName, isVideo, toolbarButtons],
  );

  const meetBaseUrl = "https://meet.texto.life";
  const jitsiUrl = room ? `${meetBaseUrl}/${encodeURIComponent(room)}#${configHash}` : "";

  const callLabel = isVideo ? "Appel video" : "Appel audio";
  const initials = getInitials(contactName);
  const connectionLabel = useMemo(() => {
    if (permissionError) {
      return "Permissions a activer";
    }
    if (!permissionsReady) {
      return "Preparation";
    }
    if (!webLoaded) {
      const percent = Math.max(10, Math.round(loadProgress * 100));
      return `Connexion ${percent}%`;
    }
    if (lastMediaWarning) {
      return "Media a verifier";
    }
    return `En ligne ${formatDuration(elapsedSeconds)}`;
  }, [elapsedSeconds, lastMediaWarning, loadProgress, permissionError, permissionsReady, webLoaded]);

  const endCall = async () => {
    if (ended.current) return;
    ended.current = true;

    try {
      webViewRef.current?.injectJavaScript(`
        (function () {
          var buttons = Array.prototype.slice.call(document.querySelectorAll('button,[role="button"]'));
          var hangup = buttons.find(function (button) {
            var label = [
              button.getAttribute('aria-label') || '',
              button.getAttribute('data-testid') || '',
              button.textContent || ''
            ].join(' ').toLowerCase();
            return label.indexOf('hangup') !== -1 || label.indexOf('terminer') !== -1 || label.indexOf('end') !== -1;
          });
          if (hangup) { hangup.click(); }
        })();
        true;
      `);

      if (callIdValue) {
        await updateCallStatus(parseInt(callIdValue, 10), "ended");
      }
    } catch {
      // The user is leaving the room anyway, so a status failure should not trap them here.
    } finally {
      router.back();
    }
  };

  const clickJitsiControl = (keywords: string[]) => {
    webViewRef.current?.injectJavaScript(`
      (function () {
        var keywords = ${JSON.stringify(keywords)};
        var buttons = Array.prototype.slice.call(document.querySelectorAll('button,[role="button"]'));
        var target = buttons.find(function (button) {
          var label = [
            button.getAttribute('aria-label') || '',
            button.getAttribute('data-testid') || '',
            button.textContent || ''
          ].join(' ').toLowerCase();
          return keywords.some(function (keyword) { return label.indexOf(keyword) !== -1; });
        });
        if (target) { target.click(); }
      })();
      true;
    `);
  };

  const toggleMicrophone = () => {
    setMicMuted((value) => !value);
    clickJitsiControl(["microphone", "micro", "mute", "muet"]);
  };

  const toggleCamera = () => {
    if (!isVideo) return;
    setCameraOff((value) => !value);
    clickJitsiControl(["camera", "caméra", "video", "vidéo"]);
  };

  const switchCamera = () => {
    if (!isVideo) return;
    clickJitsiControl(["toggle-camera", "switch camera", "changer de camera", "basculer"]);
  };

  const onNavigationStateChange = (navState: WebViewNavigation) => {
    if (navState.url.includes("close3.html") || navState.url.includes("/close")) {
      endCall();
    }
  };

  const handleMessage = (event: { nativeEvent: { data: string } }) => {
    const rawMessage = event.nativeEvent.data;
    if (rawMessage === "ended") {
      endCall();
      return;
    }

    try {
      const message = JSON.parse(rawMessage) as {
        type?: string;
        payload?: Record<string, unknown>;
      };

      if (message.type === "jitsi-ready") {
        setWebLoaded(true);
        return;
      }

      if (message.type === "media-devices") {
        const videoInputs = Number(message.payload?.videoInputs || 0);
        const audioInputs = Number(message.payload?.audioInputs || 0);

        if (audioInputs === 0) {
          setLastMediaWarning("Aucun micro detecte par le telephone.");
        } else if (isVideo && videoInputs === 0) {
          setLastMediaWarning("Aucune camera detectee par le telephone.");
        }
        return;
      }

      if (message.type === "media-error") {
        const errorName = String(message.payload?.name || "");
        const errorMessage = String(message.payload?.message || "");
        const normalizedError = `${errorName} ${errorMessage}`.toLowerCase();

        if (
          normalizedError.includes("notallowed") ||
          normalizedError.includes("permission") ||
          normalizedError.includes("denied")
        ) {
          setPermissionError("La camera ou le micro est bloque par Android. Autorise TextMe dans les reglages.");
        } else if (normalizedError.includes("notfound")) {
          setLastMediaWarning("Camera ou micro introuvable sur ce telephone.");
        } else {
          setLastMediaWarning("La camera n'a pas repondu. Essaie de couper puis relancer la camera.");
        }
      }
    } catch {
      // Ignore non-JSON messages coming from the embedded meeting page.
    }
  };

  const retryCall = () => {
    setMeetError(false);
    setPermissionError(null);
    setLastMediaWarning(null);
    setWebLoaded(false);
    setLoadProgress(0);
    setRetryNonce((value) => value + 1);
  };

  const openAppSettings = () => {
    Linking.openSettings().catch(() => undefined);
  };

  const injectedJS = `
    (function () {
      var sentReady = false;
      var sentDevices = false;
      var sentMediaError = false;

      function send(type, payload) {
        try {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: type, payload: payload || {} }));
        } catch (error) {}
      }

      function labelOf(element) {
        return [
          element.getAttribute('aria-label') || '',
          element.getAttribute('data-testid') || '',
          element.textContent || ''
        ].join(' ').toLowerCase();
      }

      function bindHangup() {
        var buttons = Array.prototype.slice.call(document.querySelectorAll('button,[role="button"]'));
        buttons.forEach(function (button) {
          if (button.dataset.textmeHangupBound === '1') {
            return;
          }
          var label = labelOf(button);
          if (label.indexOf('hangup') !== -1 || label.indexOf('terminer') !== -1 || label.indexOf('end') !== -1) {
            button.dataset.textmeHangupBound = '1';
            button.addEventListener('click', function () {
              window.ReactNativeWebView.postMessage('ended');
            });
          }
        });
      }

      function reportDevices() {
        if (sentDevices || !navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
          return;
        }

        navigator.mediaDevices.enumerateDevices()
          .then(function (devices) {
            sentDevices = true;
            send('media-devices', {
              audioInputs: devices.filter(function (device) { return device.kind === 'audioinput'; }).length,
              videoInputs: devices.filter(function (device) { return device.kind === 'videoinput'; }).length
            });
          })
          .catch(function (error) {
            if (!sentMediaError) {
              sentMediaError = true;
              send('media-error', { name: error.name, message: error.message });
            }
          });
      }

      window.addEventListener('unhandledrejection', function (event) {
        var reason = event.reason || {};
        var message = reason.message || String(reason);
        var name = reason.name || 'UnhandledPromiseRejection';
        var normalized = String(name + ' ' + message).toLowerCase();
        if (
          !sentMediaError &&
          (normalized.indexOf('camera') !== -1 ||
            normalized.indexOf('microphone') !== -1 ||
            normalized.indexOf('media') !== -1 ||
            normalized.indexOf('permission') !== -1)
        ) {
          sentMediaError = true;
          send('media-error', { name: name, message: message });
        }
      });

      var interval = window.setInterval(function () {
        bindHangup();
        reportDevices();

        if (!sentReady) {
          var hasToolbar = document.querySelector('[data-testid*="toolbar"], .toolbox-content, .new-toolbox');
          var hasVideo = document.querySelector('video');
          if (hasToolbar || hasVideo) {
            sentReady = true;
            send('jitsi-ready', {});
          }
        }
      }, 900);

      window.addEventListener('beforeunload', function () {
        window.clearInterval(interval);
      });
    })();
    true;
  `;

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      <Stack.Screen options={{ headerShown: false }} />

      {permissionError || meetError ? (
        <View style={styles.errorScreen}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.errorTitle}>
            {permissionError ? "Appel bloque" : "Salle d'appel introuvable"}
          </Text>
          <Text style={styles.errorText}>
            {permissionError ||
              "TextMe n'a pas recu les informations necessaires pour ouvrir cet appel."}
          </Text>
          <View style={styles.errorActions}>
            {permissionError ? (
              <TouchableOpacity style={styles.secondaryButton} onPress={openAppSettings}>
                <Ionicons name="settings-outline" size={18} color="#F7F7F7" />
                <Text style={styles.secondaryButtonText}>Reglages</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity style={styles.primaryButton} onPress={retryCall}>
              <Ionicons name="refresh-outline" size={18} color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>Reessayer</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.leaveButton} onPress={endCall}>
            <Text style={styles.leaveButtonText}>Fermer</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {!permissionError && !meetError && permissionsReady && jitsiUrl ? (
        <WebView
          ref={webViewRef}
          key={`${room}-${retryNonce}`}
          source={{ uri: jitsiUrl }}
          style={styles.webview}
          onLoadStart={() => {
            setWebLoaded(false);
            setLoadProgress(0.08);
          }}
          onShouldStartLoadWithRequest={(request: { url: string }) => {
            const url = request.url;
            if (
              url.startsWith("intent://") ||
              url.startsWith("market://") ||
              url.startsWith("org.jitsi.meet://")
            ) {
              return false;
            }
            return true;
          }}
          onLoadProgress={(event) => setLoadProgress(event.nativeEvent.progress)}
          onLoadEnd={() => setWebLoaded(true)}
          onError={() => setMeetError(true)}
          onHttpError={(event) => {
            if (event.nativeEvent.statusCode >= 500) setMeetError(true);
          }}
          onNavigationStateChange={onNavigationStateChange}
          onMessage={handleMessage}
          mediaCapturePermissionGrantType="grant"
          injectedJavaScript={injectedJS}
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          javaScriptEnabled
          domStorageEnabled
          cacheEnabled
          cacheMode="LOAD_DEFAULT"
          androidLayerType="hardware"
          thirdPartyCookiesEnabled
          sharedCookiesEnabled
          allowsFullscreenVideo
          allowsProtectedMedia
          originWhitelist={["https://*", "http://*", "about:*"]}
          mixedContentMode="always"
          setSupportMultipleWindows={false}
          userAgent="Mozilla/5.0 (Linux; Android 14; TextMe) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36"
        />
      ) : null}

      {!permissionError && !meetError ? (
        <View style={styles.chrome} pointerEvents="box-none">
          <View style={styles.topBar} pointerEvents="none">
            <View style={styles.smallAvatar}>
              <Text style={styles.smallAvatarText}>{initials}</Text>
            </View>
            <View style={styles.callMeta}>
              <Text numberOfLines={1} style={styles.contactName}>
                {contactName}
              </Text>
              <Text numberOfLines={1} style={styles.callStatus}>
                {callLabel} - {connectionLabel}
              </Text>
            </View>
          </View>

          {!webLoaded ? (
            <View style={styles.loadingPanel} pointerEvents="none">
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
              <Text style={styles.loadingTitle}>{callLabel} TextMe</Text>
              <Text style={styles.loadingText}>
                Connexion au canal audio et video securise.
              </Text>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${Math.max(12, Math.round(loadProgress * 100))}%` },
                  ]}
                />
              </View>
              <ActivityIndicator color="#FFFFFF" style={styles.loadingSpinner} />
            </View>
          ) : null}

          {lastMediaWarning ? (
            <View style={styles.warningBanner} pointerEvents="none">
              <Ionicons name="warning-outline" size={16} color="#FFE7A3" />
              <Text numberOfLines={2} style={styles.warningText}>
                {lastMediaWarning}
              </Text>
            </View>
          ) : null}

          <View style={styles.controls} pointerEvents="auto">
            <TouchableOpacity
              style={[styles.controlButton, micMuted && styles.controlButtonActive]}
              onPress={toggleMicrophone}
              activeOpacity={0.82}
            >
              <Ionicons name={micMuted ? "mic-off" : "mic"} size={22} color="#FFFFFF" />
            </TouchableOpacity>

            {isVideo ? (
              <TouchableOpacity
                style={[styles.controlButton, cameraOff && styles.controlButtonActive]}
                onPress={toggleCamera}
                activeOpacity={0.82}
              >
                <Ionicons name={cameraOff ? "videocam-off" : "videocam"} size={22} color="#FFFFFF" />
              </TouchableOpacity>
            ) : null}

            {isVideo ? (
              <TouchableOpacity
                style={styles.controlButton}
                onPress={switchCamera}
                activeOpacity={0.82}
              >
                <Ionicons name="camera-reverse" size={22} color="#FFFFFF" />
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity style={styles.endButton} onPress={endCall} activeOpacity={0.86}>
              <Ionicons name="call" size={26} color="#FFFFFF" style={styles.endIcon} />
            </TouchableOpacity>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#07090F",
  },
  webview: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#07090F",
  },
  chrome: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingBottom: 24,
    paddingTop: 22,
  },
  topBar: {
    minHeight: 62,
    borderRadius: 20,
    backgroundColor: "rgba(6, 9, 16, 0.72)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  smallAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#4F46E5",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  smallAvatarText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0,
  },
  callMeta: {
    flex: 1,
    minWidth: 0,
  },
  contactName: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0,
  },
  callStatus: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0,
    marginTop: 2,
  },
  loadingPanel: {
    alignSelf: "center",
    width: "100%",
    maxWidth: 360,
    borderRadius: 28,
    backgroundColor: "rgba(8, 12, 22, 0.88)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 26,
  },
  avatar: {
    width: 98,
    height: 98,
    borderRadius: 49,
    backgroundColor: "#4F46E5",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  avatarText: {
    color: "#FFFFFF",
    fontSize: 34,
    fontWeight: "900",
    letterSpacing: 0,
  },
  loadingTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "900",
    textAlign: "center",
    letterSpacing: 0,
  },
  loadingText: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    marginTop: 8,
  },
  progressTrack: {
    width: "100%",
    height: 5,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.14)",
    marginTop: 22,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
    backgroundColor: "#22C55E",
  },
  loadingSpinner: {
    marginTop: 18,
  },
  warningBanner: {
    position: "absolute",
    left: 18,
    right: 18,
    bottom: 110,
    minHeight: 46,
    borderRadius: 16,
    backgroundColor: "rgba(78, 60, 15, 0.90)",
    borderWidth: 1,
    borderColor: "rgba(255,231,163,0.30)",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  warningText: {
    flex: 1,
    color: "#FFF2C2",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0,
  },
  controls: {
    minHeight: 72,
    borderRadius: 24,
    backgroundColor: "rgba(6, 9, 16, 0.76)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  controlButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  controlButtonActive: {
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  endButton: {
    width: 70,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#EF4444",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 2,
  },
  endIcon: {
    transform: [{ rotate: "135deg" }],
  },
  errorScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 26,
    backgroundColor: "#07090F",
  },
  errorTitle: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "900",
    textAlign: "center",
    letterSpacing: 0,
  },
  errorText: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    marginTop: 10,
    maxWidth: 340,
  },
  errorActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 26,
  },
  primaryButton: {
    minHeight: 46,
    borderRadius: 23,
    backgroundColor: "#4F46E5",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 18,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0,
  },
  secondaryButton: {
    minHeight: 46,
    borderRadius: 23,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 18,
  },
  secondaryButtonText: {
    color: "#F7F7F7",
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0,
  },
  leaveButton: {
    marginTop: 18,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  leaveButtonText: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0,
  },
});
