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
        className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-gray-200 bg-gray-200 md:grid-cols-4 shadow-sm"
      >
        {experience.stats.map((s) => (
          <div key={s.label} data-item className="bg-white p-6 flex flex-col justify-between h-[120px]">
            <CountUp
              to={s.value}
              suffix={s.suffix}
              className="font-serif text-[34px] md:text-[40px] text-gray-900 leading-none tracking-tight"
            />
            <p className="text-[10px] md:text-[11px] font-bold uppercase tracking-[0.2em] text-gray-500 mt-2">{s.label}</p>
          </div>
        ))}
      </Reveal>
    </section>
  );
}
