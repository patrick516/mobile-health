import { getDb } from "../db/schema";

export interface IdDuplicateResult {
  isDuplicate: boolean;
  ownerType?: "HOUSEHOLD_HEAD" | "MEMBER";
  ownerName?: string;
  householdNumber?: string;
}

export async function checkNationalIdDuplicate(
  idNumber: string,
  excludeLocalId?: string,
): Promise<IdDuplicateResult> {
  if (!idNumber || idNumber.trim() === "") {
    return { isDuplicate: false };
  }

  const id = idNumber.trim();
  const db = await getDb();

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

  const memberMatch = await db.getFirstAsync<{
    local_id: string;
    first_name: string;
    last_name: string;
    full_name: string | null;
    household_id: string;
  }>(
    `SELECT local_id, first_name, last_name, full_name, household_id 
     FROM members 
     WHERE national_id = ? AND status = 'ACTIVE'
     ${excludeLocalId ? "AND local_id != ?" : ""}
     LIMIT 1`,
    excludeLocalId ? [id, excludeLocalId] : [id],
  );

  if (memberMatch) {
    const fullName =
      `${memberMatch.first_name || ""} ${memberMatch.last_name || ""}`.trim() ||
      memberMatch.full_name ||
      "Unknown";
    const hh = await db.getFirstAsync<{ household_number: string }>(
      `SELECT household_number FROM households WHERE id = ? OR local_id = ?`,
      [memberMatch.household_id, memberMatch.household_id],
    );
    return {
      isDuplicate: true,
      ownerType: "MEMBER",
      ownerName: fullName,
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
