interface Props {
  title: string;
  action?: React.ReactNode;
}
export function SectionHeader({ title, action }: Props) {
  return (
    <div className="flex items-center justify-between px-5 py-4">
      <h3 className="font-semibold text-gray-900 text-sm">{title}</h3>
      {action}
    </div>
  );
}
