// backend/routes/Business_Owners_registration.ts
/**
 * Business Owner Registration Routes
 * 
 * Mounted at: /business_owners/crud
 * 
 * Responsibilities:
 * - New business owner registration
 * - User account creation
 * - Business profile creation
 * - Email verification sending
 */


import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { supabase } from "../config/Supabase";
import crypto from 'crypto';
import { Resend } from 'resend';
import dotenv from 'dotenv';

import { Router, Request, Response } from 'express';
// ... other imports ...

// ✅ ADD THIS HELPER FUNCTION HERE (before any routes)
const getFrontendUrl = (req: Request): string => {
  // Production: always use the real domain
  if (process.env.RENDER || process.env.NODE_ENV === 'production') {
    return 'https://gozipmarket.com';
  }

  // Development: detect from request origin or referer
  const origin = req.headers.origin;
  const referer = req.headers.referer;

  if (origin && origin.includes('localhost')) {
    return origin; // e.g. http://localhost:8081
  }

  if (origin && (origin.includes('192.168') || origin.includes('10.0'))) {
    return origin; // e.g. http://192.168.0.195:8081
  }

  if (referer) {
    try {
      const url = new URL(referer);
      return `${url.protocol}//${url.host}`;
    } catch {
      // Invalid URL, fall through to default
    }
  }

  // Fallback to .env or localhost
  return process.env.FRONTEND_URL || 'http://localhost:8081';
};

// ... rest of your code (routes, etc.)

dotenv.config();
// 🔍 ADD THIS DEBUG SECTION HERE
// ========================================
console.log('==========================================');
console.log('🔑 RESEND_API_KEY exists:', !!process.env.RESEND_API_KEY);
console.log('🔑 API Key first 10 chars:', process.env.RESEND_API_KEY?.substring(0, 10));
console.log('🌍 NODE_ENV:', process.env.NODE_ENV);
console.log('🌐 FRONTEND_URL:', process.env.FRONTEND_URL);
console.log('==========================================');
// ========================================

const router = Router();
const resend = new Resend(process.env.RESEND_API_KEY);
// Verify Resend instance was created
console.log('📧 Resend instance created:', !!resend);


// Helper function to generate JWT token
const generateToken = (user_id: string, business_id: number): string => {
  return jwt.sign(
    { user_id, business_id },
    process.env.JWT_SECRET || "secret",
    { expiresIn: "7d" }
  );
};

// Helper function to send verification email

