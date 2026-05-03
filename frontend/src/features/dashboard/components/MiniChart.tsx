interface Props {
  values: number[];
}

export function MiniChart({ values }: Props) {
  const max = Math.max(...values, 1);
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Today"];

  return (
    <div>
      <div className="flex items-end gap-1 h-20">
        {values.map((v, i) => {
          const pct = (v / max) * 100;
          const isToday = i === values.length - 1;
          return (
            <div
              key={i}
              className="flex-1 flex flex-col justify-end group relative"
            >
              <div
                className={`rounded-t-sm transition-all ${
                  isToday
                    ? "bg-gradient-to-t from-fuchsia-600 to-violet-500"
                    : "bg-fuchsia-100 group-hover:bg-fuchsia-200"
                }`}
                style={{ height: `${pct}%` }}
              />
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 hidden group-hover:block text-[10px] bg-gray-900 text-white px-1.5 py-0.5 rounded whitespace-nowrap">
                {v}
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex justify-between mt-1.5">
        {days.map((d) => (
          <span
            key={d}
            className="flex-1 text-center text-[10px] text-gray-400"
          >
            {d}
          </span>
        ))}
      </div>
    </div>
  );
}
