import dotenv from 'dotenv';
dotenv.config();

console.log('🔍 Environment Variables Check\n');

const requiredVars = [
  'NODE_ENV',
  'SUPABASE_URL',
  'SUPABASE_KEY',
  'JWT_SECRET',
];

const optionalVars = [
  'PORT',
  'FRONTEND_URL',
  'RESEND_API_KEY',
];

console.log('Required Variables:');
requiredVars.forEach(varName => {
  const value = process.env[varName];
  const status = value ? '✅' : '❌';
  const display = value ? `SET (${value.length} chars)` : 'NOT SET';
  console.log(`  ${status} ${varName}: ${display}`);
});

console.log('\nOptional Variables:');
optionalVars.forEach(varName => {
  const value = process.env[varName];
  const status = value ? '✅' : '⚠️';
  const display = value ? `SET (${value.length} chars)` : 'NOT SET';
  console.log(`  ${status} ${varName}: ${display}`);
});
