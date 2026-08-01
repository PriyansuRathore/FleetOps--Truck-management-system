import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  BadgeIndianRupee,
  BarChart3,
  Bell,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  CircleGauge,
  ClipboardList,
  Fuel,
  Gauge,
  IndianRupee,
  LockKeyhole,
  LogOut,
  Map,
  MapPin,
  Menu,
  Navigation,
  PackageCheck,
  Route,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Truck,
  UserRoundCheck,
  Wrench,
  X,
} from "lucide-react";
import "./styles.css";

const iconMap = {
  dashboard: CircleGauge,
  routes: Navigation,
  loads: PackageCheck,
  drivers: UserRoundCheck,
  vehicles: Truck,
  maintenance: Wrench,
  trips: Route,
  tolls: Map,
  tyres: Gauge,
  finance: BadgeIndianRupee,
  settings: Settings,
};

const metricIcons = {
  "Active trucks": Truck,
  "On-time trips": CheckCircle2,
  "Monthly profit": BadgeIndianRupee,
  "Fleet alerts": AlertTriangle,
};

const fallbackDashboard = {
  metrics: [],
  routes: [],
  loads: [],
  trips: [],
  tripSummaries: [],
  tripLoads: [],
  tripExpenses: [],
  tripPayments: [],
  tripNotes: [],
  fuelEntries: [],
  expenseNotes: [],
  maintenanceNotes: [],
  drivers: [],
  vehicles: [],
  maintenance: [],
  tolls: [],
  tyres: [],
  financeBars: [],
  expenses: [],
  parts: [],
  truckReports: [],
  financialSummary: {
    projectedRevenue: "Rs.0",
    fuelExpense: "Rs.0",
    netProfit: "Rs.0",
  },
};

const navItems = [
  ["dashboard", "Dashboard"],
  ["routes", "Route Optimizer"],
  ["loads", "Freight & Loads"],
  ["trips", "Trip Register"],
  ["drivers", "Drivers"],
  ["vehicles", "Vehicles"],
  ["maintenance", "Maintenance"],
  ["tolls", "Tolls"],
  ["tyres", "Tyres"],
  ["finance", "Finance"],
  ["settings", "Settings"],
];

function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("fleetops-session");
    return saved ? JSON.parse(saved).user : null;
  });
  const [authOpen, setAuthOpen] = useState(false);
  const [activePage, setActivePage] = useState("dashboard");
  const [dashboard, setDashboard] = useState(fallbackDashboard);
  const [apiStatus, setApiStatus] = useState("Connecting");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [entryOpen, setEntryOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!user) return;
    fetchDashboard(setDashboard, setApiStatus);
  }, [user]);

  function handleLogin(session) {
    setUser(session.user);
    localStorage.setItem("fleetops-session", JSON.stringify(session));
    setAuthOpen(false);
  }

  function handleLogout() {
    localStorage.removeItem("fleetops-session");
    setUser(null);
    setActivePage("dashboard");
  }

  if (!user) {
    return (
      <PublicPreview
        authOpen={authOpen}
        setAuthOpen={setAuthOpen}
        onLogin={handleLogin}
      />
    );
  }

  return (
    <div className="app-shell">
      <Sidebar
        activePage={activePage}
        setActivePage={setActivePage}
        open={sidebarOpen}
        setOpen={setSidebarOpen}
      />
      <div className="workspace">
        <Topbar
          user={user}
          apiStatus={apiStatus}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onLogout={handleLogout}
          onMenu={() => setSidebarOpen(true)}
        />
        <AnimatePresence mode="wait">
          <motion.div
            key={activePage}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.28 }}
          >
            <PageRouter
              page={activePage}
              data={dashboard}
              searchQuery={searchQuery}
              onNewEntry={() => setEntryOpen(true)}
              onRefresh={() => fetchDashboard(setDashboard, setApiStatus)}
            />
          </motion.div>
        </AnimatePresence>
        <NewEntryModal
          page={activePage}
          open={entryOpen}
          onClose={() => setEntryOpen(false)}
          onSaved={() => {
            setEntryOpen(false);
            fetchDashboard(setDashboard, setApiStatus);
          }}
        />
      </div>
    </div>
  );
}

async function fetchDashboard(setDashboard, setApiStatus) {
  try {
    const session = JSON.parse(localStorage.getItem("fleetops-session") || "{}");
    const response = await fetch("/api/dashboard", {
      headers: session.token ? { Authorization: `Bearer ${session.token}` } : {},
    });
    const data = await response.json();
    setDashboard({ ...fallbackDashboard, ...data, expenseNotes: [...(data.expenseNotes || []), ...getLocalExpenseNotes()] });
    setApiStatus("Live API");
  } catch {
    setDashboard({ ...fallbackDashboard, expenseNotes: getLocalExpenseNotes() });
    setApiStatus("Offline");
  }
}

function PublicPreview({ authOpen, setAuthOpen, onLogin }) {
  const [preview, setPreview] = useState(fallbackDashboard);

  useEffect(() => {
    fetch("/api/public-dashboard")
      .then((response) => response.json())
      .then((data) => setPreview({ ...fallbackDashboard, ...data }))
      .catch(() => setPreview(fallbackDashboard));
  }, []);

  return (
    <main className="public-preview">
      <header className="public-nav">
        <div className="login-brand">
          <Truck size={32} />
          <div>
            <strong>FleetOps Command</strong>
            <span>Truck management system</span>
          </div>
        </div>
        <button className="primary-action" onClick={() => setAuthOpen(true)}>
          <LockKeyhole size={18} />
          Login / Sign Up
        </button>
      </header>
      <section className="public-hero">
        <div>
          <p>Public fleet preview</p>
          <h1>See your fleet in motion before you sign in. Sign in to unlock your own live operations dashboard.</h1>
        </div>
        <RouteMotionMap routes={preview.routes} selectedRoute={preview.routes[0]} />
      </section>
      <Dashboard data={preview} />
      {authOpen && (
        <div className="auth-overlay">
          <button className="scrim" onClick={() => setAuthOpen(false)} aria-label="Close login" />
          <div className="auth-modal">
            <button className="mobile-close auth-close" onClick={() => setAuthOpen(false)} aria-label="Close">
              <X size={20} />
            </button>
            <LoginScreen onLogin={onLogin} compact />
          </div>
        </div>
      )}
    </main>
  );
}

function LoginScreen({ onLogin, compact = false }) {
  const [mode, setMode] = useState("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/auth/${mode === "signin" ? "login" : "signup"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Authentication failed");
      onLogin(payload);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className={compact ? "login-page compact-auth" : "login-page"}>
      <motion.section
        className="login-card"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
      >
        <div className="login-brand">
          <Truck size={34} />
          <div>
            <strong>FleetOps Command</strong>
            <span>Truck management system</span>
          </div>
        </div>
        <div className="auth-tabs">
          <button className={mode === "signin" ? "active" : ""} onClick={() => setMode("signin")} type="button">Sign In</button>
          <button className={mode === "signup" ? "active" : ""} onClick={() => setMode("signup")} type="button">Create Account</button>
        </div>
        <h1>{mode === "signin" ? "Sign in to control fleet operations." : "Create your owner workspace."}</h1>
        <form onSubmit={submit}>
          {mode === "signup" && (
            <label>
              Owner name
              <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" />
            </label>
          )}
          <label>
            Email
            <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="owner@company.com" />
          </label>
          <label>
            Password
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              placeholder="Minimum 6 characters"
            />
          </label>
          {error && <p className="form-error">{error}</p>}
          <button className="primary-action" disabled={loading}>
            <LockKeyhole size={18} />
            {loading ? "Checking..." : mode === "signin" ? "Sign In" : "Create Account"}
          </button>
        </form>
        <p className="demo-note">Each truck owner can create a personal account. JWT is stored locally and sent with backend requests.</p>
      </motion.section>
      {!compact && <section className="login-visual">
        <div className="road-map">
          <div className="route-stroke" />
          <motion.div
            className="truck-chip"
            animate={{ x: [0, 80, 170, 255], y: [0, -22, 20, -4] }}
            transition={{ duration: 6, repeat: Infinity, repeatType: "reverse" }}
          >
            <Truck size={30} />
          </motion.div>
          <div className="signal one">Delhi</div>
          <div className="signal two">Mumbai</div>
          <div className="signal three">Hub</div>
        </div>
      </section>}
    </main>
  );
}

