export const fallbackDashboard = {
  metrics: [],
  routes: [],
  loads: [],
  trips: [],
  tripSummaries: [],
  completedTripSummaries: [],
  runningTripSummaries: [],
  tripLoads: [],
  tripExpenses: [],
  tripPayments: [],
  tripNotes: [],
  fuelEntries: [],
  expenseNotes: [],
  maintenanceNotes: [],
  drivers: [],
  driverPayments: [],
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

export const publicPreviewFallback = {
  ...fallbackDashboard,
  metrics: [
    { id: "preview-metric-1", label: "Active trucks", value: "12", delta: "6 routes planned" },
    { id: "preview-metric-2", label: "On-time trips", value: "94%", delta: "18 trip records" },
    { id: "preview-metric-3", label: "Monthly profit", value: "Rs.4,82,000", delta: "Completed trips only" },
    { id: "preview-metric-4", label: "Fleet alerts", value: "3", delta: "maintenance records" },
  ],
  routes: [
    { id: "preview-route-1", from: "Delhi", to: "Mumbai", km: "1,418 km", eta: "28h", status: "Optimized" },
    { id: "preview-route-2", from: "Jaipur", to: "Ahmedabad", km: "675 km", eta: "12h", status: "Live" },
  ],
  vehicles: [
    { id: "preview-truck-1", number: "RJ 14 GT 2291", model: "Tata Signa", driver: "Ramesh", status: "Running", odometer: "81,420 km" },
    { id: "preview-truck-2", number: "RJ 18 PB 4472", model: "BharatBenz", driver: "Imran", status: "At unloading", odometer: "62,900 km" },
    { id: "preview-truck-3", number: "HR 55 AX 8821", model: "Ashok Leyland", driver: "Suresh", status: "Available", odometer: "49,100 km" },
  ],
  tripSummaries: [
    { id: "preview-trip-1", tripNo: "TRP-1042", vehicle: "RJ 14 GT 2291", origin: "Delhi", destination: "Mumbai", startDate: "2026-08-06", endDate: "2026-08-08", totalFreight: 155000, totalExpenses: 87000, profit: 68000, pending: 0, status: "Completed" },
    { id: "preview-trip-2", tripNo: "TRP-1043", vehicle: "RJ 18 PB 4472", origin: "Jaipur", destination: "Ahmedabad", startDate: "2026-08-10", endDate: "", totalFreight: 88000, totalExpenses: 41000, profit: 47000, pending: 88000, status: "Running" },
  ],
  completedTripSummaries: [
    { id: "preview-trip-1", tripNo: "TRP-1042", vehicle: "RJ 14 GT 2291", origin: "Delhi", destination: "Mumbai", startDate: "2026-08-06", endDate: "2026-08-08", totalFreight: 155000, totalExpenses: 87000, profit: 68000, pending: 0, status: "Completed" },
  ],
  runningTripSummaries: [
    { id: "preview-trip-2", tripNo: "TRP-1043", vehicle: "RJ 18 PB 4472", origin: "Jaipur", destination: "Ahmedabad", startDate: "2026-08-10", endDate: "", totalFreight: 88000, totalExpenses: 41000, profit: 47000, pending: 88000, status: "Running" },
  ],
  truckReports: [
    { id: "preview-report-1", vehicle: "RJ 14 GT 2291", trips: 4, revenue: 520000, expense: 312000, profit: 208000, utilization: 86 },
    { id: "preview-report-2", vehicle: "HR 55 AX 8821", trips: 3, revenue: 390000, expense: 238000, profit: 152000, utilization: 74 },
  ],
  expenseNotes: [
    { id: "preview-note-1", vehicle: "RJ 14 GT 2291", noteDate: "2026-08-08", amount: 4200, note: "Parking and unloading helper expense" },
  ],
  maintenanceNotes: [
    { id: "preview-maint-note-1", vehicle: "HR 55 AX 8821", noteDate: "2026-08-05", totalCost: 13500, notes: "Brake lining and inspection" },
  ],
  alerts: [
    { id: "preview-alert-1", title: "RJ 18 PB 4472 trip running", detail: "P&L will book after completion", severity: "medium" },
    { id: "preview-alert-2", title: "HR 55 AX 8821 service due", detail: "Brake inspection scheduled", severity: "high" },
  ],
  financialSummary: {
    projectedRevenue: "Rs.9.1L",
    fuelExpense: "Rs.1.8L",
    netProfit: "Rs.3.6L",
  },
};

export function withPublicPreviewData(data = {}) {
  const merged = { ...publicPreviewFallback, ...data };
  Object.keys(publicPreviewFallback).forEach((key) => {
    if (Array.isArray(publicPreviewFallback[key]) && (!Array.isArray(merged[key]) || merged[key].length === 0)) {
      merged[key] = publicPreviewFallback[key];
    }
  });
  merged.financialSummary = { ...publicPreviewFallback.financialSummary, ...(data.financialSummary || {}) };
  return merged;
}
