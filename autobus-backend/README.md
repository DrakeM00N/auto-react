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

Create a `.env` file in the `autobus-backend` directory with the following variables:

```
PORT=3001
JWT_SECRET=your_jwt_secret_here_change_in_production
MONOBANK_TOKEN=your_monobank_acquiring_token_here
FRONTEND_URL=http://localhost:5173
```

The `MONOBANK_TOKEN` is the monobank acquiring ("Plata by mono") token.
Get a free test token at https://api.monobank.ua/ for development.

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
- `POST /api/auth/request-reset` - Request password reset (sends token to email)
- `POST /api/auth/reset-password` - Reset password with token
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

#### Payments (monobank acquiring / "Plata by mono")
- `POST /api/payments/checkout` - Hold a seat and create a monobank invoice; returns `pageUrl`
- `POST /api/payments/webhook` - monobank server-to-server status notification (X-Sign verified)
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
- `pending_bookings` (seat holds + monobank invoice ids, awaiting payment)
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
    ├── monobank.js  # monobank acquiring API client
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