function Sidebar({ activePage, setActivePage, open, setOpen }) {
  return (
    <>
      <aside className={`sidebar ${open ? "open" : ""}`}>
        <div className="side-brand">
          <Truck size={28} />
          <div>
            <strong>FleetOps</strong>
            <span>Command</span>
          </div>
          <button className="mobile-close" onClick={() => setOpen(false)} aria-label="Close menu">
            <X size={20} />
          </button>
        </div>
        <nav>
          {navItems.map(([id, label]) => {
            const Icon = iconMap[id];
            return (
              <button
                key={id}
                className={activePage === id ? "active" : ""}
                onClick={() => {
                  setActivePage(id);
                  setOpen(false);
                }}
              >
                <Icon size={19} />
                <span>{label}</span>
                <ChevronRight size={16} />
              </button>
            );
          })}
        </nav>
      </aside>
      {open && <button className="scrim" onClick={() => setOpen(false)} aria-label="Close navigation" />}
    </>
  );
}

function Topbar({ user, apiStatus, searchQuery, setSearchQuery, onLogout, onMenu }) {
  return (
    <header className="topbar">
      <button className="menu-button" onClick={onMenu} aria-label="Open navigation">
        <Menu size={22} />
      </button>
      <div className="search-box">
        <Search size={18} />
        <input
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search truck number for trip-wise report..."
        />
      </div>
      <div className="top-actions">
        <span className={apiStatus === "Live API" ? "status live" : "status"}>{apiStatus}</span>
        <button className="icon-button" aria-label="Notifications">
          <Bell size={19} />
        </button>
        <div className="user-chip">
          <span>{user.name}</span>
          <small>{user.role}</small>
        </div>
        <button className="logout-button" onClick={onLogout}>
          <LogOut size={18} />
          Logout
        </button>
      </div>
    </header>
  );
}

function PageRouter({ page, data, searchQuery, onNewEntry, onRefresh }) {
  const pages = {
    dashboard: <Dashboard data={data} searchQuery={searchQuery} onNewEntry={onNewEntry} />,
    routes: <RoutePage routes={data.routes} tolls={data.tolls} onNewEntry={onNewEntry} />,
    loads: <LoadsPage loads={data.loads} onNewEntry={onNewEntry} />,
    trips: <TripsPage data={data} searchQuery={searchQuery} onNewEntry={onNewEntry} onRefresh={onRefresh} />,
    drivers: <DriversPage drivers={data.drivers} onNewEntry={onNewEntry} />,
    vehicles: <VehiclesPage data={data} onNewEntry={onNewEntry} />,
    maintenance: <MaintenancePage data={data} onNewEntry={onNewEntry} onRefresh={onRefresh} />,
    tolls: <TollsPage tolls={data.tolls} routes={data.routes} onNewEntry={onNewEntry} />,
    tyres: <TyresPage tyres={data.tyres} onNewEntry={onNewEntry} />,
    finance: <FinancePage data={data} onNewEntry={onNewEntry} onRefresh={onRefresh} />,
    settings: <SettingsPage onNewEntry={onNewEntry} />,
  };
  return pages[page] || pages.dashboard;
}

