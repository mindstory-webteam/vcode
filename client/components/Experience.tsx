"use client";

import { useStudentData } from "../data/StudentDataContext";
import SectionHeading from "./SectionHeading";
import CountUp from "./CountUp";
import Reveal from "./Reveal";

export default function Experience() {
  const { experience } = useStudentData();

  return (
    <section className="mx-auto max-w-6xl px-6 py-20">
      <SectionHeading
        eyebrow="Section 05"
        title="Professional Experience"
        badge={{ label: experience.role, tone: "blue" }}
      />

      <Reveal
        stagger="[data-item]"
        className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line md:grid-cols-4"
      >
        {experience.stats.map((s) => (
          <div key={s.label} data-item className="bg-white p-6 md:p-8">
            <CountUp
              to={s.value}
              suffix={s.suffix}
              className="font-display text-4xl font-semibold text-ink md:text-5xl"
            />
            <p className="mt-2 text-sm text-ink/60">{s.label}</p>
          </div>
        ))}
      </Reveal>
    </section>
  );
}
