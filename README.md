# FleetOps Command

FleetOps Command is a truck management system for logistics businesses. It manages trips, trucks, drivers, freight, tyre tracking, maintenance, tolls, expenses, backup import/export, and completed-trip profit reporting.

The app is built as a React frontend with a Node.js backend. The backend can run with the included local JSON database for development, or with Neon/Postgres when `DATABASE_URL` is configured.

## Main Features

- Owner login/signup with JWT authentication
- Public preview dashboard before login
- Dashboard with completed-trip revenue, expenses, profit, active trips, alerts, and truck tracker
- Trip register with separate running trips and completed trips
- Completed-trip-only profit and loss calculation
- Truck-wise trip, maintenance, toll, tyre, and finance reporting
- Add/edit/delete records across the main modules
- Truck number dropdowns for vehicle-linked entries
- Import/export backup from Settings
- Light/dark mode with QuickAI-inspired purple theme

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | React 19, Vite, Framer Motion, Lucide React |
| Styling | Plain CSS in `src/styles.css`, Outfit font, CSS variables |
| Backend | Node.js HTTP server, ES modules |
| Auth | JWT, bcryptjs |
| Database | Local JSON fallback or Neon/Postgres |
| Deployment | Vercel config included for frontend |

## Project Structure

```text
.
|-- src/
|   |-- main.jsx              # Small React mount entry
|   |-- App.jsx               # App shell, auth state, layout, routing, modal wiring
|   |-- pages.jsx             # Feature pages: dashboard, trips, vehicles, finance, settings
|   |-- components.jsx        # Reusable UI components: panels, tables, charts, route map
|   |-- config.jsx            # Navigation, icons, new-entry form configuration
|   |-- data.js               # Fallback dashboard and public preview data
|   |-- utils.js              # Calculations, formatting, trip/report helpers
|   `-- styles.css            # Global theme, layout, dashboard styling
|-- backend/
|   |-- server.js             # Backend server bootstrap
|   |-- routes/
|   |   `-- apiRoutes.js      # API route entry point
|   |-- controllers/
|   |   `-- apiController.js  # Request parsing, auth checks, response handling
|   |-- models/
|   |   `-- fleetModel.js     # Storage, auth, calculations, backup logic
|   |-- data/
|   |   `-- logistics-db.json # Local development database
|   |-- neon/
|   |   `-- schema.sql        # Neon/Postgres schema
|   `-- scripts/
|       `-- init-neon.js      # Neon schema initializer
|-- vite.config.js            # Frontend dev proxy for `/api`
|-- package.json              # Frontend scripts/dependencies
`-- README.md
```

## Architecture

```text
Browser
  |
  | React pages call fetch("/api/...")
  v
Vite dev server
  |
  | Proxies /api to backend during local development
  v
Node backend
  |
  | backend/server.js
  v
Route layer
  |
  | backend/routes/apiRoutes.js
  v
Controller layer
  |
  | backend/controllers/apiController.js
  | - Parses request URL/body
  | - Handles auth routes
  | - Requires JWT for private routes
  | - Calls model functions
  v
Model/data layer
  |
  | backend/models/fleetModel.js
  | - Reads/writes JSON or Postgres
  | - Maps API fields to DB fields
  | - Builds dashboard data
  | - Calculates trip summaries and profit reports
  | - Exports/imports backup files
  v
Storage
  |
  | Local JSON: backend/data/logistics-db.json
  | Neon/Postgres: when DATABASE_URL exists
```

## Frontend Flow

1. `src/main.jsx` mounts the React app.
2. `src/App.jsx` manages login state, active page state, API loading, theme state, and modal state.
3. `src/pages.jsx` renders feature pages such as Dashboard, Trip Register, Vehicles, Finance, and Workspace Center.
4. `src/components.jsx` provides shared UI building blocks such as panels, tables, charts, stats, and route visuals.
5. `src/utils.js` contains trip, finance, report, formatting, and search helper functions.
6. `src/config.jsx` contains navigation setup and new-entry form field definitions.
7. If no user session exists in `localStorage`, the app shows `PublicPreview`.
8. `PublicPreview` calls `GET /api/public-dashboard`.
9. If the public API returns empty data, local demo preview data is shown.
10. After login/signup, the JWT session is saved in `localStorage`.
11. The authenticated app loads `GET /api/dashboard`.
12. Sidebar navigation switches between dashboard, trips, vehicles, maintenance, tyres, finance, and workspace.
13. The FleetOps logo in the sidebar redirects the logged-in user back to the Dashboard/Home page.
14. New/edit forms call `POST /api/:collection` or `PUT /api/:collection/:id`.
15. Delete buttons call `DELETE /api/:collection/:id`.

## Backend Flow

1. `backend/server.js` starts the Node HTTP server.
2. Requests are passed into `handleApiRequest`.
3. `apiController.js` reads the route and method.
4. Public routes are allowed for health, login, signup, and public dashboard.
5. Private routes require a JWT token in the `Authorization` header.
6. Collection requests are delegated to model helpers:
   - `getCollection`
   - `createRecord`
   - `updateRecord`
   - `deleteRecord`
7. Dashboard requests call `getDashboard`.
8. Backup requests call export/import helpers.

## Data Storage Flow

The backend chooses storage automatically:

```js
const pool = process.env.DATABASE_URL
  ? new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
  : null;
