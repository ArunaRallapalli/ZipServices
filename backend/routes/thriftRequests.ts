/**
 * Thrift Requests Router — /api/thrift-requests
 *
 * Handles the full lifecycle of FREE thrifting item requests at GoZipMarket.
 * No cart, no checkout, no payment — request/pickup flow only.
 *
 * ── Flow ──────────────────────────────────────────────────────────────────────
 *  Buyer taps [Request Item] → status = 'requested'
 *  Seller taps [Approve & Mark Completed] → status = 'completed', in_stock -1
 *    If in_stock hits 0 → all remaining 'requested' rows auto-rejected
 *  Seller taps [Reject] → status = 'rejected'
 *
 *  Multiple buyers can request the same photo simultaneously.
 *  Stock is only decremented when the seller approves (not on request).
 *
 * ── Endpoints ─────────────────────────────────────────────────────────────────
 *
 *  POST   /api/thrift-requests
 *    Buyer submits a request. Blocked only if in_stock <= 0 or buyer already
 *    has an active (requested) entry for the same post+photo.
 *
 *  GET    /api/thrift-requests/my-requests
 *    Buyer sees all their own requests (any status).
 *
 *  GET    /api/thrift-requests/provider
 *    Seller sees all requests across all their posts, newest first.
 *
 *  PATCH  /api/thrift-requests/:id/approve-complete
 *    Seller approves & completes in one step:
 *      • status = 'completed', completed_at = now
 *      • in_stock decremented by 1 (floor 0)
 *      • photo_index added to sold_photo_indexes
 *      • if new in_stock === 0 → all other 'requested' rows auto-rejected
 *
 *  PATCH  /api/thrift-requests/:id/reject
 *    Seller rejects one request → status = 'rejected'. No stock change.
 *
 * ── Auth ──────────────────────────────────────────────────────────────────────
 *  All routes require a valid JWT Bearer token.
 *  PATCH routes verify the token belongs to the post's provider_user_id.
 */

import express, { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { Resend } from 'resend';
import { supabase } from '../config/Supabase';

const resend = new Resend(process.env.RESEND_API_KEY);

const router = express.Router();

// 1h in dev for easy testing, 48h in production
// 48h in prod — if seller takes no action the request expires and no stock change is needed
// (stock is never decremented on request, only on approval)
const THRIFT_EXPIRY_MS = process.env.NODE_ENV === 'production'
  ? 48 * 60 * 60 * 1000
  :  1 * 60 * 60 * 1000;

const verifyToken = (token: string): { user_id: string } | null => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET || 'secret') as { user_id: string };
  } catch {
    return null;
  }
};

function getAuth(req: Request, res: Response): number | null {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) { res.status(401).json({ error: 'Unauthorized' }); return null; }
  const decoded = verifyToken(token);
  if (!decoded) { res.status(401).json({ error: 'Invalid token' }); return null; }
  return parseInt(decoded.user_id);
}

