import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

const pool = new Pool({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT ? Number(process.env.PG_PORT) : 5432,
  
  // Connection pool settings
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 10000, // Increased from 5000
  
  ssl: process.env.PG_HOST?.includes('supabase') ? {
    rejectUnauthorized: false,
  } : false,
});

// Better error handling
pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  pool.end();
});

export default pool;