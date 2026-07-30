# FleetOps Command

A full truck management system for logistics businesses. It includes login/logout, multi-page navigation, route optimization, freight/load management, drivers, vehicles, maintenance history, tolls, tyre tracking, and expense/profit analysis.

## Frontend

- `src/main.jsx` - React app, login/logout, routing, API calls, pages
- `src/styles.css` - Responsive SaaS dashboard design
- `vite.config.js` - Dev proxy from `/api` to backend

## Backend

- `backend/server.js` - Node API server
- `backend/data/logistics-db.json` - Local database used for development
- `backend/.env.example` - Neon/Postgres environment example
- `backend/neon/schema.sql` - SQL schema for Neon Postgres

## Login

Users can create a personal owner account from the login screen. The backend issues a JWT token after sign in or sign up.

Seed account still available after running the schema:

```text
Email: admin@fleetops.com
Password: admin123
```

## Run Locally

Open two terminals:

```bash
npm run dev:backend
```

```bash
npm run dev:frontend
```

Then open:

```text
http://localhost:5173/
```

## API

- `POST /api/auth/login`
- `GET /api/health`
- `GET /api/dashboard`
- `GET /api/routes`
- `GET /api/loads`
- `GET /api/drivers`
- `GET /api/vehicles`
- `GET /api/maintenance`
- `GET /api/tolls`
- `GET /api/tyres`
- `GET /api/expenses`
- `GET /api/financeBars`

Collection endpoints also support:

- `POST /api/:collection`
- `PUT /api/:collection/:id`
- `DELETE /api/:collection/:id`

## Neon Database Setup

1. Create a Neon project.
2. Copy your Neon connection string.
3. Create `backend/.env` using `backend/.env.example`.
4. Paste your connection string as `DATABASE_URL`.
5. Add a strong `JWT_SECRET`.
6. Run `npm run init:neon --prefix backend` or run the SQL from `backend/neon/schema.sql` in the Neon SQL editor.

The current app runs with the local JSON database immediately. The Neon schema is included so the project can be moved to Neon once you add the real database credentials.
