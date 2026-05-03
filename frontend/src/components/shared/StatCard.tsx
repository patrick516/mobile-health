import { cn } from "../../lib/utils";

interface Props {
  label: string;
  value: string | number;
  change?: string;
  changeUp?: boolean;
  icon?: string;
  accent?: "purple" | "teal" | "blue" | "amber";
}

const accents = {
  purple: "after:bg-fuchsia-500",
  teal: "after:bg-teal-500",
  blue: "after:bg-blue-500",
  amber: "after:bg-amber-500",
};

export function StatCard({
  label,
  value,
  change,
  changeUp,
  icon,
  accent = "purple",
}: Props) {
  return (
    <div
      className={cn(
        "bg-white border border-purple-100 rounded-xl p-5 shadow-sm relative overflow-hidden",
        "after:absolute after:-bottom-5 after:-right-5 after:w-20 after:h-20 after:rounded-full after:opacity-10",
        accents[accent],
      )}
    >
      {icon && (
        <div className="absolute top-4 right-4 text-2xl opacity-20">{icon}</div>
      )}
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
        {label}
      </p>
      <p
        className="text-3xl font-bold text-gray-900 leading-none mb-2"
        style={{ fontFamily: "Georgia, serif" }}
      >
        {value}
      </p>
      {change && (
        <span
          className={cn(
            "inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full",
            changeUp ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600",
          )}
        >
          {changeUp ? "↑" : "↓"} {change}
        </span>
      )}
    </div>
  );
}
