"use client";

import { useStudentData } from "../data/StudentDataContext";
import SectionHeading from "./SectionHeading";
import Reveal from "./Reveal";

export default function Portfolio() {
  const { portfolio } = useStudentData();

  return (
    <section className="bg-white py-20">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeading eyebrow="Section 07" title="Portfolio Highlights" />

        <Reveal stagger="[data-item]" className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {portfolio.map((p) => (
            <article
              key={p.title}
              data-item
              className="group flex flex-col rounded-2xl border border-line bg-paper p-6 transition-all hover:-translate-y-1 hover:border-cobalt/30 hover:shadow-xl hover:shadow-ink/5"
            >
              <p className="font-mono text-[11px] uppercase tracking-widest text-cobalt">
                {p.role}
              </p>
              <h3 className="mt-2 font-display text-xl font-medium text-ink">
                {p.title}
              </h3>

              <div className="mt-4 flex flex-wrap gap-1.5">
                {p.tools.map((t) => (
                  <span
                    key={t}
                    className="rounded-md bg-ink/5 px-2 py-0.5 font-mono text-[11px] text-ink/60"
                  >
                    {t}
                  </span>
                ))}
              </div>

              <p className="mt-auto pt-6 text-sm font-medium text-mint">
                {p.result}
              </p>
            </article>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
