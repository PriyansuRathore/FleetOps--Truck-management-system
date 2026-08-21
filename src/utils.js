export function sumBy(rows, key) {
  return rows.reduce((sum, row) => sum + Number(row[key] || 0), 0);
}

export function isCompletedTrip(trip) {
  const status = String(trip?.status || "").trim().toLowerCase();
  return status.includes("complete") || status.includes("delivered") || status.includes("closed");
}

export function getCompletedTrips(data) {
  return (data.completedTripSummaries?.length ? data.completedTripSummaries : (data.tripSummaries || []).filter(isCompletedTrip));
}

export function getRunningTrips(data) {
  return data.runningTripSummaries?.length ? data.runningTripSummaries : (data.tripSummaries || []).filter((trip) => !isCompletedTrip(trip));
}

export function formatMoney(value) {
  return `Rs.${Number(value || 0).toLocaleString("en-IN")}`;
}

export function buildDashboardTotals(data) {
  const tripSummaries = data.tripSummaries || [];
  const completedTrips = getCompletedTrips(data);
  const runningTrips = getRunningTrips(data);
  const reportRevenue = sumBy(data.truckReports || [], "revenue");
  const reportExpense = sumBy(data.truckReports || [], "expense");
  const reportProfit = sumBy(data.truckReports || [], "profit");
  const driverSalary = sumBy(data.drivers || [], "salary");
  const revenue = reportRevenue || sumBy(completedTrips, "totalFreight");
  const directExpense = reportExpense || sumBy(completedTrips, "totalExpenses");
  const expense = directExpense + driverSalary;
  const profit = (reportRevenue || reportExpense ? reportProfit : revenue - directExpense) - driverSalary;
  const outstanding = tripSummaries.reduce((sum, trip) => sum + Number(trip.pending || 0), 0);
  const activeTrips = (runningTrips.length ? runningTrips : (data.trips || []).filter((trip) => !isCompletedTrip(trip))).length;
  return {
    revenue,
    expense,
    profit,
    driverSalary,
    outstanding,
    activeTrips,
    totalTrucks: (data.vehicles || []).length,
  };
}

export function buildFinanceBreakdown(data, totalExpense) {
  const totals = { Fuel: 0, Toll: 0, Driver: 0, Maintenance: 0, Other: 0 };
  const trips = getCompletedTrips(data);

  function addExpense(description, amount) {
    const value = Number(amount || 0);
    if (!value) return;
    const label = String(description || "").toLowerCase();
    if (label.includes("fuel") || label.includes("diesel")) totals.Fuel += value;
    else if (label.includes("toll")) totals.Toll += value;
    else if (label.includes("driver") || label.includes("allowance")) totals.Driver += value;
    else if (label.includes("maint") || label.includes("repair") || label.includes("service")) totals.Maintenance += value;
    else totals.Other += value;
  }

  trips.forEach((trip) => {
    const hasDetailedCosts = trip.expenses?.length || trip.fuelEntries?.length;
    if (hasDetailedCosts) {
      (trip.fuelEntries || []).forEach((entry) => addExpense("fuel", entry.totalAmount));
      (trip.expenses || []).forEach((expense) => addExpense(`${expense.category || ""} ${expense.description || ""}`, expense.amount));
      return;
    }
    addExpense("fuel", trip.fuelExpense);
    addExpense("toll", trip.tollExpense);
    addExpense("driver", trip.driverAllowance);
    addExpense("maintenance", trip.maintenanceExpense);
    addExpense("other", trip.otherExpense);
  });

  (data.expenseNotes || []).forEach((note) => addExpense(note.category || "other", note.amount));
  (data.maintenanceNotes || []).forEach((note) => addExpense("maintenance", note.totalCost));
  (data.drivers || []).forEach((driver) => addExpense("driver salary", driver.salary));

  const vehiclesWithTripMaintenance = new Set(trips.filter((trip) => Number(trip.maintenanceExpense || 0) > 0).map((trip) => trip.vehicle));
  (data.maintenance || [])
    .filter((record) => !vehiclesWithTripMaintenance.has(record.vehicle))
    .forEach((record) => addExpense("maintenance", parseMoney(record.cost)));

  const categorisedTotal = Object.values(totals).reduce((sum, value) => sum + value, 0);
  if (totalExpense > categorisedTotal) totals.Other += totalExpense - categorisedTotal;

  const colors = { Fuel: "#f59e0b", Toll: "#fbbf24", Driver: "#fb7185", Maintenance: "#e879f9", Other: "#aeb9a4" };
  return Object.entries(totals)
    .filter(([, value]) => value > 0)
    .map(([label, value]) => ({ label, value, color: colors[label] }));
}

