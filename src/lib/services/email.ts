import nodemailer from "nodemailer";

/**
 * Avencia Email Delivery Service
 * Supports Gmail SMTP (and any standard SMTP server) using Node.js Nodemailer.
 */

const SMTP_HOST = process.env.SMTP_HOST || "smtp.gmail.com";
const SMTP_PORT = parseInt(process.env.SMTP_PORT || "465", 10);
const SMTP_USER = process.env.SMTP_USER || "";
const SMTP_PASS = process.env.SMTP_PASS || "";
const SMTP_FROM = process.env.SMTP_FROM || (SMTP_USER ? `Avencia Perfumes <${SMTP_USER}>` : "Avencia Perfumes <no-reply@avencialuxury.com>");

function getTransporter() {
  if (!SMTP_USER || !SMTP_PASS) {
    return null;
  }

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465, // true for 465 (SSL), false for 587 (STARTTLS)
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });
}

export interface SendWorkerInvitationOptions {
  to: string;
  workerName: string;
  inviteUrl: string;
  expiresAt: Date | string;
}

export async function sendWorkerInvitationEmail(options: SendWorkerInvitationOptions): Promise<{
  sent: boolean;
  error?: string;
}> {
  const transporter = getTransporter();

  if (!transporter) {
    console.warn("[Email Service] SMTP credentials not configured in .env. Invitation email was skipped.");
    return { sent: false, error: "SMTP credentials not configured in environment" };
  }

  const expirationFormatted = new Date(options.expiresAt).toLocaleDateString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0D0D0D; color: #FFFFFF; margin: 0; padding: 24px; }
          .container { max-width: 520px; margin: 0 auto; background-color: #151515; border: 1px solid #2A2A2A; border-radius: 16px; padding: 32px; }
          .header { text-align: center; margin-bottom: 24px; }
          .title { font-size: 20px; font-weight: 700; color: #D4AF37; margin-top: 8px; margin-bottom: 4px; }
          .subtitle { font-size: 12px; color: #888888; text-transform: uppercase; letter-spacing: 1px; }
          .content { font-size: 14px; line-height: 1.6; color: #CCCCCC; margin-bottom: 28px; }
          .button-wrap { text-align: center; margin: 28px 0; }
          .button { display: inline-block; background: linear-gradient(135deg, #D4AF37, #AA820A); color: #000000; font-weight: 700; font-size: 14px; text-decoration: none; padding: 12px 28px; border-radius: 8px; box-shadow: 0 4px 14px rgba(212, 175, 55, 0.25); }
          .footer { font-size: 11px; color: #666666; text-align: center; border-top: 1px solid #222222; padding-top: 20px; margin-top: 24px; }
          .link-box { word-break: break-all; font-family: monospace; font-size: 11px; background-color: #000000; padding: 10px; border-radius: 6px; border: 1px solid #262626; color: #AAAAAA; margin-top: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="title">AVENCIA PERFUMES</div>
            <div class="subtitle">Mobile Sales POS System</div>
          </div>
          <div class="content">
            <p>Hello <strong>${options.workerName}</strong>,</p>
            <p>You have been invited to join the Avencia Perfumes sales team as a mobile worker. You can now use our mobile application to record sales, register customer purchases, and collect payments.</p>
            <p>Click the secure link below to accept the invitation and choose your password:</p>
            
            <div class="button-wrap">
              <a href="${options.inviteUrl}" class="button">Activate Worker Account</a>
            </div>

            <p style="font-size: 12px; color: #888888;">This invitation is single-use and will expire on <strong>${expirationFormatted}</strong> (24 hours).</p>

            <p style="font-size: 12px; color: #888888;">If the button above does not work, copy and paste this link into your browser:</p>
            <div class="link-box">${options.inviteUrl}</div>
          </div>
          <div class="footer">
            &copy; ${new Date().getFullYear()} Avencia Perfumes. All rights reserved.<br>
            Protected by Avencia Role-Based Access Control.
          </div>
        </div>
      </body>
    </html>
  `;

  try {
    await transporter.sendMail({
      from: SMTP_FROM,
      to: options.to,
      subject: "You're invited to join Avencia Perfumes",
      html,
    });
    console.log(`[Email Service] Invitation email successfully dispatched to ${options.to}`);
    return { sent: true };
  } catch (err: any) {
    console.error(`[Email Service] Failed to send email to ${options.to}:`, err.message);
    return { sent: false, error: err.message };
  }
}

export interface SendPasswordResetOptions {
  to: string;
  resetUrl: string;
  expiresAt: Date | string;
}

export async function sendPasswordResetEmail(options: SendPasswordResetOptions): Promise<{
  sent: boolean;
  error?: string;
}> {
  const transporter = getTransporter();

  if (!transporter) {
    console.warn("[Email Service] SMTP credentials not configured in .env. Reset email was skipped.");
    return { sent: false, error: "SMTP credentials not configured" };
  }

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0D0D0D; color: #FFFFFF; margin: 0; padding: 24px; }
          .container { max-width: 520px; margin: 0 auto; background-color: #151515; border: 1px solid #2A2A2A; border-radius: 16px; padding: 32px; }
          .header { text-align: center; margin-bottom: 24px; }
          .title { font-size: 20px; font-weight: 700; color: #D4AF37; margin-top: 8px; margin-bottom: 4px; }
          .subtitle { font-size: 12px; color: #888888; text-transform: uppercase; letter-spacing: 1px; }
          .content { font-size: 14px; line-height: 1.6; color: #CCCCCC; margin-bottom: 28px; }
          .button-wrap { text-align: center; margin: 28px 0; }
          .button { display: inline-block; background: linear-gradient(135deg, #D4AF37, #AA820A); color: #000000; font-weight: 700; font-size: 14px; text-decoration: none; padding: 12px 28px; border-radius: 8px; }
          .footer { font-size: 11px; color: #666666; text-align: center; border-top: 1px solid #222222; padding-top: 20px; margin-top: 24px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="title">AVENCIA PERFUMES</div>
            <div class="subtitle">Password Reset Request</div>
          </div>
          <div class="content">
            <p>Hello,</p>
            <p>A password reset request was received for your Avencia account. Click the button below to choose a new password:</p>
            
            <div class="button-wrap">
              <a href="${options.resetUrl}" class="button">Reset Password</a>
            </div>

            <p style="font-size: 12px; color: #888888;">If you did not make this request, you can safely ignore this email.</p>
          </div>
          <div class="footer">
            &copy; ${new Date().getFullYear()} Avencia Perfumes.
          </div>
        </div>
      </body>
    </html>
  `;

  try {
    await transporter.sendMail({
      from: SMTP_FROM,
      to: options.to,
      subject: "Reset your Avencia password",
      html,
    });
    return { sent: true };
  } catch (err: any) {
    console.error(`[Email Service] Failed to send password reset email to ${options.to}:`, err.message);
    return { sent: false, error: err.message };
  }
}
