export default function ReportLoading() {
  return (
    <div className="min-h-[calc(100vh-4rem)] p-6" style={{ background: "linear-gradient(180deg, #FDF2F8 0%, #FFF7FB 100%)" }}>
      <div className="container max-w-4xl space-y-8">
        {/* Header skeleton */}
        <div className="space-y-3">
          <div className="h-8 rounded-full w-64 animate-pulse" style={{ background: "rgba(131,24,67,0.14)" }} />
          <div className="h-4 rounded-full w-96 animate-pulse" style={{ background: "rgba(131,24,67,0.10)" }} />
        </div>

        {/* Tab bar skeleton */}
        <div className="flex gap-2">
          {[120, 100, 140, 110].map((w, i) => (
            <div
              key={i}
              className="h-10 rounded-full animate-pulse"
              style={{ width: w, background: "rgba(131,24,67,0.14)" }}
            />
          ))}
        </div>

        {/* Card skeletons */}
        <div className="grid gap-6 sm:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-2xl p-6 space-y-4 animate-pulse" style={{ background: "rgba(251,231,242,0.92)", border: "1px solid rgba(131,24,67,0.14)" }}>
              <div className="h-5 rounded-full w-32" style={{ background: "rgba(131,24,67,0.18)" }} />
              <div className="h-4 rounded-full w-full" style={{ background: "rgba(131,24,67,0.12)" }} />
              <div className="h-4 rounded-full w-3/4" style={{ background: "rgba(131,24,67,0.12)" }} />
              <div className="flex gap-2 pt-2">
                {[1, 2, 3, 4].map((j) => (
                  <div key={j} className="flex-1 aspect-square rounded-xl" style={{ background: "rgba(131,24,67,0.14)" }} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
