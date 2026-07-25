"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../contexts/AuthContext";
import { api } from "../../lib/api";
import Navbar from "../../components/Navbar";
import AttendanceGraph from "../../components/AttendanceGraph";
import { Loader2, CheckCircle2, XCircle, CalendarDays, Clock, ChevronLeft, ChevronRight } from "lucide-react";

interface AttendanceRecord {
  date: string;
  status: "present" | "absent" | "half_day";
  remarks?: string;
}

export default function AttendancePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/");
      return;
    }

    (async () => {
      try {
        const res = await api.get(`/api/public/verify/${user._id}`);
        if (res.report && res.report.attendance) {
          setAttendanceRecords(res.report.attendance);
        }
      } catch (err: any) {
        setError(err?.message || "Failed to load attendance data.");
      } finally {
        setFetching(false);
      }
    })();
  }, [user, authLoading, router]);

  if (authLoading || fetching) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 text-center">
        <Navbar />
        <h1 className="mt-20 font-serif text-2xl font-medium text-gray-900">Oops!</h1>
        <p className="mt-2 text-gray-600">{error}</p>
      </div>
    );
  }

  // Full History with pagination
  const fullHistory = [...attendanceRecords]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  const totalPages = Math.ceil(fullHistory.length / itemsPerPage);
  const paginatedHistory = fullHistory.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case "present": return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200"><CheckCircle2 size={12} /> Present</span>;
      case "absent": return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 border border-red-200"><XCircle size={12} /> Absent</span>;
      case "half_day": return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 border border-emerald-200"><Clock size={12} /> Half Day</span>;
      default: return <span className="text-gray-500 capitalize">{status}</span>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-20">
      <Navbar />
      
      <main className="mx-auto max-w-7xl px-6 pt-32">
        {/* Header Section */}
        <div className="mb-8">
          <h1 className="font-serif text-3xl font-medium tracking-tight">Your Attendance</h1>
          <p className="mt-1 text-sm text-gray-500">Track your daily presence and absences.</p>
        </div>

        <div className="flex flex-col gap-8">
          
          {/* Heatmap Card */}
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm overflow-hidden">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-gray-400">
              Attendance Heatmap (Last 365 Days)
            </h2>
            {attendanceRecords.length === 0 ? (
              <div className="text-center text-sm text-gray-500 py-10">
                No attendance records found yet.
              </div>
            ) : (
              <AttendanceGraph records={attendanceRecords} />
            )}
          </div>

          {/* Recent History */}
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-400">
                Full History
              </h2>
            </div>
            
            {fullHistory.length === 0 ? (
              <div className="text-center text-sm text-gray-500 py-6 bg-gray-50 rounded-xl border border-gray-100">
                No attendance history available.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="pb-3 text-xs font-medium text-gray-400 uppercase tracking-wider pl-2">Date</th>
                      <th className="pb-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                      <th className="pb-3 text-xs font-medium text-gray-400 uppercase tracking-wider pr-2">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {paginatedHistory.map((record, i) => (
                      <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                        <td className="py-4 pl-2 text-sm text-gray-900 font-medium whitespace-nowrap">
                          {formatDate(record.date)}
                        </td>
                        <td className="py-4 whitespace-nowrap">
                          {getStatusDisplay(record.status)}
                        </td>
                        <td className="py-4 pr-2 text-sm text-gray-500 max-w-[400px] truncate">
                          {record.remarks || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between border-t border-gray-100 pt-4 mt-2">
                    <span className="text-sm text-gray-500">
                      Page <span className="font-medium text-gray-900">{currentPage}</span> of <span className="font-medium text-gray-900">{totalPages}</span>
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="p-1.5 rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="p-1.5 rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}