export function getLocalExpenseNotes() {
  try {
    return JSON.parse(localStorage.getItem("fleetops-local-expense-notes") || "[]");
  } catch {
    return [];
  }
}

export function normalizeRouteKey(origin, destination) {
  const cleanCity = (value) => String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
  const from = cleanCity(origin);
  const to = cleanCity(destination);
  return `${from}-${to}`;
}

function parseDurationHours(value) {
  const text = String(value || "").toLowerCase();
  const hours = Number(text.match(/(\d+(?:\.\d+)?)\s*h/)?.[1] || 0);
  const minutes = Number(text.match(/(\d+(?:\.\d+)?)\s*m/)?.[1] || 0);
  return hours + minutes / 60 || Number(text.replace(/[^0-9.]/g, "")) || 8;
}

function profileFromSavedRoute(route) {
  const distance = parseMoney(route?.km ?? route?.distance);
  if (!route?.from || !route?.to || !distance) return null;
  const fuelLiters = Number(route.fuelLiters || 0);
  return {
    key: normalizeRouteKey(route.from, route.to),
    label: `${route.from} to ${route.to}`,
    distance,
    tollBase: Number(route.tollTotal || 0),
    tollPerKm: 0,
    fuelEfficiency: fuelLiters ? distance / fuelLiters : 8.8,
    etaHours: parseDurationHours(route.eta),
    baseRevenue: Number(route.freightRevenue || 0) || Math.max(distance * 95, 90000),
    driverAllowance: Number(route.driverAllowance || 0),
    otherExpense: Number(route.otherExpense || 0),
  };
}

export function estimateRoute({ origin, destination, vehicleType = "Truck", loadWeight = 18, fuelRate = 96, savedRoutes = [] }) {
  const routeProfiles = {
    "jaipur-ahmedabad": { label: "Jaipur to Ahmedabad", distance: 678, tollBase: 1020, tollPerKm: 1.18, fuelEfficiency: 8.9, etaHours: 12, baseRevenue: 280000 },
    "delhi-mumbai": { label: "Delhi → Mumbai", distance: 1418, tollBase: 1850, tollPerKm: 1.24, fuelEfficiency: 8.7, etaHours: 28, baseRevenue: 560000 },
    "delhi-kolkata": { label: "Delhi → Kolkata", distance: 1580, tollBase: 2200, tollPerKm: 1.35, fuelEfficiency: 8.3, etaHours: 32, baseRevenue: 610000 },
    "mumbai-pune": { label: "Mumbai → Pune", distance: 155, tollBase: 420, tollPerKm: 1.05, fuelEfficiency: 9.5, etaHours: 3, baseRevenue: 125000 },
    "pune-bengaluru": { label: "Pune → Bengaluru", distance: 840, tollBase: 1120, tollPerKm: 1.1, fuelEfficiency: 8.8, etaHours: 14, baseRevenue: 310000 },
    "bengaluru-chennai": { label: "Bengaluru → Chennai", distance: 350, tollBase: 600, tollPerKm: 1.0, fuelEfficiency: 9.2, etaHours: 6, baseRevenue: 150000 },
    "mumbai-delhi": { label: "Mumbai → Delhi", distance: 1418, tollBase: 1800, tollPerKm: 1.2, fuelEfficiency: 8.8, etaHours: 29, baseRevenue: 575000 },
    "kolkata-delhi": { label: "Kolkata → Delhi", distance: 1580, tollBase: 2150, tollPerKm: 1.32, fuelEfficiency: 8.4, etaHours: 31, baseRevenue: 602000 },
  };

  const routeKey = normalizeRouteKey(origin, destination);
  const savedProfile = savedRoutes.map(profileFromSavedRoute).find((route) => route?.key === routeKey);
  const profile = savedProfile || routeProfiles[routeKey];
  if (!profile) {
    return {
      available: false,
      label: "No route profile available",
      distance: 0,
      eta: "—",
      tollEstimate: 0,
      fuelLiters: 0,
      fuelCost: 0,
      driverAllowance: 0,
      otherExpense: 0,
      revenue: 0,
      profit: 0,
    };
  }
  const distance = Math.max(profile.distance + (Number(loadWeight || 18) > 22 ? 45 : 0), 100);
  const fuelEfficiency = profile.fuelEfficiency - (vehicleType.toLowerCase().includes("reefer") ? 0.5 : 0);
  const fuelLiters = distance / fuelEfficiency;
  const fuelCost = fuelLiters * Number(fuelRate || 96);
  const tollEstimate = Math.round(profile.tollBase + distance * profile.tollPerKm + (vehicleType.toLowerCase().includes("reefer") ? 1200 : 0));
  const driverAllowance = profile.driverAllowance || 18000 + Math.max(0, Number(loadWeight || 18) - 16) * 1200;
  const otherExpense = profile.otherExpense || 8000 + (profile.distance > 1200 ? 6000 : 3000);
  const revenue = Math.max(profile.baseRevenue + (Number(loadWeight || 18) - 18) * 20000, 90000);
  const totalExpense = fuelCost + tollEstimate + driverAllowance + otherExpense;
  const profit = revenue - totalExpense;

  return {
    available: true,
    label: profile.label,
    distance: Math.round(distance),
    eta: `${Math.max(3, Math.round(profile.etaHours + (loadWeight > 20 ? 2 : 0)))}h`,
    tollEstimate,
    fuelLiters: Math.round(fuelLiters),
    fuelCost: Math.round(fuelCost),
    driverAllowance: Math.round(driverAllowance),
    otherExpense: Math.round(otherExpense),
    revenue: Math.round(revenue),
    totalExpense: Math.round(totalExpense),
    profit: Math.round(profit),
  };
}

