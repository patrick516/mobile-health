// Canonical Malawi phone format: +265XXXXXXXXX (no spaces).
// Accepts:
//   0995049331        → +265995049331
//   +265995049331     → +265995049331
//   265995049331      → +265995049331
//   0995 049 331      → +265995049331
//   +265 995 049 331  → +265995049331
export const normalizePhone = (input) => {
  if (!input) return "";
  let s = String(input).replace(/[\s\-()]/g, "");
  if (s.startsWith("+265")) return s;
  if (s.startsWith("265") && s.length >= 12) return "+" + s;
  if (s.startsWith("0")) return "+265" + s.slice(1);
  return "+265" + s; // bare 9-digit number, e.g. "995049331"
};

// True if the result looks like a valid MW mobile number
export const isValidMalawiPhone = (normalized) =>
  /^\+265(8|9)\d{8}$/.test(normalized);
