/**
 * Email Service
 * 
 * Handles all email notifications using Resend
 * Reuses existing email configuration from email verification
 */

import { Resend } from 'resend';
import dotenv from 'dotenv';

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
replyTo: 'support@gozipmarket.com',
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
}): string {
  const { recipientLabel, role, orderId, status, customerName, providerName, items, totalCents, orderDate, businessName } = params;

  const displayId = String(orderId).slice(0, 8).toUpperCase();
  const isCompleted = status === 'completed';
  const headerColor = isCompleted ? '#4CAF50' : '#F44336';
  const statusIcon = isCompleted ? '✅' : '❌';
  const statusLabel = isCompleted ? 'Completed' : 'Cancelled';

  const formattedDate = new Date(orderDate).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  const itemRows = (items || []).map((item: any) => {
    const unitPrice = item.photo_price || item.price || 0;
    const qty = item.quantity ?? 1;
    const amount = unitPrice * qty;
    return `
      <tr>
        <td style="padding:8px;border-bottom:1px solid #f0f0f0">${item.title || '—'}</td>
        <td style="padding:8px;border-bottom:1px solid #f0f0f0;text-align:center">${qty}</td>
        <td style="padding:8px;border-bottom:1px solid #f0f0f0;text-align:right">${unitPrice > 0 ? `$${unitPrice.toFixed(2)}` : '—'}</td>
        <td style="padding:8px;border-bottom:1px solid #f0f0f0;text-align:right">${amount > 0 ? `$${amount.toFixed(2)}` : '—'}</td>
      </tr>`;
  }).join('');

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
                <tr class="total-row">
                  <td colspan="3" style="padding-top:12px;text-align:right;border-top:2px solid #e0e0e0">Total:</td>
                  <td style="padding-top:12px;text-align:right;border-top:2px solid #e0e0e0;color:#4A90E2">
                    $${(totalCents / 100).toFixed(2)}
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
      replyTo: 'support@gozipmarket.com',
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
      }),
    })
    .then(() => console.log(`✅ Order ${status} email sent to ${email}`))
    .catch(err  => console.error(`❌ Failed to send order ${status} email to ${email}:`, err)),
  ));
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
replyTo: 'support@gozipmarket.com',
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