```

- If `DATABASE_URL` exists, the backend uses Neon/Postgres.
- If `DATABASE_URL` is missing, the backend uses `backend/data/logistics-db.json`.

Environment variables are loaded from `backend/.env` using `dotenv`.

## Trip And Profit Flow

FleetOps separates trip tracking from final accounting:

```text
Running Trip
  - Visible in trip register
  - Visible in active/open trips
  - Expenses can be entered while the trip is running
  - Does not affect overall profit/loss

Completed Trip
  - Visible in completed trips
  - Freight and expenses are booked into reports
  - Affects dashboard profit
  - Affects finance profit/loss
  - Affects truck-wise profitability
```

The backend builds trip summaries in `buildTripSummaries`, then splits them into:

- `runningTripSummaries`
- `completedTripSummaries`

Truck reports and finance summaries use completed trips only. This prevents running-trip expenses from showing as a loss before the trip is finished.

## Main Pages

| Page | Purpose |
| --- | --- |
| Dashboard | Home page with fleet overview, completed-trip profit, active trips, alerts |
| Route Optimizer | Plan route cost, tolls, fuel, freight, and expected margin |
| Freight & Loads | Track load assignments |
| Trip Register | Truck-wise trip register with running/completed sections |
| Drivers | Driver records |
| Vehicles | Truck records and truck-wise activity |
| Maintenance | Maintenance notes, parts, costs, and history |
| Tolls | FASTag/toll records |
| Tyres | Tyre tracking by truck number |
| Finance | Completed-trip P&L, expense notes, date reports |
| Settings | About FleetOps plus backup import/export |

## API Endpoints

### Auth

- `POST /api/auth/login`
- `POST /api/auth/signup`
- `GET /api/auth/me`

### Dashboard

- `GET /api/public-dashboard`
- `GET /api/dashboard`
- `GET /api/health`

### Collections

Most collection routes support:

- `GET /api/:collection`
- `POST /api/:collection`
- `PUT /api/:collection/:id`
- `DELETE /api/:collection/:id`

Common collections:

- `routes`
- `loads`
- `drivers`
- `vehicles`
- `maintenance`
- `tolls`
- `tyres`
- `trips`
- `expense-notes`
- `maintenance-notes`
- `trip-loads`
- `trip-expenses`
- `trip-payments`
- `trip-notes`
- `fuel-entries`

### Backup

- `GET /api/backup/export`
- `POST /api/backup/import`

## Run Locally

Install dependencies:

```bash
npm install
npm install --prefix backend
```

Open two terminals.

Backend:

```bash
npm run dev:backend
```

Frontend:

```bash
npm run dev:frontend
```

Open:

```text
http://localhost:5173/
```

## Environment Setup

Create `backend/.env` when using Neon/Postgres:

```text
DATABASE_URL=your_neon_connection_string
JWT_SECRET=your_strong_secret
PORT=4000
```

Initialize Neon schema:

```bash
npm run init:neon --prefix backend
```

Without `DATABASE_URL`, the app runs with the local JSON database.

## Login

Users can create a personal owner account from the login screen.

Seed account for schema/demo data:

```text
Email: admin@fleetops.com
Password: admin123
```

## Build

Frontend production build:

```bash
npm run build
```

Backend syntax check example:

```bash
node --check backend/models/fleetModel.js
```

## Backup And Restore

Settings includes import/export:

- Export downloads a JSON backup of the workspace data.
- Import replaces current workspace records with the selected backup file.
- This is useful before clearing database storage or moving data between environments.

## Important Business Rule

Overall profit/loss uses completed trips only. Running trips remain visible for operations, but their amounts are booked only after the trip status becomes `Completed`.
