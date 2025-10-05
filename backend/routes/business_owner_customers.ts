import express, { Request, Response } from "express";
import pool from "../config/pool"; // import your shared pg Pool

const router = express.Router();

/**
 * ------------------------------------------------------------
 * GET /business_owners/customers/test
 * Simple health check for this router
 * ------------------------------------------------------------
 */
router.get("/test", (_req: Request, res: Response) => {
  res.json({
    message: "Business owner customers router is working!",
    availableRoutes: [
      "GET /:businessId       - Customers for a business_id",
      "GET /by-user/:userId   - Customers for a business owner user_id",
      "GET /test              - Health check",
    ],
  });
});

/**
 * ------------------------------------------------------------
 * GET /business_owners/customers/by-user/:userId
 * Fetch all customers that have exchanged messages with a
 * business owner by directly providing the owner’s user_id
 * ------------------------------------------------------------
 */
router.get("/by-user/:userId", async (req: Request, res: Response) => {
  const userId = Number(req.params.userId);
  if (isNaN(userId)) return res.status(400).json({ message: "Invalid user ID" });

  try {
    // Verify the user is a business owner
    const ownerCheck = await pool.query(
      `SELECT u.user_id
         FROM users u
         JOIN business_owners bo ON bo.user_id = u.user_id
        WHERE u.user_id = $1
          AND u.user_type = 'business_owner'`,
      [userId]
    );

    if (ownerCheck.rowCount === 0) {
      return res.status(404).json({ message: "Business owner not found" });
    }

    const customers = await pool.query(
      `SELECT DISTINCT
          c.user_id AS customer_id,
          c.full_name,
          c.phone_number,
          c.zip_code,
          u.email
         FROM messages m
         JOIN users u
           ON (u.user_id = m.sender_id OR u.user_id = m.receiver_id)
         JOIN customers c ON c.user_id = u.user_id
        WHERE (m.sender_id = $1 OR m.receiver_id = $1)
          AND u.user_id != $1
          AND u.user_type = 'customer'
        ORDER BY c.full_name`,
      [userId]
    );

    return res.status(200).json(customers.rows);
  } catch (err: any) {
    console.error("Error fetching customers by user_id:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
});

/**
 * ------------------------------------------------------------
 * GET /business_owners/customers/:businessId
 * Fetch all customers that have exchanged messages with the
 * business owner who owns the given business_id.
 * ------------------------------------------------------------
 */
router.get("/:businessId", async (req: Request, res: Response) => {
  const businessId = Number(req.params.businessId);
  if (isNaN(businessId)) {
    return res.status(400).json({ message: "Invalid business ID" });
  }

  try {
    // 1️⃣ Map business_id → user_id
    const owner = await pool.query(
      `SELECT bo.user_id
         FROM business_owners bo
         JOIN users u ON bo.user_id = u.user_id
        WHERE bo.business_id = $1
          AND u.user_type = 'business_owner'`,
      [businessId]
    );

    if (owner.rowCount === 0) {
      return res
        .status(404)
        .json({ message: "Business owner not found for this business_id" });
    }

    const ownerUserId = owner.rows[0].user_id;

    // 2️⃣ Fetch distinct customers who have exchanged messages with that owner
    const customers = await pool.query(
      `SELECT DISTINCT
          c.user_id AS customer_id,
          c.full_name,
          c.phone_number,
          c.zip_code,
          u.email
         FROM messages m
         JOIN users u
           ON (u.user_id = m.sender_id OR u.user_id = m.receiver_id)
         JOIN customers c ON c.user_id = u.user_id
        WHERE (m.sender_id = $1 OR m.receiver_id = $1)
          AND u.user_id != $1
          AND u.user_type = 'customer'
        ORDER BY c.full_name`,
      [ownerUserId]
    );

    return res.status(200).json(customers.rows);
  } catch (err: any) {
    console.error("Error fetching customers by business_id:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
});

export default router;
