/** §11「読み込み中はスケルトン」 */
export default function AppLoading() {
  return (
    <div className="space-y-5" aria-busy aria-label="読み込み中">
      <div className="space-y-2">
        <div className="h-4 w-28 animate-pulse rounded bg-muted" />
        <div className="h-7 w-52 animate-pulse rounded bg-muted" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-24 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
    </div>
  );
}
