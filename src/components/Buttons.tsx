"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="btn btn-ghost"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      }}
    >
      {copied ? "Copied" : label}
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
  return (
    <button
      type="button"
      className={`btn btn-${variant}`}
      disabled={disabled || pending}
      onClick={() =>
        start(async () => {
          await onClick();
          router.refresh();
        })
      }
    >
      {pending ? "..." : children}
    </button>
  );
}
