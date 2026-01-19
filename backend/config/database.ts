import { Pool } from 'pg';

// Build connection string from environment variables
const connectionString = process.env.DATABASE_URL || 
  `postgresql://postgres.aorpdjxljwnxggjnofx:${process.env.SUPABASE_KEY}@aws-1-us-west-1.pooler.supabase.com:5432/postgres`;

export const pool = new Pool({
  connectionString,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

console.log('✅ PostgreSQL pool created');

pool.on('connect', () => {
  console.log('✅ Database connected');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected database error:', err);
});
