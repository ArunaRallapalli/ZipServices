/**
 * Email Verification API Routes
 */

import { Router, Request, Response } from 'express';
import { Resend } from 'resend';
import crypto from 'crypto';
import pool from '../config/pool';
import dotenv from 'dotenv';

// ✅ ADD THIS
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const router = Router();
const resend = new Resend(process.env.RESEND_API_KEY);

// ✅ ADD THIS (ADMIN CLIENT – BACKEND ONLY)
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/email-verification/send
 * (UNCHANGED)
 */
router.post('/send', async (req: Request, res: Response) => {
  const { userId, email, fullName } = req.body;

  try {
    if (!userId || !email || !email.includes('@')) {
      return res.status(400).json({
        success: false,
        message: 'Valid user ID and email are required'
      });
    }

    const userQuery =
      'SELECT user_id, email, email_verified, full_name FROM users WHERE user_id = $1 AND email = $2';
    const userResult = await pool.query(userQuery, [userId, email.toLowerCase()]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const user = userResult.rows[0];

    if (user.email_verified) {
      return res.status(200).json({
        success: true,
        message: 'Email already verified'
      });
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto
      .createHash('sha256')
      .update(verificationToken)
      .digest('hex');

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await pool.query(
      'UPDATE email_verifications SET verified = true WHERE user_id = $1 AND verified = false',
      [userId]
    );

    const insertQuery = `
      INSERT INTO email_verifications (user_id, verification_token, expires_at, verified)
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `;

    await pool.query(insertQuery, [
      userId,
      hashedToken,
      expiresAt,
      false
    ]);

    const frontendUrl =
      process.env.NODE_ENV !== 'production'
        ? 'http://localhost:8081'
        : 'https://gozipmarket.com';

    const verificationLink = `${frontendUrl}/verify-email.html?token=${verificationToken}&email=${encodeURIComponent(
      email
    )}`;

    await resend.emails.send({
      from: 'ZipService <noreply@gozipmarket.com>',
      to: email,
      subject: 'Verify Your ZipService Email',
      html: `<a href="${verificationLink}">Verify Email</a>`
    });

    res.status(200).json({
      success: true,
      message: 'Verification email sent successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to send verification email'
    });
  }
});

/**
 * POST /api/email-verification/verify
 * 🔴 THIS IS WHERE THE FIX IS
 */
router.post('/verify', async (req: Request, res: Response) => {
  const { email, token } = req.body;

  try {
    if (!email || !token) {
      return res.status(400).json({
        success: false,
        message: 'Email and token are required'
      });
    }

    // 🔹 GET USER (ADD supabase_user_id)
    const userQuery =
      'SELECT user_id, email_verified, supabase_user_id FROM users WHERE email = $1';
    const userResult = await pool.query(userQuery, [email.toLowerCase()]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const user = userResult.rows[0];

    if (user.email_verified === true) {
      return res.status(200).json({
        success: true,
        message: 'Email already verified',
        alreadyVerified: true
      });
    }

    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    const tokenQuery = `
      SELECT id, user_id, expires_at, verified
      FROM email_verifications
      WHERE user_id = $1 AND verification_token = $2
      ORDER BY id DESC
      LIMIT 1
    `;

    const tokenResult = await pool.query(tokenQuery, [
      user.user_id,
      hashedToken
    ]);

    if (tokenResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification link'
      });
    }

    const verificationRecord = tokenResult.rows[0];

    if (verificationRecord.verified === true) {
      return res.status(400).json({
        success: false,
        message: 'This verification link has already been used'
      });
    }

    if (new Date() > new Date(verificationRecord.expires_at)) {
      return res.status(400).json({
        success: false,
        message: 'This verification link has expired'
      });
    }

    // ✅ UPDATE YOUR USERS TABLE
    const updateUserQuery = `
      UPDATE users
      SET email_verified = TRUE, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $1
      RETURNING supabase_user_id
    `;

    const updateUserResult = await pool.query(updateUserQuery, [
      user.user_id
    ]);

    if (updateUserResult.rowCount === 0) {
      throw new Error('Failed to update user');
    }

    const { supabase_user_id } = updateUserResult.rows[0];

    // 🔥 **THIS IS THE CRITICAL FIX**
    await supabaseAdmin.auth.admin.updateUserById(
  supabase_user_id,
  {
    email_confirm: true
  }
);


    // ✅ MARK TOKEN AS USED
    await pool.query(
      'UPDATE email_verifications SET verified = true WHERE id = $1',
      [verificationRecord.id]
    );

    res.status(200).json({
      success: true,
      message: 'Email verified successfully! You can now sign in.'
    });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify email'
    });
  }
});

export default router;
