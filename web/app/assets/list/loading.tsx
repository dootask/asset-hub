export default function AssetListLoading() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-10">
      <section className="space-y-3">
        <div className="h-4 w-24 animate-pulse rounded-full bg-muted" />
        <div className="h-6 w-48 animate-pulse rounded-full bg-muted" />
        <div className="h-3 w-64 animate-pulse rounded-full bg-muted" />
      </section>

      <section className="overflow-hidden rounded-2xl border bg-card p-6">
        <div className="grid gap-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              key={index}
              className="flex items-center gap-4 border-b pb-3 last:border-b-0 last:pb-0"
            >
              <div className="h-4 w-48 animate-pulse rounded-full bg-muted" />
              <div className="h-4 w-24 animate-pulse rounded-full bg-muted" />
              <div className="h-4 w-20 animate-pulse rounded-full bg-muted" />
              <div className="h-4 w-32 animate-pulse rounded-full bg-muted" />
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

