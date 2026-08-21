import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  BadgeIndianRupee,
  BarChart3,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Fuel,
  Gauge,
  IndianRupee,
  MapPin,
  Navigation,
  ListChecks,
  PackageCheck,
  Pencil,
  Route,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Trash2,
  Truck,
  Wrench,
} from "lucide-react";
import { metricIcons } from "./config.jsx";
import { DataTable, Page, Panel, RecordActions, RouteList, RouteMotionMap, Stat, VerticalBars } from "./components.jsx";
import {
  buildDashboardTotals,
  buildFinanceBreakdown,
  buildTripReport,
  buildVehicleTracker,
  estimateRoute,
  findTruckByQuery,
  formatMoney,
  getCompletedTrips,
  getRunningTrips,
  isCompletedTrip,
  parseMoney,
  sumBy,
} from "./utils.js";

export function Dashboard({ data, searchQuery = "", onNewEntry }) {
  const topReports = [...(data.truckReports || [])].sort((a, b) => b.profit - a.profit).slice(0, 4);
  const liveFleet = buildVehicleTracker(data.vehicles || [], data.routes || []);
  const alerts = data.alerts || [];
  const searchedTruck = findTruckByQuery(data, searchQuery);
  const dashboardTotals = buildDashboardTotals(data);
  const openTrips = (data.tripSummaries || data.trips || []).filter((trip) => !String(trip.status || "").toLowerCase().includes("complete"));
  return (
    <Page title="Dashboard" kicker="FleetOps" onNewEntry={onNewEntry}>
      <section className="dashboard-hero">
        <div className="hero-copy">
          <p>Live Command</p>
          <h2>{dashboardTotals.activeTrips} active trips</h2>
          <span>{dashboardTotals.totalTrucks} trucks · {formatMoney(dashboardTotals.outstanding)} outstanding</span>
        </div>
        <div className="hero-stats">
          <Stat label="Freight" value={formatMoney(dashboardTotals.revenue)} />
          <Stat label="Expenses" value={formatMoney(dashboardTotals.expense)} />
          <Stat label="Net Profit" value={formatMoney(dashboardTotals.profit)} tone={dashboardTotals.profit >= 0 ? "good" : "bad"} />
        </div>
      </section>
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
        <Panel title="Fleet Movement" icon={Navigation}>
          <FleetPulse vehicles={data.vehicles} />
        </Panel>
        <Panel title="Income vs Expense" icon={BarChart3}>
          <VerticalBars
            rows={[
              { label: "Freight", value: dashboardTotals.revenue, color: "#5044e5" },
              { label: "Expense", value: dashboardTotals.expense, color: "#fb7185" },
              { label: "Profit", value: Math.max(dashboardTotals.profit, 0), color: "#8b5cf6" },
              { label: "Pending", value: dashboardTotals.outstanding, color: "#fbbf24" },
            ]}
            formatter={formatMoney}
          />
        </Panel>
      </div>
      <div className="module-grid">
        <Panel title="Open Trips" icon={Route}>
          <DataTable
            columns={["Trip", "Truck", "Route", "Freight", "Expense", "Profit"]}
            rows={openTrips.slice(0, 5).map((trip) => [
              trip.tripNo,
              trip.vehicle,
              `${trip.origin} to ${trip.destination}`,
              formatMoney(trip.totalFreight || trip.freightPrice),
              formatMoney(trip.totalExpenses || trip.totalExpense),
              formatMoney(trip.profit),
            ])}
          />
        </Panel>
        <Panel title="Top Trucks" icon={Truck}>
          <VerticalBars
            rows={topReports.map((report) => ({
              label: report.vehicle,
              value: Math.max(report.profit, 0),
              color: report.profit >= 0 ? "#8b5cf6" : "#fb7185",
            }))}
            formatter={formatMoney}
          />
        </Panel>
      </div>
      <div className="dashboard-grid">
        <Panel title="Fleet Alerts" icon={AlertTriangle}>
          <div className="alert-list">
            {alerts.length ? alerts.map((item) => (
              <div className={`alert-item ${item.severity}`} key={item.id}>
                <div>
                  <strong>{item.title}</strong>
                  <span>{item.detail}</span>
                </div>
                <small>{item.severity || "info"}</small>
              </div>
            )) : <p className="empty-state">Everything looks healthy right now.</p>}
          </div>
        </Panel>
        <Panel title="Truck Tracker" icon={MapPin}>
          <div className="tracker-grid">
            {liveFleet.map((vehicle) => (
              <div className="tracker-card" key={vehicle.id}>
                <div className="tracker-header">
                  <strong>{vehicle.number}</strong>
                  <span className="status-pill">{vehicle.status}</span>
                </div>
                <div className="tracker-meta">
                  <span>{vehicle.model || "Truck"}</span>
                  <span>{vehicle.driver || "Driver not assigned"}</span>
                </div>
                <p>{vehicle.location}</p>
                <div className="tracker-bar"><i style={{ width: `${vehicle.progress}%` }} /></div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
      <div className="dashboard-grid">
        <Panel title="Expense Notes" icon={ClipboardList}>
          <RecentNotes rows={(data.expenseNotes || []).map((note) => ({
            id: note.id,
            title: note.vehicle || "General",
            amount: note.amount,
            date: note.noteDate,
            text: note.note,
          }))} />
        </Panel>
        <Panel title="Maintenance Notes" icon={Wrench}>
          <RecentNotes rows={(data.maintenanceNotes || []).map((note) => ({
            id: note.id,
            title: note.vehicle || "General",
            amount: note.totalCost,
            date: note.noteDate,
            text: note.notes,
          }))} />
        </Panel>
      </div>
    </Page>
  );
}

function RecentNotes({ rows }) {
  const latest = [...rows].slice(-4).reverse();
  return (
    <div className="note-list compact-notes">
      {latest.length ? latest.map((note) => (
        <article className="note-item" key={note.id}>
          <div>
            <strong>{note.title} · {formatMoney(note.amount)}</strong>
            <span>{note.date || "-"}</span>
          </div>
          <p>{note.text}</p>
        </article>
      )) : <p className="empty-state">No notes yet.</p>}
    </div>
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

export function RoutePage({ routes, tolls, onNewEntry, onEditEntry, onRefresh }) {
  const [origin, setOrigin] = useState("Delhi");
  const [destination, setDestination] = useState("Mumbai");
  const [vehicleType, setVehicleType] = useState("Truck");
  const [loadWeight, setLoadWeight] = useState(18);
  const [fuelRate, setFuelRate] = useState(96);
  const [freightRevenue, setFreightRevenue] = useState(routes[0]?.freightRevenue || 0);
  const selectedRoute = routes.find((route) => route.from.trim().toLowerCase() === origin.trim().toLowerCase() && route.to.trim().toLowerCase() === destination.trim().toLowerCase());
  const estimate = useMemo(() => estimateRoute({ origin, destination, vehicleType, loadWeight, fuelRate, savedRoutes: routes }), [origin, destination, vehicleType, loadWeight, fuelRate, routes]);
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
    <Page title="Route Cost Estimator" kicker="Planning" onNewEntry={onNewEntry}>
      <div className="split-grid">
        <Panel title="Saved Route Plans" icon={Route}>
          <RouteMotionMap routes={routes} selectedRoute={previewRoute} />
          <RouteList routes={routes} onEditEntry={onEditEntry} onRefresh={onRefresh} />
        </Panel>
        <Panel title="Route Cost Calculator" icon={MapPin}>
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
            {!estimate.available && <p className="form-hint">No saved route profile matches this origin and destination yet. Save a route with distance to create one.</p>}
            <div className="calculation-grid">
              <Stat label="Route profile" value={estimate.label} />
              <Stat label="Distance" value={`${estimate.distance} km`} />
              <Stat label="ETA" value={estimate.eta} />
              <Stat label="Fuel cost" value={formatMoney(fuelCost)} />
              <Stat label="Tolls" value={formatMoney(tollTotal)} />
              <Stat label="Total expense" value={formatMoney(totalExpense)} />
              <Stat label="Profit / loss" value={formatMoney(profit)} tone={profit >= 0 ? "good" : "bad"} />
            </div>
            <button className="primary-action" type="button" onClick={onNewEntry}><Sparkles size={18} /> Save Route Plan</button>
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
              { label: "Fuel", value: fuelCost, color: "#f59e0b" },
              { label: "Tolls", value: tollTotal, color: "#d97706" },
              { label: "Driver", value: driverAllowance, color: "#7c3aed" },
              { label: "Other", value: otherExpense, color: "#64748b" },
              { label: "Profit", value: Math.max(profit, 0), color: "#8b5cf6" },
            ]}
            formatter={formatMoney}
          />
        </Panel>
      </div>
    </Page>
  );
}

export function LoadsPage({ loads, onNewEntry, onEditEntry, onRefresh }) {
  return (
    <Page title="Freight & Load Management" kicker="Dispatch" onNewEntry={onNewEntry}>
      <Panel title="Load Assignments" icon={PackageCheck}>
        <DataTable
          columns={["Load ID", "Cargo", "Truck", "Weight", "Margin", "State", "Actions"]}
          rows={loads.map((load) => [load.id, load.item, load.truck, load.weight, load.margin, load.state, <RecordActions key={load.id} resource="loads" record={load} onEdit={onEditEntry} onRefresh={onRefresh} />])}
        />
      </Panel>
    </Page>
  );
}

export function TripsPage({ data, searchQuery = "", onNewEntry, onEditEntry, onRefresh }) {
  const vehicles = data.vehicles || [];
  const searchedTruck = findTruckByQuery(data, searchQuery);
  const [selectedVehicle, setSelectedVehicle] = useState("");
  const [selectedTripId, setSelectedTripId] = useState("");
  const activeVehicle = searchedTruck?.number || selectedVehicle || vehicles[0]?.number || data.trips?.[0]?.vehicle || "";
  const report = buildTripReport(data, activeVehicle);
  const tripSummaries = (data.tripSummaries || []).filter((trip) => trip.vehicle === activeVehicle);
  const activeTrip = tripSummaries.find((trip) => trip.id === selectedTripId) || tripSummaries[0];
  const tripRows = (trips) => trips.map((trip) => [
    trip.tripNo,
    `${trip.origin} to ${trip.destination}`,
    trip.startDate || "-",
    trip.endDate || "-",
    trip.load || "-",
    trip.km || "-",
    formatMoney(trip.totalFreight),
    formatMoney(trip.totalExpenses),
    formatMoney(trip.profit),
    trip.registrationNotes || "-",
    trip.status,
  ]);
  const runningTrips = tripSummaries.filter((trip) => !isCompletedTrip(trip));
  const completedTrips = tripSummaries.filter(isCompletedTrip);

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
              { label: "Price", value: report.revenue, color: "#5044e5" },
              { label: "Fuel", value: report.fuelExpense, color: "#f59e0b" },
              { label: "Toll", value: report.tollExpense, color: "#f59e0b" },
              { label: "Maintenance", value: report.maintenanceExpense, color: "#fb7185" },
              { label: "Profit", value: Math.max(report.profit, 0), color: "#8b5cf6" },
            ]}
            formatter={formatMoney}
          />
        </Panel>
      </div>
      <div className="trip-register-sections">
        <Panel title="Running Trips" icon={Navigation}>
          <DataTable
            columns={["Trip", "Route", "Start", "End", "Load", "KM", "Price", "Expense", "Profit", "Notes", "Status"]}
            rows={tripRows(runningTrips)}
          />
        </Panel>
        <Panel title="Completed Trips" icon={CheckCircle2}>
          <DataTable
            columns={["Trip", "Route", "Start", "End", "Load", "KM", "Price", "Expense", "Profit", "Notes", "Status"]}
            rows={tripRows(completedTrips)}
          />
        </Panel>
      </div>
      <TripDateRangeAnalysis trips={data.tripSummaries || []} />
      {activeTrip && <TripDetailLedger trip={activeTrip} onEditTrip={() => onEditEntry(activeTrip)} onRefresh={onRefresh} />}
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

export function TripOperationsPage({ data, onEditEntry, onRefresh }) {
  const trips = data.tripSummaries || [];
  const runningTrips = trips.filter((trip) => !isCompletedTrip(trip));
  const completedTrips = trips.filter(isCompletedTrip);
  const rows = (items) => items.map((trip) => [
    trip.tripNo,
    trip.vehicle || "-",
    `${trip.origin || "-"} to ${trip.destination || "-"}`,
    trip.startDate || "-",
    trip.endDate || "-",
    `${trip.loads?.length || 0} loads`,
    `${trip.expenses?.length || 0} expenses`,
    `${trip.payments?.length || 0} payments`,
    `${trip.fuelEntries?.length || 0} fuel entries`,
    formatMoney(trip.pending),
    <RecordActions key={trip.id} resource="trips" record={trip} onEdit={onEditEntry} onRefresh={onRefresh} />,
  ]);

  return (
    <Page title="Trip Operations" kicker="Running & Completed">
      <section className="operations-intro">
        <ListChecks size={22} />
        <p>Every trip is connected to its loads, expenses, payments, fuel entries and notes in Trip Register. Use the action buttons to update or remove a trip.</p>
      </section>
      <div className="trip-register-sections">
        <Panel title={`Running Trips (${runningTrips.length})`} icon={Navigation}>
          <DataTable
            columns={["Trip", "Truck", "Route", "Start", "End", "Loads", "Expenses", "Payments", "Fuel", "Pending", "Actions"]}
            rows={rows(runningTrips)}
          />
        </Panel>
        <Panel title={`Completed Trips (${completedTrips.length})`} icon={CheckCircle2}>
          <DataTable
            columns={["Trip", "Truck", "Route", "Start", "End", "Loads", "Expenses", "Payments", "Fuel", "Pending", "Actions"]}
            rows={rows(completedTrips)}
          />
        </Panel>
      </div>
    </Page>
  );
}

function TripDateRangeAnalysis({ trips }) {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [calendarKey, setCalendarKey] = useState(0);
  const startDateRef = useRef(null);
  const endDateRef = useRef(null);
  const hasRange = Boolean(startDate && endDate && startDate <= endDate);
  const selectedTrips = hasRange ? trips.filter((trip) => {
    const tripStart = trip.startDate || trip.endDate || "";
    const tripEnd = trip.endDate || trip.startDate || "";
    return tripStart <= endDate && tripEnd >= startDate;
  }) : [];
  const completedTrips = selectedTrips.filter(isCompletedTrip);
  const runningTrips = selectedTrips.filter((trip) => !isCompletedTrip(trip));
  const revenue = sumBy(completedTrips, "totalFreight");
  const expense = sumBy(completedTrips, "totalExpenses");
  const profit = revenue - expense;
  const resetDateRange = () => {
    [startDateRef.current, endDateRef.current].forEach((input) => {
      if (input) input.value = "";
    });
    setStartDate("");
    setEndDate("");
    setCalendarKey((current) => current + 1);
  };

  return (
    <div className="split-grid">
      <Panel title="Trip Calendar Report" icon={CalendarClock}>
        <div className="date-range-form" key={calendarKey}>
          <label>From date<input ref={startDateRef} type="date" value={startDate} autoComplete="off" onChange={(event) => setStartDate(event.target.value)} /></label>
          <label>To date<input ref={endDateRef} type="date" value={endDate} autoComplete="off" onChange={(event) => setEndDate(event.target.value)} /></label>
          <button className="secondary-action date-reset" type="button" onClick={resetDateRange} disabled={!startDate && !endDate}>Reset dates</button>
        </div>
        {hasRange ? (
          <>
            <div className="trip-summary">
              <Stat label="All Trips" value={selectedTrips.length} />
              <Stat label="Completed" value={completedTrips.length} />
              <Stat label="Running" value={runningTrips.length} />
              <Stat label="Revenue" value={formatMoney(revenue)} />
              <Stat label="Expense" value={formatMoney(expense)} />
              <Stat label="Profit / Loss" value={formatMoney(profit)} tone={profit >= 0 ? "good" : "bad"} />
            </div>
            <DataTable
              columns={["Trip", "Truck", "Route", "Start", "End", "Revenue", "Expense", "Profit", "Status"]}
              rows={selectedTrips.map((trip) => [trip.tripNo, trip.vehicle, `${trip.origin} to ${trip.destination}`, trip.startDate || "-", trip.endDate || "-", isCompletedTrip(trip) ? formatMoney(trip.totalFreight) : "Pending", isCompletedTrip(trip) ? formatMoney(trip.totalExpenses) : "Not booked", isCompletedTrip(trip) ? formatMoney(trip.profit) : "After completion", trip.status])}
            />
          </>
        ) : <p className="empty-state">Select a valid from and to date to see every trip in that timeline.</p>}
      </Panel>
      <Panel title="Selected Period Calculation Chart" icon={BarChart3}>
        {hasRange ? <VerticalBars
          rows={[
            { label: "Revenue", value: revenue, color: "#5044e5" },
            { label: "Expense", value: expense, color: "#fb7185" },
            { label: "Profit", value: Math.max(profit, 0), color: "#8b5cf6" },
            { label: "Loss", value: Math.abs(Math.min(profit, 0)), color: "#dc2626" },
          ]}
          formatter={formatMoney}
        /> : <p className="empty-state">The calculation chart appears after choosing both dates.</p>}
      </Panel>
    </div>
  );
}

function TripDetailLedger({ trip, onEditTrip, onRefresh }) {
  const timeline = buildMoneyTimeline(trip);
  const [deleting, setDeleting] = useState(false);

  async function deleteTrip() {
    if (!window.confirm(`Delete trip ${trip.tripNo}? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      const session = JSON.parse(localStorage.getItem("fleetops-session") || "{}");
      const response = await fetch(`/api/trips/${trip.id}`, { method: "DELETE", headers: session.token ? { Authorization: `Bearer ${session.token}` } : {} });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Could not delete trip");
      onRefresh?.();
    } catch (error) {
      window.alert(error.message);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="trip-detail">
      <div className="record-actions">
        <button className="secondary-action" type="button" onClick={onEditTrip}><Pencil size={16} /> Edit trip</button>
        <button className="danger-action" type="button" disabled={deleting} onClick={deleteTrip}><Trash2 size={16} /> {deleting ? "Deleting..." : "Delete trip"}</button>
      </div>
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
        {trip.registrationNotes && <article className="note-item"><div><strong>Trip register note</strong><span>Saved with trip</span></div><p>{trip.registrationNotes}</p></article>}
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

export function DriversPage({ drivers, onNewEntry, onEditEntry, onRefresh }) {
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
            <RecordActions resource="drivers" record={driver} onEdit={onEditEntry} onRefresh={onRefresh} />
          </article>
        ))}
      </div>
    </Page>
  );
}

export function VehiclesPage({ data, onNewEntry, onEditEntry, onRefresh }) {
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
            columns={["Vehicle", "Model", "Driver", "Status", "Odometer", "Permit", "Actions"]}
            rows={vehicles.map((vehicle) => [
              vehicle.number,
              vehicle.model,
              vehicle.driver,
              vehicle.status,
              vehicle.odometer,
              vehicle.permit,
              <RecordActions key={vehicle.id} resource="vehicles" record={vehicle} onEdit={onEditEntry} onRefresh={onRefresh} />,
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
                  formatMoney(trip.totalFreight ?? trip.freightPrice),
                  formatMoney(trip.totalExpenses ?? trip.totalExpense),
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

export function MaintenancePage({ data, onNewEntry, onEditEntry, onRefresh }) {
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
            columns={["Vehicle", "Task", "Date", "Cost", "Parts", "Mechanic", "Health", "Actions"]}
            rows={maintenance.map((item) => [item.vehicle, item.task, item.date, item.cost, item.parts, item.mechanic, item.health, <RecordActions key={item.id} resource="maintenance" record={item} onEdit={onEditEntry} onRefresh={onRefresh} />])}
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

export function TollsPage({ tolls, routes, onNewEntry, onEditEntry, onRefresh }) {
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
            columns={["Route", "Plaza", "Vehicle", "Amount", "Status", "Actions"]}
            rows={tolls.map((toll) => [
              routes.find((route) => route.id === toll.routeId)?.from || "-",
              toll.plaza,
              toll.vehicle,
              toll.amount,
              toll.tag,
              <RecordActions key={toll.id} resource="tolls" record={toll} onEdit={onEditEntry} onRefresh={onRefresh} />,
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

export function TyresPage({ tyres, vehicles, onNewEntry, onEditEntry, onRefresh }) {
  const [selectedVehicle, setSelectedVehicle] = useState("");
  const vehicleNumbers = [...new Set([...(vehicles || []).map((vehicle) => vehicle.number), ...(tyres || []).map((tyre) => tyre.vehicle)])].filter(Boolean);
  const visibleTyres = selectedVehicle ? tyres.filter((tyre) => tyre.vehicle === selectedVehicle) : tyres;
  return (
    <Page title="Tyre Tracking & Rotation" kicker="Safety" onNewEntry={onNewEntry}>
      <div className="split-grid">
        <Panel title="Tyre Map" icon={Gauge}>
          <label>
            Select truck number
            <select value={selectedVehicle} onChange={(event) => setSelectedVehicle(event.target.value)}>
              <option value="">All trucks</option>
              {vehicleNumbers.map((number) => <option key={number} value={number}>{number}</option>)}
            </select>
          </label>
          <div className="tyre-layout">
            <div className="axle"><span /><span /></div>
            <div className="axle rear"><span /><span /></div>
          </div>
        </Panel>
        <Panel title="Rotation Register" icon={ClipboardList}>
          <DataTable
            columns={["Truck", "Position", "Tyre", "Tread", "Rotation", "Actions"]}
            rows={visibleTyres.map((tyre) => [tyre.vehicle || "Not assigned", tyre.position, tyre.tyre, tyre.tread, tyre.rotation, <RecordActions key={tyre.id} resource="tyres" record={tyre} onEdit={onEditEntry} onRefresh={onRefresh} />])}
          />
        </Panel>
      </div>
    </Page>
  );
}

export function FinancePage({ data, onNewEntry, onRefresh }) {
  const revenueTotal = sumBy(data.truckReports, "revenue");
  const truckExpenseTotal = sumBy(data.truckReports, "expense");
  const generalExpenseTotal = [
    ...(data.expenseNotes || []).filter((note) => !note.vehicle).map((note) => Number(note.amount || 0)),
    ...(data.maintenanceNotes || []).filter((note) => !note.vehicle).map((note) => Number(note.totalCost || 0)),
  ].reduce((sum, value) => sum + value, 0);
  const expenseTotal = truckExpenseTotal + generalExpenseTotal;
  const completedTrips = getCompletedTrips(data);
  const runningTrips = getRunningTrips(data);
  const monthlyRows = [
    { label: "Revenue", value: revenueTotal, color: "#5044e5" },
    { label: "Expense", value: expenseTotal, color: "#dc2626" },
    { label: "Profit", value: revenueTotal - expenseTotal, color: "#8b5cf6" },
  ];
  const costBreakdown = buildFinanceBreakdown(data, expenseTotal);
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
        vehicleNumbers={(data.vehicles || []).map((vehicle) => vehicle.number)}
        requireVehicle
        onSaved={onRefresh}
      />
      <DateRangeAnalysis data={data} />
      <div className="finance-grid">
        <article className="finance-card"><IndianRupee size={22} /><span>Completed Trip Revenue</span><strong>{data.financialSummary.projectedRevenue}</strong></article>
        <article className="finance-card"><Fuel size={22} /><span>Completed Fuel Expense</span><strong>{data.financialSummary.fuelExpense}</strong></article>
        <article className="finance-card"><BarChart3 size={22} /><span>Completed Net Profit</span><strong>{data.financialSummary.netProfit}</strong></article>
      </div>
      <div className="trip-summary">
        <Stat label="Completed Trips" value={completedTrips.length} />
        <Stat label="Running Trips" value={runningTrips.length} />
        <Stat label="Running Trip P&L" value="Not booked" />
      </div>
      <Panel title="Completed Trip Cost Breakdown" icon={BarChart3}>
        {costBreakdown.length ? <VerticalBars rows={costBreakdown} formatter={formatMoney} /> : <p className="empty-state">Add a trip or expense to see the live cost breakdown.</p>}
      </Panel>
      <Panel title="Completed Trip Profit And Loss" icon={IndianRupee}>
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

export function SettingsPage({ onRefresh }) {
  return (
    <Page title="Workspace Center" kicker="About & Backup">
      <div className="split-grid">
        <Panel title="About This Workspace" icon={Settings}>
          <div className="database-box">
            <strong>FleetOps Command</strong>
            <span>A focused control room for truck entries, trip registers, tyres, maintenance, tolls, expenses, and completed-trip profit reports.</span>
          </div>
        </Panel>
        <Panel title="Data Safety" icon={ShieldCheck}>
          <div className="database-box">
            <strong>Keep a backup before major changes</strong>
            <span>Export your workspace data before deleting records, importing another file, or clearing database storage.</span>
          </div>
        </Panel>
      </div>
      <BackupSection onImported={onRefresh} />
    </Page>
  );
}

function BackupSection({ onImported }) {
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  function authHeaders() {
    const session = JSON.parse(localStorage.getItem("fleetops-session") || "{}");
    return session.token ? { Authorization: `Bearer ${session.token}` } : {};
  }

  async function exportBackup() {
    setBusy(true);
    setStatus("");
    try {
      const response = await fetch("/api/backup/export", { headers: authHeaders() });
      const backup = await response.json();
      if (!response.ok) throw new Error(backup.error || "Could not export backup");
      const file = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(file);
      const link = document.createElement("a");
      link.href = url;
      link.download = `fleetops-backup-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
      setStatus("Backup downloaded successfully.");
    } catch (error) {
      setStatus(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function importBackup(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setStatus("");
    try {
      const backup = JSON.parse(await file.text());
      if (!window.confirm("Importing this backup will permanently replace all current workspace data. Continue?")) return;
      setBusy(true);
      const response = await fetch("/api/backup/import", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(backup),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not import backup");
      setStatus(`${result.imported} records restored from backup.`);
      onImported?.();
    } catch (error) {
      setStatus(error.message || "Choose a valid FleetOps backup file.");
    } finally {
      setBusy(false);
      event.target.value = "";
    }
  }

  return (
    <Panel title="Data Backup & Restore" icon={ShieldCheck}>
      <div className="backup-box">
        <div>
          <strong>Export workspace data</strong>
          <span>Downloads trips, vehicles, tyres, maintenance and expense records as a JSON backup file.</span>
        </div>
        <button className="secondary-action" type="button" disabled={busy} onClick={exportBackup}>Export Backup</button>
        <div>
          <strong>Import and replace data</strong>
          <span>Restores a FleetOps backup file and permanently replaces the current workspace records.</span>
        </div>
        <input id="fleetops-backup-file" className="file-input" type="file" accept="application/json,.json" onChange={importBackup} />
        <button className="danger-action" type="button" disabled={busy} onClick={() => document.getElementById("fleetops-backup-file")?.click()}>{busy ? "Working..." : "Import Backup"}</button>
      </div>
      {status && <p className="backup-status">{status}</p>}
    </Panel>
  );
}


function TripSummary({ report }) {
  return (
    <div className="trip-summary">
      <Stat label="All Trips" value={report.trips.length} />
      <Stat label="Completed" value={report.completedTrips?.length || 0} />
      <Stat label="Running" value={report.runningTrips?.length || 0} />
      <Stat label="Completed KM" value={report.km.toLocaleString("en-IN")} />
      <Stat label="Booked Price" value={formatMoney(report.revenue)} />
      <Stat label="Fuel" value={formatMoney(report.fuelExpense)} />
      <Stat label="Tolls" value={formatMoney(report.tollExpense)} />
      <Stat label="Maintenance" value={formatMoney(report.maintenanceExpense)} />
      <Stat label="Small Notes" value={formatMoney(report.noteExpense)} />
      <Stat label="Booked Expense" value={formatMoney(report.totalExpense)} />
      <Stat label="Booked Profit" value={formatMoney(report.profit)} tone={report.profit >= 0 ? "good" : "bad"} />
    </div>
  );
}

function DateRangeAnalysis({ data }) {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [calendarKey, setCalendarKey] = useState(0);
  const startDateRef = useRef(null);
  const endDateRef = useRef(null);
  const hasRange = Boolean(startDate && endDate && startDate <= endDate);
  const inRange = (date) => hasRange && Boolean(date) && date >= startDate && date <= endDate;
  const allTrips = (data.tripSummaries || []).filter((trip) => inRange(trip.startDate));
  const trips = allTrips.filter(isCompletedTrip);
  const runningTrips = allTrips.filter((trip) => !isCompletedTrip(trip));
  const tripRevenue = sumBy(trips, "totalFreight");
  const tripExpense = sumBy(trips, "totalExpenses");
  const noteExpense = (data.expenseNotes || []).filter((note) => inRange(note.noteDate)).reduce((sum, note) => sum + Number(note.amount || 0), 0);
  const maintenanceExpense = (data.maintenanceNotes || []).filter((note) => inRange(note.noteDate)).reduce((sum, note) => sum + Number(note.totalCost || 0), 0);
  const totalExpense = tripExpense + noteExpense + maintenanceExpense;
  const resetDateRange = () => {
    [startDateRef.current, endDateRef.current].forEach((input) => {
      if (input) input.value = "";
    });
    setStartDate("");
    setEndDate("");
    setCalendarKey((current) => current + 1);
  };

  return (
    <Panel title="Date-wise Profit & Trip Report" icon={CalendarClock}>
      <div className="date-range-form" key={calendarKey}>
        <label>From date<input ref={startDateRef} type="date" value={startDate} autoComplete="off" onChange={(event) => setStartDate(event.target.value)} /></label>
        <label>To date<input ref={endDateRef} type="date" value={endDate} autoComplete="off" onChange={(event) => setEndDate(event.target.value)} /></label>
        <button className="secondary-action date-reset" type="button" onClick={resetDateRange} disabled={!startDate && !endDate}>Reset dates</button>
      </div>
      {hasRange ? (
        <>
          <div className="trip-summary">
            <Stat label="All Trips" value={allTrips.length} />
            <Stat label="Completed" value={trips.length} />
            <Stat label="Running" value={runningTrips.length} />
            <Stat label="Revenue" value={formatMoney(tripRevenue)} />
            <Stat label="Expense" value={formatMoney(totalExpense)} />
            <Stat label="Profit / Loss" value={formatMoney(tripRevenue - totalExpense)} tone={tripRevenue - totalExpense >= 0 ? "good" : "bad"} />
          </div>
          <DataTable
            columns={["Trip", "Truck", "Start", "Revenue", "Expense", "Profit", "Status"]}
            rows={allTrips.map((trip) => [trip.tripNo, trip.vehicle, trip.startDate || "-", isCompletedTrip(trip) ? formatMoney(trip.totalFreight) : "Pending", isCompletedTrip(trip) ? formatMoney(trip.totalExpenses) : "Not booked", isCompletedTrip(trip) ? formatMoney(trip.profit) : "After completion", trip.status])}
          />
        </>
      ) : <p className="empty-state">Choose a valid start and end date to see trips, expenses, profit and loss.</p>}
    </Panel>
  );
}

function NotebookSection({ title, icon, collection, notes, textareaLabel, totalLabel, placeholder, vehicleNumbers = [], requireVehicle = false, onSaved }) {
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
  const [selectedVehicle, setSelectedVehicle] = useState("");

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
      setForm({ ...emptyForm, vehicle: requireVehicle ? selectedVehicle : "" });
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
      {requireVehicle && <div className="vehicle-note-selector">
        <label>
          Select truck number
          <select value={selectedVehicle} onChange={(event) => {
            setSelectedVehicle(event.target.value);
            setForm((current) => ({ ...current, vehicle: event.target.value }));
          }}>
            <option value="">Choose a truck</option>
            {vehicleNumbers.filter(Boolean).map((number) => <option key={number} value={number}>{number}</option>)}
          </select>
        </label>
        {!selectedVehicle && <p className="empty-state">Enter a truck number to open its expense section.</p>}
      </div>}
      {(!requireVehicle || selectedVehicle) && <form className="notebook-editor" onSubmit={saveNote}>
        <label className="note-field">
          {textareaLabel}
          <textarea value={form.text} onChange={(event) => setForm({ ...form, text: event.target.value })} placeholder={placeholder} rows={7} />
        </label>
        {!requireVehicle && <label>Vehicle / Truck<input value={form.vehicle} onChange={(event) => setForm({ ...form, vehicle: event.target.value })} placeholder="Optional truck number" /></label>}
        <label>Date<input type="date" value={form.noteDate} onChange={(event) => setForm({ ...form, noteDate: event.target.value })} /></label>
        <label>{totalLabel}<input value={form.total} onChange={(event) => setForm({ ...form, total: event.target.value })} placeholder="0" /></label>
        <button className="primary-action" disabled={saving}><Sparkles size={18} /> {saving ? "Saving..." : form.id ? "Update Note" : "Save Note"}</button>
        {form.id && <button className="secondary-action" type="button" onClick={() => setForm({ ...emptyForm })}>Cancel Edit</button>}
      </form>}
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
              <button type="button" onClick={() => { setSelectedVehicle(note.vehicle); setForm({ id: note.id, vehicle: note.vehicle, text: note.text, total: note.total, noteDate: note.noteDate }); }}>Edit</button>
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

