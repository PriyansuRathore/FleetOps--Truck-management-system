import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, CheckCircle2, ChevronRight, LockKeyhole, LogOut, Menu, Moon, Search, Sun, Truck, X } from "lucide-react";
import { entryConfigs, iconMap, navItems } from "./config.jsx";
import { fallbackDashboard, publicPreviewFallback, withPublicPreviewData } from "./data.js";
import { RouteMotionMap } from "./components.jsx";
import { estimateRoute, getLocalExpenseNotes } from "./utils.js";
import {
  Dashboard,
  DriversPage,
  FinancePage,
  LoadsPage,
  MaintenancePage,
  RoutePage,
  SettingsPage,
  TollsPage,
  TripsPage,
  TyresPage,
  VehiclesPage,
} from "./pages.jsx";

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
  const [editingEntry, setEditingEntry] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [theme, setTheme] = useState(() => localStorage.getItem("fleetops-theme") || "dark");

  useEffect(() => {
    if (!user) return;
    fetchDashboard(setDashboard, setApiStatus);
  }, [user]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("fleetops-theme", theme);
  }, [theme]);

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
          theme={theme}
          onToggleTheme={() => setTheme((current) => current === "dark" ? "light" : "dark")}
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
              onEditEntry={(entry) => {
                setEditingEntry(entry);
                setEntryOpen(true);
              }}
              onRefresh={() => fetchDashboard(setDashboard, setApiStatus)}
            />
          </motion.div>
        </AnimatePresence>
        <NewEntryModal
          page={activePage}
          open={entryOpen}
          editingEntry={editingEntry}
          vehicleNumbers={(dashboard.vehicles || []).map((vehicle) => vehicle.number).filter(Boolean)}
          onClose={() => {
            setEntryOpen(false);
            setEditingEntry(null);
          }}
          onSaved={() => {
            setEntryOpen(false);
            setEditingEntry(null);
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
  const [preview, setPreview] = useState(publicPreviewFallback);

  useEffect(() => {
    fetch("/api/public-dashboard")
      .then((response) => response.json())
      .then((data) => setPreview(withPublicPreviewData(data)))
      .catch(() => setPreview(publicPreviewFallback));
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
          <p>FleetOps Command</p>
          <h1>Transport ERP for trips, trucks, freight, expenses and profit.</h1>
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
        <h1>{mode === "signin" ? "Sign in" : "Create workspace"}</h1>
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
  function goHome() {
    setActivePage("dashboard");
    setOpen(false);
  }

  return (
    <>
      <aside className={`sidebar ${open ? "open" : ""}`}>
        <div className="side-brand-row">
          <button className="side-brand" type="button" onClick={goHome} aria-label="Go to dashboard">
            <Truck size={28} />
            <div>
              <strong>FleetOps</strong>
              <span>Command</span>
            </div>
          </button>
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

function Topbar({ user, apiStatus, searchQuery, setSearchQuery, onLogout, onMenu, theme, onToggleTheme }) {
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
        <button className="theme-toggle" type="button" onClick={onToggleTheme} aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}>
          {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          <span>{theme === "dark" ? "Day" : "Night"}</span>
        </button>
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

function PageRouter({ page, data, searchQuery, onNewEntry, onEditEntry, onRefresh }) {
  const pages = {
    dashboard: <Dashboard data={data} searchQuery={searchQuery} onNewEntry={onNewEntry} />,
    routes: <RoutePage routes={data.routes} tolls={data.tolls} onNewEntry={onNewEntry} onEditEntry={onEditEntry} onRefresh={onRefresh} />,
    loads: <LoadsPage loads={data.loads} onNewEntry={onNewEntry} onEditEntry={onEditEntry} onRefresh={onRefresh} />,
    trips: <TripsPage data={data} searchQuery={searchQuery} onNewEntry={onNewEntry} onEditEntry={onEditEntry} onRefresh={onRefresh} />,
    drivers: <DriversPage drivers={data.drivers} onNewEntry={onNewEntry} onEditEntry={onEditEntry} onRefresh={onRefresh} />,
    vehicles: <VehiclesPage data={data} onNewEntry={onNewEntry} onEditEntry={onEditEntry} onRefresh={onRefresh} />,
    maintenance: <MaintenancePage data={data} onNewEntry={onNewEntry} onEditEntry={onEditEntry} onRefresh={onRefresh} />,
    tolls: <TollsPage tolls={data.tolls} routes={data.routes} onNewEntry={onNewEntry} onEditEntry={onEditEntry} onRefresh={onRefresh} />,
    tyres: <TyresPage tyres={data.tyres} vehicles={data.vehicles} onNewEntry={onNewEntry} onEditEntry={onEditEntry} onRefresh={onRefresh} />,
    finance: <FinancePage data={data} onNewEntry={onNewEntry} onRefresh={onRefresh} />,
    settings: <SettingsPage onRefresh={onRefresh} />,
  };
  return pages[page] || pages.dashboard;
}


function NewEntryModal({ page, open, editingEntry, vehicleNumbers = [], onClose, onSaved }) {
  const config = entryConfigs[page] || entryConfigs.dashboard;
  const [form, setForm] = useState({});
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const nextForm = Object.fromEntries(config.fields.map(([key]) => [key, editingEntry?.[key] ?? ""]));
    if (!editingEntry) {
      if (config.collection === "trips") nextForm.status = "Running";
      config.fields.forEach(([key]) => {
        if (["vehicle", "truck"].includes(key) && !nextForm[key] && vehicleNumbers[0]) nextForm[key] = vehicleNumbers[0];
      });
    }
    setForm(nextForm);
    setError("");
  }, [config.title, editingEntry, open, vehicleNumbers[0]]);

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
      if (config.collection === "trips" && !editingEntry) {
        const estimate = estimateRoute({ origin: payload.origin || "", destination: payload.destination || "", loadWeight: Number(payload.weight || 18), fuelRate: Number(payload.fuelRate || 96) });
        payload.tripNo = payload.tripNo || `TRP-${Date.now().toString().slice(-5)}`;
        payload.km = payload.km || estimate.distance;
      }
      const response = await fetch(`/api/${config.collection}${editingEntry ? `/${editingEntry.id}` : ""}`, {
        method: editingEntry ? "PUT" : "POST",
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
            <h2>{editingEntry ? `Edit ${config.title.replace("Add ", "")}` : config.title}</h2>
          </div>
          <button className="icon-button" onClick={onClose} type="button" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="entry-grid">
          {config.fields.map(([key, label, placeholder, inputType]) => {
            const shouldSelectTruck = ["vehicle", "truck"].includes(key) && vehicleNumbers.length;
            const shouldSelectTripStatus = config.collection === "trips" && key === "status";
            const truckOptions = [...new Set([form[key], ...vehicleNumbers].filter(Boolean))];
            return (
              <label key={key}>
                {label}
                {inputType === "multiline" ? (
                  <textarea value={form[key] || ""} placeholder={placeholder} rows={4} onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))} />
                ) : shouldSelectTripStatus ? (
                  <select value={form[key] || ""} onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))}>
                    <option value="">Choose status</option>
                    <option value="Running">Running</option>
                    <option value="Completed">Completed</option>
                  </select>
                ) : shouldSelectTruck ? (
                  <select value={form[key] || ""} onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))}>
                    <option value="">Choose truck number</option>
                    {truckOptions.map((number) => <option key={number} value={number}>{number}</option>)}
                  </select>
                ) : (
                  <input value={form[key] || ""} placeholder={placeholder} onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))} />
                )}
              </label>
            );
          })}
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



export default App;
