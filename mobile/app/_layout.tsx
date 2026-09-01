import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import type { Session } from "@supabase/supabase-js";

import { supabase } from "@/lib/supabase";
import { theme } from "@/lib/theme";

/**
 * セッションの有無で入口を振り分ける。
 * Web 版の proxy.ts に相当する役割をここが担う。
 */
export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!ready) return;

    // ログイン前に見せてよい画面。ここに無いものはログインへ戻す。
    const onAuthScreen =
      segments[0] === "login" ||
      segments[0] === "signup" ||
      segments[0] === "reset-password";

    if (!session && !onAuthScreen) {
      router.replace("/login");
    } else if (session && onAuthScreen) {
      router.replace("/");
    }
  }, [ready, session, segments, router]);

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.bg }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.bg } }} />
    </SafeAreaProvider>
  );
}
