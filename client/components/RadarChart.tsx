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

  const data = {
    labels: evaluation.map((s) => s.label),
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
          font: {
            size: 13,
            weight: "600",
            family: "ui-sans-serif, system-ui, sans-serif",
          },
          color: "#4b5563",
        },
      },
    },
  };

  return (
    <section ref={scope} className=" pb-16">
      <div className="w-full max-w-[1600px] mx-auto relative px-4 sm:px-[100px]">
        <div data-animate-radar className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden px-8 md:px-14 pt-10 md:pt-12 pb-14">
          
          {/* Header */}
          <div className="flex items-start gap-4 pb-8 border-b border-gray-200 mb-12">
           
            <div>
              <p className="font-mono text-[10px] md:text-[11px] font-bold tracking-[0.2em] text-gray-500 uppercase">
                Section 03
              </p>
              <h2 className="mt-1 font-serif text-3xl md:text-4xl text-gray-900 leading-tight">
                Competency Radar
              </h2>
            </div>
          </div>

          <div className="flex justify-center h-[400px] md:h-[600px] w-full max-w-4xl mx-auto">
            <Radar data={data} options={options as any} />
          </div>

        </div>
      </div>
    </section>
  );
}
