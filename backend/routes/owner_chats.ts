// backend/routes/owner_chats.ts
import { Router, Request, Response } from "express";

const router = Router();

// GET /owner_chats/:business_id?customerId=123 → fetch messages between a business owner and a customer
router.get("/:business_id", async (req: Request, res: Response) => {
  const pool = (req as any).pool;
  const businessId = parseInt(req.params.business_id, 10);
  const customerId = parseInt(req.query.customerId as string, 10);

  if (isNaN(businessId) || isNaN(customerId)) {
    return res.status(400).json({ message: "Invalid business_id or customerId" });
  }

  try {
    const result = await pool.query(
      `SELECT * FROM messages
       WHERE (sender_id = $1 AND receiver_id = $2)
          OR (sender_id = $2 AND receiver_id = $1)
       ORDER BY created_at ASC`,
      [businessId, customerId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Fetch messages error:", err);
    res.status(500).json({ message: "Server error", error: (err as Error).message });
  }
});

// POST /owner_chats → send a new message
router.post("/", async (req: Request, res: Response) => {
  const pool = (req as any).pool;
  const { businessOwnerId, customerId, message, sender } = req.body;

  if (!businessOwnerId || !customerId || !message || !sender) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  try {
    const result = await pool.query(
      `INSERT INTO messages (sender_id, receiver_id, message_text, created_at)
       VALUES ($1, $2, $3, NOW())
       RETURNING *`,
      [
        sender === "business_owner" ? businessOwnerId : customerId,
        sender === "business_owner" ? customerId : businessOwnerId,
        message,
      ]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Send message error:", err);
    res.status(500).json({ message: "Server error", error: (err as Error).message });
  }
});

export default router;
