import axios from 'axios';

let rawBaseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
rawBaseURL = rawBaseURL.replace(/\/+$/, '');
if (!rawBaseURL.endsWith('/api')) {
  rawBaseURL += '/api';
}
const baseURL = rawBaseURL;

const api = axios.create({
  baseURL,
  withCredentials: true,
});

// Attach the JWT (kept in localStorage as a fallback to the httpOnly cookie)
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// On a 401, clear stale session and bounce to login
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
    return Promise.reject(err);
  }
);

// Resolves a stored file reference to a usable URL.
// Handles both new Cloudinary URLs (already absolute) and
// old local paths like /uploads/profiles/x.png
export const fileUrl = (p) => {
  if (!p) return null;
  if (p.startsWith('http')) return p; // Cloudinary
  return `${baseURL.replace('/api', '')}${p}`; // legacy local path
};

// Triggers a browser download for a Blob response (used by every Excel
// export call below, since a plain <a href> wouldn't carry the JWT).
const downloadBlob = (blob, filename) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

// ---- Auth ----
export const login = (email, password) => api.post('/auth/login', { email, password });
export const getMe = () => api.get('/auth/me');
export const logout = () => api.post('/auth/logout');

// ---- SuperAdmin ----
export const getDashboardStats = () => api.get('/superadmin/dashboard');

export const createFaculty = (data) => api.post('/superadmin/faculty', data);
export const getAllFaculty = () => api.get('/superadmin/faculty');

export const getApplications = (status) =>
  api.get('/superadmin/applications', { params: status ? { status } : {} });
export const getApplicationById = (id) => api.get(`/superadmin/applications/${id}`);
export const approveApplication = (id, assignedFacultyId) =>
  api.put(`/superadmin/applications/${id}/approve`, assignedFacultyId ? { assignedFacultyId } : {});
export const rejectApplication = (id, reason) =>
  api.put(`/superadmin/applications/${id}/reject`, { reason });
export const deleteApplication = (id) => api.delete(`/superadmin/applications/${id}`);

export const createStudent = (data) => api.post('/superadmin/students', data);
export const getAllStudents = () => api.get('/superadmin/students');
export const assignFacultyToStudent = (studentId, facultyId) =>
  api.put(`/superadmin/students/${studentId}/assign-faculty`, { facultyId });

export const toggleUserActive = (id) => api.put(`/superadmin/users/${id}/toggle-active`);
export const deleteUser = (id) => api.delete(`/superadmin/users/${id}`);

