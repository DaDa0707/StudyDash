import "server-only";

import { readFileSync } from "node:fs";
import path from "node:path";

import { Environment, SignedDataVerifier } from "@apple/app-store-server-library";

/**
 * App Store のサーバー通知を検証するための設定（サーバー専用）。
 *
 * 検証に使うのは Apple の公開ルート証明書だけで、秘密情報は要らない。
 * 署名が通らない要求は一切処理しない（§9）。
 */

export const appleEnv = {
  /** アプリの bundle identifier。通知の宛先がこのアプリかを確かめる */
  bundleId: process.env.APPLE_BUNDLE_ID,
  /**
   * App Store Connect のアプリ ID（数値）。
   * 本番環境の検証に要る。Sandbox では不要。
   */
  appAppleId: process.env.APPLE_APP_APPLE_ID
    ? Number(process.env.APPLE_APP_APPLE_ID)
    : undefined,
  /** "Sandbox" か "Production"。未設定なら Sandbox に倒す */
  environment:
    process.env.APPLE_ENVIRONMENT === "Production"
      ? Environment.PRODUCTION
      : Environment.SANDBOX,
} as const;

/** 設定が揃っているか。未設定なら通知の受け口は 503 を返す */
export const isAppleConfigured = Boolean(appleEnv.bundleId);

let cached: SignedDataVerifier | null = null;

/**
 * 署名検証器。
 *
 * ルート証明書は certs/ に置いた Apple の公開証明書を読む。
 * enableOnlineChecks を有効にして、失効と有効期限も確かめる。
 */
export function getVerifier(): SignedDataVerifier {
  if (!appleEnv.bundleId) {
    throw new Error(
      "APPLE_BUNDLE_ID が設定されていません。.env.example を参考に設定してください。",
    );
  }

  cached ??= new SignedDataVerifier(
    [readFileSync(path.join(process.cwd(), "certs", "AppleRootCA-G3.cer"))],
    true,
    appleEnv.environment,
    appleEnv.bundleId,
    appleEnv.appAppleId,
  );

  return cached;
}
