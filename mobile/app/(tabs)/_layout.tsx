import Ionicons from "@expo/vector-icons/Ionicons";
import { Tabs } from "expo-router";

import { theme } from "@/lib/theme";

/**
 * §11 の下部ナビに相当する。
 *
 * Web 版は中央に「＋」を置いているが、iOS のタブバーにその作法は無いので
 * 課題を独立したタブにして 5 つ並べる。追加は各画面の中から行う。
 */
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.text,
        tabBarInactiveTintColor: theme.muted,
        tabBarStyle: { borderTopColor: theme.border },
        tabBarLabelStyle: { fontSize: 11 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "ホーム",
          tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="timetable"
        options={{
          title: "時間割",
          tabBarIcon: ({ color, size }) => <Ionicons name="calendar" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="assignments"
        options={{
          title: "課題",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="document-text" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="timer"
        options={{
          title: "タイマー",
          tabBarIcon: ({ color, size }) => <Ionicons name="timer" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: "その他",
          tabBarIcon: ({ color, size }) => <Ionicons name="ellipsis-horizontal" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
