"use client";

import { useEffect, useId, useRef, useState } from "react";

import { SITE_NAME } from "@/lib/brand";

export function HelpGuide({ spots = 12 }: { spots?: number }) {
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const openRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    const how = openRef.current;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
      how?.focus();
    };
  }, [open]);

  return (
    <>
      <button
        ref={openRef}
        type="button"
        className="help-btn"
        hidden={open}
        aria-label={`How ${SITE_NAME} works`}
        onClick={() => setOpen(true)}
      >
        How
      </button>
      {open && (
        <div className="help-scrim" onClick={() => setOpen(false)}>
          <div
            className="help-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="help-head">
              <div>
                <h2 id={titleId} className="display-sm">
                  Help
                </h2>
              </div>
              <button
                ref={closeRef}
                type="button"
                className="help-close"
                aria-label="Close"
                onClick={() => setOpen(false)}
              >
                Close
              </button>
            </div>

            <div className="help-body">
              <p className="lede">
                Use your own phone. WhatsApp&apos;s in-app browser forgets you, so you might
                have to pick your name again.
              </p>

              <ul>
                <li>
                  <strong>Home</strong>: next game, pay, drop out
                </li>
                <li>
                  <strong>Vote</strong>: tap every night you can actually play
                </li>
                <li>
                  <strong>Squad</strong>: who&apos;s in
                </li>
                <li>
                  <strong>Admin</strong>: PIN, organiser only
                </li>
              </ul>

              <h3>Spots</h3>
              <ul>
                <li>
                  First {spots} on the winning date are in. After that, waitlist.
                </li>
                <li>
                  Waitlist #1 gets an open spot. Nobody jumps the queue.
                </li>
                <li>
                  Drop if you can&apos;t make it. If nobody takes the spot, you still pay.
                </li>
                <li>
                  Bank details show on Home when you&apos;re in and haven&apos;t paid. Pay,
                  then <strong>I&apos;ve paid</strong>.
                </li>
              </ul>

              <h3>Organiser</h3>
              <ol>
                <li>Unlock Admin with the PIN.</li>
                <li>
                  New poll, paste it in the group with the link.
                </li>
                <li>
                  Pitch booked? <strong>Book 5s</strong> or <strong>Book 7s</strong>.
                </li>
                <li>
                  Tick paid as money lands. Drop people. Add a guest if you need a ringer.
                </li>
              </ol>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
