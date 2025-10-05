// backend/routes/messages.ts
import { Router, Request, Response } from "express";
import pool from "../config/pool";

const router = Router();

/**
 * GET all messages for a business owner
 * Includes customer name whether they are sender or receiver
 */
router.get("/business-owner/:userId", async (req: Request, res: Response) => {
  const { userId } = req.params;
  const id = parseInt(userId, 10);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid user IDs" });

  try {
    const result = await pool.query(
      `SELECT
        m.id,
        m.sender_id,
        m.receiver_id,
        m.message_text,
        m.is_read,
        m.created_at,
        sender_c.full_name AS sender_name,
        sender_u.email AS sender_email,
        receiver_c.full_name AS receiver_name,
        receiver_u.email AS receiver_email,
        COALESCE(sender_bo.business_name, receiver_bo.business_name) AS business_name
      FROM messages m
      LEFT JOIN users sender_u ON m.sender_id = sender_u.user_id
      LEFT JOIN users receiver_u ON m.receiver_id = receiver_u.user_id
      LEFT JOIN customers sender_c ON m.sender_id = sender_c.user_id
      LEFT JOIN customers receiver_c ON m.receiver_id = receiver_c.user_id
      LEFT JOIN business_owners sender_bo ON m.sender_id = sender_bo.user_id
      LEFT JOIN business_owners receiver_bo ON m.receiver_id = receiver_bo.user_id
      WHERE m.receiver_id = $1 OR m.sender_id = $1
      ORDER BY m.created_at ASC`,
      [id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Fetch business owner messages error:", err);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

/**
 * GET messages between two users
 * Auto-marks received messages as read
 */
router.get("/:currentUserId/:otherUserId", async (req: Request, res: Response) => {
  const { currentUserId, otherUserId } = req.params;
  const currentId = parseInt(currentUserId, 10);
  const otherId = parseInt(otherUserId, 10);

  if (isNaN(currentId) || isNaN(otherId)) {
    return res.status(400).json({ error: "Invalid user IDs" });
  }

  console.log(`Fetching messages between currentUser: ${currentId} and otherUser: ${otherId}`);

  try {
    // First, fetch all messages between the two users
    const result = await pool.query(
      `SELECT 
        m.*,
        CASE 
          WHEN m.sender_id != $1 THEN 
            COALESCE(c.full_name, bo.business_name, 'Unknown')
          ELSE NULL 
        END as sender_name
       FROM messages m
       LEFT JOIN customers c ON m.sender_id = c.user_id
       LEFT JOIN business_owners bo ON m.sender_id = bo.user_id
       WHERE (sender_id = $1 AND receiver_id = $2)
          OR (sender_id = $2 AND receiver_id = $1)
       ORDER BY created_at ASC`,
      [currentId, otherId]
    );

    console.log(`Found ${result.rows.length} messages`);

    // Then mark messages as read (messages sent TO the current user FROM the other user)
    const markReadResult = await pool.query(
      `UPDATE messages
       SET is_read = true
       WHERE receiver_id = $1 AND sender_id = $2 AND is_read = false
       RETURNING id`,
      [currentId, otherId]
    );

    console.log(`Marked ${markReadResult.rows.length} messages as read`);

    res.json(result.rows);
  } catch (err) {
    console.error("Fetch messages error:", err);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

/**
 * POST a new message
 */
router.post("/", async (req: Request, res: Response) => {
  const { sender_id, receiver_id, message_text } = req.body;
  if (!sender_id || !receiver_id || !message_text) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const result = await pool.query(
      `INSERT INTO messages (sender_id, receiver_id, message_text, is_read, created_at)
       VALUES ($1, $2, $3, $4, NOW()) RETURNING *`,
      [sender_id, receiver_id, message_text, false]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Send message error:", err);
    res.status(500).json({ error: "Failed to send message" });
  }
});

/**
 * GET all customers
 */
router.get("/customers", async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT c.customer_id, c.user_id, c.phone_number, c.zip_code, 
              c.full_name, c.service_needed, u.email
       FROM customers c
       JOIN users u ON c.user_id = u.user_id
       WHERE u.user_type = 'customer'
       ORDER BY c.full_name ASC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Fetch customers error:", err);
    res.status(500).json({ error: "Failed to fetch customers" });
  }
});

/**
 * GET business owner info
 */
router.get("/business-owner-info/:userId", async (req: Request, res: Response) => {
  const { userId } = req.params;
  const id = parseInt(userId, 10);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid user ID" });

  try {
    const result = await pool.query(
      `SELECT * FROM business_owners WHERE user_id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Business owner not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Fetch business owner error:", err);
    res.status(500).json({ error: "Failed to fetch business owner" });
  }
});

/**
 * GET conversations for a specific customer
 * Returns both business owners AND other customers the user has chatted with
 * FIXED: Better error handling and simpler query structure
 */
router.get("/customer/:userId/conversations", async (req: Request, res: Response) => {
  const { userId } = req.params;
  const id = parseInt(userId, 10);
  
  console.log(`[API] GET /customer/${userId}/conversations - Parsed ID: ${id}`);
  
  if (isNaN(id)) {
    console.error(`[API] Invalid user ID: ${userId}`);
    return res.status(400).json({ error: "Invalid user ID" });
  }

  try {
    console.log(`[API] Fetching conversations for customer ${id}`);
    
    // Get all unique conversations for this customer
    const result = await pool.query(
      `WITH conversation_users AS (
        SELECT DISTINCT
          CASE 
            WHEN m.sender_id = $1 THEN m.receiver_id 
            ELSE m.sender_id 
          END as other_user_id
        FROM messages m
        WHERE m.sender_id = $1 OR m.receiver_id = $1
      )
      SELECT 
        cu.other_user_id,
        COALESCE(bo.business_name, c.full_name, 'Unknown') as contact_name,
        bo.business_id,
        u.user_type,
        (
          SELECT m2.message_text 
          FROM messages m2 
          WHERE (m2.sender_id = $1 AND m2.receiver_id = cu.other_user_id) 
             OR (m2.receiver_id = $1 AND m2.sender_id = cu.other_user_id)
          ORDER BY m2.created_at DESC 
          LIMIT 1
        ) as last_message,
        (
          SELECT m2.created_at 
          FROM messages m2 
          WHERE (m2.sender_id = $1 AND m2.receiver_id = cu.other_user_id) 
             OR (m2.receiver_id = $1 AND m2.sender_id = cu.other_user_id)
          ORDER BY m2.created_at DESC 
          LIMIT 1
        ) as last_message_time,
        (
          SELECT COUNT(*) 
          FROM messages m2 
          WHERE m2.receiver_id = $1 
            AND m2.sender_id = cu.other_user_id
            AND m2.is_read = false
        ) as unread_count
      FROM conversation_users cu
      JOIN users u ON cu.other_user_id = u.user_id
      LEFT JOIN business_owners bo ON u.user_id = bo.user_id
      LEFT JOIN customers c ON u.user_id = c.user_id
      ORDER BY last_message_time DESC NULLS LAST`,
      [id]
    );

    console.log(`[API] Found ${result.rows.length} conversations for customer ${id}`);
    
    // Log first conversation for debugging
    if (result.rows.length > 0) {
      console.log(`[API] Sample conversation:`, result.rows[0]);
    }
    
    res.json(result.rows);
  } catch (err: any) {
    console.error("[API] Error fetching customer conversations:", err);
    console.error("[API] Error details:", {
      message: err.message,
      code: err.code,
      detail: err.detail,
    });
    res.status(500).json({ 
      error: "Failed to fetch conversations",
      details: __DEV__ ? err.message : undefined 
    });
  }
});

/**
 * Health check endpoint for debugging
 */
router.get("/health", async (_req: Request, res: Response) => {
  try {
    // Test database connection
    const result = await pool.query('SELECT NOW()');
    res.json({ 
      status: "ok", 
      database: "connected",
      timestamp: result.rows[0].now 
    });
  } catch (err: any) {
    console.error("Health check failed:", err);
    res.status(500).json({ 
      status: "error", 
      database: "disconnected",
      error: err.message 
    });
  }
});

export default router;