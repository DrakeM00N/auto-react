# Autobus Frontend

This is the frontend for the Autobus application, built with React 19, React Router DOM, and Vite.

## Table of Contents
- [Getting Started](#getting-started)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Environment Variables](#environment-variables)
- [Running the Application](#running-the-application)
- [Available Scripts](#available-scripts)
- [Project Structure](#project-structure)
- [Backend Integration](#backend-integration)

## Getting Started

These instructions will help you set up and run the frontend on your local machine for development and testing.

### Prerequisites

- Node.js (>=14.x)
- npm (Node Package Manager)

### Installation

1. Clone the repository (if you haven't already):
   ```bash
   git clone <repository-url>
   cd autobus-app
   ```

2. Install the dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables (optional):
   - Create a `.env` file in the root of this directory.
   - You can set `VITE_API_URL` to point to your backend URL.
   - If not set, it defaults to `http://localhost:3001/api`.

### Environment Variables

The frontend uses Vite's environment variables. Create a `.env` file in the `autobus-app` directory with:

```
VITE_API_URL=http://localhost:3001/api
```

### Running the Application

To start the frontend development server:

```bash
npm run dev
```

The application will be accessible at `http://localhost:5173`.

For production build:
```bash
npm run build
```

To preview the production build locally:
```bash
npm run preview
```

### Available Scripts

In the `package.json` file, you can find the following scripts:

- `npm run dev` - Start Vite development server (http://localhost:5173)
- `npm run build` - Build production assets to `dist/`
- `npm run lint` - Run ESLint for code quality (uses eslint.config.js)
- `npm run preview` - Preview production build locally

### Project Structure

```
autobus-app/
├── src/                     # Source code directory
│   ├── main.jsx             # Entry point
│   ├── App.jsx              # Main application component with routing
│   ├── index.css            # Global styles
│   ├── App.css              # Application-specific styles
│   ├── assets/              # Static assets (images, icons)
│   ├── components/          # Reusable UI components
│   │   ├── Navbar.jsx       # Navigation bar
│   │   ├── Footer.jsx       # Application footer
│   │   └── ProtectedRoute.jsx # Component for route protection
│   ├── context/             # React Context for state management
│   │   └── AppContext.jsx   # Central state management (auth, data, theme)
│   ├── pages/               # Page components
│   │   ├── Home.jsx         # Landing page
│   │   ├── Routes.jsx       # Route listing/management
│   │   ├── Schedule.jsx     # Trip schedule viewing
│   │   ├── Booking.jsx      # Trip booking form
│   │   ├── BookingSuccess.jsx # Booking confirmation
│   │   ├── Login.jsx        # User authentication
│   │   ├── Register.jsx     # New user registration
│   │   ├── Profile.jsx      # User profile management
│   │   ├── ResetPassword.jsx # Password recovery
│   │   └── Admin.jsx        # Administrative dashboard
├── public/                  # Static files served directly
│   ├── favicon.svg
│   └── icons.svg
├── index.html               # HTML template
├── vite.config.js           # Vite configuration
├── package.json             # npm dependencies and scripts
├── README.md                # This file
└── .env                     # Environment variables (optional, not in version control)
```

### Backend Integration

The frontend communicates with the Autobus backend API:

1. **API Base URL**: The base URL for API requests is configured in `src/context/AppContext.jsx`:
   ```javascript
   const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'
   ```

2. **Authentication**: 
   - JWT tokens are stored in `localStorage` after login
   - The `request()` function in AppContext automatically attaches the token to requests
   - Protected routes use the `ProtectedRoute` wrapper component

3. **State Management**:
   - Application state is managed through React Context (`AppContext`)
   - State includes: user data, routes, trips, bookings, theme, loading states
   - Data is automatically loaded from the backend on app startup and user login

4. **Key Features**:
   - User authentication (login/register)
   - Route and trip browsing
   - Booking system with monobank payment integration and QR-coded e-tickets
   - User profile management
   - Admin dashboard for managing routes, trips, bookings, and users
   - Responsive design with CSS variables
   - Light/dark theme toggle with persistence

### Development Workflow

1. **Start the backend server** (see backend README for instructions)
2. **Start the frontend development server**:
   ```bash
   npm run dev
   ```
3. **Make changes** to any files in the `src/` directory - Vite provides hot module replacement
4. **Test the application** in your browser at `http://localhost:5173`

### Styling

- Styles use CSS variables defined in `src/index.css`
- Theme system allows switching between light and dark modes
- Component-specific styles are in corresponding `.css` or `.jsx` files

### Contributing

Please follow the project's coding standards and conventions when contributing.

## Deploying to Render

This app is deployed as a **Static Site** on Render. The repo root contains a
`render.yaml` Blueprint that declares both the frontend and the backend; on
first deploy, Render reads it and creates both services.

### ⚠️ `VITE_API_URL` is required at build time

Vite **inlines** every `VITE_*` env var into the bundle during `npm run build`.
There is no runtime lookup — the value you see in `dist/assets/index-*.js`
is whatever was in the environment when `vite build` ran.

If you build without setting `VITE_API_URL`, the bundle hard-codes the
fallback `http://localhost:3001/api`, and every deployed user's browser
will try to reach **their own laptop** instead of the production backend.
The site will load (static HTML serves fine) but auth, routes, and trips
will all silently fail with network errors in the console.

### Setting it in the Render dashboard

1. Open the `autobus-frontend` service in the Render dashboard.
2. Go to **Environment** in the left sidebar.
3. Add an env var: `VITE_API_URL = https://<your-backend>.onrender.com/api`
   (note the trailing `/api`).
4. Optional: `VITE_GOOGLE_CLIENT_ID` (must match the backend's
   `GOOGLE_CLIENT_ID`), and `VITE_PUBLIC_URL` (this site's own URL — used
   for the QR code on tickets).
5. Click **Save Changes**, then go to **Manual Deploy** → **Clear build
   cache & deploy**. Plain redeploy without cache clear may reuse the
   pre-built artifacts and skip running `vite build` at all — the env var
   would never reach the bundle.

To verify the new build picked up the value, open the deployed site, view
the bundled JS in DevTools → Sources, and search for your backend URL.
If you still see `localhost:3001`, the cache wasn't cleared.

### Other build-time env vars

| Variable | Purpose |
|---|---|
| `VITE_API_URL` | **Required.** Backend `/api` base URL. |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth web client ID. Leave empty to hide the "Continue with Google" button. |
| `VITE_PUBLIC_URL` | This site's public URL, embedded into the QR code on tickets. Defaults to `window.location.origin` if unset. |

### License

This project is licensed under the ISC License.