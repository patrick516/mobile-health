import { cn } from "../../lib/utils";

interface Props {
  children: React.ReactNode;
  className?: string;
  noPad?: boolean;
}

export function Card({ children, className, noPad }: Props) {
  return (
    <div
      className={cn(
        "bg-white border border-purple-100 rounded-xl shadow-sm overflow-hidden",
        className,
      )}
    >
      {noPad ? children : <div className="p-5">{children}</div>}
    </div>
  );
}

export function CardHeader({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between px-5 pt-5 pb-0",
        className,
      )}
    >
      {children}
    </div>
  );
}
