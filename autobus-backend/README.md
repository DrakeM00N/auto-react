# Autobus Backend

This is the backend for the Autobus application, built with Node.js, Express, and SQLite.

## Table of Contents
- [Getting Started](#getting-started)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Environment Variables](#environment-variables)
- [Running the Server](#running-the-server)
- [API Endpoints](#api-endpoints)
- [Database](#database)
- [Project Structure](#project-structure)

## Getting Started

These instructions will help you set up and run the backend on your local machine for development and testing.

### Prerequisites

- Node.js (>=14.x)
- npm (Node Package Manager)

### Installation

1. Clone the repository (if you haven't already):
   ```bash
   git clone <repository-url>
   cd autobus-backend
   ```

2. Install the dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   - Copy `.env.example` to `.env` and fill in the required values.
   - The `.env.example` file is provided in the root of this directory.

### Environment Variables

Copy `.env.example` to `.env` and fill in the values you need. The server
will refuse to start if `JWT_SECRET` is unset.

```
JWT_SECRET=your_jwt_secret_here_change_in_production   # required
PORT=3001
WAYFORPAY_MERCHANT_ACCOUNT=your_merchant_account
WAYFORPAY_SECRET_KEY=your_wayforpay_secret_key
WAYFORPAY_MERCHANT_DOMAIN=your-domain.com
FRONTEND_URL=http://localhost:5173
ADMIN_EMAILS=                                          # see below
```

The WayForPay credentials come from your merchant cabinet at
https://wayforpay.com/. `WAYFORPAY_MERCHANT_DOMAIN` must match the
domain registered for the merchant account.

### Bootstrapping the admin role

There's no API endpoint that creates an admin from scratch — `/api/users/:id/promote`
requires an existing admin. To break the cycle, `routes/auth.js` assigns
`role='admin'` on registration when **either** condition holds:

1. The `users` table is empty (the very first signup gets admin
   automatically — useful right after a fresh `autobus.db`).
2. The new user's email is listed in the comma-separated `ADMIN_EMAILS`
   environment variable. This is the recovery path: set `ADMIN_EMAILS`
   in `.env`, restart the server, then register that email — they come
   out as admin even if other users already exist.

The decision is made inside a single `INSERT ... CASE WHEN` statement,
so two concurrent first-user registrations can't both win.

The JWT does **not** contain `role`. `authMiddleware` re-reads `role`
from the DB on every request, so a promote/demote takes effect on the
backend immediately. However, the frontend caches `currentUser` in
`localStorage` (including `role`) from the login response, so a user
whose role just changed has to **log out and log back in** before the
admin nav shows up in their browser.

### Password reset flow

The flow uses transactional email through [Resend](https://resend.com):

1. User submits email on `/forgot-password` (frontend).
2. `POST /api/auth/forgot-password` is rate-limited to 5 per IP per hour.
   The response is identical whether the email is registered or not
   (anti-enumeration). If the user exists, a 64-char random token is
   stored in `password_resets` with a 1-hour expiry, and an email with
   `${FRONTEND_URL}/reset-password?token=<token>` is sent.
3. User clicks the link → `/reset-password?token=...` opens. The token
   is the only credential — the frontend submits `{ token, newPassword }`,
   the backend reads the email from the `password_resets` row.
4. `POST /api/auth/reset-password` verifies the token (existence,
   `used = 0`, not expired), updates `users.password`, marks the token
   as used. Subsequent reuse of the same token is rejected.

**Resend setup:**

- For local development, leave `RESEND_API_KEY` empty. `services/email.js`
  logs the reset link to stdout instead of trying to send. This lets
  you test the full flow without any external dependencies.
- For first real-mail tests, sign up at resend.com, copy your API key
  into `RESEND_API_KEY`, and use `EMAIL_FROM='BusToRIA <onboarding@resend.dev>'` —
  Resend's sandbox sender delivers ONLY to the account-owner email,
  perfect for end-to-end testing without spamming.
- **Before production:** verify your own domain in the Resend dashboard
  (DNS records — SPF, DKIM, MX). Once verified, switch `EMAIL_FROM` to
  `noreply@your-domain`. Sandbox sender does not work for real users.

### Running the Server

To start the server in development mode (with auto-restart using nodemon):

```bash
# Install nodemon globally if you don't have it
npm install -g nodemon

# Start the server
nodemon server.js
```

Alternatively, you can start the server without nodemon:

```bash
node server.js
```

The server will start on port 3001 (or the port specified in the `.env` file) and will be accessible at `http://localhost:3001`.

### API Endpoints

All API endpoints are prefixed with `/api`.

#### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/forgot-password` - Request a password-reset email (rate-limited 5/hour/IP)
- `POST /api/auth/reset-password` - Reset password with token from the email link
- `POST /api/auth/change-password` - Change password (authenticated)

#### Routes
- `GET /api/routes` - Get all routes
- `POST /api/routes` - Create a new route (admin only)
- `PUT /api/routes/:id` - Update a route (admin only)
- `DELETE /api/routes/:id` - Delete a route (admin only)

#### Trips
- `GET /api/trips` - Get all trips with booked seats count
- `POST /api/trips` - Create a new trip (admin only)
- `PUT /api/trips/:id` - Update a trip (admin only)
- `DELETE /api/trips/:id` - Delete a trip (admin only)

#### Bookings
- `GET /api/bookings/my` - Get current user's bookings (authenticated)
- `GET /api/bookings` - Get all bookings (admin only)
- `PUT /api/bookings/:id` - Update a booking (owner or admin)
- `DELETE /api/bookings/:id` - Delete a booking (owner or admin)

Note: bookings are created only by a confirmed payment (see Payments), not by a direct endpoint.

#### Users
- `GET /api/users` - Get all users (admin only)
- `POST /api/users/:id/promote` - Promote a user to admin (admin only)

#### Payments (WayForPay)
- `POST /api/payments/create` - Hold a seat and return signed WayForPay form fields
- `POST /api/payments/webhook` - WayForPay server-to-server notification (merchantSignature verified)
- `GET /api/payments/status/:orderId` - Check payment status; issues the ticket on success

#### Tickets
- `GET /api/tickets/:code` - Public ticket lookup/verification by ticket code

#### Health Check
- `GET /api/health` - Check if the server is running

### Database

The application uses SQLite (via `@libsql/client`) for data storage. The database file is `autobus.db` in the `autobus-backend` directory.

The database schema includes tables for:
- `users`
- `routes`
- `trips`
- `bookings` (includes a unique `ticket_code` per issued ticket)
- `pending_bookings` (seat holds + WayForPay order references, awaiting payment)
- `password_resets` (for password reset tokens)

The database is initialized and seeded with initial data when the server starts if the tables are empty.

### Project Structure

```
autobus-backend/
├── .env             # Environment variables (not in version control)
├── .env.example     # Example environment variables
├── autobus.db       # SQLite database (not in version control)
├── db.js            # Database initialization and connection
├── middleware.js    # Authentication middleware
├── package.json     # npm dependencies and scripts
├── package-lock.json
├── server.js        # Entry point for the Express application
├── routes/          # API route definitions
│   ├── auth.js
│   ├── bookings.js
│   ├── payments.js
│   ├── routes.js
│   ├── tickets.js
│   ├── trips.js
│   └── users.js
└── services/        # Business logic
    ├── wayforpay.js # WayForPay signing + status API + webhook verification
    ├── seats.js     # seat availability / hold counting
    └── ticketing.js # ticket issuance and lookup
```

### Development Tips

- Enable `nodemon` for automatic server restarts during development.
- The backend provides a CORS configuration that allows requests from the frontend URL specified in the `.env` file (default: `http://localhost:5173`).
- For production, adjust the CORS origin and other settings as needed.

### Testing

Currently, there are no automated tests. To add testing, consider using a framework like Jest or Mocha.

### Contributing

Please read the contributing guidelines (if any) before submitting pull requests.

### License

This project is licensed under the ISC License.