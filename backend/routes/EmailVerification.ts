/**
 * Email Verification API Routes
 * 
 * Handles email verification functionality:
 * 1. POST /api/email-verification/send - Send verification email
 * 2. POST /api/email-verification/verify - Verify token and mark email as verified
 */

/**
 * POST /api/email-verification/send
 * 
 * Send verification email to user
 * 
 * Body: { userId: number, email: string, fullName?: string }
 */
import { Router, Request, Response } from 'express';
import { Resend } from 'resend';
import crypto from 'crypto';
import pool from '../config/pool';
import dotenv from 'dotenv';
dotenv.config();

const router = Router();
const resend = new Resend(process.env.RESEND_API_KEY);
router.post('/send', async (req: Request, res: Response) => {
  const { userId, email, fullName } = req.body;

  console.log('📧 Email verification requested for:', email);

  try {
    // Validate inputs
    if (!userId || !email || !email.includes('@')) {
      return res.status(400).json({
        success: false,
        message: 'Valid user ID and email are required'
      });
    }

    // Check if user exists
    const userQuery = 'SELECT user_id, email, email_verified, full_name FROM users WHERE user_id = $1 AND email = $2';
    const userResult = await pool.query(userQuery, [userId, email.toLowerCase()]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const user = userResult.rows[0];

    // Check if already verified
    if (user.email_verified) {
      return res.status(200).json({
        success: true,
        message: 'Email already verified'
      });
    }

    // Generate secure random token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(verificationToken).digest('hex');

    // Token expires in 24 hours
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Mark any existing unused tokens as used (cleanup)
    await pool.query(
      'UPDATE email_verifications SET verified = true WHERE user_id = $1 AND verified = false',
      [userId]
    );

    // Save new verification token to database
    const insertQuery = `
      INSERT INTO email_verifications (user_id, verification_token, expires_at, verified)
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `;

    const insertResult = await pool.query(insertQuery, [
      userId,
      hashedToken,
      expiresAt,
      false
    ]);

    console.log('✅ Verification token saved, ID:', insertResult.rows[0].id);

    // Create verification link based on environment
    const isDevelopment = process.env.NODE_ENV !== 'production';
    const frontendUrl = isDevelopment 
      ? 'http://localhost:8081' 
      : 'https://gozipmarket.com';

    const verificationLink = `${frontendUrl}/verify-email.html?token=${verificationToken}&email=${encodeURIComponent(email)}`;

    console.log('🌍 Environment:', process.env.NODE_ENV);
    console.log('🔗 Verification link created');

    // Send verification email via Resend
    const emailResult = await resend.emails.send({
      from: 'ZipService <noreply@gozipmarket.com>',
      to: email,
      subject: 'Verify Your ZipService Email',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background-color: #4A90E2; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
              .button { display: inline-block; background-color: #4CAF50; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
              .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
              .info { background-color: #e3f2fd; border-left: 4px solid #2196F3; padding: 12px; margin: 20px 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Welcome to ZipService! 🎉</h1>
              </div>
              <div class="content">
                <p>Hi ${fullName || user.full_name || 'there'},</p>
                
                <p>Thank you for signing up for ZipService! We're excited to have you join our community.</p>
                
                <p>To complete your registration and start using all features, please verify your email address by clicking the button below:</p>
                
                <p style="text-align: center;">
                  <a href="${verificationLink}" class="button">Verify Email Address</a>
                </p>
                
                <p>Or copy and paste this link into your browser:</p>
                <p style="word-break: break-all; background-color: #eee; padding: 10px; border-radius: 4px;">
                  ${verificationLink}
                </p>
                
                <div class="info">
                  <strong>ℹ️ Important:</strong>
                  <ul>
                    <li>This link expires in 24 hours</li>
                    <li>If you didn't create an account, please ignore this email</li>
                    <li>Your account access is limited until email is verified</li>
                  </ul>
                </div>
                
                <p>Once verified, you'll be able to:</p>
                <ul>
                  <li>Post and manage your services</li>
                  <li>Connect with customers in your area</li>
                  <li>Send and receive messages</li>
                  <li>Build your business profile</li>
                </ul>
                
                <p>If you have any questions, feel free to reach out to our support team.</p>
                
                <p>Welcome aboard!</p>
                <p><strong>The ZipService Team</strong></p>
              </div>
              <div class="footer">
                <p>© 2025 ZipService - Zip Market LLC</p>
                <p>This is an automated email, please do not reply.</p>
              </div>
            </div>
          </body>
        </html>
      `
    });

    console.log('✅ Verification email sent:', emailResult);

    res.status(200).json({
      success: true,
      message: 'Verification email sent successfully'
    });

  } catch (error) {
    console.error('❌ Email verification send error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send verification email'
    });
  }
});

/**
 * POST /api/email-verification/verify
 * 
 * Verify email token and mark email as verified
 * 
 * Body: { email: string, token: string }
 */
router.post('/verify', async (req: Request, res: Response) => {
  const { email, token } = req.body;

  console.log('🔐 ===== EMAIL VERIFICATION START =====');
  console.log('📧 Email:', email);
  console.log('🔑 Token (first 10):', token ? token.substring(0, 10) : 'missing');

  try {
    // Validate inputs
    if (!email || !token) {
      console.log('❌ Missing email or token');
      return res.status(400).json({
        success: false,
        message: 'Email and token are required'
      });
    }

    // Get user
    const userQuery = 'SELECT user_id, email_verified FROM users WHERE email = $1';
    console.log('📊 Running query:', userQuery, [email.toLowerCase()]);
    
    const userResult = await pool.query(userQuery, [email.toLowerCase()]);
    console.log('📊 Query returned rows:', userResult.rows.length);

    if (userResult.rows.length === 0) {
      console.log('❌ User not found');
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const user = userResult.rows[0];
    console.log('👤 User found:');
    console.log('   user_id:', user.user_id, typeof user.user_id);
    console.log('   email_verified:', user.email_verified, typeof user.email_verified);

    // Check if already verified
    if (user.email_verified === true) {
      console.log('ℹ️ Email already verified - returning early');
      return res.status(200).json({
        success: true,
        message: 'Email already verified',
        alreadyVerified: true
      });
    }

    // Hash the token to compare with database
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    console.log('🔐 Hashed token (first 10):', hashedToken.substring(0, 10));

    // Check if token exists and is valid
    const tokenQuery = `
      SELECT id, user_id, expires_at, verified 
      FROM email_verifications 
      WHERE user_id = $1 AND verification_token = $2
      ORDER BY id DESC
      LIMIT 1
    `;
    console.log('📊 Token query params:', [user.user_id, hashedToken.substring(0, 10) + '...']);
    
    const tokenResult = await pool.query(tokenQuery, [user.user_id, hashedToken]);
    console.log('📊 Token query returned rows:', tokenResult.rows.length);

    if (tokenResult.rows.length === 0) {
      console.log('❌ Token not found');
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification link'
      });
    }

    const verificationRecord = tokenResult.rows[0];
    console.log('🎫 Verification record:');
    console.log('   id:', verificationRecord.id);
    console.log('   user_id:', verificationRecord.user_id);
    console.log('   verified:', verificationRecord.verified);
    console.log('   expires_at:', verificationRecord.expires_at);

    // Check if token already used
    if (verificationRecord.verified === true) {
      console.log('❌ Token already used');
      return res.status(400).json({
        success: false,
        message: 'This verification link has already been used'
      });
    }

    // Check if token expired
    if (new Date() > new Date(verificationRecord.expires_at)) {
      console.log('❌ Token expired');
      return res.status(400).json({
        success: false,
        message: 'This verification link has expired. Please request a new one.'
      });
    }

    // ✅ ALL CHECKS PASSED - NOW UPDATE DATABASE
    console.log('✅ All checks passed - updating database...');

    // Mark email as verified in users table
    const updateUserQuery = 'UPDATE users SET email_verified = TRUE, updated_at = CURRENT_TIMESTAMP WHERE user_id = $1 RETURNING user_id, email_verified, updated_at';
    console.log('📊 UPDATE users query:', [user.user_id]);
    
    const updateUserResult = await pool.query(updateUserQuery, [user.user_id]);
    console.log('📊 UPDATE users result:');
    console.log('   rowCount:', updateUserResult.rowCount);
    console.log('   rows:', JSON.stringify(updateUserResult.rows, null, 2));

    if (updateUserResult.rowCount === 0) {
      console.log('❌ UPDATE users failed - no rows affected!');
      throw new Error('Failed to update user - no rows affected');
    }

    // Mark token as used
    const updateTokenQuery = 'UPDATE email_verifications SET verified = true WHERE id = $1 RETURNING id, verified';
    console.log('📊 UPDATE token query:', [verificationRecord.id]);
    
    const updateTokenResult = await pool.query(updateTokenQuery, [verificationRecord.id]);
    console.log('📊 UPDATE token result:');
    console.log('   rowCount:', updateTokenResult.rowCount);
    console.log('   rows:', JSON.stringify(updateTokenResult.rows, null, 2));

    console.log('✅ ===== EMAIL VERIFICATION SUCCESS =====');
    console.log('   User ID:', user.user_id);
    console.log('   Email:', email);
    console.log('   Verified at:', updateUserResult.rows[0].updated_at);

    res.status(200).json({
      success: true,
      message: 'Email verified successfully! You can now sign in.'
    });

  } catch (error: any) {
    console.error('❌ ===== EMAIL VERIFICATION ERROR =====');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to verify email'
    });
  }
});

export default router;