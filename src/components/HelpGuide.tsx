"use client";

import { useEffect, useId, useRef, useState } from "react";

import { SITE_NAME } from "@/lib/brand";
import { RequestForm } from "./RequestForm";

type Panel = "help" | "feedback" | null;

export function HelpGuide({
  spots = 12,
  fromName,
}: {
  spots?: number;
  fromName?: string;
}) {
  const [panel, setPanel] = useState<Panel>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const howRef = useRef<HTMLButtonElement>(null);
  const feedbackRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!panel) return;
    const prev = document.body.style.overflow;
    const restore = panel === "feedback" ? feedbackRef.current : howRef.current;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setPanel(null);
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
      restore?.focus();
    };
  }, [panel]);

  return (
    <>
      <div className="corner-btns" hidden={panel !== null}>
        <button
          ref={feedbackRef}
          type="button"
          className="help-btn"
          aria-label="Send feedback"
          onClick={() => setPanel("feedback")}
        >
          Feedback
        </button>
        <button
          ref={howRef}
          type="button"
          className="help-btn"
          aria-label={`How ${SITE_NAME} works`}
          onClick={() => setPanel("help")}
        >
          How
        </button>
      </div>
      {panel === "feedback" && (
        <div className="help-scrim" onClick={() => setPanel(null)}>
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
                  Feedback
                </h2>
              </div>
              <button
                ref={closeRef}
                type="button"
                className="help-close"
                aria-label="Close"
                onClick={() => setPanel(null)}
              >
                Close
              </button>
            </div>
            <div className="help-body">
              <p className="lede">Bug if it&apos;s broken. Idea if you want something new. Lands with Cam.</p>
              <RequestForm fromName={fromName} />
            </div>
          </div>
        </div>
      )}
      {panel === "help" && (
        <div className="help-scrim" onClick={() => setPanel(null)}>
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
                onClick={() => setPanel(null)}
              >
                Close
              </button>
            </div>

            <div className="help-body">
              <p className="lede">
                Use your own phone. WhatsApp&apos;s in-app browser forgets you, so you might
                have to pick your name again. Signed in with a number? Tap <strong>Change name</strong>{" "}
                at the top.
              </p>

              <h3>How it works</h3>
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
                  Waitlist #1 gets an open spot. Nobody jumps the queue. Can&apos;t wait?{" "}
                  <strong>Take me off</strong>. You don&apos;t pay.
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
