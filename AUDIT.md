# AutoRace — Full-Stack Audit

**Date:** 2026-05-23
**Scope:** working tree, including uncommitted changes. In-progress files are flagged `[in-progress]`.
**Rubric:** portfolio / demo project — "would a reviewer flag this in a junior–mid code review?" 7/10 means "passes review with minor caveats."
**Method:** broad shallow scan. Lint and prod build run once. Dependency versions read statically from `package.json` (no `npm audit`).

---

## Executive summary

The project is a Vite + React 19 frontend and an Express 5 + libsql/SQLite backend implementing routes, scheduled trips, bookings, JWT + Google OAuth auth, a LiqPay payment flow, and an in-house analytics funnel. The shape and breadth of features (full CRUD, role-based admin, OAuth, analytics, payments) is past "tutorial" but the implementation has several load-bearing defects in the parts that matter most (payments and auth) plus pervasive React anti-patterns that lint flags directly.

The single most consequential finding is that **payments are bypassed end-to-end**: the booking form posts directly to `/api/bookings`, displays a "ОПЛАЧЕНО" ("PAID") ticket, and never calls LiqPay. The LiqPay route file is wired up, but the UI does not use it, the sandbox flag is hardcoded, and the webhook URL is commented out — so even if it were used, it would not work.

### Subscores
| Dimension | Score | Notes |
|---|---|---|
| Security | 4/10 | JWT-secret fallback, payment bypass, PII leak via unauthenticated LiqPay status, password reset token printed to log |
| Code Quality | 5/10 | Lint fails (10 errors). Real bugs in Profile (hooks order), Schedule, AppContext, BookingSuccess |
| Architecture | 4/10 | One god-context, no services layer (CLAUDE.md says there is one — there isn't), 300-line context re-renders all consumers, fat route files |
| Maintainability | 5/10 | No tests, inline styles everywhere, duplicated BASE/token reads, single-line commit messages |
| **Overall** | **5/10** | Portfolio-grade: visibly more than a starter but with several issues a reviewer would notice immediately. |

### Strengths
- Clear separation of frontend/backend with sensible route grouping under `/api/...`.
- JWT auth flow is correctly structured (bcrypt hashing, server-side role check on every request via `authMiddleware`).
- Google OAuth verification is done correctly (server-side `verifyIdToken` with audience + signature, not just trusting client claims).
- Analytics module is well-considered for an in-house implementation: IP hashing with salt, bot UA filter, props size cap, `sendBeacon`-friendly text parsing, event-name whitelist.
- Rate limiting is configured on `/api/auth` and `/api/analytics/track`.
- Input validation via `express-validator` is used on auth endpoints (though not consistently elsewhere).
- `.env.example` files exist and don't leak real secrets. `autobus.db` is correctly `.gitignore`d.
- Frontend production build succeeds cleanly in 0.5s (328 kB unsplit).

### Weaknesses
- Lint fails outright (10 errors), including 4 `react-hooks` rule violations and 1 `rules-of-hooks` violation that is an actual latent crash.
- Payment flow is non-functional and broken in multiple ways simultaneously (see Crit-2/3/4/5).
- One global `AppContext` mixes auth, theme, all CRUD, and all data — every change re-renders every consumer.
- No automated tests of any kind. No CI configuration.
- `CLAUDE.md` documents a `services/` directory that does not exist; "incomplete LiqPay integration" is noted but the extent (sandbox-hardcoded, webhook commented out, frontend bypasses it) is understated.
- Inline-style objects are used universally; no CSS modules, no component library. Hundreds of style-object literal allocations per render.
- `pending_bookings` and `password_resets` tables are never purged.

### Architecture assessment
The intended architecture is reasonable — REST API + SPA + JWT. The execution diverges in three ways:

1. **No domain layer.** Route files contain both HTTP plumbing and business rules (seat counting, signature validation, race-condition handling). Even with one developer this gets unmaintainable past ~10 endpoints; you are at 23.
2. **Frontend state is a single inflated context.** `AppContext.jsx` is auth + theme + routes + trips + users + bookings + every mutator. Every login refetches everything; every mutation triggers context updates that re-render the whole tree.
3. **Two payment paths in parallel.** `pages/Booking.jsx` creates bookings directly via `/api/bookings` (no payment), while `routes/liqpay.js` + `pages/BookingSuccess.jsx` implement a separate "real" payment path that nothing in the UI invokes. This isn't just unfinished work — it's actively misleading, because the UI shows a "PAID" ticket from the unpaid path.

The fix is straightforward but invasive: pick one payment path. The `bookings.js` POST should be admin-only (or require an internal token from the LiqPay callback). The user-facing flow should `POST /api/liqpay/checkout` and the success page should poll the real status. Until then, the system is "free tickets, marked as paid."

---

## Findings

`[in-progress]` = file appears in `git status` as new or modified-not-yet-committed.

### Critical

| Severity | File:line | Issue | Recommended fix |
|---|---|---|---|
| Critical | `autobus-backend/middleware.js:3`, `routes/auth.js:16`, `routes/bookings.js:42` | JWT secret falls back to hardcoded string `'autobus-secret-key'` if `JWT_SECRET` env var is missing. An attacker who learns the codebase can forge tokens for any user. The same fallback is duplicated in 3 places. | Remove the fallback entirely. Throw on startup if `JWT_SECRET` is unset. Centralize secret loading in one module. |
| Critical | `autobus-app/src/pages/Booking.jsx:177-208` | Booking form `POST`s straight to `/api/bookings` and displays a "ОПЛАЧЕНО" ticket. LiqPay is never invoked. Free tickets, marked as paid. | The UI must call `POST /api/liqpay/checkout`, render the LiqPay form, and only display the ticket after `/api/liqpay/status/:orderId` returns `paid: true`. The direct `POST /api/bookings` path should not be reachable from the booking form. |
| Critical | `autobus-backend/routes/liqpay.js:50` | `sandbox: '1'` is hardcoded. Even in production, no real money would ever move. | Wire to env: `sandbox: process.env.LIQPAY_SANDBOX === '1' ? '1' : '0'`. |
| Critical | `autobus-backend/routes/liqpay.js:52` | `server_url` is commented out. LiqPay never calls `/api/liqpay/callback`, so `pending_bookings.booking_id` is never set, so `BookingSuccess` polls forever. The entire LiqPay path is non-functional even if used. | Uncomment and set to `${PUBLIC_BACKEND_URL}/api/liqpay/callback`. Add a `PUBLIC_BACKEND_URL` env var. |
| Critical | `autobus-backend/routes/liqpay.js:73-117` | The LiqPay callback verifies the signature but **does not verify that the paid `amount` and `currency` match the trip price**. A successful callback with arbitrary `amount` still creates the booking. Combined with the fact that LIQPAY_PRIVATE_KEY signs both sides, this is theoretical for now — but it's a textbook payment-callback hole. | After signature check, re-read `trip.price` from DB and assert `Number(decoded.amount) === Number(trip.price)` and `decoded.currency === 'UAH'` before creating the booking. |

### High

| Severity | File:line | Issue | Recommended fix |
|---|---|---|---|
| High | `autobus-backend/routes/liqpay.js:129-178` | `GET /api/liqpay/status/:orderId` is unauthenticated and returns `passengerName`, `passengerPhone`, route, time, and price. `order_id` is `trip_${tripId}_${Date.now()}` — guessable in a tight loop. Anyone can scrape PII. | Require auth and check the booking belongs to the caller, OR keep `paid: boolean` only and have the frontend re-fetch booking details via the authenticated `/api/bookings/my` endpoint. |
| High | `autobus-backend/routes/bookings.js:17-69` | Booking endpoint uses `db.execute('BEGIN TRANSACTION')` followed by independent `db.execute(...)` calls. With the libsql client, separate executes do **not** share a transaction context — `BEGIN` is effectively a no-op. The "race condition prevention" comment is wrong. Two concurrent buyers can both pass the seat check and overbook. | Use `db.batch([...])` for atomicity, or `db.transaction()` if available in your `@libsql/client` version. Or model seats as inserts into a `seat_assignments` table with a unique constraint. |
| High | `autobus-backend/routes/bookings.js:51-54` | `String(boardingPoint).trim()` when `boardingPoint` is `undefined` produces the literal string `"undefined"`. Bookings created via the legacy flow or with missing fields get passenger fields containing `"undefined"`. | Coerce with a guard: `(typeof boardingPoint === 'string' ? boardingPoint : '').trim()`. Or validate with `express-validator` like `/api/auth/*` does. |
| High | `autobus-app/src/pages/Profile.jsx:12-16` | Early return (`if (!currentUser) return <Navigate ...>`) sits between `useState` and `useMemo`, violating React's rules of hooks. When a logged-in user logs out while on the Profile page, hook order changes and React will crash. Flagged by lint as `react-hooks/rules-of-hooks`. | Call all hooks unconditionally, then early-return. Or move the guard to a wrapper. |
| High | `autobus-app/src/pages/BookingSuccess.jsx:86, 120-123` | (1) Uses relative URL `/api/liqpay/status/...` instead of `BASE`, so it only works when frontend and backend share an origin. Broken under any realistic deployment. (2) Reads `route.from_city`, `route.to_city`, `JSON.parse(route.stops)` — but `/api/routes` returns `{from, to, stops: []}` (already parsed). All three fields are undefined; `JSON.parse([])` throws on a non-string. | Use `${BASE}/liqpay/status/...`. Use `route.from`, `route.to`, `route.stops` (it's already an array). |
| High | `autobus-backend/routes/auth.js:214` | Password reset token is `console.log`'d server-side ("In production, send email"). Anyone with log access (shared hosting, CI artifacts, error reporting) can take over any account. | Send via email immediately. If email isn't wired yet, gate the endpoint behind `NODE_ENV !== 'production'`. |
| High | `.gitignore` | Only `autobus-app/.env` is ignored, not `autobus-app/.env.local`. The `.env.example` explicitly instructs the user to put the Google client ID in `.env.local`. The line `autobus-app/node_modules/.env` is a typo and matches nothing. | Replace with `autobus-app/.env*` (and audit history for accidental commits). |

### Medium

| Severity | File:line | Issue | Recommended fix |
|---|---|---|---|
| Medium | `autobus-backend/routes/{routes,trips,bookings,liqpay}.js` | No input validation on `POST/PUT/DELETE` endpoints outside `/api/auth/*`. Trip seats can be negative, prices can be strings, route stops can be objects, etc. | Apply `express-validator` consistently on all `POST`/`PUT` bodies. |
| Medium | `autobus-backend/routes/trips.js:28, 69, 105` | API fakes a `bookedSeats` array of length N (`Array(n).fill(0).map((_, i) => i + 1)`) just so the frontend can call `.length` on it. Wastes payload size and memory; also leaks a fictional seat-number list that doesn't correspond to anything real. | Return `bookedCount: number` and update the frontend to use it (`Admin.jsx:518`, `Booking.jsx:125`). |
| Medium | `autobus-backend/routes/liqpay.js:104-117` | The callback handler does two independent writes (INSERT booking, UPDATE pending_bookings) outside a transaction. If the UPDATE fails, the booking exists but is orphaned. | Wrap in `db.batch([...])`. |
| Medium | `autobus-backend/routes/auth.js:88, 161` | `last_login` is stored as `new Date().toLocaleString('uk-UA')` — locale-formatted string, not sortable, locale-server-dependent. | Store ISO 8601 (`new Date().toISOString()`) and format on the frontend. |
| Medium | `autobus-app/src/context/AppContext.jsx:26-309` | One context holds auth + theme + routes + trips + users + bookings + 12 mutators. Every mutation re-renders every consumer. 300-line file. | Split: `AuthContext`, `ThemeContext`, `BookingDataContext` (or move data fetching to a query layer — TanStack Query / SWR). |
| Medium | `autobus-app/src/context/AppContext.jsx:77` | `useEffect(() => { loadData() }, [loadData])` with `loadData` depending on `currentUser` re-fetches *all* data on every login/logout. Flagged by lint as `set-state-in-effect`. | Split data fetching by concern. Or use a query library that caches and dedupes. |
| Medium | `autobus-backend/routes/auth.js:25` | Password validator requires only 6 characters and no complexity. | Bump to 8+ and require at least one digit, or document the choice. |
| Medium | `autobus-backend/db.js` | `pending_bookings` and `password_resets` tables grow without bound. No TTL, no cleanup. | Add a daily cleanup query (`DELETE FROM password_resets WHERE used = 1 OR expires_at < datetime('now')`; same for `pending_bookings` with `booking_id IS NULL AND created_at < datetime('now', '-1 day')`). |
| Medium | `autobus-app/src/main.jsx:12` `[in-progress]` | If `VITE_GOOGLE_CLIENT_ID` is empty, `GoogleOAuthProvider` mounts with an empty clientId and the button silently fails on click without telling the user. | Conditionally render `GoogleAuthButton` based on a feature flag, or show a clear "Google sign-in not configured" message. |
| Medium | `autobus-app/src/pages/Schedule.jsx:22-26`, `BookingSuccess.jsx:79`, `AppContext.jsx:77` `[in-progress]` | Three `react-hooks/set-state-in-effect` errors. These cascade extra renders. Schedule's case is mirroring search params into state — should use `useSearchParams` directly. | Derive state from `searchParams` rather than copying it into local state. |
| Medium | `autobus-app/src/pages/Booking.jsx:177-200` | Hand-rolls a `fetch` with localStorage token instead of using the centralized `request()` helper that already lives in `AppContext.jsx`. Duplicated pattern in `Analytics.jsx:34-39`. | Export `request()` from `AppContext.jsx` (or a separate `api.js`) and use it everywhere. |
| Medium | `autobus-backend/routes/users.js:24-33` | `POST /:id/promote` has no demote endpoint and no audit log. A misclick is permanent. Also no check that the target id exists — silently succeeds on bogus IDs. | Add `POST /:id/demote`. Verify target exists. Optionally write to an `admin_audit` table. |
| Medium | `autobus-backend/routes/bookings.js:117-136` | `PUT /:id` does not validate that `passengerName`/`passengerPhone` exist before calling `.trim()` — will 500 if either is missing. | Validate with `express-validator`. |
| Medium | `autobus-backend/db.js:84-103` | Initial seed data is inserted only when routes table is empty. If routes exist but trips don't (e.g., DB partially migrated), no trips are seeded. Edge case but confusing. | Either always-seed-when-empty per table, or remove seeding from `initDB` and use a separate seed script. |

### Low

| Severity | File:line | Issue | Recommended fix |
|---|---|---|---|
| Low | `autobus-app/src/pages/Admin.jsx:146-147` | `totalSeats` and `bookedSeats` are computed but never rendered. Lint error. | Delete or use them. |
| Low | `autobus-app/src/pages/Booking.jsx:211` | `pending` is computed from sessionStorage but never used. Lint error. | Delete. |
| Low | `autobus-app/src/pages/Routes.jsx:1` | `useEffect` imported but not used. Lint error. | Delete the import. |
| Low | `autobus-app/src/pages/Schedule.jsx:16` | `today` computed but never used. Lint error. | Delete or wire to the date filter. |
| Low | All backend route files | Error handling is mostly `console.error(e); res.status(500).json({ error: 'Помилка сервера' })`. No structured logging, no correlation IDs, no separation of expected vs. unexpected errors. | Adopt `pino`/`winston`, attach a request ID, distinguish 4xx from 5xx. |
| Low | `autobus-app/dist/assets/index-CxnnNLM4.js` (328 kB) | Frontend ships as one chunk. No code splitting; Admin and Analytics pages are loaded for anonymous users on the home page. | `const Admin = lazy(() => import('./pages/Admin'))`; same for Analytics, BookingSuccess. |
| Low | `autobus-app/src/context/AppContext.jsx:307` | `export function useApp()` next to a component export trips `react-refresh/only-export-components`. Lint error. | Move `useApp` and the `AppContext` to separate files (`AppContext.js` for context, `useApp.js` for the hook). |
| Low | Many components | Inline style object literals re-allocate on every render. Not a measurable perf issue at this scale, but it's an anti-pattern for a portfolio piece. | Extract to a CSS module, Tailwind, or styled-components. At minimum hoist style objects outside the render function. |
| Low | Both `package.json` | No `engines` field. No Node version pinned. | Add `"engines": { "node": ">=20" }`. |
| Low | `autobus-backend/package.json` | Empty `description`, `author`, `keywords`. `main: "index.js"` but entry is `server.js`. | Fill them in or remove. |
| Low | `autobus-backend/frontend-api.js` | File exists at backend root but is not required from anywhere. Dead code. | Delete. |
| Low | `CLAUDE.md` | Documents a `services/` directory and "services/authService.js" — neither exists. | Update CLAUDE.md to match reality, or extract auth logic to `services/`. |
| Low | Git log | Last five commits are titled `5`, `6`, `7`, `8`, `9`. For a portfolio repo this is the first thing a reviewer sees. | Use Conventional Commits or at least descriptive messages going forward. |
| Low | `autobus-backend/routes/auth.js:198, 214`; `routes/liqpay.js:66, 122`; many | Mixed `console.log` / `console.error` / `console.warn` with inconsistent prefixes. | Single logger module. |
| Low | `autobus-app/src/components/Navbar.jsx` | All styling inline, including breakpoints implicit (no responsive collapse on mobile). | Move to a CSS file with media queries. |

### In-progress (uncommitted) — informational

These files appear in `git status` as new or modified-not-committed. The findings above already include the most material issues in this code. Items here are *only* the things I'd ignore if you told me "I know, that's why it isn't committed yet."

- `autobus-app/src/components/RouteTracker.jsx` — minimal, fine.
- `autobus-app/src/lib/analytics.js` — solid; well-commented; bot exclusion is server-side only (low-priority duplicate could go client-side).
- `autobus-backend/routes/analytics.js` — well-structured; one small smell: bot UA check runs **after** the body parse middleware, so bot beacons still consume the JSON parse cost. Move the UA check ahead of the body parse if traffic becomes a concern.
- `autobus-app/src/pages/Analytics.jsx` — duplicates the BASE + token fetch pattern from `Booking.jsx` (see Medium-10).
- `autobus-app/src/components/GoogleAuthButton.jsx` — fine but doesn't guard for empty `VITE_GOOGLE_CLIENT_ID` (see Medium-9).

---

## Dependencies (static read; no `npm audit`)

### Backend
- `@libsql/client ^0.17.3` — current. OK.
- `bcryptjs ^3.0.3` — current. Note: pure-JS bcrypt is ~3× slower than native `bcrypt`. For a 10-round hash on every login this is fine; if you ever scale, switch to `bcrypt` (native).
- `cors ^2.8.6` — stable, low-risk.
- `dotenv ^17.4.2` — current.
- `express ^5.2.1` — Express 5 is now GA but still relatively new. Differences from 4 to be aware of: stricter async error propagation (you're relying on this — make sure all route handlers throw rather than swallow), removed `req.param()`.
- `express-rate-limit ^8.5.2` — current.
- `express-validator ^7.3.2` — current.
- `google-auth-library ^10.6.2` — current.
- `jsonwebtoken ^9.0.3` — current. OK.

### Frontend
- `react ^19.2.5` / `react-dom ^19.2.5` — current. React 19 is stable.
- `react-router-dom ^7.14.2` — current. v7 is a major from v6; you appear to be using the v7 declarative `BrowserRouter` API correctly.
- `@react-oauth/google ^0.13.5` — current.
- `vite ^8.0.10` — current.
- `eslint ^10.2.1` — current. The flat config in `eslint.config.js` is required by v10.
- `eslint-plugin-react-hooks ^7.1.1` — current. This is the version that ships the `set-state-in-effect` and `rules-of-hooks` rules currently failing your build.

**Verdict:** dependencies are all reasonably current, no obviously stale or deprecated packages. The lack of `npm audit` here means I can't speak to active CVEs — strongly recommend running `npm audit` periodically.

---

## What I'd fix this week, in order

1. Remove the `JWT_SECRET` fallback. Throw on startup if missing. (Critical, 10 min)
2. Either disable the `Booking.jsx` direct-POST path or route it through LiqPay. Until then, the ticket UI is lying. (Critical, half day)
3. Authenticate `/api/liqpay/status/:orderId` or strip PII from its response. (High, 30 min)
4. Fix `Profile.jsx` hooks order — real crash waiting to happen. (High, 5 min)
5. Fix `BookingSuccess.jsx` field names and BASE URL. (High, 10 min)
6. Replace `db.execute('BEGIN')` pattern in `bookings.js` with `db.batch` or a unique constraint. (High, half day)
7. Resolve the 10 lint errors so `npm run lint` is green again. (Medium, 30 min)
8. Add `autobus-app/.env*` to `.gitignore`. (Medium, 1 min)
9. Decide what `pending_bookings` and `password_resets` cleanup should look like. (Medium, 1 hr)
10. Split `AppContext` into Auth/Theme/Data, or migrate to TanStack Query for data. (Architecture, 1–2 days)

After those, the project moves from a "5/10 with red flags" to something closer to "7/10 portfolio piece".
