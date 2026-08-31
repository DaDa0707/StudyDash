import { z } from "zod";

const email = z
  .string()
  .trim()
  .min(1, "メールアドレスを入力してください")
  .email("メールアドレスの形式が正しくありません");

/**
 * パスワード要件。Supabase 側の最小文字数設定と揃えること。
 * 学校名や本名など不要な個人情報は登録時に求めない（§9）。
 */
const password = z
  .string()
  .min(8, "パスワードは8文字以上で入力してください")
  .max(72, "パスワードは72文字以内で入力してください");

export const signUpSchema = z.object({
  email,
  password,
});

export const signInSchema = z.object({
  email,
  password: z.string().min(1, "パスワードを入力してください"),
});

export const resetPasswordSchema = z.object({
  email,
});

export const updatePasswordSchema = z
  .object({
    password,
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "パスワードが一致しません",
    path: ["confirmPassword"],
  });

export const SCHOOL_TYPES = [
  { value: "junior_high", label: "中学生" },
  { value: "high_school", label: "高校生" },
  { value: "university", label: "大学生・専門学生" },
  { value: "other", label: "その他" },
] as const;

export const onboardingSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, "表示名を入力してください")
    .max(50, "表示名は50文字以内で入力してください"),
  schoolType: z.enum(["junior_high", "high_school", "university", "other"]),
});

export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
export type OnboardingInput = z.infer<typeof onboardingSchema>;
