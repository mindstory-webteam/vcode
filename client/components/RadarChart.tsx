"use client";

import { useLayoutEffect, useRef } from "react";
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from "chart.js";
import { Radar } from "react-chartjs-2";
import { gsap, prefersReducedMotion } from "../lib/gsap";
import { useStudentData } from "../data/StudentDataContext";

ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
);

export default function RadarChart() {
  const { evaluation } = useStudentData();
  const scope = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const el = scope.current;
    if (!el || prefersReducedMotion()) return;

    const ctx = gsap.context(() => {
      gsap.from("[data-animate-radar]", {
        y: 20,
        opacity: 0,
        duration: 0.6,
        scrollTrigger: { trigger: el, start: "top 80%", once: true },
        ease: "power3.out"
      });
    }, el);

    return () => ctx.revert();
  }, []);

  if (evaluation.length === 0) return null;

  const formatLabel = (label: string) => {
    if (typeof label === "string" && label.includes(" ") && label.length > 12) {
      const words = label.split(" ");
      const mid = Math.ceil(words.length / 2);
      return [words.slice(0, mid).join(" "), words.slice(mid).join(" ")];
    }
    return label;
  };

  const data = {
    labels: evaluation.map((s) => formatLabel(s.label)),
    datasets: [
      {
        label: "Competency Score",
        data: evaluation.map((s) => s.score),
        backgroundColor: "rgba(0, 91, 181, 0.12)",
        borderColor: "#005bb5",
        borderWidth: 2,
        pointBackgroundColor: "#005bb5",
        pointBorderColor: "#ffffff",
        pointHoverBackgroundColor: "#ffffff",
        pointHoverBorderColor: "#005bb5",
        pointRadius: 4.5,
        pointBorderWidth: 1.5,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: "rgba(255, 255, 255, 0.95)",
        titleColor: "#1f2937",
        bodyColor: "#1f2937",
        bodyFont: { weight: "bold" as const },
        borderColor: "#e5e7eb",
        borderWidth: 1,
        padding: 12,
        displayColors: false,
      },
    },
    scales: {
      r: {
        min: 0,
        max: 100,
        ticks: {
          display: false,
          stepSize: 20,
        },
        grid: {
          color: "#e5e7eb",
          circular: false,
          borderDash: [4, 4],
        },
        angleLines: {
          color: "#e5e7eb",
          borderDash: [4, 4],
        },
        pointLabels: {
          font: (context: any) => {
            const width = context.chart?.width || 500;
            const size = width < 450 ? 10 : width < 768 ? 11 : 12;
            return {
              size,
              weight: "600",
              family: "ui-sans-serif, system-ui, sans-serif",
            };
          },
          color: "#4b5563",
          padding: 8,
        },
      },
    },
  };

  return (
    <section ref={scope} className="pb-12 sm:pb-16">
      <div className="w-full max-w-[1600px] mx-auto relative px-4 sm:px-6 md:px-10 lg:px-16 xl:px-[100px]">
        <div data-animate-radar className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden px-5 sm:px-8 md:px-12 lg:px-14 pt-8 sm:pt-10 md:pt-12 pb-8 sm:pb-12 md:pb-14">
          
          {/* Header */}
          <div className="flex items-start gap-4 pb-6 sm:pb-8 border-b border-gray-200 mb-8 sm:mb-10 md:mb-12">
            <div>
              <p className="font-mono text-[10px] md:text-[11px] font-bold tracking-[0.2em] text-gray-500 uppercase">
                Section 03
              </p>
              <h2 className="mt-1 font-serif text-2xl sm:text-3xl md:text-4xl text-gray-900 leading-tight">
                Competency Radar
              </h2>
            </div>
          </div>

          <div className="flex items-center justify-center h-[340px] sm:h-[420px] md:h-[500px] lg:h-[550px] w-full max-w-3xl mx-auto">
            <Radar data={data} options={options as any} />
          </div>

        </div>
      </div>
    </section>
  );
}
