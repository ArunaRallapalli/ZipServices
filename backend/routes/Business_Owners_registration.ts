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
 */

import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { supabase } from "../config/Supabase";

const router = Router();

// Helper function to generate JWT token
const generateToken = (user_id: string, business_id: number): string => {
  return jwt.sign(
    { user_id, business_id },
    process.env.JWT_SECRET || "secret",
    { expiresIn: "1h" }
  );
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
      .eq('email', email)
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

    // 3️⃣ Create user in users table
    const { data: newUser, error: userError } = await supabase
      .from('users')
      .insert({
        email: email,
        password: hashedPassword,
        user_type: 'business_owner'
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

    // 5️⃣ Generate JWT token for automatic login
    const token = generateToken(newUser.user_id, businessOwner.business_id);

    // 6️⃣ Return success response with token
    res.status(201).json({
      message: 'Business owner registered successfully',
      token: token,
      user: {
        user_id: newUser.user_id,
        email: newUser.email,
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