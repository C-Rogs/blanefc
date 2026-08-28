import { dateParts } from "@/lib/format";

export function Crest({ size = 28 }: { size?: number }) {
  return (
    <span
      className="crest"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.5) }}
      aria-hidden
    >
      B
    </span>
  );
}

export function MapPin() {
  return (
    <svg className="map-pin" viewBox="0 0 24 24" width="14" height="14" aria-hidden>
      <path
        fill="currentColor"
        d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z"
      />
    </svg>
  );
}

export function DateBlock({
  iso,
  size = "lg",
}: {
  iso: string;
  size?: "lg" | "sm";
}) {
  const { dow, day, month } = dateParts(iso);
  return (
    <div className={`date-block${size === "sm" ? " sm" : ""}`}>
      <span className="date-dow">{dow}</span>
      <span className="date-num">{day}</span>
      <span className="date-mon">{month}</span>
    </div>
  );
}
