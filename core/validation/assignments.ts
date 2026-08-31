import { z } from "zod";

/** 空文字を null に寄せる（任意項目のフォーム値は "" で届く） */
const optionalText = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, `${label}は${max}文字以内で入力してください`)
    .transform((value) => (value === "" ? null : value))
    .nullable();

const PRIORITY_VALUES = ["low", "medium", "high"] as const;
type Priority = (typeof PRIORITY_VALUES)[number];

/** 未選択なら null。型述語で絞り込むことで、出力型を PriorityLevel | null にする。 */
const optionalPriority = z
  .string()
  .trim()
  .transform((value) => (value === "" ? null : value))
  .refine(
    (value): value is Priority | null =>
      value === null || (PRIORITY_VALUES as readonly string[]).includes(value),
    "優先度を選び直してください",
  );

/** 課題（§5.2） */
export const assignmentSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "タイトルを入力してください")
    .max(100, "タイトルは100文字以内で入力してください"),
  /** 未選択なら null。科目は任意（§5.2） */
  subjectId: z
    .string()
    .trim()
    .transform((value) => (value === "" ? null : value))
    .nullable()
    .refine(
      (value) => value === null || z.uuid().safeParse(value).success,
      "科目の指定が正しくありません",
    ),
  dueDate: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "締切日を入力してください"),
  /** 空なら日付のみの締切として扱う */
  dueTime: z
    .string()
    .trim()
    .regex(/^(\d{2}:\d{2})?$/, "時刻の形式が正しくありません"),
  priority: optionalPriority,
  status: z.enum(["not_started", "in_progress", "done"]),
  note: optionalText(2000, "メモ"),
});

/** Todo（§3.1 F-05）。期限は任意。 */
export const todoSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "内容を入力してください")
    .max(100, "内容は100文字以内で入力してください"),
  dueDate: z
    .string()
    .trim()
    .regex(/^(\d{4}-\d{2}-\d{2})?$/, "期限の形式が正しくありません"),
});

export type AssignmentInput = z.infer<typeof assignmentSchema>;
export type TodoInput = z.infer<typeof todoSchema>;
