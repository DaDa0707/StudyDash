/**
 * supabase/migrations/ の SQL を順に適用する。
 *
 *   npm run migrate          適用する
 *   npm run migrate -- --dry 適用せず、これから流すものを一覧する
 *
 * 接続先は .env.local の SUPABASE_DB_URL。
 * ダッシュボードの Connect → Session pooler の URI を入れておく。
 *
 * 適用済みのファイル名は public.schema_migrations に記録するので、
 * 二度目以降は差分だけが流れる。
 */

import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const MIGRATIONS_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "supabase",
  "migrations",
);

const connectionString = process.env.SUPABASE_DB_URL;

if (!connectionString) {
  console.error(
    "SUPABASE_DB_URL が設定されていません。\n" +
      "Supabase ダッシュボードの Connect → Session pooler の URI を .env.local に入れてください。",
  );
  process.exit(1);
}

const dryRun = process.argv.includes("--dry");

const client = new pg.Client({
  connectionString,
  // Supabase は TLS 必須。プーラーの証明書は自己署名のため検証を外す。
  ssl: { rejectUnauthorized: false },
});

/** 接続文字列そのものは出さず、どこに繋いだかだけ示す */
function describeTarget(url) {
  try {
    const parsed = new URL(url);
    return `${parsed.hostname}:${parsed.port || 5432}`;
  } catch {
    return "(解析できない接続文字列)";
  }
}

try {
  await client.connect();
  console.log(`接続先: ${describeTarget(connectionString)}`);

  await client.query(`
    create table if not exists public.schema_migrations (
      version    text primary key,
      applied_at timestamptz not null default now()
    );
  `);

  const { rows } = await client.query("select version from public.schema_migrations");
  const applied = new Set(rows.map((row) => row.version));

  const files = readdirSync(MIGRATIONS_DIR)
    .filter((name) => name.endsWith(".sql"))
    .sort();

  const pending = files.filter((name) => !applied.has(name));

  console.log(`\nマイグレーション: 全${files.length}件 / 適用済み${applied.size}件 / 未適用${pending.length}件`);

  if (pending.length === 0) {
    console.log("\n適用するものはありません。");
    process.exit(0);
  }

  for (const name of pending) {
    console.log(`  - ${name}${dryRun ? "" : " …"}`);
  }

  if (dryRun) {
    console.log("\n--dry のため適用しませんでした。");
    process.exit(0);
  }

  for (const name of pending) {
    const sql = readFileSync(join(MIGRATIONS_DIR, name), "utf8");
    console.log(`\n${name} を適用中…`);

    // 1ファイル＝1トランザクション。途中で失敗したらその分は丸ごと巻き戻す。
    await client.query("begin");
    try {
      await client.query(sql);
      await client.query("insert into public.schema_migrations (version) values ($1)", [name]);
      await client.query("commit");
      console.log(`  適用しました`);
    } catch (error) {
      await client.query("rollback");
      console.error(`\n${name} で失敗しました。このファイルの変更は巻き戻しました。`);
      console.error(`  ${error.message}`);
      if (error.position) {
        const upto = readFileSync(join(MIGRATIONS_DIR, name), "utf8").slice(
          0,
          Number(error.position),
        );
        console.error(`  ${upto.split("\n").length} 行目付近`);
      }
      if (error.detail) console.error(`  詳細: ${error.detail}`);
      if (error.hint) console.error(`  ヒント: ${error.hint}`);
      process.exit(1);
    }
  }

  console.log("\nすべて適用しました。");
} catch (error) {
  console.error("\n接続または実行に失敗しました。");
  console.error(`  ${error.message}`);
  if (error.code === "ENOTFOUND" || error.code === "ECONNREFUSED") {
    console.error(
      "  接続文字列を確認してください。IPv4 環境では Session pooler の URI を使う必要があります。",
    );
  }
  process.exit(1);
} finally {
  await client.end().catch(() => {});
}
