import Ionicons from "@expo/vector-icons/Ionicons";
import { Stack } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, Pressable, Text, TextInput, View } from "react-native";

import {
  Card,
  ErrorView,
  Loading,
  Screen,
  SectionLabel,
} from "@/components/ui";
import { addTodo, deleteTodo, setTodoDone } from "@/lib/mutations";
import { getEntitlement, getProfile, listTodos, type Profile } from "@/lib/queries";
import { spacing, theme } from "@/lib/theme";
import { useQuery } from "@/lib/use-query";
import { UPSELL_MESSAGES, checkQuota, type Entitlement } from "@core/entitlements";
import { countOpen, groupTodos } from "@core/todos";
import type { Todo } from "@core/database";

interface TodosData {
  profile: Profile;
  todos: Todo[];
  entitlement: Entitlement;
}

const SECTIONS = [
  { key: "today", label: "今日" },
  { key: "thisWeek", label: "今週" },
  { key: "later", label: "来週以降" },
  { key: "done", label: "完了済み" },
] as const;

/** Web 版の (app)/todos に相当する画面（S-06） */
export default function TodosScreen() {
  const fetcher = useCallback(async (): Promise<TodosData> => {
    const [profile, todos, entitlement] = await Promise.all([
      getProfile(),
      listTodos(),
      getEntitlement(),
    ]);
    return { profile, todos, entitlement };
  }, []);

  const { data, error, refreshing, onRefresh, reload } = useQuery(fetcher);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);

  const run = useCallback(
    async (action: () => Promise<unknown>) => {
      setBusy(true);
      try {
        await action();
        await reload();
      } catch (cause) {
        Alert.alert("", cause instanceof Error ? cause.message : "操作できませんでした");
      }
      setBusy(false);
    },
    [reload],
  );

  if (error) return <ErrorView message={error} onRetry={reload} />;
  if (!data) return <Loading />;

  const openCount = countOpen(data.todos);
  const quota = checkQuota(data.entitlement, "openTodos", openCount);
  const grouped = groupTodos(data.todos, new Date(), data.profile.timezone);

  const onAdd = () => {
    const value = title.trim();
    if (!value) return;
    // 画面での非表示に頼らず、追加のたびに上限を確かめる
    if (!quota.allowed) {
      Alert.alert("", UPSELL_MESSAGES.openTodos);
      return;
    }
    run(async () => {
      await addTodo(value, null);
      setTitle("");
    });
  };

  return (
    <>
      <Stack.Screen
        options={{ title: "Todo", headerShown: true, headerBackTitle: "戻る" }}
      />
      <Screen refreshing={refreshing} onRefresh={onRefresh} topInset={false}>
        <Text style={{ fontSize: 14, color: theme.muted }}>
          未完了 {openCount}件{quota.limit === null ? "" : ` / ${quota.limit}件まで`}
        </Text>

        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="やることを入力"
            placeholderTextColor={theme.muted}
            maxLength={100}
            returnKeyType="done"
            onSubmitEditing={onAdd}
            style={{
              flex: 1,
              height: 48,
              borderWidth: 1,
              borderColor: theme.border,
              borderRadius: 10,
              paddingHorizontal: spacing.md,
              fontSize: 16,
              color: theme.text,
              backgroundColor: theme.card,
            }}
          />
          <Pressable
            onPress={onAdd}
            disabled={busy || title.trim() === ""}
            accessibilityRole="button"
            accessibilityLabel="追加"
            style={({ pressed }) => ({
              width: 48,
              height: 48,
              borderRadius: 10,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: theme.primary,
              opacity: busy || title.trim() === "" ? 0.4 : pressed ? 0.85 : 1,
            })}
          >
            <Ionicons name="add" size={24} color={theme.primaryText} />
          </Pressable>
        </View>

        {quota.shouldUpsell ? (
          <Card style={{ backgroundColor: theme.warnBg, borderColor: theme.warnBg }}>
            <Text style={{ fontSize: 14, color: theme.warn }}>{UPSELL_MESSAGES.openTodos}</Text>
          </Card>
        ) : null}

        {SECTIONS.map(({ key, label }) => {
          const items = grouped[key];
          if (items.length === 0) return null;
          return (
            <View key={key} style={{ gap: spacing.sm }}>
              <SectionLabel>
                {label}（{items.length}）
              </SectionLabel>
              {items.map((todo) => (
                <TodoRow
                  key={todo.id}
                  todo={todo}
                  busy={busy}
                  onToggle={() => run(() => setTodoDone(todo.id, todo.status !== "done"))}
                  onDelete={() =>
                    Alert.alert("削除しますか？", todo.title, [
                      { text: "やめる", style: "cancel" },
                      {
                        text: "削除",
                        style: "destructive",
                        onPress: () => run(() => deleteTodo(todo.id)),
                      },
                    ])
                  }
                />
              ))}
            </View>
          );
        })}

        {data.todos.length === 0 ? (
          <Text style={{ fontSize: 14, color: theme.muted, textAlign: "center" }}>
            上の欄から最初の1件を追加できます。
          </Text>
        ) : null}
      </Screen>
    </>
  );
}

function TodoRow({
  todo,
  busy,
  onToggle,
  onDelete,
}: {
  todo: Todo;
  busy: boolean;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const done = todo.status === "done";

  return (
    <Card style={{ padding: spacing.sm }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
        <Pressable
          onPress={onToggle}
          disabled={busy}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: done }}
          accessibilityLabel={todo.title}
          // 指で押せるよう、見た目より広く取る
          hitSlop={8}
          style={{ width: 32, height: 32, alignItems: "center", justifyContent: "center" }}
        >
          <Ionicons
            name={done ? "checkmark-circle" : "ellipse-outline"}
            size={24}
            color={done ? theme.accent : theme.muted}
          />
        </Pressable>

        <Text
          style={{
            flex: 1,
            fontSize: 15,
            color: done ? theme.muted : theme.text,
            textDecorationLine: done ? "line-through" : "none",
          }}
          numberOfLines={2}
        >
          {todo.title}
        </Text>

        <Pressable
          onPress={onDelete}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel={`${todo.title} を削除`}
          hitSlop={8}
          style={{ width: 32, height: 32, alignItems: "center", justifyContent: "center" }}
        >
          <Ionicons name="trash-outline" size={18} color={theme.muted} />
        </Pressable>
      </View>
    </Card>
  );
}
