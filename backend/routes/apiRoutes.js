import express from "express";
import { createApiRouter as createRouter } from "../controllers/apiController.js";

export function createApiRouter() {
  const router = express.Router();
  createRouter(router);
  return router;
}
