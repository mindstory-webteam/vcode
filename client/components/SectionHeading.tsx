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
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-gray-200 pb-4">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-gray-500 font-bold">
          {eyebrow}
        </p>
        <h2 className="mt-1 font-serif text-3xl font-medium tracking-tight text-gray-900 md:text-4xl">
          {title}
        </h2>
      </div>
      {badge && (
        <span
          className={`rounded-full border px-4 py-1.5 font-mono text-[11px] uppercase tracking-widest font-semibold ${
            badge.tone === "green"
              ? "border-green-200 bg-green-50 text-green-700"
              : "border-blue-200 bg-blue-50 text-[#005bb5]"
          }`}
        >
          {badge.label}
        </span>
      )}
    </div>
  );
}
