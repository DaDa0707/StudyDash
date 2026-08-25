import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

/** フォーム POST からのログアウト（GET でのログアウトは受け付けない） */
export async function POST() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
