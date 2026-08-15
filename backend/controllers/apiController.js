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
  replaceWorkspaceBackup,
  requireAuth,
  resourceAliases,
  signToken,
  upgradeLegacyPassword,
  updateRecord,
  verifyPassword,
} from "../models/fleetModel.js";

const asyncRoute = (handler) => (req, res, next) => Promise.resolve(handler(req, res)).catch(next);

function requireSession(req, res) {
  const session = requireAuth(req);
  if (!session) res.status(401).json({ error: "Unauthorized" });
  return session;
}

export function createApiRouter(router) {
  router.get("/health", asyncRoute(async (_req, res) => {
    if (pool) await pgQuery("select 1");
    res.json({ status: "ok", database: pool ? "neon-postgres" : "local-json" });
  }));

  router.get("/public-dashboard", asyncRoute(async (_req, res) => {
    res.json(await getDashboard(null, { publicPreview: true }));
  }));

  router.post("/auth/login", asyncRoute(async (req, res) => {
    const { email, password } = req.body || {};
    const user = await findUserByEmail(email);
    if (!(await verifyPassword(user, password))) return res.status(401).json({ error: "Invalid email or password" });
    await upgradeLegacyPassword(user, password);
    res.json({ token: signToken(user), user: publicUser(user) });
  }));

  router.post("/auth/signup", asyncRoute(async (req, res) => {
    const { name, email, password } = req.body || {};
    if (!name || !email || !password) return res.status(400).json({ error: "Name, email, and password are required" });
    if (password.length < 6) return res.status(400).json({ error: "Password must be at least 6 characters" });
    const result = await createOwnerUser({ name, email, password });
    if (result.error) return res.status(409).json({ error: result.error });
    res.status(201).json({ token: signToken(result.user), user: publicUser(result.user) });
  }));

  router.get("/auth/me", asyncRoute(async (req, res) => {
    const session = requireSession(req, res);
    if (!session) return;
    const user = await findUserByEmail(session.email);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    res.json({ user: publicUser(user) });
  }));

  router.get("/dashboard", asyncRoute(async (req, res) => {
    const session = requireSession(req, res);
    if (session) res.json(await getDashboard(session));
  }));
  router.get("/backup/export", asyncRoute(async (req, res) => {
    const session = requireSession(req, res);
    if (session) res.json(await exportWorkspaceBackup(session));
  }));
  router.post("/backup/import", asyncRoute(async (req, res) => {
    const session = requireSession(req, res);
    if (session) res.json(await replaceWorkspaceBackup(session, req.body || {}));
  }));

  router.route("/:rawResource")
    .get(asyncRoute(async (req, res) => {
      const session = requireSession(req, res);
      if (!session) return;
      const resource = resourceAliases[req.params.rawResource] || req.params.rawResource;
      if (!collections.has(resource)) return res.status(404).json({ error: "Unknown resource" });
      res.json(await getCollection(resource, session));
    }))
    .post(asyncRoute(async (req, res) => {
      const session = requireSession(req, res);
      if (!session) return;
      const resource = resourceAliases[req.params.rawResource] || req.params.rawResource;
      if (!collections.has(resource)) return res.status(404).json({ error: "Unknown resource" });
      res.status(201).json(await createRecord(resource, req.body || {}, session));
    }));

  router.route("/:rawResource/:id")
    .put(asyncRoute(async (req, res) => {
      const session = requireSession(req, res);
      if (!session) return;
      const resource = resourceAliases[req.params.rawResource] || req.params.rawResource;
      if (!collections.has(resource)) return res.status(404).json({ error: "Unknown resource" });
      const record = await updateRecord(resource, req.params.id, req.body || {}, session);
      res.status(record ? 200 : 404).json(record || { error: "Record not found" });
    }))
    .delete(asyncRoute(async (req, res) => {
      const session = requireSession(req, res);
      if (!session) return;
      const resource = resourceAliases[req.params.rawResource] || req.params.rawResource;
      if (!collections.has(resource)) return res.status(404).json({ error: "Unknown resource" });
      const deleted = await deleteRecord(resource, req.params.id, session);
      res.status(deleted ? 200 : 404).json(deleted ? { deleted: req.params.id } : { error: "Record not found" });
    }));

  router.use((req, res) => res.status(404).json({ error: "Route not found" }));
  router.use((error, _req, res, _next) => {
    console.error("Unhandled request error:", error && (error.stack || error));
    res.status(500).json({ error: error.message || "Internal server error" });
  });
}
