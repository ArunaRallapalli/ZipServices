// backend/routes/messages.ts
import { Router, Request, Response } from "express";
import { supabase } from "../config/Supabase";

const router = Router();

/**
 * Health check endpoint for debugging
 */
router.get("/health", async (_req: Request, res: Response) => {
  try {
    // Test database connection by querying a simple table
    const { data, error } = await supabase
      .from('users')
      .select('user_id')
      .limit(1);
    
    if (error) throw error;

    res.json({ 
      status: "ok", 
      database: "connected",
      timestamp: new Date().toISOString()
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
    const { data, error } = await supabase
      .from('business_owners')
      .select(`
        business_id,
        user_id,
        phone_number,
        zip_code,
        business_name,
        service_category,
        users!business_owners_user_id_fkey(email, user_type)
      `)
      .eq('users.user_type', 'business_owner')
      .order('business_name', { ascending: true });
    // Convert bigint IDs to numbers and flatten structure
    const businessOwners = (data || []).map((row: any) => ({
      business_id: parseInt(row.business_id, 10),
      user_id: parseInt(row.user_id, 10),
      phone_number: row.phone_number,
      zip_code: row.zip_code,
      business_name: row.business_name,
      service_category: row.service_category,
      email: Array.isArray(row.users) ? row.users[0]?.email : row.users?.email
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
    const { data, error } = await supabase
      .from('business_owners')
      .select('*')
      .eq('user_id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        console.log(`[business-owner-info] No business owner found for user_id: ${id}`);
        return res.status(404).json({ error: "Business owner not found" });
      }
      throw error;
    }

    // Convert bigint IDs to numbers
    const businessOwner = {
      ...data,
      user_id: parseInt(data.user_id, 10),
      business_id: parseInt(data.business_id, 10)
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
    const { data, error } = await supabase
      .from('messages')
      .select(`
        id,
        sender_id,
        receiver_id,
        message_text,
        is_read,
        created_at,
        sender:users!messages_sender_id_fkey(
          email,
          business_owners(business_name)
        ),
        receiver:users!messages_receiver_id_fkey(
          email,
          business_owners(business_name)
        )
      `)
      .or(`receiver_id.eq.${id},sender_id.eq.${id}`)
      .order('created_at', { ascending: true });
    // Convert bigint IDs to numbers and flatten structure
    const messages = (data || []).map((row: any) => ({
      id: parseInt(row.id, 10),
      sender_id: parseInt(row.sender_id, 10),
      receiver_id: parseInt(row.receiver_id, 10),
      message_text: row.message_text,
      is_read: row.is_read,
      created_at: row.created_at,
      sender_name: row.sender?.business_owners?.[0]?.business_name,
      sender_email: row.sender?.email,
      receiver_name: row.receiver?.business_owners?.[0]?.business_name,
      receiver_email: row.receiver?.email
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
    
    // Get all messages for this user
    const { data: allMessages, error: messagesError } = await supabase
      .from('messages')
      .select('sender_id, receiver_id, message_text, created_at')
      .or(`sender_id.eq.${id},receiver_id.eq.${id}`)
      .order('created_at', { ascending: false });
    
    if (messagesError) throw messagesError;

    // Get unique conversation partners
    const conversationUserIds = new Set<number>();
    (allMessages || []).forEach((msg: any) => {
      const otherId = msg.sender_id === id ? msg.receiver_id : msg.sender_id;
      conversationUserIds.add(otherId);
    });

    if (conversationUserIds.size === 0) {
      return res.json([]);
    }

    // Fetch user and business owner details for all conversation partners
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select(`
        user_id,
        email,
        user_type,
        business_owners!business_owners_user_id_fkey(business_id, business_name)
      `)
      .in('user_id', Array.from(conversationUserIds));
    
    if (usersError) throw usersError;

    // Get unread counts for each conversation
    const { data: unreadMessages, error: unreadError } = await supabase
      .from('messages')
      .select('sender_id')
      .eq('receiver_id', id)
      .eq('is_read', false);
    
    if (unreadError) throw unreadError;

    const unreadCounts: Record<number, number> = {};
    (unreadMessages || []).forEach((msg: any) => {
      unreadCounts[msg.sender_id] = (unreadCounts[msg.sender_id] || 0) + 1;
    });

    // Build conversations array
    const conversations = (users || []).map((user: any) => {
      const userMessages = (allMessages || []).filter((msg: any) => 
        (msg.sender_id === id && msg.receiver_id === user.user_id) ||
        (msg.receiver_id === id && msg.sender_id === user.user_id)
      );
      
      const lastMessage = userMessages[0]; // Already sorted DESC

      return {
        other_user_id: parseInt(user.user_id, 10),
        contact_name: user.business_owners?.[0]?.business_name || 'Unknown',
        business_id: user.business_owners?.[0]?.business_id ? parseInt(user.business_owners[0].business_id, 10) : null,
        user_type: user.user_type,
        email: user.email,
        last_message: lastMessage?.message_text || null,
        last_message_time: lastMessage?.created_at || null,
        unread_count: unreadCounts[user.user_id] || 0
      };
    }).sort((a, b) => {
      if (!a.last_message_time) return 1;
      if (!b.last_message_time) return -1;
      return new Date(b.last_message_time).getTime() - new Date(a.last_message_time).getTime();
    });

    console.log(`[API] Found ${conversations.length} conversations for user ${id}`);
    
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
    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        sender:users!messages_sender_id_fkey(
          business_owners(business_name)
        )
      `)
      .or(`and(sender_id.eq.${currentId},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${currentId})`)
      .order('created_at', { ascending: true });

    if (error) throw error;

    console.log(`Found ${data?.length || 0} messages`);

    // Then mark messages as read (messages sent TO the current user FROM the other user)
    const { data: markedMessages, error: markError } = await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('receiver_id', currentId)
      .eq('sender_id', otherId)
      .eq('is_read', false)
      .select('id');

    if (markError) throw markError;

    console.log(`Marked ${markedMessages?.length || 0} messages as read`);

    // Convert bigint IDs to numbers and add sender_name
    const messages = (data || []).map((row: any) => ({
      ...row,
      id: parseInt(row.id, 10),
      sender_id: parseInt(row.sender_id, 10),
      receiver_id: parseInt(row.receiver_id, 10),
      sender_name: row.sender_id !== currentId ? (row.sender?.business_owners?.[0]?.business_name || 'Unknown') : null
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
    const { data, error } = await supabase
      .from('messages')
      .insert([{
        sender_id,
        receiver_id,
        message_text,
        is_read: false,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw error;

    // Convert bigint IDs to numbers
    const message = {
      ...data,
      id: parseInt(data.id, 10),
      sender_id: parseInt(data.sender_id, 10),
      receiver_id: parseInt(data.receiver_id, 10)
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
    const { data, error } = await supabase
      .from('messages')
      .update({ is_read: true })
      .in('id', message_ids)
      .eq('receiver_id', userId)
      .eq('is_read', false)
      .select('id');

    if (error) throw error;

    console.log(`[mark-read] Successfully marked ${data?.length || 0} messages as read`);
    
    res.json({ 
      success: true, 
      marked_count: data?.length || 0,
      message_ids: (data || []).map((row: any) => parseInt(row.id, 10))
    });
  } catch (err) {
    console.error("[mark-read] Error marking messages as read:", err);
    res.status(500).json({ error: "Failed to mark messages as read" });
  }
});

export default router;