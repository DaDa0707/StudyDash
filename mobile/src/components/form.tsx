import Ionicons from "@expo/vector-icons/Ionicons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useState, type ReactNode } from "react";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";

import { spacing, theme } from "@/lib/theme";

/**
 * 入力欄の共通部品。
 *
 * 値はすべて文字列で持ち、core/validation の zod スキーマにそのまま渡せる形にする
 * （日付は "YYYY-MM-DD"、時刻は "HH:mm"、未選択は ""）。
 * Web 版のフォームと同じ値の作り方にして、検証もエラー文言も共有する。
 */

function Label({ text, required }: { text: string; required?: boolean }) {
  return (
    <Text style={{ fontSize: 14, fontWeight: "600", color: theme.text }}>
      {text}
      {required ? <Text style={{ color: theme.danger }}> *</Text> : null}
    </Text>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <Text style={{ fontSize: 13, color: theme.danger }} accessibilityLiveRegion="polite">
      {message}
    </Text>
  );
}

export function Field({
  label,
  required,
  error,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <View style={{ gap: 6 }}>
      <Label text={label} required={required} />
      {children}
      {hint && !error ? (
        <Text style={{ fontSize: 12, color: theme.muted }}>{hint}</Text>
      ) : null}
      <FieldError message={error} />
    </View>
  );
}

export function TextField({
  label,
  value,
  onChangeText,
  required,
  error,
  hint,
  multiline,
  maxLength,
  placeholder,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  required?: boolean;
  error?: string;
  hint?: string;
  multiline?: boolean;
  maxLength?: number;
  placeholder?: string;
}) {
  return (
    <Field label={label} required={required} error={error} hint={hint}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.muted}
        multiline={multiline}
        maxLength={maxLength}
        textAlignVertical={multiline ? "top" : "center"}
        style={{
          minHeight: multiline ? 96 : 48,
          borderWidth: 1,
          borderColor: error ? theme.danger : theme.border,
          borderRadius: 10,
          paddingHorizontal: spacing.md,
          paddingVertical: multiline ? spacing.md : 0,
          fontSize: 16,
          color: theme.text,
          backgroundColor: theme.card,
        }}
      />
    </Field>
  );
}

export interface Option {
  value: string;
  label: string;
  color?: string | null;
}

/**
 * 選択欄。iOS に <select> は無いので、押すと一覧を出す。
 * 選択肢が少ないときは横並びの方が速いので、chips を渡すとそちらで出す。
 */
