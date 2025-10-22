// backend/routes/messages.ts
import { Router, Request, Response } from "express";
import pool from "../config/pool";

const router = Router();

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

/**
 * GET all business owners (renamed from customers since everyone is business_owner now)
 */
router.get("/business-owners/all", async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT bo.business_id, bo.user_id, bo.phone_number, bo.zip_code, 
              bo.business_name, bo.service_category, u.email
       FROM business_owners bo
       JOIN users u ON bo.user_id = u.user_id
       WHERE u.user_type = 'business_owner'
       ORDER BY bo.business_name ASC`
    );
    
    // Convert bigint IDs to numbers
    const businessOwners = result.rows.map(row => ({
      ...row,
      business_id: parseInt(row.business_id, 10),
      user_id: parseInt(row.user_id, 10)
    }));
    
    res.json(businessOwners);
  } catch (err) {
    console.error("Fetch business owners error:", err);
    res.status(500).json({ error: "Failed to fetch business owners" });
  }
});

/**
 * GET business owner info
 * Using /business-owner/info/:userId to avoid route conflicts
 */
router.get("/business-owner/info/:userId", async (req: Request, res: Response) => {
  const { userId } = req.params;
  const id = parseInt(userId, 10);
  
  console.log(`[business-owner-info] Received request for userId: ${userId}, parsed: ${id}`);
  
  if (isNaN(id)) {
    console.log(`[business-owner-info] Invalid user ID: ${userId}`);
    return res.status(400).json({ error: "Invalid user ID" });
  }

  try {
    const result = await pool.query(
      `SELECT * FROM business_owners WHERE user_id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      console.log(`[business-owner-info] No business owner found for user_id: ${id}`);
      return res.status(404).json({ error: "Business owner not found" });
    }

    // Convert bigint IDs to numbers
    const businessOwner = {
      ...result.rows[0],
      user_id: parseInt(result.rows[0].user_id, 10),
      business_id: parseInt(result.rows[0].business_id, 10)
    };

    console.log(`[business-owner-info] Successfully fetched business owner:`, businessOwner);
    res.json(businessOwner);
  } catch (err) {
    console.error("[business-owner-info] Fetch business owner error:", err);
    res.status(500).json({ error: "Failed to fetch business owner" });
  }
});

/**
 * GET all messages for a business owner
 * Returns messages with business_name for both sender and receiver
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
        sender_bo.business_name AS sender_name,
        sender_u.email AS sender_email,
        receiver_bo.business_name AS receiver_name,
        receiver_u.email AS receiver_email
      FROM messages m
      LEFT JOIN users sender_u ON m.sender_id = sender_u.user_id
      LEFT JOIN users receiver_u ON m.receiver_id = receiver_u.user_id
      LEFT JOIN business_owners sender_bo ON m.sender_id = sender_bo.user_id
      LEFT JOIN business_owners receiver_bo ON m.receiver_id = receiver_bo.user_id
      WHERE m.receiver_id = $1 OR m.sender_id = $1
      ORDER BY m.created_at ASC`,
      [id]
    );
    
    // Convert bigint IDs to numbers
    const messages = result.rows.map(row => ({
      ...row,
      id: parseInt(row.id, 10),
      sender_id: parseInt(row.sender_id, 10),
      receiver_id: parseInt(row.receiver_id, 10)
    }));
    
    res.json(messages);
  } catch (err) {
    console.error("Fetch business owner messages error:", err);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

/**
 * GET conversations for a user (works for all users now)
 * Returns all other users they have chatted with
 */
router.get("/conversations/:userId", async (req: Request, res: Response) => {
  const { userId } = req.params;
  const id = parseInt(userId, 10);
  
  console.log(`[API] GET /conversations/${userId} - Parsed ID: ${id}`);
  
  if (isNaN(id)) {
    console.error(`[API] Invalid user ID: ${userId}`);
    return res.status(400).json({ error: "Invalid user ID" });
  }

  try {
    console.log(`[API] Fetching conversations for user ${id}`);
    
    // Get all unique conversations for this user
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
        COALESCE(bo.business_name, 'Unknown') as contact_name,
        bo.business_id,
        u.user_type,
        u.email,
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
      ORDER BY last_message_time DESC NULLS LAST`,
      [id]
    );

    console.log(`[API] Found ${result.rows.length} conversations for user ${id}`);
    
    // Convert bigint IDs to numbers
    const conversations = result.rows.map(row => ({
      ...row,
      other_user_id: parseInt(row.other_user_id, 10),
      business_id: row.business_id ? parseInt(row.business_id, 10) : null,
      unread_count: parseInt(row.unread_count, 10)
    }));
    
    // Log first conversation for debugging
    if (conversations.length > 0) {
      console.log(`[API] Sample conversation:`, conversations[0]);
    }
    
    res.json(conversations);
  } catch (err: any) {
    console.error("[API] Error fetching conversations:", err);
    console.error("[API] Error details:", {
      message: err.message,
      code: err.code,
      detail: err.detail,
    });
    res.status(500).json({ 
      error: "Failed to fetch conversations",
      details: process.env.NODE_ENV === 'development' ? err.message : undefined 
    });
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
            COALESCE(bo.business_name, 'Unknown')
          ELSE NULL 
        END as sender_name
       FROM messages m
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

    // Convert bigint IDs to numbers
    const messages = result.rows.map(row => ({
      ...row,
      id: parseInt(row.id, 10),
      sender_id: parseInt(row.sender_id, 10),
      receiver_id: parseInt(row.receiver_id, 10)
    }));

    res.json(messages);
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

    // Convert bigint IDs to numbers
    const message = {
      ...result.rows[0],
      id: parseInt(result.rows[0].id, 10),
      sender_id: parseInt(result.rows[0].sender_id, 10),
      receiver_id: parseInt(result.rows[0].receiver_id, 10)
    };

    res.status(201).json(message);
  } catch (err) {
    console.error("Send message error:", err);
    res.status(500).json({ error: "Failed to send message" });
  }
});

/**
 * PUT mark messages as read
 * NEW ENDPOINT - Marks specific messages as read for a user
 */
router.put("/mark-read", async (req: Request, res: Response) => {
  const { message_ids, user_id } = req.body;
  
  if (!message_ids || !Array.isArray(message_ids) || !user_id) {
    return res.status(400).json({ error: "Missing required fields: message_ids (array) and user_id" });
  }

  const userId = parseInt(user_id, 10);
  if (isNaN(userId)) {
    return res.status(400).json({ error: "Invalid user_id" });
  }

  console.log(`[mark-read] Marking ${message_ids.length} messages as read for user ${userId}`);

  try {
    const result = await pool.query(
      `UPDATE messages
       SET is_read = true
       WHERE id = ANY($1::int[])
         AND receiver_id = $2
         AND is_read = false
       RETURNING id`,
      [message_ids, userId]
    );

    console.log(`[mark-read] Successfully marked ${result.rows.length} messages as read`);
    
    res.json({ 
      success: true, 
      marked_count: result.rows.length,
      message_ids: result.rows.map(row => parseInt(row.id, 10))
    });
  } catch (err) {
    console.error("[mark-read] Error marking messages as read:", err);
    res.status(500).json({ error: "Failed to mark messages as read" });
  }
});

export default router;