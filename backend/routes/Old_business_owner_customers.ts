import express, { Request, Response } from "express";
import pool from "../config/pool";

const router = express.Router();

/**
 * GET /business_owner_customers/:businessOwnerUserId
 * Fetch all customers that have exchanged messages with a business owner
 */
router.get("/:businessOwnerUserId", async (req: Request, res: Response) => {
  const businessOwnerUserId = parseInt(req.params.businessOwnerUserId, 10);

  if (isNaN(businessOwnerUserId)) {
    return res.status(400).json({ message: "Invalid user ID" });
  }

  try {
    // Ensure user exists and is a business owner
    const userCheckQuery = `
      SELECT user_id
      FROM users
      WHERE user_id = $1
        AND user_type = 'business_owner';
    `;
    const userCheckResult = await pool.query(userCheckQuery, [businessOwnerUserId]);

    if (userCheckResult.rowCount === 0) {
      return res.status(400).json({ message: "Invalid business owner ID" });
    }

    // Fetch customers who have exchanged messages with this business owner
    const query = `
      SELECT DISTINCT
        c.user_id AS customer_id,
        c.full_name,
        c.phone_number,
        c.zip_code
      FROM messages m
      JOIN customers c
        ON c.user_id = m.sender_id OR c.user_id = m.receiver_id
      WHERE (m.sender_id = $1 OR m.receiver_id = $1)
        AND c.user_id != $1
      ORDER BY c.full_name;
    `;

    const { rows } = await pool.query(query, [businessOwnerUserId]);
    return res.status(200).json(rows);
  } catch (error: any) {
    console.error("Error fetching customers:", error);
    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
});

export default router;
