# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Structure

This is a full-stack application with two main parts:
- `autobus-app`: Frontend React application built with Vite
- `autobus-backend`: Backend API server built with Node.js and Express

### Frontend (autobus-app)
- Technology stack: React 19, React Router DOM v7, Vite 8, `@react-oauth/google`, `qrcode.react`.
- Entry point: `index.html` → `src/main.jsx` → `src/App.jsx` (BrowserRouter, lazy-loaded routes wrapped in Suspense).
- State management: three React Contexts in `src/context/` — `AuthContext` (currentUser + auth mutators), `DataContext` (routes/trips/bookings/users + their mutators), `ThemeContext` (theme + toggle). Consumers subscribe to only what they need to keep re-renders scoped.
- API communication: `src/lib/api.js` exports `apiRequest(method, path, body?)` and `BASE`. Reads the JWT from localStorage on every call; throws an Error whose `message` carries the backend's error message so UI code can render `e.message`.
- Analytics tracking: `src/lib/analytics.js` + the `<RouteTracker />` component fire whitelisted events via `navigator.sendBeacon` to `/api/analytics/track`.
- Components in `src/components/`, pages in `src/pages/`. Styles use CSS variables defined in `index.css`.

### Backend (autobus-backend)
- Technology stack: Node.js ≥20, Express 5, libsql (via `@libsql/client`) — local SQLite file by default; remote Turso when `DATABASE_URL` + `DATABASE_AUTH_TOKEN` are set.
- Entry point: `server.js`. Refuses to start if `JWT_SECRET` is unset.
- Database: `autobus-backend/autobus.db` initialized via `db.js`. Schema migrations use `addColumnIfMissing` for evolution (new columns added without dropping the file).
- Route organization (all under `/api`):
  - `/auth` — register / login / Google OAuth / password reset / change-password
  - `/routes` — bus routes CRUD (admin)
  - `/trips` — scheduled trips CRUD (admin)
  - `/bookings` — admin-only booking creation; per-user `/my`; PUT/DELETE for own booking
  - `/users` — admin list + promote/demote
  - `/payments` — monobank invoice creation, webhook, status polling
  - `/tickets/:code` — public ticket lookup (ticket code is the bearer credential)
  - `/analytics` — public `/track` (rate-limited beacon), admin `/funnel` and `/search-demand`
- Middleware: CORS allowing one or more origins from `FRONTEND_URL` (comma-separated), raw-body capture for monobank webhook signature verification, `express.json()`, custom `authMiddleware` / `adminMiddleware` in `middleware.js`.
- Services in `services/`: `monobank.js` (acquiring API + webhook signature verification), `seats.js` (seat-hold count), `ticketing.js` (issue-ticket transaction, ticket code generation).
- Logger: `logger.js` exports `logger(scope)` — all backend logging should go through it; respects `LOG_LEVEL` env var.

## Development Commands

