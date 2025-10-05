import { Router } from "express";
import pool from "../backend/config/pool";

const router = Router();

/**
 * GET /business-owners/by-user/:user_id
 * Fetch business owner data using user_id for business owner profile screen
 */
router.get("/by-user/:user_id", async (req, res) => {
  const { user_id } = req.params;

  try {
    const result = await pool.query(
      `SELECT bo.business_id, bo.user_id, bo.business_name, bo.service_category, 
              bo.description, bo.phone_number, bo.zip_code, bo.service_radius_miles,
              bo.street, bo.city, bo.state,
              u.email, u.user_type, u.password, u.created_at, u.updated_at
       FROM business_owners bo
       JOIN users u ON bo.user_id = u.user_id
       WHERE bo.user_id = $1`,
      [parseInt(user_id)] // Ensure user_id is parsed as integer
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Business owner not found for this user_id" });
    }

    // Return the combined business owner and user data
    const businessOwnerData = result.rows[0];
    res.json(businessOwnerData);
  } catch (err: any) {
    console.error("Failed to fetch business owner by user_id:", err.message);
    res.status(500).json({ message: "Failed to fetch business owner", error: err.message });
  }
});

/**
 * PUT /business-owners/by-user/:user_id
 * Update business owner profile
 */
router.put("/by-user/:user_id", async (req, res) => {
  const { user_id } = req.params;
  const { 
    business_name, 
    service_category, 
    description, 
    phone_number, 
    zip_code, 
    service_radius_miles,
    street,
    city,
    state,
    email, 
    password 
  } = req.body;

  try {
    // Start a transaction to ensure data consistency
    await pool.query('BEGIN');

    // Update the business_owners table
    const updateBusinessOwnerQuery = `
      UPDATE business_owners
      SET business_name = $1,
          service_category = $2,
          description = $3,
          phone_number = $4,
          zip_code = $5,
          service_radius_miles = $6,
          street = $7,
          city = $8,
          state = $9
      WHERE user_id = $10
      RETURNING *;
    `;
    const businessOwnerResult = await pool.query(updateBusinessOwnerQuery, [
      business_name,
      service_category,
      description,
      phone_number,
      zip_code,
      service_radius_miles || 12, // Default to 12 if not provided
      street,
      city,
      state,
      user_id,
    ]);

    if (businessOwnerResult.rowCount === 0) {
      await pool.query('ROLLBACK');
      return res.status(404).json({ message: "Business owner not found" });
    }

    // Always update the users table for email/password and to trigger updated_at
    const userUpdates: string[] = [];
    const userValues: any[] = [];
    let idx = 1;
    
    if (email) {
      userUpdates.push(`email = $${idx++}`);
      userValues.push(email);
    }
    if (password) {
      userUpdates.push(`password = $${idx++}`);
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
      message: "Business owner profile updated successfully",
      business_owner: businessOwnerResult.rows[0],
    });
  } catch (err: any) {
    // Rollback on error
    await pool.query('ROLLBACK');
    console.error("Failed to update business owner profile:", err.message);
    res.status(500).json({ message: "Failed to update profile", error: err.message });
  }
});

export default router;