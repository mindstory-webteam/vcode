"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import { gsap, prefersReducedMotion } from "../lib/gsap";
import { useStudentData } from "../data/StudentDataContext";
import SectionHeading from "./SectionHeading";

const SIZE = 460;
const CENTER = SIZE / 2;
const RADIUS = 160;
const RINGS = [0.25, 0.5, 0.75, 1];

function polar(angle: number, r: number) {
  return {
    x: CENTER + r * Math.cos(angle - Math.PI / 2),
    y: CENTER + r * Math.sin(angle - Math.PI / 2),
  };
}

export default function RadarChart() {
  const { evaluation, student } = useStudentData();
  const scope = useRef<HTMLElement>(null);

  const { gridPolys, axes, dataPoints, labels } = useMemo(() => {
    const n = evaluation.length;
    if (n === 0) return { gridPolys: [], axes: [], dataPoints: [], labels: [] };

    const angleAt = (i: number) => (i / n) * Math.PI * 2;

    const gridPolys = RINGS.map((f) =>
      evaluation
        .map((_, i) => {
          const p = polar(angleAt(i), RADIUS * f);
          return `${p.x},${p.y}`;
        })
        .join(" ")
    );

    const axes = evaluation.map((_, i) => polar(angleAt(i), RADIUS));

    const dataPoints = evaluation.map((s, i) =>
      polar(angleAt(i), RADIUS * (s.score / 100))
    );

    const labels = evaluation.map((s, i) => {
      const p = polar(angleAt(i), RADIUS + 34);
      return { ...p, text: s.label, score: s.score };
    });

    return { gridPolys, axes, dataPoints, labels };
  }, [evaluation]);

  const dataPolygon = dataPoints.map((p) => `${p.x},${p.y}`).join(" ");

  useLayoutEffect(() => {
    const el = scope.current;
    if (!el || prefersReducedMotion()) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: { trigger: el, start: "top 70%", once: true },
      });

      tl.from("[data-radar-grid]", {
        scale: 0,
        transformOrigin: "50% 50%",
        opacity: 0,
        duration: 0.7,
        stagger: 0.08,
        ease: "power2.out",
      })
        .from("[data-radar-shape]", {
          scale: 0,
          transformOrigin: "50% 50%",
          duration: 1,
          ease: "elastic.out(1, 0.6)",
        }, "-=0.2")
        .from("[data-radar-dot]", {
          scale: 0,
          transformOrigin: "50% 50%",
          duration: 0.4,
          stagger: 0.04,
          ease: "back.out(2)",
        }, "-=0.6")
        .from("[data-radar-label]", { opacity: 0, duration: 0.5, stagger: 0.03 }, "-=0.4");
    }, el);

    return () => ctx.revert();
  }, [evaluation]);

  if (evaluation.length === 0) return null;

  return (
    <section ref={scope} className="mx-auto max-w-6xl px-6 py-20">
      <SectionHeading
        eyebrow="Section 03"
        title="Competency Radar"
        badge={{ label: `${student.readiness}% Industry Readiness`, tone: "green" }}
      />

      <div className="flex justify-center">
        <svg
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className="w-full max-w-xl"
          role="img"
          aria-label="Radar chart of competency scores"
        >
          {/* grid rings */}
          {gridPolys.map((points, i) => (
            <polygon
              key={i}
              data-radar-grid
              points={points}
              fill="none"
              stroke="#e5e7eb"
              strokeWidth="1"
            />
          ))}

          {/* axes */}
          {axes.map((p, i) => (
            <line
              key={i}
              data-radar-grid
              x1={CENTER}
              y1={CENTER}
              x2={p.x}
              y2={p.y}
              stroke="#e5e7eb"
              strokeWidth="1"
            />
          ))}

          {/* data shape */}
          <polygon
            data-radar-shape
            points={dataPolygon}
            fill="#005bb5"
            fillOpacity="0.1"
            stroke="#005bb5"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />

          {/* data dots */}
          {dataPoints.map((p, i) => (
            <circle
              key={i}
              data-radar-dot
              cx={p.x}
              cy={p.y}
              r="5"
              fill="#005bb5"
              stroke="white"
              strokeWidth="2"
            />
          ))}

          {/* labels */}
          {labels.map((l, i) => (
            <text
              key={i}
              data-radar-label
              x={l.x}
              y={l.y}
              textAnchor="middle"
              className="fill-gray-600 text-[11px] font-semibold"
            >
              <tspan x={l.x} dy="-2">{l.text}</tspan>
              <tspan x={l.x} dy="14" className="fill-[#005bb5] font-serif text-[13px]">{l.score}</tspan>
            </text>
          ))}
        </svg>
      </div>
    </section>
  );
}
