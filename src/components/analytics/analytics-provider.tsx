"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";

import {
  captureWith,
  type AnalyticsEvent,
  type AnalyticsProperties,
  type AnalyticsSink,
} from "@core/analytics";

/**
 * 利用計測の送信先を差し替えられるようにする（仕様書 §7「PostHog等（後付け可）」）。
 *
 * NEXT_PUBLIC_POSTHOG_KEY が無ければ何も送らない。
 * 未設定でもアプリは普通に動く。
 *
 * 送る内容の絞り込みは src/lib/analytics.ts が担当する。
 * ここは「どこへ送るか」だけを持つ。
 */

type CaptureFn = (event: AnalyticsEvent, properties?: AnalyticsProperties) => void;

const AnalyticsContext = createContext<CaptureFn>(() => {});

export function useAnalytics(): CaptureFn {
  return useContext(AnalyticsContext);
}

interface Props {
  children: ReactNode;
  /** ログイン中のユーザー ID。未ログインなら null */
  userId: string | null;
}

export function AnalyticsProvider({ children, userId }: Props) {
  const [sink, setSink] = useState<AnalyticsSink | null>(null);
  const identified = useRef<string | null>(null);

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (!key) return;

    let cancelled = false;

    // 設定されているときだけ読み込む。未設定なら本体を配信しない。
    import("posthog-js")
      .then(({ default: posthog }) => {
        if (cancelled) return;

        posthog.init(key, {
          api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
          // 画面遷移は自前で送る。勝手な自動収集はしない（§9）。
          capture_pageview: false,
          capture_pageleave: true,
          autocapture: false,
          // 入力内容が混ざらないよう、フォームの値は記録しない
          mask_all_text: true,
          person_profiles: "identified_only",
        });

        setSink({
          capture: (event, properties) => posthog.capture(event, properties),
          identify: (id) => posthog.identify(id),
          reset: () => posthog.reset(),
        });
      })
      .catch((error) => {
        console.error("analytics init failed", error);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!sink) return;

    if (userId && identified.current !== userId) {
      identified.current = userId;
      sink.identify(userId);
      return;
    }

    if (!userId && identified.current !== null) {
      identified.current = null;
      sink.reset();
    }
  }, [sink, userId]);

  const capture: CaptureFn = (event, properties) => {
    captureWith(sink, event, properties);
  };

  return <AnalyticsContext value={capture}>{children}</AnalyticsContext>;
}
