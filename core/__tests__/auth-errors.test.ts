import { describe, expect, it } from "vitest";

import { authErrorMessage } from "../auth-errors";

describe("authErrorMessage", () => {
  it("知っているコードは決まった文言に置き換える", () => {
    expect(authErrorMessage("invalid_credentials", "だめ")).toBe(
      "メールアドレスまたはパスワードが正しくありません",
    );
    expect(authErrorMessage("email_exists", "だめ")).toBe(
      "このメールアドレスは既に登録されています",
    );
  });

  it("知らないコードは汎用文言に丸め、符牒だけ添える", () => {
    expect(authErrorMessage("something_new", "登録できませんでした")).toBe(
      "登録できませんでした（コード: something_new）",
    );
  });

  it("コードが無いときは汎用文言だけを返す", () => {
    expect(authErrorMessage(undefined, "登録できませんでした")).toBe(
      "登録できませんでした",
    );
  });

  it("内部のメッセージを漏らさない", () => {
    const message = authErrorMessage("weak_password", "だめ");
    expect(message).not.toContain("password should be");
    expect(message).toBe("パスワードが簡単すぎます。より複雑なものを設定してください");
  });
});
