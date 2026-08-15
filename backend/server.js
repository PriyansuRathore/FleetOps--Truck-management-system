import express from "express";
import { createApiRouter } from "./routes/apiRoutes.js";
import { pool } from "./models/fleetModel.js";

const port = Number(process.env.PORT || 4000);
const app = express();
const allowedOrigins = (process.env.CORS_ORIGINS || "http://localhost:5173,http://127.0.0.1:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Vary", "Origin");
  }
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return origin && !allowedOrigins.includes(origin)
    ? res.sendStatus(403)
    : res.sendStatus(204);
  next();
});
app.use(express.json());
app.use("/api", createApiRouter());
app.use((req, res) => res.status(404).json({ error: "Route not found" }));

app.listen(port, "0.0.0.0", () => {
  console.log(`FleetOps backend running on http://localhost:${port}`);
  console.log(`Database mode: ${pool ? "neon-postgres" : "local-json"}`);
});
