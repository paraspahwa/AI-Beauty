export default function UploadLoading() {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center gap-8 p-6 bg-cream">
      <div className="w-full max-w-lg space-y-6">
        {/* Upload area skeleton */}
        <div className="animate-pulse rounded-4xl border-2 border-dashed border-cream-300 bg-white/60 h-64 flex items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-cream-200" />
        </div>

        {/* Text skeletons */}
        <div className="space-y-3 text-center">
          <div className="h-6 bg-cream-200 rounded-full w-48 mx-auto animate-pulse" />
          <div className="h-4 bg-cream-100 rounded-full w-64 mx-auto animate-pulse" />
        </div>

        {/* Button skeleton */}
        <div className="h-12 bg-cream-200 rounded-xl animate-pulse" />
      </div>
    </div>
  );
}
