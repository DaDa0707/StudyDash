/**
 * アプリの版。フィードバックに添えて不具合の切り分けに使う。
 *
 * Vercel では VERCEL_GIT_COMMIT_SHA が入るので、それがあれば短縮して使う。
 * 無ければ package.json の version に相当する固定値を返す。
 */
const commit = process.env.NEXT_PUBLIC_COMMIT_SHA;

export const APP_VERSION = commit ? `0.1.0+${commit.slice(0, 7)}` : "0.1.0";
