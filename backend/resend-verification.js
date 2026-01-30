const { Pool } = require('pg');
const { Resend } = require('resend');
const crypto = require('crypto');
require('dotenv').config();

console.log('🔍 Checking environment variables...');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Found ✅' : 'Missing ❌');
console.log('RESEND_API_KEY:', process.env.RESEND_API_KEY ? 'Found ✅' : 'Missing ❌');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const resend = new Resend(process.env.RESEND_API_KEY);
const email = 'aruna.prabha2003@gmail.com';

async function resendVerification() {
  try {
    console.log('\n📧 Resending verification for:', email);
    
    // First, test database connection
    console.log('🔌 Testing database connection...');
    const testQuery = await pool.query('SELECT NOW()');
    console.log('✅ Database connected:', testQuery.rows[0].now);
    
    // Check if users table exists
    console.log('\n🔍 Checking users table...');
    const tableCheck = await pool.query(`
      SELECT COUNT(*) FROM users
    `);
    console.log('✅ Users table has', tableCheck.rows[0].count, 'users');
    
    // List all emails to see what's there
    console.log('\n📋 All emails in database:');
    const allEmails = await pool.query('SELECT email FROM users LIMIT 10');
    allEmails.rows.forEach(row => console.log('   -', row.email));
    
    // Try to find the specific user
    console.log('\n🔍 Looking for user:', email);
    const userResult = await pool.query(
      'SELECT user_id, email, full_name, email_verified FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (userResult.rows.length === 0) {
      console.log('❌ User not found in database!');
      console.log('\n💡 Try one of these:');
      console.log('1. Use a different email from the list above');
      console.log('2. Register a new account first');
      console.log('3. Check if the email is spelled correctly');
      process.exit(1);
    }

    const user = userResult.rows[0];
    console.log('✅ Found user:');
    console.log('   ID:', user.user_id);
    console.log('   Email:', user.email);
    console.log('   Name:', user.full_name);
    console.log('   Verified:', user.email_verified);

    // Generate token
    console.log('\n🔑 Generating verification token...');
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(verificationToken).digest('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Invalidate old tokens
    console.log('🗑️  Invalidating old tokens...');
    await pool.query(
      'UPDATE email_verifications SET verified = true WHERE user_id = $1 AND verified = false',
      [user.user_id]
    );

    // Save new token
    console.log('💾 Saving new token...');
    await pool.query(
      'INSERT INTO email_verifications (user_id, verification_token, expires_at, verified) VALUES ($1, $2, $3, $4)',
      [user.user_id, hashedToken, expiresAt, false]
    );
    console.log('✅ Token saved');

    // Create link
    const verificationLink = `https://gozipmarket.com/verify-email.html?token=${verificationToken}&email=${encodeURIComponent(email)}`;
    console.log('\n🔗 Verification link:');
    console.log(verificationLink);

    // Send email
    console.log('\n📤 Sending email via Resend...');
    const result = await resend.emails.send({
      from: 'ZipService <noreply@gozipmarket.com>',
      to: email,
      subject: '✅ NEW Verification Link - ZipService',
      html: `
        <h1>Email Verification</h1>
        <p>Hi ${user.full_name || 'there'},</p>
        <p><a href="${verificationLink}" style="background:#4CAF50;color:white;padding:12px 30px;text-decoration:none;border-radius:5px;display:inline-block;">Verify Email</a></p>
        <p>Or copy this link: ${verificationLink}</p>
      `
    });

    console.log('✅ Email sent successfully!');
    console.log('📧 Email ID:', result.id);
    console.log('\n📬 Next steps:');
    console.log('1. Check inbox for:', email);
    console.log('2. Click the verification link');
    console.log('3. Should see "Email Verified! 🎉"');
    console.log('4. Try logging in!');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('\nFull error:', error);
  } finally {
    await pool.end();
  }
}

resendVerification();