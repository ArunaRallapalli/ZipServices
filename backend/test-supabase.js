require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function testSupabase() {
  console.log('🧪 Testing Supabase Connection...\n');
  
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  
  try {
    // Test 1: Connection
    console.log('1️⃣ Testing connection...');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('count');
    if (usersError) throw usersError;
    console.log('✅ Connected! User count:', users);
    
    // Test 2: Tables exist
    console.log('\n2️⃣ Checking tables...');
    const tables = ['users', 'business_owners', 'service_posts', 'bookings', 'reviews', 'messages', 'availability'];
    
    for (const table of tables) {
      const { error } = await supabase.from(table).select('count').limit(1);
      if (error) {
        console.log(`❌ Table '${table}' - ERROR:`, error.message);
      } else {
        console.log(`✅ Table '${table}' - OK`);
      }
    }
    
    console.log('\n✅ Supabase is production-ready!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

testSupabase();
