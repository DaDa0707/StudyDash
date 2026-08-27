/**
 * DB 層の受け入れ条件を実際の挙動で検証する（仕様書 §12）。
 *
 *   cp .env.example .env.local   # 値を入れる
 *   npm run verify:db
 *
 * 検証するもの:
 *   A-01  登録でプロフィール等の付随レコードが作られる（handle_new_user）
 *   A-07  Pro 権限が DB 側で守られる（本人が entitlement を書き換えられない）
 *   A-09  別ユーザーのデータへアクセスできない（RLS）
 *   A-10  アカウント削除で作成データが消える（ON DELETE CASCADE）
 *   スキーマ  0002 で追加した一時停止用の列が存在する
 *
 * このスクリプトは検証専用のユーザーを2つ作り、最後に必ず削除する。
 * 既存のデータには一切触れない。
 */

import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!URL || !ANON || !SERVICE) {
  console.error(
    "環境変数が足りません。" +
      "NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY を設定してください。",
  );
  process.exit(1);
}

const admin = createClient(URL, SERVICE, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const results = [];
let currentGroup = "";

function group(name) {
  currentGroup = name;
  console.log("\n" + name);
}

function record(ok, label, detail) {
  results.push({ group: currentGroup, ok, label, detail });
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}`);
  if (detail) console.log(`        ${detail}`);
}

async function check(label, fn) {
  try {
    const detail = await fn();
    record(true, label, detail);
  } catch (error) {
    record(false, label, error instanceof Error ? error.message : String(error));
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

/** 検証用ユーザーを作る（メール確認済みの状態で作成する） */
async function createTestUser(tag) {
  const email = `studydash-verify-${tag}-${randomUUID().slice(0, 8)}@example.com`;
  const password = `Vf-${randomUUID()}`;

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: `検証ユーザー${tag}` },
  });

  if (error) throw new Error(`テストユーザーを作成できません: ${error.message}`);

  const client = createClient(URL, ANON, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error: signInError } = await client.auth.signInWithPassword({ email, password });
  if (signInError) throw new Error(`ログインできません: ${signInError.message}`);

  return { id: data.user.id, email, client };
}

async function deleteUser(id) {
  if (!id) return;
  await admin.auth.admin.deleteUser(id).catch(() => {});
}

let userA = null;
let userB = null;

try {
  console.log(`対象: ${URL}`);

  // -------------------------------------------------------------------------
  group("準備：検証用ユーザーを2つ作る");
  // -------------------------------------------------------------------------
  await check("ユーザーAを作成してログイン", async () => {
    userA = await createTestUser("a");
    return userA.email;
  });

  await check("ユーザーBを作成してログイン", async () => {
    userB = await createTestUser("b");
    return userB.email;
  });

  assert(userA && userB, "検証用ユーザーを用意できませんでした");

  // -------------------------------------------------------------------------
  group("A-01 登録時に付随レコードが作られる（handle_new_user）");
  // -------------------------------------------------------------------------
  await check("profiles が作られている", async () => {
    const { data, error } = await userA.client
      .from("profiles")
      .select("id, display_name, plan")
      .eq("id", userA.id)
      .maybeSingle();

    assert(!error, `取得に失敗: ${error?.message}`);
    assert(data, "profiles の行がありません");
    assert(data.plan === "free", `既定プランが free ではありません: ${data.plan}`);
    return `display_name=${data.display_name} / plan=${data.plan}`;
  });

  await check("notification_settings が作られている", async () => {
    const { data } = await userA.client
      .from("notification_settings")
      .select("user_id, assignment_reminders")
      .eq("user_id", userA.id)
      .maybeSingle();
    assert(data, "notification_settings の行がありません");
    return `assignment_reminders=${data.assignment_reminders}`;
  });

  await check("subscriptions が free で作られている", async () => {
    const { data } = await userA.client
      .from("subscriptions")
      .select("user_id, entitlement")
      .eq("user_id", userA.id)
      .maybeSingle();
    assert(data, "subscriptions の行がありません");
    assert(data.entitlement === "free", `既定が free ではありません: ${data.entitlement}`);
    return `entitlement=${data.entitlement}`;
  });

  // -------------------------------------------------------------------------
  group("スキーマ：0002 の一時停止用の列");
  // -------------------------------------------------------------------------
  await check("study_sessions に segment_started_at / accumulated_sec がある", async () => {
    const startedAt = new Date().toISOString();
    const { data, error } = await userA.client
      .from("study_sessions")
      .insert({
        user_id: userA.id,
        started_at: startedAt,
        segment_started_at: startedAt,
        accumulated_sec: 0,
      })
      .select("id, segment_started_at, accumulated_sec")
      .single();

    assert(!error, `挿入に失敗: ${error?.message}（0002 を適用していますか）`);
    assert(data.accumulated_sec === 0, "accumulated_sec の既定値が違います");
    await userA.client.from("study_sessions").delete().eq("id", data.id);
    return "計測中の行を作成して削除できた";
  });

  await check("実行中のタイマーはユーザーごとに1件まで", async () => {
    const now = new Date().toISOString();
    const first = await userA.client
      .from("study_sessions")
      .insert({ user_id: userA.id, started_at: now, segment_started_at: now })
      .select("id")
      .single();
    assert(!first.error, `1件目の挿入に失敗: ${first.error?.message}`);

    const second = await userA.client
      .from("study_sessions")
      .insert({ user_id: userA.id, started_at: now, segment_started_at: now });

    const blocked = Boolean(second.error);
    await userA.client.from("study_sessions").delete().eq("id", first.data.id);

    assert(blocked, "2件目の実行中セッションが作れてしまいました");
    return "2件目は部分ユニークインデックスで弾かれた";
  });

  // -------------------------------------------------------------------------
  group("A-09 別ユーザーのデータへアクセスできない（RLS）");
  // -------------------------------------------------------------------------
  let subjectId = null;

  await check("ユーザーAが自分の科目を作れる", async () => {
    const { data, error } = await userA.client
      .from("subjects")
      .insert({ user_id: userA.id, name: `検証科目-${randomUUID().slice(0, 6)}` })
      .select("id, name")
      .single();

    assert(!error, `挿入に失敗: ${error?.message}`);
    subjectId = data.id;
    return data.name;
  });

  await check("ユーザーBからAの科目が見えない（SELECT）", async () => {
    const { data, error } = await userB.client
      .from("subjects")
      .select("id")
      .eq("id", subjectId);

    assert(!error, `クエリに失敗: ${error?.message}`);
    assert(data.length === 0, `${data.length}件見えてしまいました`);
    return "0件";
  });

  await check("ユーザーBがAの科目を書き換えられない（UPDATE）", async () => {
    const { data, error } = await userB.client
      .from("subjects")
      .update({ name: "乗っ取り" })
      .eq("id", subjectId)
      .select("id");

    assert(!error || error.code === "42501", `想定外のエラー: ${error?.message}`);
    assert(!data || data.length === 0, "更新できてしまいました");

    const { data: after } = await userA.client
      .from("subjects")
      .select("name")
      .eq("id", subjectId)
      .single();
    assert(after.name !== "乗っ取り", "値が書き換わっています");
    return "0件（値も変わっていない）";
  });

  await check("ユーザーBがAの科目を削除できない（DELETE）", async () => {
    await userB.client.from("subjects").delete().eq("id", subjectId);

    const { data } = await userA.client.from("subjects").select("id").eq("id", subjectId);
    assert(data.length === 1, "削除されてしまいました");
    return "行は残っている";
  });

  await check("他人の user_id を指定して挿入できない（INSERT）", async () => {
    const { error } = await userB.client
      .from("todos")
      .insert({ user_id: userA.id, title: "なりすまし" });

    assert(error, "他人名義で挿入できてしまいました");
    return `RLS が拒否: ${error.code ?? error.message}`;
  });

  await check("未ログインでは何も読めない", async () => {
    const anon = createClient(URL, ANON, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await anon.from("subjects").select("id");

    assert(!error || error.code === "42501", `想定外のエラー: ${error?.message}`);
    assert(!data || data.length === 0, `${data.length}件見えてしまいました`);
    return "0件";
  });

  // -------------------------------------------------------------------------
  group("A-07 Pro 権限が DB 側で守られる");
  // -------------------------------------------------------------------------
  await check("本人でも entitlement を pro に書き換えられない", async () => {
    const { data, error } = await userA.client
      .from("subscriptions")
      .update({ entitlement: "pro" })
      .eq("user_id", userA.id)
      .select("entitlement");

    assert(!error || error.code === "42501", `想定外のエラー: ${error?.message}`);
    assert(!data || data.length === 0, "自分で Pro にできてしまいました");

    const { data: after } = await userA.client
      .from("subscriptions")
      .select("entitlement")
      .eq("user_id", userA.id)
      .single();

    assert(after.entitlement === "free", `entitlement が ${after.entitlement} になっています`);
    return "更新は0件、値は free のまま";
  });

  await check("本人は自分の entitlement を読める", async () => {
    const { data, error } = await userA.client
      .from("subscriptions")
      .select("entitlement")
      .eq("user_id", userA.id)
      .single();
    assert(!error, `取得に失敗: ${error?.message}`);
    return `entitlement=${data.entitlement}`;
  });

  await check("service_role からは更新できる（Webhook 経路）", async () => {
    const { error } = await admin
      .from("subscriptions")
      .update({ entitlement: "pro", status: "active" })
      .eq("user_id", userA.id);
    assert(!error, `更新に失敗: ${error?.message}`);

    const { data } = await userA.client
      .from("subscriptions")
      .select("entitlement")
      .eq("user_id", userA.id)
      .single();
    assert(data.entitlement === "pro", "反映されていません");

    await admin
      .from("subscriptions")
      .update({ entitlement: "free", status: null })
      .eq("user_id", userA.id);
    return "service_role では更新でき、本人からも読める";
  });

  // -------------------------------------------------------------------------
  group("A-10 アカウント削除で作成データが消える");
  // -------------------------------------------------------------------------
  await check("削除前にユーザーAのデータを用意する", async () => {
    const due = new Date(Date.now() + 86_400_000).toISOString();
    const [assignment, todo] = await Promise.all([
      userA.client
        .from("assignments")
        .insert({ user_id: userA.id, title: "検証課題", due_at: due })
        .select("id")
        .single(),
      userA.client
        .from("todos")
        .insert({ user_id: userA.id, title: "検証Todo" })
        .select("id")
        .single(),
    ]);

    assert(!assignment.error, `課題の作成に失敗: ${assignment.error?.message}`);
    assert(!todo.error, `Todoの作成に失敗: ${todo.error?.message}`);
    return "科目・課題・Todo を作成済み";
  });

  await check("auth.users を削除すると全テーブルから消える", async () => {
    const targetId = userA.id;
    const { error } = await admin.auth.admin.deleteUser(targetId);
    assert(!error, `削除に失敗: ${error?.message}`);
    userA = null;

    const tables = [
      "profiles",
      "subjects",
      "assignments",
      "todos",
      "study_sessions",
      "notification_settings",
      "subscriptions",
    ];

    const remaining = [];
    for (const table of tables) {
      const column = table === "profiles" ? "id" : "user_id";
      const { count, error: countError } = await admin
        .from(table)
        .select(column, { count: "exact", head: true })
        .eq(column, targetId);

      assert(!countError, `${table} の確認に失敗: ${countError?.message}`);
      if ((count ?? 0) > 0) remaining.push(`${table}=${count}件`);
    }

    assert(remaining.length === 0, `残っています: ${remaining.join(", ")}`);
    return `${tables.length}テーブルすべてで0件`;
  });

  await check("ユーザーBのデータは消えていない", async () => {
    const { data, error } = await userB.client
      .from("profiles")
      .select("id")
      .eq("id", userB.id)
      .maybeSingle();
    assert(!error, `取得に失敗: ${error?.message}`);
    assert(data, "無関係のユーザーまで消えています");
    return "残っている";
  });
} catch (error) {
  record(
    false,
    "検証を続行できませんでした",
    error instanceof Error ? error.message : String(error),
  );
} finally {
  await deleteUser(userA?.id);
  await deleteUser(userB?.id);
}

// ---------------------------------------------------------------------------
const failed = results.filter((r) => !r.ok);
console.log("\n" + "-".repeat(60));
console.log(`${results.length - failed.length} / ${results.length} 件パス`);

if (failed.length > 0) {
  console.log("\n失敗:");
  for (const item of failed) {
    console.log(`  - [${item.group}] ${item.label}`);
    if (item.detail) console.log(`      ${item.detail}`);
  }
  process.exit(1);
}

console.log("\nDB 層の受け入れ条件（A-01 / A-07 / A-09 / A-10）はすべて満たしています。");
