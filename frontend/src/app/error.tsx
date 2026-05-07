"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Texto error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center">
        <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-6">
          <span className="text-3xl">!</span>
        </div>
        <h2 className="text-xl font-semibold mb-2 text-foreground">
          Une erreur est survenue
        </h2>
        <p className="text-muted text-sm mb-6 max-w-sm mx-auto">
          Quelque chose s&apos;est mal passé. Veuillez réessayer.
        </p>
        <button
          onClick={reset}
          className="bg-violet-600 hover:bg-violet-700 text-white font-semibold px-6 py-3 rounded-lg transition text-sm"
        >
          Réessayer
        </button>
      </div>
    </div>
  );
}
