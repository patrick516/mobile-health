// Parses the Machine Readable Zone (MRZ) printed/encoded on Malawi National
// ID cards (TD1 3-line format, same family as passport MRZ).
//
// Example raw input (3 lines concatenated or newline separated):
// I<MWI0WH60VGS19<<<<<<<<<<<<<<<9
// 8052863405282MWI<<<<<<<<<<<4
// KULINJI<<PATRICK<<<<<<<<<<<<<<
//
// Line 1: Document type + issuing country + document number
// Line 2: Birth date (YYMMDD) + sex + expiry date (YYMMDD) + nationality
// Line 3: Surname << given names (separated by <<, words separated by <)

export interface ParsedMrz {
  idNumber: string;
  surname: string;
  givenNames: string;
  fullName: string;
  dateOfBirth: string | null; // ISO format YYYY-MM-DD
  sex: "MALE" | "FEMALE" | "UNKNOWN";
  nationality: string;
  raw: string;
}

const cleanField = (s: string) =>
  s.replace(/</g, " ").trim().replace(/\s+/g, " ");

// Converts a 2-digit MRZ year to a full year. MRZ doesn't encode century,
// so we assume birth years are in the past — anything > current 2-digit year
// is treated as 1900s, otherwise 2000s. Good enough for display purposes.
const parseMrzDate = (yymmdd: string): string | null => {
  if (!yymmdd || yymmdd.length !== 6 || /[^0-9]/.test(yymmdd)) return null;
  const yy = parseInt(yymmdd.substring(0, 2), 10);
  const mm = yymmdd.substring(2, 4);
  const dd = yymmdd.substring(4, 6);
  const currentYY = new Date().getFullYear() % 100;
  const century = yy > currentYY ? 1900 : 2000;
  const fullYear = century + yy;
  return `${fullYear}-${mm}-${dd}`;
};

export function parseMrz(rawInput: string): ParsedMrz | null {
  try {
    // Normalise: split on newlines if present, otherwise the scanner may
    // return all 3 lines concatenated with no separator — in that case we
    // can't reliably split, so we try newline-split first.
    let lines = rawInput.split(/\r?\n/).filter((l) => l.trim().length > 0);

    // Fallback: some scanners return one giant line. TD1 lines are each
    // exactly 30 characters — if length is a multiple of 30, split evenly.
    if (
      lines.length === 1 &&
      lines[0].length % 30 === 0 &&
      lines[0].length > 30
    ) {
      const single = lines[0];
      lines = [];
      for (let i = 0; i < single.length; i += 30) {
        lines.push(single.substring(i, i + 30));
      }
    }

    if (lines.length < 3) return null;

    const [line1, line2, line3] = lines;

    // ── Line 1: document number ──
    // Format: I<MWIxxxxxxxxxxx<<<<<<<<<<<<<<<c
    const docNumberMatch = line1.match(/^.{5}([A-Z0-9<]{9})/);
    const idNumber = docNumberMatch ? docNumberMatch[1].replace(/</g, "") : "";

    // ── Line 2: DOB, sex, nationality ──
    // Format: YYMMDD S YYMMDD NNN<<<<<<<<<<<c
    const dobRaw = line2.substring(0, 6);
    const sexChar = line2.substring(7, 8);
    const nationality = line2.substring(15, 18).replace(/</g, "");

    const dateOfBirth = parseMrzDate(dobRaw);
    const sex: ParsedMrz["sex"] =
      sexChar === "M" ? "MALE" : sexChar === "F" ? "FEMALE" : "UNKNOWN";

    // ── Line 3: names ──
    const [surnamePart, givenPart] = line3.split("<<");
    const surname = cleanField(surnamePart || "");
    const givenNames = cleanField(givenPart || "");
    const fullName = [givenNames, surname].filter(Boolean).join(" ").trim();

    if (!idNumber && !surname) return null;

    return {
      idNumber,
      surname,
      givenNames,
      fullName,
      dateOfBirth,
      sex,
      nationality: nationality || "MWI",
      raw: rawInput,
    };
  } catch (e) {
    console.warn("[MRZ] Parse error:", e);
    return null;
  }
}
