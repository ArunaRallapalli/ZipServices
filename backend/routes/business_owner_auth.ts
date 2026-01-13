// backend/routes/business_owner_auth_routes.ts
/**
 * Business Owner Authentication & Profile Routes
 *
 * Last Updated: January 9, 2026
 * Changes: Fixed user_id type consistency in JWT generation
 * 
 * Responsibilities:
 * - Login with email/password (from `users` table)
 * - JWT generation containing `user_id` and `business_id`
 * - Fetch business owner profile (`/me` or `/profile/:user_id`)
 * - Token-protected profile access
 * GET /business_owners/profile/123
Authorization: Bearer <your-jwt-token>
 POST /business_owners/refresh-token
Authorization: Bearer <your-current-jwt-token>*/

import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { supabase } from "../config/Supabase";

interface AuthRequest extends Request {
  user?: { user_id: string; business_id: number };
}

const router = Router();

// Helper function to generate JWT token
const generateToken = (user_id: string, business_id: number): string => {
  return jwt.sign(
    { user_id, business_id },
    process.env.JWT_SECRET || "secret",
    { expiresIn: "1h" }
  );
};

// Helper function to verify JWT token
const verifyToken = (token: string): { user_id: string; business_id: number } | null => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET || "secret") as { user_id: string; business_id: number };
  } catch (err) {
    return null;
  }
};

// -----------------------------
// POST /business_owners/login
// -----------------------------
router.post("/login", async (req: AuthRequest, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) return res.status(400).json({ message: "Missing email or password" });

  try {
    // 1️⃣ Fetch user by email from `users` table
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('user_id, email, password, email_verified, user_type')
      .eq('email', email)
      .single();

    if (userError || !user || !user.user_id || !user.password) {
      return res.status(400).json({ message: "Invalid email or password" });
    }
    
    // 2️⃣ Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid email or password" });

    // ✅ CHECK IF EMAIL IS VERIFIED
    if (!user.email_verified) {
      console.log('❌ Login blocked - email not verified:', email);
      return res.status(403).json({
        message: 'Please verify your email address before signing in. Check your inbox for the verification link.',
        user: {
          email: user.email,
          email_verified: false
        }
      });
    }

    // 3️⃣ Fetch business owner profile
    const { data: owner, error: ownerError } = await supabase
      .from('business_owners')
      .select('*')
      .eq('user_id', user.user_id)
      .single();

    if (ownerError || !owner) {
      return res.status(404).json({ message: "Business owner profile not found" });
    }

    // 4️⃣ Generate JWT
    // FIXED: January 9, 2026 - Convert user_id to string for consistency
    const token = generateToken(String(user.user_id), owner.business_id);
    
    console.log('✅ Login successful for user:', user.user_id);
    console.log('   Token generated with user_id:', String(user.user_id), typeof String(user.user_id));

    // 5️⃣ Return token + business owner profile
    res.json({ 
      token, 
      user: {
        ...owner,
        email: user.email,
        email_verified: user.email_verified,
        user_type: user.user_type
      }
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error", error: (err as Error).message });
  }
});

// -----------------------------
// GET /business_owners/me
// Fetch logged-in business owner profile based on JWT
// -----------------------------
router.get("/me", async (req: AuthRequest, res: Response) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) return res.status(401).json({ message: "Unauthorized" });

  const token = authHeader.split(" ")[1];
  const decoded = verifyToken(token);
  
  if (!decoded) return res.status(401).json({ message: "Invalid token" });

  try {
    const { data: owner, error } = await supabase
      .from('business_owners')
      .select('*')
      .eq('user_id', decoded.user_id)
      .single();

    if (error || !owner) {
      return res.status(404).json({ message: "Business owner not found" });
    }

    res.json(owner);
  } catch (err) {
    console.error("Profile fetch error:", err);
    res.status(500).json({ message: "Server error", error: (err as Error).message });
  }
});

// -----------------------------
// GET /business_owners/profile/:user_id
// Fetch business owner profile by user_id (now requires authentication)
// -----------------------------
router.get("/profile/:user_id", async (req: AuthRequest, res: Response) => {
  const authHeader = req.headers.authorization;
  const userIdInt = parseInt(req.params.user_id, 10);

  if (isNaN(userIdInt)) return res.status(400).json({ message: "Invalid user_id" });
  if (!authHeader?.startsWith("Bearer ")) return res.status(401).json({ message: "Unauthorized" });

  const token = authHeader.split(" ")[1];
  const decoded = verifyToken(token);
  
  if (!decoded) return res.status(401).json({ message: "Invalid token" });

  try {
    const { data: owner, error } = await supabase
      .from('business_owners')
      .select('*')
      .eq('user_id', userIdInt)
      .single();

    if (error || !owner) {
      return res.status(404).json({ message: "Business owner not found" });
    }

    // Option 1: Just return the profile
    res.json(owner);
    
    // Option 2: Return profile with a new token (uncomment if you want token refresh)
    // const newToken = generateToken(owner.user_id, owner.business_id);
    // res.json({ user: owner, token: newToken });
  } catch (err) {
    console.error("Profile fetch error:", err);
    res.status(500).json({ message: "Server error", error: (err as Error).message });
  }
});

// -----------------------------
// POST /business_owners/refresh-token
// Refresh JWT token for authenticated user
// -----------------------------
router.post("/refresh-token", async (req: AuthRequest, res: Response) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) return res.status(401).json({ message: "Unauthorized" });

  const token = authHeader.split(" ")[1];
  const decoded = verifyToken(token);
  
  if (!decoded) return res.status(401).json({ message: "Invalid token" });

  try {
    // Verify the business owner still exists
    const { data: owner, error } = await supabase
      .from('business_owners')
      .select('*')
      .eq('user_id', decoded.user_id)
      .single();

    if (error || !owner) {
      return res.status(404).json({ message: "Business owner not found" });
    }

    // Generate new token
    const newToken = generateToken(decoded.user_id, decoded.business_id);
    
    res.json({ token: newToken, user: owner });
  } catch (err) {
    console.error("Token refresh error:", err);
    res.status(500).json({ message: "Server error", error: (err as Error).message });
  }
});

export default router;