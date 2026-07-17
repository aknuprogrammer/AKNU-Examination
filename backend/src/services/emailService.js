import nodemailer from 'nodemailer';
import logger from '../utils/logger.js';

const getTransporter = () => {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    logger.warn('SMTP configuration is missing or incomplete. Emails will be logged to console instead.');
    return null;
  }

  // Gmail special auto-configuration for best compatibility
  if (host === 'smtp.gmail.com') {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass }
    });
  }

  return nodemailer.createTransport({
    host,
    port: parseInt(port),
    secure: port == 465, // true for 465, false for other ports
    auth: { user, pass }
  });
};

/**
 * Sends a welcome email to a newly registered principal
 */
export const sendWelcomeEmail = async ({ toEmail, principalName, username, password, loginUrl }) => {
  const from = process.env.EMAIL_FROM || '"AKNU Examination Cell" <noreply@aknu.edu.in>';
  const subject = 'Welcome to AKNU Examination Portal - Account Created';
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #1e3a8a;">Welcome, ${principalName}!</h2>
      <p>An administrative account has been created for your college on the AKNU Examination Portal.</p>
      <p>Please use the following credentials to access the platform:</p>
      <div style="background-color: #f8fafc; padding: 15px; border-radius: 6px; margin: 20px 0; border: 1px solid #e2e8f0;">
        <p style="margin: 5px 0;"><strong>Username / Login ID:</strong> <code style="font-size: 1.1em; color: #0f172a;">${username}</code></p>
        <p style="margin: 5px 0;"><strong>Temporary Password:</strong> <code style="font-size: 1.1em; color: #0f172a;">${password}</code></p>
      </div>
      <p>For security purposes, you will be prompted to change your password immediately upon your first login.</p>
      <div style="margin: 30px 0; text-align: center;">
        <a href="${loginUrl}" style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Access Portal & Change Password</a>
      </div>
      <p style="font-size: 0.9em; color: #64748b;">If the button above does not work, copy and paste the following link into your browser: <br/> ${loginUrl}</p>
      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 30px 0;"/>
      <p style="font-size: 0.85em; color: #94a3b8; text-align: center;">This is an automated system email. Please do not reply directly to this message.</p>
    </div>
  `;

  const textContent = `
Welcome, ${principalName}!

An administrative account has been created for your college on the AKNU Examination Portal.
Username: ${username}
Temporary Password: ${password}

Please log in and update your password here: ${loginUrl}
  `;

  const transporter = getTransporter();
  if (!transporter) {
    logger.info(`[MOCK EMAIL SENT TO: ${toEmail}]`);
    logger.info(`Subject: ${subject}`);
    logger.info(`Body: ${textContent}`);
    return true;
  }

  try {
    await transporter.sendMail({
      from,
      to: toEmail,
      subject,
      text: textContent,
      html: htmlContent
    });
    logger.info(`Welcome email successfully sent to: ${toEmail}`);
    return true;
  } catch (error) {
    logger.error(`Error sending welcome email to ${toEmail}:`, error);
    return false;
  }
};

/**
 * Sends a password reset link to a user
 */
export const sendPasswordResetEmail = async ({ toEmail, userName, resetUrl }) => {
  const from = process.env.EMAIL_FROM || '"AKNU Examination Cell" <noreply@aknu.edu.in>';
  const subject = 'AKNU Examination Portal - Password Reset Request';
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #1e3a8a;">Hello, ${userName}!</h2>
      <p>We received a request to reset your password for your AKNU Examination Portal account.</p>
      <p>Click the button below to set a new password. This reset link will expire in 1 hour:</p>
      <div style="margin: 30px 0; text-align: center;">
        <a href="${resetUrl}" style="background-color: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Reset Password</a>
      </div>
      <p style="font-size: 0.9em; color: #64748b;">If the button above does not work, copy and paste the following link into your browser: <br/> ${resetUrl}</p>
      <p>If you did not request a password reset, please ignore this email; your password will remain unchanged.</p>
      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 30px 0;"/>
      <p style="font-size: 0.85em; color: #94a3b8; text-align: center;">This is an automated system email. Please do not reply directly to this message.</p>
    </div>
  `;

  const textContent = `
Hello, ${userName}!

We received a request to reset your password for your AKNU Examination Portal account.
Please visit the following URL to set a new password (valid for 1 hour):
${resetUrl}

If you did not request this, you can safely ignore this email.
  `;

  const transporter = getTransporter();
  if (!transporter) {
    logger.info(`[MOCK RESET EMAIL SENT TO: ${toEmail}]`);
    logger.info(`Subject: ${subject}`);
    logger.info(`Body: ${textContent}`);
    return true;
  }

  try {
    await transporter.sendMail({
      from,
      to: toEmail,
      subject,
      text: textContent,
      html: htmlContent
    });
    logger.info(`Password reset email successfully sent to: ${toEmail}`);
    return true;
  } catch (error) {
    logger.error(`Error sending password reset email to ${toEmail}:`, error);
    return false;
  }
};

/**
 * Sends a 6-digit OTP email to principal for downloading question papers
 */
export const sendOtpEmail = async ({ toEmail, collegeName, otp }) => {
  const from = process.env.EMAIL_FROM || '"AKNU Examination Cell" <noreply@aknu.edu.in>';
  const subject = 'AKNU Examination Portal - Question Paper Download OTP';
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #1e3a8a;">Hello, Principal (${collegeName})</h2>
      <p>Please use the following 6-digit One-Time Password (OTP) to verify and download your College Question Paper ZIP folder:</p>
      <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-radius: 6px; margin: 20px 0; border: 1px solid #e2e8f0;">
        <span style="font-size: 2em; letter-spacing: 5px; font-weight: bold; color: #0f172a; font-family: monospace;">${otp}</span>
      </div>
      <p style="color: #ef4444; font-weight: bold;">Note: This OTP is valid for 10 minutes. Do not share this OTP with anyone.</p>
      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 30px 0;"/>
      <p style="font-size: 0.85em; color: #94a3b8; text-align: center;">This is an automated system email from AKNU Examination Portal.</p>
    </div>
  `;
  const textContent = `Your OTP for downloading Question Papers for ${collegeName} is: ${otp}. Valid for 10 minutes.`;

  const transporter = getTransporter();
  if (!transporter) {
    logger.info(`[MOCK OTP EMAIL SENT TO: ${toEmail}] OTP: ${otp}`);
    return true;
  }
  try {
    await transporter.sendMail({ from, to: toEmail, subject, text: textContent, html: htmlContent });
    logger.info(`OTP email successfully sent to: ${toEmail}`);
    return true;
  } catch (error) {
    logger.error(`Error sending OTP email to ${toEmail}:`, error);
    return false;
  }
};
