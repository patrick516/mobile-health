export const APP_NAME = "AnzathuConnect";

export const PAGE_SIZE_DEFAULT = 20;
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

export const AVATAR_COLORS = [
  "linear-gradient(135deg,#c026d3,#7c3aed)",
  "linear-gradient(135deg,#0d9488,#0284c7)",
  "linear-gradient(135deg,#f59e0b,#ef4444)",
  "linear-gradient(135deg,#8b5cf6,#ec4899)",
  "linear-gradient(135deg,#14b8a6,#22c55e)",
  "linear-gradient(135deg,#f97316,#eab308)",
  "linear-gradient(135deg,#10b981,#3b82f6)",
  "linear-gradient(135deg,#6366f1,#8b5cf6)",
];

export const PLAN_LABELS: Record<string, string> = {
  free: "Free",
  premium_monthly: "Premium Monthly",
  premium_yearly: "Premium Yearly",
};

export const REPORT_TYPE_LABELS: Record<string, string> = {
  inappropriate_photo: "Inappropriate Photo",
  harassment: "Harassment",
  fake_profile: "Fake Profile",
  spam: "Spam",
  other: "Other",
};

export const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  national_id: "National ID",
  passport: "Passport",
  drivers_license: "Driver's License",
};

// Define the NavItem type with optional badgeKey
type NavItem = {
  readonly key: string;
  readonly label: string;
  readonly icon: string;
  readonly section: string;
  readonly badgeKey?: string; // Optional property
};

// Explicitly type NAV_ITEMS with the NavItem type
export const NAV_ITEMS: readonly NavItem[] = [
  {
    key: "dashboard",
    label: "Dashboard",
    icon: "LayoutDashboard",
    section: "overview",
  },
  {
    key: "analytics",
    label: "Analytics",
    icon: "TrendingUp",
    section: "overview",
  },
  {
    key: "users",
    label: "Users",
    icon: "Users",
    section: "management",
    badgeKey: "pendingVerifications",
  },
  {
    key: "verification",
    label: "Verification",
    icon: "ShieldCheck",
    section: "management",
    badgeKey: "pendingVerifications",
  },
  {
    key: "reports",
    label: "Reports",
    icon: "Flag",
    section: "management",
    badgeKey: "pendingReports",
  },
  { key: "matches", label: "Matches", icon: "Heart", section: "management" },
  {
    key: "subscriptions",
    label: "Subscriptions",
    icon: "Gem",
    section: "management",
  },
  { key: "locations", label: "Locations", icon: "MapPin", section: "settings" },
  {
    key: "notifications",
    label: "Notifications",
    icon: "Bell",
    section: "settings",
  },
];

// Derive PageKey type from the NAV_ITEMS array
export type PageKey = (typeof NAV_ITEMS)[number]["key"];
