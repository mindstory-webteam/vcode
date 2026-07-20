import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

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

export const createStudent = (data) => api.post('/superadmin/students', data);
export const getAllStudents = () => api.get('/superadmin/students');
export const assignFacultyToStudent = (studentId, facultyId) =>
  api.put(`/superadmin/students/${studentId}/assign-faculty`, { facultyId });

export const toggleUserActive = (id) => api.put(`/superadmin/users/${id}/toggle-active`);
export const deleteUser = (id) => api.delete(`/superadmin/users/${id}`);

// SuperAdmin — progress report management (any student, no assignment restriction)
export const getStudentProgressReportAdmin = (studentId) =>
  api.get(`/superadmin/students/${studentId}/progress-report`);
export const addProgressEntryAdmin = (studentId, entry) =>
  api.post(`/superadmin/students/${studentId}/progress-report/entries`, entry);
export const updateProgressEntryAdmin = (studentId, entryId, entry) =>
  api.put(`/superadmin/students/${studentId}/progress-report/entries/${entryId}`, entry);
export const deleteProgressEntryAdmin = (studentId, entryId) =>
  api.delete(`/superadmin/students/${studentId}/progress-report/entries/${entryId}`);
export const updateOverallRemarksAdmin = (studentId, overallRemarks) =>
  api.put(`/superadmin/students/${studentId}/progress-report/remarks`, { overallRemarks });
export const updateGradeCardAdmin = (studentId, gradeCard) =>
  api.put(`/superadmin/students/${studentId}/progress-report/grade-card`, gradeCard);

// SuperAdmin — profile photo (any student, no assignment restriction)
export const uploadStudentProfilePhotoAdmin = (studentId, file) => {
  const formData = new FormData();
  formData.append('photo', file);
  return api.put(`/superadmin/students/${studentId}/profile-photo`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

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
export const updateOverallRemarks = (studentId, overallRemarks) =>
  api.put(`/faculty/students/${studentId}/progress-report/remarks`, { overallRemarks });
export const updateGradeCard = (studentId, gradeCard) =>
  api.put(`/faculty/students/${studentId}/progress-report/grade-card`, gradeCard);

// Faculty — profile photo (assigned students only)
export const uploadStudentProfilePhoto = (studentId, file) => {
  const formData = new FormData();
  formData.append('photo', file);
  return api.put(`/faculty/students/${studentId}/profile-photo`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export default api;