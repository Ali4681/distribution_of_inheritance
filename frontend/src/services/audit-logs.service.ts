import { apiGet } from "@/lib";
import { AuditLogListResponse, AuditLogQuery } from "@/types";

export const auditLogsService = {
  findAll(query: AuditLogQuery = {}): Promise<AuditLogListResponse> {
    return apiGet<AuditLogListResponse>("/audit-logs", {
      page: query.page ? String(query.page) : undefined,
      limit: query.limit ? String(query.limit) : undefined,
      search: query.search?.trim() || undefined,
      action: query.action?.trim() || undefined,
      userId: query.userId || undefined,
      caseId: query.caseId || undefined,
      dateFrom: query.dateFrom || undefined,
      dateTo: query.dateTo || undefined,
      hasCase:
        query.hasCase === undefined ? undefined : String(query.hasCase),
    });
  },
};
