import http from "node:http";
import { createApiRouter } from "./routes/apiRoutes.js";
import { pool } from "./models/fleetModel.js";

const port = Number(process.env.PORT || 4000);
const apiRouter = createApiRouter();
const server = http.createServer(apiRouter);

server.listen(port, () => {
  console.log(`FleetOps backend running on http://localhost:${port}`);
  console.log(`Database mode: ${pool ? "neon-postgres" : "local-json"}`);
});
