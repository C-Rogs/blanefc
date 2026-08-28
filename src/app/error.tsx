"use client";

import { SITE_NAME } from "@/lib/brand";

export default function ErrorView({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const missingDb = error.message.includes("DATABASE_URL");
  return (
    <div className="screen">
      <p className="eyebrow">{SITE_NAME}</p>
      <h1 className="display-sm">{missingDb ? "Database not linked" : "Something broke"}</h1>
      <p className="muted">
        {missingDb
          ? "Set DATABASE_URL to the Neon connection string, then refresh."
          : error.message}
      </p>
      <button type="button" className="btn btn-lime mt-4" onClick={reset}>
        Try again
      </button>
    </div>
  );
}
