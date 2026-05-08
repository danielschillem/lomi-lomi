import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { CallRecord, updateCallStatus } from "@/lib/api";
import { useTheme } from "@/lib/theme-context";
import { useWS } from "@/lib/ws-context";

function normalizePayload(msg: Record<string, unknown>) {
  return ((msg.data as Record<string, unknown>) || msg) as Partial<CallRecord>;
}


export default function IncomingCallModal() {
  const { colors } = useTheme();
  const { onMessage } = useWS();
  const [call, setCall] = useState<CallRecord | null>(null);
  const [busyAction, setBusyAction] = useState<"accept" | "decline" | null>(
    null,
  );

  useEffect(() => {
    const unsub = onMessage((msg) => {
      const payload = normalizePayload(msg as Record<string, unknown>);

      if (msg.type === "call_incoming" && payload.id && payload.room) {
        setCall(payload as CallRecord);
      }

      if (msg.type === "call_status" && payload.id && payload.status) {
        setCall((current) => {
          if (!current || current.id !== Number(payload.id)) return current;
          if (payload.status === "ringing") return current;
          return null;
        });
      }
    });
    return unsub;
  }, [onMessage]);

  useEffect(() => {
    if (!call) return;
    const timer = setTimeout(() => {
      updateCallStatus(call.id, "missed").catch(() => {});
      setCall(null);
    }, 60000);
    return () => clearTimeout(timer);
  }, [call]);

  const callerName = useMemo(
    () => call?.caller?.username || "Contact TextMe",
    [call?.caller?.username],
  );

  const accept = async () => {
    if (!call || busyAction) return;
    setBusyAction("accept");
    try {
      const updated = await updateCallStatus(call.id, "accepted");
      setCall(null);
      router.push({
        pathname: "/call",
        params: { room: updated.room, callType: updated.call_type, callId: String(updated.id) },
      });
    } finally {
      setBusyAction(null);
    }
  };

  const decline = async () => {
    if (!call || busyAction) return;
    setBusyAction("decline");
    try {
      await updateCallStatus(call.id, "declined");
    } finally {
      setCall(null);
      setBusyAction(null);
    }
  };

  return (
    <Modal visible={!!call} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: colors.card }]}>
          <View style={styles.avatarWrap}>
            {call?.caller?.avatar_url ? (
              <Image source={{ uri: call.caller.avatar_url }} style={styles.avatar} />
            ) : (
              <View
                style={[
                  styles.avatar,
                  styles.avatarFallback,
                  { backgroundColor: colors.cardSecondary },
                ]}
              >
                <Ionicons name="person" size={38} color={colors.textMuted} />
              </View>
            )}
          </View>
          <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
            {callerName}
          </Text>
          <View style={styles.kindRow}>
            <Ionicons
              name={call?.call_type === "video" ? "videocam" : "call"}
              size={18}
              color={colors.accent}
            />
            <Text style={[styles.kind, { color: colors.textMuted }]}>
              Appel {call?.call_type === "video" ? "video" : "audio"} entrant
            </Text>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.action, styles.decline]}
              onPress={decline}
              disabled={!!busyAction}
            >
              {busyAction === "decline" ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Ionicons name="call" size={24} color="#fff" />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.action, styles.accept]}
              onPress={accept}
              disabled={!!busyAction}
            >
              {busyAction === "accept" ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Ionicons
                  name={call?.call_type === "video" ? "videocam" : "call"}
                  size={24}
                  color="#fff"
                />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.62)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  sheet: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 18,
    padding: 24,
    alignItems: "center",
  },
  avatarWrap: {
    marginBottom: 16,
  },
  avatar: {
    width: 86,
    height: 86,
    borderRadius: 43,
  },
  avatarFallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  name: {
    fontSize: 22,
    fontWeight: "800",
  },
  kindRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
  },
  kind: {
    fontSize: 14,
  },
  actions: {
    flexDirection: "row",
    gap: 34,
    marginTop: 28,
  },
  action: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: "center",
    justifyContent: "center",
  },
  decline: {
    backgroundColor: "#ef4444",
    transform: [{ rotate: "135deg" }],
  },
  accept: {
    backgroundColor: "#22c55e",
  },
});
