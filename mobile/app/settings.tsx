import Ionicons from "@expo/vector-icons/Ionicons";
import { Stack, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { FormMessage, PickerField, TextField } from "@/components/form";
import { Card, ErrorView, Loading, PrimaryButton, Screen, SectionLabel } from "@/components/ui";
import { updateProfile } from "@/lib/mutations";
import { getEntitlement, getProfile, type Profile } from "@/lib/queries";
import { supabase } from "@/lib/supabase";
import { spacing, theme } from "@/lib/theme";
import { useQuery } from "@/lib/use-query";
import { toFieldErrors } from "@core/form";
import { isPro, limitsFor, type Entitlement } from "@core/entitlements";
import { SCHOOL_TYPES, onboardingSchema } from "@core/validation/auth";
import type { SchoolType } from "@core/database";

interface Loaded {
  profile: Profile;
  email: string;
  entitlement: Entitlement;
}

/** Web 版の (app)/settings に相当する画面 */
export default function SettingsScreen() {
  const fetcher = useCallback(async (): Promise<Loaded> => {
    const [profile, entitlement, auth] = await Promise.all([
      getProfile(),
      getEntitlement(),
      supabase.auth.getUser(),
    ]);
    return { profile, entitlement, email: auth.data.user?.email ?? "" };
  }, []);

  const { data, error, reload } = useQuery(fetcher);

  return (
    <>
      <Stack.Screen options={{ title: "設定", headerShown: true, headerBackTitle: "戻る" }} />
      {error ? (
        <ErrorView message={error} onRetry={reload} />
      ) : !data ? (
        <Loading />
      ) : (
        <Body data={data} />
      )}
    </>
  );
}

function Body({ data }: { data: Loaded }) {
  const { profile } = data;
  const router = useRouter();
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [schoolType, setSchoolType] = useState<SchoolType>(profile.schoolType);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | undefined>();
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  const limits = limitsFor(data.entitlement);

  const onSave = async () => {
    setMessage(undefined);
    setSaved(false);

    const parsed = onboardingSchema.safeParse({ displayName, schoolType });
    if (!parsed.success) {
      setFieldErrors(toFieldErrors(parsed.error));
      setMessage("入力内容を確認してください");
      return;
    }
    setFieldErrors({});

    setBusy(true);
    try {
      await updateProfile(parsed.data);
      setSaved(true);
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "保存できませんでした");
    }
    setBusy(false);
  };

  return (
    <Screen topInset={false}>
      <FormMessage message={message} />

      {saved ? (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: spacing.sm,
            backgroundColor: "#ecfdf5",
            borderRadius: 10,
            padding: spacing.md,
          }}
          accessibilityLiveRegion="polite"
        >
          <Ionicons name="checkmark-circle" size={18} color="#047857" />
          <Text style={{ fontSize: 14, color: "#047857" }}>保存しました</Text>
        </View>
      ) : null}

      <Card style={{ gap: spacing.sm }}>
        <SectionLabel>アカウント</SectionLabel>
        <InfoRow label="メールアドレス" value={data.email} />
        <InfoRow
          label="学校の種類"
          value={SCHOOL_TYPES.find((s) => s.value === profile.schoolType)?.label ?? "-"}
        />
      </Card>

      <TextField
        label="表示名"
        required
        value={displayName}
        onChangeText={(v) => {
          setDisplayName(v);
          setSaved(false);
        }}
        maxLength={50}
        hint="本名でなくてかまいません"
        error={fieldErrors.displayName}
      />

      <PickerField
        label="学校の種類"
        value={schoolType}
        onChange={(v) => {
          setSchoolType(v as SchoolType);
          setSaved(false);
        }}
        options={SCHOOL_TYPES.map((s) => ({ value: s.value, label: s.label }))}
        error={fieldErrors.schoolType}
      />

      <PrimaryButton label="保存" busy={busy} onPress={onSave} />

      <Card style={{ gap: spacing.sm }}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <SectionLabel>プラン</SectionLabel>
          <Text
            style={{
              marginLeft: spacing.sm,
              fontSize: 14,
              fontWeight: "700",
              color: theme.text,
            }}
          >
            {isPro(data.entitlement) ? "Pro" : "Free"}
          </Text>
        </View>
        <InfoRow label="未完了の課題" value={quotaText(limits.openAssignments, "件まで")} />
        <InfoRow label="未完了のTodo" value={quotaText(limits.openTodos, "件まで")} />
        <InfoRow
          label="学習履歴"
          value={limits.studyHistoryDays === null ? "全期間" : `直近${limits.studyHistoryDays}日`}
        />
        <Text style={{ marginTop: 4, fontSize: 12, color: theme.muted }}>
          プランはサーバー側（subscriptions.entitlement）で判定しています。
        </Text>
        <Pressable
          onPress={() => router.push("/pro")}
          accessibilityRole="button"
          style={({ pressed }) => ({ paddingVertical: spacing.sm, opacity: pressed ? 0.6 : 1 })}
        >
          <Text style={{ fontSize: 14, fontWeight: "600", color: theme.accent }}>
            {isPro(data.entitlement) ? "契約を管理する" : "Proの内容を見る"}
          </Text>
        </Pressable>
      </Card>

      <View style={{ marginTop: spacing.lg, gap: spacing.sm }}>
        <SectionLabel>その他の設定</SectionLabel>
        <Card style={{ padding: 0, overflow: "hidden" }}>
          <SettingsRow
            icon="notifications-outline"
            label="通知"
            onPress={() => router.push("/notification-settings")}
          />
          <SettingsRow
            icon="person-remove-outline"
            label="アカウントを削除"
            danger
            last
            onPress={() => router.push("/account-delete")}
          />
        </Card>
      </View>

      <Pressable
        onPress={() => supabase.auth.signOut()}
        accessibilityRole="button"
        style={({ pressed }) => ({
          minHeight: 48,
          alignItems: "center",
          justifyContent: "center",
          opacity: pressed ? 0.6 : 1,
        })}
      >
        <Text style={{ fontSize: 15, color: theme.muted }}>ログアウト</Text>
      </Pressable>
    </Screen>
  );
}

function SettingsRow({
  icon,
  label,
  onPress,
  danger,
  last,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  onPress: () => void;
  danger?: boolean;
  last?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.md,
        minHeight: 52,
        paddingHorizontal: spacing.lg,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: theme.border,
        backgroundColor: pressed ? "#fafafa" : theme.card,
      })}
    >
      <Ionicons name={icon} size={20} color={danger ? theme.danger : theme.muted} />
      <Text
        style={{
          flex: 1,
          fontSize: 15,
          fontWeight: "500",
          color: danger ? theme.danger : theme.text,
        }}
      >
        {label}
      </Text>
      <Ionicons name="chevron-forward" size={16} color={theme.muted} />
    </Pressable>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
      <Text style={{ fontSize: 13, color: theme.muted }}>{label}</Text>
      <Text
        style={{ flex: 1, textAlign: "right", fontSize: 14, color: theme.text }}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );
}

/** 上限の表し方は core の planComparison と揃える */
function quotaText(limit: number | null, unit: string): string {
  return limit === null ? "無制限" : `${limit}${unit}`;
}
