import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_KEY!;

// Add fetch options to handle network issues
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  db: {
    schema: 'public'
  }
});

// Test connection (simplified for production)
(async () => {
  try {
    console.log('🔄 Initializing Supabase client...');
    console.log('📍 Supabase URL:', supabaseUrl ? '✓ Set' : '✗ NOT SET');
    console.log('🔑 Supabase Key:', supabaseKey ? '✓ Set' : '✗ NOT SET');
    
    const { data, error } = await supabase
      .from('users')
      .select('user_id')
      .limit(1);
    
    if (error) {
      console.log("⚠️ Supabase client initialized but connection test failed:", error.message);
    } else {
      console.log("✅ Supabase client connected successfully!");
    }
  } catch (err: any) {
    console.log("⚠️ Supabase client initialized (connection will be verified on first request)");
    console.error("Connection test error:", err.message);
  }
})();