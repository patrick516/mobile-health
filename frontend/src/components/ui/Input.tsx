import { cn } from "../../lib/utils";

interface Props extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, className, id, ...rest }: Props) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label
          htmlFor={inputId}
          className="text-xs font-semibold uppercase tracking-wide text-purple-400"
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={cn(
          "w-full rounded-lg border border-purple-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none",
          "focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-100",
          "placeholder:text-gray-400 transition-all",
          error && "border-red-400",
          className,
        )}
        {...rest}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
