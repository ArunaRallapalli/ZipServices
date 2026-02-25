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
from: 'ZipService <noreply@gozipmarket.com>',  // ← USE THIS
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
                  <li>Log in to your ZipService account</li>
                  <li>Review the booking details</li>
                  <li>Confirm or decline the booking</li>
                  <li>Contact the customer if needed</li>
                </ul>
                
                <p>Please respond to this booking request as soon as possible to provide the best customer experience.</p>
                
                <p>Best regards,<br><strong>The ZipService Team</strong></p>
              </div>
              <div class="footer">
                <p>© 2025 ZipService - Zip Market LLC</p>
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
      from: 'ZipService <noreply@gozipmarket.com>',
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
                
                <p>Thank you for using ZipService!</p>
                
                <p>Best regards,<br><strong>The ZipService Team</strong></p>
              </div>
              <div class="footer">
                <p>© 2025 ZipService - Zip Market LLC</p>
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
      from: 'ZipService <noreply@gozipmarket.com>',
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
                    <li>Log in to your ZipService account</li>
                    <li>Go to your Messages</li>
                    <li>Click "Leave Review" in the completion message</li>
                  </ul>
                  
                  <p>Thank you for using ZipService!</p>
                `}
                
                <p>Best regards,<br><strong>The ZipService Team</strong></p>
              </div>
              <div class="footer">
                <p>© 2025 ZipService - Zip Market LLC</p>
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
from: 'ZipService <noreply@gozipmarket.com>',  // ← USE THIS
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
                
                <p>Best regards,<br><strong>ZipService System</strong></p>
              </div>
              <div class="footer">
                <p>© 2025 ZipService - Zip Market LLC</p>
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