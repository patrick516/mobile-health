import { getDb } from "../db/schema";

export interface IdDuplicateResult {
  isDuplicate: boolean;
  ownerType?: "HOUSEHOLD_HEAD" | "MEMBER";
  ownerName?: string;
  householdNumber?: string;
}

// Checks whether a National ID number is already in use ANYWHERE in the
// local SQLite database — as a household head OR as a household member.
// A National ID belongs to exactly one real person, so it should never be
// usable for two different household/member records, regardless of which
// form it was scanned into.
export async function checkNationalIdDuplicate(
  idNumber: string,
  excludeLocalId?: string, // pass the current record's localId when editing, so it doesn't flag itself
): Promise<IdDuplicateResult> {
  if (!idNumber || idNumber.trim() === "") {
    return { isDuplicate: false };
  }

  const id = idNumber.trim();
  const db = await getDb();

  // Check against household heads
  const householdMatch = await db.getFirstAsync<{
    local_id: string;
    household_number: string;
    head_of_household_name: string;
  }>(
    `SELECT local_id, household_number, head_of_household_name 
     FROM households 
     WHERE head_national_id = ? AND status = 'ACTIVE'
     ${excludeLocalId ? "AND local_id != ?" : ""}
     LIMIT 1`,
    excludeLocalId ? [id, excludeLocalId] : [id],
  );

  if (householdMatch) {
    return {
      isDuplicate: true,
      ownerType: "HOUSEHOLD_HEAD",
      ownerName: householdMatch.head_of_household_name,
      householdNumber: householdMatch.household_number,
    };
  }

  // Check against household members
  const memberMatch = await db.getFirstAsync<{
    local_id: string;
    full_name: string;
    household_id: string;
  }>(
    `SELECT local_id, full_name, household_id 
     FROM members 
     WHERE national_id = ? AND status = 'ACTIVE'
     ${excludeLocalId ? "AND local_id != ?" : ""}
     LIMIT 1`,
    excludeLocalId ? [id, excludeLocalId] : [id],
  );

  if (memberMatch) {
    // Look up the household number for a clearer message
    const hh = await db.getFirstAsync<{ household_number: string }>(
      `SELECT household_number FROM households WHERE id = ? OR local_id = ?`,
      [memberMatch.household_id, memberMatch.household_id],
    );

    return {
      isDuplicate: true,
      ownerType: "MEMBER",
      ownerName: memberMatch.full_name,
      householdNumber: hh?.household_number,
    };
  }

  return { isDuplicate: false };
}

export function formatDuplicateMessage(result: IdDuplicateResult): string {
  if (!result.isDuplicate) return "";
  const role =
    result.ownerType === "HOUSEHOLD_HEAD"
      ? "the head of household"
      : "a household member";
  return `This National ID is already registered to ${result.ownerName} as ${role}${result.householdNumber ? ` in household ${result.householdNumber}` : ""}. Each National ID can only be used once.`;
}
