"use client";

import { useEffect } from "react";

function report(message: string, name?: string | null, digest?: string | null) {
  if (!message) return;
  void fetch("/api/client-error", {
    method: "POST",
    headers: { "content-type": "application/json" },
    keepalive: true,
    body: JSON.stringify({
      message: message.slice(0, 500),
      name: name?.slice(0, 120) ?? null,
      digest: digest?.slice(0, 120) ?? null,
      path: window.location.pathname.slice(0, 500),
    }),
  }).catch(() => undefined);
}

export function reportBonoaClientError(error: unknown, digest?: string | null) {
  if (typeof window === "undefined") return;
  if (error instanceof Error) report(error.message, error.name, digest ?? null);
  else report(String(error || "Unknown client error"), "UnknownError", digest ?? null);
}

export default function ClientObservability() {
  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      report(event.message || event.error?.message || "Unhandled browser error", event.error?.name || "Error", null);
    };

    const onRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      if (reason instanceof Error) report(reason.message, reason.name, null);
      else report(String(reason || "Unhandled promise rejection"), "UnhandledRejection", null);
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return null;
}
