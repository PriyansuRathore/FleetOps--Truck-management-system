import {
  collections,
  createOwnerUser,
  createRecord,
  deleteRecord,
  exportWorkspaceBackup,
  findUserByEmail,
  getCollection,
  getDashboard,
  pgQuery,
  pool,
  publicUser,
  readBody,
  replaceWorkspaceBackup,
  requireAuth,
  resourceAliases,
  sendJson,
  signToken,
  updateRecord,
  verifyPassword,
} from "../models/fleetModel.js";

export async function handleApiRequest(req, res) {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const [, api, rawResource, id] = url.pathname.split("/");
    const resource = resourceAliases[rawResource] || rawResource;

    if (req.method === "OPTIONS") return sendJson(res, 204, {});
    if (api !== "api") return sendJson(res, 404, { error: "Route not found" });

    if (resource === "health" && req.method === "GET") {
      if (pool) await pgQuery("select 1");
      return sendJson(res, 200, { status: "ok", database: pool ? "neon-postgres" : "local-json" });
    }

    if (resource === "public-dashboard" && req.method === "GET") {
      return sendJson(res, 200, await getDashboard(null, { publicPreview: true }));
    }

    if (resource === "auth" && id === "login" && req.method === "POST") {
      const { email, password } = await readBody(req);
      const user = await findUserByEmail(email);
      if (!(await verifyPassword(user, password))) return sendJson(res, 401, { error: "Invalid email or password" });
      return sendJson(res, 200, { token: signToken(user), user: publicUser(user) });
    }

    if (resource === "auth" && id === "signup" && req.method === "POST") {
      const { name, email, password } = await readBody(req);
      if (!name || !email || !password) return sendJson(res, 400, { error: "Name, email, and password are required" });
      if (password.length < 6) return sendJson(res, 400, { error: "Password must be at least 6 characters" });
      const result = await createOwnerUser({ name, email, password });
      if (result.error) return sendJson(res, 409, { error: result.error });
      return sendJson(res, 201, { token: signToken(result.user), user: publicUser(result.user) });
    }

    if (resource === "auth" && id === "me" && req.method === "GET") {
      const session = requireAuth(req);
      if (!session) return sendJson(res, 401, { error: "Unauthorized" });
      const user = await findUserByEmail(session.email);
      if (!user) return sendJson(res, 401, { error: "Unauthorized" });
      return sendJson(res, 200, { user: publicUser(user) });
    }

    const session = requireAuth(req);
    if (!session && resource !== "auth") return sendJson(res, 401, { error: "Unauthorized" });

    if (resource === "dashboard" && req.method === "GET") return sendJson(res, 200, await getDashboard(session));
    if (resource === "backup" && id === "export" && req.method === "GET") return sendJson(res, 200, await exportWorkspaceBackup(session));
    if (resource === "backup" && id === "import" && req.method === "POST") return sendJson(res, 200, await replaceWorkspaceBackup(session, await readBody(req)));
    if (!collections.has(resource)) return sendJson(res, 404, { error: "Unknown resource" });
    if (req.method === "GET") return sendJson(res, 200, await getCollection(resource, session));
    if (req.method === "POST") return sendJson(res, 201, await createRecord(resource, await readBody(req), session));

    if (req.method === "PUT" && id) {
      const record = await updateRecord(resource, id, await readBody(req), session);
      return record ? sendJson(res, 200, record) : sendJson(res, 404, { error: "Record not found" });
    }

    if (req.method === "DELETE" && id) {
      const deleted = await deleteRecord(resource, id, session);
      return deleted ? sendJson(res, 200, { deleted: id }) : sendJson(res, 404, { error: "Record not found" });
    }

    return sendJson(res, 405, { error: "Method not allowed" });
  } catch (error) {
    console.error("Unhandled request error:", error && (error.stack || error));
    return sendJson(res, 500, { error: error.message });
  }
}
