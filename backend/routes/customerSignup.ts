import { Router } from "express";
import pool from "../config/pool";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const router = Router();

// JWT Secret from environment variable
const JWT_SECRET = process.env.JWT_SECRET || "myjwtsecret";

/**
 * POST /customers/signup
 * Registers a new user and customer in one call.
 * NOW RETURNS A JWT TOKEN
 */
router.post("/signup", async (req, res) => {
  try {
    const fullName = req.body.fullName ?? req.body.full_name;
    const email = req.body.email;
    const password = req.body.password;
    const phoneNumber = req.body.phoneNumber ?? req.body.phone_number;
    const zipCode = req.body.zipCode ?? req.body.zip_code;

    // Validate input
    if (!fullName || !email || !password || !phoneNumber || !zipCode) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Check if email already exists
    const existingUser = await pool.query(
      "SELECT user_id FROM users WHERE email = $1",
      [email]
    );
    if (existingUser.rowCount && existingUser.rowCount > 0) {
      return res.status(400).json({ message: "Email already registered" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert into users table with all required fields
    const userResult = await pool.query(
      `INSERT INTO users (user_type, email, password) 
       VALUES ($1, $2, $3) 
       RETURNING user_id, user_type, email`,
      ["customer", email, hashedPassword]
    );
    const user = userResult.rows[0];

    // Handle the type mismatch between users.user_id (bigint) and customers.user_id (integer)
    const userId = user.user_id;

    // Check if user_id is within integer range to prevent overflow
    const maxInt = 2147483647;
    if (typeof userId === 'string' || typeof userId === 'number') {
      const numericUserId = typeof userId === 'string' ? parseInt(userId) : userId;
      if (numericUserId > maxInt) {
        throw new Error(`User ID ${numericUserId} exceeds integer range. Database schema needs to be updated.`);
      }
    }

    // Insert into customers table
    const customerResult = await pool.query(
      `INSERT INTO customers (user_id, full_name, phone_number, zip_code) 
       VALUES ($1::integer, $2, $3, $4) 
       RETURNING *`,
      [userId, fullName, phoneNumber, zipCode]
    );
    const customer = customerResult.rows[0];

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user.user_id,
        userType: 'customer',
        email: user.email
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log("✅ Customer signup successful, token generated");

    // Return response WITH TOKEN
    return res.status(201).json({
      message: "Signup successful",
      token: token, // ✅ TOKEN ADDED HERE
      user: {
        user_id: user.user_id,
        user_type: user.user_type,
        email: user.email,
      },
      customer,
    });

  } catch (err: any) {
    console.error("Customer signup error:", err);
    return res.status(500).json({
      message: "Failed to register user/customer",
      error: err.message,
    });
  }
});

/**
 * POST /customers/login
 * Login endpoint for customers
 */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const userResult = await pool.query(
      "SELECT user_id, email, password, user_type FROM users WHERE email = $1",
      [email]
    );

    if (userResult.rowCount === 0) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const user = userResult.rows[0];

    if (user.user_type !== 'customer') {
      return res.status(403).json({ message: "This login is for customers only" });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const customerResult = await pool.query(
      "SELECT * FROM customers WHERE user_id = $1",
      [user.user_id]
    );

    if (customerResult.rowCount === 0) {
      return res.status(404).json({ message: "Customer profile not found" });
    }

    const customer = customerResult.rows[0];

    const token = jwt.sign(
      {
        userId: user.user_id,
        userType: 'customer',
        email: user.email
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log("✅ Customer login successful");

    return res.status(200).json({
      message: "Login successful",
      token: token,
      user: {
        user_id: user.user_id,
        user_type: user.user_type,
        email: user.email,
      },
      customer,
    });

  } catch (err: any) {
    console.error("Customer login error:", err);
    return res.status(500).json({
      message: "Login failed",
      error: err.message,
    });
  }
});

/**
 * GET /customers/service_category
 * Returns distinct service categories from business owners
 */
router.get("/service_category", async (_req, res) => {
  try {
    const result = await pool.query(
      "SELECT DISTINCT service_category FROM business_owners WHERE service_category IS NOT NULL ORDER BY service_category"
    );
    const serviceCategories = result.rows.map(row => row.service_category);
    return res.json(serviceCategories);
  } catch (err: any) {
    console.error("Service category fetch error:", err);
    return res.status(500).json({ 
      message: "Failed to fetch service categories", 
      error: err.message 
    });
  }
});

/**
 * POST /customers/register
 * Register customer details for an existing user
 */
router.post("/register", async (req, res) => {
  try {
    const { user_id, full_name, zip_code, phone_number, service_needed } = req.body;

    if (!user_id || !full_name || !zip_code) {
      return res.status(400).json({ message: "Missing required fields: user_id, full_name, zip_code" });
    }

    const userCheck = await pool.query(
      "SELECT user_id FROM users WHERE user_id = $1 AND user_type = 'customer'", 
      [user_id]
    );
    if (!userCheck.rowCount || userCheck.rowCount === 0) {
      return res.status(400).json({ message: "Invalid user_id or user is not a customer" });
    }

    const insertQuery = `
      INSERT INTO customers (user_id, full_name, zip_code, phone_number, service_needed)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
    `;
    const values = [user_id, full_name, zip_code, phone_number || null, service_needed || null];
    const result = await pool.query(insertQuery, values);

    res.status(201).json({ 
      message: "Customer registered successfully", 
      customer: result.rows[0] 
    });
  } catch (err: any) {
    console.error("Customer registration error:", err);
    res.status(500).json({ 
      message: "Failed to register customer", 
      error: err.message 
    });
  }
});

/**
 * GET /customers/search
 * Search for business owners by location and service category
 */
router.get("/search", async (req, res) => {
  try {
    const { zip_code, service_category } = req.query;

    if (!zip_code || !service_category) {
      return res.status(400).json({ 
        message: "Missing zip_code or service_category query parameters" 
      });
    }

    const query = `
      SELECT bo.business_id, bo.business_name, bo.service_category, bo.description, 
             bo.phone_number, bo.zip_code, bo.city, bo.state, bo.street, 
             bo.service_radius_miles, u.email, u.user_id
      FROM business_owners bo
      JOIN users u ON bo.user_id = u.user_id
      WHERE bo.zip_code = $1 AND bo.service_category = $2
      ORDER BY bo.business_name
    `;
    const values = [zip_code, service_category];

    const result = await pool.query(query, values);
    res.json(result.rows);
  } catch (err: any) {
    console.error("Search businesses error:", err);
    res.status(500).json({ 
      message: "Failed to fetch businesses", 
      error: err.message 
    });
  }
});

export default router;