import "dotenv/config";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "..", ".env") });

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is missing in backend/.env");
  process.exit(1);
}

const schemaPath = join(__dirname, "..", "neon", "schema.sql");
const sql = await readFile(schemaPath, "utf8");
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

try {
  await pool.query(sql);
  console.log("Neon schema initialized successfully.");
} finally {
  await pool.end();
}
