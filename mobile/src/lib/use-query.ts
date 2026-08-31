import { useCallback, useEffect, useState } from "react";

interface QueryState<T> {
  data: T | null;
  error: string | null;
  refreshing: boolean;
  reload: () => Promise<void>;
  onRefresh: () => Promise<void>;
}

/**
 * 画面ごとの「読み込み・エラー・引っぱって更新」をまとめる。
 *
 * Web 版は Server Component が毎回取り直すが、アプリは自分で持つ必要がある。
 * 各画面で同じ useState を並べたくないのでここに寄せる。
 */
export function useQuery<T>(fetcher: () => Promise<T>): QueryState<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const reload = useCallback(async () => {
    try {
      setError(null);
      setData(await fetcher());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "読み込めませんでした");
    }
    // fetcher は各画面で useCallback 済みのものを渡す
  }, [fetcher]);

  useEffect(() => {
    reload();
  }, [reload]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  }, [reload]);

  return { data, error, refreshing, reload, onRefresh };
}
