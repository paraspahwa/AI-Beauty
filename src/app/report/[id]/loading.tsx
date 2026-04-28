export default function ReportLoading() {
  return (
    <div className="min-h-[calc(100vh-4rem)] p-6 bg-cream">
      <div className="container max-w-4xl space-y-8">
        {/* Header skeleton */}
        <div className="space-y-3">
          <div className="h-8 bg-cream-200 rounded-full w-64 animate-pulse" />
          <div className="h-4 bg-cream-100 rounded-full w-96 animate-pulse" />
        </div>

        {/* Tab bar skeleton */}
        <div className="flex gap-2">
          {[120, 100, 140, 110].map((w, i) => (
            <div
              key={i}
              className="h-10 bg-cream-200 rounded-full animate-pulse"
              style={{ width: w }}
            />
          ))}
        </div>

        {/* Card skeletons */}
        <div className="grid gap-6 sm:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-2xl bg-white border border-cream-200 p-6 space-y-4 animate-pulse">
              <div className="h-5 bg-cream-200 rounded-full w-32" />
              <div className="h-4 bg-cream-100 rounded-full w-full" />
              <div className="h-4 bg-cream-100 rounded-full w-3/4" />
              <div className="flex gap-2 pt-2">
                {[1, 2, 3, 4].map((j) => (
                  <div key={j} className="flex-1 aspect-square rounded-xl bg-cream-200" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
