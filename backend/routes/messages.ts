/**
 * ============================================================================
 * MESSAGES ROUTES
 * ============================================================================
 * 
 * Last Updated: January 9, 2026
 * Changes: Added JWT authentication to protect private conversations
 * Reason: CRITICAL - Messages contain private conversations and must only be 
 *         accessible to the participants
 * 
 * This module handles all messaging functionality including:
 * - Fetching conversations between users
 * - Sending messages
 * - Marking messages as read
 * - Listing conversation participants
 * 
 * SECURITY:
 * - ✅ Users can only view their own messages and conversations
 * - ✅ Users can only send messages as themselves
 * - ✅ Users can only mark their own received messages as read
 * - ⚠️  Business owner list is public (needed for user selection in UI)
 * 
 * BASE PATH: /messages
 * ============================================================================
 */

import { Router, Request, Response } from "express";
import { Resend } from 'resend';
import { supabase } from "../config/Supabase";
// ADDED: January 5, 2026 - Import authentication middleware
import { authenticateToken, authorizeUser, AuthRequest } from '../middleware/auth';
import logger from '../utils/logger';

const resend = new Resend(process.env.RESEND_API_KEY);

const router = Router();

/**
 * GET /messages/health
 * 
 * Purpose: Health check endpoint for debugging
 * 
 * Security: PUBLIC - No authentication required
 * 
 * UNCHANGED: January 5, 2026 - Kept public for monitoring
 * Healthe check is to check if the Server is running ✅
Supabase client is configured correctly ✅
Database is reachable ✅*/
router.get("/health", async (_req: Request, res: Response) => {
  try {
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
 * GET /messages/business-owners/all
 * 
 * Purpose: Get list of all business owners for message recipient selection
 * 
 * Security: PUBLIC (for now) - Needed for UI user selection
 * Note: Only returns business_name and basic info, no sensitive data
 * 
 * CHANGED: January 5, 2026 - Removed phone_number and zip_code from response
 * Reason: Reduce exposure of sensitive contact information
 */
router.get("/business-owners/all", async (_req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('business_owners')
      .select(`
        business_id,
        user_id,
        business_name,
        service_category,
        users!business_owners_user_id_fkey(email, user_type)
      `)
      .eq('users.user_type', 'business_owner')
      .order('business_name', { ascending: true });

    // CHANGED: January 5, 2026 - Removed phone_number and zip_code
    const businessOwners = (data || []).map((row: any) => ({
      business_id: parseInt(row.business_id, 10),
      user_id: parseInt(row.user_id, 10),
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
 * GET /messages/business-owner/info/:userId
 * 
 * Purpose: Get business owner info for displaying in chat UI
 * 
 * Security: PUBLIC (for now) - Needed to show recipient info in chat
 * 
 * UNCHANGED: January 5, 2026 - Kept public for chat UI
 * TODO: Consider adding authentication if this becomes a privacy concern
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
 * GET /messages/business-owner/:userId
 * 
 * Purpose: Get all messages for a business owner
 * 
 * Security:
 * - ✅ Requires authentication
 * - ✅ User can only access their own messages
 * 
 * CHANGED: January 5, 2026 - Added authenticateToken and authorizeUser middleware
 * Reason: Prevent unauthorized access to private messages
 */
router.get("/business-owner/:userId", authenticateToken, authorizeUser, async (req: AuthRequest, res: Response) => {
  const { userId } = req.params;
  const id = parseInt(userId, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid user IDs" });
    return;
  }

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
        metadata,
        post_id,
        post_title,
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

    console.log(`[business-owner messages] Query for user ${id}:`, {
      dataLength: data?.length || 0,
      firstMessage: data?.[0] || 'none',
      error: error
    });

    const messages = (data || []).map((row: any) => ({
      id: parseInt(row.id, 10),
      sender_id: parseInt(row.sender_id, 10),
      receiver_id: parseInt(row.receiver_id, 10),
      message_text: row.message_text,
      is_read: row.is_read,
      created_at: row.created_at,
      metadata: row.metadata,
      post_id: row.post_id ? parseInt(row.post_id, 10) : null,
      post_title: row.post_title || null,
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
 * GET /messages/conversations/:userId
 * 
 * Purpose: Get list of conversations for a user
 * 
 * Security:
 * - ✅ Requires authentication
 * - ✅ User can only view their own conversations
 * 
 * Returns: List of users the authenticated user has chatted with
 * 
 * CHANGED: January 5, 2026 - Added authenticateToken and authorizeUser middleware
 * Reason: Prevent unauthorized access to user's conversation list
 */
router.get("/conversations/:userId", authenticateToken, authorizeUser, async (req: AuthRequest, res: Response) => {
  const { userId } = req.params;
  const id = parseInt(userId, 10);
  
  console.log(`[API] GET /conversations/${userId} - Parsed ID: ${id}`);
  
  if (isNaN(id)) {
    console.error(`[API] Invalid user ID: ${userId}`);
    res.status(400).json({ error: "Invalid user ID" });
    return;
  }

  try {
    console.log(`[API] Fetching conversations for user ${id}`);

    const { data: allMessages, error: messagesError } = await supabase
      .from('messages')
      .select('sender_id, receiver_id, message_text, created_at, post_id, post_title')
      .or(`sender_id.eq.${id},receiver_id.eq.${id}`)
      .order('created_at', { ascending: false });

    if (messagesError) throw messagesError;

    const conversationUserIds = new Set<number>();
    (allMessages || []).forEach((msg: any) => {
      const otherId = msg.sender_id === id ? msg.receiver_id : msg.sender_id;
      conversationUserIds.add(otherId);
    });

    if (conversationUserIds.size === 0) {
      res.json([]);
      return;
    }

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

    const { data: unreadMessages, error: unreadError } = await supabase
      .from('messages')
      .select('sender_id, post_id')
      .eq('receiver_id', id)
      .eq('is_read', false);

    if (unreadError) throw unreadError;

    // Unread counts keyed by "senderId_postId" (null post_id → "senderId_null")
    const unreadCounts: Record<string, number> = {};
    (unreadMessages || []).forEach((msg: any) => {
      const key = `${msg.sender_id}_${msg.post_id ?? 'null'}`;
      unreadCounts[key] = (unreadCounts[key] || 0) + 1;
    });

    const userMap: Record<number, any> = {};
    (users || []).map((u: any) => { userMap[parseInt(u.user_id, 10)] = u; });

    // Group messages by (other_user_id, post_id) — one thread per unique combo
    const threadMap = new Map<string, any>();
    (allMessages || []).forEach((msg: any) => {
      const otherId: number = msg.sender_id === id ? msg.receiver_id : msg.sender_id;
      const postId = msg.post_id ? parseInt(msg.post_id, 10) : null;
      const key = `${otherId}_${postId ?? 'null'}`;

      if (!threadMap.has(key)) {
        const user = userMap[otherId];
        const unreadKey = `${otherId}_${postId ?? 'null'}`;
        threadMap.set(key, {
          other_user_id: otherId,
          contact_name: user?.business_owners?.[0]?.business_name || 'Unknown',
          business_id: user?.business_owners?.[0]?.business_id ? parseInt(user.business_owners[0].business_id, 10) : null,
          user_type: user?.user_type,
          email: user?.email,
          post_id: postId,
          post_title: msg.post_title || null,
          last_message: msg.message_text || null,
          last_message_time: msg.created_at || null,
          unread_count: unreadCounts[unreadKey] || 0,
        });
      }
    });

    const conversations = Array.from(threadMap.values()).sort((a, b) => {
      if (!a.last_message_time) return 1;
      if (!b.last_message_time) return -1;
      return new Date(b.last_message_time).getTime() - new Date(a.last_message_time).getTime();
    });

    console.log(`[API] Found ${conversations.length} conversation threads for user ${id}`);

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
 * GET /messages/:currentUserId/:otherUserId
 * 
 * Purpose: Get messages between two users and mark received messages as read
 * 
 * Security:
 * - ✅ Requires authentication
 * - ✅ currentUserId must match authenticated user
 * 
 * Side Effect: Auto-marks received messages as read
 * 
 * CHANGED: January 5, 2026 - Added authenticateToken middleware
 * CHANGED: January 5, 2026 - Added validation that currentUserId matches authenticated user
 * Reason: Prevent users from viewing conversations they're not part of
 */
router.get("/:currentUserId/:otherUserId", authenticateToken, async (req: AuthRequest, res: Response) => {
  const { currentUserId, otherUserId } = req.params;
  const currentId = parseInt(currentUserId, 10);
  const otherId = parseInt(otherUserId, 10);
  const postIdParam = req.query.post_id ? parseInt(req.query.post_id as string, 10) : null;

  if (isNaN(currentId) || isNaN(otherId)) {
    res.status(400).json({ error: "Invalid user IDs" });
    return;
  }

  // FIXED: January 9, 2026 - Convert both to strings for proper comparison
  console.log('🔒 Chat authorization check:');
  console.log('  currentUserId (from URL):', currentUserId, `(type: ${typeof currentUserId})`);
  console.log('  req.user.user_id (from token):', req.user?.user_id, `(type: ${typeof req.user?.user_id})`);
  console.log('  Match?', String(currentUserId) === String(req.user?.user_id));

  if (String(currentUserId) !== String(req.user?.user_id)) {
    console.log('❌ Authorization failed - user IDs do not match');
    res.status(403).json({
      success: false,
      error: 'You can only view your own conversations'
    });
    return;
  }

  console.log('✅ Chat authorization passed');

  console.log(`Fetching messages between currentUser: ${currentId} and otherUser: ${otherId}${postIdParam ? ` for post ${postIdParam}` : ''}`);

  try {
    // ✅ FIXED: February 7, 2026 - Explicitly include metadata column
    let query = supabase
      .from('messages')
      .select(`
        id,
        sender_id,
        receiver_id,
        message_text,
        created_at,
        is_read,
        metadata,
        post_id,
        post_title,
        sender:users!messages_sender_id_fkey(
          business_owners(business_name)
        )
      `)
      .or(`and(sender_id.eq.${currentId},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${currentId})`);

    if (postIdParam) {
      query = query.eq('post_id', postIdParam);
    }

    const { data, error } = await query.order('created_at', { ascending: true });

    if (error) throw error;

    console.log(`Found ${data?.length || 0} messages`);

    const { data: markedMessages, error: markError } = await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('receiver_id', currentId)
      .eq('sender_id', otherId)
      .eq('is_read', false)
      .select('id');

    if (markError) throw markError;

    console.log(`Marked ${markedMessages?.length || 0} messages as read`);

    // Update last_seen_at — user is active in chat, reset notification state
    updateLastSeen(currentId).catch(err => console.error('❌ updateLastSeen error:', err));

    const messages = (data || []).map((row: any) => ({
      ...row,
      id: parseInt(row.id, 10),
      sender_id: parseInt(row.sender_id, 10),
      receiver_id: parseInt(row.receiver_id, 10),
      post_id: row.post_id ? parseInt(row.post_id, 10) : null,
      post_title: row.post_title || null,
      sender_name: row.sender_id !== currentId ? (row.sender?.business_owners?.[0]?.business_name || 'Unknown') : null
    }));

    res.json(messages);
  } catch (err) {
    console.error("Fetch messages error:", err);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});
/**
 * POST /messages/
 * 
 * Purpose: Send a new message
 * 
 * Security:
 * - ✅ Requires authentication
 * - ✅ sender_id must match authenticated user
 * 
 * Body:
 * - sender_id: ID of sender (must match authenticated user)
 * - receiver_id: ID of recipient
 * - message_text: Message content
 * 
 * CHANGED: January 5, 2026 - Added authenticateToken middleware
 * CHANGED: January 5, 2026 - Added validation that sender_id matches authenticated user
 * Reason: Prevent users from impersonating others when sending messages
 */
router.post("/", authenticateToken, async (req: AuthRequest, res: Response) => {
  const { sender_id, receiver_id, message_text, post_id, post_title } = req.body;

  if (!sender_id || !receiver_id || !message_text) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  // ADDED: January 5, 2026 - Security check to prevent message spoofing
if (String(sender_id) !== String(req.user?.user_id)) {
    res.status(403).json({
      success: false,
      error: 'You can only send messages as yourself'
    });
    return;
  }

  try {
    const { data, error } = await supabase
  .from('messages')
  .insert([{
    sender_id,
    receiver_id,
    message_text,
    is_read: false,
    created_at: new Date().toISOString(),
    post_id: post_id || null,
    post_title: post_title || null,
  }])
  .select()
  .single();
  

    if (error) throw error;

    const message = {
      ...data,
      id: parseInt(data.id, 10),
      sender_id: parseInt(data.sender_id, 10),
      receiver_id: parseInt(data.receiver_id, 10)
    };

    res.status(201).json(message);

    // Send smart email notification to receiver (non-blocking)
    sendSmartNotification(
      parseInt(sender_id, 10),
      parseInt(receiver_id, 10),
    ).catch(err => console.error('❌ Message email error:', err));

  } catch (err) {
    console.error("Send message error:", err);
    res.status(500).json({ error: "Failed to send message" });
  }
});

// ---------------------------------------------------------------------------
// updateLastSeen
// Called when a user opens a chat or marks messages as read.
// Resets notification state so follow-up emails are not sent to active users.
// ---------------------------------------------------------------------------
async function updateLastSeen(userId: number): Promise<void> {
  const { error } = await supabase
    .from('users')
    .update({ last_seen_at: new Date().toISOString() })
    .eq('user_id', userId);

  if (error) console.error(`❌ updateLastSeen failed for user ${userId}:`, error);
}

// users.last_seen_at / last_email_sent_at are `timestamp without time zone` columns
// (see schema.sql). Postgres strips the UTC 'Z' this app writes with `new Date().
// toISOString()` before storing, so what comes back on read has no timezone marker.
// JS's Date parser then treats a bare "2026-08-06T16:56:39" as LOCAL time, not UTC —
// on any server not running in UTC, that silently shifts every comparison by the
// server's UTC offset (confirmed: produced a -420m/7h skew in this environment,
// which broke the active-user guard's `msSinceSeen >= 0` check every single time).
// Appending 'Z' before parsing forces the correct UTC interpretation.
function parseUtcTimestamp(value: string): Date {
  const hasTimezone = /[zZ]|[+-]\d{2}:?\d{2}$/.test(value);
  return new Date(hasTimezone ? value : `${value}Z`);
}

// ---------------------------------------------------------------------------
// sendSmartNotification
//
// Implements the full email notification lifecycle:
//
//   1. First unread message  → send immediately
//        Subject: "New message about your listing"
//
//   2. Follow-up messages    → send at most once per hour (batched)
//        Subject: "You have N new messages waiting"
//        Only if now − last_email_sent_at >= 60 minutes
//
// Guards:
//   • Active users  — skip if last_seen_at < 10 minutes ago
//   • Cooldown      — skip if last_email_sent_at < 60 minutes ago (for batched)
//   • Reset         — last_seen_at is set to NOW() whenever user opens chat
//                     or marks messages as read (see updateLastSeen calls above)
// ---------------------------------------------------------------------------
export async function sendSmartNotification(
  senderId: number,
  receiverId: number,
): Promise<void> {
  logger.info(`sendSmartNotification called: sender=${senderId}, receiver=${receiverId}`);
  // 1. Fetch sender + receiver details
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select(`
      user_id,
      email,
      last_seen_at,
      last_email_sent_at
    `)
    .in('user_id', [senderId, receiverId]);

  const { data: bizOwners } = await supabase
    .from('business_owners')
    .select('user_id, business_name')
    .in('user_id', [senderId, receiverId]);

  if (usersError || !users) {
    logger.error('chat-email: Failed to fetch user details', { error: usersError });
    return;
  }

  logger.info(`chat-email: users fetched: ${users.length}, ids=${users.map((u: any) => u.user_id).join(',')}`);

  const senderRow   = users.find((u: any) => parseInt(u.user_id, 10) === senderId);
  const receiverRow = users.find((u: any) => parseInt(u.user_id, 10) === receiverId);

  if (!senderRow || !receiverRow || !receiverRow.email) {
    logger.error('chat-email: Missing user rows', { senderFound: !!senderRow, receiverFound: !!receiverRow, receiverEmail: receiverRow?.email });
    return;
  }

  // 2. Skip if receiver is currently active (last_seen_at within 10 minutes)
  const TEN_MINUTES_MS = 10 * 60 * 1000;
  if (receiverRow.last_seen_at) {
    const msSinceSeen = Date.now() - parseUtcTimestamp(receiverRow.last_seen_at).getTime();
    if (msSinceSeen >= 0 && msSinceSeen < TEN_MINUTES_MS) {
      logger.info(`chat-email: skipped — receiver ${receiverId} active ${Math.round(msSinceSeen / 1000)}s ago`);
      return;
    }
  }

  // 3. Count total unread messages for receiver
  const { count, error: countError } = await supabase
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .eq('receiver_id', receiverId)
    .eq('is_read', false);

  if (countError) {
    logger.error('chat-email: Failed to count unread messages', { error: countError });
    return;
  }

  const unreadCount = count ?? 0;

  // 4. Cooldown check for batched follow-up emails (only applies when > 1 unread)
  const ONE_HOUR_MS = 60 * 60 * 1000;
  if (unreadCount > 1 && receiverRow.last_email_sent_at) {
    const msSinceEmail = Date.now() - parseUtcTimestamp(receiverRow.last_email_sent_at).getTime();
    if (msSinceEmail < ONE_HOUR_MS) {
      logger.info(`chat-email: skipped — cooldown active (${unreadCount} unread, ${Math.round(msSinceEmail / 60000)}m since last email)`);
      return;
    }
  }

  // 5. Compose email content
  const senderBiz   = (bizOwners || []).find((b: any) => parseInt(b.user_id, 10) === senderId);
  const receiverBiz = (bizOwners || []).find((b: any) => parseInt(b.user_id, 10) === receiverId);

  const senderName   = senderBiz?.business_name   || 'GoZipMarket User';
  const receiverName = receiverBiz?.business_name || 'there';

  const isFirst = unreadCount <= 1;
  const subject = isFirst
    ? 'New message about your listing — GoZipMarket'
    : `You have ${unreadCount} new messages waiting — GoZipMarket`;
  const bodyLine = isFirst
    ? `You have a new message from <strong>${senderName}</strong>. Check it on GoZipMarket.`
    : `You have <strong>${unreadCount} new messages</strong> waiting. Check them on GoZipMarket.`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8"/>
        <style>
          body { font-family: Arial, sans-serif; color: #333; margin: 0; padding: 0; }
          .wrap { max-width: 560px; margin: 0 auto; padding: 20px; }
          .header { background: #4A90E2; color: #fff; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
          .body { background: #fff; border: 1px solid #e0e0e0; border-top: none; padding: 24px; border-radius: 0 0 8px 8px; }
          .footer { text-align: center; font-size: 11px; color: #aaa; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="wrap">
          <div class="header">
            <h2 style="margin:0">${isFirst ? 'New Message' : 'Messages Waiting'} — GoZipMarket</h2>
          </div>
          <div class="body">
            <p>Hi ${receiverName},</p>
            <p>${bodyLine}</p>
          </div>
          <div class="footer">© 2026 GoZipMarket — Zip Market LLC</div>
        </div>
      </body>
    </html>`;

  // 6. Send the email
  await resend.emails.send({
    from:    'GoZipMarket <noreply@gozipmarket.com>',
    replyTo: 'zipmarket333@gmail.com',
    to:      receiverRow.email,
    subject,
    html,
  });

  // 7. Record send time to enforce cooldown on next message
  await supabase
    .from('users')
    .update({ last_email_sent_at: new Date().toISOString() })
    .eq('user_id', receiverId);

  logger.info(`chat-email: sent to ${receiverRow.email} (${isFirst ? 'instant' : `batched, ${unreadCount} unread`})`);
}

/**
 * PUT /messages/mark-read
 * 
 * Purpose: Mark specific messages as read
 * 
 * Security:
 * - ✅ Requires authentication
 * - ✅ user_id must match authenticated user
 * - ✅ Can only mark messages where user is the receiver
 * 
 * Body:
 * - message_ids: Array of message IDs to mark as read
 * - user_id: User ID (must match authenticated user)
 * 
 * CHANGED: January 5, 2026 - Added authenticateToken middleware
 * CHANGED: January 5, 2026 - Added validation that user_id matches authenticated user
 * Reason: Prevent users from marking other users' messages as read
 */
router.put("/mark-read", authenticateToken, async (req: AuthRequest, res: Response) => {
  const { message_ids, user_id } = req.body;
  
  if (!message_ids || !Array.isArray(message_ids) || !user_id) {
    res.status(400).json({ error: "Missing required fields: message_ids (array) and user_id" });
    return;
  }

  const userId = parseInt(user_id, 10);
  if (isNaN(userId)) {
    res.status(400).json({ error: "Invalid user_id" });
    return;
  }

  // ADDED: January 5, 2026 - Security check to ensure user can only mark their own messages
  if (String(user_id) !== String(req.user?.user_id)) {
    res.status(403).json({
      success: false,
      error: 'You can only mark your own messages as read'
    });
    return;
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

    // Update last_seen_at — user is reading messages, reset notification state
    updateLastSeen(userId).catch(err => console.error('❌ updateLastSeen error:', err));

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