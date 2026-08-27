"use client";

import { useEffect, useRef } from "react";

import { useAnalytics } from "@/components/analytics/analytics-provider";
import type { AnalyticsEvent, AnalyticsProperties } from "@/lib/analytics";

/**
 * 画面が出たときに1回だけイベントを送る。
 *
 * 保存後にリダイレクトする操作（課題や授業の追加）は、遷移先で送ることで
 * 「成功したときだけ数える」ようにできる。
 */
export function TrackOnMount({
  event,
  properties,
}: {
  event: AnalyticsEvent;
  properties?: AnalyticsProperties;
}) {
  const capture = useAnalytics();
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    capture(event, properties);
    // capture / properties の同一性で二重送信しないよう、依存は event のみにする
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event]);

  return null;
}
