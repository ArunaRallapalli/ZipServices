/**
 * Email Verification API Routes
 * 
 * Handles email verification functionality:
 * 1. POST /api/email-verification/send - Send verification email
 * 2. POST /api/email-verification/verify - Verify token and mark email as verified
 */

import { Router, Request, Response } from 'express';
import { Resend } from 'resend';
import crypto from 'crypto';
import pool from '../config/pool';
import dotenv from 'dotenv';
import { supabase } from '../config/Supabase';

dotenv.config();

const router = Router();
const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * POST /api/email-verification/send
 * 
 * Send verification email to user
 * 
 * Body: { userId: number, email: string, fullName?: string }
 * 
 * Flow:
 * 1. Check if user exists and email not already verified
 * 2. Generate verification token
 * 3. Save token to database with expiration (24 hours)
 * 4. Send verification email
 */
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

    // Mark any existing unused tokens as verified (to clean up)
    await pool.query(
      'UPDATE email_verifications SET verified = true WHERE user_id = $1 AND verified = false',
      [userId]
    );

    // Save new verification token to database
   const { error: verificationError } = await supabase
  .from('email_verifications')
  .insert({
    user_id: userId,
    verification_token: hashedToken,
    expires_at: expiresAt.toISOString(),
    verified: false
  });

if (verificationError) {
  console.error('❌ Supabase error saving token:', verificationError);
  throw verificationError;
}

    // Create verification link based on environment
    const isDevelopment = process.env.NODE_ENV !== 'production';
    const frontendUrl = isDevelopment 
      ? 'http://localhost:8081' 
      : 'https://gozipmarket.com';

    const verificationLink = `${frontendUrl}/verify-email?token=${verificationToken}&email=${encodeURIComponent(email)}`;

    console.log('🌍 Environment:', process.env.NODE_ENV);
    console.log('🔗 Frontend URL:', frontendUrl);

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
 * 
 * Flow:
 * 1. Verify token exists and not expired
 * 2. Verify token not already used
 * 3. Mark email as verified in users table
 * 4. Mark token as used
 */
router.post('/verify', async (req: Request, res: Response) => {
  const { email, token } = req.body;

  console.log('🔐 Email verification attempt for:', email);

  try {
    // Validate inputs
    if (!email || !token) {
      return res.status(400).json({
        success: false,
        message: 'Email and token are required'
      });
    }

    // Get user
    const userQuery = 'SELECT user_id, email_verified FROM users WHERE email = $1';
    const userResult = await pool.query(userQuery, [email.toLowerCase()]);

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
        message: 'Email already verified',
        alreadyVerified: true
      });
    }

    // Hash the token to compare with database
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Check if token exists and is valid
    const tokenQuery = `
      SELECT id, user_id, expires_at, verified 
      FROM email_verifications 
      WHERE user_id = $1 AND verification_token = $2
      ORDER BY id DESC
      LIMIT 1
    `;
    const tokenResult = await pool.query(tokenQuery, [user.user_id, hashedToken]);

    if (tokenResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification link'
      });
    }

    const verificationRecord = tokenResult.rows[0];

    // Check if token already used
    if (verificationRecord.verified) {
      return res.status(400).json({
        success: false,
        message: 'This verification link has already been used'
      });
    }

    // Check if token expired
    if (new Date() > new Date(verificationRecord.expires_at)) {
      return res.status(400).json({
        success: false,
        message: 'This verification link has expired. Please request a new one.'
      });
    }

    // Mark email as verified in users table
    await pool.query(
      'UPDATE users SET email_verified = TRUE, updated_at = CURRENT_TIMESTAMP WHERE user_id = $1',
      [user.user_id]
    );

    // Mark token as used
    await pool.query(
      'UPDATE email_verifications SET verified = true WHERE id = $1',
      [verificationRecord.id]
    );

    console.log('✅ Email verified successfully for user:', user.user_id);

    res.status(200).json({
      success: true,
      message: 'Email verified successfully! You can now sign in.'
    });

  } catch (error) {
    console.error('❌ Email verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify email'
    });
  }
});

export default router;