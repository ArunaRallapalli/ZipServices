import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

const pool = new Pool({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT ? Number(process.env.PG_PORT) : 5432,
  connectionTimeoutMillis: 5000,
  ssl: process.env.PG_HOST?.includes('supabase') ? {
    rejectUnauthorized: false,
  } : false,
});

// Silently handle pool errors - don't crash the server
pool.on('error', (err) => {
  // Silent - pool errors are non-critical when using Supabase
});

export default pool;