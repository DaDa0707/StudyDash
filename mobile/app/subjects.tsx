import Ionicons from "@expo/vector-icons/Ionicons";
import { Stack, useFocusEffect, useRouter } from "expo-router";
import { useCallback } from "react";
import { Pressable, Text, View } from "react-native";

import {
  Card,
  ColorDot,
  EmptyState,
  ErrorView,
  Loading,
  OutlineButton,
  Screen,
} from "@/components/ui";
import { listSubjects } from "@/lib/queries";
import { spacing, theme } from "@/lib/theme";
import { useQuery } from "@/lib/use-query";

/** Web 版の (app)/subjects に相当する画面 */
export default function SubjectsScreen() {
  const router = useRouter();
  const fetcher = useCallback(() => listSubjects(), []);
  const { data, error, refreshing, onRefresh, reload } = useQuery(fetcher);

  // 追加・編集から戻ったときに取り直す
  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  return (
    <>
      <Stack.Screen
        options={{ title: "科目", headerShown: true, headerBackTitle: "戻る" }}
      />
      {error ? (
        <ErrorView message={error} onRetry={reload} />
      ) : !data ? (
        <Loading />
      ) : (
        <Screen topInset={false} refreshing={refreshing} onRefresh={onRefresh}>
          {data.length === 0 ? (
            <EmptyState message="科目を登録すると、時間割や課題で選べるようになります。" />
          ) : (
            <View style={{ gap: spacing.sm }}>
              {data.map((subject) => (
                <Pressable
                  key={subject.id}
                  onPress={() => router.push(`/subject-form?id=${subject.id}`)}
                  accessibilityRole="button"
                >
                  <Card style={{ padding: spacing.md }}>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: spacing.md,
                      }}
                    >
                      <ColorDot color={subject.color} size={14} />
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text
                          style={{ fontSize: 15, fontWeight: "600", color: theme.text }}
                          numberOfLines={1}
                        >
                          {subject.name}
                        </Text>
                        {subject.teacher ? (
                          <Text style={{ marginTop: 2, fontSize: 12, color: theme.muted }}>
                            {subject.teacher}
                          </Text>
                        ) : null}
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={theme.muted} />
                    </View>
                  </Card>
                </Pressable>
              ))}
            </View>
          )}

          <OutlineButton
            label="科目を追加"
            onPress={() => router.push("/subject-form")}
            icon={<Ionicons name="add" size={18} color={theme.text} />}
          />
        </Screen>
      )}
    </>
  );
}