### Frontend
From the repository root or inside `autobus-app`:
- `npm run dev` - Start Vite development server (http://localhost:5173)
- `npm run build` - Build production assets to `dist/`
- `npm run lint` - Run ESLint for code quality (uses eslint.config.js)
- `npm run preview` - Preview production build locally

### Backend
From inside `autobus-backend`:
- `node server.js` - Start the Express server (default port 3001, configurable via PORT env var)
- For development with auto-restart: Install nodemon globally (`npm i -g nodemon`) then use `nodemon server.js`

## Common Workflows

1. **Start full stack**:
   - Terminal 1: `cd autobus-backend && node server.js` (or nodemon for dev)
   - Terminal 2: `cd autobus-app && npm run dev`

2. **Make frontend changes**:
   - Edit files in `autobus-app/src/`
   - Vite provides hot module replacement during `npm run dev`
   - Each of the three contexts (`Auth`, `Data`, `Theme`) only re-renders consumers that subscribe to it via the matching hook (`useAuth`/`useData`/`useTheme`)

3. **Make backend changes**:
   - Edit routes in `autobus-backend/routes/` for endpoint logic
   - Modify `server.js` for middleware/server configuration
   - Update `db.js` for database schema changes
   - Modify `services/` for business logic changes
   - Restart server after changes (unless using nodemon)

4. **Database management**:
   - SQLite database file: `autobus-backend/autobus.db`
   - Schema initialized in `db.js` via `initDB()` function
   - To reset: delete the file and restart server (will recreate with fresh schema)
   - For development: Consider using SQLite browser to inspect data

5. **Authentication flow**:
   - Frontend stores JWT token in localStorage after login
   - Backend validates token via `middleware.js` (checks Authorization header)
   - Protected routes should include the auth middleware

6. **Bootstrapping the admin role**:
   - Roles live in `users.role`. The only API path to mint an admin is `/api/users/:id/promote`, which itself requires admin — chicken-and-egg if the DB has no admins.
   - On registration (`/api/auth/register`) and on first-Google-signup, `routes/auth.js` assigns `role='admin'` if either (a) the email is listed in `ADMIN_EMAILS`, or (b) the `users` table is currently empty. Otherwise `role='user'`.
   - The role decision lives in a single `INSERT ... CASE WHEN` statement so concurrent registrations can't race past each other on a fresh DB.
   - The JWT itself does **not** carry the role — `authMiddleware` re-fetches `role` from `users` on every request, so role changes take effect immediately on the backend. But the frontend caches `currentUser` (including `role`) in `localStorage` from the login response. After a role change (promote/demote, or moving an email into/out of `ADMIN_EMAILS`), **the affected user must log out and log back in** to see the admin UI update — there's no live channel for role-change push.

## Environment Variables

Backend `.env` (see `autobus-backend/.env.example`):
- `JWT_SECRET` — **required**. Server exits on startup if unset.
- `PORT` — defaults to `3001`.
- `MONOBANK_TOKEN` — acquiring token from `api.monobank.ua`. Payments are inert without it (a warning logs at startup).
- `BACKEND_PUBLIC_URL` — publicly reachable URL of this backend, used for the monobank webhook. Empty in local dev (the polling fallback still works).
- `FRONTEND_URL` — comma-separated list of origins allowed by CORS. Defaults to `http://localhost:5173`.
- `ANALYTICS_IP_SALT` — salt for hashing visitor IPs in the `events` table.
- `GOOGLE_CLIENT_ID` — OAuth web client ID. Empty disables the "Continue with Google" button gracefully.
- `ADMIN_EMAILS` — comma-separated emails that get `role='admin'` on first registration. Combined with the implicit "first ever user is admin" bootstrap, this is the recovery path after a DB reset — see *Bootstrapping the admin role* below.
- `LOG_LEVEL` — `debug`/`info`/`warn`/`error`. Defaults to `info`.
- `DATABASE_URL` + `DATABASE_AUTH_TOKEN` — set both to switch from the local SQLite file to a remote Turso/libsql database.

Frontend `.env.local` (see `autobus-app/.env.example`):
- `VITE_API_URL` — backend API base, defaults to `http://localhost:3001/api`.
- `VITE_GOOGLE_CLIENT_ID` — must match the backend's `GOOGLE_CLIENT_ID` for Google sign-in to work.

## Testing

Currently no test scripts are defined. To add testing:
- Frontend: Add Vitest or Jest with React Testing Library
  - Example test command: `"test": "vitest"` in package.json
  - Test files would go in `src/__tests__/` or alongside components
- Backend: Add Jest or Mocha for API testing
  - Example test command: `"test": "jest"` in package.json
  - Test files would go in a `test/` directory

## Important Notes

- The frontend proxy is not configured in `vite.config.js`; ensure backend is running on the port the frontend's `VITE_API_URL` points to (default `3001`).
- CORS is restricted to the origins listed in `FRONTEND_URL` (comma-separated).
- Booking & payment flow:
  1. User selects a trip and fills passenger info on the Booking page
  2. Frontend POSTs to `/api/payments/checkout`; backend checks seat availability,
     holds the seat via a `pending_bookings` row (15-min hold), creates a monobank
     invoice, and returns its `pageUrl`
  3. Frontend redirects the browser to the monobank `pageUrl` to pay
  4. monobank redirects back to `/booking/success?order_id=...`; the page polls
     `/api/payments/status/:orderId`
  5. The status endpoint asks monobank directly; on confirmed payment it issues a
     `bookings` row with a unique `ticket_code` (see `services/ticketing.js`)
  6. The ticket (with QR code) is shown and is retrievable at `/ticket/:code`
- A `bookings` row is created ONLY by a confirmed payment; there is no direct
  booking-create endpoint.
- Error handling: Both frontend and backend have basic error states; consider adding more robust error boundaries and validation
- Responsive design: Uses CSS variables and flexible layouts; test on various screen sizes