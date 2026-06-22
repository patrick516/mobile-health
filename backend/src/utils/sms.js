// Africa's Talking SMS utility
// Install when ready: npm install africastalking

export const sendSms = async (phoneNumber, message) => {
  try {
    if (!process.env.AT_API_KEY || !process.env.AT_USERNAME) {
      console.log(`[SMS - DEV MODE] To: ${phoneNumber} | Message: ${message}`);
      return { success: true, dev: true };
    }

    const AfricasTalking = (await import("africastalking")).default;
    const at = AfricasTalking({
      apiKey: process.env.AT_API_KEY,
      username: process.env.AT_USERNAME,
    });

    const result = await at.SMS.send({
      to: [phoneNumber],
      message,
      from: process.env.AT_SENDER_ID || undefined,
    });

    return { success: true, result };
  } catch (err) {
    console.error("[SMS ERROR]", err.message);
    return { success: false, error: err.message };
  }
};