const sendVerificationEmail = async (req: Request, userId: number, email: string, fullName?: string) => {
    // ✅ ADD THIS - Entry point logging
  console.log('📧 ===== ENTERING sendVerificationEmail =====');
  console.log('📧 User ID:', userId);
  console.log('📧 Email:', email);
  console.log('📧 Name:', fullName);
  try {
    console.log('🔐 Generating verification token...');
    // Generate secure random token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(verificationToken).digest('hex');
console.log('✅ Token generated and hashed');
    // Token expires in 24 hours
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    // Save verification token to database
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
    console.log('✅ Token saved to database successfully');

    // Create verification link based on environment
    // ✅ NEW:
const frontendUrl = getFrontendUrl(req);

   // ✅ NEW:

const verificationLink = `${frontendUrl}/verify-email.html?token=${verificationToken}&email=${encodeURIComponent(email)}`;
    
    // ✅ ADD THIS - Show the link
console.log('🔗 Verification link created:', verificationLink);
console.log('📤 Calling Resend API to send email...');
    // Send verification email
   const emailResult = await resend.emails.send({
      from: 'GoZipMarket <noreply@gozipmarket.com>',
      to: email,
      subject: 'Verify Your GoZipMarket Email',
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
                <h1>Welcome to GoZipMarket! 🎉</h1>
              </div>
              <div class="content">
                <p>Hi ${fullName || 'there'},</p>
                
                <p>Thank you for signing up for GoZipMarket! We're excited to have you join our community.</p>
                
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
                  </ul>
                </div>
                
                <p>Once verified, you'll be able to:</p>
                <ul>
                  <li>Post and manage your services</li>
                  <li>Connect with customers in your area</li>
                  <li>Send and receive messages</li>
                  <li>Build your business profile</li>
                </ul>
                
                <p>Welcome aboard!</p>
                <p><strong>The GoZipMarket Team</strong></p>
              </div>
              <div class="footer">
                <p>© 2025 GoZipMarket - Zip Market LLC</p>
                <p>This is an automated email, please do not reply.</p>
              </div>
            </div>
          </body>
        </html>
      `
    });

// ✅ ADD THIS - After Resend API success
   console.log('✅ Resend API responded successfully');
console.log('📧 Email Result:', emailResult);
console.log('📧 Email ID:', emailResult.data?.id || 'N/A');
console.log('📧 ===== EMAIL SENT SUCCESSFULLY =====');
    
    return true;
   } catch (error: any) {
    console.error('==========================================');
    console.error('❌ ERROR SENDING VERIFICATION EMAIL');
    console.error('==========================================');
    console.error('📧 Email:', email);
    console.error('👤 Name:', fullName);
    console.error('🆔 User ID:', userId);
    console.error('🔑 API Key exists:', !!process.env.RESEND_API_KEY);
    console.error('❌ Error message:', error.message);
    console.error('❌ Error name:', error.name);
    console.error('❌ Error code:', error.code);
    console.error('❌ Full error:', JSON.stringify(error, null, 2));
    
    // If it's a Resend-specific error
    if (error.statusCode) {
      console.error('📊 HTTP Status:', error.statusCode);
    }
    
    console.error('==========================================');
    
    // Don't fail registration if email fails - just log it
    return false;
  }
};

// -----------------------------
// POST /business_owners/crud/register
// Register a new business owner
// -----------------------------
router.post("/register", async (req: Request, res: Response) => {
  const {
    name,
    email,
    password,
    city,
    state,
    zip_code,
    description,
    phone_number,
    street,
    service_radius_miles
  } = req.body;

  // Validate required fields
  if (!name || !email || !password || !zip_code) {
    return res.status(400).json({
      message: 'Name, email, password, and zip code are required'
    });
  }

  // Validate city and state (should be auto-filled from frontend)
  if (!city || !state) {
    return res.status(400).json({
      message: 'City and state are required. Please enter a valid US zip code.'
    });
  }

  try {
    console.log("📝 Starting registration for:", email);

    // 1️⃣ Check if email already exists
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('email')
      .eq('email', email.toLowerCase().trim())
      .maybeSingle();

    if (existingUser) {
      console.log("❌ Email already exists:", email);
      return res.status(400).json({
        message: 'Email already exists. Please use a different email address.'
      });
    }

    // 2️⃣ Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log("🔒 Password hashed successfully");

    // 3️⃣ Create user in users table (email_verified defaults to FALSE)
    const { data: newUser, error: userError } = await supabase
      .from('users')
      .insert({
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        user_type: 'business_owner',
        email_verified: false  // Explicitly set to false
      })
      .select()
      .single();

    if (userError) {
      console.error("❌ Error creating user:", userError);
      throw userError;
    }

    console.log("✅ User created with ID:", newUser.user_id);

    // 4️⃣ Create business owner profile
    const { data: businessOwner, error: businessError } = await supabase
      .from('business_owners')
      .insert({
        user_id: newUser.user_id,
        business_name: name,
        city: city,
        state: state,
        zip_code: zip_code,
        description: description || null,
        phone_number: phone_number || null,
        street: street || null,
        service_radius_miles: service_radius_miles || null
      })
      .select()
      .single();

    if (businessError) {
      console.error("❌ Error creating business owner profile:", businessError);
      throw businessError;
    }

    console.log("✅ Business owner profile created with ID:", businessOwner.business_id);

    // 5️⃣ Send verification email
    console.log("📧 Sending verification email...");
    // ✅ NEW:
await sendVerificationEmail(req, newUser.user_id, email.toLowerCase().trim(), name);

    // 6️⃣ Generate JWT token for automatic login
    const token = generateToken(newUser.user_id, businessOwner.business_id);

    // 7️⃣ Return success response with token
    res.status(201).json({
      message: 'Business owner registered successfully. Please check your email to verify your account.',
      token: token,
      emailVerificationSent: true,
      user: {
        user_id: newUser.user_id,
        email: newUser.email,
        email_verified: false,
        business_id: businessOwner.business_id,
        business_name: businessOwner.business_name
      }
    });

  } catch (error) {
    console.error('❌ Registration error:', error);
    res.status(500).json({
      message: 'Failed to register business owner',
      error: (error as Error).message
    });
  }
});

export default router;