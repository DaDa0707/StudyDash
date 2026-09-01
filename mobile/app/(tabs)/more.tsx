import Ionicons from "@expo/vector-icons/Ionicons";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import { useCallback } from "react";
import { Alert, Pressable, Text, View } from "react-native";

import { Card, ErrorView, Loading, PageHeader, Screen } from "@/components/ui";
import { SITE_URL } from "@/lib/config";
import { getEntitlement, getProfile, type Profile } from "@/lib/queries";
import { supabase } from "@/lib/supabase";
import { spacing, theme } from "@/lib/theme";
import { useQuery } from "@/lib/use-query";
import { isPro, type Entitlement } from "@core/entitlements";

interface MoreData {
  profile: Profile;
  entitlement: Entitlement;
}

/** Web 版の (app)/more に相当する画面 */
export default function MoreScreen() {
  const router = useRouter();

  const fetcher = useCallback(async (): Promise<MoreData> => {
    const [profile, entitlement] = await Promise.all([getProfile(), getEntitlement()]);
    return { profile, entitlement };
  }, []);

  const { data, error, refreshing, onRefresh, reload } = useQuery(fetcher);

  if (error) return <ErrorView message={error} onRetry={reload} />;
  if (!data) return <Loading />;

  const confirmSignOut = () =>
    Alert.alert("ログアウトしますか？", undefined, [
      { text: "やめる", style: "cancel" },
      { text: "ログアウト", style: "destructive", onPress: () => supabase.auth.signOut() },
    ]);

  return (
    <Screen refreshing={refreshing} onRefresh={onRefresh}>
      <PageHeader title="その他" subtitle={data.profile.displayName} />

      <Card style={{ padding: 0, overflow: "hidden" }}>
        <Row
          icon="list-outline"
          label="Todo"
          onPress={() => router.push("/todos")}
        />
        <Row
          icon="book-outline"
          label="科目"
          onPress={() => router.push("/subjects")}
        />
        <Row
          icon="bar-chart-outline"
          label="分析"
          onPress={() => router.push("/analytics")}
        />
        <Row
          icon="settings-outline"
          label="設定"
          onPress={() => router.push("/settings")}
        />
        {/*
          Web の決済ページは開かない。App Store の規約 3.1.1 が、
          デジタル商品について App 内課金以外への誘導を禁じているため。
        */}
        <Row
          icon="star-outline"
          label="Pro"
          note={isPro(data.entitlement) ? "利用中" : "未加入"}
          onPress={() => router.push("/pro")}
        />
      </Card>

      <Card style={{ padding: 0, overflow: "hidden" }}>
        <Row
          icon="document-text-outline"
          label="利用規約"
          onPress={() => Linking.openURL(`${SITE_URL}/terms`)}
          external
        />
        <Row
          icon="shield-checkmark-outline"
          label="プライバシーポリシー"
          onPress={() => Linking.openURL(`${SITE_URL}/privacy`)}
          external
          last
        />
      </Card>

      <Pressable
        onPress={confirmSignOut}
        accessibilityRole="button"
        style={({ pressed }) => ({
          minHeight: 48,
          alignItems: "center",
          justifyContent: "center",
          opacity: pressed ? 0.6 : 1,
        })}
      >
        <Text style={{ fontSize: 15, color: theme.danger }}>ログアウト</Text>
      </Pressable>
    </Screen>
  );
}

function Row({
  icon,
  label,
  note,
  onPress,
  external,
  last,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  note?: string;
  onPress: () => void;
  /** Web を開くものは行き先が分かるよう別のアイコンにする */
  external?: boolean;
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
      <Ionicons name={icon} size={20} color={theme.muted} />
      <Text style={{ flex: 1, fontSize: 15, fontWeight: "500", color: theme.text }}>
        {label}
      </Text>
      {note ? <Text style={{ fontSize: 13, color: theme.muted }}>{note}</Text> : null}
      <Ionicons
        name={external ? "open-outline" : "chevron-forward"}
        size={16}
        color={theme.muted}
      />
    </Pressable>
  );
}
