"use client";

import { useEffect, useId, useRef, useState } from "react";

import { SITE_NAME } from "@/lib/brand";

export function HelpGuide({ spots = 12 }: { spots?: number }) {
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      {!open && (
        <button
          type="button"
          className="help-btn"
          aria-label={`How to use ${SITE_NAME}`}
          onClick={() => setOpen(true)}
        >
          i
        </button>
      )}
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
                <p className="eyebrow">{SITE_NAME}</p>
                <h2 id={titleId} className="display-sm">
                  How to use it
                </h2>
              </div>
              <button
                ref={closeRef}
                type="button"
                className="help-close"
                aria-label="Close guide"
                onClick={() => setOpen(false)}
              >
                Close
              </button>
            </div>

            <div className="help-body">
              <p className="lede">
                No login. Tap your name on your own phone. WhatsApp often wipes cookies, so
                the name stays on that phone only.
              </p>

              <h3>Tabs</h3>
              <ul>
                <li>
                  <strong>Home</strong>: next locked game. You’re in / waitlist / out. Pay
                  if you owe. Drop out if you can’t make it.
                </li>
                <li>
                  <strong>Vote</strong>: open polls only. Tap every night you can actually
                  play. Tap again to undo.
                </li>
                <li>
                  <strong>Squad</strong>: who is in, waitlist, and out for upcoming locked
                  games.
                </li>
                <li>
                  <strong>Admin</strong>: organiser tools. Needs the PIN.
                </li>
              </ul>

              <h3>Locked game</h3>
              <ul>
                <li>
                  <strong>You’re in.</strong> Show up. If you have not paid, send the amount
                  on the card, then tap <strong>I’ve paid</strong>.
                </li>
                <li>
                  <strong>Waitlist #1</strong> and there is an open spot: only you can tap{" "}
                  <strong>Take the open spot</strong>. Nobody else jumps the queue.
                </li>
                <li>
                  <strong>Waitlist #2+.</strong> You wait. The name of whoever is first is on
                  the card.
                </li>
                <li>
                  <strong>Not on the list.</strong> <strong>I’ll take a spot</strong> if there
                  is space and nobody is waiting. Otherwise <strong>Join waitlist</strong>.
                </li>
                <li>
                  <strong>Can’t make it.</strong> Confirm drop. If someone is waiting, they
                  get your spot. If nobody is waiting, you still owe unless someone takes it
                  later.
                </li>
                <li>
                  Later locked games sit under <strong>Also locked in</strong> with the same
                  drop / join / pay actions.
                </li>
              </ul>

              <h3>Voting</h3>
              <ul>
                <li>Only open polls appear on Vote. Locked dates do not.</li>
                <li>
                  First {spots} votes on the winning date are in if it is booked as 5-a-side.
                  After that, waitlist.
                </li>
                <li>
                  The organiser locks a date when the pitch is booked. Voting then closes.
                </li>
              </ul>

              <h3>Pay</h3>
              <p className="muted">
                Bank details show on Home when you are in and unpaid. Copy them, pay, then{" "}
                <strong>I’ve paid</strong>. The organiser can also tick paid in Admin.
              </p>

              <h3>Organiser</h3>
              <ol>
                <li>
                  Unlock <strong>Admin</strong> with the PIN (change it in Settings).
                </li>
                <li>
                  <strong>New poll.</strong> Title + dates + notes. <strong>Put poll up</strong>.
                </li>
                <li>
                  Paste <strong>New poll</strong> from the WhatsApp pack into the group, plus
                  the site link.
                </li>
                <li>
                  When the pitch is booked: <strong>Book 5s</strong> or <strong>Book 7s</strong>.
                  That builds the squad from vote order.
                </li>
                <li>
                  Paste <strong>Date locked</strong>. Chase unpaid with{" "}
                  <strong>Chase unpaid</strong>.
                </li>
                <li>
                  Tick <strong>paid</strong> as money lands. <strong>Drop</strong> someone if
                  they are out. <strong>Add guest</strong> for a ringer.
                </li>
                <li>Optional pitch number, then Save. Match day: paste <strong>Match day</strong>.</li>
              </ol>
              <p className="muted">
                Waitlist is first-come. An open spot goes to waitlist #1 unless you add a
                guest. <strong>Hide</strong> on the squad list removes a name from the picker.
                Lock Admin when you are done.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
