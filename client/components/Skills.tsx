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
            className="inline-flex items-center gap-2.5 rounded-full border border-gray-200 bg-white py-2 pl-4 pr-2 text-sm text-gray-700 font-medium transition-colors hover:border-blue-300 shadow-sm"
          >
            {s.label}
            <span className="rounded-full bg-blue-50 px-2.5 py-0.5 font-mono text-xs text-[#005bb5] font-semibold">
              {s.score}
            </span>
          </span>
        ))}
      </Reveal>
    </section>
  );
}
