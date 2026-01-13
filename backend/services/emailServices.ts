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
      from: 'ZipService <noreply@gozipmarket.com>',
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