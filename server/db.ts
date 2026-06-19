import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set. Please configure your database connection.");
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes("localhost") ? false : { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on("error", (err) => console.error("[db] Pool error:", err.message));

export const db = drizzle(pool, { schema });

export const poolReady: Promise<pg.Pool> = pool
  .connect()
  .then((client) => {
    client.release();
    console.log("[db] Connected successfully.");
    return pool;
  })
  .catch((err) => {
    console.error("[db] Connection failed:", err.message);
    throw err;
  });
