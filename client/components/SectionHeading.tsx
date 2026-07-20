interface SectionHeadingProps {
  eyebrow: string; // e.g. "Section 02"
  title: string;
  badge?: { label: string; tone?: "green" | "blue" };
}

export default function SectionHeading({
  eyebrow,
  title,
  badge,
}: SectionHeadingProps) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-line pb-4">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-cobalt">
          {eyebrow}
        </p>
        <h2 className="mt-1 font-display text-3xl font-medium tracking-tight text-ink md:text-4xl">
          {title}
        </h2>
      </div>
      {badge && (
        <span
          className={`rounded-full border px-4 py-1.5 font-mono text-[11px] uppercase tracking-widest ${
            badge.tone === "green"
              ? "border-mint/40 bg-mint/10 text-mint"
              : "border-cobalt/30 bg-cobalt/5 text-cobalt"
          }`}
        >
          {badge.label}
        </span>
      )}
    </div>
  );
}
