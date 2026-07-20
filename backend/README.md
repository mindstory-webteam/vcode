# Student Progress Report Backend

Express + MongoDB (Mongoose) + Multer + JWT backend for a 3-role progress
report system: **SuperAdmin**, **Faculty**, **Student**.

## How the workflow maps to the code

1. **Student registers** → `POST /api/auth/register-student` creates a
   `StudentApplication` (status `pending`). No login is possible yet.
2. **SuperAdmin reviews applications** → `GET /api/superadmin/applications`,
   then `PUT /api/superadmin/applications/:id/approve` (or `/reject`).
   Approving creates the real `User` (role `student`) + an empty
   `ProgressReport`, and can optionally assign a faculty in the same call.
3. **SuperAdmin creates faculty accounts directly** →
   `POST /api/superadmin/faculty` (faculty never self-register).
4. **SuperAdmin assigns/reassigns a faculty to a student** →
   `PUT /api/superadmin/students/:id/assign-faculty`.
5. **Faculty updates a progress report** for their assigned students →
   `POST /api/faculty/students/:studentId/progress-report/entries`. Because
   faculty and student read/write the **same** `ProgressReport` document,
   updates are reflected immediately when the student views their report.
6. **Student views their own report** → `GET /api/student/progress-report`.
7. **Student uploads documents** (certificates, assignments, etc.) →
   `POST /api/student/documents` (multipart/form-data, field name `file`).

## Setup

```bash
npm install
cp .env.example .env     # then edit MONGO_URI, JWT_SECRET, etc.
npm run seed:superadmin  # creates the first superadmin from .env values
npm run dev               # starts on http://localhost:5000
```

MongoDB must be running and reachable at `MONGO_URI` (local install or
MongoDB Atlas connection string both work).

## Auth

Every protected route expects a JWT, sent either as:
- `Authorization: Bearer <token>` header, **or**
- an `token` httpOnly cookie (automatically set on login)

## API Reference

### Auth — `/api/auth` (public unless noted)
| Method | Endpoint | Description |
|---|---|---|
| POST | `/register-student` | Student submits registration form (multipart, optional `profileImage` file) |
| GET | `/application-status/:email` | Check a pending application's status |
| POST | `/login` | Login for superadmin / faculty / approved student |
| GET | `/me` | 🔒 Get logged-in user's profile |
| POST | `/logout` | 🔒 Clear auth cookie |
| PUT | `/update-password` | 🔒 Change own password |

### SuperAdmin — `/api/superadmin` (🔒 role: superadmin)
| Method | Endpoint | Description |
|---|---|---|
| GET | `/dashboard` | Counts: faculty, students, pending applications, unassigned students |
| POST | `/faculty` | Create one faculty account |
| POST | `/faculty/bulk` | Create multiple faculty at once (`{ faculties: [...] }`) |
| GET | `/faculty` | List all faculty |
| GET | `/applications?status=pending` | List student registration applications |
| GET | `/applications/:id` | Get one application |
| PUT | `/applications/:id/approve` | Approve → creates student account (`{ assignedFacultyId? }`) |
| PUT | `/applications/:id/reject` | Reject (`{ reason }`) |
| POST | `/students` | Create a student directly (skips registration flow) |
| GET | `/students` | List all students (with assigned faculty populated) |
| PUT | `/students/:id/assign-faculty` | Assign/reassign faculty (`{ facultyId }`) |
| PUT | `/users/:id/toggle-active` | Activate/deactivate any faculty/student account |
| DELETE | `/users/:id` | Delete a faculty or student account |

### Faculty — `/api/faculty` (🔒 role: faculty)
| Method | Endpoint | Description |
|---|---|---|
| GET | `/students` | List students assigned to me |
| GET | `/students/:studentId/progress-report` | View one assigned student's full report |
| POST | `/students/:studentId/progress-report/entries` | Add an entry (`{ title, category, description, marks, grade, remarks }`) |
| PUT | `/students/:studentId/progress-report/entries/:entryId` | Update an entry |
| DELETE | `/students/:studentId/progress-report/entries/:entryId` | Delete an entry |
| PUT | `/students/:studentId/progress-report/remarks` | Set overall remarks (`{ overallRemarks }`) |

### Student — `/api/student` (🔒 role: student)
| Method | Endpoint | Description |
|---|---|---|
| GET | `/progress-report` | View my own progress report |
| POST | `/documents` | Upload a document (multipart, field `file`, optional `description`) |
| DELETE | `/documents/:docId` | Delete my uploaded document |

`category` for entries: `academic \| attendance \| behavior \| project \| exam \| other`

## Data models (summary)

- **User**: `name, email, password, role(superadmin/faculty/student), phone, profileImage, studentInfo{rollNumber,department,course,semester,assignedFaculty}, facultyInfo{department,designation,employeeId}, status, isActive, createdBy`
- **StudentApplication**: same student fields + `status(pending/approved/rejected), rejectionReason, reviewedBy, reviewedAt, createdUser`
- **ProgressReport**: `student, faculty, overallRemarks, entries[{title,category,description,marks,grade,remarks,updatedBy}], documents[{fileName,filePath,fileType,fileSize,description,uploadedBy}]`

## Notes

- Uploaded files are stored under `/uploads` and served statically at
  `http://localhost:5000/uploads/...`. For production, swap this for S3 or
  similar cloud storage.
- Passwords are hashed with bcrypt; JWTs carry `{ id, role }` and expire per
  `JWT_EXPIRE` in `.env`.
- All list/detail responses use consistent `{ success, message?, data... }`
  JSON shape, and errors are centrally formatted in `middleware/errorMiddleware.js`.
