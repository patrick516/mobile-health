import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
  searchable?: boolean;
}

// Drop-in replacement for native <select>. Built from plain styled divs
// so the open/hover/selected states can use the app's own teal instead
// of whatever color the browser's native popup happens to render
// (confirmed inconsistent across browsers — Chrome uses blue, Edge
// uses gray — and neither is overridable via CSS on a native <select>).
export default function Select({
  value,
  onChange,
  options,
  placeholder = "Select...",
  className = "",
  searchable = false,
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);

  const visibleOptions = options.filter((o) =>
    o.label.toLowerCase().includes(query.toLowerCase()),
  );

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => {
          if (!open) setQuery("");
          setOpen((o) => !o);
        }}
        className="w-full flex items-center justify-between border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white text-left focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent hover:border-gray-300 transition-colors"
      >
        <span className={selected ? "text-gray-900" : "text-gray-400"}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown
          size={16}
          className={`text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full min-w-[16rem] bg-white border border-gray-200 rounded-lg shadow-lg">
          {searchable && (
            <div className="p-1.5 border-b border-gray-100">
              <input
                autoFocus
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Type to search..."
                className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>
          )}
          <div className="max-h-60 overflow-auto p-1.5 space-y-0.5">
            {visibleOptions.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  disabled={opt.disabled}
                  onClick={() => {
                    if (opt.disabled) return;
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 text-sm text-left rounded-md transition-colors ${
                    opt.disabled
                      ? "text-gray-400 cursor-not-allowed"
                      : isSelected
                        ? "bg-teal-700 text-white"
                        : "text-gray-700 hover:bg-teal-50"
                  }`}
                >
                  {opt.label}
                  {isSelected && <Check size={14} />}
                </button>
              );
            })}
            {visibleOptions.length === 0 && (
              <p className="px-3 py-2 text-sm text-gray-400">No match found.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
