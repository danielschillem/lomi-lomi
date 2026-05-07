import { Tabs, Redirect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
import { ActivityIndicator, View, Text } from "react-native";
import { useEffect, useState } from "react";
import { getConversations } from "@/lib/api";

function BadgeIcon({
  name,
  color,
  size,
  badge,
}: {
  name: React.ComponentProps<typeof Ionicons>["name"];
  color: string;
  size: number;
  badge?: number;
}) {
  return (
    <View>
      <Ionicons name={name} size={size} color={color} />
      {badge && badge > 0 ? (
        <View
          style={{
            position: "absolute",
            top: -4,
            right: -8,
            backgroundColor: "#ef4444",
            borderRadius: 9,
            minWidth: 18,
            height: 18,
            justifyContent: "center",
            alignItems: "center",
            paddingHorizontal: 4,
          }}
        >
          <Text
            style={{
              color: "#fff",
              fontSize: 10,
              fontWeight: "bold",
            }}
          >
            {badge > 99 ? "99+" : badge}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

export default function TabsLayout() {
  const { user, loading } = useAuth();
  const { colors } = useTheme();
  const [unreadMessages, setUnreadMessages] = useState(0);

  useEffect(() => {
    if (!user) return;
    const load = () => {
      getConversations()
        .then((rows) => {
          const list = Array.isArray(rows)
            ? (rows as Array<{ unread_count?: number }>)
            : [];
          const total = list.reduce(
            (sum, c) => sum + Number(c.unread_count || 0),
            0,
          );
          setUnreadMessages(total);
        })
        .catch(() => {});
    };
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, [user]);

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: colors.background,
        }}
      >
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (!user) return <Redirect href="/login" />;

  return (
    <Tabs
      screenOptions={{
        tabBarStyle: {
          backgroundColor: colors.tabBarBg,
          borderTopColor: colors.tabBarBorder,
          height: 85,
          paddingBottom: 28,
          paddingTop: 8,
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
        },
        headerStyle: { backgroundColor: colors.headerBg },
        headerTintColor: colors.headerText,
      }}
    >
      <Tabs.Screen
        name="messages"
        options={{
          title: "Discussions",
          tabBarIcon: ({ color, size }) => (
            <BadgeIcon
              name="chatbubbles"
              size={size}
              color={color}
              badge={unreadMessages}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="calls"
        options={{
          title: "Appels",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="call" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="contacts"
        options={{
          title: "Contacts",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="textme-plus"
        options={{
          title: "TextMe+",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="diamond" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen name="discover" options={{ href: null }} />
      <Tabs.Screen name="search" options={{ href: null }} />
      <Tabs.Screen name="nearby" options={{ href: null }} />
      <Tabs.Screen name="matches" options={{ href: null }} />
      <Tabs.Screen name="shop" options={{ href: null }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
      <Tabs.Screen name="profile" options={{ href: null }} />
    </Tabs>
  );
}
