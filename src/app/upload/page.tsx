"use client";

import { useRouter } from "next/navigation";
import { ImageUploader } from "@/components/ImageUploader";

export default function UploadPage() {
  const router = useRouter();

  return (
    <main className="container max-w-3xl py-16 sm:py-24">
      <header className="mb-10 text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-accent-deep">Step 1 of 2</p>
        <h1 className="mt-2 text-4xl text-ink sm:text-5xl">Upload your selfie</h1>
        <p className="mx-auto mt-3 max-w-md text-sm text-ink-soft">
          A clear, well-lit, front-facing photo gives the best results. Your image is private.
        </p>
      </header>

      <ImageUploader onUploaded={(reportId) => router.push(`/report/${reportId}`)} />

      <ul className="mx-auto mt-10 max-w-md space-y-1.5 text-xs text-ink-muted">
        <li>• Look straight into the camera, hair off your forehead.</li>
        <li>• Use natural light if possible. Avoid heavy filters.</li>
        <li>• One face per photo gives the most accurate report.</li>
      </ul>
    </main>
  );
}
