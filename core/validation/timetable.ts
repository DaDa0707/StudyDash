import { z } from "zod";

import { MAX_PERIOD, MIN_PERIOD, parseTimeToMinutes } from "../timetable";

/** 表示色。DB 側の check 制約（^#[0-9a-fA-F]{6}$）と揃える。 */
const hexColor = z
  .string()
  .trim()
  .regex(/^#[0-9a-fA-F]{6}$/, "色の指定が正しくありません");

const timeString = z
  .string()
  .trim()
  .min(1, "時刻を入力してください")
  .refine((value) => parseTimeToMinutes(value) !== null, "時刻の形式が正しくありません");

/** 空文字を null に寄せる（任意項目のフォーム値は "" で届く） */
const optionalText = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, `${label}は${max}文字以内で入力してください`)
    .transform((value) => (value === "" ? null : value))
    .nullable();

export const SUBJECT_COLORS = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#14b8a6",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#64748b",
] as const;

export const subjectSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "科目名を入力してください")
    .max(50, "科目名は50文字以内で入力してください"),
  color: hexColor,
  teacher: optionalText(50, "先生名"),
});

export const classSessionSchema = z
  .object({
    subjectId: z.uuid("科目を選択してください"),
    weekday: z.coerce
      .number()
      .int()
      .min(1, "曜日を選択してください")
      .max(7, "曜日を選択してください"),
    period: z.coerce
      .number()
      .int()
      .min(MIN_PERIOD, `時限は${MIN_PERIOD}〜${MAX_PERIOD}の範囲で選んでください`)
      .max(MAX_PERIOD, `時限は${MIN_PERIOD}〜${MAX_PERIOD}の範囲で選んでください`),
    startTime: timeString,
    endTime: timeString,
    room: optionalText(50, "教室"),
    note: optionalText(500, "メモ"),
  })
  .refine(
    (values) => {
      const start = parseTimeToMinutes(values.startTime);
      const end = parseTimeToMinutes(values.endTime);
      return start !== null && end !== null && end > start;
    },
    { message: "終了時刻は開始時刻より後にしてください", path: ["endTime"] },
  );

export type SubjectInput = z.infer<typeof subjectSchema>;
export type ClassSessionInput = z.infer<typeof classSessionSchema>;
