import { Router } from "express";
import pool from "../config/pool";

const router = Router();

/**
 * GET /customers/service_category
 */
router.get("/service_category", async (_req, res) => {
  try {
    const result = await pool.query(
      "SELECT DISTINCT service_category FROM business_owners ORDER BY service_category"
    );
    const serviceCategories = result.rows.map(row => row.service_category);
    res.json(serviceCategories);
  } catch (err: any) {
    console.error("Failed to fetch service categories:", err.message);
    res.status(500).json({ message: "Failed to fetch service categories", error: err.message });
  }
});

/**
 * POST /customers/register
 */
router.post("/register", async (req, res) => {
  try {
    const { user_id, full_name, zip_code, phone_number, service_needed } = req.body;

    if (!user_id || !full_name || !zip_code || !service_needed) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const userCheck = await pool.query("SELECT * FROM users WHERE user_id = $1", [user_id]);
    if (userCheck.rowCount === 0) {
      return res.status(400).json({ message: "Invalid user_id" });
    }

    const insertQuery = `
      INSERT INTO customers (user_id, full_name, zip_code, phone_number, service_needed)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
    `;
    const values = [user_id, full_name, zip_code, phone_number || null, service_needed];
    const result = await pool.query(insertQuery, values);

    res.status(201).json({ message: "Customer registered successfully", customer: result.rows[0] });
  } catch (err: any) {
    console.error("Customer registration error:", err.message);
    res.status(500).json({ message: "Failed to register customer", error: err.message });
  }
});

/**
 * GET /customers/search
 */
router.get("/search", async (req, res) => {
  try {
    const { zip_code, service_category } = req.query;

    if (!zip_code || !service_category) {
      return res.status(400).json({ message: "Missing zip_code or service_category query parameters" });
    }

    const query = `
      SELECT bo.business_id, bo.business_name, bo.service_category, bo.description, bo.phone_number,
             bo.zip_code, bo.city, bo.state, bo.street, bo.service_radius_miles,
             u.email, u.user_id
      FROM business_owners bo
      JOIN users u ON bo.user_id = u.user_id
      WHERE bo.zip_code = $1 AND bo.service_category = $2
      ORDER BY bo.business_name
    `;
    const values = [zip_code, service_category];

    const result = await pool.query(query, values);
    res.json(result.rows);
  } catch (err: any) {
    console.error("Search businesses error:", err.message);
    res.status(500).json({ message: "Failed to fetch businesses", error: err.message });
  }
});

/**
 * GET /customers/by-user/:user_id
 * Fetch customer data using user_id for customer profile screen
 */
router.get("/by-user/:user_id", async (req, res) => {
  const { user_id } = req.params;

  try {
    const result = await pool.query(
      `SELECT c.customer_id, c.user_id, c.full_name, c.zip_code, c.phone_number, c.service_needed,
              u.email, u.user_type, u.password, u.created_at, u.updated_at
       FROM customers c
       JOIN users u ON c.user_id = u.user_id
       WHERE c.user_id = $1`,
      [parseInt(user_id)] // Ensure user_id is parsed as integer
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Customer not found for this user_id" });
    }

    // Return the combined customer and user data
    const customerData = result.rows[0];
    res.json(customerData);
  } catch (err: any) {
    console.error("Failed to fetch customer by user_id:", err.message);
    res.status(500).json({ message: "Failed to fetch customer", error: err.message });
  }
});

/**
 * PUT /customers/by-user/:user_id
 * Update customer profile
 */
router.put("/by-user/:user_id", async (req, res) => {
  const { user_id } = req.params;
  const { full_name, zip_code, phone_number, email, password } = req.body;

  try {
    // Start a transaction to ensure data consistency
    await pool.query('BEGIN');

    // Update the customers table (no updated_at column exists here)
    const updateCustomerQuery = `
      UPDATE customers
      SET full_name = $1,
          zip_code = $2,
          phone_number = $3
      WHERE user_id = $4
      RETURNING *;
    `;
    const customerResult = await pool.query(updateCustomerQuery, [
      full_name,
      zip_code,
      phone_number,
      user_id,
    ]);

    if (customerResult.rowCount === 0) {
      await pool.query('ROLLBACK');
      return res.status(404).json({ message: "Customer not found" });
    }

    // Always update the users table for email/password and to trigger updated_at
    const userUpdates: string[] = [];
    const userValues: any[] = [];
    let idx = 1;
    
    if (email) {
      userUpdates.push(`email = $${idx++}`);  // Fixed: Added $ prefix
      userValues.push(email);
    }
    if (password) {
      userUpdates.push(`password = $${idx++}`);  // Fixed: Added $ prefix
      userValues.push(password); // Consider hashing the password before storing
    }
    
    // Always update updated_at timestamp in users table
    if (userUpdates.length > 0) {
      userUpdates.push(`updated_at = NOW()`);
      const updateUserQuery = `
        UPDATE users
        SET ${userUpdates.join(", ")}
        WHERE user_id = $${idx}
        RETURNING *;
      `;
      userValues.push(user_id);
      await pool.query(updateUserQuery, userValues);
    } else {
      // Even if no email/password change, update the timestamp
      await pool.query(
        `UPDATE users SET updated_at = NOW() WHERE user_id = $1`,
        [user_id]
      );
    }

    // Commit the transaction
    await pool.query('COMMIT');

    res.json({
      message: "Customer profile updated successfully",
      customer: customerResult.rows[0],
    });
  } catch (err: any) {
    // Rollback on error
    await pool.query('ROLLBACK');
    console.error("Failed to update customer profile:", err.message);
    res.status(500).json({ message: "Failed to update profile", error: err.message });
  }
});
export default router;