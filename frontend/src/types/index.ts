export interface User {
  id: string;
  fullName: string;
  phoneNumber: string;
  role: "CCW" | "NURSE" | "DISTRICT_OFFICER" | "ADMIN" | "SUPER_ADMIN";
  isActive: boolean;
  zoneAllocations: Array<{ zone: { id: string; name: string; taId: string } }>;
  taAllocations: Array<{ ta: { id: string; name: string } }>;
  facility?: {
    id: string;
    name: string;
    facilityType: "DISTRICT_HOSPITAL" | "TA_HOSPITAL" | "CLINIC" | null;
    districtId?: string | null;
    taId?: string | null;
  } | null;
  scopeLevel?: "ALL" | "DISTRICT" | "TA" | "ZONE";
}
export interface Household {
  id: string;
  localId: string;
  householdNumber: string;
  headOfHouseholdName: string;
  headPhone?: string;
  headNationalId?: string | null;
  consentGiven?: boolean;
  consentSignatureUrl?: string | null;
  status: string;
  gpsLat?: number;
  gpsLng?: number;
  landmark?: string;
  waterSource: string;
  latrinePresent: boolean;
  handwashingFacility: boolean;
  distanceToFacility: string;
  mosquitoNets?: string;
  numberOfRooms?: number;
  syncedAt?: string;
  createdAt: string;
  village: {
    id: string;
    name: string;
    zone: {
      id: string;
      name: string;
      ta: {
        id: string;
        name: string;
        district: {
          id: string;
          name: string;
          region: { id: string; name: string };
        };
      };
    };
  };
  members: Member[];
  _count: { members: number };
}

export interface Member {
  id: string;
  localId: string;
  householdId: string;
  fullName: string;
  sex: string;
  dateOfBirth?: string;
  estimatedAge?: number;
  relationshipToHead: string;
  isPregnant: boolean;
  chronicIllnesses?: string[];
  hasDisability: boolean;
  status: string;
}

export interface Visit {
  id: string;
  localId: string;
  memberId: string;
  householdId: string;
  chwId: string;
  visitedAt: string;
  visitType: string;
  symptoms?: string[];
  temperature?: number;
  muacMm?: number;
  muacStatus?: string;
  dangerSigns?: string[];
  referralNeeded: boolean;
  gpsLat?: number;
  gpsLng?: number;
  notes?: string;
  syncedAt?: string;
  member: { id: string; fullName: string; sex: string };
  chw: { id: string; fullName: string };
}

export interface Referral {
  id: string;
  localId: string;
  visitId: string;
  memberId: string;
  referringUserId: string;
  reason: string;
  urgency: "ROUTINE" | "URGENT" | "EMERGENCY";
  status:
    | "PENDING"
    | "OVERDUE"
    | "ARRIVED"
    | "TREATED"
    | "FEEDBACK_SENT"
    | "COMPLETED"
    | "MISSED";
  dueBy?: string;
  arrivedAt?: string;
  treatedAt?: string;
  diagnosis?: string;
  treatmentGiven?: string;
  feedbackNote?: string;
  resolvedAt?: string;
  createdAt: string;
  member: {
    id: string;
    fullName: string;
    sex: string;
    dateOfBirth?: string;
    estimatedAge?: number;
  };
  referringUser: { id: string; fullName: string; phoneNumber: string };
  destinationFacility?: { id: string; name: string };
  visit: {
    id: string;
    visitedAt: string;
    symptoms?: string[];
    muacStatus?: string;
  };
}

export interface Drug {
  id: string;
  drugCode: string;
  nameEnglish: string;
  nameChichewa: string;
  unit: string;
  minimumThreshold: number;
  isActive: boolean;
}

export interface DrugStock {
  id: string;
  userId: string;
  drugId: string;
  quantityCurrent: number;
  quantityMinimum: number;
  lastRestockedAt?: string;
  drug: Drug;
  user?: { id: string; fullName: string };
}

export interface ImmunisationSchedule {
  id: string;
  memberId: string;
  vaccineCode: string;
  doseNumber: number;
  dueDate: string;
  status: "DUE" | "GIVEN" | "OVERDUE" | "MISSED";
  givenAt?: string;
  member: {
    id: string;
    fullName: string;
    dateOfBirth?: string;
    household: { householdNumber: string; village: { name: string } };
  };
}

export interface MapEvent {
  id: string;
  type: "visit" | "household" | "referral";
  lat: number;
  lng: number;
  label: string;
  timestamp?: string;
  colour: "green" | "yellow" | "red" | "blue";
  meta: Record<string, unknown>;
}

export interface OverviewStats {
  totalVisitsWeek: number;
  activeReferrals: number;
  missedReferrals: number;
  drugsLowStock: number;
  vaccinesDue: number;
  ancOverdue: number;
}

export interface ChwActivity {
  id: string;
  fullName: string;
  phoneNumber: string;
  zones: string[];
  visitsThisWeek: number;
  pendingReferrals: number;
  lastSyncAt?: string;
  status: "ACTIVE" | "UNSYNCED" | "NO_ACTIVITY";
}

export interface Region {
  id: string;
  name: string;
  districts: District[];
}

export interface District {
  id: string;
  name: string;
  regionId: string;
  traditionalAuthorities: TraditionalAuthority[];
}

export interface TraditionalAuthority {
  id: string;
  name: string;
  districtId: string;
  zones: Zone[];
}

export interface Zone {
  id: string;
  name: string;
  taId: string;
  villages: Village[];
}

export interface Village {
  id: string;
  name: string;
  zoneId: string;
  isVerified: boolean;
}

export interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
