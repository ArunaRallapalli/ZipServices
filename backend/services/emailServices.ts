/**
 * Email Service
 * 
 * Handles all email notifications using Resend
 * Reuses existing email configuration from email verification
 */

import { Resend } from 'resend';
import dotenv from 'dotenv';
import { supabase } from '../config/Supabase';

dotenv.config();

const resend = new Resend(process.env.RESEND_API_KEY);

interface BookingNotificationParams {
  providerEmail: string;
  providerName: string;
  customerName: string;
  bookingDate: string;
  bookingId: number;
}

/**
 * Send booking notification to service provider
 */
export async function sendBookingNotification({
  providerEmail,
  providerName,
  customerName,
  bookingDate,
  bookingId
}: BookingNotificationParams) {
  try {
    // Format date nicely
    const [year, month, day] = bookingDate.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day);
    const formattedDate = dateObj.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    console.log('📧 Sending booking notification to:', providerEmail);

  const emailResult = await resend.emails.send({
// To:
from: 'GoZipMarket <noreply@gozipmarket.com>',  // ← USE THIS
replyTo: 'zipmarket333@gmail.com',
  to: providerEmail,
  subject: '📅 New Booking Request',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background-color: #4A90E2; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
              .booking-details { background-color: #e3f2fd; border-left: 4px solid #2196F3; padding: 15px; margin: 20px 0; }
              .detail-row { margin: 10px 0; }
              .label { font-weight: bold; color: #555; }
              .value { color: #333; }
              .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>📅 New Booking Request</h1>
              </div>
              <div class="content">
                <p>Hi ${providerName},</p>
                
                <p>Great news! You have received a new booking request.</p>
                
                <div class="booking-details">
                  <div class="detail-row">
                    <span class="label">Customer:</span>
                    <span class="value">${customerName}</span>
                  </div>
                  <div class="detail-row">
                    <span class="label">Date:</span>
                    <span class="value">${formattedDate}</span>
                  </div>
                  <div class="detail-row">
                    <span class="label">Booking ID:</span>
                    <span class="value">#${bookingId}</span>
                  </div>
                  <div class="detail-row">
                    <span class="label">Status:</span>
                    <span class="value">Pending Confirmation</span>
                  </div>
                </div>
                
                <p><strong>Next Steps:</strong></p>
                <ul>
                  <li>Log in to your GoZipMarket account</li>
                  <li>Review the booking details</li>
                  <li>Confirm or decline the booking</li>
                  <li>Contact the customer if needed</li>
                </ul>
                
                <p>Please respond to this booking request as soon as possible to provide the best customer experience.</p>
                
                <p>Best regards,<br><strong>The GoZipMarket Team</strong></p>
              </div>
              <div class="footer">
                <p>© 2025 GoZipMarket - Zip Market LLC</p>
                <p>This is an automated notification, please do not reply to this email.</p>
              </div>
            </div>
          </body>
        </html>
      `
    });

    console.log('✅ Booking notification sent:', emailResult);

    return {
      success: true,
      messageId: emailResult.data?.id
    };

  } catch (error) {
    console.error('❌ Error sending booking notification:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
  }
  // ============================================================================
// CATEGORY REQUEST DECISION EMAIL
// ============================================================================

interface CategoryRequestDecisionParams {
  userEmail: string;
  userName: string;
  categoryName: string;
  requestStatus: 'approved' | 'rejected';
  adminNotes?: string;
}

/**
 * Send category request decision notification to user
 */
export async function sendCategoryRequestDecision({
  userEmail,
  userName,
  categoryName,
  requestStatus,
  adminNotes
}: CategoryRequestDecisionParams) {
  try {
    const isApproved = requestStatus === 'approved';
    const subject = isApproved 
      ? '✅ Your Category Request has been Approved! and Completed!' 
      : 'Update on Your Category Request';
    
    const statusColor = isApproved ? '#4CAF50' : '#FF9800';
    const statusIcon = isApproved ? '✅' : '📋';
    const statusText = isApproved ? 'Approved' : 'Under Review';

    console.log(`📧 Sending category ${requestStatus} email to:`, userEmail);

    const emailResult = await resend.emails.send({
      from: 'GoZipMarket <noreply@gozipmarket.com>',
      to: userEmail,
      subject: subject,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background-color: ${statusColor}; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
              .status-box { background-color: ${isApproved ? '#e8f5e9' : '#fff3e0'}; border-left: 4px solid ${statusColor}; padding: 15px; margin: 20px 0; }
              .category-name { font-size: 18px; font-weight: bold; color: ${statusColor}; margin: 10px 0; }
              .admin-notes { background-color: #e3f2fd; border-left: 4px solid #2196F3; padding: 15px; margin: 20px 0; }
              .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>${statusIcon} Category Request ${statusText}</h1>
              </div>
              <div class="content">
                <p>Hi ${userName},</p>
                
                ${isApproved ? `
                  <p><strong>Great news!</strong> Your category request has been approved!</p>
                  
                  <div class="status-box">
                    <p><strong>Approved Category:</strong></p>
                    <p class="category-name">${categoryName}</p>
                  </div>
                  
                  <p><strong>What's Next?</strong></p>
                  <ul>
                    <li>You can now create service posts in this category</li>
                    <li>This category will be available to other users as well</li>
                    <li>Start posting your services today!</li>
                  </ul>
                ` : `
                  <p>Thank you for your interest in adding a new service category.</p>
                  
                  <div class="status-box">
                    <p><strong>Requested Category:</strong></p>
                    <p class="category-name">${categoryName}</p>
                  </div>
                  
                  <p>After careful review, we're unable to approve this category request at this time.</p>
                  
                  ${adminNotes ? `
                    <div class="admin-notes">
                      <p><strong>Admin Response:</strong></p>
                      <p>${adminNotes}</p>
                    </div>
                  ` : ''}
                  
                  <p><strong>What you can do:</strong></p>
                  <ul>
                    <li>Browse our existing categories for similar options</li>
                    <li>Contact support if you have questions</li>
                    <li>Submit a revised request with more details</li>
                  </ul>
                `}
                
                <p>Thank you for using GoZipMarket!</p>
                
                <p>Best regards,<br><strong>The GoZipMarket Team</strong></p>
              </div>
              <div class="footer">
                <p>© 2025 GoZipMarket - Zip Market LLC</p>
                <p>This is an automated notification, please do not reply to this email.</p>
              </div>
            </div>
          </body>
        </html>
      `
    });

    console.log(`✅ Category ${requestStatus} email sent:`, emailResult);

    return {
      success: true,
      messageId: emailResult.data?.id
    };

  } catch (error) {
    console.error(`❌ Error sending category ${requestStatus} email:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// ============================================================================
// BOOKING STATUS UPDATE EMAIL
// ============================================================================

interface BookingStatusUpdateParams {
  customerEmail: string;
  customerName: string;
  providerName: string;
  bookingDate: string;
  bookingId: number;
  status: 'confirmed' | 'cancelled' | 'completed';
  cancellationReason?: string;
}

/**
 * Send booking status update notification to customer
 */
export async function sendBookingStatusUpdate({
  customerEmail,
  customerName,
  providerName,
  bookingDate,
  bookingId,
  status,
  cancellationReason
}: BookingStatusUpdateParams) {
  try {
    // Format date nicely
    const [year, month, day] = bookingDate.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day);
    const formattedDate = dateObj.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const statusConfig = {
      confirmed: {
        subject: '✅ Your Booking has been Confirmed!',
        color: '#4CAF50',
        icon: '✅',
        title: 'Booking Confirmed'
      },
      cancelled: {
        subject: '❌ Booking Cancelled',
        color: '#F44336',
        icon: '❌',
        title: 'Booking Cancelled'
      },
      completed: {
        subject: '🎉 Service Completed - Please Leave a Review',
        color: '#2196F3',
        icon: '🎉',
        title: 'Service Completed'
      }
    };

    const config = statusConfig[status];

    console.log(`📧 Sending booking ${status} email to:`, customerEmail);

    const emailResult = await resend.emails.send({
      from: 'GoZipMarket <noreply@gozipmarket.com>',
      to: customerEmail,
      subject: config.subject,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background-color: ${config.color}; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
              .booking-details { background-color: #e3f2fd; border-left: 4px solid #2196F3; padding: 15px; margin: 20px 0; }
              .detail-row { margin: 10px 0; }
              .label { font-weight: bold; color: #555; }
              .value { color: #333; }
              .warning-box { background-color: #fff3e0; border-left: 4px solid #FF9800; padding: 15px; margin: 20px 0; }
              .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>${config.icon} ${config.title}</h1>
              </div>
              <div class="content">
                <p>Hi ${customerName},</p>
                
                ${status === 'confirmed' ? `
                  <p><strong>Great news!</strong> Your booking has been confirmed by the service provider.</p>
                  
                  <div class="booking-details">
                    <div class="detail-row">
                      <span class="label">Provider:</span>
                      <span class="value">${providerName}</span>
                    </div>
                    <div class="detail-row">
                      <span class="label">Date:</span>
                      <span class="value">${formattedDate}</span>
                    </div>
                    <div class="detail-row">
                      <span class="label">Booking ID:</span>
                      <span class="value">#${bookingId}</span>
                    </div>
                    <div class="detail-row">
                      <span class="label">Status:</span>
                      <span class="value" style="color: ${config.color}; font-weight: bold;">Confirmed</span>
                    </div>
                  </div>
                  
                  <p><strong>What's Next?</strong></p>
                  <ul>
                    <li>Mark your calendar for ${formattedDate}</li>
                    <li>The provider will contact you if needed</li>
                    <li>Be ready at the scheduled time</li>
                  </ul>
                  
                  <p>We look forward to serving you!</p>
                ` : status === 'cancelled' ? `
                  <p>Unfortunately, your booking has been cancelled by the service provider.</p>
                  
                  <div class="booking-details">
                    <div class="detail-row">
                      <span class="label">Provider:</span>
                      <span class="value">${providerName}</span>
                    </div>
                    <div class="detail-row">
                      <span class="label">Original Date:</span>
                      <span class="value">${formattedDate}</span>
                    </div>
                    <div class="detail-row">
                      <span class="label">Booking ID:</span>
                      <span class="value">#${bookingId}</span>
                    </div>
                    <div class="detail-row">
                      <span class="label">Status:</span>
                      <span class="value" style="color: ${config.color}; font-weight: bold;">Cancelled</span>
                    </div>
                  </div>
                  
                  ${cancellationReason ? `
                    <div class="warning-box">
                      <p><strong>Reason:</strong></p>
                      <p>${cancellationReason}</p>
                    </div>
                  ` : ''}
                  
                  <p><strong>What you can do:</strong></p>
                  <ul>
                    <li>Book a different date with this provider</li>
                    <li>Search for other service providers</li>
                    <li>Contact support if you have questions</li>
                  </ul>
                ` : `
                  <p><strong>Your service has been completed!</strong></p>
                  
                  <div class="booking-details">
                    <div class="detail-row">
                      <span class="label">Provider:</span>
                      <span class="value">${providerName}</span>
                    </div>
                    <div class="detail-row">
                      <span class="label">Service Date:</span>
                      <span class="value">${formattedDate}</span>
                    </div>
                    <div class="detail-row">
                      <span class="label">Booking ID:</span>
                      <span class="value">#${bookingId}</span>
                    </div>
                    <div class="detail-row">
                      <span class="label">Status:</span>
                      <span class="value" style="color: ${config.color}; font-weight: bold;">Completed</span>
                    </div>
                  </div>
                  
                  <p><strong>Please leave a review!</strong></p>
                  <p>Your feedback helps other customers and service providers. Please take a moment to share your experience.</p>
                  
                  <ul>
                    <li>Log in to your GoZipMarket account</li>
                    <li>Go to your Messages</li>
                    <li>Click "Leave Review" in the completion message</li>
                  </ul>
                  
                  <p>Thank you for using GoZipMarket!</p>
                `}
                
                <p>Best regards,<br><strong>The GoZipMarket Team</strong></p>
              </div>
              <div class="footer">
                <p>© 2025 GoZipMarket - Zip Market LLC</p>
                <p>This is an automated notification, please do not reply to this email.</p>
              </div>
            </div>
          </body>
        </html>
      `
    });

    console.log(`✅ Booking ${status} email sent:`, emailResult);

    return {
      success: true,
      messageId: emailResult.data?.id
    };

  } catch (error) {
    console.error(`❌ Error sending booking ${status} email:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
// ============================================================================
// ORDER STATUS UPDATE EMAILS (to Customer, Provider, and Admin)
// ============================================================================

interface OrderStatusEmailParams {
  orderId: string | number;
  status: 'completed' | 'cancelled';
  customerEmail: string;
  customerName: string;
  providerEmail: string;
  providerName: string;
  adminEmails: string[];
  items: any[];
  totalCents: number;
  orderDate?: string;
  businessName?: string | null;
  buyerTimezone?: string;
}

function buildOrderStatusHtml(params: {
  recipientLabel: string;
  role: 'customer' | 'provider' | 'admin';
  orderId: string | number;
  status: 'completed' | 'cancelled';
  customerName: string;
  providerName: string;
  items: any[];
  totalCents: number;
  orderDate: string;
  businessName?: string | null;
  buyerTimezone?: string;
}): string {
  const { recipientLabel, role, orderId, status, customerName, providerName, items, totalCents, orderDate, businessName, buyerTimezone } = params;

  const displayId = String(orderId).slice(0, 8).toUpperCase();
  const isCompleted = status === 'completed';
  const headerColor = isCompleted ? '#4CAF50' : '#F44336';
  const statusIcon = isCompleted ? '✅' : '❌';
  const statusLabel = isCompleted ? 'Completed' : 'Cancelled';

  const formattedDate = new Date(orderDate).toLocaleString('en-US', {
    timeZone: buyerTimezone || 'UTC',
    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  const itemsSubtotal = (items || []).reduce((sum: number, item: any) => {
    const u = item.photo_price != null ? item.photo_price : (item.price || 0);
    return sum + u * (item.quantity ?? 1);
  }, 0);
  const shippingFeeStatus = Math.round(((totalCents / 100) - itemsSubtotal) * 100) / 100;

  const itemRows = (items || []).map((item: any) => {
    const unitPrice = item.photo_price || item.price || 0;
    const qty = item.quantity ?? 1;
    const amount = unitPrice * qty;
    const itemId = `#P${item.post_id}-${(item.photo_index ?? 0) + 1}`;
    const thumbHtml = item.photo_url
      ? `<img src="${item.photo_url}" width="40" height="40" style="border-radius:5px;display:block;margin-bottom:3px;object-fit:cover;" alt="${item.title || 'item'}" />`
      : '';
    return `
      <tr>
        <td style="padding:8px;border-bottom:1px solid #f0f0f0;vertical-align:top">
          ${thumbHtml}
          <span style="display:block;font-size:13px;font-weight:700">${item.title || '—'}</span>
          <span style="display:block;font-size:11px;color:#888;font-weight:600;margin-top:2px">${itemId}</span>
        </td>
        <td style="padding:8px;border-bottom:1px solid #f0f0f0;text-align:center;vertical-align:top">${qty}</td>
        <td style="padding:8px;border-bottom:1px solid #f0f0f0;text-align:right;vertical-align:top">${unitPrice > 0 ? `$${unitPrice.toFixed(2)}` : '—'}</td>
        <td style="padding:8px;border-bottom:1px solid #f0f0f0;text-align:right;vertical-align:top">${amount > 0 ? `$${amount.toFixed(2)}` : '—'}</td>
      </tr>`;
  }).join('');

  const shippingRowStatus = shippingFeeStatus > 0
    ? `<tr>
        <td style="padding:8px;border-bottom:1px solid #f0f0f0" colspan="3">Shipping &amp; Handling</td>
        <td style="padding:8px;border-bottom:1px solid #f0f0f0;text-align:right">$${shippingFeeStatus.toFixed(2)}</td>
       </tr>`
    : '';

  const roleMessage = {
    customer: isCompleted
      ? `<p>Great news! Your order has been marked as <strong>completed</strong> by the service provider. Thank you for using GoZipMarket!</p>`
      : `<p>Your order has been <strong>cancelled</strong> by the service provider. If you have questions, please contact support.</p>`,
    provider: isCompleted
      ? `<p>You have marked order <strong>#${displayId}</strong> as <strong>completed</strong>. Thank you for providing great service!</p>`
      : `<p>You have <strong>cancelled</strong> order <strong>#${displayId}</strong>. The customer has been notified.</p>`,
    admin: `<p>Order <strong>#${displayId}</strong> has been updated to <strong>${statusLabel}</strong>.<br/>Customer: ${customerName} &nbsp;|&nbsp; Provider: ${providerName}</p>`,
  }[role];

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8"/>
        <style>
          body { font-family: Arial, sans-serif; color: #333; margin: 0; padding: 0; }
          .wrap { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: ${headerColor}; color: #fff; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
          .body { background: #fff; border: 1px solid #e0e0e0; border-top: none; padding: 24px; border-radius: 0 0 8px 8px; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; }
          th { background: #f5f5f5; padding: 8px; text-align: left; font-size: 12px; color: #777; }
          th:last-child, th:nth-child(3) { text-align: right; }
          th:nth-child(2) { text-align: center; }
          .total-row td { font-weight: 700; font-size: 15px; padding-top: 12px; }
          .footer { text-align: center; font-size: 11px; color: #aaa; margin-top: 24px; }
        </style>
      </head>
      <body>
        <div class="wrap">
          <div class="header">
            <h2 style="margin:0">${statusIcon} Order ${statusLabel} — GoZipMarket</h2>
          </div>
          <div class="body">
            <p>Hi ${recipientLabel},</p>
            ${roleMessage}

            <table>
              <tr><th>Order ID</th><td>#${displayId}</td></tr>
              <tr><th>Date</th><td>${formattedDate}</td></tr>
              <tr><th>Status</th><td style="color:${headerColor};font-weight:bold">${statusLabel}</td></tr>
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
                ${shippingRowStatus}
                <tr class="total-row">
                  <td colspan="3" style="padding-top:12px;text-align:right;border-top:2px solid #e0e0e0">Total:</td>
                  <td style="padding-top:12px;text-align:right;border-top:2px solid #e0e0e0;color:#4A90E2">
                    $${(totalCents / 100).toFixed(2)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div style="font-size:11px;color:#999;margin-top:16px;padding:10px;background:#fafafa;border-radius:4px;line-height:16px">
            <strong style="color:#666">Disclaimer:</strong> This transaction is directly between the service provider and the customer.
            GoZipMarket is a platform that connects buyers and service providers and is not a party to any transaction.
            GoZipMarket is not liable for any disputes, non-delivery, payment issues, or damages arising from transactions
            conducted through this platform. Please exercise due diligence before making any payment.
          </div>
          <div class="footer">© 2025 GoZipMarket — Zip Market LLC</div>
        </div>
      </body>
    </html>`;
}

/**
 * Send order status update emails to customer, provider, and admins
 */
export async function sendOrderStatusEmails({
  orderId,
  status,
  customerEmail,
  customerName,
  providerEmail,
  providerName,
  adminEmails,
  items,
  totalCents,
  orderDate,
  businessName,
  buyerTimezone,
}: OrderStatusEmailParams): Promise<void> {
  const date = orderDate || new Date().toISOString();
  const displayOrderId = String(orderId).slice(0, 8).toUpperCase();
  const subject = status === 'completed'
    ? `✅ Order #${displayOrderId} Completed — GoZipMarket`
    : `❌ Order #${displayOrderId} Cancelled — GoZipMarket`;

  const recipients: Array<{ email: string; label: string; role: 'customer' | 'provider' | 'admin' }> = [
    { email: customerEmail, label: customerName || 'Customer',          role: 'customer' },
    { email: providerEmail, label: providerName || 'Service Provider',  role: 'provider' },
    ...adminEmails.map(e => ({ email: e, label: 'Admin', role: 'admin' as const })),
  ];

  console.log(`📧 Sending order ${status} emails for #${orderId} to: ${recipients.map(r => r.email).join(', ')}`);

  await Promise.all(recipients.map(({ email, label, role }) =>
    resend.emails.send({
      from:    'GoZipMarket <noreply@gozipmarket.com>',
      replyTo: 'zipmarket333@gmail.com',
      to:      email,
      subject,
      html: buildOrderStatusHtml({
        recipientLabel: label,
        role,
        orderId,
        status,
        customerName,
        providerName,
        items,
        totalCents,
        orderDate: date,
        businessName,
        buyerTimezone,
      }),
    })
    .then(() => console.log(`✅ Order ${status} email sent to ${email}`))
    .catch(err  => console.error(`❌ Failed to send order ${status} email to ${email}:`, err)),
  ));
}

// ============================================================================
// ORDER PLACEMENT EMAILS (to Customer, Provider, and Admin)
// ============================================================================

interface OrderShippingAddress {
  fullName?: string;
  phone?: string;
  street?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  notes?: string;
}

interface OrderPlacementEmailParams {
  orderId: string | number;
  customerEmail: string;
  customerName: string;
  providerEmail: string;
  providerName: string;
  adminEmails: string[];
  items: any[];
  totalCents: number;
  orderDate: string;
  buyerTimezone?: string;
  paymentMethods?: string[];
  paymentInfos?: Record<string, string>;
  shippingAddress?: OrderShippingAddress | null;
}

// Renders the buyer's shipping address + phone as an HTML block, or '' when there's
// none (e.g. pickup orders never collect one).
function renderShippingAddressBlock(address?: OrderShippingAddress | null): string {
  if (!address || !address.street) return '';
  return `
    <h3 style="margin-top:20px">📦 Shipping Address</h3>
    <table>
      ${address.fullName ? `<tr><th>Name</th><td>${address.fullName}</td></tr>` : ''}
      ${address.phone ? `<tr><th>Phone</th><td>${address.phone}</td></tr>` : ''}
      <tr><th>Address</th><td>${address.street}, ${address.city || ''}, ${address.state || ''} ${address.zipCode || ''}</td></tr>
      ${address.notes ? `<tr><th>Notes</th><td>${address.notes}</td></tr>` : ''}
    </table>`;
}

function buildProviderPlacementHtml(params: {
  providerName: string;
  customerName: string;
  orderId: string | number;
  items: any[];
  totalCents: number;
  orderDate: string;
  buyerTimezone?: string;
  paymentMethods?: string[];
  paymentInfos?: Record<string, string>;
  shippingAddress?: OrderShippingAddress | null;
}): string {
  const { providerName, customerName, orderId, items, totalCents, orderDate, buyerTimezone, paymentMethods, paymentInfos, shippingAddress } = params;
  const displayId = String(orderId).slice(0, 8).toUpperCase();
  const formattedDate = new Date(orderDate).toLocaleString('en-US', {
    timeZone: buyerTimezone || 'UTC',
    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  const itemsSubtotal = (items || []).reduce((sum: number, item: any) => {
    const u = item.photo_price != null ? Number(item.photo_price) : Number(item.price || 0);
    return sum + u * (item.quantity ?? 1);
  }, 0);
  const totalDollars = totalCents / 100;
  const shippingFee = Math.round((totalDollars - itemsSubtotal) * 100) / 100;

  const itemRows = (items || []).map((item: any) => {
    const unitPrice = item.photo_price != null ? item.photo_price : (item.price || 0);
    const qty = item.quantity ?? 1;
    const amount = unitPrice * qty;
    const itemId = `#P${item.post_id}-${(item.photo_index ?? 0) + 1}`;
    const thumbHtml = item.photo_url
      ? `<img src="${item.photo_url}" width="40" height="40" style="border-radius:5px;display:block;margin-bottom:3px;object-fit:cover;" alt="${item.title || 'item'}" />`
      : '';
    return `
      <tr>
        <td style="padding:8px;border-bottom:1px solid #f0f0f0;vertical-align:top">
          ${thumbHtml}
          <span style="display:block;font-size:13px;font-weight:700">${item.title || '—'}</span>
          <span style="display:block;font-size:11px;color:#888;font-weight:600;margin-top:2px">${itemId}</span>
        </td>
        <td style="padding:8px;border-bottom:1px solid #f0f0f0;text-align:center;vertical-align:top">${qty}</td>
        <td style="padding:8px;border-bottom:1px solid #f0f0f0;text-align:right;vertical-align:top">${unitPrice > 0 ? `$${Number(unitPrice).toFixed(2)}` : 'Free'}</td>
        <td style="padding:8px;border-bottom:1px solid #f0f0f0;text-align:right;vertical-align:top">${amount > 0 ? `$${amount.toFixed(2)}` : 'Free'}</td>
      </tr>`;
  }).join('');

  const shippingRow = shippingFee > 0
    ? `<tr>
        <td style="padding:8px;border-bottom:1px solid #f0f0f0" colspan="3">Shipping &amp; Handling</td>
        <td style="padding:8px;border-bottom:1px solid #f0f0f0;text-align:right">$${shippingFee.toFixed(2)}</td>
       </tr>`
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
          .warning-box { background: #FFF8E1; border-left: 4px solid #FFA000; border-radius: 4px; padding: 14px 16px; margin: 20px 0; }
          .total-row td { font-weight: 700; font-size: 15px; padding-top: 12px; }
          .footer { text-align: center; font-size: 11px; color: #aaa; margin-top: 24px; }
        </style>
      </head>
      <body>
        <div class="wrap">
          <div class="header">
            <h2 style="margin:0">🛒 New Order Request — GoZipMarket</h2>
          </div>
          <div class="body">
            <p>Hi ${providerName},</p>
            <p>You've received a new order request from <strong>${customerName}</strong>.</p>

            <table>
              <tr><th>Order ID</th><td>#${displayId}</td></tr>
              <tr><th>Date / Time</th><td>${formattedDate}</td></tr>
            </table>

            <h3 style="margin-top:20px">🧾 Order Details</h3>
            <table>
              <thead>
                <tr>
                  <th>Item</th><th style="text-align:center">Qty</th>
                  <th style="text-align:right">Price</th><th style="text-align:right">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${itemRows}
                ${shippingRow}
                <tr class="total-row">
                  <td colspan="3" style="padding-top:12px;text-align:right;border-top:2px solid #e0e0e0">Total:</td>
                  <td style="padding-top:12px;text-align:right;border-top:2px solid #e0e0e0;color:#4A90E2">
                    ${totalCents > 0 ? `$${(totalCents / 100).toFixed(2)}` : 'Free'}
                  </td>
                </tr>
              </tbody>
            </table>

            ${renderShippingAddressBlock(shippingAddress)}

            ${totalCents > 0 ? `
            <div class="warning-box">
              <strong>⚠️ Status: Awaiting Payment</strong><br/>
              The customer has not completed payment yet.<br/><br/>
              ${(paymentMethods && paymentMethods.length > 0)
                ? (() => {
                    const LABELS: Record<string, string> = { zelle: 'Zelle', venmo: 'Venmo', paypal: 'PayPal', cashapp: 'Cash App', cash: 'Cash', check: 'Check' };
                    const lines = paymentMethods.map((m: string) => {
                      const label = LABELS[m] || m;
                      const info = paymentInfos ? paymentInfos[m] : undefined;
                      return info ? `&nbsp;&bull;&nbsp;<strong>${label}:</strong> ${info}` : `&nbsp;&bull;&nbsp;${label}`;
                    }).join('<br/>');
                    return `<strong>Payment Method${paymentMethods.length > 1 ? 's' : ''} Selected by Buyer:</strong><br/>${lines}<br/><br/>`;
                  })()
                : ''}
              Please do not start the service until the payment is confirmed. You will receive another notification once the payment is completed.
            </div>
            ` : ''}

            <p>In the meantime, you can connect with the customer to coordinate details if needed.</p>

            <p>Thanks,<br/><strong>Team GoZipMarket</strong></p>

            <div style="font-size:11px;color:#999;margin-top:16px;padding:10px;background:#fafafa;border-radius:4px;line-height:16px">
              <strong style="color:#666">Disclaimer:</strong> This transaction is directly between the service provider and the customer.
              GoZipMarket is a platform that connects buyers and service providers and is not a party to any transaction.
              GoZipMarket is not liable for any disputes, non-delivery, payment issues, or damages arising from transactions
              conducted through this platform. Please exercise due diligence before making any payment.
            </div>
          </div>
          <div class="footer">© 2025 GoZipMarket — Zip Market LLC</div>
        </div>
      </body>
    </html>`;
}

function buildCustomerPlacementHtml(params: {
  customerName: string;
  providerName: string;
  orderId: string | number;
  items: any[];
  totalCents: number;
  orderDate: string;
  buyerTimezone?: string;
  paymentMethods?: string[];
  paymentInfos?: Record<string, string>;
  shippingAddress?: OrderShippingAddress | null;
}): string {
  const { customerName, providerName, orderId, items, totalCents, orderDate, buyerTimezone, paymentMethods, paymentInfos, shippingAddress } = params;
  const displayId = String(orderId).slice(0, 8).toUpperCase();
  const formattedDate = new Date(orderDate).toLocaleString('en-US', {
    timeZone: buyerTimezone || 'UTC',
    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  const itemsSubtotal2 = (items || []).reduce((sum: number, item: any) => {
    const u = item.photo_price != null ? Number(item.photo_price) : Number(item.price || 0);
    return sum + u * (item.quantity ?? 1);
  }, 0);
  const totalDollars2 = totalCents / 100;
  const shippingFee2 = Math.round((totalDollars2 - itemsSubtotal2) * 100) / 100;

  const itemRows = (items || []).map((item: any) => {
    const unitPrice = item.photo_price != null ? item.photo_price : (item.price || 0);
    const qty = item.quantity ?? 1;
    const amount = unitPrice * qty;
    const itemId = `#P${item.post_id}-${(item.photo_index ?? 0) + 1}`;
    const thumbHtml = item.photo_url
      ? `<img src="${item.photo_url}" width="40" height="40" style="border-radius:5px;display:block;margin-bottom:3px;object-fit:cover;" alt="${item.title || 'item'}" />`
      : '';
    return `
      <tr>
        <td style="padding:8px;border-bottom:1px solid #f0f0f0;vertical-align:top">
          ${thumbHtml}
          <span style="display:block;font-size:13px;font-weight:700">${item.title || '—'}</span>
          <span style="display:block;font-size:11px;color:#888;font-weight:600;margin-top:2px">${itemId}</span>
        </td>
        <td style="padding:8px;border-bottom:1px solid #f0f0f0;text-align:center;vertical-align:top">${qty}</td>
        <td style="padding:8px;border-bottom:1px solid #f0f0f0;text-align:right;vertical-align:top">${unitPrice > 0 ? `$${Number(unitPrice).toFixed(2)}` : 'Free'}</td>
        <td style="padding:8px;border-bottom:1px solid #f0f0f0;text-align:right;vertical-align:top">${amount > 0 ? `$${amount.toFixed(2)}` : 'Free'}</td>
      </tr>`;
  }).join('');

  const shippingRow2 = shippingFee2 > 0
    ? `<tr>
        <td style="padding:8px;border-bottom:1px solid #f0f0f0" colspan="3">Shipping &amp; Handling</td>
        <td style="padding:8px;border-bottom:1px solid #f0f0f0;text-align:right">$${shippingFee2.toFixed(2)}</td>
       </tr>`
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
          .next-step-box { background: #E8F5E9; border-left: 4px solid #4CAF50; border-radius: 4px; padding: 14px 16px; margin: 20px 0; }
          .total-row td { font-weight: 700; font-size: 15px; padding-top: 12px; }
          .footer { text-align: center; font-size: 11px; color: #aaa; margin-top: 24px; }
        </style>
      </head>
      <body>
        <div class="wrap">
          <div class="header">
            <h2 style="margin:0">✅ Order Placed — GoZipMarket</h2>
          </div>
          <div class="body">
            <p>Hi ${customerName},</p>
            <p>Your order with <strong>${providerName}</strong> has been successfully placed and is currently awaiting payment.</p>

            <table>
              <tr><th>Order ID</th><td>#${displayId}</td></tr>
              <tr><th>Date / Time</th><td>${formattedDate}</td></tr>
            </table>

            <h3 style="margin-top:20px">🧾 Order Summary</h3>
            <table>
              <thead>
                <tr>
                  <th>Item</th><th style="text-align:center">Qty</th>
                  <th style="text-align:right">Price</th><th style="text-align:right">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${itemRows}
                ${shippingRow2}
                <tr class="total-row">
                  <td colspan="3" style="padding-top:12px;text-align:right;border-top:2px solid #e0e0e0">Total:</td>
                  <td style="padding-top:12px;text-align:right;border-top:2px solid #e0e0e0;color:#4A90E2">
                    ${totalCents > 0 ? `$${(totalCents / 100).toFixed(2)}` : 'Free'}
                  </td>
                </tr>
              </tbody>
            </table>

            ${renderShippingAddressBlock(shippingAddress)}

            ${totalCents > 0 ? `
            <div class="next-step-box">
              <strong>⏳ Next Step — Action Required Within 24 Hours</strong><br/>
              Please complete your payment to confirm this order. The service provider will begin processing only after payment is received.<br/><br/>
              ${(paymentMethods && paymentMethods.length > 0 && paymentInfos)
                ? `<strong>Payment Method${paymentMethods.length > 1 ? 's' : ''}:</strong><br/>
                  ${paymentMethods.map((m: string) => {
                    const LABELS: Record<string, string> = { zelle: 'Zelle', venmo: 'Venmo', paypal: 'PayPal', cashapp: 'Cash App', cash: 'Cash', check: 'Check' };
                    const label = LABELS[m] || m;
                    const info = paymentInfos[m];
                    return info ? `&nbsp;&bull;&nbsp;<strong>${label}:</strong> ${info}` : `&nbsp;&bull;&nbsp;${label}`;
                  }).join('<br/>')}<br/><br/>`
                : ''}
              <span style="color:#E65100;font-weight:700;">⚠️ Important:</span> If payment is not completed within <strong>24 hours</strong> of placing this order, it will be <strong>automatically cancelled</strong> and the items will be released back for others to purchase.
            </div>
            ` : ''}

            <p>If you have any questions, feel free to message the provider directly through the app.</p>

            <p>Thanks,<br/><strong>Team GoZipMarket</strong></p>

            <div style="font-size:11px;color:#999;margin-top:16px;padding:10px;background:#fafafa;border-radius:4px;line-height:16px">
              <strong style="color:#666">Disclaimer:</strong> This transaction is directly between the service provider and the customer.
              GoZipMarket is a platform that connects buyers and service providers and is not a party to any transaction.
              GoZipMarket is not liable for any disputes, non-delivery, payment issues, or damages arising from transactions
              conducted through this platform. Please exercise due diligence before making any payment.
            </div>
          </div>
          <div class="footer">© 2025 GoZipMarket — Zip Market LLC</div>
        </div>
      </body>
    </html>`;
}

function buildAdminPlacementHtml(params: {
  customerName: string;
  providerName: string;
  orderId: string | number;
  items: any[];
  totalCents: number;
  orderDate: string;
  buyerTimezone?: string;
}): string {
  const { customerName, providerName, orderId, items, totalCents, orderDate, buyerTimezone } = params;
  const displayId = String(orderId).slice(0, 8).toUpperCase();
  const formattedDate = new Date(orderDate).toLocaleString('en-US', {
    timeZone: buyerTimezone || 'UTC',
    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  const itemsSubtotal = (items || []).reduce((sum: number, item: any) => {
    const u = item.photo_price != null ? Number(item.photo_price) : Number(item.price || 0);
    return sum + u * (item.quantity ?? 1);
  }, 0);
  const totalDollars = totalCents / 100;
  const shippingFee = Math.round((totalDollars - itemsSubtotal) * 100) / 100;

  const itemRows = (items || []).map((item: any) => {
    const unitPrice = item.photo_price != null ? item.photo_price : (item.price || 0);
    const qty = item.quantity ?? 1;
    const amount = unitPrice * qty;
    const itemId = `#P${item.post_id}-${(item.photo_index ?? 0) + 1}`;
    const thumbHtml = item.photo_url
      ? `<img src="${item.photo_url}" width="40" height="40" style="border-radius:5px;display:block;margin-bottom:3px;object-fit:cover;" alt="${item.title || 'item'}" />`
      : '';
    return `
      <tr>
        <td style="padding:8px;border-bottom:1px solid #f0f0f0;vertical-align:top">
          ${thumbHtml}
          <span style="display:block;font-size:13px;font-weight:700">${item.title || '—'}</span>
          <span style="display:block;font-size:11px;color:#888;font-weight:600;margin-top:2px">${itemId}</span>
        </td>
        <td style="padding:8px;border-bottom:1px solid #f0f0f0;text-align:center;vertical-align:top">${qty}</td>
        <td style="padding:8px;border-bottom:1px solid #f0f0f0;text-align:right;vertical-align:top">${unitPrice > 0 ? `$${Number(unitPrice).toFixed(2)}` : 'Free'}</td>
        <td style="padding:8px;border-bottom:1px solid #f0f0f0;text-align:right;vertical-align:top">${amount > 0 ? `$${amount.toFixed(2)}` : 'Free'}</td>
      </tr>`;
  }).join('');

  const shippingRow = shippingFee > 0
    ? `<tr>
        <td style="padding:8px;border-bottom:1px solid #f0f0f0" colspan="3">Shipping &amp; Handling</td>
        <td style="padding:8px;border-bottom:1px solid #f0f0f0;text-align:right">$${shippingFee.toFixed(2)}</td>
       </tr>`
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
        </style>
      </head>
      <body>
        <div class="wrap">
          <div class="header">
            <h2 style="margin:0">🛒 New Order Placed — Admin Notification</h2>
          </div>
          <div class="body">
            <p>Hi Admin,</p>
            <p>A new order has been placed on GoZipMarket.</p>

            <table>
              <tr><th>Order ID</th><td>#${displayId}</td></tr>
              <tr><th>Date / Time</th><td>${formattedDate}</td></tr>
              <tr><th>Customer</th><td>${customerName}</td></tr>
              <tr><th>Provider</th><td>${providerName}</td></tr>
              <tr><th>Status</th><td style="color:#FFA000;font-weight:bold">Awaiting Payment</td></tr>
            </table>

            <h3 style="margin-top:20px">🧾 Order Summary</h3>
            <table>
              <thead>
                <tr>
                  <th>Item</th><th style="text-align:center">Qty</th>
                  <th style="text-align:right">Price</th><th style="text-align:right">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${itemRows}
                ${shippingRow}
                <tr class="total-row">
                  <td colspan="3" style="padding-top:12px;text-align:right;border-top:2px solid #e0e0e0">Total:</td>
                  <td style="padding-top:12px;text-align:right;border-top:2px solid #e0e0e0;color:#4A90E2">
                    ${totalCents > 0 ? `$${(totalCents / 100).toFixed(2)}` : 'Free'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="footer">© 2025 GoZipMarket — Zip Market LLC</div>
        </div>
      </body>
    </html>`;
}

/**
 * Send order placement emails to provider, customer, and admins
 * Called immediately when the customer clicks "Confirm Order"
 */
export async function sendOrderPlacementEmails({
  orderId,
  customerEmail,
  customerName,
  providerEmail,
  providerName,
  adminEmails,
  items,
  totalCents,
  orderDate,
  buyerTimezone,
  paymentMethods,
  paymentInfos,
  shippingAddress,
}: OrderPlacementEmailParams): Promise<void> {
  const displayId = String(orderId).slice(0, 8).toUpperCase();
  const date = orderDate || new Date().toISOString();

  const jobs: Promise<void>[] = [
    resend.emails.send({
      from:    'GoZipMarket <noreply@gozipmarket.com>',
      replyTo: 'zipmarket333@gmail.com',
      to:      providerEmail,
      subject: `New Order Request #${displayId} — GoZipMarket`,
      html:    buildProviderPlacementHtml({ providerName, customerName, orderId, items, totalCents, orderDate: date, buyerTimezone, paymentMethods, paymentInfos, shippingAddress }),
    }).then(() => console.log(`✅ Order placement email sent to provider ${providerEmail}`))
      .catch(err => console.error(`❌ Failed to send placement email to provider ${providerEmail}:`, err)),

    resend.emails.send({
      from:    'GoZipMarket <noreply@gozipmarket.com>',
      replyTo: 'zipmarket333@gmail.com',
      to:      customerEmail,
      subject: `Order Placed #${displayId} — GoZipMarket`,
      html:    buildCustomerPlacementHtml({ customerName, providerName, orderId, items, totalCents, orderDate: date, buyerTimezone, paymentMethods, paymentInfos, shippingAddress }),
    }).then(() => console.log(`✅ Order placement email sent to customer ${customerEmail}`))
      .catch(err => console.error(`❌ Failed to send placement email to customer ${customerEmail}:`, err)),

    ...adminEmails.map(email =>
      resend.emails.send({
        from:    'GoZipMarket <noreply@gozipmarket.com>',
        replyTo: 'zipmarket333@gmail.com',
        to:      email,
        subject: `New Order #${displayId} — Admin Notification`,
        html:    buildAdminPlacementHtml({ customerName, providerName, orderId, items, totalCents, orderDate: date, buyerTimezone }),
      }).then(() => console.log(`✅ Order placement email sent to admin ${email}`))
        .catch(err => console.error(`❌ Failed to send placement email to admin ${email}:`, err))
    ),
  ];

  await Promise.all(jobs);
}

// ============================================================================
// CATEGORY REQUEST NOTIFICATION EMAIL (to Admin)
// ============================================================================

interface CategoryRequestNotificationParams {
  adminEmail: string;
  userName: string;
  userEmail: string;
  categoryName: string;
  requestId: number;
  justification?: string;
}

/**
 * Send new category request notification to admin
 */
export async function sendCategoryRequestNotification({
  adminEmail,
  userName,
  userEmail,
  categoryName,
  requestId,
  justification
}: CategoryRequestNotificationParams) {
  try {
    console.log('📧 Sending category request notification to admin:', adminEmail);

    const emailResult = await resend.emails.send({
  // To:
from: 'GoZipMarket <noreply@gozipmarket.com>',  // ← USE THIS
replyTo: 'zipmarket333@gmail.com',
  to: adminEmail,
subject: `New Category Request: ${categoryName} - Admin Review Needed`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background-color: #9C27B0; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
              .request-details { background-color: #f3e5f5; border-left: 4px solid #9C27B0; padding: 15px; margin: 20px 0; }
              .detail-row { margin: 10px 0; }
              .label { font-weight: bold; color: #555; }
              .value { color: #333; }
              .justification-box { background-color: #e3f2fd; border-left: 4px solid #2196F3; padding: 15px; margin: 20px 0; }
              .action-button { display: inline-block; background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 5px; }
              .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>📋 New Category Request</h1>
              </div>
              <div class="content">
                <p>Hi Admin,</p>
                
                <p>A new service category has been requested and requires your review.</p>
                
                <div class="request-details">
                  <div class="detail-row">
                    <span class="label">Requested Category:</span>
                    <span class="value" style="font-size: 18px; font-weight: bold; color: #9C27B0;">${categoryName}</span>
                  </div>
                  <div class="detail-row">
                    <span class="label">Requested By:</span>
                    <span class="value">${userName}</span>
                  </div>
                  <div class="detail-row">
                    <span class="label">User Email:</span>
                    <span class="value">${userEmail}</span>
                  </div>
                  <div class="detail-row">
                    <span class="label">Request ID:</span>
                    <span class="value">#${requestId}</span>
                  </div>
                </div>
                
                ${justification ? `
                  <div class="justification-box">
                    <p><strong>Justification:</strong></p>
                    <p>${justification}</p>
                  </div>
                ` : ''}
                
                <p><strong>Next Steps:</strong></p>
                <ul>
                  <li>Log in to your admin account</li>
                  <li>Review the category request details</li>
                  <li>Check if a similar category already exists</li>
                  <li>Approve or reject the request with notes</li>
                </ul>
                
                <p style="text-align: center; margin-top: 30px;">
                  <strong>Please review this request at your earliest convenience.</strong>
                </p>
                
                <p>Best regards,<br><strong>The GoZipMarket Team</strong></p>
              </div>
              <div class="footer">
                <p>© 2025 GoZipMarket - Zip Market LLC</p>
                <p>This is an automated notification, please do not reply to this email.</p>
              </div>
            </div>
          </body>
        </html>
      `
    });

    console.log('✅ Admin notification sent:', emailResult);

    return {
      success: true,
      messageId: emailResult.data?.id
    };

  } catch (error) {
    console.error('❌ Error sending admin notification:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// ============================================================================
// [2026-07-14] ADMIN ALERT — fires when a critical server-side failure occurs
// (photo upload failed, post silently deleted, client-reported error, etc.)
// Destination: fetched from users table (is_admin=true), falls back to ADMIN_EMAIL env var
// ============================================================================
export async function sendAdminAlert(subject: string, body: string): Promise<void> {
  const { data: adminUsers } = await supabase
    .from('users').select('email').eq('is_admin', true).limit(1);
  const to = adminUsers?.[0]?.email || process.env.ADMIN_EMAIL;
  if (!to) { console.error('❌ No admin email found for alert:', subject); return; }
  try {
    await resend.emails.send({
      from: 'GoZipMarket <noreply@gozipmarket.com>',
      to,
      subject: `⚠️ GoZipMarket Alert: ${subject}`,
      html: `<pre style="font-family:monospace;font-size:13px;white-space:pre-wrap">${body}</pre>`,
    });
    console.log(`📧 Admin alert sent: ${subject}`);
  } catch (err) {
    console.error('❌ Failed to send admin alert:', err);
  }
}

// ============================================================================
// NEW SERVICE POST NOTIFICATION
// ============================================================================

interface NewPostNotificationParams {
  adminEmail: string;
  posterName: string;
  posterEmail: string;
  postTitle: string;
  postCategory: string;
  postType: string;
  price?: string;
  zipCode?: string;
  city?: string;
  state?: string;
  postId: number;
}

export async function sendNewPostNotification({
  adminEmail,
  posterName,
  posterEmail,
  postTitle,
  postCategory,
  postType,
  price,
  zipCode,
  city,
  state,
  postId,
}: NewPostNotificationParams) {
  try {
    const location = [city, state, zipCode].filter(Boolean).join(', ') || 'N/A';
    const typeLabel = postType === 'offer' ? 'Service Offer' : 'Service Request';

    await resend.emails.send({
      from: 'GoZipMarket <noreply@gozipmarket.com>',
      replyTo: 'zipmarket333@gmail.com',
      to: adminEmail,
      subject: `New Post: ${postTitle} — ${postCategory}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background-color: #4A90E2; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
              .details { background-color: #EEF4FF; border-left: 4px solid #4A90E2; padding: 15px; margin: 20px 0; border-radius: 0 6px 6px 0; }
              .row { display: flex; margin: 8px 0; }
              .label { font-weight: bold; color: #555; min-width: 130px; }
              .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>📢 New Service Post</h1>
              </div>
              <div class="content">
                <p>Hi Admin,</p>
                <p>A new service post has just been published on GoZipMarket.</p>
                <div class="details">
                  <div class="row"><span class="label">Post ID:</span> #${postId}</div>
                  <div class="row"><span class="label">Title:</span> ${postTitle}</div>
                  <div class="row"><span class="label">Category:</span> ${postCategory}</div>
                  <div class="row"><span class="label">Type:</span> ${typeLabel}</div>
                  <div class="row"><span class="label">Price:</span> ${price || 'Not specified'}</div>
                  <div class="row"><span class="label">Location:</span> ${location}</div>
                  <div class="row"><span class="label">Posted by:</span> ${posterName}</div>
                  <div class="row"><span class="label">Email:</span> ${posterEmail}</div>
                </div>
                <p>Best regards,<br><strong>The GoZipMarket Team</strong></p>
              </div>
              <div class="footer">
                <p>© 2025 GoZipMarket - Zip Market LLC</p>
                <p>This is an automated notification, please do not reply to this email.</p>
              </div>
            </div>
          </body>
        </html>
      `
    });

    console.log(`✅ New post notification sent to admin for post #${postId}`);
  } catch (error) {
    console.error('❌ Failed to send new post notification to admin:', error);
  }
}