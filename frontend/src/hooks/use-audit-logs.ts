"use client";

import { useEffect, useState } from "react";
import { auditLogsService } from "@/services";
import { AuditLogListResponse, AuditLogQuery } from "@/types";

const EMPTY_AUDIT_LOGS: AuditLogListResponse = {
  items: [],
  meta: {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  },
  stats: {
    total: 0,
    caseLinked: 0,
    uniqueUsers: 0,
  },
  filters: {
    actions: [],
  },
};

function toErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "An unexpected error occurred";
}

export function useAuditLogs(query: AuditLogQuery) {
  const {
    page,
    limit,
    search,
    action,
    userId,
    caseId,
    dateFrom,
    dateTo,
    hasCase,
  } = query;
  const [data, setData] = useState<AuditLogListResponse>(EMPTY_AUDIT_LOGS);
  const [manualLoading, setManualLoading] = useState(true);
  const [errorState, setErrorState] = useState<string | null>(null);
  const [settledQueryKey, setSettledQueryKey] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const queryKey = JSON.stringify([
    page ?? null,
    limit ?? null,
    search ?? null,
    action ?? null,
    userId ?? null,
    caseId ?? null,
    dateFrom ?? null,
    dateTo ?? null,
    hasCase ?? null,
  ]);

  useEffect(() => {
    let cancelled = false;

    auditLogsService
      .findAll({
        page,
        limit,
        search,
        action,
        userId,
        caseId,
        dateFrom,
        dateTo,
        hasCase,
      })
      .then(
      (result) => {
        if (cancelled) return;
        setData(result);
        setErrorState(null);
        setSettledQueryKey(queryKey);
        setManualLoading(false);
      },
      (err: unknown) => {
        if (cancelled) return;
        setErrorState(toErrorMessage(err));
        setSettledQueryKey(queryKey);
        setManualLoading(false);
      },
    );

    return () => {
      cancelled = true;
    };
  }, [
    page,
    limit,
    search,
    action,
    userId,
    caseId,
    dateFrom,
    dateTo,
    hasCase,
    queryKey,
    reloadToken,
  ]);

  return {
    data,
    loading: manualLoading || settledQueryKey !== queryKey,
    error: settledQueryKey === queryKey ? errorState : null,
    refetch: () => {
      setManualLoading(true);
      setErrorState(null);
      setReloadToken((value) => value + 1);
    },
  };
}
