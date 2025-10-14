import { Router, Request, Response } from "express";
import pool from "../config/pool";
import bcrypt from "bcrypt";

const router = Router();

console.log("BusinessOwners router loaded");

// POST /register → this maps to /business_owners/crud/register
router.post("/register", async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const {
      business_name,
      service_category,
      description,
      phone_number,
      email,
      password,
      street,
      city,
      state,
      zip_code,
      service_radius_miles,
    } = req.body;

    // Validate required fields (removed business_name and service_category)
    const missingFields = [];
    if (!email) missingFields.push("email");
    if (!password) missingFields.push("password");
    if (!street) missingFields.push("street");
    if (!city) missingFields.push("city");
    if (!state) missingFields.push("state");
    if (!zip_code) missingFields.push("zip_code");

    if (missingFields.length > 0) {
      return res.status(400).json({
        message: "Missing required fields",
        missing_fields: missingFields,
      });
    }

    await client.query("BEGIN");

    // Check if email already exists in users table
    const existingUser = await client.query("SELECT 1 FROM users WHERE email = $1", [email]);
    if (existingUser.rows.length > 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "Email already registered" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert into users table
    const userResult = await client.query(
      `INSERT INTO users (email, password, user_type, created_at)
       VALUES ($1, $2, 'business_owner', NOW())
       RETURNING user_id`,
      [email, hashedPassword]
    );
    const user_id = userResult.rows[0].user_id;

    // Insert into business_owners table (business_name and service_category now optional/nullable)
    const businessResult = await client.query(
      `INSERT INTO business_owners
        (user_id, business_name, service_category, description, phone_number, street, city, state, zip_code, service_radius_miles)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING business_id, business_name, zip_code, street, city, state, service_category`,
      [
        user_id,
        business_name || null,
        service_category || null,
        description || null,
        phone_number || null,
        street,
        city,
        state,
        zip_code,
        service_radius_miles ? Number(service_radius_miles) : null,
      ]
    );

    await client.query("COMMIT");

    return res.status(201).json({
      message: "Business owner registered successfully",
      business: businessResult.rows[0],
    });
  } catch (error: any) {
    await client.query("ROLLBACK");
    console.error("Business registration error:", error);
    return res.status(500).json({
      message: "Failed to register business owner",
      error: error.message,
    });
  } finally {
    client.release();
  }
});


export default router;