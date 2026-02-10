/**
 * Password Reset API Routes
 * 
 * Handles password reset functionality:
 * 1. POST /api/password-reset/request - Generate reset token and send email
 * 2. POST /api/password-reset/verify - Verify token and update password
 */

import { Router, Request, Response } from 'express';
import { Resend } from 'resend';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import pool from '../config/pool'; // Adjust path to your pool.ts file
import dotenv from 'dotenv';

dotenv.config();

const router = Router();
const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * POST /api/password-reset/request
 * 
 * Request a password reset email
 * 
 * Body: { email: string }
 * 
 * Flow:
 * 1. Check if user exists
 * 2. Generate reset token
 * 3. Save token to database with expiration
 * 4. Send email with reset link
 */
router.post('/request', async (req: Request, res: Response) => {
  const { email } = req.body;

  console.log('🔐 Password reset requested for:', email);

  try {
    // Validate email
    if (!email || !email.includes('@')) {
      return res.status(400).json({
        success: false,
        message: 'Valid email is required'
      });
    }

    // Check if user exists
    const userQuery = 'SELECT user_id, email, full_name FROM users WHERE email = $1';
    const userResult = await pool.query(userQuery, [email.toLowerCase()]);

    if (userResult.rows.length === 0) {
      // Don't reveal if email exists (security best practice)
      // But still return success to prevent email enumeration
      console.log('⚠️ Email not found, but returning success for security');
      return res.status(200).json({
        success: true,
        message: 'If that email exists, a reset link has been sent'
      });
    }

    const user = userResult.rows[0];

    // Generate secure random token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    // Token expires in 1 hour
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    // Mark any existing unused tokens as used
    await pool.query(
      'UPDATE password_resets SET used = true WHERE user_id = $1 AND used = false',
      [user.user_id]
    );

    // Save new reset token to database
    await pool.query(
      `INSERT INTO password_resets (user_id, reset_token, expires_at, used)
       VALUES ($1, $2, $3, false)`,
      [user.user_id, hashedToken, expiresAt]
    );
// Create reset link based on environment
// Development: http://localhost:8081
// Production: https://gozipmarket.com
// ✅ FIXED - Create reset link based on environment
// Check for Render environment OR explicit NODE_ENV setting
const isProduction = process.env.RENDER || process.env.NODE_ENV === 'production';
const frontendUrl = isProduction
  ? 'https://gozipmarket.com'
  : 'http://localhost:8081';

console.log('🌍 Environment:', isProduction ? 'PRODUCTION' : 'DEVELOPMENT');
console.log('🌍 RENDER env var:', process.env.RENDER);
console.log('🌍 NODE_ENV:', process.env.NODE_ENV);
console.log('🔗 Frontend URL:', frontendUrl);

const resetLink = `zipservice://reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;
const webResetLink = `${frontendUrl}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;

    // Send email via Resend
    const emailResult = await resend.emails.send({
      from: 'ZipService <noreply@gozipmarket.com>', // Update with your verified domain
      to: email,
      subject: 'Reset Your ZipService Password',
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
              .warning { background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 12px; margin: 20px 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Reset Your Password</h1>
              </div>
              <div class="content">
                <p>Hi ${user.full_name || 'there'},</p>
                
                <p>We received a request to reset your password for your ZipService account.</p>
                
                <p>Click the button below to reset your password:</p>
                
                <p style="text-align: center;">
                  <a href="${webResetLink}" class="button">Reset Password</a>
                </p>
                
                <p>Or copy and paste this link into your browser:</p>
                <p style="word-break: break-all; background-color: #eee; padding: 10px; border-radius: 4px;">
                  ${webResetLink}
                </p>
                
                <div class="warning">
                  <strong>⚠️ Security Notice:</strong>
                  <ul>
                    <li>This link expires in 1 hour</li>
                    <li>If you didn't request this, please ignore this email</li>
                    <li>Never share this link with anyone</li>
                  </ul>
                </div>
                
                <p>If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
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

    console.log('✅ Password reset email sent:', emailResult);

    res.status(200).json({
      success: true,
      message: 'If that email exists, a reset link has been sent'
    });

  } catch (error) {
    console.error('❌ Password reset request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process password reset request'
    });
  }
});

/**
 * POST /api/password-reset/verify
 * 
 * Verify reset token and update password
 * 
 * Body: { email: string, token: string, newPassword: string }
 * 
 * Flow:
 * 1. Verify token exists and not expired
 * 2. Verify token not already used
 * 3. Hash new password
 * 4. Update user password
 * 5. Mark token as used
 */
router.post('/verify', async (req: Request, res: Response) => {
  const { email, token, newPassword } = req.body;

  console.log('🔐 Password reset verification for:', email);

  try {
    // Validate inputs
    if (!email || !token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Email, token, and new password are required'
      });
    }

    // Validate password strength
    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long'
      });
    }

    // Check password complexity
    const hasUpperCase = /[A-Z]/.test(newPassword);
    const hasLowerCase = /[a-z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);
    const hasSpecialChar = /[!@#$%^&*]/.test(newPassword);

    if (!hasUpperCase || !hasLowerCase || !hasNumber || !hasSpecialChar) {
      return res.status(400).json({
        success: false,
        message: 'Password must include uppercase, lowercase, number, and special character'
      });
    }

    // Get user
    const userQuery = 'SELECT user_id FROM users WHERE email = $1';
    const userResult = await pool.query(userQuery, [email.toLowerCase()]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const userId = userResult.rows[0].user_id;

    // Hash the token to compare with database
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Check if token exists and is valid
    const tokenQuery = `
      SELECT id, user_id, expires_at, used 
      FROM password_resets 
      WHERE user_id = $1 AND reset_token = $2
      ORDER BY id DESC
      LIMIT 1
    `;
    const tokenResult = await pool.query(tokenQuery, [userId, hashedToken]);

    if (tokenResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }

    const resetRecord = tokenResult.rows[0];

    // Check if token already used
    if (resetRecord.used) {
      return res.status(400).json({
        success: false,
        message: 'This reset link has already been used'
      });
    }

    // Check if token expired
    if (new Date() > new Date(resetRecord.expires_at)) {
      return res.status(400).json({
        success: false,
        message: 'This reset link has expired. Please request a new one.'
      });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user password
    await pool.query(
      'UPDATE users SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2',
      [hashedPassword, userId]
    );

    // Mark token as used
    await pool.query(
      'UPDATE password_resets SET used = true WHERE id = $1',
      [resetRecord.id]
    );

    console.log('✅ Password successfully reset for user:', userId);

    res.status(200).json({
      success: true,
      message: 'Password successfully reset. You can now log in with your new password.'
    });

  } catch (error) {
    console.error('❌ Password reset verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset password'
    });
  }
});

export default router;