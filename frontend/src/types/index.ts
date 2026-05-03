export type UserStatus =
  | "active"
  | "banned"
  | "suspended"
  | "pending_verification";
export type VerificationStatus =
  | "unverified"
  | "pending"
  | "verified"
  | "rejected";
export type PlanType = "free" | "premium_monthly" | "premium_yearly";
export type Gender = "male" | "female" | "other";
export type ReportStatus =
  | "pending"
  | "under_review"
  | "resolved"
  | "dismissed";
export type ReportType =
  | "inappropriate_photo"
  | "harassment"
  | "fake_profile"
  | "spam"
  | "other";
export type MatchType = "automatic" | "manual";
export type MatchStatus = "active" | "dissolved";
export type DocumentType = "national_id" | "passport" | "drivers_license";
export type LocationType = "country" | "district" | "town";
export type NotificationAudience =
  | "all"
  | "premium"
  | "free"
  | "unverified"
  | "inactive";
export type PaymentStatus = "paid" | "expired" | "failed";

// ─── Location ────────────────────────────────────────────────────────────────

export interface Location {
  id: string;
  name: string;
  type: LocationType;
  parentId: string | null;
  parentName?: string;
  isActive: boolean;
  userCount?: number;
}

// ─── User ────────────────────────────────────────────────────────────────────

export interface UserPhoto {
  id: string;
  url: string;
  isMain: boolean;
  uploadedAt: string;
}

export interface UserDocument {
  id: string;
  type: DocumentType;
  fileUrl: string;
  filename: string;
  fileSizeMb: number;
  uploadedAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  gender: Gender;
  age: number;
  locationId: string;
  locationName: string;
  status: UserStatus;
  verificationStatus: VerificationStatus;
  plan: PlanType;
  photos: UserPhoto[];
  documents: UserDocument[];
  joinedAt: string;
  lastActiveAt: string;
  isOnline: boolean;
  totalMatches: number;
  messagesSent: number;
  reportsFiled: number;
  reportsAgainst: number;
  initials: string;
  avatarColor: string;
}

// ─── Report ──────────────────────────────────────────────────────────────────

export interface Report {
  id: string;
  reporterId: string;
  reporterName: string;
  reporterInitials: string;
  reporterAvatarColor: string;
  reportedUserId: string;
  reportedUserName: string;
  type: ReportType;
  description: string;
  status: ReportStatus;
  adminNotes: string | null;
  resolvedAt: string | null;
  createdAt: string;
}

// ─── Match ───────────────────────────────────────────────────────────────────

export interface Match {
  id: string;
  user1Id: string;
  user1Name: string;
  user1Initials: string;
  user1AvatarColor: string;
  user2Id: string;
  user2Name: string;
  user2Initials: string;
  user2AvatarColor: string;
  type: MatchType;
  status: MatchStatus;
  locationName: string;
  createdAt: string;
  dissolvedAt: string | null;
}

// ─── Subscription ────────────────────────────────────────────────────────────

export interface Subscription {
  id: string;
  userId: string;
  userName: string;
  userInitials: string;
  userAvatarColor: string;
  plan: PlanType;
  startedAt: string;
  expiresAt: string;
  isActive: boolean;
  paymentStatus: PaymentStatus;
}

// ─── Notification ────────────────────────────────────────────────────────────

export interface Notification {
  id: string;
  title: string;
  body: string;
  audience: NotificationAudience;
  sentAt: string;
  deliveredCount: number;
  status: "sent" | "scheduled" | "draft";
}

// ─── Analytics / Dashboard ───────────────────────────────────────────────────

export interface DashboardStats {
  totalUsers: number;
  totalMatches: number;
  onlineNow: number;
  pendingReports: number;
  newSignupsToday: number;
  newSignupsWeek: number;
  newSignupsMonth: number;
  premiumUsers: number;
  premiumConversionRate: number;
  reportsResolved: number;
  reportsResolvedRate: number;
  weeklySignups: number[]; // 7 values Sun → today
}

// ─── API helpers ─────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface UserFilters {
  status?: UserStatus | "all";
  verificationStatus?: VerificationStatus | "all";
  plan?: PlanType | "all";
  gender?: Gender | "all";
  locationId?: string | "all";
  search?: string;
}

export interface ReportFilters {
  status?: ReportStatus | "all";
  type?: ReportType | "all";
  search?: string;
}