// ── Helper: email seller on new request ──────────────────────────────────────
async function sendThriftRequestEmail(params: {
  providerEmail: string;
  providerName: string;
  buyerName: string;
  postTitle: string;
  requestId: string;
  postPhotoUrl?: string | null;
  requestDate: string;
  buyerTimezone?: string;
}): Promise<void> {
  const { providerEmail, providerName, buyerName, postTitle, requestId, postPhotoUrl, requestDate, buyerTimezone } = params;
  const shortId = requestId.slice(0, 8).toUpperCase();
  const formattedDate = new Date(requestDate).toLocaleString('en-US', {
    timeZone: buyerTimezone || 'UTC',
    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
  const thumbHtml = postPhotoUrl
    ? `<img src="${postPhotoUrl}" width="80" height="80" style="border-radius:8px;display:block;margin:0 auto 12px;object-fit:cover;" alt="${postTitle}" />`
    : '';
  try {
    await resend.emails.send({
      from:    'GoZipMarket <noreply@gozipmarket.com>',
      replyTo: 'support@gozipmarket.com',
      to:      providerEmail,
      subject: `New Thrift Request — "${postTitle}"`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; color: #333; margin: 0; padding: 0; }
              .wrap { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #8D6E63; color: #fff; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
              .body { background: #fff; border: 1px solid #e0e0e0; border-top: none; padding: 24px; border-radius: 0 0 8px 8px; }
              .info-box { background: #FFF8E1; border-left: 4px solid #F57F17; border-radius: 4px; padding: 14px; margin: 16px 0; }
              .footer { text-align: center; font-size: 11px; color: #aaa; margin-top: 24px; }
            </style>
          </head>
          <body>
            <div class="wrap">
              <div class="header"><h2 style="margin:0">New Thrift Item Request</h2></div>
              <div class="body">
                <p>Hi ${providerName},</p>
                <p>Someone has requested your free thrifting item. Log in and go to <strong>My Listings &rarr; Thrift Requests</strong> to Approve &amp; Complete or Reject.</p>
                ${thumbHtml}
                <div class="info-box">
                  <div><strong>Request ID:</strong> #${shortId}</div>
                  <div><strong>Date / Time:</strong> ${formattedDate}</div>
                  <div><strong>Item:</strong> ${postTitle}</div>
                  <div><strong>Requested by:</strong> ${buyerName}</div>
                </div>
                <p>Open the app and tap <strong>Thrift Requests</strong> in your listings header to manage this request.</p>
                <div style="background:#FFF3E0;border-left:4px solid #E65100;border-radius:4px;padding:14px;margin:16px 0;">
                  <strong style="color:#E65100;">&#9201; Action Required Within 48 Hours:</strong> Please <strong>Approve &amp; Complete or Reject</strong> this request within 48 hours. If no action is taken, the request will automatically expire and the item will be released back to other buyers.
                </div>
                <div style="text-align:center; margin-top: 20px;">
                  <a href="https://gozipmarket.com" style="display:inline-block; background:#8D6E63; color:#fff; text-decoration:none; padding:12px 28px; border-radius:6px; font-weight:bold; font-size:15px;">Open GoZipMarket</a>
                  <p style="margin-top:10px; font-size:12px; color:#888;">Or visit: <a href="https://gozipmarket.com" style="color:#8D6E63;">https://gozipmarket.com</a></p>
                </div>
              </div>
              <div class="footer">&copy; 2025 GoZipMarket &mdash; Zip Market LLC</div>
            </div>
          </body>
        </html>`,
    });
    console.log(`✅ Thrift request email sent to ${providerEmail}`);
  } catch (err) {
    console.error(`❌ Failed to send thrift request email to ${providerEmail}:`, err);
  }
}

// ── Helper: email buyer on rejection ─────────────────────────────────────────
async function sendBuyerRejectionEmail(params: {
  buyerEmail: string;
  buyerName: string;
  postTitle: string;
  requestId: string;
  postPhotoUrl?: string | null;
  requestDate: string;
  buyerTimezone?: string;
}): Promise<void> {
  const { buyerEmail, buyerName, postTitle, requestId, postPhotoUrl, requestDate, buyerTimezone } = params;
  const shortId = requestId.slice(0, 8).toUpperCase();
  const formattedDate = new Date(requestDate).toLocaleString('en-US', {
    timeZone: buyerTimezone || 'UTC',
    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
  const thumbHtml = postPhotoUrl
    ? `<img src="${postPhotoUrl}" width="80" height="80" style="border-radius:8px;display:block;margin:0 auto 12px;object-fit:cover;" alt="${postTitle}" />`
    : '';
  try {
    await resend.emails.send({
      from:    'GoZipMarket <noreply@gozipmarket.com>',
      replyTo: 'support@gozipmarket.com',
      to:      buyerEmail,
      subject: `Update on Your Thrift Request — "${postTitle}"`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; color: #333; margin: 0; padding: 0; }
              .wrap { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #8D6E63; color: #fff; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
              .body { background: #fff; border: 1px solid #e0e0e0; border-top: none; padding: 24px; border-radius: 0 0 8px 8px; }
              .info-box { background: #FFF8E1; border-left: 4px solid #F57F17; border-radius: 4px; padding: 14px; margin: 16px 0; }
              .footer { text-align: center; font-size: 11px; color: #aaa; margin-top: 24px; }
            </style>
          </head>
          <body>
            <div class="wrap">
              <div class="header"><h2 style="margin:0">Thrift Request Update</h2></div>
              <div class="body">
                <p>Hi ${buyerName},</p>
                <p>Unfortunately, your request for the following item was not fulfilled:</p>
                ${thumbHtml}
                <div class="info-box">
                  <div><strong>Request ID:</strong> #${shortId}</div>
                  <div><strong>Date / Time:</strong> ${formattedDate}</div>
                  <div><strong>Item:</strong> ${postTitle}</div>
                </div>
                <p>This can happen when the seller rejects the request, or when another buyer's request was approved first and the item is no longer available.</p>
                <p>Don't worry — there are more free items available on GoZipMarket! Browse listings and find something else you like.</p>
                <div style="text-align:center; margin-top: 20px;">
                  <a href="https://gozipmarket.com" style="display:inline-block; background:#8D6E63; color:#fff; text-decoration:none; padding:12px 28px; border-radius:6px; font-weight:bold; font-size:15px;">Browse Listings</a>
                  <p style="margin-top:10px; font-size:12px; color:#888;">Or visit: <a href="https://gozipmarket.com" style="color:#8D6E63;">https://gozipmarket.com</a></p>
                </div>
              </div>
              <div class="footer">&copy; 2025 GoZipMarket &mdash; Zip Market LLC</div>
            </div>
          </body>
        </html>`,
    });
    console.log(`✅ Buyer rejection email sent to ${buyerEmail} for request #${shortId}`);
  } catch (err) {
    console.error(`❌ Failed to send buyer rejection email to ${buyerEmail}:`, err);
  }
}

// ── Helper: email buyer on approval/completion ───────────────────────────────
async function sendBuyerCompletionEmail(params: {
  buyerEmail: string;
  buyerName: string;
  postTitle: string;
  requestId: string;
  postPhotoUrl?: string | null;
  requestDate: string;
  buyerTimezone?: string;
}): Promise<void> {
  const { buyerEmail, buyerName, postTitle, requestId, postPhotoUrl, requestDate, buyerTimezone } = params;
  const shortId = requestId.slice(0, 8).toUpperCase();
  const formattedDate = new Date(requestDate).toLocaleString('en-US', {
    timeZone: buyerTimezone || 'UTC',
    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
  const thumbHtml = postPhotoUrl
    ? `<img src="${postPhotoUrl}" width="80" height="80" style="border-radius:8px;display:block;margin:0 auto 12px;object-fit:cover;" alt="${postTitle}" />`
    : '';
  try {
    await resend.emails.send({
      from:    'GoZipMarket <noreply@gozipmarket.com>',
      replyTo: 'support@gozipmarket.com',
      to:      buyerEmail,
      subject: `Your Thrift Request Was Approved — "${postTitle}"`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; color: #333; margin: 0; padding: 0; }
              .wrap { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #2E7D32; color: #fff; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
              .body { background: #fff; border: 1px solid #e0e0e0; border-top: none; padding: 24px; border-radius: 0 0 8px 8px; }
              .info-box { background: #E8F5E9; border-left: 4px solid #2E7D32; border-radius: 4px; padding: 14px; margin: 16px 0; }
              .footer { text-align: center; font-size: 11px; color: #aaa; margin-top: 24px; }
            </style>
          </head>
          <body>
            <div class="wrap">
              <div class="header"><h2 style="margin:0">&#127881; Your Request Was Approved!</h2></div>
              <div class="body">
                <p>Hi ${buyerName},</p>
                <p>Great news! The seller has approved your request for the following item:</p>
                ${thumbHtml}
                <div class="info-box">
                  <div><strong>Request ID:</strong> #${shortId}</div>
                  <div><strong>Date / Time:</strong> ${formattedDate}</div>
                  <div><strong>Item:</strong> ${postTitle}</div>
                </div>
                <p>Please coordinate pickup or delivery directly with the seller using the <strong>Message Seller</strong> chat in the app.</p>
                <div style="text-align:center; margin-top: 20px;">
                  <a href="https://gozipmarket.com" style="display:inline-block; background:#2E7D32; color:#fff; text-decoration:none; padding:12px 28px; border-radius:6px; font-weight:bold; font-size:15px;">Open GoZipMarket</a>
                  <p style="margin-top:10px; font-size:12px; color:#888;">Or visit: <a href="https://gozipmarket.com" style="color:#2E7D32;">https://gozipmarket.com</a></p>
                </div>
              </div>
              <div class="footer">&copy; 2025 GoZipMarket &mdash; Zip Market LLC</div>
            </div>
          </body>
        </html>`,
    });
    console.log(`✅ Buyer completion email sent to ${buyerEmail} for request #${shortId}`);
  } catch (err) {
    console.error(`❌ Failed to send buyer completion email to ${buyerEmail}:`, err);
  }
}

// ── Helper: expire stale requests ────────────────────────────────────────────
// Expires 'requested' rows whose window has passed.
// Stock is NOT restored here — it was never decremented on request.
async function expireStaleReservations(): Promise<void> {
  try {
    const now = new Date().toISOString();

    const { data: expiredRows } = await supabase
      .from('thrift_requests')
      .select('id')
      .eq('status', 'requested')
      .not('expires_at', 'is', null)
      .lt('expires_at', now);

    if (!expiredRows || expiredRows.length === 0) return;

    const ids = expiredRows.map((r: any) => r.id);
    await supabase.from('thrift_requests').update({ status: 'expired' }).in('id', ids);
    console.log(`♻️  Expired ${ids.length} stale thrift request(s)`);
  } catch (e) {
    console.error('❌ expireStaleReservations exception:', e);
  }
}

// ── POST /api/thrift-requests ─────────────────────────────────────────────────
router.post('/api/thrift-requests', async (req: Request, res: Response): Promise<void> => {
  const buyerUserId = getAuth(req, res);
  if (!buyerUserId) return;

  const { post_id, provider_user_id, post_title, post_photo_url, photo_index, buyer_timezone } = req.body;
  const photoIndex: number | null = photo_index !== undefined && photo_index !== null ? Number(photo_index) : null;

  if (!post_id || !provider_user_id) {
    res.status(400).json({ error: 'post_id and provider_user_id are required' });
    return;
  }

  if (buyerUserId === Number(provider_user_id)) {
    res.status(400).json({ error: 'You cannot request your own item' });
    return;
  }

  try {
    await expireStaleReservations();

    // Block if this buyer already has an active request for the same post+photo.
    // Multiple different buyers can request the same photo simultaneously.
    let dupQuery = supabase
      .from('thrift_requests')
      .select('id, status')
      .eq('post_id', post_id)
      .eq('buyer_user_id', buyerUserId)
      .eq('status', 'requested')
      .limit(1);

    if (photoIndex !== null) {
      dupQuery = dupQuery.eq('photo_index', photoIndex);
    }

    const { data: existing } = await dupQuery;

    if (existing && existing.length > 0) {
      res.status(409).json({ error: 'You already have an active request for this item.', status: 'requested' });
      return;
    }

    // Fetch post: only need in_stock to gate requests
    const { data: postData } = await supabase
      .from('service_posts')
      .select('in_stock')
      .eq('id', post_id)
      .single();

    if (!postData) {
      res.status(404).json({ error: 'Post not found' });
      return;
    }

    // Block only if all units have already been given away
    if (Number(postData.in_stock) <= 0) {
      res.status(409).json({ error: 'No units available — all have been given away.', status: 'unavailable' });
      return;
    }

    const expiresAt = new Date(Date.now() + THRIFT_EXPIRY_MS).toISOString();

    const { data, error } = await supabase
      .from('thrift_requests')
      .insert({
        post_id:          Number(post_id),
        buyer_user_id:    buyerUserId,
        provider_user_id: Number(provider_user_id),
        post_title:       post_title || null,
        post_photo_url:   post_photo_url || null,
        photo_index:      photoIndex,
        buyer_timezone:   buyer_timezone || null,
        status:           'requested',
        expires_at:       expiresAt,
      })
      .select('id')
      .single();

    if (error) {
      console.error('❌ thrift_requests insert:', error);
      res.status(500).json({ error: 'Failed to submit request' });
      return;
    }

    // NOTE: in_stock is NOT decremented here — only decremented when seller approves.

    console.log(`✅ Thrift request created: ${data.id}`);
    res.status(201).json({ success: true, request_id: data.id });

    // Send email to seller — non-blocking
    (async () => {
      try {
        const buyerId    = buyerUserId;
        const providerId = Number(provider_user_id);
        const [providerRes, buyerBizRes, providerBizRes] = await Promise.all([
          supabase.from('users').select('email').eq('user_id', providerId).single(),
          supabase.from('business_owners').select('business_name').eq('user_id', buyerId).maybeSingle(),
          supabase.from('business_owners').select('business_name').eq('user_id', providerId).maybeSingle(),
        ]);
        if (!providerRes.data?.email) return;
        await sendThriftRequestEmail({
          providerEmail:  providerRes.data.email,
          providerName:   providerBizRes.data?.business_name || 'Seller',
          buyerName:      buyerBizRes.data?.business_name || 'Customer',
          postTitle:      post_title || `Item #${post_id}`,
          requestId:      data.id,
          postPhotoUrl:   post_photo_url || null,
          requestDate:    new Date().toISOString(),
          buyerTimezone:  buyer_timezone || undefined,
        });
      } catch (emailErr) {
        console.error(`❌ Thrift request email error for #${data.id}:`, emailErr);
      }
    })();

  } catch (err) {
    console.error('❌ POST /api/thrift-requests:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── GET /api/thrift-requests/my-requests ─────────────────────────────────────
router.get('/api/thrift-requests/my-requests', async (req: Request, res: Response): Promise<void> => {
  const buyerUserId = getAuth(req, res);
  if (!buyerUserId) return;

  try {
    await expireStaleReservations();

    const { data, error } = await supabase
      .from('thrift_requests')
      .select('*')
      .eq('buyer_user_id', buyerUserId)
      .order('created_at', { ascending: false });

    if (error) { res.status(500).json({ error: 'Failed to fetch requests' }); return; }

    res.json({ success: true, requests: data || [] });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ── GET /api/thrift-requests/provider ────────────────────────────────────────
router.get('/api/thrift-requests/provider', async (req: Request, res: Response): Promise<void> => {
  const providerUserId = getAuth(req, res);
  if (!providerUserId) return;

  try {
    await expireStaleReservations();

    const { data, error } = await supabase
      .from('thrift_requests')
      .select('*')
      .eq('provider_user_id', providerUserId)
      .order('created_at', { ascending: false });

    if (error) { res.status(500).json({ error: 'Failed to fetch requests' }); return; }

    // Enrich with buyer names
    const requests = data || [];
    const buyerIds = [...new Set(requests.map((r: any) => r.buyer_user_id).filter(Boolean))];
    let buyerNames: Record<number, string> = {};

    if (buyerIds.length > 0) {
      const { data: bizOwners } = await supabase
        .from('business_owners')
        .select('user_id, business_name')
        .in('user_id', buyerIds);
      for (const b of bizOwners || []) {
        buyerNames[b.user_id] = b.business_name || 'Customer';
      }
    }

    const enriched = requests.map((r: any) => ({
      ...r,
      buyer_name: buyerNames[r.buyer_user_id] || 'Customer',
    }));

    res.json({ success: true, requests: enriched });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ── PATCH /api/thrift-requests/:id/approve-complete ──────────────────────────
// Single-step seller action: approve request + mark as completed.
//  • status = 'completed', completed_at = now
//  • in_stock decremented by 1 (floors at 0)
//  • photo_index added to sold_photo_indexes (async)
//  • if new in_stock === 0: all remaining 'requested' rows for same post auto-rejected
router.patch('/api/thrift-requests/:id/approve-complete', async (req: Request, res: Response): Promise<void> => {
  const providerUserId = getAuth(req, res);
  if (!providerUserId) return;

  const requestId = req.params.id;

  try {
    const { data: reqRow, error: fetchErr } = await supabase
      .from('thrift_requests')
      .select('id, post_id, status, provider_user_id, buyer_user_id, photo_index, post_title, post_photo_url, buyer_timezone, created_at')
      .eq('id', requestId)
      .single();

    if (fetchErr || !reqRow) { res.status(404).json({ error: 'Request not found' }); return; }
    if (reqRow.provider_user_id !== providerUserId) { res.status(403).json({ error: 'Forbidden' }); return; }
    if (reqRow.status !== 'requested') {
      res.status(409).json({ error: `Cannot approve a request with status '${reqRow.status}'` });
      return;
    }

    // Mark this request as completed
    const { error: completeErr } = await supabase
      .from('thrift_requests')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', requestId);

    if (completeErr) { res.status(500).json({ error: 'Failed to complete request' }); return; }

    // Decrement in_stock by 1
    const { data: postData } = await supabase
      .from('service_posts')
      .select('in_stock, sold_photo_indexes')
      .eq('id', reqRow.post_id)
      .single();

    const currentStock = Number(postData?.in_stock ?? 0);
    const newStock = Math.max(currentStock - 1, 0);

    const postUpdate: any = { in_stock: newStock };

    // Track which photo was given away (for SOLD badge display)
    if (reqRow.photo_index !== null && reqRow.photo_index !== undefined) {
      const currentSold: number[] = postData?.sold_photo_indexes ?? [];
      if (!currentSold.includes(reqRow.photo_index)) {
        postUpdate.sold_photo_indexes = [...currentSold, reqRow.photo_index];
      }
    }

    await supabase.from('service_posts').update(postUpdate).eq('id', reqRow.post_id);
    console.log(`✅ Thrift request ${requestId} approved & completed. Post #${reqRow.post_id} in_stock: ${currentStock} → ${newStock}`);

    // Collect auto-rejected buyer info for emails (sent non-blocking after response)
    const autoRejected: Array<{ id: string; buyer_user_id: number; post_photo_url?: string | null; buyer_timezone?: string | null }> = [];

    // Auto-reject step 1: always reject others who requested the exact same photo
    // (that specific physical item is now gone regardless of remaining stock)
    if (reqRow.photo_index !== null && reqRow.photo_index !== undefined) {
      const { data: samePhotoOthers } = await supabase
        .from('thrift_requests')
        .select('id, buyer_user_id, post_photo_url, buyer_timezone')
        .eq('post_id', reqRow.post_id)
        .eq('status', 'requested')
        .eq('photo_index', reqRow.photo_index)
        .neq('id', requestId);

      if (samePhotoOthers && samePhotoOthers.length > 0) {
        const ids = samePhotoOthers.map((r: any) => r.id);
        await supabase.from('thrift_requests').update({ status: 'rejected' }).in('id', ids);
        for (const r of samePhotoOthers) autoRejected.push(r);
        console.log(`🚫 Auto-rejected ${ids.length} request(s) for same photo #${reqRow.photo_index} on post #${reqRow.post_id}`);
      }
    }

    // Auto-reject step 2: if stock hits 0, reject ALL remaining requests for this post
    if (newStock === 0) {
      const { data: allOthers } = await supabase
        .from('thrift_requests')
        .select('id, buyer_user_id, post_photo_url, buyer_timezone')
        .eq('post_id', reqRow.post_id)
        .eq('status', 'requested')
        .neq('id', requestId);

      if (allOthers && allOthers.length > 0) {
        const ids = allOthers.map((r: any) => r.id);
        await supabase.from('thrift_requests').update({ status: 'rejected' }).in('id', ids);
        for (const r of allOthers) {
          if (!autoRejected.find((x: any) => x.id === r.id)) autoRejected.push(r);
        }
        console.log(`🚫 Auto-rejected all ${ids.length} remaining request(s) for post #${reqRow.post_id} (stock = 0)`);
      }
    }

    res.json({ success: true, new_stock: newStock });

    // Non-blocking: send completion email to the approved buyer
    (async () => {
      try {
        const postTitle = reqRow.post_title || `Item #${reqRow.post_id}`;
        const buyerId = reqRow.buyer_user_id;
        const [{ data: buyerUser }, { data: buyerBiz }] = await Promise.all([
          supabase.from('users').select('email').eq('user_id', buyerId).single(),
          supabase.from('business_owners').select('business_name').eq('user_id', buyerId).maybeSingle(),
        ]);
        if (buyerUser?.email) {
          await sendBuyerCompletionEmail({
            buyerEmail:    buyerUser.email,
            buyerName:     buyerBiz?.business_name || 'Customer',
            postTitle,
            requestId,
            postPhotoUrl:  reqRow.post_photo_url || null,
            requestDate:   reqRow.created_at || new Date().toISOString(),
            buyerTimezone: reqRow.buyer_timezone || undefined,
          });
        }
      } catch (emailErr) {
        console.error(`❌ Completion email error for request #${requestId}:`, emailErr);
      }
    })();

    // Non-blocking: send rejection emails to all auto-rejected buyers
    if (autoRejected.length > 0) {
      const postTitle = reqRow.post_title || `Item #${reqRow.post_id}`;
      (async () => {
        try {
          const uniqueBuyerIds = [...new Set(autoRejected.map((r: any) => r.buyer_user_id))];
          const [{ data: buyerUsers }, { data: buyerBizs }] = await Promise.all([
            supabase.from('users').select('user_id, email').in('user_id', uniqueBuyerIds),
            supabase.from('business_owners').select('user_id, business_name').in('user_id', uniqueBuyerIds),
          ]);
          const emailMap: Record<number, string> = {};
          const nameMap: Record<number, string> = {};
          for (const u of buyerUsers || []) emailMap[u.user_id] = u.email;
          for (const b of buyerBizs || []) nameMap[b.user_id] = b.business_name || 'Customer';

          for (const r of autoRejected) {
            const email = emailMap[r.buyer_user_id];
            if (!email) continue;
            await sendBuyerRejectionEmail({
              buyerEmail:    email,
              buyerName:     nameMap[r.buyer_user_id] || 'Customer',
              postTitle,
              requestId:     r.id,
              postPhotoUrl:  r.post_photo_url || null,
              requestDate:   new Date().toISOString(),
              buyerTimezone: r.buyer_timezone || undefined,
            });
          }
        } catch (emailErr) {
          console.error(`❌ Auto-rejection email error for post #${reqRow.post_id}:`, emailErr);
        }
      })();
    }
  } catch (err) {
    console.error('❌ PATCH approve-complete:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── PATCH /api/thrift-requests/:id/reject ────────────────────────────────────
router.patch('/api/thrift-requests/:id/reject', async (req: Request, res: Response): Promise<void> => {
  const providerUserId = getAuth(req, res);
  if (!providerUserId) return;

  const requestId = req.params.id;

  try {
    const { data: reqRow, error: fetchErr } = await supabase
      .from('thrift_requests')
      .select('id, status, provider_user_id, buyer_user_id, post_title, post_id, post_photo_url, buyer_timezone, created_at')
      .eq('id', requestId)
      .single();

    if (fetchErr || !reqRow) { res.status(404).json({ error: 'Request not found' }); return; }
    if (reqRow.provider_user_id !== providerUserId) { res.status(403).json({ error: 'Forbidden' }); return; }
    if (reqRow.status !== 'requested') {
      res.status(409).json({ error: `Cannot reject a request with status '${reqRow.status}'` });
      return;
    }

    const { error } = await supabase
      .from('thrift_requests')
      .update({ status: 'rejected' })
      .eq('id', requestId);

    if (error) { res.status(500).json({ error: 'Failed to reject request' }); return; }

    // NOTE: in_stock is NOT restored — it was never decremented on request.
    console.log(`🚫 Thrift request ${requestId} rejected`);
    res.json({ success: true });

    // Non-blocking: send rejection email to buyer
    (async () => {
      try {
        const buyerId = reqRow.buyer_user_id;
        const [{ data: buyerUser }, { data: buyerBiz }] = await Promise.all([
          supabase.from('users').select('email').eq('user_id', buyerId).single(),
          supabase.from('business_owners').select('business_name').eq('user_id', buyerId).maybeSingle(),
        ]);
        if (!buyerUser?.email) return;
        await sendBuyerRejectionEmail({
          buyerEmail:    buyerUser.email,
          buyerName:     buyerBiz?.business_name || 'Customer',
          postTitle:     reqRow.post_title || `Item #${reqRow.post_id}`,
          requestId,
          postPhotoUrl:  reqRow.post_photo_url || null,
          requestDate:   reqRow.created_at || new Date().toISOString(),
          buyerTimezone: reqRow.buyer_timezone || undefined,
        });
      } catch (emailErr) {
        console.error(`❌ Rejection email error for request #${requestId}:`, emailErr);
      }
    })();
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ── Deprecated endpoints ──────────────────────────────────────────────────────
router.patch('/api/thrift-requests/:id/accept', (_req: Request, res: Response): void => {
  res.status(410).json({ error: 'Use /approve-complete instead.' });
});
router.patch('/api/thrift-requests/:id/complete', (_req: Request, res: Response): void => {
  res.status(410).json({ error: 'Use /approve-complete instead.' });
});
router.patch('/api/thrift-requests/:id/accept-and-complete', (_req: Request, res: Response): void => {
  res.status(410).json({ error: 'Use /approve-complete instead.' });
});

export default router;