export function buildVehicleTracker(vehicles, routes) {
  return vehicles.map((vehicle, index) => {
    const route = routes[index % Math.max(routes.length, 1)] || null;
    const progress = 18 + (index * 17) % 74;
    const location = route ? `${route.from} → ${route.to}` : "At depot";
    const status = String(vehicle.status || "En route").trim();
    return { ...vehicle, location, progress, status, route };
  });
}

export function findTruckByQuery(data, query) {
  const term = String(query || "").trim().toLowerCase();
  if (term.length < 2) return null;
  return (data.vehicles || []).find((vehicle) => {
    const haystack = [vehicle.number, vehicle.model, vehicle.driver].join(" ").toLowerCase();
    return haystack.includes(term);
  }) || null;
}

export function parseMoney(value) {
  return Number(String(value || "0").replace(/[^0-9.-]/g, "")) || 0;
}

export function buildTripReport(data, vehicleNumber = "") {
  const vehicle = String(vehicleNumber || "");
  const summaries = (data.tripSummaries || []).filter((trip) => trip.vehicle === vehicle);
  const trips = summaries.length ? summaries : (data.trips || []).filter((trip) => trip.vehicle === vehicle);
  const completedTrips = trips.filter(isCompletedTrip);
  const runningTrips = trips.filter((trip) => !isCompletedTrip(trip));
  const financialTrips = completedTrips;
  const maintenance = (data.maintenance || []).filter((item) => item.vehicle === vehicle);
  const tolls = (data.tolls || []).filter((toll) => toll.vehicle === vehicle);
  const parts = (data.parts || []).filter((part) => part.vehicle === vehicle);
  const expenseNotes = (data.expenseNotes || []).filter((note) => note.vehicle === vehicle);
  const noteExpense = expenseNotes.reduce((sum, note) => sum + Number(note.amount || 0), 0);
  const maintenanceNotes = (data.maintenanceNotes || []).filter((note) => note.vehicle === vehicle);
  const maintenanceNoteExpense = maintenanceNotes.reduce((sum, note) => sum + Number(note.totalCost || 0), 0);
  const revenue = financialTrips.reduce((sum, trip) => sum + Number(trip.totalFreight ?? trip.freightPrice ?? 0), 0);
  const fuelExpense = financialTrips.reduce((sum, trip) => sum + Number(trip.fuelExpense || 0), 0);
  const tollExpense = financialTrips.reduce((sum, trip) => sum + Number(trip.tollExpense || 0), 0) || tolls.reduce((sum, toll) => sum + Number(toll.amountValue || 0), 0);
  const driverAllowance = financialTrips.reduce((sum, trip) => sum + Number(trip.driverAllowance || 0), 0);
  const maintenanceExpense = financialTrips.reduce((sum, trip) => sum + Number(trip.maintenanceExpense || 0), 0) || maintenance.reduce((sum, item) => sum + parseMoney(item.cost), 0);
  const otherExpense = financialTrips.reduce((sum, trip) => sum + Number(trip.otherExpense || 0), 0);
  const hasSummaries = summaries.length > 0;
  const baseExpense = hasSummaries
    ? financialTrips.reduce((sum, trip) => sum + Number(trip.totalExpenses || 0), 0)
    : financialTrips.reduce((sum, trip) => sum + Number(trip.totalExpense || 0), 0) || fuelExpense + tollExpense + driverAllowance + maintenanceExpense + otherExpense;
  const totalExpense = hasSummaries ? baseExpense : baseExpense + noteExpense + maintenanceNoteExpense;
  const profit = revenue - totalExpense;
  const km = financialTrips.reduce((sum, trip) => sum + Number(trip.distance || 0) + (trip.distance ? 0 : parseMoney(trip.km)), 0);

  return {
    vehicle,
    trips,
    completedTrips,
    runningTrips,
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
