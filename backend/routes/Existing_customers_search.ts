import { Router } from "express";
import pool from "../config/pool";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken"; // ✅ ADD THIS IMPORT

const router = Router();

/**
 * Existing Customers Login Router
 *
 * Endpoint: POST /Existing_customers_search
 *
 * This endpoint allows an existing customer to log in using email and password.
 * It will:
 * 1. Validate email and password.
 * 2. Look up the user in the 'users' table.
 * 3. Compare the password using bcrypt.
 * 4. Fetch the associated customer profile from the 'customers' table.
 * 5. Generate a JWT token for authentication.
 * 6. Return a JSON response with user info, customer profile, and token.
 *
 * Request body:
 * {
 *   "email": "customer@example.com",
 *   "password": "password123"
 * }
 *
 * Response (success):
 * {
 *   "user_id": 1,
 *   "full_name": "John Doe",
 *   "phone_number": "1234567890",
 *   "zip_code": "12345",
 *   "city": "New York",
 *   "state": "NY",
 *   "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
 *   "message": "Login successful"
 * }
 *
 * Response (error): JSON with status code 400/401/500 and a message field.
 */

router.post("/Existing_customers_search", async (req, res) => {
  try {
    const { email, password } = req.body;

    // ✅ ADD LOGGING TO DEBUG
    console.log("🔍 Login attempt for email:", email);
    console.log("🔍 Password provided:", password ? "YES" : "NO");

    if (!email || !password) {
      console.log("❌ Missing email or password");
      return res.status(400).json({ message: "Email and password are required" });
    }

    // Look up user in 'users' table
    console.log("🔍 Searching for user with email:", email);
    const userResult = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    
    if (userResult.rowCount === 0) {
      console.log("❌ No user found with email:", email);
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const user = userResult.rows[0];
    console.log("✅ User found:", { user_id: user.user_id, email: user.email, user_type: user.user_type });

    // Compare password using bcrypt
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log("❌ Password does not match for user:", user.user_id);
      return res.status(401).json({ message: "Invalid email or password" });
    }

    console.log("✅ Password matches for user:", user.user_id);

    // Fetch customer profile
    const customerResult = await pool.query(
      "SELECT * FROM customers WHERE user_id = $1",
      [user.user_id]
    );

    if (customerResult.rowCount === 0) {
      console.log("❌ No customer profile found for user_id:", user.user_id);
      return res.status(404).json({ message: "Customer profile not found" });
    }

    const customer = customerResult.rows[0];
    console.log("✅ Customer profile found:", { 
      customer_id: customer.customer_id, 
      full_name: customer.full_name 
    });

    // ✅ GENERATE JWT TOKEN
    const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-here"; // Use environment variable
    const token = jwt.sign(
      {
        user_id: user.user_id,
        email: user.email,
        user_type: user.user_type || "customer",
        customer_id: customer.customer_id
      },
      JWT_SECRET,
     // { expiresIn: "24h" } // Token expires in 24 hours
    );

    console.log("✅ JWT token generated for user:", user.user_id);

    // ✅ RETURN COMPLETE RESPONSE WITH TOKEN
    const response = {
      user_id: user.user_id,
      full_name: customer.full_name,
      phone_number: customer.phone_number,
      zip_code: customer.zip_code,
      city: customer.city || "", // ✅ Add city field
      state: customer.state || "", // ✅ Add state field
      token: token, // ✅ INCLUDE THE TOKEN
      message: "Login successful"
    };

    console.log("✅ Sending response:", { ...response, token: "***HIDDEN***" });
    res.json(response);

  } catch (err: any) {
    console.error("❌ Existing customer login error:", err.message);
    console.error("❌ Full error:", err);
    res.status(500).json({ message: "Login failed", error: err.message });
  }
});

export default router;