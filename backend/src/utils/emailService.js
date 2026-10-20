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
    console.error("[BREVO EMAIL ERROR]", error.message);
    return { success: false, error: error.message };
  }
};
