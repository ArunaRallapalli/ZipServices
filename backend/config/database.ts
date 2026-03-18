/**
 * PRIMARY DATABASE CONNECTION FOR RENDER (PRODUCTION & DEV)
 * Uses DATABASE_URL connection string from environment variables.
 * This is the correct pool to import in all route files including stripe.ts.
 * Usage: import { pool } from '../config/database';
 */


import dns from 'dns';
import { Pool } from 'pg';

// 🔐 Force IPv4 on Render (CRITICAL)
dns.setDefaultResultOrder('ipv4first');

// ❌ Never fallback silently
if (!process.env.DATABASE_URL) {
  throw new Error('❌ DATABASE_URL is not set');
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10, // better for Render
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

console.log('✅ PostgreSQL pool created');

pool.on('connect', () => {
  console.log('✅ Database connected');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected database error:', err);
  process.exit(1);
});
