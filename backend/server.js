import http from "node:http";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import pg from "pg";

const { Pool } = pg;
const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, ".env") });

const DB_PATH = join(__dirname, "data", "logistics-db.json");
const PORT = Number(process.env.PORT || 4000);
const JWT_SECRET = process.env.JWT_SECRET || "fleetops-local-dev-secret";
const pool = process.env.DATABASE_URL
  ? new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
  : null;

const collectionConfig = {
  users: {
    table: "users",
    columns: ["id", "name", "email", "password", "role"],
    publicColumns: ["id", "name", "email", "role"],
  },
  metrics: {
    table: "metrics",
    columns: ["id", "label", "value", "delta"],
    ownerScoped: true,
  },
  routes: {
    table: "routes",
    columns: ["id", "origin", "destination", "distance", "eta", "saving", "status", "toll_total", "fuel_liters", "fuel_cost", "freight_revenue", "driver_allowance", "other_expense"],
    ownerScoped: true,
    fromApi(payload) {
      return {
        ...payload,
        origin: payload.origin ?? payload.from,
        destination: payload.destination ?? payload.to,
        distance: payload.distance ?? payload.km,
        toll_total: Number(payload.toll_total ?? payload.tollTotal ?? 0),
        fuel_liters: Number(payload.fuel_liters ?? payload.fuelLiters ?? 0),
        fuel_cost: Number(payload.fuel_cost ?? payload.fuelCost ?? 0),
        freight_revenue: Number(payload.freight_revenue ?? payload.freightRevenue ?? 0),
        driver_allowance: Number(payload.driver_allowance ?? payload.driverAllowance ?? 0),
        other_expense: Number(payload.other_expense ?? payload.otherExpense ?? 0),
      };
    },
    toApi(row) {
      return {
        id: row.id,
        from: row.origin,
        to: row.destination,
        km: row.distance,
        eta: row.eta,
        saving: row.saving,
        status: row.status,
        tollTotal: row.toll_total,
        fuelLiters: row.fuel_liters,
        fuelCost: row.fuel_cost,
        freightRevenue: row.freight_revenue,
        driverAllowance: row.driver_allowance,
        otherExpense: row.other_expense,
      };
    },
  },
  loads: {
    table: "loads",
    columns: ["id", "item", "truck", "weight", "margin", "state"],
    ownerScoped: true,
  },
  trips: {
    table: "trips",
    columns: [
      "id",
      "trip_no",
      "vehicle",
      "driver",
      "origin",
      "destination",
      "start_date",
      "end_date",
      "load_name",
      "km",
      "freight_price",
      "fuel_expense",
      "toll_expense",
      "driver_allowance",
      "maintenance_expense",
      "other_expense",
      "total_expense",
      "profit",
      "status",
    ],
    ownerScoped: true,
    fromApi(payload) {
      const freightPrice = Number(payload.freight_price ?? payload.freightPrice ?? payload.price ?? 0);
      const fuelExpense = Number(payload.fuel_expense ?? payload.fuelExpense ?? 0);
      const tollExpense = Number(payload.toll_expense ?? payload.tollExpense ?? 0);
      const driverAllowance = Number(payload.driver_allowance ?? payload.driverAllowance ?? 0);
      const maintenanceExpense = Number(payload.maintenance_expense ?? payload.maintenanceExpense ?? 0);
      const otherExpense = Number(payload.other_expense ?? payload.otherExpense ?? 0);
      const totalExpense = fuelExpense + tollExpense + driverAllowance + maintenanceExpense + otherExpense;
      return {
        ...payload,
        trip_no: payload.trip_no ?? payload.tripNo,
        start_date: payload.start_date ?? payload.startDate,
        end_date: payload.end_date ?? payload.endDate,
        load_name: payload.load_name ?? payload.load,
        freight_price: freightPrice,
        fuel_expense: fuelExpense,
        toll_expense: tollExpense,
        driver_allowance: driverAllowance,
        maintenance_expense: maintenanceExpense,
        other_expense: otherExpense,
        total_expense: Number(payload.total_expense ?? payload.totalExpense ?? totalExpense),
        profit: Number(payload.profit ?? freightPrice - totalExpense),
      };
    },
    toApi(row) {
      return {
        id: row.id,
        tripNo: row.trip_no,
        vehicle: row.vehicle,
        driver: row.driver,
        origin: row.origin,
        destination: row.destination,
        startDate: row.start_date,
        endDate: row.end_date,
        load: row.load_name,
        km: row.km,
        freightPrice: row.freight_price,
        fuelExpense: row.fuel_expense,
        tollExpense: row.toll_expense,
        driverAllowance: row.driver_allowance,
        maintenanceExpense: row.maintenance_expense,
        otherExpense: row.other_expense,
        totalExpense: row.total_expense,
        profit: row.profit,
        status: row.status,
      };
    },
  },
  expenseNotes: {
    table: "expense_notes",
    columns: ["id", "trip_no", "vehicle", "note_date", "category", "amount", "note"],
    ownerScoped: true,
    fromApi(payload) {
      return {
        ...payload,
        trip_no: payload.trip_no ?? payload.tripNo ?? "",
        vehicle: payload.vehicle ?? "",
        note_date: payload.note_date ?? payload.noteDate ?? new Date().toISOString().slice(0, 10),
        category: payload.category ?? payload.title ?? "Expense Details",
        amount: Number(payload.amount ?? payload.totalExpense ?? 0),
        note: payload.note ?? payload.notes ?? "",
      };
    },
    toApi(row) {
      return {
        id: row.id,
        tripNo: row.trip_no,
        vehicle: row.vehicle,
        noteDate: row.note_date,
        category: row.category,
        amount: row.amount,
        note: row.note,
      };
    },
  },
  tripLoads: {
    table: "trip_loads",
    columns: ["id", "trip_id", "source", "destination", "party", "description", "freight_amount", "loading_date", "unloading_date", "payment_status", "received_amount", "invoice_number", "lr_number", "pod_status", "notes", "attachment"],
    ownerScoped: true,
    fromApi(payload) {
      const freightAmount = Number(payload.freight_amount ?? payload.freightAmount ?? 0);
      const receivedAmount = Number(payload.received_amount ?? payload.receivedAmount ?? 0);
      return {
        ...payload,
        trip_id: payload.trip_id ?? payload.tripId,
        freight_amount: freightAmount,
        loading_date: payload.loading_date ?? payload.loadingDate,
        unloading_date: payload.unloading_date ?? payload.unloadingDate,
        payment_status: payload.payment_status ?? payload.paymentStatus ?? (receivedAmount >= freightAmount && freightAmount > 0 ? "Paid" : "Pending"),
        received_amount: receivedAmount,
        invoice_number: payload.invoice_number ?? payload.invoiceNumber,
        lr_number: payload.lr_number ?? payload.lrNumber,
        pod_status: payload.pod_status ?? payload.podStatus ?? "Pending",
      };
    },
    toApi(row) {
      return {
        id: row.id,
        tripId: row.trip_id,
        source: row.source,
        destination: row.destination,
        party: row.party,
        description: row.description,
        freightAmount: row.freight_amount,
        loadingDate: row.loading_date,
        unloadingDate: row.unloading_date,
        paymentStatus: row.payment_status,
        receivedAmount: row.received_amount,
        pendingAmount: Number(row.freight_amount || 0) - Number(row.received_amount || 0),
        invoiceNumber: row.invoice_number,
        lrNumber: row.lr_number,
        podStatus: row.pod_status,
        notes: row.notes,
        attachment: row.attachment,
      };
    },
  },
  tripExpenses: {
    table: "trip_expenses",
    columns: ["id", "trip_id", "description", "amount", "expense_date", "category", "paid_by", "payment_method", "notes", "attachment"],
    ownerScoped: true,
    fromApi(payload) {
      return {
        ...payload,
        trip_id: payload.trip_id ?? payload.tripId,
        amount: Number(payload.amount || 0),
        expense_date: payload.expense_date ?? payload.expenseDate ?? new Date().toISOString().slice(0, 10),
        paid_by: payload.paid_by ?? payload.paidBy,
        payment_method: payload.payment_method ?? payload.paymentMethod,
      };
    },
    toApi(row) {
      return {
        id: row.id,
        tripId: row.trip_id,
        description: row.description,
        amount: row.amount,
        expenseDate: row.expense_date,
        category: row.category,
        paidBy: row.paid_by,
        paymentMethod: row.payment_method,
        notes: row.notes,
        attachment: row.attachment,
      };
    },
  },
  tripPayments: {
    table: "trip_payments",
    columns: ["id", "trip_id", "load_id", "party", "payment_date", "amount", "mode", "reference_number", "notes"],
    ownerScoped: true,
    fromApi(payload) {
      return {
        ...payload,
        trip_id: payload.trip_id ?? payload.tripId,
        load_id: payload.load_id ?? payload.loadId,
        payment_date: payload.payment_date ?? payload.paymentDate ?? new Date().toISOString().slice(0, 10),
        amount: Number(payload.amount || 0),
        reference_number: payload.reference_number ?? payload.referenceNumber,
      };
    },
    toApi(row) {
      return {
        id: row.id,
        tripId: row.trip_id,
        loadId: row.load_id,
        party: row.party,
        paymentDate: row.payment_date,
        amount: row.amount,
        mode: row.mode,
        referenceNumber: row.reference_number,
        notes: row.notes,
      };
    },
  },
  tripNotes: {
    table: "trip_notes",
    columns: ["id", "trip_id", "note_date", "note"],
    ownerScoped: true,
    fromApi(payload) {
      return {
        ...payload,
        trip_id: payload.trip_id ?? payload.tripId,
        note_date: payload.note_date ?? payload.noteDate ?? new Date().toISOString().slice(0, 10),
      };
    },
    toApi(row) {
      return {
        id: row.id,
        tripId: row.trip_id,
        noteDate: row.note_date,
        note: row.note,
      };
    },
  },
  fuelEntries: {
    table: "fuel_entries",
    columns: ["id", "trip_id", "vehicle", "fuel_date", "station", "litres", "rate_per_litre", "total_amount", "odometer", "receipt", "notes"],
    ownerScoped: true,
    fromApi(payload) {
      const litres = Number(payload.litres || 0);
      const rate = Number(payload.rate_per_litre ?? payload.ratePerLitre ?? 0);
      return {
        ...payload,
        trip_id: payload.trip_id ?? payload.tripId,
        fuel_date: payload.fuel_date ?? payload.fuelDate ?? new Date().toISOString().slice(0, 10),
        rate_per_litre: rate,
        total_amount: Number(payload.total_amount ?? payload.totalAmount ?? litres * rate),
      };
    },
    toApi(row) {
      return {
        id: row.id,
        tripId: row.trip_id,
        vehicle: row.vehicle,
        fuelDate: row.fuel_date,
        station: row.station,
        litres: row.litres,
        ratePerLitre: row.rate_per_litre,
        totalAmount: row.total_amount,
        odometer: row.odometer,
        receipt: row.receipt,
        notes: row.notes,
      };
    },
  },
  maintenanceNotes: {
    table: "maintenance_notes",
    columns: ["id", "vehicle", "note_date", "notes", "total_cost"],
    ownerScoped: true,
    fromApi(payload) {
      return {
        ...payload,
        vehicle: payload.vehicle ?? "",
        note_date: payload.note_date ?? payload.noteDate ?? new Date().toISOString().slice(0, 10),
        notes: payload.notes ?? payload.note ?? "",
        total_cost: Number(payload.total_cost ?? payload.totalCost ?? 0),
      };
    },
    toApi(row) {
      return {
        id: row.id,
        vehicle: row.vehicle,
        noteDate: row.note_date,
        notes: row.notes,
        totalCost: row.total_cost,
      };
    },
  },
  drivers: {
    table: "drivers",
    columns: ["id", "name", "score", "hours", "route"],
    ownerScoped: true,
    fromApi(payload) {
      return { ...payload, score: Number(payload.score || 0) };
    },
  },
  vehicles: {
    table: "vehicles",
    columns: ["id", "number", "model", "driver", "status", "odometer", "permit"],
    ownerScoped: true,
  },
  maintenance: {
    table: "maintenance",
    columns: ["id", "vehicle", "task", "service_date", "cost", "health", "parts", "mechanic"],
    ownerScoped: true,
    fromApi(payload) {
      return { ...payload, service_date: payload.service_date ?? payload.date };
    },
    toApi(row) {
      return {
        id: row.id,
        vehicle: row.vehicle,
        task: row.task,
        date: row.service_date,
        cost: row.cost,
        health: row.health,
        parts: row.parts,
        mechanic: row.mechanic,
      };
    },
  },
  tolls: {
    table: "tolls",
    columns: ["id", "route_id", "plaza", "vehicle", "amount", "amount_value", "tag"],
    ownerScoped: true,
    fromApi(payload) {
      return {
        ...payload,
        route_id: payload.route_id ?? payload.routeId,
        amount_value: Number(payload.amount_value ?? payload.amountValue ?? 0),
      };
    },
    toApi(row) {
      return {
        id: row.id,
        routeId: row.route_id,
        plaza: row.plaza,
        vehicle: row.vehicle,
        amount: row.amount,
        amountValue: row.amount_value,
        tag: row.tag,
      };
    },
  },
  tyres: {
    table: "tyres",
    columns: ["id", "position", "tyre", "tread", "rotation"],
    ownerScoped: true,
  },
  expenses: {
    table: "expenses",
    columns: ["id", "type", "amount", "period", "trend"],
    ownerScoped: true,
  },
  parts: {
    table: "parts",
    columns: ["id", "vehicle", "name", "stock", "unit_cost", "status"],
    ownerScoped: true,
    fromApi(payload) {
      return {
        ...payload,
        stock: Number(payload.stock || 0),
        unit_cost: Number(payload.unit_cost ?? payload.unitCost ?? 0),
      };
    },
    toApi(row) {
      return {
        id: row.id,
        vehicle: row.vehicle,
        name: row.name,
        stock: row.stock,
        unitCost: row.unit_cost,
        status: row.status,
      };
    },
  },
  truckReports: {
    table: "truck_reports",
    columns: ["id", "vehicle", "trips", "revenue", "expense", "profit", "utilization"],
    ownerScoped: true,
  },
  financeBars: {
    table: "finance_bars",
    columns: ["id", "label", "value", "color"],
  },
};

