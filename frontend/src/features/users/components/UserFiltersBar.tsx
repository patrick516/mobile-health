import { FilterBar } from "../../../components/shared/FilterBar";
import { Select, Input } from "../../../components/ui";
import type { UserFilters } from "../../../types";

const STATUS_PILLS = [
  { label: "All Users", value: "all" },
  { label: "Verified", value: "verified" },
  { label: "Unverified", value: "unverified" },
  { label: "Premium", value: "premium" },
  { label: "Banned", value: "banned" },
];

interface Props {
  filters: UserFilters;
  onChange: (f: Partial<UserFilters>) => void;
}

export function UserFiltersBar({ filters, onChange }: Props) {
  const activePill =
    filters.status === "banned"
      ? "banned"
      : filters.plan === "premium_monthly"
        ? "premium"
        : filters.verificationStatus === "verified"
          ? "verified"
          : filters.verificationStatus === "unverified"
            ? "unverified"
            : "all";

  function handlePill(v: string) {
    if (v === "all")
      onChange({ status: "all", verificationStatus: "all", plan: "all" });
    else if (v === "banned")
      onChange({ status: "banned", verificationStatus: "all", plan: "all" });
    else if (v === "premium")
      onChange({
        status: "all",
        plan: "premium_monthly",
        verificationStatus: "all",
      });
    else if (v === "verified")
      onChange({ status: "all", verificationStatus: "verified", plan: "all" });
    else if (v === "unverified")
      onChange({
        status: "all",
        verificationStatus: "unverified",
        plan: "all",
      });
  }

  return (
    <FilterBar
      pills={STATUS_PILLS}
      activeValue={activePill}
      onPillChange={handlePill}
    >
      <Input
        placeholder="Search name or email…"
        value={filters.search ?? ""}
        onChange={(e) => onChange({ search: e.target.value })}
        className="w-48 py-1 text-xs"
      />
      <Select
        value={filters.gender ?? "all"}
        onChange={(e) =>
          onChange({ gender: e.target.value as UserFilters["gender"] })
        }
        className="py-1 text-xs"
      >
        <option value="all">All Genders</option>
        <option value="male">Male</option>
        <option value="female">Female</option>
      </Select>
    </FilterBar>
  );
}
