/**
 * Orders Router — /api/orders
 *
 * Handles the full lifecycle of Boutique (Zelle-based) orders stored in the
 * `payments` table in Supabase.
 *
 * ── Endpoints ──────────────────────────────────────────────────────────────
 *
 *  POST   /api/orders
 *    • Called by the buyer at checkout after confirming their Zelle payment.
 *    • Inserts a new row into `payments` with status = 'pending'.
 *    • Fires order-confirmation emails to buyer, provider, and all admins.
 *
 *  GET    /api/orders/provider
 *    • Returns all orders where the logged-in user is the service provider.
 *    • Used by the provider's Orders screen to list pending/completed orders.
 *
 *  PATCH  /api/orders/:id/status
 *    • Provider-only. Accepts { status: 'completed' | 'cancelled' }.
 *    • On 'completed':
 *        1. Updates the payment row status.
 *        2. Decrements `service_posts.in_stock` for each purchased item
 *           (floors at 0 — never goes negative).
 *        3. Fires status-update emails to buyer, provider, and all admins.
 *    • On 'cancelled': updates status only — stock is NOT decremented since
 *      no inventory was consumed.
 *
 * ── Email notifications (via Resend + emailServices.ts) ────────────────────
 *  • Order placed  → buyer, provider, admins receive order-confirmation email.
 *  • Order updated → buyer, provider, admins receive a completed/cancelled
 *    email with tailored messaging per recipient role.
 *
 * ── Auth ───────────────────────────────────────────────────────────────────
 *  All routes require a valid JWT Bearer token (same secret as the rest of
 *  the API). The PATCH route additionally verifies that the token belongs to
 *  the order's provider_user_id before allowing the update.
 */

