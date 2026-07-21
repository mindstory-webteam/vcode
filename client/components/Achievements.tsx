"use client";

import { useStudentData } from "../data/StudentDataContext";
import SectionHeading from "./SectionHeading";
import Reveal from "./Reveal";

export default function Achievements() {
  const { achievements } = useStudentData();

  return (
    <section className="mx-auto max-w-6xl px-6 py-20">
      <SectionHeading eyebrow="Section 08" title="Achievements" />

      <Reveal stagger="[data-item]" className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {achievements.map((a) => (
          <div
            key={a}
            data-item
            className="flex min-h-28 items-center justify-center rounded-2xl border border-yellow-200 bg-yellow-50 px-4 text-center shadow-sm"
          >
            <p className="text-sm font-medium text-yellow-800">{a}</p>
          </div>
        ))}
      </Reveal>
    </section>
  );
}
