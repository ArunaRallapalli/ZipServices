/**
 * SUPABASE JAVASCRIPT CLIENT — FOR AUTH & REALTIME ONLY
 * Use this for: user authentication, storage, realtime subscriptions.
 * Do NOT use for raw SQL queries — use database.ts pool instead.
 * Usage: import { supabase } from '../config/supabase';
 */

import { createClient } from '@supabase/supabase-js';

// Render injects env vars directly - only use dotenv in development
if (process.env.NODE_ENV !== 'production') {
  try {
    const dotenv = require('dotenv');
    dotenv.config();
    console.log('📦 Loaded dotenv for development');
  } catch (e) {
    console.log('⚠️ dotenv not available (this is fine in production)');
  }
}

// Log environment for debugging
console.log('🔍 Environment:', process.env.NODE_ENV);
console.log('🔍 SUPABASE_URL raw value:', process.env.SUPABASE_URL);

const supabaseUrl = process.env.SUPABASE_URL?.trim();

// Support both SUPABASE_KEY (Render) and SUPABASE_SERVICE_ROLE_KEY (local dev)
const supabaseKey = (
  process.env.SUPABASE_KEY || 
  process.env.SUPABASE_SERVICE_ROLE_KEY
)?.trim();

console.log('🔍 SUPABASE_KEY exists:', !!supabaseKey);

if (!supabaseUrl) {
  console.error('❌ SUPABASE_URL is not set in environment variables');
  throw new Error('SUPABASE_URL environment variable is required');
}

if (!supabaseKey) {
  console.error('❌ SUPABASE_KEY or SUPABASE_SERVICE_ROLE_KEY is not set in environment variables');
  throw new Error('SUPABASE_KEY or SUPABASE_SERVICE_ROLE_KEY environment variable is required');
}

if (!supabaseUrl.startsWith('http://') && !supabaseUrl.startsWith('https://')) {
  console.error('❌ Invalid SUPABASE_URL format:', supabaseUrl);
  throw new Error(`SUPABASE_URL must start with http:// or https://, got: ${supabaseUrl}`);
}

console.log('✅ Supabase URL validated:', supabaseUrl);

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  db: {
    schema: 'public'
  }
});

console.log('✅ Supabase client created successfully');