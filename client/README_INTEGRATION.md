# Integration guide — Student Portal auth + live grade card

This zip contains **new and updated files only** — it's meant to be copied
into your existing `vcode` Next.js project, not used as a standalone repo.
It does not include your `app/globals.css`, `app/layout.tsx` (original),
`lib/gsap.ts`, `tailwind.config`, `package.json`, etc. since I don't have
their current contents and didn't want to risk overwriting your fonts,
metadata, or design tokens blindly.

## What this adds

**Flow:** `/` → choose **Log in** (existing student) or **Apply now**
(registration) → on login, `/dashboard` renders your existing grade-card
components, now populated from the real backend instead of the static
`data/student.ts`.

| Route | Purpose |
|---|---|
| `/` | Landing page, two options: Login / Register |
| `/login` | Email + password → `POST /api/auth/login` (cookie session) |
| `/register` | Full application form + document upload → `POST /api/auth/register-student`, then shows a "pending approval" screen with a **Check status** button (`GET /api/auth/application-status/:email`) |
| `/dashboard` | Protected. Fetches `GET /api/student/progress-report` and renders your existing `Hero → Verification` component stack with that data |

## Files in this zip

```
app/
  page.tsx                  ← NEW landing page (replaces your old root page.tsx,
                               which becomes /dashboard/page.tsx)
  login/page.tsx             ← NEW
  register/page.tsx          ← NEW
  dashboard/page.tsx          ← NEW (this is your old GradeCardPage content,
                               wrapped with auth + live data fetching)
components/
  Hero.tsx, Evaluation.tsx, ReadinessBars.tsx, RadarChart.tsx,
  Experience.tsx, Skills.tsx, Portfolio.tsx, Achievements.tsx,
  Mentor.tsx, Verification.tsx
                              ← UPDATED. Same JSX/classNames/animations as
                               before — only the data import changed, from
                               `@/data/student` (static) to
                               `useStudentData()` (live, via context).
data/
  StudentDataContext.tsx      ← NEW. Provides useStudentData() + the mapper
                               that converts your ProgressReport.gradeCard
                               shape into exactly what the components expect.
                               Your data/student.ts is untouched — you can
                               keep it around for local dev/preview if useful.
contexts/
  AuthContext.tsx              ← NEW. Session state (login/logout/me) via cookies.
lib/
  api.ts                       ← NEW. fetch wrapper, credentials: "include".
middleware.ts                  ← NEW. Redirects to /login if unauthenticated
                               when visiting /dashboard.
.env.local.example              ← NEW.
```

## Steps to merge

1. **Copy the files above into your `vcode` project**, preserving paths
   (e.g. `data/StudentDataContext.tsx` goes next to your existing
   `data/student.ts`; `contexts/` and `middleware.ts` go at the same level
   as `app/`).

2. **Set the API URL.** Copy `.env.local.example` → `.env.local` and point
   it at your Express server:
   ```
   NEXT_PUBLIC_API_URL=http://localhost:5000
   ```

3. **Wrap your app in `AuthProvider`.** This is the one manual edit — open
   your existing `app/layout.tsx` and wrap `{children}` like this:

   ```tsx
   import { AuthProvider } from "@/contexts/AuthContext";

   export default function RootLayout({ children }: { children: React.ReactNode }) {
     return (
       <html lang="en">
         <body>
           <AuthProvider>{children}</AuthProvider>
         </body>
       </html>
     );
   }
   ```
   Keep everything else in your layout (fonts, metadata, etc.) as-is —
   just add the `AuthProvider` import and wrap the existing body content.

4. **Backend CORS.** Your `server.js` already does:
   ```js
   cors({ origin: process.env.CLIENT_URL ? process.env.CLIENT_URL.split(',') : '*', credentials: true })
   ```
   Cookie-based auth requires `credentials: true` **and** a specific
   origin (not `*`). Set `CLIENT_URL=http://localhost:3000` (or your
   deployed frontend origin) in the backend's `.env`.

5. **Run both servers** (`npm run dev` in each) and visit `/`.

## How the data mapping works

Your grade-card components never talk to `data/student.ts` anymore — they
call `useStudentData()` from `data/StudentDataContext.tsx`. `/dashboard`
fetches the student's `ProgressReport` from the backend, runs it through
`mapReportToStudentData(user, report)`, and wraps the components in
`<StudentDataProvider data={...}>`. If a faculty member hasn't filled in
`gradeCard.skillScores` yet, the dashboard shows a "not ready yet" message
instead of an empty/broken chart.

If you want faculty/superadmin to preview a specific student's card using
the same components, you can reuse `mapReportToStudentData` with the
faculty/superadmin `GET .../progress-report` response the same way.

## Notes / things you may want to adjust

- **Roles:** `/dashboard` currently only renders the grade card for
  `role: "student"`. Faculty/superadmin who log in via `/login` see a
  short "this portal is for students" message with a logout button —
  wire up separate faculty/superadmin dashboards if/when you build them.
- **Interview readiness grid:** your original static data had 5 items;
  the backend schema only has 4 fields (`resumeQuality`,
  `portfolioQuality`, `communication`, `presentationConfidence`), so the
  mapper produces 4 — the `md:grid-cols-5` class still lays out fine.
- **Mentor roles list:** the backend's `mentorRemarks` doesn't have a
  `roles` array (only free-text `text`), so that part of the sentence in
  `Mentor.tsx` is hidden automatically when there are no roles. Add a
  `roles: [String]` field to `mentorRemarks` in `ProgressReport.js` if you
  want it back.
