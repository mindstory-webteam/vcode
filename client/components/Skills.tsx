"use client";

import { useStudentData } from "../data/StudentDataContext";
import SectionHeading from "./SectionHeading";
import Reveal from "./Reveal";

export default function Skills() {
  const { verifiedSkills } = useStudentData();

  return (
    <section className="mx-auto max-w-6xl px-6 py-20">
      <SectionHeading
        eyebrow="Section 06"
        title="Verified Skills"
        badge={{ label: `${verifiedSkills.length} skills assessed`, tone: "blue" }}
      />

      <Reveal stagger="[data-item]" className="flex flex-wrap gap-3">
        {verifiedSkills.map((s) => (
          <span
            key={s.label}
            data-item
            className="inline-flex items-center gap-2.5 rounded-full border border-line bg-white py-2 pl-4 pr-2 text-sm text-ink transition-colors hover:border-cobalt/40"
          >
            {s.label}
            <span className="rounded-full bg-cobalt/10 px-2.5 py-0.5 font-mono text-xs text-cobalt">
              {s.score}
            </span>
          </span>
        ))}
      </Reveal>
    </section>
  );
}
