import { Router } from "express";
import pool from "../config/pool";

const router = Router();

/**
 * GET /customers/service_category
 * Returns distinct service categories from business_owners table
 */
router.get("/service_category", async (_req, res) => {
  try {
    const result = await pool.query(
      "SELECT DISTINCT service_category FROM business_owners ORDER BY service_category"
    );
    res.json(result.rows.map(row => row.service_category));
  } catch (err: any) {
    console.error("Failed to fetch service categories:", err.message);
    res.status(500).json({ message: "Failed to fetch service categories", error: err.message });
  }
});

/**
 * POST /customers/register
 * Registers a new customer linked to an existing user_id
 */
router.post("/register", async (req, res) => {
  try {
    const { user_id, full_name, zip_code, phone_number, service_needed } = req.body;

    if (!user_id || !full_name || !zip_code || !service_needed) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Check user exists
    const userCheck = await pool.query("SELECT * FROM users WHERE user_id = $1", [user_id]);
    if (userCheck.rowCount === 0) {
      return res.status(400).json({ message: "Invalid user_id. User must exist first." });
    }

    // Insert customer
    const insertQuery = `
      INSERT INTO customers (user_id, full_name, zip_code, phone_number, service_needed)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
    `;
    const values = [user_id, full_name, zip_code, phone_number || null, service_needed];
    const result = await pool.query(insertQuery, values);

    res.status(201).json({
      message: "Customer registered successfully",
      customer: result.rows[0],
    });
  } catch (err: any) {
    console.error("Customer registration error:", err.message);
    res.status(500).json({
      message: "Failed to register customer",
      error: err.message,
    });
  }
});

/**
 * GET /customers/search
 * Returns businesses filtered by zip_code and service_category
 * Query params: zip_code, service_category
 */
router.get("/search", async (req, res) => {
  try {
    const zip_code = String(req.query.zip_code);
    const service_category = String(req.query.service_category);

    if (!zip_code || !service_category) {
      return res.status(400).json({ message: "Missing zip_code or service_category query parameters" });
    }

    const query = `
      SELECT business_id, business_name, service_category, description, phone_number, email, zip_code
      FROM business_owners
      WHERE zip_code = $1 AND service_category ILIKE $2
      ORDER BY business_name
    `;
    const values = [zip_code, service_category];

    const result = await pool.query(query, values);
    res.json(result.rows);
  } catch (err: any) {
    console.error("Search businesses error:", err.message);
    res.status(500).json({
      message: "Failed to fetch businesses",
      error: err.message,
    });
  }
});

export default router;
