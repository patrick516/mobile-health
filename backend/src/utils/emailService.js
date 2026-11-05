const BRAND = "#0f766e";

// Sends one email through Brevo (same logic as before)
export const sendEmail = async (to, subject, htmlContent) => {
  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": process.env.BREVO_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sender: {
          name: process.env.BREVO_SENDER_NAME || "MobileHealth Malawi",
          email: process.env.BREVO_SENDER_EMAIL,
        },
        to: [{ email: to }],
        subject,
        htmlContent,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Brevo Error: ${errText}`);
    }
    return { success: true };
  } catch (error) {
    console.error("[BREVO EMAIL ERROR]", error.message, error.cause);
    return { success: false, error: error.message };
  }
};

// Highlighted box that lists label/value pairs, e.g. [["Email", "a@b.com"]]
export const infoBox = (rows) => `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdfa;border:1px solid #99f6e4;border-radius:8px;margin:16px 0;">
  <tr><td style="padding:16px 20px;">
    ${rows
      .map(
        ([label, value]) => `
      <div style="font-size:12px;color:${BRAND};text-transform:uppercase;letter-spacing:0.5px;">${label}</div>
      <div style="font-size:16px;font-weight:600;color:#111827;font-family:Consolas,Menlo,monospace;margin:2px 0 12px;">${value}</div>`,
      )
      .join("")}
  </td></tr>
</table>`;

// Wraps any message in the branded layout: logo header, body, button, footer
export const buildEmail = ({ heading, bodyHtml, buttonText, buttonLink }) => {
  const logoUrl = process.env.EMAIL_LOGO_URL;

  const logo = logoUrl
    ? `<img src="${logoUrl}" alt="MobileHealth Malawi" width="56" height="56" style="display:block;margin:0 auto 12px;border-radius:12px;background:#ffffff;" />`
    : "";

  const footerLogo = logoUrl
    ? `<img src="${logoUrl}" alt="" width="28" height="28" style="display:block;margin:0 auto 8px;opacity:0.9;" />`
    : "";

  const button =
    buttonText && buttonLink
      ? `<table role="presentation" align="center" style="margin:28px auto 8px;"><tr>
           <td style="background:${BRAND};border-radius:8px;">
             <a href="${buttonLink}" style="display:inline-block;padding:12px 28px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;">${buttonText}</a>
           </td></tr></table>`
      : "";

  return `
<div style="background:#f3f4f6;padding:24px 12px;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" align="center" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;">
    <tr>
      <td style="background:${BRAND};padding:28px 24px;text-align:center;">
        ${logo}
        <div style="color:#ffffff;font-size:20px;font-weight:700;">MobileHealth Malawi</div>
        <div style="color:#ccfbf1;font-size:13px;margin-top:4px;">Community Health Worker Platform</div>
      </td>
    </tr>
    <tr>
      <td style="padding:32px 28px;color:#374151;font-size:15px;line-height:1.6;">
        <h2 style="margin:0 0 16px;font-size:20px;color:#111827;">${heading}</h2>
        ${bodyHtml}
        ${button}
      </td>
    </tr>
    <tr>
      <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 24px;text-align:center;color:#6b7280;font-size:12px;line-height:1.5;">
        ${footerLogo}
        <strong>MobileHealth Malawi</strong><br />
        Better Systems. Healthier Communities.<br />
        This is an automated message, please do not reply.<br />
        &copy; ${new Date().getFullYear()} MobileHealth Malawi
      </td>
    </tr>
  </table>
</div>`;
};
