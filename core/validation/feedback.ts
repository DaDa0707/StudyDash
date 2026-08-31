import { z } from "zod";

export const FEEDBACK_CATEGORIES = [
  { value: "bug", label: "うまく動かない" },
  { value: "request", label: "こうしてほしい" },
  { value: "question", label: "使い方が分からない" },
  { value: "other", label: "その他" },
] as const;

export const feedbackSchema = z.object({
  category: z.enum(["bug", "request", "question", "other"]),
  message: z
    .string()
    .trim()
    .min(1, "内容を入力してください")
    .max(2000, "2000文字以内で入力してください"),
  pagePath: z
    .string()
    .trim()
    .max(200)
    .transform((value) => (value === "" ? null : value))
    .nullable(),
});

export type FeedbackInput = z.infer<typeof feedbackSchema>;
