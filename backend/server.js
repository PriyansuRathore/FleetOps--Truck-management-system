import express from "express";
import { createApiRouter } from "./routes/apiRoutes.js";
import { pool } from "./models/fleetModel.js";

const port = Number(process.env.PORT || 4000);
const app = express();

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});
app.use(express.json());
app.use("/api", createApiRouter());
app.use((req, res) => res.status(404).json({ error: "Route not found" }));

app.listen(port, () => {
  console.log(`FleetOps backend running on http://localhost:${port}`);
  console.log(`Database mode: ${pool ? "neon-postgres" : "local-json"}`);
});
