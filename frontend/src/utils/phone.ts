export const normalizePhone = (input: string): string => {
  if (!input) return "";
  let s = String(input).replace(/[\s\-()]/g, "");
  if (s.startsWith("+265")) return s;
  if (s.startsWith("265") && s.length >= 12) return "+" + s;
  if (s.startsWith("0")) return "+265" + s.slice(1);
  return "+265" + s;
};

export const isValidMalawiPhone = (normalized: string): boolean =>
  /^\+265(8|9)\d{8}$/.test(normalized);
