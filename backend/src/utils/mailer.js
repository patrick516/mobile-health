// src/utils/mailer.js

import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: Number(process.env.MAIL_PORT),
  secure: false,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

export const sendMail = async ({ to, subject, html }) => {
  return transporter.sendMail({
    from: process.env.MAIL_FROM,
    to,
    subject,
    html,
  });
};

export const reportReplyTemplate = ({ reporterName, reason, adminReply }) => `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <h2 style="color: #7C3AED;">AnzathuConnect — Report Update</h2>
    <p>Hi <strong>${reporterName}</strong>,</p>
    <p>Thank you for reporting <strong>${reason}</strong>. Our team has reviewed your report and here is our response:</p>
    <div style="background: #F3EEFF; padding: 16px; border-left: 4px solid #7C3AED; margin: 16px 0;">
      <p style="margin: 0;">${adminReply}</p>
    </div>
    <p>We take all reports seriously and appreciate you helping keep AnzathuConnect safe.</p>
    <p style="color: #6B7280; font-size: 13px;">— The AnzathuConnect Team</p>
  </div>
`;
