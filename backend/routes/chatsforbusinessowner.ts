// backend/routes/chatsforbusinessowner.ts
import { Router, Request, Response } from "express";
import { Pool } from "pg";

const router = Router();

// GET /chatsforbusinessowner/:businessOwnerId → fetch all messages grouped by customer
router.get("/:businessOwnerId", async (req: Request, res: Response) => {
  const pool: Pool = (req as any).pool;
  const { businessOwnerId } = req.params;

  const businessOwnerIdInt = parseInt(businessOwnerId, 10);
  if (isNaN(businessOwnerIdInt)) {
    return res.status(400).json({ message: "Invalid businessOwnerId" });
  }

  try {
    // Fetch all messages for this business owner
    const messagesResult = await pool.query(
      `SELECT m.id, m.sender_id, m.receiver_id, m.message_text, m.created_at, 
              c.customer_id, c.full_name, c.phone_number
       FROM messages m
       JOIN customers c ON m.sender_id = c.customer_id
       WHERE m.receiver_id = $1
       ORDER BY m.created_at ASC`,
      [businessOwnerIdInt]
    );

    const messages = messagesResult.rows;

    // Group messages by customer
    const grouped: any = {};
    messages.forEach((msg: any) => {
      const customerId = msg.customer_id;
      if (!grouped[customerId]) {
        grouped[customerId] = {
          customer: {
            customer_id: msg.customer_id,
            full_name: msg.full_name,
            phone_number: msg.phone_number,
          },
          messages: [],
        };
      }
      grouped[customerId].messages.push({
        id: msg.id,
        sender_id: msg.sender_id,
        receiver_id: msg.receiver_id,
        message_text: msg.message_text,
        created_at: msg.created_at,
      });
    });

    const result = Object.values(grouped);
    res.json(result);
  } catch (err) {
    console.error("Error fetching chats:", err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
