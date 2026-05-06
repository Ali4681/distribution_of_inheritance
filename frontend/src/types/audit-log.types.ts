import { CaseStatus, Role } from "./enums";

export interface AuditLogUserSummary {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface AuditLogCaseSummary {
  id: string;
  deceasedName: string;
  status: CaseStatus;
  currency: string;
}

export interface AuditLogItem {
  id: string;
  action: string;
  changes: unknown | null;
  ipAddress: string | null;
  performedAt: string;
  user: AuditLogUserSummary;
  case: AuditLogCaseSummary | null;
}

export interface AuditLogListMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface AuditLogListStats {
  total: number;
  caseLinked: number;
  uniqueUsers: number;
}

export interface AuditLogListFilters {
  actions: string[];
}

export interface AuditLogListResponse {
  items: AuditLogItem[];
  meta: AuditLogListMeta;
  stats: AuditLogListStats;
  filters: AuditLogListFilters;
}

export interface AuditLogQuery {
  page?: number;
  limit?: number;
  search?: string;
  action?: string;
  userId?: string;
  caseId?: string;
  dateFrom?: string;
  dateTo?: string;
  hasCase?: boolean;
}