import express, { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { Resend } from 'resend';
import { supabase } from '../config/Supabase';

import { sendOrderStatusEmails, sendOrderPlacementEmails } from '../services/emailServices';

const router = express.Router();
const resend = new Resend(process.env.RESEND_API_KEY);

// 1h in dev for easy testing, 24h in production
const BOUTIQUE_EXPIRY_MS = process.env.NODE_ENV === 'production'
  ? 24 * 60 * 60 * 1000
  :  1 * 60 * 60 * 1000;

// ─── Email helper ────────────────────────────────────────────────────────────

function buildOrderReportHtml(order: {
  orderId: string | number;
  orderDate: string;
  businessName?: string | null;
  items: any[];
  totalCents: number;
  providerZelleId?: string | null;
  shippingAddress?: any | null;
  recipientLabel: string;
}): string {
  const {
    orderId, orderDate, businessName, items,
    totalCents, providerZelleId, shippingAddress, recipientLabel,
  } = order;

  const formattedDate = new Date(orderDate).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  const itemRows = (items || []).map((item: any) => {
    const unitPrice = item.photo_price || item.price || 0;
    const qty = item.quantity ?? 1;
    const amount = unitPrice * qty;
    const itemId = `#P${item.post_id}-${(item.photo_index ?? 0) + 1}`;
    const thumbHtml = item.photo_url
      ? `<img src="${item.photo_url}" width="48" height="48" style="border-radius:6px;display:block;margin-bottom:4px;object-fit:cover;" alt="${item.title || 'item'}" />`
      : '';
    return `
      <tr>
        <td style="padding:8px;border-bottom:1px solid #f0f0f0;vertical-align:top">
          ${thumbHtml}
          <span style="display:block;font-size:13px;font-weight:700">${item.title || '—'}</span>
          <span style="display:block;font-size:12px;font-weight:700;color:#555;margin-top:2px">${itemId}</span>
        </td>
        <td style="padding:8px;border-bottom:1px solid #f0f0f0;text-align:center;vertical-align:top">${qty}</td>
        <td style="padding:8px;border-bottom:1px solid #f0f0f0;text-align:right;vertical-align:top">${unitPrice > 0 ? `$${unitPrice.toFixed(2)}` : '—'}</td>
        <td style="padding:8px;border-bottom:1px solid #f0f0f0;text-align:right;vertical-align:top">${amount > 0 ? `$${amount.toFixed(2)}` : '—'}</td>
      </tr>`;
  }).join('');

  const addressBlock = shippingAddress
    ? `<div style="margin-top:16px;padding:12px;background:#f9f9f9;border-radius:6px">
        <strong>Deliver To:</strong><br/>
        ${shippingAddress.fullName ? `${shippingAddress.fullName}<br/>` : ''}
        ${shippingAddress.street}<br/>
        ${shippingAddress.city}, ${shippingAddress.state} ${shippingAddress.zipCode}
        ${shippingAddress.notes ? `<br/><em>${shippingAddress.notes}</em>` : ''}
       </div>`
    : '';

  const zelleBlock = providerZelleId
    ? `<div style="margin-top:16px;padding:12px;background:#E3F2FD;border-left:4px solid #4A90E2;border-radius:4px">
        <strong>Zelle Payment Reminder:</strong><br/>
        Send <strong>$${(totalCents / 100).toFixed(2)}</strong> via Zelle to <strong>${providerZelleId}</strong>
       </div>`
    : '';

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8"/>
        <style>
          body { font-family: Arial, sans-serif; color: #333; margin: 0; padding: 0; }
          .wrap { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4A90E2; color: #fff; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
          .body { background: #fff; border: 1px solid #e0e0e0; border-top: none; padding: 24px; border-radius: 0 0 8px 8px; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; }
          th { background: #f5f5f5; padding: 8px; text-align: left; font-size: 12px; color: #777; }
          th:last-child, th:nth-child(3) { text-align: right; }
          th:nth-child(2) { text-align: center; }
          .total-row td { font-weight: 700; font-size: 15px; padding-top: 12px; }
          .footer { text-align: center; font-size: 11px; color: #aaa; margin-top: 24px; }
          .disclaimer { font-size: 11px; color: #999; margin-top: 16px; padding: 10px; background: #fafafa; border-radius: 4px; }
        </style>
      </head>
      <body>
        <div class="wrap">
          <div class="header">
            <h2 style="margin:0">Order Confirmed — GoZipMarket</h2>
          </div>
          <div class="body">
            <p>Hi ${recipientLabel},</p>
            <p>An order has been placed successfully. Here are the details:</p>

            <table>
              <tr><th>Order ID</th><td>#${shortId(orderId)}</td></tr>
              <tr><th>Date</th><td>${formattedDate}</td></tr>
              ${businessName ? `<tr><th>Boutique</th><td>${businessName}</td></tr>` : ''}
            </table>

            <h3 style="margin-top:20px">Items</h3>
            <table>
              <thead>
                <tr>
                  <th>Item</th><th style="text-align:center">Qty</th>
                  <th style="text-align:right">Price</th><th style="text-align:right">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${itemRows}
                <tr class="total-row">
                  <td colspan="3" style="padding-top:12px;text-align:right;border-top:2px solid #e0e0e0">Total:</td>
                  <td style="padding-top:12px;text-align:right;border-top:2px solid #e0e0e0;color:#4A90E2">
                    $${(totalCents / 100).toFixed(2)}
                  </td>
                </tr>
              </tbody>
            </table>

            ${addressBlock}
            ${zelleBlock}

            <div class="disclaimer">
              <strong>Disclaimer:</strong> This transaction is directly between the service provider and the customer.
              GoZipMarket is not a party to any transaction and is not liable for any disputes, non-delivery,
              payment issues, or damages arising from transactions conducted through this platform.
            </div>
          </div>
          <div class="footer">© 2025 GoZipMarket — Zip Market LLC</div>
        </div>
      </body>
    </html>`;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function sendOrderEmails(
  orderId: string | number,
  buyerUserId: number,
  providerUserId: number,
  payload: {
    items: any[];
    totalCents: number;
    providerZelleId?: string | null;
    shippingAddress?: any | null;
  },
): Promise<void> {
  // Normalise to numbers in case req.body sent strings
  const buyerId    = Number(buyerUserId);
  const providerId = Number(providerUserId);

  const displayId = shortId(orderId);
  console.log(`📧 sendOrderEmails called — order #${displayId}, buyer ${buyerId}, provider ${providerId}`);

  // Use supabase — that's where users and is_admin live
  const [buyerRes, providerRes, adminsRes, buyerBizRes, providerBizRes] = await Promise.all([
    supabase.from('users').select('email').eq('user_id', buyerId).single(),
    supabase.from('users').select('email').eq('user_id', providerId).single(),
    supabase.from('users').select('user_id, email').eq('is_admin', true),
    supabase.from('business_owners').select('business_name').eq('user_id', buyerId).maybeSingle(),
    supabase.from('business_owners').select('business_name').eq('user_id', providerId).maybeSingle(),
  ]);

  const buyer    = buyerRes.data;
  const provider = providerRes.data;
  const admins   = (adminsRes.data || []).filter(
    a => Number(a.user_id) !== buyerId && Number(a.user_id) !== providerId,
  );

  console.log(`📧 Buyer: ${buyer?.email ?? 'NOT FOUND'} | Provider: ${provider?.email ?? 'NOT FOUND'} | Admins: ${admins.length}`);

  const orderDate = new Date().toISOString();

  const recipients: Array<{ email: string; label: string }> = [];
  if (buyer)    recipients.push({ email: buyer.email,    label: buyerBizRes.data?.business_name    || 'Customer' });
  if (provider) recipients.push({ email: provider.email, label: providerBizRes.data?.business_name || 'Service Provider' });
  admins.forEach(a => recipients.push({ email: a.email, label: 'Admin' }));

  if (recipients.length === 0) {
    console.error(`❌ No recipients found for order #${displayId} — emails not sent`);
    return;
  }

  console.log(`📧 Sending order emails to: ${recipients.map(r => r.email).join(', ')}`);

  await Promise.all(recipients.map(({ email, label }) =>
    resend.emails.send({
      from:    'GoZipMarket <noreply@gozipmarket.com>',
      replyTo: 'zipmarket333@gmail.com',
      to:      email,
      subject: `Order Confirmed #${displayId} — GoZipMarket`,
      html:    buildOrderReportHtml({
        orderId,
        orderDate,
        items:           payload.items,
        totalCents:      payload.totalCents,
        providerZelleId: payload.providerZelleId,
        shippingAddress: payload.shippingAddress,
        recipientLabel:  label,
      }),
    })
    .then(() => console.log(`✅ Order email sent to ${email}`))
    .catch(err => console.error(`❌ Failed to send order email to ${email}:`, err)),
  ));
}

// ─────────────────────────────────────────────────────────────────────────────

/** Returns the first 8 chars of a UUID in uppercase, e.g. "09D4CC50" */
const shortId = (id: string | number): string => String(id).slice(0, 8).toUpperCase();

const verifyToken = (token: string): { user_id: string } | null => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET || 'secret') as { user_id: string };
  } catch {
    return null;
  }
};

// POST /api/orders
// Saves a confirmed Zelle order to the payments table
router.post('/api/orders', async (req: Request, res: Response): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }

    const buyerUserId = parseInt(decoded.user_id);

    const {
      provider_user_id,
      buyer_zelle_id,
      service_provider_zelle_id,
      payment_methods,
      payment_infos,
      total_cents,
      items,
      shipping_address,
      buyer_timezone,
    } = req.body;

    if (!provider_user_id || total_cents == null || !items?.length) {
      res.status(400).json({ error: 'Missing required order fields' });
      return;
    }

    // ── Stock check: block if post is out of stock or specific photo already sold ──
    const postIds = [...new Set((items as any[]).map((i: any) => Number(i.post_id)).filter(Boolean))];
    if (postIds.length > 0) {
      const [{ data: posts }, { data: activePendingOrders }] = await Promise.all([
        supabase.from('service_posts').select('id, title, in_stock').in('id', postIds),
        // Active pending = expires_at in future, OR expires_at NULL but < 1h old
        (async () => {
          const _now12hAgo = new Date(Date.now() - BOUTIQUE_EXPIRY_MS).toISOString();
          const [r1, r2] = await Promise.all([
            supabase.from('payments').select('items').eq('status', 'pending').gt('expires_at', new Date().toISOString()),
            supabase.from('payments').select('items').eq('status', 'pending').is('expires_at', null).gt('created_at', _now12hAgo),
          ]);
          return { data: [...(r1.data || []), ...(r2.data || [])] };
        })()
      ]);

      // Build set of currently locked photo slots: "postId_photoIndex"
      const lockedSlots = new Set<string>();
      for (const order of activePendingOrders || []) {
        for (const oi of (order.items || [])) {
          if (oi.post_id != null && oi.photo_index != null) {
            lockedSlots.add(`${oi.post_id}_${oi.photo_index}`);
          }
        }
      }

      for (const item of items as any[]) {
        const post = (posts || []).find((p: any) => Number(p.id) === Number(item.post_id));
        if (post && post.in_stock != null && Number(post.in_stock) <= 0) {
          res.status(409).json({
            error: `"${post.title || 'Item'}" is out of stock. Please remove it from your cart.`,
            out_of_stock: true, post_id: post.id,
          });
          return;
        }
        const slot = `${item.post_id}_${item.photo_index}`;
        if (lockedSlots.has(slot)) {
          res.status(409).json({
            error: `This item (#P${item.post_id}-${(item.photo_index ?? 0) + 1}) is already reserved by another buyer.`,
            out_of_stock: true, post_id: item.post_id,
          });
          return;
        }
      }
    }

    const { data, error } = await supabase
      .from('payments')
      .insert({
        buyer_user_id:             buyerUserId,
        provider_user_id:          provider_user_id,
        amount:                    total_cents,
        platform_fee:              0,
        payment_method:            'zelle',
        status:                    'pending',
        buyer_zelle_id:            buyer_zelle_id || null,
        service_provider_zelle_id: service_provider_zelle_id || null,
        items:                     items,
        shipping_address:          shipping_address || null,
        buyer_timezone:            buyer_timezone || null,
        expires_at:                new Date(Date.now() + BOUTIQUE_EXPIRY_MS).toISOString(), // 24h prod / 1h dev expiry window
      })
      .select('id')
      .single();

    if (error) {
      console.error('❌ Failed to save order:', error);
      res.status(500).json({ error: 'Failed to save order' });
      return;
    }

    console.log(`✅ Order saved: ${data.id}`);
    res.status(201).json({ success: true, order_id: data.id });

    // ── Decrement in_stock immediately on order placement ────────────────────
    (async () => {
      try {
        const stockDecrements = new Map<number, number>();
        for (const item of items as any[]) {
          const postId = Number(item.post_id);
          const qty    = Number(item.quantity ?? 1);
          if (postId) stockDecrements.set(postId, (stockDecrements.get(postId) ?? 0) + qty);
        }
        await Promise.all(
          Array.from(stockDecrements.entries()).map(async ([postId, qty]) => {
            const { data: post } = await supabase
              .from('service_posts').select('in_stock').eq('id', postId).single();
            const newStock = Math.max(Number(post?.in_stock ?? 0) - qty, 0);
            await supabase.from('service_posts').update({ in_stock: newStock }).eq('id', postId);
            console.log(`✅ in_stock decremented on order placement: post #${postId} -${qty} → ${newStock}`);
          }),
        );
      } catch (stockErr) {
        console.error(`❌ Stock decrement error on placement for order #${data.id}:`, stockErr);
      }
    })();

    // Send order placement emails non-blocking (provider, customer, admins)
    (async () => {
      try {
        const buyerId    = buyerUserId;
        const providerId = Number(provider_user_id);

        const [buyerRes, providerRes, adminsRes, buyerBizRes, providerBizRes] = await Promise.all([
          supabase.from('users').select('email').eq('user_id', buyerId).single(),
          supabase.from('users').select('email').eq('user_id', providerId).single(),
          supabase.from('users').select('user_id, email').eq('is_admin', true),
          supabase.from('business_owners').select('business_name').eq('user_id', buyerId).maybeSingle(),
          supabase.from('business_owners').select('business_name').eq('user_id', providerId).maybeSingle(),
        ]);

        const buyer    = buyerRes.data;
        const provider = providerRes.data;
        const admins   = (adminsRes.data || []).filter(
          (a: any) => Number(a.user_id) !== buyerId && Number(a.user_id) !== providerId,
        );

        if (!buyer || !provider) {
          console.error(`❌ Could not find buyer or provider for order #${data.id} — placement emails not sent`);
          return;
        }

        await sendOrderPlacementEmails({
          orderId:        data.id,
          customerEmail:  buyer.email,
          customerName:   buyerBizRes.data?.business_name || 'Customer',
          providerEmail:  provider.email,
          providerName:   providerBizRes.data?.business_name || 'Service Provider',
          adminEmails:    admins.map((a: any) => a.email),
          items,
          totalCents:     total_cents,
          orderDate:      new Date().toISOString(),
          buyerTimezone:  buyer_timezone || undefined,
          paymentMethods: payment_methods || [],
          paymentInfos:   payment_infos || {},
        });
      } catch (emailErr) {
        console.error(`❌ Order placement email error for #${data.id}:`, emailErr);
      }
    })();

  } catch (err: any) {
    console.error('❌ Error in POST /api/orders:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/orders/provider — orders where the logged-in user is the provider
router.get('/api/orders/provider', async (req: Request, res: Response): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) { res.status(401).json({ error: 'Unauthorized' }); return; }

    const decoded = verifyToken(token);
    if (!decoded) { res.status(401).json({ error: 'Invalid token' }); return; }

    const providerUserId = parseInt(decoded.user_id);

    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('provider_user_id', providerUserId)
      .order('created_at', { ascending: false });

    if (error) { res.status(500).json({ error: 'Failed to fetch orders' }); return; }

    // Enrich with buyer names
    const orders = data || [];
    const buyerIds = [...new Set(orders.map((o: any) => o.buyer_user_id).filter(Boolean))];
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
    const enriched = orders.map((o: any) => ({
      ...o,
      buyer_name: buyerNames[o.buyer_user_id] || 'Customer',
    }));

    res.json({ success: true, orders: enriched });
  } catch (err: any) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/orders/:id/status — mark order as completed (provider only)
router.patch('/api/orders/:id/status', async (req: Request, res: Response): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) { res.status(401).json({ error: 'Unauthorized' }); return; }

    const decoded = verifyToken(token);
    if (!decoded) { res.status(401).json({ error: 'Invalid token' }); return; }

    const providerUserId = parseInt(decoded.user_id);
    const orderId = req.params.id;
    const { status } = req.body;

    if (!['completed', 'cancelled'].includes(status)) {
      res.status(400).json({ error: 'Invalid status. Use completed or cancelled.' });
      return;
    }

    // Fetch order to check current status and items before updating
    const { data: existingOrder } = await supabase
      .from('payments')
      .select('status, items')
      .eq('id', orderId)
      .eq('provider_user_id', providerUserId)
      .single();

    if (!existingOrder) {
      res.status(404).json({ error: 'Order not found or not authorized' });
      return;
    }

    // Only let the provider update their own orders
    const { data, error } = await supabase
      .from('payments')
      .update({ status })
      .eq('id', orderId)
      .eq('provider_user_id', providerUserId)
      .select('id, status')
      .single();

    if (error || !data) {
      res.status(404).json({ error: 'Order not found or not authorized' });
      return;
    }


    res.json({ success: true, order: data });

    // ── Revert in_stock when order is cancelled (stock was decremented at placement) ──
    if (status === 'cancelled' && existingOrder?.items) {
      (async () => {
        try {
          const stockIncrements = new Map<number, number>();
          for (const item of existingOrder.items) {
            const postId = Number(item.post_id);
            const qty    = Number(item.quantity ?? 1);
            if (postId) stockIncrements.set(postId, (stockIncrements.get(postId) ?? 0) + qty);
          }
          await Promise.all(
            Array.from(stockIncrements.entries()).map(async ([postId, qty]) => {
              const { data: post } = await supabase
                .from('service_posts').select('in_stock').eq('id', postId).single();
              const newStock = Number(post?.in_stock ?? 0) + qty;
              await supabase.from('service_posts').update({ in_stock: newStock }).eq('id', postId);
              console.log(`✅ in_stock reverted on cancel: post #${postId} +${qty} → ${newStock}`);
            }),
          );
        } catch (stockErr) {
          console.error(`❌ Stock revert error for order #${orderId}:`, stockErr);
        }
      })();
    }

    // Send status-update emails non-blocking
    (async () => {
      try {
        // Fetch full order details
        const { data: order } = await supabase
          .from('payments')
          .select('buyer_user_id, provider_user_id, amount, items, shipping_address, created_at, buyer_timezone')
          .eq('id', orderId)
          .single();

        if (!order) return;

        const buyerId    = Number(order.buyer_user_id);
        const providerId = Number(order.provider_user_id);

        const [buyerRes, providerRes, adminsRes, buyerBizRes, providerBizRes] = await Promise.all([
          supabase.from('users').select('email').eq('user_id', buyerId).single(),
          supabase.from('users').select('email').eq('user_id', providerId).single(),
          supabase.from('users').select('user_id, email').eq('is_admin', true),
          supabase.from('business_owners').select('business_name').eq('user_id', buyerId).maybeSingle(),
          supabase.from('business_owners').select('business_name').eq('user_id', providerId).maybeSingle(),
        ]);

        const buyer    = buyerRes.data;
        const provider = providerRes.data;
        const admins   = (adminsRes.data || []).filter(
          (a: any) => Number(a.user_id) !== buyerId && Number(a.user_id) !== providerId,
        );

        if (!buyer || !provider) {
          console.error(`❌ Could not find buyer or provider for order #${orderId} — status emails not sent`);
          return;
        }

        await sendOrderStatusEmails({
          orderId,
          status:        status as 'completed' | 'cancelled',
          customerEmail: buyer.email,
          customerName:  buyerBizRes.data?.business_name || 'Customer',
          providerEmail: provider.email,
          providerName:  providerBizRes.data?.business_name || 'Service Provider',
          adminEmails:   admins.map(a => a.email),
          items:         order.items || [],
          totalCents:    order.amount,
          orderDate:     order.created_at,
          buyerTimezone: order.buyer_timezone || undefined,
        });
      } catch (emailErr) {
        console.error(`❌ Order status email error for #${orderId}:`, emailErr);
      }
    })();

  } catch (err: any) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
