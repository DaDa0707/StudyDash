import Ionicons from "@expo/vector-icons/Ionicons";
import { Stack } from "expo-router";
import { useCallback } from "react";
import { Text, View } from "react-native";

import { Card, ErrorView, Loading, Screen, SectionLabel } from "@/components/ui";
import { getEntitlement } from "@/lib/queries";
import { spacing, theme } from "@/lib/theme";
import { useQuery } from "@/lib/use-query";
import { isPro, planComparison, type Entitlement } from "@core/entitlements";

/**
 * Web 版の (app)/pro に相当する画面。
 *
 * 購入の導線は置かない。
 * App Store の規約 3.1.1 は、アプリ内のデジタル商品について
 * App 内課金以外の購入手段へ誘導することを禁じている。
 * StoreKit を入れるまでは、何ができるかの説明だけにとどめる。
 */
export default function ProScreen() {
  const fetcher = useCallback((): Promise<Entitlement> => getEntitlement(), []);
  const { data, error, refreshing, onRefresh, reload } = useQuery(fetcher);

  if (error) return <ErrorView message={error} onRetry={reload} />;
  if (!data) return <Loading />;

  const pro = isPro(data);
  const rows = planComparison();

  return (
    <>
      <Stack.Screen options={{ title: "Pro", headerShown: true, headerBackTitle: "戻る" }} />
      <Screen topInset={false} refreshing={refreshing} onRefresh={onRefresh}>
        <View style={{ alignItems: "center", gap: spacing.sm }}>
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "#fef3c7",
            }}
          >
            <Ionicons name="sparkles" size={24} color="#b45309" />
          </View>
          <Text style={{ fontSize: 22, fontWeight: "700", color: theme.text }}>
            {pro ? "StudyDash Pro を利用中" : "StudyDash Pro"}
          </Text>
          <Text style={{ fontSize: 14, color: theme.muted, textAlign: "center" }}>
            {pro
              ? "上限なしで使えます。"
              : "上限の解除、科目別の分析、通知とテーマのカスタマイズ。"}
          </Text>
        </View>

        <Card style={{ padding: 0, overflow: "hidden" }}>
          <View
            style={{
              flexDirection: "row",
              paddingHorizontal: spacing.lg,
              paddingVertical: spacing.md,
              borderBottomWidth: 1,
              borderBottomColor: theme.border,
            }}
          >
            <View style={{ flex: 1.4 }} />
            <Text style={[headCell, { flex: 1 }]}>Free</Text>
            <Text style={[headCell, { flex: 1 }]}>Pro</Text>
          </View>

          {rows.map((row, index) => (
            <View
              key={row.feature}
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: spacing.lg,
                paddingVertical: spacing.md,
                borderTopWidth: index === 0 ? 0 : 1,
                borderTopColor: theme.border,
              }}
            >
              <Text style={{ flex: 1.4, fontSize: 14, color: theme.text }}>{row.feature}</Text>
              <Text style={[bodyCell, { flex: 1, color: theme.muted }]}>{row.free}</Text>
              <Text style={[bodyCell, { flex: 1, color: theme.text, fontWeight: "600" }]}>
                {row.pro}
              </Text>
            </View>
          ))}
        </Card>

        {!pro ? (
          <Card>
            <SectionLabel>お申し込みについて</SectionLabel>
            <Text style={{ marginTop: 8, fontSize: 14, color: theme.muted, lineHeight: 20 }}>
              アプリからのお申し込みは準備中です。使えるようになりましたら、
              この画面からお手続きいただけます。
            </Text>
          </Card>
        ) : null}
      </Screen>
    </>
  );
}

const headCell = {
  fontSize: 12,
  fontWeight: "600" as const,
  color: theme.muted,
  textAlign: "center" as const,
};

const bodyCell = { fontSize: 13, textAlign: "center" as const };
