// 1. Unified Signup API Endpoint
import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import pool from "../config/pool";

const router = Router();

// POST /auth/signup - Unified signup (name, email, password only)
router.post("/signup", async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;

    // Validate input
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        error: "Name, email, and password are required",
      });
    }

    // Check if email already exists
    const existingUser = await pool.query(
      "SELECT user_id FROM users WHERE email = $1",
      [email]
    );

    if (existingUser.rowCount && existingUser.rowCount > 0) {
      return res.status(400).json({
        success: false,
        error: "Email already registered",
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user (no user_type specified initially)
    const result = await pool.query(
      `INSERT INTO users (email, password, created_at) 
       VALUES ($1, $2, NOW()) 
       RETURNING user_id, email, created_at`,
      [email, hashedPassword]
    );

    const newUser = result.rows[0];

    res.status(201).json({
      success: true,
      message: "Account created successfully",
      user: {
        user_id: newUser.user_id,
        email: newUser.email,
        created_at: newUser.created_at,
      },
      nextStep: "profile_setup", // Indicates user needs to complete profile
    });
  } catch (err: any) {
    console.error("Error creating user:", err);
    res.status(500).json({
      success: false,
      error: "Failed to create account",
      message: err.message,
    });
  }
});

// POST /auth/setup-customer-profile
router.post("/setup-customer-profile", async (req: Request, res: Response) => {
  try {
    const { user_id, full_name, phone_number, zip_code, service_needed } = req.body;

    // Check if customer profile already exists
    const existingCustomer = await pool.query(
      "SELECT customer_id FROM customers WHERE user_id = $1",
      [user_id]
    );

    if (existingCustomer.rowCount && existingCustomer.rowCount > 0) {
      return res.status(400).json({
        success: false,
        error: "Customer profile already exists",
      });
    }

    // Create customer profile
    const result = await pool.query(
      `INSERT INTO customers (user_id, full_name, phone_number, zip_code, service_needed)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [user_id, full_name, phone_number, zip_code, service_needed]
    );

    // Update user_type in users table (or add if it's the first role)
    await pool.query(
      `UPDATE users SET user_type = 
        CASE 
          WHEN user_type IS NULL THEN 'customer'
          WHEN user_type = 'business_owner' THEN 'both' 
          ELSE user_type
        END
       WHERE user_id = $1`,
      [user_id]
    );

    res.json({
      success: true,
      message: "Customer profile created successfully",
      customer: result.rows[0],
    });
  } catch (err: any) {
    console.error("Error creating customer profile:", err);
    res.status(500).json({
      success: false,
      error: "Failed to create customer profile",
      message: err.message,
    });
  }
});

// POST /auth/setup-business-profile
router.post("/setup-business-profile", async (req: Request, res: Response) => {
  try {
    const {
      user_id,
      business_name,
      service_category,
      description,
      phone_number,
      zip_code,
      service_radius_miles,
    } = req.body;

    // Check if business profile already exists
    const existingBusiness = await pool.query(
      "SELECT business_id FROM business_owners WHERE user_id = $1",
      [user_id]
    );

    if (existingBusiness.rowCount && existingBusiness.rowCount > 0) {
      return res.status(400).json({
        success: false,
        error: "Business profile already exists",
      });
    }

    // Create business owner profile
    const result = await pool.query(
      `INSERT INTO business_owners 
       (user_id, business_name, service_category, description, phone_number, zip_code, service_radius_miles)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [user_id, business_name, service_category, description, phone_number, zip_code, service_radius_miles]
    );

    // Update user_type in users table
    await pool.query(
      `UPDATE users SET user_type = 
        CASE 
          WHEN user_type IS NULL THEN 'business_owner'
          WHEN user_type = 'customer' THEN 'both' 
          ELSE user_type
        END
       WHERE user_id = $1`,
      [user_id]
    );

    res.json({
      success: true,
      message: "Business profile created successfully",
      business: result.rows[0],
    });
  } catch (err: any) {
    console.error("Error creating business profile:", err);
    res.status(500).json({
      success: false,
      error: "Failed to create business profile",
      message: err.message,
    });
  }
});

// GET /auth/profile-status/:userId - Check what profiles user has
router.get("/profile-status/:userId", async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const userResult = await pool.query(
      "SELECT user_id, user_type, email FROM users WHERE user_id = $1",
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    const customerResult = await pool.query(
      "SELECT customer_id FROM customers WHERE user_id = $1",
      [userId]
    );

    const businessResult = await pool.query(
      "SELECT business_id FROM business_owners WHERE user_id = $1",
      [userId]
    );

    const profileStatus = {
      user: userResult.rows[0],
      hasCustomerProfile: customerResult.rows.length > 0,
      hasBusinessProfile: businessResult.rows.length > 0,
      needsProfileSetup: customerResult.rows.length === 0 && businessResult.rows.length === 0,
    };

    res.json({
      success: true,
      profileStatus,
    });
  } catch (err: any) {
    console.error("Error checking profile status:", err);
    res.status(500).json({
      success: false,
      error: "Failed to check profile status",
      message: err.message,
    });
  }
});

export default router;