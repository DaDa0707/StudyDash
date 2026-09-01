import type { ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { spacing, theme } from "@/lib/theme";

/** ログイン・新規登録・パスワード再設定で共通の枠 */
export function AuthLayout({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.bg }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "center",
          padding: spacing.xl,
          paddingTop: insets.top + spacing.xl,
          paddingBottom: insets.bottom + spacing.xl,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={{ fontSize: 26, fontWeight: "700", color: theme.text }}>{title}</Text>
        {subtitle ? (
          <Text style={{ marginTop: 6, fontSize: 14, color: theme.muted, lineHeight: 20 }}>
            {subtitle}
          </Text>
        ) : null}

        <View style={{ marginTop: spacing.xxl, gap: spacing.lg }}>{children}</View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/** 画面下の切り替えリンク */
export function AuthLink({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => ({
        minHeight: 44,
        alignItems: "center",
        justifyContent: "center",
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <Text style={{ fontSize: 14, color: theme.accent }}>{label}</Text>
    </Pressable>
  );
}

/** 失敗のお知らせ */
export function AuthError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <View
      style={{ backgroundColor: theme.dangerBg, borderRadius: 10, padding: spacing.md }}
      accessibilityLiveRegion="polite"
    >
      <Text style={{ color: theme.danger, fontSize: 14 }}>{message}</Text>
    </View>
  );
}
