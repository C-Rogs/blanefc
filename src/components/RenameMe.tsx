"use client";

import { useState, useTransition } from "react";
import { renameMe } from "@/lib/actions";
import { isPhoneName } from "@/lib/format";

export function RenameMe({
  playerId,
  currentName,
  onRenamed,
}: {
  playerId: string;
  currentName: string;
  onRenamed: () => void;
}) {
  const [editing, setEditing] = useState(isPhoneName(currentName));
  const [name, setName] = useState(isPhoneName(currentName) ? "" : currentName);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (!editing) {
    return (
      <button
        type="button"
        className="text-btn"
        onClick={() => {
          setName(isPhoneName(currentName) ? "" : currentName);
          setError(null);
          setEditing(true);
        }}
      >
        Change name
      </button>
    );
  }

  return (
    <form
      className="rename-form"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await renameMe(playerId, name);
          if (res.error) {
            setError(res.error);
            return;
          }
          setError(null);
          setEditing(false);
          onRenamed();
        });
      }}
    >
      <input
        className="field"
        placeholder="Your name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        autoFocus
        autoComplete="name"
      />
      {error && <p className="error">{error}</p>}
      <div className="row">
        <button className="btn btn-primary" type="submit" disabled={pending}>
          {pending ? "Saving..." : "Save"}
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          disabled={pending}
          onClick={() => {
            setEditing(false);
            setError(null);
          }}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