// SuperAdmin — Bulk import students & progress reports
export const bulkImportStudentsAndProgressReports = (file) => {
  const formData = new FormData();
  formData.append('file', file);
  return api.post('/superadmin/students/bulk-import-progress', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const downloadBulkImportTemplate = async () => {
  const res = await api.get('/superadmin/students/bulk-import-template', { responseType: 'blob' });
  const url = window.URL.createObjectURL(new Blob([res.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', 'bulk_students_progress_template.xlsx');
  document.body.appendChild(link);
  link.click();
  link.remove();
};

// SuperAdmin — progress report management (any student, no assignment restriction)
export const getStudentProgressReportAdmin = (studentId) =>
  api.get(`/superadmin/students/${studentId}/progress-report`);
export const addProgressEntryAdmin = (studentId, entry) =>
  api.post(`/superadmin/students/${studentId}/progress-report/entries`, entry);
export const updateProgressEntryAdmin = (studentId, entryId, entry) =>
  api.put(`/superadmin/students/${studentId}/progress-report/entries/${entryId}`, entry);
export const deleteProgressEntryAdmin = (studentId, entryId) =>
  api.delete(`/superadmin/students/${studentId}/progress-report/entries/${entryId}`);

// SuperAdmin — progress entries bulk import/export (any student)
export const bulkUploadEntriesAdmin = (studentId, file) => {
  const formData = new FormData();
  formData.append('file', file);
  return api.post(`/superadmin/students/${studentId}/progress-report/entries/bulk-upload`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};
export const exportEntriesAdmin = async (studentId, studentName = 'student') => {
  const res = await api.get(`/superadmin/students/${studentId}/progress-report/entries/export`, {
    responseType: 'blob',
  });
  const safeName = studentName.replace(/[^a-z0-9]+/gi, '_');
  downloadBlob(res.data, `${safeName}_entries.xlsx`);
};

export const updateOverallRemarksAdmin = (studentId, overallRemarks) =>
  api.put(`/superadmin/students/${studentId}/progress-report/remarks`, { overallRemarks });
export const updateGradeCardAdmin = (studentId, gradeCard) =>
  api.put(`/superadmin/students/${studentId}/progress-report/grade-card`, gradeCard);

// SuperAdmin — grade card Excel export/import (any student)
export const exportGradeCardAdmin = async (studentId, studentName = 'student') => {
  const res = await api.get(`/superadmin/students/${studentId}/progress-report/grade-card/export`, {
    responseType: 'blob',
  });
  const safeName = studentName.replace(/[^a-z0-9]+/gi, '_');
  downloadBlob(res.data, `${safeName}_grade_card.xlsx`);
};
export const importGradeCardAdmin = (studentId, file) => {
  const formData = new FormData();
  formData.append('file', file);
  return api.post(`/superadmin/students/${studentId}/progress-report/grade-card/import`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

// SuperAdmin — FULL progress report (remarks + entries + attendance + grade
// card) as ONE multi-sheet Excel file (any student, no assignment restriction)
export const exportFullProgressReportAdmin = async (studentId, studentName = 'student') => {
  const res = await api.get(`/superadmin/students/${studentId}/progress-report/export`, {
    responseType: 'blob',
  });
  const safeName = studentName.replace(/[^a-z0-9]+/gi, '_');
  downloadBlob(res.data, `${safeName}_progress_report.xlsx`);
};
export const importFullProgressReportAdmin = (studentId, file) => {
  const formData = new FormData();
  formData.append('file', file);
  return api.post(`/superadmin/students/${studentId}/progress-report/import`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

// SuperAdmin — attendance (any student, no assignment restriction)
export const markAttendanceAdmin = (studentId, data) =>
  api.put(`/superadmin/students/${studentId}/progress-report/attendance`, data);
export const deleteAttendanceAdmin = (studentId, attendanceId) =>
  api.delete(`/superadmin/students/${studentId}/progress-report/attendance/${attendanceId}`);

// SuperAdmin — bulk upload attendance from an Excel file (.xlsx/.xls).
// Expected columns: Date | Status | Remarks
export const bulkUploadAttendanceAdmin = (studentId, file) => {
  const formData = new FormData();
  formData.append('file', file);
  return api.post(`/superadmin/students/${studentId}/progress-report/attendance/bulk-upload`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

// SuperAdmin — export attendance as an .xlsx file and trigger a download
export const exportAttendanceAdmin = async (studentId, studentName = 'student') => {
  const res = await api.get(`/superadmin/students/${studentId}/progress-report/attendance/export`, {
    responseType: 'blob',
  });
  const safeName = studentName.replace(/[^a-z0-9]+/gi, '_');
  downloadBlob(res.data, `${safeName}_attendance.xlsx`);
};

// SuperAdmin — profile photo (any student, no assignment restriction)
export const uploadStudentProfilePhotoAdmin = (studentId, file) => {
  const formData = new FormData();
  formData.append('photo', file);
  return api.put(`/superadmin/students/${studentId}/profile-photo`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

// SuperAdmin — edit student profile details (name, email, roll no, dept, semester)
export const updateStudentProfileAdmin = (studentId, data) =>
  api.put(`/superadmin/students/${studentId}/profile`, data);

// ---- Faculty ----
export const getMyStudents = () => api.get('/faculty/students');
export const getStudentProgressReport = (studentId) =>
  api.get(`/faculty/students/${studentId}/progress-report`);
export const addProgressEntry = (studentId, entry) =>
  api.post(`/faculty/students/${studentId}/progress-report/entries`, entry);
export const updateProgressEntry = (studentId, entryId, entry) =>
  api.put(`/faculty/students/${studentId}/progress-report/entries/${entryId}`, entry);
export const deleteProgressEntry = (studentId, entryId) =>
  api.delete(`/faculty/students/${studentId}/progress-report/entries/${entryId}`);

// Faculty — progress entries bulk import/export (assigned students only)
export const bulkUploadEntries = (studentId, file) => {
  const formData = new FormData();
  formData.append('file', file);
  return api.post(`/faculty/students/${studentId}/progress-report/entries/bulk-upload`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};
export const exportEntries = async (studentId, studentName = 'student') => {
  const res = await api.get(`/faculty/students/${studentId}/progress-report/entries/export`, {
    responseType: 'blob',
  });
  const safeName = studentName.replace(/[^a-z0-9]+/gi, '_');
  downloadBlob(res.data, `${safeName}_entries.xlsx`);
};

export const updateOverallRemarks = (studentId, overallRemarks) =>
  api.put(`/faculty/students/${studentId}/progress-report/remarks`, { overallRemarks });
export const updateGradeCard = (studentId, gradeCard) =>
  api.put(`/faculty/students/${studentId}/progress-report/grade-card`, gradeCard);

// Faculty — grade card Excel export/import (assigned students only)
export const exportGradeCard = async (studentId, studentName = 'student') => {
  const res = await api.get(`/faculty/students/${studentId}/progress-report/grade-card/export`, {
    responseType: 'blob',
  });
  const safeName = studentName.replace(/[^a-z0-9]+/gi, '_');
  downloadBlob(res.data, `${safeName}_grade_card.xlsx`);
};
export const importGradeCard = (studentId, file) => {
  const formData = new FormData();
  formData.append('file', file);
  return api.post(`/faculty/students/${studentId}/progress-report/grade-card/import`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

// Faculty — FULL progress report (remarks + entries + attendance + grade
// card) as ONE multi-sheet Excel file (assigned students only)
export const exportFullProgressReport = async (studentId, studentName = 'student') => {
  const res = await api.get(`/faculty/students/${studentId}/progress-report/export`, {
    responseType: 'blob',
  });
  const safeName = studentName.replace(/[^a-z0-9]+/gi, '_');
  downloadBlob(res.data, `${safeName}_progress_report.xlsx`);
};
export const importFullProgressReport = (studentId, file) => {
  const formData = new FormData();
  formData.append('file', file);
  return api.post(`/faculty/students/${studentId}/progress-report/import`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

// Faculty — attendance (assigned students only)
export const markAttendance = (studentId, data) =>
  api.put(`/faculty/students/${studentId}/progress-report/attendance`, data);
export const deleteAttendance = (studentId, attendanceId) =>
  api.delete(`/faculty/students/${studentId}/progress-report/attendance/${attendanceId}`);

// Faculty — bulk upload attendance from an Excel file (.xlsx/.xls).
// Expected columns: Date | Status | Remarks
export const bulkUploadAttendance = (studentId, file) => {
  const formData = new FormData();
  formData.append('file', file);
  return api.post(`/faculty/students/${studentId}/progress-report/attendance/bulk-upload`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

// Faculty — export attendance as an .xlsx file and trigger a download
export const exportAttendance = async (studentId, studentName = 'student') => {
  const res = await api.get(`/faculty/students/${studentId}/progress-report/attendance/export`, {
    responseType: 'blob',
  });
  const safeName = studentName.replace(/[^a-z0-9]+/gi, '_');
  downloadBlob(res.data, `${safeName}_attendance.xlsx`);
};

// Faculty — profile photo (assigned students only)
export const uploadStudentProfilePhoto = (studentId, file) => {
  const formData = new FormData();
  formData.append('photo', file);
  return api.put(`/faculty/students/${studentId}/profile-photo`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

// Faculty — edit student profile details (name, email, roll no, dept, semester)
export const updateStudentProfile = (studentId, data) =>
  api.put(`/faculty/students/${studentId}/profile`, data);

export default api;