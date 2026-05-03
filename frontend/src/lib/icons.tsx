import {
  LayoutDashboard,
  TrendingUp,
  Users,
  ShieldCheck,
  Flag,
  Heart,
  Gem,
  MapPin,
  Bell,
  type LucideIcon,
} from "lucide-react";

export const ICON_MAP: Record<string, LucideIcon> = {
  LayoutDashboard,
  TrendingUp,
  Users,
  ShieldCheck,
  Flag,
  Heart,
  Gem,
  MapPin,
  Bell,
};

export const getIcon = (iconName: string) => {
  const Icon = ICON_MAP[iconName];
  return Icon;
};