function Dashboard({ data, searchQuery = "", onNewEntry }) {
  const topReports = [...(data.truckReports || [])].sort((a, b) => b.profit - a.profit).slice(0, 4);
  const liveFleet = buildVehicleTracker(data.vehicles || [], data.routes || []);
  const alerts = data.alerts || [];
  const searchedTruck = findTruckByQuery(data, searchQuery);
  return (
    <Page title="Operations Dashboard" kicker="Today" onNewEntry={onNewEntry}>
      <FleetPulse vehicles={data.vehicles} />
      {searchedTruck && <TruckTripSearchReport data={data} vehicleNumber={searchedTruck.number} />}
      <div className="metrics">
        {data.metrics.map((item) => {
          const Icon = metricIcons[item.label] || CircleGauge;
          return (
            <motion.article className="metric-card" key={item.id} whileHover={{ y: -4 }}>
              <Icon size={22} />
              <span>{item.label}</span>
              <strong>{item.value}</strong>
              <small>{item.delta}</small>
            </motion.article>
          );
        })}
      </div>
      <div className="dashboard-grid">
        <Panel title="Route Optimization" icon={Navigation}>
          <RouteList routes={data.routes} />
        </Panel>
        <Panel title="Freight & Load Board" icon={PackageCheck}>
          <DataTable
            columns={["ID", "Cargo", "Truck", "Weight", "Margin", "Status"]}
            rows={data.loads.map((load) => [load.id, load.item, load.truck, load.weight, load.margin, load.state])}
          />
        </Panel>
      </div>
      <div className="module-grid">
        <Panel title="Maintenance Queue" icon={Wrench}>
          <CompactRows rows={data.maintenance} primary="vehicle" secondary="task" meta="date" value="cost" />
        </Panel>
        <Panel title="Tyre Rotation Alerts" icon={Gauge}>
          <CompactRows rows={data.tyres} primary="position" secondary="tyre" meta="tread" value="rotation" />
        </Panel>
      </div>
      <div className="dashboard-grid">
        <Panel title="Fleet Alerts" icon={AlertTriangle}>
          <div className="alert-list">
            {alerts.length ? alerts.map((item) => (
              <div className={`alert-item ${item.severity}`} key={item.id}>
                <strong>{item.title}</strong>
                <span>{item.detail}</span>
              </div>
            )) : <p className="empty-state">Everything looks healthy right now.</p>}
          </div>
        </Panel>
        <Panel title="Live Truck Tracker" icon={MapPin}>
          <div className="tracker-grid">
            {liveFleet.map((vehicle) => (
              <div className="tracker-card" key={vehicle.id}>
                <div className="tracker-header">
                  <strong>{vehicle.number}</strong>
                  <span className="status-pill">{vehicle.status}</span>
                </div>
                <span>{vehicle.location}</span>
                <div className="tracker-bar"><i style={{ width: `${vehicle.progress}%` }} /></div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
      <Panel title="Truck Profit Report" icon={BarChart3}>
        <VerticalBars
          rows={topReports.map((report) => ({
            label: report.vehicle,
            value: report.profit,
            color: report.profit > 250000 ? "#0f9f8f" : "#d97706",
          }))}
          formatter={formatMoney}
        />
      </Panel>
    </Page>
  );
}

function FleetPulse({ vehicles }) {
  return (
    <section className="fleet-pulse">
      <div>
        <p>Live fleet movement</p>
        <strong>{vehicles.length || 0} trucks monitored</strong>
      </div>
      <div className="pulse-road">
        {[0, 1, 2].map((lane) => (
          <motion.span
            className={`pulse-truck lane-${lane + 1}`}
            key={lane}
            animate={{ x: ["-12%", "106%"] }}
            transition={{ duration: 7 + lane * 1.5, repeat: Infinity, ease: "linear", delay: lane * 0.6 }}
          >
            <Truck size={24} />
          </motion.span>
        ))}
      </div>
    </section>
  );
}

function RoutePage({ routes, tolls, onNewEntry }) {
  const [origin, setOrigin] = useState("Delhi");
  const [destination, setDestination] = useState("Mumbai");
  const [vehicleType, setVehicleType] = useState("Truck");
  const [loadWeight, setLoadWeight] = useState(18);
  const [fuelRate, setFuelRate] = useState(96);
  const [freightRevenue, setFreightRevenue] = useState(routes[0]?.freightRevenue || 0);
  const selectedRoute = routes.find((route) => route.from.toLowerCase() === origin.toLowerCase() && route.to.toLowerCase() === destination.toLowerCase()) || routes[0];
  const estimate = useMemo(() => estimateRoute({ origin, destination, vehicleType, loadWeight, fuelRate }), [origin, destination, vehicleType, loadWeight, fuelRate]);
  const routeTolls = tolls.filter((toll) => toll.routeId === selectedRoute?.id);
  const tollTotal = routeTolls.reduce((sum, toll) => sum + Number(toll.amountValue || 0), 0) || estimate.tollEstimate;
  const fuelCost = estimate.fuelCost;
  const driverAllowance = estimate.driverAllowance;
  const otherExpense = estimate.otherExpense;
  const revenue = Number(freightRevenue || estimate.revenue || selectedRoute?.freightRevenue || 0);
  const totalExpense = fuelCost + tollTotal + driverAllowance + otherExpense;
  const profit = revenue - totalExpense;

  useEffect(() => {
    if (selectedRoute) setFreightRevenue(selectedRoute.freightRevenue || estimate.revenue || 0);
  }, [selectedRoute?.id, estimate.revenue]);

  const previewRoute = selectedRoute || { from: origin || "Origin", to: destination || "Destination", km: estimate.distance, eta: estimate.eta };

  return (
    <Page title="Route Optimizer" kicker="Planning" onNewEntry={onNewEntry}>
      <div className="split-grid">
        <Panel title="Optimized Routes" icon={Route}>
          <RouteMotionMap routes={routes} selectedRoute={previewRoute} />
          <RouteList routes={routes} />
        </Panel>
        <Panel title="Live Route Profit Calculator" icon={MapPin}>
          <div className="form-grid route-calculator">
            <label>
              Origin
              <input value={origin} onChange={(event) => setOrigin(event.target.value)} placeholder="Delhi" />
            </label>
            <label>
              Destination
              <input value={destination} onChange={(event) => setDestination(event.target.value)} placeholder="Mumbai" />
            </label>
            <label>
              Vehicle type
              <select value={vehicleType} onChange={(event) => setVehicleType(event.target.value)}>
                <option value="Truck">Truck</option>
                <option value="Reefer">Reefer</option>
                <option value="Container">Container</option>
              </select>
            </label>
            <label>
              Load weight (T)
              <input value={loadWeight} onChange={(event) => setLoadWeight(event.target.value)} />
            </label>
            <label>Fuel rate per liter<input value={fuelRate} onChange={(event) => setFuelRate(event.target.value)} /></label>
            <label>Freight revenue<input value={freightRevenue} onChange={(event) => setFreightRevenue(event.target.value)} /></label>
            <div className="calculation-grid">
              <Stat label="Best route" value={estimate.label} />
              <Stat label="Distance" value={`${estimate.distance} km`} />
              <Stat label="ETA" value={estimate.eta} />
              <Stat label="Fuel cost" value={formatMoney(fuelCost)} />
              <Stat label="Tolls" value={formatMoney(tollTotal)} />
              <Stat label="Total expense" value={formatMoney(totalExpense)} />
              <Stat label="Profit / loss" value={formatMoney(profit)} tone={profit >= 0 ? "good" : "bad"} />
            </div>
            <button className="primary-action" type="button" onClick={onNewEntry}><Sparkles size={18} /> Save Optimized Plan</button>
          </div>
        </Panel>
      </div>
      <div className="split-grid">
        <Panel title="All Tolls On Selected Route" icon={ShieldCheck}>
          <DataTable
            columns={["Plaza", "Vehicle", "Amount", "Status"]}
            rows={routeTolls.map((toll) => [toll.plaza, toll.vehicle, toll.amount, toll.tag])}
          />
        </Panel>
        <Panel title="Route Cost Graph" icon={BarChart3}>
          <VerticalBars
            rows={[
              { label: "Fuel", value: fuelCost, color: "#2563eb" },
              { label: "Tolls", value: tollTotal, color: "#d97706" },
              { label: "Driver", value: driverAllowance, color: "#7c3aed" },
              { label: "Other", value: otherExpense, color: "#64748b" },
              { label: "Profit", value: Math.max(profit, 0), color: "#0f9f8f" },
            ]}
            formatter={formatMoney}
          />
        </Panel>
      </div>
    </Page>
  );
}

function LoadsPage({ loads, onNewEntry }) {
  return (
    <Page title="Freight & Load Management" kicker="Dispatch" onNewEntry={onNewEntry}>
      <Panel title="Load Assignments" icon={PackageCheck}>
        <DataTable
          columns={["Load ID", "Cargo", "Truck", "Weight", "Margin", "State"]}
          rows={loads.map((load) => [load.id, load.item, load.truck, load.weight, load.margin, load.state])}
        />
      </Panel>
    </Page>
  );
}

function TripsPage({ data, searchQuery = "", onNewEntry, onRefresh }) {
  const vehicles = data.vehicles || [];
  const searchedTruck = findTruckByQuery(data, searchQuery);
  const [selectedVehicle, setSelectedVehicle] = useState("");
  const [selectedTripId, setSelectedTripId] = useState("");
  const activeVehicle = searchedTruck?.number || selectedVehicle || vehicles[0]?.number || data.trips?.[0]?.vehicle || "";
  const report = buildTripReport(data, activeVehicle);
  const tripSummaries = (data.tripSummaries || []).filter((trip) => trip.vehicle === activeVehicle);
  const activeTrip = tripSummaries.find((trip) => trip.id === selectedTripId) || tripSummaries[0];
  const tripRows = tripSummaries.map((trip) => [
    trip.tripNo,
    `${trip.origin} to ${trip.destination}`,
    trip.startDate || "-",
    trip.endDate || "-",
    trip.load || "-",
    trip.km || "-",
    formatMoney(trip.totalFreight),
    formatMoney(trip.totalExpenses),
    formatMoney(trip.profit),
    trip.status,
  ]);

  useEffect(() => {
    if (!selectedVehicle && vehicles[0]?.number) setSelectedVehicle(vehicles[0].number);
  }, [vehicles[0]?.number, selectedVehicle]);

  useEffect(() => {
    if (tripSummaries[0]?.id && !tripSummaries.some((trip) => trip.id === selectedTripId)) {
      setSelectedTripId(tripSummaries[0].id);
    }
  }, [tripSummaries[0]?.id, selectedTripId]);

  return (
    <Page title="Trip Wise Truck Register" kicker="Trips" onNewEntry={onNewEntry}>
      <div className="split-grid">
        <Panel title="Truck Trip Summary" icon={Route}>
          <label>
            Select truck
            <select value={activeVehicle} onChange={(event) => setSelectedVehicle(event.target.value)}>
              {[...new Set([...(vehicles || []).map((vehicle) => vehicle.number), ...(data.trips || []).map((trip) => trip.vehicle)])]
                .filter(Boolean)
                .map((number) => <option key={number}>{number}</option>)}
            </select>
          </label>
          <label>
            Select trip
            <select value={activeTrip?.id || ""} onChange={(event) => setSelectedTripId(event.target.value)}>
              {tripSummaries.map((trip) => <option key={trip.id} value={trip.id}>{trip.tripNo} - {trip.origin} to {trip.destination}</option>)}
            </select>
          </label>
          <TripSummary report={report} />
        </Panel>
        <Panel title="Cost Output Graph" icon={BarChart3}>
          <VerticalBars
            rows={[
              { label: "Price", value: report.revenue, color: "#22d3ee" },
              { label: "Fuel", value: report.fuelExpense, color: "#60a5fa" },
              { label: "Toll", value: report.tollExpense, color: "#f59e0b" },
              { label: "Maintenance", value: report.maintenanceExpense, color: "#a78bfa" },
              { label: "Profit", value: Math.max(report.profit, 0), color: "#14b8a6" },
            ]}
            formatter={formatMoney}
          />
        </Panel>
      </div>
      <Panel title="Trips For Selected Truck" icon={ClipboardList}>
        <DataTable
          columns={["Trip", "Route", "Start", "End", "Load", "KM", "Price", "Expense", "Profit", "Status"]}
          rows={tripRows}
        />
      </Panel>
      {activeTrip && <TripDetailLedger trip={activeTrip} onRefresh={onRefresh} />}
      <div className="split-grid">
        <Panel title="Maintenance Linked To Truck" icon={Wrench}>
          <DataTable
            columns={["Task", "Date", "Cost", "Parts", "Mechanic", "Health"]}
            rows={report.maintenance.map((item) => [item.task, item.date, item.cost, item.parts, item.mechanic, item.health])}
          />
        </Panel>
        <Panel title="Parts And Toll Details" icon={ShieldCheck}>
          <DataTable
            columns={["Type", "Name", "Amount / Stock", "Status"]}
            rows={[
              ...report.tolls.map((toll) => ["Toll", toll.plaza, toll.amount, toll.tag]),
              ...report.parts.map((part) => ["Part", part.name, `${part.stock} in stock`, part.status]),
            ]}
          />
        </Panel>
      </div>
    </Page>
  );
}

function TripDetailLedger({ trip, onRefresh }) {
  const timeline = buildMoneyTimeline(trip);
  return (
    <div className="trip-detail">
      <Panel title="Trip Financial Summary" icon={BadgeIndianRupee}>
        <div className="trip-summary">
          <Stat label="Freight Income" value={formatMoney(trip.totalFreight)} />
          <Stat label="Received" value={formatMoney(trip.received)} />
          <Stat label="Pending" value={formatMoney(trip.pending)} />
          <Stat label="Expenses" value={formatMoney(trip.totalExpenses)} />
          <Stat label="Profit" value={formatMoney(trip.profit)} tone={trip.profit >= 0 ? "good" : "bad"} />
          <Stat label="Margin" value={`${Number(trip.profitMargin || 0).toFixed(2)}%`} />
          <Stat label="Distance" value={`${Number(trip.distance || 0).toLocaleString("en-IN")} km`} />
          <Stat label="Profit/KM" value={formatMoney(trip.profitPerKm)} />
        </div>
      </Panel>
      <div className="split-grid">
        <Panel title="Trip Income Loads" icon={PackageCheck}>
          <LedgerForm
            endpoint="tripLoads"
            tripId={trip.id}
            fields={[
              ["source", "From", trip.origin],
              ["destination", "To", trip.destination],
              ["party", "Party", "ABC Logistics"],
              ["description", "Load details", "Goods / material"],
              ["freightAmount", "Freight", "30000"],
              ["receivedAmount", "Received", "0"],
              ["invoiceNumber", "Invoice", ""],
              ["lrNumber", "LR / Challan", ""],
            ]}
            onSaved={onRefresh}
          />
          <DataTable
            columns={["From", "To", "Party", "Freight", "Received", "Pending", "Invoice", "LR", "POD"]}
            rows={(trip.loads || []).map((load) => [load.source, load.destination, load.party, formatMoney(load.freightAmount), formatMoney(load.receivedAmount), formatMoney(load.pendingAmount), load.invoiceNumber || "-", load.lrNumber || "-", load.podStatus || "-"])}
          />
        </Panel>
        <Panel title="Trip Expenses" icon={ClipboardList}>
          <LedgerForm
            endpoint="tripExpenses"
            tripId={trip.id}
            fields={[
              ["description", "Description", "Diesel / toll / repair"],
              ["amount", "Amount", "500"],
              ["category", "Category optional", ""],
              ["paidBy", "Paid by", "Driver"],
              ["paymentMethod", "Method", "Cash"],
              ["notes", "Notes", ""],
            ]}
            onSaved={onRefresh}
          />
          <DataTable
            columns={["Date", "Description", "Amount", "Paid By", "Method", "Notes"]}
            rows={(trip.expenses || []).map((expense) => [expense.expenseDate, expense.description, formatMoney(expense.amount), expense.paidBy || "-", expense.paymentMethod || "-", expense.notes || "-"])}
          />
        </Panel>
      </div>
      <div className="split-grid">
        <Panel title="Payments / Receipts" icon={IndianRupee}>
          <LedgerForm
            endpoint="tripPayments"
            tripId={trip.id}
            fields={[
              ["party", "Party", "ABC Logistics"],
              ["amount", "Amount", "10000"],
              ["mode", "Mode", "UPI / Bank / Cash"],
              ["referenceNumber", "Reference", ""],
              ["notes", "Notes", ""],
            ]}
            onSaved={onRefresh}
          />
          <DataTable
            columns={["Date", "Party", "Amount", "Mode", "Reference", "Notes"]}
            rows={(trip.payments || []).map((payment) => [payment.paymentDate, payment.party || "-", formatMoney(payment.amount), payment.mode || "-", payment.referenceNumber || "-", payment.notes || "-"])}
          />
        </Panel>
        <Panel title="Running Money Timeline" icon={Route}>
          <div className="timeline-list">
            {timeline.map((item) => (
              <div className={item.type === "income" ? "timeline-item income" : "timeline-item expense"} key={item.id}>
                <span>{item.date || "-"}</span>
                <strong>{item.label}</strong>
                <b>{item.type === "income" ? "+" : "-"} {formatMoney(item.amount)}</b>
                <small>Balance: {formatMoney(item.balance)}</small>
              </div>
            ))}
          </div>
        </Panel>
      </div>
      <Panel title="Important Trip Notes" icon={ClipboardList}>
        <LedgerForm
          endpoint="tripNotes"
          tripId={trip.id}
          fields={[["note", "Trip notepad", "Driver said clutch noise...\nPending POD...\nPayment reminder..."]]}
          multiline
          onSaved={onRefresh}
        />
        <div className="note-list">
          {(trip.notes || []).map((note) => (
            <article className="note-item" key={note.id}>
              <div><strong>{note.noteDate}</strong><span>Trip note</span></div>
              <p>{note.note}</p>
            </article>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function LedgerForm({ endpoint, tripId, fields, multiline = false, onSaved }) {
  const [form, setForm] = useState(Object.fromEntries(fields.map(([key]) => [key, ""])));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const session = JSON.parse(localStorage.getItem("fleetops-session") || "{}");
      const response = await fetch(`/api/${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session.token ? { Authorization: `Bearer ${session.token}` } : {}),
        },
        body: JSON.stringify({ ...form, tripId }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Could not save entry");
      setForm(Object.fromEntries(fields.map(([key]) => [key, ""])));
      onSaved?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="ledger-form" onSubmit={save}>
      {fields.map(([key, label, placeholder]) => (
        <label key={key} className={multiline ? "note-field" : ""}>
          {label}
          {multiline ? (
            <textarea value={form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} placeholder={placeholder} rows={5} />
          ) : (
            <input value={form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} placeholder={placeholder} />
          )}
        </label>
      ))}
      <button className="primary-action" disabled={saving}><Sparkles size={18} /> {saving ? "Saving..." : "Add"}</button>
      {error && <p className="form-error">{error}</p>}
    </form>
  );
}

function buildMoneyTimeline(trip) {
  const rows = [
    ...(trip.loads || []).map((load) => ({
      id: `load-${load.id}`,
      date: load.loadingDate,
      label: `${load.party || "Load"} freight`,
      amount: Number(load.freightAmount || 0),
      type: "income",
    })),
    ...(trip.expenses || []).map((expense) => ({
      id: `expense-${expense.id}`,
      date: expense.expenseDate,
      label: expense.description,
      amount: Number(expense.amount || 0),
      type: "expense",
    })),
  ].sort((a, b) => String(a.date || "").localeCompare(String(b.date || "")));

  let balance = 0;
  return rows.map((row) => {
    balance += row.type === "income" ? row.amount : -row.amount;
    return { ...row, balance };
  });
}

function DriversPage({ drivers, onNewEntry }) {
  return (
    <Page title="Driver Management" kicker="People" onNewEntry={onNewEntry}>
      <div className="card-grid">
        {drivers.map((driver) => (
          <article className="profile-card" key={driver.id}>
            <div className="avatar">{driver.name.slice(0, 1)}</div>
            <strong>{driver.name}</strong>
            <span>{driver.route}</span>
            <div className="profile-stats">
              <b>{driver.score}</b>
              <small>Safety score</small>
              <b>{driver.hours}</b>
              <small>Drive hours</small>
            </div>
          </article>
        ))}
      </div>
    </Page>
  );
}

function VehiclesPage({ data, onNewEntry }) {
  const vehicles = data.vehicles || [];
  const reports = data.truckReports || [];
  const trips = data.trips || [];
  const maintenance = data.maintenance || [];
  const [selectedVehicle, setSelectedVehicle] = useState(vehicles[0]?.number || "");
  const selected = vehicles.find((vehicle) => vehicle.number === selectedVehicle) || vehicles[0];
  const tripReport = buildTripReport(data, selected?.number);
  const report = reports.find((item) => item.vehicle === selected?.number) || {
    trips: tripReport.trips.length,
    revenue: tripReport.revenue,
    expense: tripReport.totalExpense,
    profit: tripReport.profit,
    utilization: tripReport.trips.length ? Math.min(100, 68 + tripReport.trips.length * 7) : 0,
  };
  const history = maintenance.filter((item) => item.vehicle === selected?.number);

  return (
    <Page title="Vehicle Management" kicker="Fleet" onNewEntry={onNewEntry}>
      <div className="split-grid">
        <Panel title="Truck Registry" icon={Truck}>
          <DataTable
            columns={["Vehicle", "Model", "Driver", "Status", "Odometer", "Permit"]}
            rows={vehicles.map((vehicle) => [
              vehicle.number,
              vehicle.model,
              vehicle.driver,
              vehicle.status,
              vehicle.odometer,
              vehicle.permit,
            ])}
          />
        </Panel>
        <Panel title="Report Of Every Truck" icon={ClipboardList}>
          <label>
            Select truck
            <select value={selected?.number || ""} onChange={(event) => setSelectedVehicle(event.target.value)}>
              {vehicles.map((vehicle) => <option key={vehicle.id}>{vehicle.number}</option>)}
            </select>
          </label>
          {selected && (
            <div className="report-card">
              <h3>{selected.number}</h3>
              <span>{selected.model} - {selected.driver}</span>
              <div className="calculation-grid">
                <Stat label="Trips" value={report?.trips || 0} />
                <Stat label="Revenue" value={formatMoney(report?.revenue || 0)} />
                <Stat label="Expense" value={formatMoney(report?.expense || 0)} />
                <Stat label="Profit" value={formatMoney(report?.profit || 0)} tone="good" />
                <Stat label="Utilization" value={`${report?.utilization || 0}%`} />
                <Stat label="Services" value={history.length} />
              </div>
              <DataTable
                columns={["Trip", "Route", "Price", "Expense", "Profit", "Status"]}
                rows={tripReport.trips.map((trip) => [
                  trip.tripNo,
                  `${trip.origin} to ${trip.destination}`,
                  formatMoney(trip.freightPrice),
                  formatMoney(trip.totalExpense),
                  formatMoney(trip.profit),
                  trip.status,
                ])}
              />
            </div>
          )}
        </Panel>
      </div>
    </Page>
  );
}

function MaintenancePage({ data, onNewEntry, onRefresh }) {
  const maintenance = data.maintenance || [];
  const parts = data.parts || [];
  return (
    <Page title="Vehicle Maintenance" kicker="History" onNewEntry={onNewEntry}>
      <NotebookSection
        title="Maintenance Notes"
        icon={Wrench}
        collection="maintenanceNotes"
        notes={data.maintenanceNotes || []}
        textareaLabel="Maintenance Notes"
        totalLabel="Total Maintenance Cost"
        placeholder={"Work completed\nPending repairs\nParts replaced\nService notes"}
        onSaved={onRefresh}
      />
      <div className="split-grid">
        <Panel title="Service History With Parts" icon={CalendarClock}>
          <DataTable
            columns={["Vehicle", "Task", "Date", "Cost", "Parts", "Mechanic", "Health"]}
            rows={maintenance.map((item) => [item.vehicle, item.task, item.date, item.cost, item.parts, item.mechanic, item.health])}
          />
        </Panel>
        <Panel title="Parts Inventory" icon={Wrench}>
          <DataTable
            columns={["Vehicle", "Part", "Stock", "Unit Cost", "Status"]}
            rows={parts.map((part) => [part.vehicle, part.name, part.stock, formatMoney(part.unitCost), part.status])}
          />
        </Panel>
      </div>
    </Page>
  );
}

function TollsPage({ tolls, routes, onNewEntry }) {
  const routeTotals = routes.map((route) => {
    const routeTolls = tolls.filter((toll) => toll.routeId === route.id);
    return {
      route: `${route.from} to ${route.to}`,
      total: routeTolls.reduce((sum, toll) => sum + Number(toll.amountValue || 0), 0),
    };
  });
  return (
    <Page title="Toll Management" kicker="FASTag" onNewEntry={onNewEntry}>
      <div className="split-grid">
        <Panel title="Toll Reconciliation" icon={ShieldCheck}>
          <DataTable
            columns={["Route", "Plaza", "Vehicle", "Amount", "Status"]}
            rows={tolls.map((toll) => [
              routes.find((route) => route.id === toll.routeId)?.from || "-",
              toll.plaza,
              toll.vehicle,
              toll.amount,
              toll.tag,
            ])}
          />
        </Panel>
        <Panel title="Route Toll Output Graph" icon={BarChart3}>
          <VerticalBars rows={routeTotals.map((item) => ({ label: item.route, value: item.total, color: "#d97706" }))} formatter={formatMoney} />
        </Panel>
      </div>
    </Page>
  );
}

function TyresPage({ tyres, onNewEntry }) {
  return (
    <Page title="Tyre Tracking & Rotation" kicker="Safety" onNewEntry={onNewEntry}>
      <div className="split-grid">
        <Panel title="Tyre Map" icon={Gauge}>
          <div className="tyre-layout">
            <div className="axle"><span /><span /></div>
            <div className="axle rear"><span /><span /></div>
          </div>
        </Panel>
        <Panel title="Rotation Register" icon={ClipboardList}>
          <DataTable
            columns={["Position", "Tyre", "Tread", "Rotation"]}
            rows={tyres.map((tyre) => [tyre.position, tyre.tyre, tyre.tread, tyre.rotation])}
          />
        </Panel>
      </div>
    </Page>
  );
}

function FinancePage({ data, onNewEntry, onRefresh }) {
  const revenueTotal = sumBy(data.truckReports, "revenue");
  const truckExpenseTotal = sumBy(data.truckReports, "expense");
  const generalExpenseTotal = [
    ...(data.expenseNotes || []).filter((note) => !note.vehicle).map((note) => Number(note.amount || 0)),
    ...(data.maintenanceNotes || []).filter((note) => !note.vehicle).map((note) => Number(note.totalCost || 0)),
  ].reduce((sum, value) => sum + value, 0);
  const expenseTotal = truckExpenseTotal + generalExpenseTotal;
  const monthlyRows = [
    { label: "Revenue", value: revenueTotal, color: "#0f9f8f" },
    { label: "Expense", value: expenseTotal, color: "#dc2626" },
    { label: "Profit", value: revenueTotal - expenseTotal, color: "#2563eb" },
  ];
  return (
    <Page title="Expense & Profit Analysis" kicker="Finance" onNewEntry={onNewEntry}>
      <NotebookSection
        title="Expense Notes"
        icon={ClipboardList}
        collection="expenseNotes"
        notes={data.expenseNotes || []}
        textareaLabel="Expense Details"
        totalLabel="Total Expense"
        placeholder={"Write any expense details here\nOne item per line\nAdd reminders or pending work"}
        onSaved={onRefresh}
      />
      <div className="finance-grid">
        <article className="finance-card"><IndianRupee size={22} /><span>Revenue</span><strong>{data.financialSummary.projectedRevenue}</strong></article>
        <article className="finance-card"><Fuel size={22} /><span>Fuel Expense</span><strong>{data.financialSummary.fuelExpense}</strong></article>
        <article className="finance-card"><BarChart3 size={22} /><span>Net Profit</span><strong>{data.financialSummary.netProfit}</strong></article>
      </div>
      <Panel title="Cost Breakdown" icon={BarChart3}>
        <div className="bar-chart">
          {data.financeBars.map((bar) => (
            <div className="bar-row" key={bar.id}>
              <span>{bar.label}</span>
              <div><motion.i initial={{ width: 0 }} animate={{ width: `${bar.value}%` }} style={{ background: bar.color }} /></div>
              <b>{bar.value}%</b>
            </div>
          ))}
        </div>
      </Panel>
      <Panel title="Profit And Loss Output" icon={IndianRupee}>
        <VerticalBars rows={monthlyRows} formatter={formatMoney} />
      </Panel>
      <Panel title="Truck Wise Profitability" icon={Truck}>
        <DataTable
          columns={["Truck", "Trips", "Revenue", "Expense", "Profit", "Utilization"]}
          rows={data.truckReports.map((report) => [
            report.vehicle,
            report.trips,
            formatMoney(report.revenue),
            formatMoney(report.expense),
            formatMoney(report.profit),
            `${report.utilization}%`,
          ])}
        />
      </Panel>
    </Page>
  );
}

function SettingsPage({ onNewEntry }) {
  return (
    <Page title="System Settings" kicker="Admin" onNewEntry={onNewEntry}>
      <div className="split-grid">
        <Panel title="Company Profile" icon={Settings}>
          <div className="form-grid">
            <label>Company name<input defaultValue="FleetOps Logistics" /></label>
            <label>Primary hub<input defaultValue="Delhi NCR" /></label>
            <label>Currency<input defaultValue="INR" /></label>
            <label>Timezone<input defaultValue="Asia/Kolkata" /></label>
            <button className="primary-action"><CheckCircle2 size={18} /> Save Settings</button>
          </div>
        </Panel>
        <Panel title="Database" icon={ShieldCheck}>
          <div className="database-box">
            <strong>Neon Postgres ready</strong>
            <span>Add `DATABASE_URL` in `backend/.env` and run the SQL schema in `backend/neon/schema.sql`.</span>
          </div>
        </Panel>
      </div>
    </Page>
  );
}

function Page({ title, kicker, children, onNewEntry }) {
  return (
    <section className="page">
      <div className="page-head">
        <div>
          <p>{kicker}</p>
          <h1>{title}</h1>
        </div>
        {onNewEntry && <button className="primary-action" onClick={onNewEntry}><Sparkles size={18} /> New Entry</button>}
      </div>
      {children}
    </section>
  );
}

function Panel({ title, icon: Icon, children }) {
  return (
    <article className="panel">
      <div className="panel-title">
        <Icon size={20} />
        <h2>{title}</h2>
      </div>
      {children}
    </article>
  );
}

function RouteList({ routes }) {
  return (
    <div className="route-list">
      {routes.map((route) => (
        <motion.div className="route-item" key={route.id} whileHover={{ x: 5 }}>
          <div>
            <MapPin size={16} />
            <strong>{route.from}</strong>
            <ArrowRight size={15} />
            <strong>{route.to}</strong>
          </div>
          <section>
            <span>{route.km}</span>
            <span>{route.eta}</span>
            <span>{route.status}</span>
          </section>
          <small>{route.saving}</small>
        </motion.div>
      ))}
    </div>
  );
}

function RouteMotionMap({ routes, selectedRoute }) {
  return (
    <div className="route-motion-map">
      <div className="route-grid-lines" />
      {routes.slice(0, 3).map((route, index) => (
        <div className={`route-node node-${index + 1}`} key={route.id}>
          <span>{route.from}</span>
        </div>
      ))}
      <div className="route-node node-4">
        <span>{selectedRoute?.to || "Destination"}</span>
      </div>
      <motion.div
        className="route-glow-line"
        animate={{ opacity: [0.45, 1, 0.45] }}
        transition={{ duration: 2.4, repeat: Infinity }}
      />
      <motion.div
        className="animated-truck"
        animate={{ x: [0, 92, 190, 285], y: [0, -28, 18, -6], rotate: [0, -8, 10, 0] }}
        transition={{ duration: 6.5, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
      >
        <Truck size={30} />
      </motion.div>
      <div className="map-summary">
        <strong>{selectedRoute?.from || "Origin"} to {selectedRoute?.to || "Destination"}</strong>
        <span>{selectedRoute?.km || "-"} - {selectedRoute?.eta || "-"}</span>
      </div>
    </div>
  );
}

function DataTable({ columns, rows }) {
  return (
    <div className="data-table">
      <div className="data-row head" style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(120px, 1fr))` }}>
        {columns.map((column) => <strong key={column}>{column}</strong>)}
      </div>
      {rows.map((row, index) => (
        <div className="data-row" key={index} style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(120px, 1fr))` }}>
          {row.map((cell, cellIndex) => <span key={`${index}-${cellIndex}`}>{cell}</span>)}
        </div>
      ))}
    </div>
  );
}

function Stat({ label, value, tone = "" }) {
  return (
    <div className={`stat ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function VerticalBars({ rows, formatter = (value) => value }) {
  const max = Math.max(...rows.map((row) => Number(row.value) || 0), 1);
  return (
    <div className="vertical-bars">
      {rows.map((row) => (
        <div className="vertical-bar" key={row.label}>
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: `${Math.max(8, (Number(row.value) / max) * 100)}%` }}
            transition={{ duration: 0.6 }}
            style={{ background: row.color }}
          />
          <strong>{formatter(row.value)}</strong>
          <span>{row.label}</span>
        </div>
      ))}
    </div>
  );
}

function sumBy(rows, key) {
  return rows.reduce((sum, row) => sum + Number(row[key] || 0), 0);
}

function formatMoney(value) {
  return `Rs.${Number(value || 0).toLocaleString("en-IN")}`;
}

function getLocalExpenseNotes() {
  try {
    return JSON.parse(localStorage.getItem("fleetops-local-expense-notes") || "[]");
  } catch {
    return [];
  }
}

function normalizeRouteKey(origin, destination) {
  const from = String(origin || "").trim().toLowerCase();
  const to = String(destination || "").trim().toLowerCase();
  return `${from}-${to}`;
}

function estimateRoute({ origin, destination, vehicleType = "Truck", loadWeight = 18, fuelRate = 96 }) {
  const routeProfiles = {
    "delhi-mumbai": { label: "Delhi → Mumbai", distance: 1418, tollBase: 1850, tollPerKm: 1.24, fuelEfficiency: 8.7, etaHours: 28, baseRevenue: 560000 },
    "delhi-kolkata": { label: "Delhi → Kolkata", distance: 1580, tollBase: 2200, tollPerKm: 1.35, fuelEfficiency: 8.3, etaHours: 32, baseRevenue: 610000 },
    "mumbai-pune": { label: "Mumbai → Pune", distance: 155, tollBase: 420, tollPerKm: 1.05, fuelEfficiency: 9.5, etaHours: 3, baseRevenue: 125000 },
    "pune-bengaluru": { label: "Pune → Bengaluru", distance: 840, tollBase: 1120, tollPerKm: 1.1, fuelEfficiency: 8.8, etaHours: 14, baseRevenue: 310000 },
    "bengaluru-chennai": { label: "Bengaluru → Chennai", distance: 350, tollBase: 600, tollPerKm: 1.0, fuelEfficiency: 9.2, etaHours: 6, baseRevenue: 150000 },
    "mumbai-delhi": { label: "Mumbai → Delhi", distance: 1418, tollBase: 1800, tollPerKm: 1.2, fuelEfficiency: 8.8, etaHours: 29, baseRevenue: 575000 },
    "kolkata-delhi": { label: "Kolkata → Delhi", distance: 1580, tollBase: 2150, tollPerKm: 1.32, fuelEfficiency: 8.4, etaHours: 31, baseRevenue: 602000 },
  };

  const profile = routeProfiles[normalizeRouteKey(origin, destination)] || routeProfiles["delhi-mumbai"];
  const distance = Math.max(profile.distance + (Number(loadWeight || 18) > 22 ? 45 : 0), 100);
  const fuelEfficiency = profile.fuelEfficiency - (vehicleType.toLowerCase().includes("reefer") ? 0.5 : 0);
  const fuelLiters = distance / fuelEfficiency;
  const fuelCost = fuelLiters * Number(fuelRate || 96);
  const tollEstimate = Math.round(profile.tollBase + distance * profile.tollPerKm + (vehicleType.toLowerCase().includes("reefer") ? 1200 : 0));
  const driverAllowance = 18000 + Math.max(0, Number(loadWeight || 18) - 16) * 1200;
  const otherExpense = 8000 + (profile.distance > 1200 ? 6000 : 3000);
  const revenue = Math.max(profile.baseRevenue + (Number(loadWeight || 18) - 18) * 20000, 90000);
  const totalExpense = fuelCost + tollEstimate + driverAllowance + otherExpense;
  const profit = revenue - totalExpense;

  return {
    label: profile.label,
    distance,
    eta: `${Math.max(3, Math.round(profile.etaHours + (loadWeight > 20 ? 2 : 0)))}h`,
    tollEstimate,
    fuelLiters,
    fuelCost,
    driverAllowance,
    otherExpense,
    revenue,
    totalExpense,
    profit,
  };
}

function buildVehicleTracker(vehicles, routes) {
  return vehicles.map((vehicle, index) => {
    const route = routes[index % Math.max(routes.length, 1)] || null;
    const progress = 18 + (index * 17) % 74;
    const location = route ? `${route.from} → ${route.to}` : "At depot";
    const status = String(vehicle.status || "En route").trim();
    return { ...vehicle, location, progress, status, route };
  });
}

function findTruckByQuery(data, query) {
  const term = String(query || "").trim().toLowerCase();
  if (term.length < 2) return null;
  return (data.vehicles || []).find((vehicle) => {
    const haystack = [vehicle.number, vehicle.model, vehicle.driver].join(" ").toLowerCase();
    return haystack.includes(term);
  }) || null;
}

function parseMoney(value) {
  return Number(String(value || "0").replace(/[^0-9.-]/g, "")) || 0;
}

function buildTripReport(data, vehicleNumber = "") {
  const vehicle = String(vehicleNumber || "");
  const trips = (data.trips || []).filter((trip) => trip.vehicle === vehicle);
  const maintenance = (data.maintenance || []).filter((item) => item.vehicle === vehicle);
  const tolls = (data.tolls || []).filter((toll) => toll.vehicle === vehicle);
  const parts = (data.parts || []).filter((part) => part.vehicle === vehicle);
  const expenseNotes = (data.expenseNotes || []).filter((note) => note.vehicle === vehicle);
  const noteExpense = expenseNotes.reduce((sum, note) => sum + Number(note.amount || 0), 0);
  const maintenanceNotes = (data.maintenanceNotes || []).filter((note) => note.vehicle === vehicle);
  const maintenanceNoteExpense = maintenanceNotes.reduce((sum, note) => sum + Number(note.totalCost || 0), 0);
  const revenue = trips.reduce((sum, trip) => sum + Number(trip.freightPrice || 0), 0);
  const fuelExpense = trips.reduce((sum, trip) => sum + Number(trip.fuelExpense || 0), 0);
  const tollExpense = trips.reduce((sum, trip) => sum + Number(trip.tollExpense || 0), 0) || tolls.reduce((sum, toll) => sum + Number(toll.amountValue || 0), 0);
  const driverAllowance = trips.reduce((sum, trip) => sum + Number(trip.driverAllowance || 0), 0);
  const maintenanceExpense = trips.reduce((sum, trip) => sum + Number(trip.maintenanceExpense || 0), 0) || maintenance.reduce((sum, item) => sum + parseMoney(item.cost), 0);
  const otherExpense = trips.reduce((sum, trip) => sum + Number(trip.otherExpense || 0), 0);
  const baseExpense = trips.reduce((sum, trip) => sum + Number(trip.totalExpense || 0), 0) || fuelExpense + tollExpense + driverAllowance + maintenanceExpense + otherExpense;
  const totalExpense = baseExpense + noteExpense + maintenanceNoteExpense;
  const profit = revenue - totalExpense;
  const km = trips.reduce((sum, trip) => sum + parseMoney(trip.km), 0);

  return {
    vehicle,
    trips,
    maintenance,
    tolls,
    parts,
    expenseNotes,
    maintenanceNotes,
    noteExpense,
    maintenanceNoteExpense,
    revenue,
    fuelExpense,
    tollExpense,
    driverAllowance,
    maintenanceExpense,
    otherExpense,
    totalExpense,
    profit,
    km,
  };
}

function TripSummary({ report }) {
  return (
    <div className="trip-summary">
      <Stat label="Trips" value={report.trips.length} />
      <Stat label="Total KM" value={report.km.toLocaleString("en-IN")} />
      <Stat label="Price" value={formatMoney(report.revenue)} />
      <Stat label="Fuel" value={formatMoney(report.fuelExpense)} />
      <Stat label="Tolls" value={formatMoney(report.tollExpense)} />
      <Stat label="Maintenance" value={formatMoney(report.maintenanceExpense)} />
      <Stat label="Small Notes" value={formatMoney(report.noteExpense)} />
      <Stat label="Expense" value={formatMoney(report.totalExpense)} />
      <Stat label="Profit" value={formatMoney(report.profit)} tone={report.profit >= 0 ? "good" : "bad"} />
    </div>
  );
}

function NotebookSection({ title, icon, collection, notes, textareaLabel, totalLabel, placeholder, onSaved }) {
  const endpoint = collection === "expenseNotes" ? "expense-notes" : "maintenance-notes";
  const emptyForm = {
    id: "",
    vehicle: "",
    text: "",
    total: "",
    noteDate: new Date().toISOString().slice(0, 10),
  };
  const [form, setForm] = useState({
    ...emptyForm,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const rows = notes.map((item) => ({
    id: item.id,
    vehicle: item.vehicle || "",
    noteDate: item.noteDate,
    text: collection === "expenseNotes" ? item.note : item.notes,
    total: collection === "expenseNotes" ? item.amount : item.totalCost,
  }));

  async function saveNote(event) {
    event.preventDefault();
    if (!form.text.trim()) {
      setError("Write notes first.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const session = JSON.parse(localStorage.getItem("fleetops-session") || "{}");
      const payload = collection === "expenseNotes"
        ? { vehicle: form.vehicle, noteDate: form.noteDate, category: "Expense Details", amount: form.total, note: form.text }
        : { vehicle: form.vehicle, noteDate: form.noteDate, totalCost: form.total, notes: form.text };
      const response = await fetch(`/api/${endpoint}${form.id ? `/${form.id}` : ""}`, {
        method: form.id ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session.token ? { Authorization: `Bearer ${session.token}` } : {}),
        },
        body: JSON.stringify(payload),
      });
      const responsePayload = await response.json();
      if (!response.ok) throw new Error(responsePayload.error || "Could not save note");
      setForm({ ...emptyForm });
      onSaved?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteNote(id) {
    setError("");
    try {
      const session = JSON.parse(localStorage.getItem("fleetops-session") || "{}");
      const response = await fetch(`/api/${endpoint}/${id}`, {
        method: "DELETE",
        headers: session.token ? { Authorization: `Bearer ${session.token}` } : {},
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Could not delete note");
      onSaved?.();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <Panel title={title} icon={icon}>
      <form className="notebook-editor" onSubmit={saveNote}>
        <label className="note-field">
          {textareaLabel}
          <textarea value={form.text} onChange={(event) => setForm({ ...form, text: event.target.value })} placeholder={placeholder} rows={7} />
        </label>
        <label>Vehicle / Truck<input value={form.vehicle} onChange={(event) => setForm({ ...form, vehicle: event.target.value })} placeholder="Optional truck number" /></label>
        <label>Date<input type="date" value={form.noteDate} onChange={(event) => setForm({ ...form, noteDate: event.target.value })} /></label>
        <label>{totalLabel}<input value={form.total} onChange={(event) => setForm({ ...form, total: event.target.value })} placeholder="0" /></label>
        <button className="primary-action" disabled={saving}><Sparkles size={18} /> {saving ? "Saving..." : form.id ? "Update Note" : "Save Note"}</button>
        {form.id && <button className="secondary-action" type="button" onClick={() => setForm({ ...emptyForm })}>Cancel Edit</button>}
      </form>
      {error && <p className="form-error">{error}</p>}
      <div className="note-list">
        {rows.length ? rows.map((note) => (
          <article className="note-item" key={note.id}>
            <div>
              <strong>{formatMoney(note.total)}</strong>
              <span>{note.vehicle || "General"} - {note.noteDate}</span>
            </div>
            <p>{note.text}</p>
            <div className="note-actions">
              <button type="button" onClick={() => setForm({ id: note.id, vehicle: note.vehicle, text: note.text, total: note.total, noteDate: note.noteDate })}>Edit</button>
              <button type="button" onClick={() => deleteNote(note.id)}>Delete</button>
            </div>
          </article>
        )) : <p className="empty-state">No notes yet.</p>}
      </div>
    </Panel>
  );
}

function TruckTripSearchReport({ data, vehicleNumber }) {
  const report = buildTripReport(data, vehicleNumber);
  return (
    <Panel title={`Search Result: ${vehicleNumber}`} icon={Search}>
      <div className="search-result-banner">
        <div>
          <strong>{report.vehicle}</strong>
          <span>{report.trips.length} trips, {report.maintenance.length} maintenance records, {report.tolls.length} toll entries</span>
        </div>
        <TripSummary report={report} />
      </div>
      <DataTable
        columns={["Trip", "Route", "Price", "Expense", "Profit", "Status"]}
        rows={report.trips.map((trip) => [
          trip.tripNo,
          `${trip.origin} to ${trip.destination}`,
          formatMoney(trip.freightPrice),
          formatMoney(trip.totalExpense),
          formatMoney(trip.profit),
          trip.status,
        ])}
      />
    </Panel>
  );
}

function CompactRows({ rows, primary, secondary, meta, value }) {
  return (
    <div className="compact-list">
      {rows.map((row) => (
        <div className="compact-row" key={row.id}>
          <div>
            <strong>{row[primary]}</strong>
            <span>{row[secondary]}</span>
          </div>
          <small>{row[meta]}</small>
          <b>{row[value]}</b>
        </div>
      ))}
    </div>
  );
}

const entryConfigs = {
  dashboard: {
    collection: "vehicles",
    title: "Add Truck",
    fields: [
      ["number", "Truck number", "RJ 14 GT 2291"],
      ["model", "Model", "Tata Signa 5530"],
      ["driver", "Driver", "Driver name"],
      ["status", "Status", "Available"],
      ["odometer", "Odometer", "0 km"],
      ["permit", "Permit", "Valid"],
    ],
  },
  vehicles: {
    collection: "vehicles",
    title: "Add Truck",
    fields: [
      ["number", "Truck number", "RJ 14 GT 2291"],
      ["model", "Model", "Tata Signa 5530"],
      ["driver", "Driver", "Driver name"],
      ["status", "Status", "Available"],
      ["odometer", "Odometer", "0 km"],
      ["permit", "Permit", "Valid"],
    ],
  },
  drivers: {
    collection: "drivers",
    title: "Add Driver",
    fields: [
      ["name", "Driver name", "Ramesh Yadav"],
      ["score", "Safety score", "90"],
      ["hours", "Drive hours", "0h"],
      ["route", "Assigned route", "Delhi - Mumbai"],
    ],
  },
  routes: {
    collection: "routes",
    title: "Add Route",
    fields: [
      ["from", "Origin", "Delhi"],
      ["to", "Destination", "Mumbai"],
      ["km", "Distance", "1,418 km"],
      ["eta", "ETA", "26h"],
      ["saving", "Optimization note", "Best fuel/toll route"],
      ["status", "Status", "Planned"],
      ["tollTotal", "Toll total", "0"],
      ["fuelLiters", "Fuel liters", "0"],
      ["freightRevenue", "Freight revenue", "0"],
      ["driverAllowance", "Driver allowance", "0"],
      ["otherExpense", "Other expense", "0"],
    ],
  },
  loads: {
    collection: "loads",
    title: "Add Load",
    fields: [
      ["id", "Load ID", "LD-1001"],
      ["item", "Cargo", "FMCG pallets"],
      ["truck", "Truck", "RJ 14 GT 2291"],
      ["weight", "Weight", "18 T"],
      ["margin", "Margin", "25%"],
      ["state", "State", "Assigned"],
    ],
  },
  trips: {
    collection: "trips",
    title: "Add Trip",
    fields: [
      ["tripNo", "Trip number", "TRP-1001"],
      ["vehicle", "Truck number", "RJ 14 GT 2291"],
      ["driver", "Driver", "Driver name"],
      ["origin", "Origin", "Delhi"],
      ["destination", "Destination", "Mumbai"],
      ["startDate", "Start date", "2026-07-31"],
      ["endDate", "End date", "2026-08-01"],
      ["load", "Load", "FMCG pallets"],
      ["km", "Distance", "1418"],
      ["freightPrice", "Freight price", "128000"],
      ["fuelExpense", "Fuel expense", "38880"],
      ["tollExpense", "Toll expense", "7420"],
      ["driverAllowance", "Driver allowance", "6200"],
      ["maintenanceExpense", "Maintenance expense", "0"],
      ["otherExpense", "Other expense", "9400"],
      ["status", "Status", "Completed"],
    ],
  },
  maintenance: {
    collection: "maintenance",
    title: "Add Maintenance",
    fields: [
      ["vehicle", "Vehicle", "RJ 14 GT 2291"],
      ["task", "Task", "Oil service"],
      ["date", "Date", "Today"],
      ["cost", "Cost", "Rs.0"],
      ["health", "Health", "Scheduled"],
      ["parts", "Parts", "Oil filter"],
      ["mechanic", "Mechanic", "Workshop name"],
    ],
  },
  tolls: {
    collection: "tolls",
    title: "Add Toll",
    fields: [
      ["routeId", "Route ID", "route-1"],
      ["plaza", "Plaza", "Kishangarh"],
      ["vehicle", "Vehicle", "RJ 14 GT 2291"],
      ["amount", "Amount label", "Rs.500"],
      ["amountValue", "Amount value", "500"],
      ["tag", "Status", "FASTag synced"],
    ],
  },
  tyres: {
    collection: "tyres",
    title: "Add Tyre",
    fields: [
      ["position", "Position", "Front Left"],
      ["tyre", "Tyre ID", "TY-1001"],
      ["tread", "Tread", "80%"],
      ["rotation", "Rotation", "Healthy"],
    ],
  },
  finance: {
    collection: "expenses",
    title: "Add Expense",
    fields: [
      ["type", "Expense type", "Fuel"],
      ["amount", "Amount", "Rs.0"],
      ["period", "Period", "July"],
      ["trend", "Trend", "+0%"],
    ],
  },
};

function NewEntryModal({ page, open, onClose, onSaved }) {
  const config = entryConfigs[page] || entryConfigs.dashboard;
  const [form, setForm] = useState({});
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(Object.fromEntries(config.fields.map(([key]) => [key, ""])));
    setError("");
  }, [config.title, open]);

  if (!open) return null;

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const session = JSON.parse(localStorage.getItem("fleetops-session") || "{}");
      const payload = { ...form };
      if (config.collection === "routes") {
        const estimate = estimateRoute({
          origin: payload.from || payload.origin || "",
          destination: payload.to || payload.destination || "",
          vehicleType: payload.vehicleType || "Truck",
          loadWeight: Number(payload.weight || payload.loadWeight || 18),
          fuelRate: Number(payload.fuelRate || 96),
        });
        payload.from = payload.from || payload.origin || "Delhi";
        payload.to = payload.to || payload.destination || "Mumbai";
        payload.km = payload.km || estimate.distance;
        payload.eta = payload.eta || estimate.eta;
        payload.tollTotal = payload.tollTotal || estimate.tollEstimate;
        payload.fuelLiters = payload.fuelLiters || estimate.fuelLiters;
        payload.fuelCost = payload.fuelCost || estimate.fuelCost;
        payload.freightRevenue = payload.freightRevenue || estimate.revenue;
        payload.driverAllowance = payload.driverAllowance || estimate.driverAllowance;
        payload.otherExpense = payload.otherExpense || estimate.otherExpense;
      }
      if (config.collection === "trips") {
        const estimate = estimateRoute({
          origin: payload.origin || "",
          destination: payload.destination || "",
          loadWeight: Number(payload.weight || 18),
          fuelRate: Number(payload.fuelRate || 96),
        });
        payload.tripNo = payload.tripNo || `TRP-${Date.now().toString().slice(-5)}`;
        payload.km = payload.km || estimate.distance;
        payload.freightPrice = payload.freightPrice || estimate.revenue;
        payload.fuelExpense = payload.fuelExpense || Math.round(estimate.fuelCost);
        payload.tollExpense = payload.tollExpense || estimate.tollEstimate;
        payload.driverAllowance = payload.driverAllowance || estimate.driverAllowance;
        payload.otherExpense = payload.otherExpense || estimate.otherExpense;
      }
      const response = await fetch(`/api/${config.collection}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session.token ? { Authorization: `Bearer ${session.token}` } : {}),
        },
        body: JSON.stringify(payload),
      });
      const responsePayload = await response.json();
      if (!response.ok) throw new Error(responsePayload.error || "Could not save entry");
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="auth-overlay">
      <button className="scrim" onClick={onClose} aria-label="Close new entry" />
      <motion.form
        className="entry-modal"
        onSubmit={save}
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
      >
        <div className="entry-head">
          <div>
            <p>New Entry</p>
            <h2>{config.title}</h2>
          </div>
          <button className="icon-button" onClick={onClose} type="button" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="entry-grid">
          {config.fields.map(([key, label, placeholder]) => (
            <label key={key}>
              {label}
              <input
                value={form[key] || ""}
                placeholder={placeholder}
                onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))}
              />
            </label>
          ))}
        </div>
        {error && <p className="form-error">{error}</p>}
        <button className="primary-action" disabled={saving}>
          <CheckCircle2 size={18} />
          {saving ? "Saving..." : "Save Entry"}
        </button>
      </motion.form>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);

