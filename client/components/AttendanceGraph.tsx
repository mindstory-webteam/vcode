"use client";

import React from "react";

interface AttendanceRecord {
  date: string | Date;
  status: "present" | "absent" | "half_day";
}

interface AttendanceGraphProps {
  records: AttendanceRecord[];
}

export default function AttendanceGraph({ records }: AttendanceGraphProps) {
  // Map records by date string YYYY-MM-DD
  const recordMap = new Map<string, string>();
  records.forEach((r) => {
    const d = new Date(r.date);
    if (!isNaN(d.getTime())) {
      const dateStr = d.toISOString().split("T")[0];
      recordMap.set(dateStr, r.status);
    }
  });

  // Generate the last 365 days
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - 364);
  
  // Align to Sunday
  while (startDate.getDay() !== 0) {
    startDate.setDate(startDate.getDate() - 1);
  }

  const days: { date: Date; dateStr: string; status: string; isSunday: boolean }[] = [];
  
  let current = new Date(startDate);
  while (current <= today) {
    const dateStr = current.toISOString().split("T")[0];
    const isSunday = current.getDay() === 0;
    
    let status = recordMap.get(dateStr) || "none";

    days.push({
      date: new Date(current),
      dateStr,
      status,
      isSunday
    });
    
    current.setDate(current.getDate() + 1);
  }

  // Group by weeks
  const weeks: typeof days[] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  const getColor = (status: string) => {
    switch (status) {
      case "present":
        return "bg-[#1f9c3c]"; // Dark green
      case "half_day":
        return "bg-[#833a89]"; // Purple
      case "absent":
        return "bg-[#f85149]"; // Red
      default:
        return "bg-gray-100"; // Empty/none
    }
  };

  const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  return (
    <div className="w-full py-4 flex flex-col">
      <div className="w-full pb-4 overflow-hidden">
        <div className="flex flex-col gap-1 w-full">
          {/* Months */}
          <div className="flex w-full ml-8 mb-1">
          {weeks.map((week, i) => {
            const showMonth = i === 0 || week[0].date.getMonth() !== weeks[i - 1][0].date.getMonth();
            return (
              <div key={i} className="flex-1 relative text-xs text-gray-500 h-4">
                {showMonth && (
                  <span className="absolute left-0">{monthLabels[week[0].date.getMonth()]}</span>
                )}
              </div>
            );
          })}
          </div>

        <div className="flex gap-1 w-full">
          {/* Day Labels */}
          <div className="flex flex-col justify-between text-[10px] text-gray-500 pr-2 w-6 shrink-0 py-0.5">
            <div className="flex-1 flex items-center">Sun</div>
            <div className="flex-1 flex items-center">Mon</div>
            <div className="flex-1 flex items-center">Tue</div>
            <div className="flex-1 flex items-center">Wed</div>
            <div className="flex-1 flex items-center">Thu</div>
            <div className="flex-1 flex items-center">Fri</div>
            <div className="flex-1 flex items-center">Sat</div>
          </div>

          {/* Grid */}
          <div className="flex flex-1 gap-1">
            {weeks.map((week, wIndex) => (
              <div key={wIndex} className="flex flex-1 flex-col gap-1">
                {week.map((day, dIndex) => (
                  <div
                    key={dIndex}
                    className={`aspect-square w-full rounded-[1px] md:rounded-sm ${getColor(day.status)}`}
                    title={`${day.dateStr}: ${day.status}`}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
        
      {/* Legend */}
      <div className="flex items-center justify-center gap-4 text-xs text-gray-500 mt-4 w-full flex-wrap">
        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-[#1f9c3c]" /> Present</div>
        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-[#833a89]" /> Half Day</div>
        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-[#f85149]" /> Absent</div>
      </div>
      </div>
    </div>
  );
}
