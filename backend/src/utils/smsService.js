const TEXTBEE_API_KEY = process.env.TEXTBEE_API_KEY;
const TEXTBEE_DEVICE_ID = process.env.TEXTBEE_DEVICE_ID;
const TEXTBEE_SIM_AIRTEL = process.env.TEXTBEE_SIM_AIRTEL;
const TEXTBEE_SIM_TNM = process.env.TEXTBEE_SIM_TNM;
export const APP_DOWNLOAD_LINK = process.env.APP_DOWNLOAD_LINK;
export const PORTAL_LINK = process.env.PORTAL_LINK;

// Malawi mobile prefixes:

export function detectNetwork(phoneNumber) {
  const cleaned = String(phoneNumber).replace("+265", "0").replace(/\s/g, "");

  if (cleaned.startsWith("099") || cleaned.startsWith("098")) {
    return TEXTBEE_SIM_AIRTEL;
  }
  if (cleaned.startsWith("088") || cleaned.startsWith("089")) {
    return TEXTBEE_SIM_TNM;
  }
  return undefined; // unknown prefix — let TextBee use its Default SIM
}

export async function sendSms(phoneNumber, message) {
  const simSubscriptionId = detectNetwork(phoneNumber);

  const response = await fetch(
    `https://api.textbee.dev/api/v1/gateway/devices/${TEXTBEE_DEVICE_ID}/send-sms`,
    {
      method: "POST",
      headers: {
        "x-api-key": TEXTBEE_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        recipients: [phoneNumber],
        message,
        ...(simSubscriptionId ? { simSubscriptionId } : {}),
      }),
    },
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`TextBee SMS failed: ${errText}`);
  }

  return response.json();
}
