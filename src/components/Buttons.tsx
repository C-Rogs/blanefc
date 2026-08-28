"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

async function copyText(text: string): Promise<boolean> {
  try {
    await Promise.race([
      navigator.clipboard.writeText(text),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("clipboard timeout")), 800);
      }),
    ]);
    return true;
  } catch {
    const el = document.createElement("textarea");
    el.value = text;
    el.setAttribute("readonly", "");
    el.style.position = "fixed";
    el.style.left = "-9999px";
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(el);
    return ok;
  }
}

export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState<"ok" | "fail" | null>(null);
  return (
    <button
      type="button"
      className="btn btn-ghost"
      onClick={async () => {
        const ok = await copyText(text);
        setCopied(ok ? "ok" : "fail");
        setTimeout(() => setCopied(null), 1600);
      }}
    >
      {copied === "ok" ? "Copied" : copied === "fail" ? "Copy failed" : label}
    </button>
  );
}

export function WhatsAppButton({ text }: { text: string }) {
  return (
    <a
      className="btn btn-primary"
      href={`https://wa.me/?text=${encodeURIComponent(text)}`}
      target="_blank"
      rel="noreferrer"
    >
      WhatsApp
    </a>
  );
}

export function ActionButton({
  children,
  onClick,
  variant = "primary",
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => Promise<unknown> | unknown;
  variant?: "primary" | "ghost" | "danger" | "lime";
  disabled?: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <span className="action-wrap">
      <button
        type="button"
        className={`btn btn-${variant}`}
        disabled={disabled || pending}
        onClick={() =>
          start(async () => {
            setError(null);
            try {
              const res = await onClick();
              if (res && typeof res === "object" && "error" in res && res.error) {
                setError(String(res.error));
                return;
              }
              router.refresh();
            } catch (err) {
              setError(err instanceof Error ? err.message : "That didn't save. Tap again.");
            }
          })
        }
      >
        {pending ? "…" : children}
      </button>
      {error && <p className="error tiny">{error}</p>}
    </span>
  );
}
