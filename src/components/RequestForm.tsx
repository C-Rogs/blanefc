"use client";

import { useState, useTransition } from "react";
import { submitClubRequest } from "@/lib/actions";
import type { RequestKind } from "@/lib/types";

export function RequestForm({ fromName = "" }: { fromName?: string }) {
  const [kind, setKind] = useState<RequestKind>("bug");
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [name, setName] = useState(fromName);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();

  if (done) {
    return <p className="ok">Got it. Cam will see it.</p>;
  }

  return (
    <form
      className="stack"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await submitClubRequest({
            kind,
            title,
            details,
            fromName: name || fromName,
          });
          if (res.error) {
            setError(res.error);
            setDone(false);
            return;
          }
          setError(null);
          setDone(true);
        });
      }}
    >
      <div className="row tight">
        <button
          type="button"
          className={`chip ${kind === "bug" ? "chip-warn" : "chip-muted"}`}
          onClick={() => setKind("bug")}
        >
          Bug
        </button>
        <button
          type="button"
          className={`chip ${kind === "feature" ? "chip-ok" : "chip-muted"}`}
          onClick={() => setKind("feature")}
        >
          Idea
        </button>
      </div>
      {!fromName && (
        <input
          className="field"
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
        />
      )}
      <input
        className="field"
        placeholder={kind === "bug" ? "What's broken?" : "What do you want?"}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={80}
      />
      <textarea
        className="field area"
        placeholder="A bit more. What did you tap? What should happen?"
        value={details}
        onChange={(e) => setDetails(e.target.value)}
        maxLength={1500}
        rows={4}
      />
      {error && <p className="error">{error}</p>}
      <button className="btn btn-primary" type="submit" disabled={pending}>
        {pending ? "Sending..." : "Send"}
      </button>
    </form>
  );
}
