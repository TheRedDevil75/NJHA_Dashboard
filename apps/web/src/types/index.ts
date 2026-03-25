export type Role = 'ADMIN' | 'USER';
export type SymptomType = 'INTOXICATION' | 'STOMACH_ISSUES' | 'FLU';
export type Severity = 'MILD' | 'MODERATE' | 'SEVERE';
export type IntervalType = 'HOURS' | 'DAYS' | 'WEEKS';
export type ButtonStyle = 'rounded' | 'square' | 'pill';
export type CardStyle = 'flat' | 'raised' | 'bordered';

export interface User {
  id: string;
  username: string;
  displayName: string | null;
  role: Role;
  assignedHospitalId: string | null;
  requiresPasswordChange: boolean;
  isActive?: boolean;
  lastLoginAt?: string | null;
  createdAt?: string;
}

export interface Hospital {
  id: string;
  name: string;
  shortCode: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  isActive: boolean;
  createdAt?: string;
  _count?: { users: number; submissions: number };
}

export interface CollectionPeriod {
  id: string;
  intervalConfigId: string;
  startedAt: string;
  endedAt: string | null;
  isActive: boolean;
  archivedAt: string | null;
  createdAt: string;
  intervalConfig?: IntervalConfig;
  _count?: { submissions: number };
}

export interface IntervalConfig {
  id: string;
  name: string;
  intervalType: IntervalType;
  intervalValue: number;
  startTime: string;
  timezone: string;
  isActive: boolean;
  createdAt: string;
  _count?: { periods: number };
}

export interface Submission {
  id: string;
  userId: string;
  hospitalId: string;
  collectionPeriodId: string;
  symptomType: SymptomType;
  severity: Severity | null;
  notes: string | null;
  submittedAt: string;
  hospital?: Pick<Hospital, 'id' | 'name' | 'shortCode'>;
  user?: Pick<User, 'id' | 'username' | 'displayName'>;
}

export interface ThemeConfig {
  id: string;
  appName: string;
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
  headerBackground: string;
  headerTextColor: string;
  fontFamily: string;
  fontSizeBase: number;
  buttonStyle: ButtonStyle;
  cardStyle: CardStyle;
  showSeverityField: boolean;
  showNotesField: boolean;
  loginMessage: string | null;
  dashboardMessage: string | null;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  userId: string | null;
  action: string;
  details: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
  user?: Pick<User, 'id' | 'username' | 'displayName'> | null;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface PaginatedResponse<T> {
  total: number;
  page: number;
  totalPages: number;
  items?: T[];
}
