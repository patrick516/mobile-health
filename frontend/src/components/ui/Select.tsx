import { cn } from "../../lib/utils";

interface Props extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
}

export function Select({ label, className, id, children, ...rest }: Props) {
  const selectId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label
          htmlFor={selectId}
          className="text-xs font-semibold uppercase tracking-wide text-purple-400"
        >
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={cn(
          "w-full rounded-lg border border-purple-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none",
          "focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-100 cursor-pointer transition-all",
          className,
        )}
        {...rest}
      >
        {children}
      </select>
    </div>
  );
}
