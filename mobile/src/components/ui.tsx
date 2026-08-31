import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { spacing, theme } from "@/lib/theme";

/**
 * 画面をまたいで使う見た目の部品。
 *
 * Web 版の Tailwind クラスに相当するものをここに集める。
 * 各画面で同じ style オブジェクトを書き直さないため。
 */

interface ScreenProps {
  children: ReactNode;
  /** 引っぱって更新。省略すると無効 */
  refreshing?: boolean;
  onRefresh?: () => void;
  /** ヘッダー等を自前で出す場合に上余白を詰める */
  edgeToEdge?: boolean;
  /**
   * ナビゲーションのヘッダーがある画面では false にする。
   * ヘッダーが安全領域を含むため、足すと上が二重に空く。
   */
  topInset?: boolean;
}

export function Screen({
  children,
  refreshing,
  onRefresh,
  edgeToEdge,
  topInset = true,
}: ScreenProps) {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={{ backgroundColor: theme.bg }}
      contentContainerStyle={{
        padding: edgeToEdge ? 0 : spacing.lg,
        paddingTop: (topInset ? insets.top : 0) + (edgeToEdge ? 0 : spacing.lg),
        paddingBottom: spacing.xxl * 2,
        gap: spacing.lg,
      }}
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={refreshing ?? false} onRefresh={onRefresh} />
        ) : undefined
      }
    >
      {children}
    </ScrollView>
  );
}

export function Centered({ children }: { children: ReactNode }) {
  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        padding: spacing.xl,
        backgroundColor: theme.bg,
      }}
    >
      {children}
    </View>
  );
}

export function Loading() {
  return (
    <Centered>
      <ActivityIndicator />
    </Centered>
  );
}

export function ErrorView({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <Centered>
      <Text style={{ color: theme.danger, fontSize: 15, textAlign: "center" }}>{message}</Text>
      {onRetry ? (
        <View style={{ marginTop: spacing.lg }}>
          <OutlineButton label="もう一度試す" onPress={onRetry} />
        </View>
      ) : null}
    </Centered>
  );
}

export function Card({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View
      style={[
        {
          backgroundColor: theme.card,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: theme.border,
          padding: spacing.lg,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View>
      <Text style={{ fontSize: 24, fontWeight: "700", color: theme.text }}>{title}</Text>
      {subtitle ? (
        <Text style={{ marginTop: 4, fontSize: 14, color: theme.muted }}>{subtitle}</Text>
      ) : null}
    </View>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <Text style={{ fontSize: 13, fontWeight: "600", color: theme.muted }}>{children}</Text>
  );
}

/** 何も無いときの案内。枠線を破線にして「置き場所」だと分かるようにする */
export function EmptyState({ message, action }: { message: string; action?: ReactNode }) {
  return (
    <View
      style={{
        borderWidth: 1,
        borderStyle: "dashed",
        borderColor: theme.border,
        borderRadius: 14,
        padding: spacing.xl,
        alignItems: "center",
        gap: spacing.lg,
      }}
    >
      <Text style={{ fontSize: 14, color: theme.muted, textAlign: "center" }}>{message}</Text>
      {action}
    </View>
  );
}

interface ButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  busy?: boolean;
  icon?: ReactNode;
}

/** 高さ 48 は指で押せる最小限（§11 タップ領域） */
export function PrimaryButton({ label, onPress, disabled, busy, icon }: ButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || busy}
      accessibilityRole="button"
      style={({ pressed }) => ({
        height: 48,
        borderRadius: 10,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: spacing.sm,
        backgroundColor: theme.primary,
        opacity: disabled || busy ? 0.5 : pressed ? 0.85 : 1,
      })}
    >
      {busy ? (
        <ActivityIndicator color={theme.primaryText} />
      ) : (
        <>
          {icon}
          <Text style={{ color: theme.primaryText, fontSize: 16, fontWeight: "600" }}>
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}

export function OutlineButton({ label, onPress, disabled, busy, icon }: ButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || busy}
      accessibilityRole="button"
      style={({ pressed }) => ({
        height: 48,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: theme.border,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: spacing.sm,
        backgroundColor: pressed ? "#fafafa" : theme.card,
        opacity: disabled || busy ? 0.5 : 1,
      })}
    >
      {busy ? (
        <ActivityIndicator />
      ) : (
        <>
          {icon}
          <Text style={{ color: theme.text, fontSize: 16, fontWeight: "600" }}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

/** 締切ラベルなどの丸いチップ */
export function Badge({
  label,
  tone = "muted",
}: {
  label: string;
  tone?: "muted" | "warn" | "danger" | "accent";
}) {
  const colors = {
    muted: { bg: "#f5f5f5", fg: theme.muted },
    warn: { bg: theme.warnBg, fg: theme.warn },
    danger: { bg: theme.dangerBg, fg: theme.danger },
    accent: { bg: "#eef2ff", fg: theme.accent },
  }[tone];

  return (
    <View
      style={{
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 999,
        backgroundColor: colors.bg,
      }}
    >
      <Text style={{ fontSize: 12, fontWeight: "600", color: colors.fg }}>{label}</Text>
    </View>
  );
}

/** 科目の色を示す丸 */
export function ColorDot({ color, size = 10 }: { color: string | null; size?: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color ?? "#94a3b8",
      }}
    />
  );
}

/** 絞り込みや科目選択に使う横並びのチップ */
export function Chip({
  label,
  color,
  active,
  onPress,
}: {
  label: string;
  color?: string | null;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={({ pressed }) => ({
        minHeight: 36,
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: spacing.md,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: active ? theme.primary : theme.border,
        backgroundColor: active ? theme.primary : pressed ? "#f5f5f5" : theme.card,
      })}
    >
      {color ? <ColorDot color={color} size={8} /> : null}
      <Text
        style={{ fontSize: 13, fontWeight: "600", color: active ? theme.primaryText : theme.text }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/** 2択の切り替え。タブバーではなく画面内の絞り込みに使う */
export function SegmentTab({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      style={({ pressed }) => ({
        flex: 1,
        minHeight: 44,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 10,
        backgroundColor: active ? theme.primary : pressed ? "#eeeeee" : "#f5f5f5",
      })}
    >
      <Text
        style={{ fontSize: 14, fontWeight: "600", color: active ? theme.primaryText : theme.muted }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
