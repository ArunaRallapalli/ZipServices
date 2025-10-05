import { Router, Request, Response } from "express";
import pool from "../config/pool";

const router = Router();

// Helper function for safe integer parsing
const safeParseInt = (value: any): number => {
  const parsed = parseInt(value);
  return isNaN(parsed) ? 0 : parsed;
};

/**
 * GET all messages for a business owner
 * Returns unique customers with last message
 */
router.get("/business-owner/:userId", async (req: Request, res: Response) => {
  const { userId } = req.params;
  const id = parseInt(userId, 10);
  
  console.log(`[DEBUG] Fetching customers for business owner ID: ${id}`);
  
  if (isNaN(id)) {
    console.error(`[ERROR] Invalid user ID provided: ${userId}`);
    return res.status(400).json({ error: "Invalid user ID" });
  }

  try {
    // Debug: Check what messages exist for this business owner
    const debugMessages = await pool.query(
      `SELECT sender_id, receiver_id, message_text, created_at 
       FROM messages 
       WHERE receiver_id = $1
       ORDER BY created_at DESC 
       LIMIT 10`,
      [id]
    );
    
    console.log(`[DEBUG] Found ${debugMessages.rows.length} messages for business owner ${id}`);
    console.log(`[DEBUG] Sample messages:`, debugMessages.rows.slice(0, 3));

    // Get unique customers who sent messages to this business owner
    // Fixed query to handle the data type differences properly
    const result = await pool.query(
      `WITH latest_messages AS (
         SELECT DISTINCT ON (m.sender_id) 
           m.sender_id,
           m.message_text,
           m.created_at
         FROM messages m
         WHERE m.receiver_id = $1
           AND m.sender_id != $1
         ORDER BY m.sender_id, m.created_at DESC
       )
       SELECT 
         lm.sender_id::bigint as user_id,
         COALESCE(c.full_name, u.email, 'Unknown Customer') as full_name,
         u.email,
         lm.message_text as last_message,
         lm.created_at as last_message_time
       FROM latest_messages lm
       JOIN users u ON lm.sender_id = u.user_id
       LEFT JOIN customers c ON lm.sender_id = c.user_id
       ORDER BY lm.created_at DESC`,
      [id]
    );

    console.log(`[DEBUG] Customer query returned ${result.rows.length} rows`);
    
    if (result.rows.length > 0) {
      console.log(`[DEBUG] First customer:`, result.rows[0]);
      console.log(`[DEBUG] All customers:`, result.rows.map(r => ({ 
        user_id: r.user_id, 
        full_name: r.full_name,
        email: r.email,
        last_message: r.last_message?.substring(0, 30) + '...'
      })));
    }
    
    // Sanitize the customer data - be more lenient with validation
    const sanitizedCustomers = result.rows.map(customer => {
      const userId = safeParseInt(customer.user_id);
      console.log(`[DEBUG] Processing customer:`, { 
        raw_user_id: customer.user_id, 
        parsed_user_id: userId, 
        full_name: customer.full_name,
        email: customer.email 
      });
      
      return {
        user_id: userId,
        full_name: customer.full_name || customer.email || 'Unknown Customer',
        email: customer.email || '',
        last_message: customer.last_message || '',
        last_message_time: customer.last_message_time
      };
    });

    // More lenient filtering - only require user_id > 0
    const validCustomers = sanitizedCustomers.filter(customer => {
      const isValid = customer.user_id > 0;
      if (!isValid) {
        console.log(`[DEBUG] Invalid customer filtered out:`, customer);
      }
      return isValid;
    });

    console.log(`[DEBUG] Returning ${validCustomers.length} valid customers out of ${sanitizedCustomers.length}`);
    
    if (validCustomers.length === 0) {
      console.log(`[DEBUG] No valid customers found. Raw result:`, result.rows);
      console.log(`[DEBUG] Sanitized customers:`, sanitizedCustomers);
    }
    
    res.json(validCustomers);
    
  } catch (err) {
    console.error("[ERROR] Fetch business owner messages error:", err);
    console.error("[ERROR] Error details:", {
      message: err.message,
      stack: err.stack
    });
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

  console.log(`[DEBUG] Fetching messages between users ${currentId} and ${otherId}`);

  if (isNaN(currentId) || isNaN(otherId)) {
    console.error(`[ERROR] Invalid user IDs: currentUserId=${currentUserId}, otherUserId=${otherUserId}`);
    return res.status(400).json({ error: "Invalid user IDs" });
  }

  try {
    // Query without explicit casting since both are bigint in messages table
    const result = await pool.query(
      `SELECT id, sender_id, receiver_id, message_text, is_read, created_at 
       FROM messages
       WHERE (sender_id = $1 AND receiver_id = $2)
          OR (sender_id = $2 AND receiver_id = $1)
       ORDER BY created_at ASC`,
      [currentId, otherId]
    );

    console.log(`[DEBUG] Found ${result.rows.length} messages between users`);
    
    if (result.rows.length > 0) {
      console.log(`[DEBUG] First message:`, result.rows[0]);
    }

    // Mark received messages as read
    const updateResult = await pool.query(
      `UPDATE messages
       SET is_read = true
       WHERE receiver_id = $1 AND sender_id = $2 AND is_read = false`,
      [currentId, otherId]
    );

    console.log(`[DEBUG] Marked ${updateResult.rowCount} messages as read`);

    // Sanitize messages with safe parsing
    const sanitizedMessages = result.rows.map((msg) => {
      return {
        id: safeParseInt(msg.id),
        sender_id: safeParseInt(msg.sender_id),
        receiver_id: safeParseInt(msg.receiver_id),
        message_text: msg.message_text || '',
        created_at: msg.created_at,
        is_read: Boolean(msg.is_read)
      };
    });

    // Filter out any messages with invalid IDs
    const validMessages = sanitizedMessages.filter(msg => 
      msg.id > 0 && msg.sender_id > 0 && msg.receiver_id > 0 && msg.message_text.trim()
    );

    console.log(`[DEBUG] Returning ${validMessages.length} valid messages`);
    res.json(validMessages);
    
  } catch (err) {
    console.error("[ERROR] Fetch messages error:", err);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

/**
 * POST a new message
 */
router.post("/", async (req: Request, res: Response) => {
  const { sender_id, receiver_id, message_text } = req.body;
  
  console.log(`[DEBUG] Creating new message:`, { sender_id, receiver_id, message_length: message_text?.length });
  
  if (!sender_id || !receiver_id || !message_text?.trim()) {
    console.error(`[ERROR] Missing required fields:`, { sender_id, receiver_id, hasMessageText: !!message_text });
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const result = await pool.query(
      `INSERT INTO messages (sender_id, receiver_id, message_text, is_read, created_at)
       VALUES ($1, $2, $3, false, NOW()) RETURNING *`,
      [sender_id, receiver_id, message_text.trim()]
    );

    const newMessage = result.rows[0];
    console.log(`[DEBUG] Created new message with ID:`, newMessage.id);

    const sanitizedMessage = {
      id: safeParseInt(newMessage.id),
      sender_id: safeParseInt(newMessage.sender_id),
      receiver_id: safeParseInt(newMessage.receiver_id),
      message_text: newMessage.message_text || '',
      created_at: newMessage.created_at,
      is_read: Boolean(newMessage.is_read)
    };

    res.status(201).json(sanitizedMessage);
  } catch (err) {
    console.error("[ERROR] Send message error:", err);
    res.status(500).json({ error: "Failed to send message" });
  }
});

/**
 * Debug endpoint to check data
 */
router.get("/debug/business-owner/:userId", async (req: Request, res: Response) => {
  const { userId } = req.params;
  const id = parseInt(userId, 10);
  
  try {
    // Check messages for this business owner
    const messages = await pool.query(
      `SELECT id, sender_id, receiver_id, message_text, created_at 
       FROM messages 
       WHERE receiver_id = $1 
       ORDER BY created_at DESC`,
      [id]
    );

    // Check if this user exists in users table
    const user = await pool.query(
      `SELECT user_id, email, user_type FROM users WHERE user_id = $1`,
      [id]
    );

    // Check business_owners table
    const businessOwner = await pool.query(
      `SELECT user_id, business_name FROM business_owners WHERE user_id = $1`,
      [id]
    );

    // Check customers table structure
    const customers = await pool.query(
      `SELECT user_id, full_name FROM customers LIMIT 5`
    );

    // Get all users who sent messages to this business owner
    const senders = await pool.query(
      `SELECT DISTINCT m.sender_id, u.email, c.full_name 
       FROM messages m
       JOIN users u ON m.sender_id = u.user_id
       LEFT JOIN customers c ON m.sender_id = c.user_id
       WHERE m.receiver_id = $1`,
      [id]
    );

    res.json({
      business_owner_id: id,
      user_exists: user.rows,
      business_owner_exists: businessOwner.rows,
      messages_count: messages.rows.length,
      messages_sample: messages.rows.slice(0, 3),
      customers_sample: customers.rows,
      senders: senders.rows
    });
  } catch (err) {
    console.error("[ERROR] Debug endpoint error:", err);
    res.status(500).json({ error: "Debug failed", details: err.message });
  }
});

export default router;