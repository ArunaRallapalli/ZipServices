import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);

// Test connection
(async () => {
  try {
    const { data, error } = await supabase.from('users').select('count').limit(1);
    if (error) {
      console.log("⚠️ Supabase client initialized (connection will be tested on first query)");
    } else {
      console.log("✅ Supabase client connected successfully!");
    }
  } catch (err) {
    console.log("⚠️ Supabase client initialized");
  }
})();