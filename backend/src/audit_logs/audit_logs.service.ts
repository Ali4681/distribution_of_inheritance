import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ListAuditLogsQueryDto } from './dto/list-audit-logs-query.dto';

type AuditDbClient = PrismaService | Prisma.TransactionClient;
type AuditChanges = Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput;

type RecordAuditLogInput = {
  userId: string;
  caseId?: string | null;
  action: string;
  changes?: unknown;
  ipAddress?: string | null;
};

@Injectable()
export class AuditLogsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: ListAuditLogsQueryDto) {
    const limit = Math.min(Math.max(query.limit ?? 20, 1), 100);
    const requestedPage = Math.max(query.page ?? 1, 1);
    const where = this.buildWhere(query);

    const [total, actionRows, uniqueUsers, caseLinkedCount] =
      await this.prisma.$transaction([
        this.prisma.auditLog.count({ where }),
        this.prisma.auditLog.findMany({
          distinct: ['action'],
          select: { action: true },
          orderBy: { action: 'asc' },
        }),
        this.prisma.auditLog.groupBy({
          by: ['userId'],
          where,
          orderBy: { userId: 'asc' },
        }),
        this.prisma.auditLog.count({
          where: this.combineWhere(where, { caseId: { not: null } }),
        }),
      ]);

    const totalPages = Math.max(Math.ceil(total / limit), 1);
    const page = Math.min(requestedPage, totalPages);
    const skip = (page - 1) * limit;

    const items = await this.prisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        case: {
          select: {
            id: true,
            deceasedName: true,
            status: true,
            currency: true,
          },
        },
      },
      orderBy: { performedAt: 'desc' },
      skip,
      take: limit,
    });

    return {
      items: items.map((item) => ({
        id: item.id,
        action: item.action,
        changes: item.changes,
        ipAddress: item.ipAddress,
        performedAt: item.performedAt,
        user: {
          id: item.user.id,
          name: item.user.name,
          email: item.user.email,
          role: item.user.role,
        },
        case: item.case
          ? {
              id: item.case.id,
              deceasedName: item.case.deceasedName,
              status: item.case.status,
              currency: item.case.currency,
            }
          : null,
      })),
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
      stats: {
        total,
        caseLinked: caseLinkedCount,
        uniqueUsers: uniqueUsers.length,
      },
      filters: {
        actions: actionRows.map((row) => row.action),
      },
    };
  }

  async record(input: RecordAuditLogInput, db: AuditDbClient = this.prisma) {
    return db.auditLog.create({
      data: {
        userId: input.userId,
        caseId: input.caseId ?? null,
        action: input.action,
        changes: this.toAuditChanges(input.changes),
        ipAddress: input.ipAddress?.trim() || undefined,
      },
    });
  }

  async detachCase(caseId: string, db: AuditDbClient = this.prisma) {
    return db.auditLog.updateMany({
      where: { caseId },
      data: { caseId: null },
    });
  }

  private buildWhere(query: ListAuditLogsQueryDto): Prisma.AuditLogWhereInput {
    const filters: Prisma.AuditLogWhereInput[] = [];
    const search = query.search?.trim();
    const action = query.action?.trim();
    const dateRange = this.buildPerformedAtRange(query.dateFrom, query.dateTo);

    if (search) {
      filters.push({
        OR: [
          { action: { contains: search, mode: 'insensitive' } },
          { user: { name: { contains: search, mode: 'insensitive' } } },
          { user: { email: { contains: search, mode: 'insensitive' } } },
          { case: { deceasedName: { contains: search, mode: 'insensitive' } } },
        ],
      });
    }

    if (action) {
      filters.push({ action });
    }

    if (query.userId) {
      filters.push({ userId: query.userId });
    }

    if (query.caseId) {
      filters.push({ caseId: query.caseId });
    }

    if (dateRange) {
      filters.push({ performedAt: dateRange });
    }

    if (query.hasCase === true) {
      filters.push({ caseId: { not: null } });
    }

    if (query.hasCase === false) {
      filters.push({ caseId: null });
    }

    if (filters.length === 0) {
      return {};
    }

    return { AND: filters };
  }

  private combineWhere(...filters: Prisma.AuditLogWhereInput[]) {
    const normalizedFilters = filters.filter(
      (filter) => Object.keys(filter).length > 0,
    );

    if (normalizedFilters.length === 0) {
      return {};
    }

    if (normalizedFilters.length === 1) {
      return normalizedFilters[0];
    }

    return { AND: normalizedFilters };
  }

  private buildPerformedAtRange(dateFrom?: string, dateTo?: string) {
    if (!dateFrom && !dateTo) {
      return undefined;
    }

    const range: Prisma.DateTimeFilter = {};

    if (dateFrom) {
      const start = new Date(dateFrom);
      start.setUTCHours(0, 0, 0, 0);
      range.gte = start;
    }

    if (dateTo) {
      const end = new Date(dateTo);
      end.setUTCHours(23, 59, 59, 999);
      range.lte = end;
    }

    return range;
  }

  private toAuditChanges(value: unknown): AuditChanges | undefined {
    if (value === undefined) {
      return undefined;
    }

    if (value === null) {
      return Prisma.JsonNull;
    }

    const nestedJson = this.toNestedJson(value);
    return nestedJson === null ? Prisma.JsonNull : nestedJson;
  }

  private toNestedJson(value: unknown): Prisma.InputJsonValue | null {
    if (value === undefined || value === null) {
      return null;
    }

    if (typeof value === 'string' || typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : String(value);
    }

    if (
      typeof value === 'bigint' ||
      typeof value === 'symbol' ||
      typeof value === 'function'
    ) {
      return String(value);
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.toNestedJson(item));
    }

    if (typeof value === 'object') {
      const jsonObject: Record<string, Prisma.InputJsonValue | null> = {};

      for (const [key, item] of Object.entries(
        value as Record<string, unknown>,
      )) {
        jsonObject[key] = this.toNestedJson(item);
      }

      return jsonObject;
    }

    return null;
  }
}