const collections = new Set(Object.keys(collectionConfig));
const resourceAliases = {
  "expense-notes": "expenseNotes",
  expense_notes: "expenseNotes",
  "maintenance-notes": "maintenanceNotes",
  maintenance_notes: "maintenanceNotes",
};

async function readJsonDb() {
  const raw = await readFile(DB_PATH, "utf8");
  return JSON.parse(raw);
}

async function writeJsonDb(db) {
  await writeFile(DB_PATH, `${JSON.stringify(db, null, 2)}\n`, "utf8");
}

function sendJson(res, status, payload) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  });
  res.end(JSON.stringify(payload));
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function nextId(collection, prefix) {
  return `${prefix}-${Date.now().toString(36)}-${collection.length + 1}`;
}

function publicUser(user) {
  const { password, ...safeUser } = user;
  return safeUser;
}

function signToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

function getBearerToken(req) {
  const header = req.headers.authorization || "";
  return header.startsWith("Bearer ") ? header.slice(7) : "";
}

function requireAuth(req) {
  const token = getBearerToken(req);
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

function toApi(resource, row) {
  return collectionConfig[resource].toApi ? collectionConfig[resource].toApi(row) : row;
}

function fromApi(resource, payload) {
  return collectionConfig[resource].fromApi ? collectionConfig[resource].fromApi(payload) : payload;
}

function parseMoney(value) {
  return Number(String(value || "0").replace(/[^0-9.-]/g, "")) || 0;
}

async function pgQuery(sql, params = []) {
  if (!pool) throw new Error("DATABASE_URL is not configured");
  return pool.query(sql, params);
}

async function getCollection(resource, session = null, options = {}) {
  if (!pool) {
    const db = await readJsonDb();
    const rows = resource === "users" ? db.users.map(publicUser) : db[resource];
    if (collectionConfig[resource]?.ownerScoped) {
      if (options.publicPreview) {
        return (rows || []).filter((row) => row.ownerId === undefined || row.ownerId === null);
      }
      if (session) {
        return (rows || []).filter((row) => row.ownerId === session.sub);
      }
    }
    return rows || [];
  }

  const config = collectionConfig[resource];
  const columns = resource === "users" ? config.publicColumns : config.columns;
  let sql = `select ${columns.join(", ")} from ${config.table}`;
  const params = [];
  if (config.ownerScoped) {
    if (options.publicPreview) {
      sql += " where owner_id is null";
    } else if (session) {
      sql += " where owner_id = $1";
      params.push(session.sub);
    }
  }
  sql += " order by id asc";
  const result = await pgQuery(sql, params);
  return result.rows.map((row) => toApi(resource, row));
}

async function createRecord(resource, payload, session = null) {
  if (!pool) {
    const db = await readJsonDb();
    const record = {
      ...payload,
      id: payload.id || nextId(db[resource], resource.slice(0, 3).toUpperCase()),
      ownerId: collectionConfig[resource]?.ownerScoped ? session?.sub : payload.ownerId,
    };
    db[resource].push(record);
    await writeJsonDb(db);
    return resource === "users" ? publicUser(record) : record;
  }

  const config = collectionConfig[resource];
  const record = fromApi(resource, {
    ...payload,
    id: payload.id || `${resource.slice(0, 3).toUpperCase()}-${Date.now().toString(36)}`,
  });
  const columns = config.columns.filter((column) => record[column] !== undefined);
  if (config.ownerScoped && session) {
    columns.push("owner_id");
    record.owner_id = session.sub;
  }
  const placeholders = columns.map((_, index) => `$${index + 1}`).join(", ");
  const values = columns.map((column) => record[column]);
  const result = await pgQuery(
    `insert into ${config.table} (${columns.join(", ")}) values (${placeholders}) returning *`,
    values
  );
  const row = toApi(resource, result.rows[0]);
  return resource === "users" ? publicUser(row) : row;
}

async function updateRecord(resource, id, payload, session = null) {
  if (!pool) {
    const db = await readJsonDb();
    const index = db[resource].findIndex((item) => item.id === id && (!collectionConfig[resource]?.ownerScoped || item.ownerId === session?.sub));
    if (index === -1) return null;
    db[resource][index] = { ...db[resource][index], ...payload, id };
    await writeJsonDb(db);
    return resource === "users" ? publicUser(db[resource][index]) : db[resource][index];
  }

  const config = collectionConfig[resource];
  const record = fromApi(resource, payload);
  const columns = config.columns.filter((column) => column !== "id" && record[column] !== undefined);
  if (!columns.length) return null;
  const assignments = columns.map((column, index) => `${column} = $${index + 1}`).join(", ");
  const values = columns.map((column) => record[column]);
  const ownerClause = config.ownerScoped && session ? ` and owner_id = $${columns.length + 2}` : "";
  const result = await pgQuery(
    `update ${config.table} set ${assignments} where id = $${columns.length + 1}${ownerClause} returning *`,
    config.ownerScoped && session ? [...values, id, session.sub] : [...values, id]
  );
  if (!result.rows[0]) return null;
  const row = toApi(resource, result.rows[0]);
  return resource === "users" ? publicUser(row) : row;
}

async function deleteRecord(resource, id, session = null) {
  if (!pool) {
    const db = await readJsonDb();
    const index = db[resource].findIndex((item) => item.id === id && (!collectionConfig[resource]?.ownerScoped || item.ownerId === session?.sub));
    if (index === -1) return false;
    db[resource].splice(index, 1);
    await writeJsonDb(db);
    return true;
  }

  const config = collectionConfig[resource];
  const sql = config.ownerScoped && session
    ? `delete from ${config.table} where id = $1 and owner_id = $2`
    : `delete from ${config.table} where id = $1`;
  const result = await pgQuery(sql, config.ownerScoped && session ? [id, session.sub] : [id]);
  return result.rowCount > 0;
}

function computedMetrics({ vehicles, routes, loads, maintenance, truckReports, trips, globalExpense = 0 }) {
  const revenue = truckReports.reduce((sum, row) => sum + Number(row.revenue || 0), 0);
  const profit = truckReports.reduce((sum, row) => sum + Number(row.profit || 0), 0) - globalExpense;
  const activeTrips = trips.length || loads.length;
  return [
    { id: "metric-owned-1", label: "Active trucks", value: String(vehicles.length), delta: `${routes.length} routes planned` },
    { id: "metric-owned-2", label: "On-time trips", value: activeTrips ? "92%" : "0%", delta: `${activeTrips} trip records` },
    { id: "metric-owned-3", label: "Monthly profit", value: `Rs.${profit.toLocaleString("en-IN")}`, delta: `Revenue Rs.${revenue.toLocaleString("en-IN")}` },
    { id: "metric-owned-4", label: "Fleet alerts", value: String(maintenance.length), delta: "maintenance records" },
  ];
}

function buildTripSummaries({ trips, tripLoads, tripExpenses, tripPayments, tripNotes, fuelEntries }) {
  return trips.map((trip) => {
    const legacyIncome = Number(trip.freightPrice || 0);
    const legacyExpense = Number(trip.totalExpense || 0);
    const loads = tripLoads.filter((load) => load.tripId === trip.id);
    const displayLoads = loads.length ? loads : legacyIncome > 0 ? [{
      id: `legacy-load-${trip.id}`,
      tripId: trip.id,
      source: trip.origin,
      destination: trip.destination,
      party: "Freight",
      description: trip.load || "Legacy freight entry",
      freightAmount: legacyIncome,
      loadingDate: trip.startDate,
      unloadingDate: trip.endDate,
      paymentStatus: "Pending",
      receivedAmount: 0,
      pendingAmount: legacyIncome,
      invoiceNumber: "",
      lrNumber: "",
      podStatus: "Pending",
      notes: "Created from old trip freight total",
    }] : [];
    const expenses = tripExpenses.filter((expense) => expense.tripId === trip.id);
    const legacyExpenses = [
      ["Fuel", trip.fuelExpense],
      ["Toll", trip.tollExpense],
      ["Driver allowance", trip.driverAllowance],
      ["Maintenance", trip.maintenanceExpense],
      ["Other", trip.otherExpense],
    ].filter(([, amount]) => Number(amount || 0) > 0).map(([description, amount], index) => ({
      id: `legacy-expense-${trip.id}-${index}`,
      tripId: trip.id,
      description,
      amount: Number(amount || 0),
      expenseDate: trip.startDate,
      category: description,
      paidBy: trip.driver || "",
      paymentMethod: "",
      notes: "Created from old trip expense total",
    }));
    const displayExpenses = expenses.length ? expenses : legacyExpenses;
    const payments = tripPayments.filter((payment) => payment.tripId === trip.id);
    const notes = tripNotes.filter((note) => note.tripId === trip.id);
    const fuel = fuelEntries.filter((entry) => entry.tripId === trip.id || (entry.vehicle && entry.vehicle === trip.vehicle));
    const totalFreight = loads.length ? loads.reduce((sum, load) => sum + Number(load.freightAmount || 0), 0) : legacyIncome;
    const loadReceived = loads.reduce((sum, load) => sum + Number(load.receivedAmount || 0), 0);
    const paymentReceived = payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
    const received = Math.max(loadReceived, paymentReceived);
    const pending = Math.max(totalFreight - received, 0);
    const ledgerExpense = expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
    const fuelExpense = fuel.reduce((sum, entry) => sum + Number(entry.totalAmount || 0), 0);
    const totalExpenses = expenses.length || fuel.length ? ledgerExpense + fuelExpense : legacyExpense;
    const profit = totalFreight - totalExpenses;
    const distance = parseMoney(trip.km);
    return {
      ...trip,
      loads: displayLoads,
      expenses: displayExpenses,
      payments,
      notes,
      fuelEntries: fuel,
      totalFreight,
      received,
      pending,
      totalExpenses,
      profit,
      profitMargin: totalFreight ? (profit / totalFreight) * 100 : 0,
      distance,
      profitPerKm: distance ? profit / distance : 0,
    };
  });
}

function computedTruckReportsFromTripSummaries({ vehicles, tripSummaries, expenseNotes, maintenanceNotes, maintenance }) {
  const vehicleNumbers = vehicles.map((vehicle) => vehicle.number).filter(Boolean);
  const tripVehicles = [...new Set(tripSummaries.map((trip) => trip.vehicle).filter(Boolean))];
  const reportVehicles = [...new Set([...vehicleNumbers, ...tripVehicles])];

  return reportVehicles.map((vehicle, index) => {
    const vehicleTrips = tripSummaries.filter((trip) => trip.vehicle === vehicle);
    const revenue = vehicleTrips.reduce((sum, trip) => sum + Number(trip.totalFreight || 0), 0);
    const tripExpense = vehicleTrips.reduce((sum, trip) => sum + Number(trip.totalExpenses || 0), 0);
    const noteExpense = expenseNotes.filter((note) => note.vehicle === vehicle).reduce((sum, note) => sum + Number(note.amount || 0), 0);
    const maintenanceNoteExpense = maintenanceNotes.filter((note) => note.vehicle === vehicle).reduce((sum, note) => sum + Number(note.totalCost || 0), 0);
    const hasTripMaintenance = vehicleTrips.some((trip) => Number(trip.maintenanceExpense || 0) > 0);
    const legacyMaintenanceExpense = hasTripMaintenance ? 0 : maintenance.filter((item) => item.vehicle === vehicle).reduce((sum, item) => sum + parseMoney(item.cost), 0);
    const expense = tripExpense + noteExpense + maintenanceNoteExpense + legacyMaintenanceExpense;
    const distance = vehicleTrips.reduce((sum, trip) => sum + Number(trip.distance || 0), 0);
    return {
      id: `trip-report-${index}-${vehicle}`,
      vehicle,
      trips: vehicleTrips.length,
      revenue,
      expense,
      profit: revenue - expense,
      utilization: vehicleTrips.length ? Math.min(100, 68 + vehicleTrips.length * 7) : 0,
      distance,
      averageProfit: vehicleTrips.length ? (revenue - expense) / vehicleTrips.length : 0,
      profitPerKm: distance ? (revenue - expense) / distance : 0,
    };
  });
}

function computedTruckReports({ vehicles, routes, expenses }) {
  const totalRevenue = routes.reduce((sum, row) => sum + Number(row.freightRevenue || 0), 0);
  const totalExpense = routes.reduce((sum, row) => sum + Number(row.fuelCost || 0) + Number(row.tollTotal || 0) + Number(row.driverAllowance || 0) + Number(row.otherExpense || 0), 0);
  const perVehicleRevenue = vehicles.length ? Math.max(totalRevenue / vehicles.length, 0) : 0;
  const perVehicleExpense = vehicles.length ? Math.max(totalExpense / vehicles.length, 0) : 0;
  return vehicles.map((vehicle, index) => ({
    id: `report-${vehicle.id || index}`,
    vehicle: vehicle.number || vehicle.model || `Truck ${index + 1}`,
    trips: Math.max(1, routes.length ? Math.min(12, routes.length + index) : 1),
    revenue: perVehicleRevenue + index * 12000 + (Number(expenses[0]?.amount || 0) / Math.max(vehicles.length, 1)),
    expense: perVehicleExpense + index * 4500,
    profit: perVehicleRevenue - perVehicleExpense + index * 8000,
    utilization: Math.min(100, 70 + index * 6),
  }));
}

function computedAlerts({ vehicles, maintenance, tyres, routes }) {
  const alerts = [];
  maintenance.forEach((item) => {
    const dateValue = new Date(item.date || "");
    const isDueSoon = !Number.isNaN(dateValue) && dateValue.getTime() <= Date.now() + 1000 * 60 * 60 * 24 * 14;
    const isCritical = String(item.health || "").toLowerCase().includes("critical") || String(item.task || "").toLowerCase().includes("brake");
    if (isCritical || isDueSoon) {
      alerts.push({
        id: `alert-maint-${item.id}`,
        title: `${item.vehicle} service due`,
        detail: `${item.task} scheduled on ${item.date || "soon"}`,
        severity: isCritical ? "high" : "medium",
      });
    }
  });

  tyres.forEach((tyre) => {
    const tread = Number(String(tyre.tread || "0").replace(/%/g, ""));
    if (tread < 60 || String(tyre.rotation || "").toLowerCase().includes("rotate")) {
      alerts.push({
        id: `alert-tyre-${tyre.id}`,
        title: `${tyre.position} tyre needs attention`,
        detail: `${tyre.tyre} has ${tyre.tread || "low"} tread`,
        severity: tread < 40 ? "high" : "medium",
      });
    }
  });

  vehicles.forEach((vehicle) => {
    const permitValue = String(vehicle.permit || "").trim();
    const permitDate = permitValue.match(/(\d{4}-\d{2}-\d{2})/);
    if (permitDate) {
      const expiry = new Date(permitDate[1]);
      const daysLeft = Math.ceil((expiry - new Date()) / (1000 * 60 * 60 * 24));
      if (daysLeft <= 30) {
        alerts.push({
          id: `alert-permit-${vehicle.id}`,
          title: `${vehicle.number} permit expires soon`,
          detail: `Permit expires in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`,
          severity: daysLeft <= 7 ? "high" : "medium",
        });
      }
    }
  });

  routes.forEach((route) => {
    const toll = Number(route.tollTotal || 0);
    const fuel = Number(route.fuelCost || 0);
    if (toll + fuel > 150000) {
      alerts.push({
        id: `alert-route-${route.id}`,
        title: `${route.from} → ${route.to} is expensive`,
        detail: `Estimated tolls and fuel exceed the threshold for this haul`,
        severity: "medium",
      });
    }
  });

  return alerts.slice(0, 6);
}

async function getDashboard(session = null, options = {}) {
  const [
    routes,
    loads,
    drivers,
    vehicles,
    maintenance,
    tolls,
    tyres,
    expenses,
    parts,
    trips,
    expenseNotes,
    maintenanceNotes,
    tripLoads,
    tripExpenses,
    tripPayments,
    tripNotes,
    fuelEntries,
    truckReports,
    financeBars,
  ] = await Promise.all([
    getCollection("routes", session, options),
    getCollection("loads", session, options),
    getCollection("drivers", session, options),
    getCollection("vehicles", session, options),
    getCollection("maintenance", session, options),
    getCollection("tolls", session, options),
    getCollection("tyres", session, options),
    getCollection("expenses", session, options),
    getCollection("parts", session, options),
    getCollection("trips", session, options),
    getCollection("expenseNotes", session, options).catch(() => []),
    getCollection("maintenanceNotes", session, options).catch(() => []),
    getCollection("tripLoads", session, options).catch(() => []),
    getCollection("tripExpenses", session, options).catch(() => []),
    getCollection("tripPayments", session, options).catch(() => []),
    getCollection("tripNotes", session, options).catch(() => []),
    getCollection("fuelEntries", session, options).catch(() => []),
    getCollection("truckReports", session, options),
    getCollection("financeBars", session, options),
  ]);
  const tripSummaries = buildTripSummaries({ trips, tripLoads, tripExpenses, tripPayments, tripNotes, fuelEntries });
  const dynamicTruckReports = options.publicPreview
    ? truckReports
    : trips.length
      ? computedTruckReportsFromTripSummaries({ vehicles, tripSummaries, expenseNotes, maintenanceNotes, maintenance })
      : computedTruckReports({ vehicles, routes, expenses });
  const globalExpense = [
    ...expenseNotes.filter((note) => !note.vehicle).map((note) => Number(note.amount || 0)),
    ...maintenanceNotes.filter((note) => !note.vehicle).map((note) => Number(note.totalCost || 0)),
  ].reduce((sum, value) => sum + value, 0);
  const metrics = options.publicPreview
    ? await getCollection("metrics", session, options)
    : computedMetrics({ vehicles, routes, loads, maintenance, truckReports: dynamicTruckReports, trips, globalExpense });
  const alerts = computedAlerts({ vehicles, maintenance, tyres, routes });

  return {
    metrics,
    routes,
    loads,
    drivers,
    vehicles,
    maintenance,
    tolls,
    tyres,
    expenses,
    parts,
    trips,
    tripSummaries,
    expenseNotes,
    maintenanceNotes,
    tripLoads,
    tripExpenses,
    tripPayments,
    tripNotes,
    fuelEntries,
    truckReports: dynamicTruckReports,
    financeBars,
    alerts,
    financialSummary: {
      projectedRevenue: `Rs.${(dynamicTruckReports.reduce((sum, row) => sum + Number(row.revenue || 0), 0) / 100000).toFixed(1)}L`,
      fuelExpense: `Rs.${(routes.reduce((sum, row) => sum + Number(row.fuelCost || 0), 0) / 100000).toFixed(1)}L`,
      netProfit: `Rs.${((dynamicTruckReports.reduce((sum, row) => sum + Number(row.profit || 0), 0) - globalExpense) / 100000).toFixed(1)}L`,
    },
  };
}

async function login(email, password) {
  if (!pool) {
    const db = await readJsonDb();
    return db.users.find((user) => user.email === email && user.password === password);
  }

  const result = await pgQuery(
    "select id, name, email, password, role from users where email = $1 and password = $2 limit 1",
    [email, password]
  );
  return result.rows[0];
}

async function findUserByEmail(email) {
  if (!pool) {
    const db = await readJsonDb();
    return db.users.find((user) => user.email === email);
  }

  const result = await pgQuery(
    "select id, name, email, password, role from users where email = $1 limit 1",
    [email]
  );
  return result.rows[0];
}

async function createOwnerUser({ name, email, password }) {
  const existing = await findUserByEmail(email);
  if (existing) return { error: "Account already exists for this email" };

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = {
    id: `user-${Date.now().toString(36)}`,
    name,
    email,
    password: hashedPassword,
    role: "Owner",
  };

  if (!pool) {
    const db = await readJsonDb();
    db.users.push(user);
    await writeJsonDb(db);
    return { user };
  }

  const result = await pgQuery(
    "insert into users (id, name, email, password, role) values ($1, $2, $3, $4, $5) returning id, name, email, password, role",
    [user.id, user.name, user.email, user.password, user.role]
  );
  return { user: result.rows[0] };
}

async function verifyPassword(user, password) {
  if (!user) return false;
  if (user.password?.startsWith("$2")) return bcrypt.compare(password, user.password);
  return user.password === password;
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const [, api, rawResource, id] = url.pathname.split("/");
    const resource = resourceAliases[rawResource] || rawResource;

    if (req.method === "OPTIONS") return sendJson(res, 204, {});
    if (api !== "api") return sendJson(res, 404, { error: "Route not found" });

    if (resource === "health" && req.method === "GET") {
      if (pool) await pgQuery("select 1");
      return sendJson(res, 200, {
        status: "ok",
        database: pool ? "neon-postgres" : "local-json",
      });
    }

    if (resource === "public-dashboard" && req.method === "GET") {
      return sendJson(res, 200, await getDashboard(null, { publicPreview: true }));
    }

    if (resource === "auth" && id === "login" && req.method === "POST") {
      const { email, password } = await readBody(req);
      const user = await findUserByEmail(email);
      if (!(await verifyPassword(user, password))) {
        return sendJson(res, 401, { error: "Invalid email or password" });
      }
      return sendJson(res, 200, {
        token: signToken(user),
        user: publicUser(user),
      });
    }

    if (resource === "auth" && id === "signup" && req.method === "POST") {
      const { name, email, password } = await readBody(req);
      if (!name || !email || !password) {
        return sendJson(res, 400, { error: "Name, email, and password are required" });
      }
      if (password.length < 6) {
        return sendJson(res, 400, { error: "Password must be at least 6 characters" });
      }
      const result = await createOwnerUser({ name, email, password });
      if (result.error) return sendJson(res, 409, { error: result.error });
      return sendJson(res, 201, {
        token: signToken(result.user),
        user: publicUser(result.user),
      });
    }

    if (resource === "auth" && id === "me" && req.method === "GET") {
      const session = requireAuth(req);
      if (!session) return sendJson(res, 401, { error: "Unauthorized" });
      const user = await findUserByEmail(session.email);
      if (!user) return sendJson(res, 401, { error: "Unauthorized" });
      return sendJson(res, 200, { user: publicUser(user) });
    }

    const publicRoutes = resource === "health" || resource === "auth";
    const session = requireAuth(req);
    if (!publicRoutes && !session) {
      return sendJson(res, 401, { error: "Unauthorized" });
    }

    if (resource === "dashboard" && req.method === "GET") {
      return sendJson(res, 200, await getDashboard(session));
    }

    if (!collections.has(resource)) return sendJson(res, 404, { error: "Unknown resource" });

    if (req.method === "GET") return sendJson(res, 200, await getCollection(resource, session));

    if (req.method === "POST") {
      return sendJson(res, 201, await createRecord(resource, await readBody(req), session));
    }

    if (req.method === "PUT" && id) {
      const record = await updateRecord(resource, id, await readBody(req), session);
      if (!record) return sendJson(res, 404, { error: "Record not found" });
      return sendJson(res, 200, record);
    }

    if (req.method === "DELETE" && id) {
      const deleted = await deleteRecord(resource, id, session);
      if (!deleted) return sendJson(res, 404, { error: "Record not found" });
      return sendJson(res, 200, { deleted: id });
    }

    return sendJson(res, 405, { error: "Method not allowed" });
  } catch (error) {
    console.error('Unhandled request error:', error && (error.stack || error));
    return sendJson(res, 500, { error: error.message });
  }
});

server.listen(PORT, () => {
  console.log(`FleetOps backend running on http://localhost:${PORT}`);
  console.log(`Database mode: ${pool ? "neon-postgres" : "local-json"}`);
});
