# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Structure

This is a full-stack application with two main parts:
- `autobus-app`: Frontend React application built with Vite
- `autobus-backend`: Backend API server built with Node.js and Express

### Frontend (autobus-app)
- Technology stack: React 19, React Router DOM, Vite
- Entry point: `index.html` -> `src/main.jsx` (implied by Vite setup)
- State management: Uses React Context (`src/context/AppContext.js`) for global state
- API communication: Uses `fetch` with base URL defined in constants (see Booking.jsx line 5)
- Components organized in `src/pages/` and `src/components/`
- Styles use CSS variables defined in `index.css`

### Backend (autobus-backend)
- Technology stack: Node.js, Express, SQLite (via @libsql/client)
- Entry point: `server.js`
- Database: SQLite file `autobus.db` initialized via `db.js`
- Route organization:
  - `/api/auth` - authentication (login/register)
  - `/api/routes` - bus routes management (CRUD operations)
  - `/api/trips` - scheduled trips (includes booking/seat logic)
  - `/api/bookings` - booking system (creation, retrieval)
  - `/api/users` - user management
  - `/api/liqpay` - payment integration (LiqPay API)
- Middleware: 
  - CORS (configured in server.js)
  - JSON parsing (express.json())
  - Custom auth middleware (`middleware.js` - validates JWT tokens)
  - Error handling middleware
- Services: Business logic separated in `services/` directory (e.g., authService.js)

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
   - Context updates in `src/context/AppContext.js` affect all consuming components

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

## Environment Variables

Backend requires a `.env` file in `autobus-backend/` with at least:
- `PORT=3001` (default backend port)
- `JWT_SECRET` (for signing/verifying authentication tokens)
- `LIQPAY_PUBLIC_KEY` and `LIQPAY_PRIVATE_KEY` (for payment processing via LiqPay)
- Database configuration (if using remote Turso/LibSQL - currently using local SQLite)

Frontend uses Vite's environment variables prefixed with `VITE_` if needed (currently none defined).

## Testing

Currently no test scripts are defined. To add testing:
- Frontend: Add Vitest or Jest with React Testing Library
  - Example test command: `"test": "vitest"` in package.json
  - Test files would go in `src/__tests__/` or alongside components
- Backend: Add Jest or Mocha for API testing
  - Example test command: `"test": "jest"` in package.json
  - Test files would go in a `test/` directory

## Important Notes

- The frontend proxy is not configured in vite.config.js; ensure backend is running on expected port (3001) for API calls
- CORS is enabled for all origins (`*`) in backend - adjust for production to specific domains
- Booking flow: 
  1. User selects trip and fills passenger info
  2. Form submits to `/api/bookings` endpoint
  3. Backend creates booking record and returns payment data
  4. Frontend handles LiqPay integration (incomplete in current implementation)
  5. On payment success, sessionStorage stores pending booking for ticket display
- Error handling: Both frontend and backend have basic error states; consider adding more robust error boundaries and validation
- Responsive design: Uses CSS variables and flexible layouts; test on various screen sizes