export function PickerField({
  label,
  value,
  options,
  onChange,
  required,
  error,
  hint,
  placeholder = "選択してください",
  chips,
}: {
  label: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  required?: boolean;
  error?: string;
  hint?: string;
  placeholder?: string;
  chips?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);

  if (chips) {
    return (
      <Field label={label} required={required} error={error} hint={hint}>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
          {options.map((option) => {
            const active = option.value === value;
            return (
              <Pressable
                key={option.value || "__empty"}
                onPress={() => onChange(option.value)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                style={({ pressed }) => ({
                  minHeight: 40,
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
                {option.color ? (
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: option.color,
                    }}
                  />
                ) : null}
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "600",
                    color: active ? theme.primaryText : theme.text,
                  }}
                >
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Field>
    );
  }

  return (
    <Field label={label} required={required} error={error} hint={hint}>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${selected?.label ?? placeholder}`}
        style={({ pressed }) => ({
          height: 48,
          flexDirection: "row",
          alignItems: "center",
          gap: spacing.sm,
          paddingHorizontal: spacing.md,
          borderWidth: 1,
          borderColor: error ? theme.danger : theme.border,
          borderRadius: 10,
          backgroundColor: pressed ? "#fafafa" : theme.card,
        })}
      >
        {selected?.color ? (
          <View
            style={{
              width: 10,
              height: 10,
              borderRadius: 5,
              backgroundColor: selected.color,
            }}
          />
        ) : null}
        <Text
          style={{
            flex: 1,
            fontSize: 16,
            color: selected ? theme.text : theme.muted,
          }}
          numberOfLines={1}
        >
          {selected?.label ?? placeholder}
        </Text>
        <Ionicons name="chevron-down" size={18} color={theme.muted} />
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable
          onPress={() => setOpen(false)}
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "flex-end" }}
        >
          {/* 中身を押しても閉じないよう、押下を止める */}
          <Pressable
            onPress={() => {}}
            style={{
              backgroundColor: theme.card,
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              maxHeight: "70%",
              paddingBottom: spacing.xxl,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                padding: spacing.lg,
                borderBottomWidth: 1,
                borderBottomColor: theme.border,
              }}
            >
              <Text style={{ flex: 1, fontSize: 16, fontWeight: "700", color: theme.text }}>
                {label}
              </Text>
              <Pressable onPress={() => setOpen(false)} hitSlop={8} accessibilityLabel="閉じる">
                <Ionicons name="close" size={22} color={theme.muted} />
              </Pressable>
            </View>

            <ScrollView>
              {options.map((option) => {
                const active = option.value === value;
                return (
                  <Pressable
                    key={option.value || "__empty"}
                    onPress={() => {
                      onChange(option.value);
                      setOpen(false);
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    style={({ pressed }) => ({
                      flexDirection: "row",
                      alignItems: "center",
                      gap: spacing.md,
                      minHeight: 52,
                      paddingHorizontal: spacing.lg,
                      backgroundColor: pressed ? "#fafafa" : theme.card,
                    })}
                  >
                    {option.color ? (
                      <View
                        style={{
                          width: 12,
                          height: 12,
                          borderRadius: 6,
                          backgroundColor: option.color,
                        }}
                      />
                    ) : null}
                    <Text style={{ flex: 1, fontSize: 16, color: theme.text }}>
                      {option.label}
                    </Text>
                    {active ? (
                      <Ionicons name="checkmark" size={20} color={theme.accent} />
                    ) : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </Field>
  );
}

/** "YYYY-MM-DD" ↔ Date。端末の暦日で読み書きする（Web の <input type="date"> と同じ） */
function dateToKey(date: Date): string {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function keyToDate(key: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!match) return new Date();
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12, 0, 0);
}

function timeToDate(time: string): Date {
  const match = /^(\d{2}):(\d{2})$/.exec(time);
  const now = new Date();
  if (!match) return now;
  now.setHours(Number(match[1]), Number(match[2]), 0, 0);
  return now;
}

function dateToTime(date: Date): string {
  return `${`${date.getHours()}`.padStart(2, "0")}:${`${date.getMinutes()}`.padStart(2, "0")}`;
}

export function DateField({
  label,
  value,
  onChange,
  required,
  error,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  error?: string;
  hint?: string;
}) {
  return (
    <Field label={label} required={required} error={error} hint={hint}>
      <View style={{ alignItems: "flex-start" }}>
        <DateTimePicker
          value={keyToDate(value)}
          mode="date"
          display={Platform.OS === "ios" ? "compact" : "default"}
          locale="ja-JP"
          onValueChange={(_event, picked) => {
            if (picked) onChange(dateToKey(picked));
          }}
        />
      </View>
    </Field>
  );
}

/**
 * 時刻。空を許す欄では clearable を立てる
 * （課題の締切は時刻が空なら「日付のみ」の扱いになる）。
 */
export function TimeField({
  label,
  value,
  onChange,
  required,
  error,
  hint,
  clearable,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  error?: string;
  hint?: string;
  clearable?: boolean;
}) {
  const empty = value === "";

  return (
    <Field label={label} required={required} error={error} hint={hint}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
        {empty && clearable ? (
          <Pressable
            onPress={() => onChange("23:59")}
            accessibilityRole="button"
            style={({ pressed }) => ({
              height: 44,
              justifyContent: "center",
              paddingHorizontal: spacing.md,
              borderWidth: 1,
              borderColor: theme.border,
              borderRadius: 10,
              backgroundColor: pressed ? "#fafafa" : theme.card,
            })}
          >
            <Text style={{ fontSize: 15, color: theme.accent }}>時刻を指定する</Text>
          </Pressable>
        ) : (
          <DateTimePicker
            value={timeToDate(value)}
            mode="time"
            display={Platform.OS === "ios" ? "compact" : "default"}
            locale="ja-JP"
            onValueChange={(_event, picked) => {
              if (picked) onChange(dateToTime(picked));
            }}
          />
        )}

        {clearable && !empty ? (
          <Pressable
            onPress={() => onChange("")}
            accessibilityRole="button"
            accessibilityLabel="時刻の指定をやめる"
            hitSlop={8}
            style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
          >
            <Ionicons name="close-circle" size={16} color={theme.muted} />
            <Text style={{ fontSize: 14, color: theme.muted }}>指定しない</Text>
          </Pressable>
        ) : null}
      </View>
    </Field>
  );
}

export function SwitchRow({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  hint?: string;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
      <View style={{ flex: 1 }}>
        <Label text={label} />
        {hint ? (
          <Text style={{ marginTop: 2, fontSize: 12, color: theme.muted }}>{hint}</Text>
        ) : null}
      </View>
      <Switch value={value} onValueChange={onChange} />
    </View>
  );
}

/** 科目の表示色。選択肢は core/validation/timetable.ts の SUBJECT_COLORS */
export function ColorField({
  label,
  value,
  colors,
  onChange,
  error,
}: {
  label: string;
  value: string;
  colors: readonly string[];
  onChange: (value: string) => void;
  error?: string;
}) {
  return (
    <Field label={label} required error={error}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.md }}>
        {colors.map((color) => {
          const active = color.toLowerCase() === value.toLowerCase();
          return (
            <Pressable
              key={color}
              onPress={() => onChange(color)}
              accessibilityRole="button"
              accessibilityLabel={`色 ${color}`}
              accessibilityState={{ selected: active }}
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: color,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: active ? 3 : 0,
                borderColor: theme.text,
              }}
            >
              {active ? <Ionicons name="checkmark" size={20} color="#ffffff" /> : null}
            </Pressable>
          );
        })}
      </View>
    </Field>
  );
}

/** 保存に失敗したときの、フォーム全体に対するお知らせ */
export function FormMessage({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.sm,
        backgroundColor: theme.dangerBg,
        borderRadius: 10,
        padding: spacing.md,
      }}
      accessibilityLiveRegion="polite"
    >
      <Ionicons name="alert-circle" size={18} color={theme.danger} />
      <Text style={{ flex: 1, fontSize: 14, color: theme.danger }}>{message}</Text>
    </View>
  );
}
