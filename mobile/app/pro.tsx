import Ionicons from "@expo/vector-icons/Ionicons";
import { Stack } from "expo-router";
import { useIAP } from "expo-iap";
import { useCallback, useEffect, useState } from "react";
import { Alert, Text, View } from "react-native";

import {
  Card,
  ErrorView,
  Loading,
  OutlineButton,
  PrimaryButton,
  Screen,
  SectionLabel,
} from "@/components/ui";
import { verifyPurchaseOnServer } from "@/lib/iap";
import { getEntitlement } from "@/lib/queries";
import { supabase } from "@/lib/supabase";
import { spacing, theme } from "@/lib/theme";
import { useQuery } from "@/lib/use-query";
import { isPro, planComparison, type Entitlement } from "@core/entitlements";
import { PRO_MONTHLY_PRODUCT_ID } from "@core/products";

/**
 * Web 版の (app)/pro に相当する画面。
 *
 * 購入は App 内課金だけで行う。
 * App Store の規約 3.1.1 が、デジタル商品について App 内課金以外の
 * 購入手段へ誘導することを禁じているため、Web の決済ページは開かない。
 *
 * 金額はコードに書かない（§6）。App Store から取り出して表示する。
 */
export default function ProScreen() {
  const fetcher = useCallback((): Promise<Entitlement> => getEntitlement(), []);
  const { data, error, refreshing, onRefresh, reload } = useQuery(fetcher);
  const [busy, setBusy] = useState(false);

  const {
    connected,
    subscriptions,
    fetchProducts,
    requestPurchase,
    finishTransaction,
    restorePurchases,
  } = useIAP({
    onPurchaseSuccess: async (purchase) => {
      try {
        // 権限を与えてよいかはサーバーが決める。アプリは判断しない。
        const applied = await verifyPurchaseOnServer(purchase.purchaseToken ?? "");

        // 検証が通ってから取引を完了させる。通らなければ再試行の余地を残す。
        if (applied) {
          await finishTransaction({ purchase, isConsumable: false });
          await reload();
          Alert.alert("", "Pro をご利用いただけます。ありがとうございます。");
        } else {
          Alert.alert("", "購入の確認に時間がかかっています。しばらくしてお試しください。");
        }
      } catch {
        Alert.alert("", "購入の確認に失敗しました。時間をおいてお試しください。");
      }
      setBusy(false);
    },
    onPurchaseError: (purchaseError) => {
      setBusy(false);
      // 利用者が自分でやめた場合は黙って戻す
      if (purchaseError.code === "user-cancelled") return;
      Alert.alert("", "購入を完了できませんでした。時間をおいてお試しください。");
    },
  });

  useEffect(() => {
    if (!connected) return;
    fetchProducts({ skus: [PRO_MONTHLY_PRODUCT_ID], type: "subs" }).catch(() => {
      // 取得できないときは価格を出さず、購入ボタンも出さない
    });
  }, [connected, fetchProducts]);

  if (error) return <ErrorView message={error} onRetry={reload} />;
  if (!data) return <Loading />;

  const pro = isPro(data);
  const rows = planComparison();
  const product = subscriptions.find((s) => s.id === PRO_MONTHLY_PRODUCT_ID);

  const onPurchase = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    setBusy(true);
    try {
      await requestPurchase({
        type: "subs",
        request: {
          apple: {
            sku: PRO_MONTHLY_PRODUCT_ID,
            // これが Apple からの通知に載る。サーバーが利用者を特定するのに使う。
            appAccountToken: user.id,
          },
        },
      });
    } catch {
      setBusy(false);
    }
  };

  const onRestore = async () => {
    setBusy(true);
    try {
      await restorePurchases();
      await reload();
      Alert.alert("", "購入の復元を試みました。反映まで少しかかることがあります。");
    } catch {
      Alert.alert("", "復元できませんでした。時間をおいてお試しください。");
    }
    setBusy(false);
  };

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

        {pro ? null : product ? (
          <View style={{ gap: spacing.md }}>
            <Card style={{ alignItems: "center", gap: 4 }}>
              {/* 金額は App Store から取り出したものをそのまま出す */}
              <Text style={{ fontSize: 24, fontWeight: "700", color: theme.text }}>
                {product.displayPrice}
              </Text>
              <Text style={{ fontSize: 13, color: theme.muted }}>月額・いつでも解約できます</Text>
            </Card>

            <PrimaryButton label="Proにする" busy={busy} onPress={onPurchase} />
            <OutlineButton label="購入を復元する" busy={busy} onPress={onRestore} />

            <Text
              style={{ fontSize: 12, color: theme.muted, textAlign: "center", lineHeight: 18 }}
            >
              お支払いは Apple ID に請求されます。解約は iPhone の設定から行えます。
            </Text>
          </View>
        ) : (
          <Card>
            <SectionLabel>お申し込みについて</SectionLabel>
            <Text style={{ marginTop: 8, fontSize: 14, color: theme.muted, lineHeight: 20 }}>
              {connected
                ? "商品を読み込めませんでした。時間をおいてお試しください。"
                : "App Store に接続しています。"}
            </Text>
          </Card>
        )}
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
