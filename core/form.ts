import type { ZodError } from "zod";

/** Server Action がフォームへ返す共通の結果型 */
export interface FormState {
  status: "idle" | "error" | "success";
  message?: string;
  /** フィールド名 -> エラーメッセージ */
  fieldErrors?: Record<string, string>;
}

export const idleFormState: FormState = { status: "idle" };

export function errorState(message: string, fieldErrors?: Record<string, string>): FormState {
  return { status: "error", message, fieldErrors };
}

export function successState(message?: string): FormState {
  return { status: "success", message };
}

/** Zod のエラーをフィールド単位の1メッセージへ畳み込む */
export function toFieldErrors(error: ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !(key in result)) {
      result[key] = issue.message;
    }
  }
  return result;
}
