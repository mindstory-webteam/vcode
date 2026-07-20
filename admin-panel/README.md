# Registrar — SuperAdmin & Faculty Admin Panel

A React (Vite) frontend for your Progress Report backend. Two consoles in
one app, routed by the logged-in user's role:

- **SuperAdmin console** — Dashboard, Applications (approve/reject student
  registrations, optionally assigning a faculty on approval), Students
  (create directly, assign/reassign faculty, activate/deactivate, delete),
  Faculty (create accounts, activate/deactivate, delete).
- **Faculty console** — My Students, and a per-student Progress Report
  editor (add/edit/delete entries, set overall remarks, view uploaded
  documents).

Students don't get a console here — this app is for staff only, matching
the routes you provided (`/api/superadmin/*` and `/api/faculty/*`).

## Setup

```bash
npm install
cp .env.example .env   # set VITE_API_URL to your backend, e.g. http://localhost:5000/api
npm run dev             # http://localhost:5173
```

Make sure your backend's `CLIENT_URL` (in its own `.env`) includes
`http://localhost:5173` so CORS allows requests from this app, and that
`cors({ credentials: true })` stays enabled server-side (it already is in
the backend you have).

## Login

Log in with a `superadmin` or `faculty` account (seed one on the backend
with `npm run seed:superadmin`, or create faculty accounts from the
SuperAdmin console once you're in). Student accounts are intentionally
rejected by this panel's login screen — they belong in a separate student
app.

## Build for production

```bash
npm run build     # outputs to dist/
npm run preview   # serve the production build locally to sanity-check it
```

Deploy the `dist/` folder to any static host (Netlify, Vercel, S3+CloudFront,
nginx, etc.) and point `VITE_API_URL` (baked in at build time) at your
deployed backend's `/api` URL.

## Notes

- Auth token is kept in `localStorage` and also arrives as an httpOnly
  cookie from the backend; requests send both (`Authorization: Bearer` +
  `withCredentials: true`), so it'll work whichever your backend prefers.
- The document "View" links in a student's report open files served from
  your backend's `/uploads` static route.
- Design system lives entirely in `src/styles/index.css` — a ledger/paper
  aesthetic with stamp-style status badges (pending/approved/rejected/
  active/inactive) rather than a generic dashboard template.
