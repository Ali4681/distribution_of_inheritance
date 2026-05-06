"use client";

import Link from "next/link";
import { startTransition, useDeferredValue, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { useApp } from "@/components/providers/AppProvider";
import { useAuditLogs, useCases, useMe, useUsers } from "@/hooks";
import { AuditLogItem, Role } from "@/types";
import { formatDateTime, formatNumber } from "@/utils/format";
import { auditActionLabel, roleLabel } from "@/utils/labels";

type ScopeFilter = "all" | "linked" | "system";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(source: unknown, key: string) {
  if (!isRecord(source)) return null;
  const value = source[key];
  return typeof value === "string" && value.trim() ? value : null;
}

function getFallbackCaseName(log: AuditLogItem) {
  return readString(log.changes, "deceasedName");
}

function getFallbackCaseId(log: AuditLogItem) {
  return readString(log.changes, "caseId");
}

function getActionTone(action: string) {
  if (action.includes("DELETED")) return "danger";
  if (action.includes("CREATED")) return "success";
  if (action.includes("UPDATED")) return "warning";
  if (action.includes("REPORT")) return "violet";
  if (action.includes("CALCULATED") || action.includes("CLEARED")) return "info";
  return "neutral";
}

export default function AdminAuditLogsPage() {
  const { t, locale } = useApp();
  const { data: me } = useMe();
  const { data: users } = useUsers();
  const { data: cases } = useCases();

  const [search, setSearch] = useState("");
  const [action, setAction] = useState("");
  const [userId, setUserId] = useState("");
  const [caseId, setCaseId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [scope, setScope] = useState<ScopeFilter>("all");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);

  const deferredSearch = useDeferredValue(search.trim());
  const hasCase =
    scope === "linked" ? true : scope === "system" ? false : undefined;
  const { data, loading, error, refetch } = useAuditLogs({
    page,
    limit,
    search: deferredSearch || undefined,
    action: action || undefined,
    userId: userId || undefined,
    caseId: caseId || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    hasCase,
  });

  const selectedLog =
    data.items.find((item) => item.id === selectedLogId) ?? data.items[0] ?? null;
  const selectedUser = userId
    ? (users ?? []).find((item) => item.id === userId) ?? null
    : null;
  const selectedCase = caseId
    ? (cases ?? []).find((item) => item.id === caseId) ?? null
    : null;
  const activeFilters = [
    deferredSearch ? { label: t.search, value: deferredSearch } : null,
    action ? { label: t.action, value: auditActionLabel(action, t) } : null,
    selectedUser ? { label: t.actor, value: selectedUser.name } : null,
    selectedCase ? { label: t.case, value: selectedCase.deceasedName } : null,
    dateFrom ? { label: t.dateFrom, value: dateFrom } : null,
    dateTo ? { label: t.dateTo, value: dateTo } : null,
    scope === "linked"
      ? { label: t.caseScope, value: t.caseLinked }
      : scope === "system"
        ? { label: t.caseScope, value: t.systemEvents }
        : null,
  ].filter((item): item is { label: string; value: string } => item !== null);
  const activeFilterCount = activeFilters.length;

  if (me && me.role !== Role.ADMIN) {
    return (
      <div
        style={{
          padding: "2rem",
          color: "var(--danger)",
          fontFamily: "'Syne', sans-serif",
        }}
      >
        {t.adminOnlyDenied}
      </div>
    );
  }

  function clearFilters() {
    startTransition(() => {
      setSearch("");
      setAction("");
      setUserId("");
      setCaseId("");
      setDateFrom("");
      setDateTo("");
      setScope("all");
      setLimit(20);
      setPage(1);
      setSelectedLogId(null);
    });
  }

  function filterByActor(id: string) {
    startTransition(() => {
      setUserId(id);
      setPage(1);
    });
  }

  function filterByCase(id: string) {
    startTransition(() => {
      setCaseId(id);
      setScope("linked");
      setPage(1);
    });
  }

  const canClearFilters = Boolean(
    search || action || userId || caseId || dateFrom || dateTo || scope !== "all",
  );

  return (
    <div className="al-root">
      <div className="al-backdrop" aria-hidden="true">
        <div className="al-orb al-orb--one" />
        <div className="al-orb al-orb--two" />
        <div className="al-grid" />
      </div>

      <header className="al-hero">
        <div className="al-title-block">
          <div className="al-kicker">
            <span className="al-kicker-mark" />
            <span>{t.admin}</span>
            <span className="al-kicker-dot" />
            <span>{t.auditLogs}</span>
          </div>
          <h1 className="al-title">
            {t.auditTrailTitle}
            <em>{t.auditTrailAccent}</em>
          </h1>
          <p className="al-subtitle">{t.auditTrailSubtitle}</p>
        </div>

        <div className="al-stats">
          {[
            {
              label: t.total,
              value: data.stats.total,
              tone: "var(--primary)",
            },
            {
              label: t.caseLinked,
              value: data.stats.caseLinked,
              tone: "#0ea5a4",
            },
            {
              label: t.uniqueActors,
              value: data.stats.uniqueUsers,
              tone: "#f59e0b",
            },
            {
              label: t.pageResults,
              value: data.items.length,
              tone: "#ef4444",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="al-stat"
              style={{ "--stat-tone": stat.tone } as React.CSSProperties}
            >
              <span className="al-stat-value">{formatNumber(stat.value)}</span>
              <span className="al-stat-label">{stat.label}</span>
            </div>
          ))}
        </div>
      </header>

      <section className="al-toolbar">
        <div className="al-toolbar-head">
          <div className="al-toolbar-copy">
            <div className="al-toolbar-kicker">
              <span className="al-toolbar-kicker-mark" />
              <span>{t.search}</span>
              <span className="al-toolbar-kicker-dot" />
              <span>{t.caseScope}</span>
            </div>
            <h2 className="al-toolbar-title">{t.auditLogs}</h2>
            <p className="al-toolbar-note">{t.auditTrailSubtitle}</p>
          </div>

          <div className="al-toolbar-metrics">
            <div className="al-toolbar-chip al-toolbar-chip--accent">
              <strong>{formatNumber(activeFilterCount)}</strong>
              <span>{activeFilterCount ? t.caseScope : t.allEvents}</span>
            </div>
            <div className="al-toolbar-chip">
              <strong>{formatNumber(data.items.length)}</strong>
              <span>{t.pageResults}</span>
            </div>
          </div>
        </div>

        <div className="al-scope-strip">
          <span className="al-scope-label">{t.caseScope}</span>
          <div className="al-scope-switch" role="tablist" aria-label={t.caseScope}>
            {(
              [
                { value: "all", label: t.allEvents },
                { value: "linked", label: t.caseLinked },
                { value: "system", label: t.systemEvents },
              ] as const
            ).map((item) => (
              <button
                key={item.value}
                type="button"
                className={`al-scope-btn ${scope === item.value ? "is-active" : ""}`}
                onClick={() => {
                  setScope(item.value);
                  setPage(1);
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="al-toolbar-grid">
          <label className="al-field al-field--search">
            <span className="al-field-label">{t.search}</span>
            <div className="al-input-shell">
              <Icon name="search" size={16} />
              <input
                type="text"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder={t.searchAuditLogs}
                className="al-input"
              />
            </div>
          </label>

          <label className="al-field">
            <span className="al-field-label">{t.action}</span>
            <select
              value={action}
              onChange={(event) => {
                setAction(event.target.value);
                setPage(1);
              }}
              className="al-select"
            >
              <option value="">{t.allActions}</option>
              {data.filters.actions.map((value) => (
                <option key={value} value={value}>
                  {auditActionLabel(value, t)}
                </option>
              ))}
            </select>
          </label>

          <label className="al-field">
            <span className="al-field-label">{t.actor}</span>
            <select
              value={userId}
              onChange={(event) => {
                setUserId(event.target.value);
                setPage(1);
              }}
              className="al-select"
            >
              <option value="">{t.allActors}</option>
              {(users ?? []).map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name} ({user.email})
                </option>
              ))}
            </select>
          </label>

          <label className="al-field">
            <span className="al-field-label">{t.case}</span>
            <select
              value={caseId}
              onChange={(event) => {
                setCaseId(event.target.value);
                setPage(1);
              }}
              className="al-select"
            >
              <option value="">{t.allTrackedCases}</option>
              {(cases ?? []).map((item) => (
                <option key={item.id} value={item.id}>
                  {item.deceasedName}
                </option>
              ))}
            </select>
          </label>

          <label className="al-field">
            <span className="al-field-label">{t.rowsPerPage}</span>
            <select
              value={String(limit)}
              onChange={(event) => {
                setLimit(Number(event.target.value));
                setPage(1);
              }}
              className="al-select"
            >
              {[20, 50, 100].map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>

          <label className="al-field">
            <span className="al-field-label">{t.dateFrom}</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(event) => {
                setDateFrom(event.target.value);
                setPage(1);
              }}
              className="al-input al-input--plain"
            />
          </label>

          <label className="al-field">
            <span className="al-field-label">{t.dateTo}</span>
            <input
              type="date"
              value={dateTo}
              onChange={(event) => {
                setDateTo(event.target.value);
                setPage(1);
              }}
              className="al-input al-input--plain"
            />
          </label>
        </div>

        <div className="al-toolbar-foot">
          <div className="al-filter-pills">
            {activeFilters.length ? (
              activeFilters.map((item) => (
                <span key={`${item.label}-${item.value}`} className="al-filter-pill">
                  <small>{item.label}</small>
                  <strong>{item.value}</strong>
                </span>
              ))
            ) : (
              <span className="al-filter-pill al-filter-pill--idle">
                <small>{t.caseScope}</small>
                <strong>{t.allEvents}</strong>
              </span>
            )}
          </div>

          <div className="al-toolbar-actions">
            <button
              type="button"
              className="al-ghost-btn"
              onClick={clearFilters}
              disabled={!canClearFilters}
            >
              {t.clearFilters}
            </button>
            <button type="button" className="al-primary-btn" onClick={refetch}>
              {t.refresh}
            </button>
          </div>
        </div>
      </section>

      {error && (
        <div className="al-banner al-banner--error">
          <span>{error}</span>
          <button type="button" onClick={refetch}>
            {t.refresh}
          </button>
        </div>
      )}

      <section className="al-layout">
        <div className="al-feed">
          <div className="al-feed-head">
            <div className="al-feed-title">
              <h2>{t.auditLogs}</h2>
              <p>
                {formatNumber(data.meta.total)} / {formatNumber(data.items.length)}
              </p>
            </div>
            {loading && <div className="al-loading-pill">{t.loading}</div>}
          </div>

        <div className="al-list-head">
          <span>{t.performedAt}</span>
          <span>{t.action}</span>
          <span>{t.actor}</span>
          <span>{t.case}</span>
          <span>{t.ipAddress}</span>
        </div>

          <div className="al-list">
            {data.items.map((item) => {
              const isActive = item.id === selectedLog?.id;
              const caseName = item.case?.deceasedName ?? getFallbackCaseName(item);

              return (
                <button
                  key={item.id}
                  type="button"
                  className={`al-row ${isActive ? "is-active" : ""}`}
                  onClick={() => setSelectedLogId(item.id)}
                >
                  <span className="al-cell">
                    <span className="al-cell-label">{t.performedAt}</span>
                    <span>{formatDateTime(item.performedAt, locale)}</span>
                  </span>

                  <span className="al-cell">
                    <span className="al-cell-label">{t.action}</span>
                    <span
                      className={`al-badge al-badge--${getActionTone(item.action)}`}
                    >
                      {auditActionLabel(item.action, t)}
                    </span>
                  </span>

                  <span className="al-cell">
                    <span className="al-cell-label">{t.actor}</span>
                    <span className="al-person">
                      <strong>{item.user.name}</strong>
                      <small>
                        {item.user.email} / {roleLabel(item.user.role, t)}
                      </small>
                    </span>
                  </span>

                  <span className="al-cell">
                    <span className="al-cell-label">{t.case}</span>
                    <span className="al-subject">
                      {caseName || t.systemEvent}
                    </span>
                  </span>

                  <span className="al-cell">
                    <span className="al-cell-label">{t.ipAddress}</span>
                    <code>{item.ipAddress ?? "-"}</code>
                  </span>
                </button>
              );
            })}

            {!loading && data.items.length === 0 && (
              <div className="al-empty">
                <div className="al-empty-icon">
                  <Icon name="activity" size={28} />
                </div>
                <h3>{t.noAuditLogsFound}</h3>
                <p>{t.auditTrailSubtitle}</p>
              </div>
            )}
          </div>

          <footer className="al-pagination">
            <div className="al-page-copy">
              <span>
                {formatNumber(data.meta.page)} / {formatNumber(data.meta.totalPages)}
              </span>
              <span>
                {formatNumber(data.meta.total)} {t.total}
              </span>
            </div>

            <div className="al-page-actions">
              <button
                type="button"
                className="al-ghost-btn"
                onClick={() =>
                  startTransition(() =>
                    setPage((current) => Math.max(current - 1, 1)),
                  )
                }
                disabled={!data.meta.hasPreviousPage}
              >
                {t.previous}
              </button>
              <button
                type="button"
                className="al-primary-btn"
                onClick={() =>
                  startTransition(() =>
                    setPage((current) => current + 1),
                  )
                }
                disabled={!data.meta.hasNextPage}
              >
                {t.next}
              </button>
            </div>
          </footer>
        </div>

        <aside className="al-detail">
          {selectedLog ? (
            <>
              <div className="al-detail-head">
                <span
                  className={`al-badge al-badge--${getActionTone(selectedLog.action)}`}
                >
                  {auditActionLabel(selectedLog.action, t)}
                </span>
                <h2>{t.auditDetails}</h2>
                <p>{formatDateTime(selectedLog.performedAt, locale)}</p>
              </div>

              <div className="al-detail-grid">
                <div className="al-detail-card">
                  <span className="al-detail-label">{t.actor}</span>
                  <strong>{selectedLog.user.name}</strong>
                  <small>{selectedLog.user.email}</small>
                  <small>
                    {roleLabel(selectedLog.user.role, t)} / {selectedLog.user.id}
                  </small>
                  <button
                    type="button"
                    className="al-inline-btn"
                    onClick={() => filterByActor(selectedLog.user.id)}
                  >
                    {t.filterByActor}
                  </button>
                </div>

                <div className="al-detail-card">
                  <span className="al-detail-label">{t.case}</span>
                  <strong>
                    {selectedLog.case?.deceasedName ??
                      getFallbackCaseName(selectedLog) ??
                      t.noCaseLinked}
                  </strong>
                  <small>
                    {selectedLog.case?.id ?? getFallbackCaseId(selectedLog) ?? "-"}
                  </small>

                  {selectedLog.case?.id ? (
                    <div className="al-card-actions">
                      <button
                        type="button"
                        className="al-inline-btn"
                        onClick={() => filterByCase(selectedLog.case!.id)}
                      >
                        {t.filterByCase}
                      </button>
                      <Link href={`/cases/${selectedLog.case.id}`} className="al-link">
                        {t.openCase}
                      </Link>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="al-meta-panel">
                <div className="al-meta-row">
                  <span>{t.eventId}</span>
                  <code>{selectedLog.id}</code>
                </div>
                <div className="al-meta-row">
                  <span>{t.ipAddress}</span>
                  <code>{selectedLog.ipAddress ?? "-"}</code>
                </div>
                <div className="al-meta-row">
                  <span>{t.action}</span>
                  <code>{selectedLog.action}</code>
                </div>
              </div>
            </>
          ) : (
            <div className="al-placeholder">
              <Icon name="activity" size={26} />
              <p>{t.selectAuditEntry}</p>
            </div>
          )}
        </aside>
      </section>

      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Syne:wght@400;500;700;800&family=IBM+Plex+Mono:wght@400;500&family=Instrument+Serif:ital@0;1&display=swap");

        .al-root {
          position: relative;
          min-height: 100vh;
          padding: 2rem;
          font-family: "Syne", sans-serif;
        }

        .al-backdrop {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 0;
          overflow: hidden;
        }

        .al-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(120px);
          opacity: 0.16;
        }

        .al-orb--one {
          width: 34rem;
          height: 34rem;
          top: -10rem;
          inset-inline-start: -8rem;
          background: #0f766e;
        }

        .al-orb--two {
          width: 28rem;
          height: 28rem;
          bottom: -10rem;
          inset-inline-end: -6rem;
          background: #f59e0b;
        }

        .al-grid {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(
              to right,
              color-mix(in srgb, var(--border) 34%, transparent) 1px,
              transparent 1px
            ),
            linear-gradient(
              to bottom,
              color-mix(in srgb, var(--border) 34%, transparent) 1px,
              transparent 1px
            );
          background-size: 3rem 3rem;
          mask-image: linear-gradient(to bottom, transparent, black 18%, black 82%, transparent);
          opacity: 0.25;
        }

        .al-hero,
        .al-toolbar,
        .al-banner,
        .al-layout {
          position: relative;
          z-index: 1;
        }

        .al-hero {
          display: grid;
          grid-template-columns: minmax(0, 1.2fr) minmax(18rem, 0.8fr);
          gap: 1.5rem;
          align-items: end;
          margin-bottom: 1.5rem;
        }

        .al-kicker {
          display: inline-flex;
          align-items: center;
          gap: 0.6rem;
          font-size: 0.72rem;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: var(--primary);
          margin-bottom: 0.9rem;
        }

        .al-kicker-mark {
          width: 2.2rem;
          height: 1px;
          background: currentColor;
        }

        .al-kicker-dot {
          width: 0.26rem;
          height: 0.26rem;
          border-radius: 999px;
          background: currentColor;
        }

        .al-title {
          margin: 0;
          display: flex;
          flex-direction: column;
          font-family: "Instrument Serif", serif;
          font-size: clamp(2.8rem, 5vw, 4.8rem);
          font-weight: 400;
          line-height: 0.92;
          letter-spacing: -0.04em;
        }

        .al-title em {
          color: #0f766e;
          font-style: italic;
        }

        .al-subtitle {
          max-width: 42rem;
          margin: 1rem 0 0;
          color: var(--muted);
          line-height: 1.7;
          font-size: 0.98rem;
        }

        .al-stats {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 0.85rem;
        }

        .al-stat {
          padding: 1rem 1.1rem;
          border-radius: 1.1rem;
          border: 1px solid color-mix(in srgb, var(--stat-tone) 22%, var(--border));
          background:
            linear-gradient(
              145deg,
              color-mix(in srgb, var(--stat-tone) 10%, var(--surface)),
              var(--surface)
            );
          box-shadow: 0 18px 44px -36px color-mix(in srgb, var(--stat-tone) 45%, transparent);
        }

        .al-stat-value {
          display: block;
          font-family: "IBM Plex Mono", monospace;
          font-size: 1.9rem;
          font-weight: 500;
          color: var(--stat-tone);
        }

        .al-stat-label {
          display: block;
          margin-top: 0.25rem;
          font-size: 0.73rem;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--muted);
        }

        .al-toolbar {
          display: grid;
          gap: 1.15rem;
          margin-bottom: 1rem;
          padding: 1.15rem;
          border-radius: 1.55rem;
          border: 1px solid color-mix(in srgb, #0f766e 14%, var(--border));
          background:
            radial-gradient(
              circle at top left,
              color-mix(in srgb, #0f766e 10%, transparent),
              transparent 32%
            ),
            linear-gradient(
              180deg,
              color-mix(in srgb, var(--surface) 92%, transparent),
              color-mix(in srgb, var(--surface) 97%, var(--surface-2, #edf2f7))
            );
          backdrop-filter: blur(22px);
          box-shadow:
            0 24px 54px -40px rgba(15, 23, 42, 0.35),
            inset 0 1px 0 color-mix(in srgb, white 38%, transparent);
        }

        .al-toolbar-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 1rem;
          padding-bottom: 0.25rem;
        }

        .al-toolbar-copy {
          display: grid;
          gap: 0.55rem;
        }

        .al-toolbar-kicker {
          display: inline-flex;
          align-items: center;
          gap: 0.55rem;
          font-size: 0.68rem;
          font-weight: 800;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: var(--primary);
        }

        .al-toolbar-kicker-mark {
          width: 1.8rem;
          height: 1px;
          background: currentColor;
        }

        .al-toolbar-kicker-dot {
          width: 0.24rem;
          height: 0.24rem;
          border-radius: 999px;
          background: currentColor;
        }

        .al-toolbar-title {
          margin: 0;
          font-family: "Instrument Serif", serif;
          font-size: clamp(1.6rem, 2.6vw, 2.25rem);
          font-weight: 400;
          letter-spacing: -0.04em;
        }

        .al-toolbar-note {
          max-width: 42rem;
          margin: 0;
          color: var(--muted);
          line-height: 1.7;
          font-size: 0.92rem;
        }

        .al-toolbar-metrics {
          display: flex;
          align-items: stretch;
          gap: 0.75rem;
          flex-wrap: wrap;
        }

        .al-toolbar-chip {
          display: grid;
          gap: 0.2rem;
          min-width: 8rem;
          padding: 0.8rem 0.95rem;
          border-radius: 1rem;
          border: 1px solid var(--border);
          background: color-mix(in srgb, var(--surface) 92%, white 8%);
        }

        .al-toolbar-chip strong {
          font-family: "IBM Plex Mono", monospace;
          font-size: 1.2rem;
          font-weight: 500;
          color: var(--text);
        }

        .al-toolbar-chip span {
          font-size: 0.72rem;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--muted);
        }

        .al-toolbar-chip--accent {
          border-color: color-mix(in srgb, #0f766e 20%, var(--border));
          background:
            linear-gradient(
              140deg,
              color-mix(in srgb, #0f766e 14%, var(--surface)),
              color-mix(in srgb, #f59e0b 10%, var(--surface))
            );
        }

        .al-toolbar-chip--accent strong {
          color: #0f766e;
        }

        .al-scope-strip {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          padding: 0.9rem 1rem;
          border-radius: 1.15rem;
          border: 1px solid color-mix(in srgb, var(--primary) 14%, var(--border));
          background:
            linear-gradient(
              90deg,
              color-mix(in srgb, var(--primary) 6%, transparent),
              color-mix(in srgb, var(--surface) 96%, transparent)
            );
        }

        .al-scope-label {
          font-size: 0.74rem;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--muted);
          white-space: nowrap;
        }

        .al-scope-switch {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.28rem;
          border-radius: 999px;
          border: 1px solid var(--border);
          background: color-mix(in srgb, var(--surface) 94%, white 6%);
        }

        .al-scope-btn {
          min-height: 2.35rem;
          padding: 0 0.95rem;
          border: none;
          border-radius: 999px;
          background: transparent;
          color: var(--muted);
          font-family: "Syne", sans-serif;
          font-size: 0.8rem;
          font-weight: 700;
          cursor: pointer;
          transition:
            background 0.18s ease,
            color 0.18s ease,
            transform 0.18s ease,
            box-shadow 0.18s ease;
        }

        .al-scope-btn:hover {
          color: var(--text);
        }

        .al-scope-btn.is-active {
          background: linear-gradient(135deg, #0f766e, #115e59);
          color: white;
          box-shadow: 0 12px 24px -18px rgba(15, 118, 110, 0.8);
        }

        .al-toolbar-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 0.95rem;
        }

        .al-field {
          display: grid;
          gap: 0.5rem;
        }

        .al-field--search {
          grid-column: span 2;
        }

        .al-field-label {
          font-size: 0.72rem;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--muted);
        }

        .al-input-shell,
        .al-select,
        .al-input--plain {
          display: flex;
          align-items: center;
          gap: 0.55rem;
          min-height: 3rem;
          padding: 0 0.95rem;
          border-radius: 1rem;
          border: 1px solid color-mix(in srgb, var(--border) 88%, transparent);
          background:
            linear-gradient(
              180deg,
              color-mix(in srgb, var(--surface) 97%, white 3%),
              color-mix(in srgb, var(--surface-2, #edf2f7) 58%, var(--surface))
            );
          color: var(--text);
          box-shadow:
            inset 0 1px 0 color-mix(in srgb, white 44%, transparent),
            0 10px 20px -18px rgba(15, 23, 42, 0.35);
          transition:
            border-color 0.18s ease,
            box-shadow 0.18s ease,
            transform 0.18s ease;
        }

        .al-input-shell:focus-within,
        .al-select:focus,
        .al-input--plain:focus {
          border-color: color-mix(in srgb, var(--primary) 44%, var(--border));
          box-shadow:
            inset 0 1px 0 color-mix(in srgb, white 44%, transparent),
            0 0 0 4px color-mix(in srgb, var(--primary) 12%, transparent),
            0 18px 28px -22px rgba(15, 118, 110, 0.35);
          transform: translateY(-1px);
        }

        .al-input,
        .al-select,
        .al-input--plain {
          width: 100%;
          font: inherit;
          border: none;
          outline: none;
          background: transparent;
          color: inherit;
        }

        .al-select {
          appearance: none;
          cursor: pointer;
        }

        .al-toolbar-foot {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          padding-top: 0.2rem;
        }

        .al-filter-pills {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          flex-wrap: wrap;
        }

        .al-filter-pill {
          display: inline-flex;
          align-items: center;
          gap: 0.55rem;
          min-height: 2.45rem;
          padding: 0 0.85rem;
          border-radius: 999px;
          border: 1px solid color-mix(in srgb, var(--primary) 14%, var(--border));
          background:
            linear-gradient(
              180deg,
              color-mix(in srgb, var(--surface) 94%, white 6%),
              color-mix(in srgb, var(--primary) 6%, var(--surface))
            );
          box-shadow: 0 12px 24px -24px rgba(15, 23, 42, 0.35);
        }

        .al-filter-pill small {
          color: var(--muted);
          font-size: 0.68rem;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .al-filter-pill strong {
          font-size: 0.84rem;
          font-weight: 700;
          color: var(--text);
        }

        .al-filter-pill--idle {
          border-style: dashed;
          background: color-mix(in srgb, var(--surface) 92%, transparent);
        }

        .al-toolbar-actions {
          display: flex;
          justify-content: flex-end;
          gap: 0.75rem;
        }

        .al-primary-btn,
        .al-ghost-btn,
        .al-inline-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.45rem;
          min-height: 2.8rem;
          padding: 0 1rem;
          border-radius: 0.9rem;
          border: 1px solid transparent;
          font-family: "Syne", sans-serif;
          font-size: 0.85rem;
          font-weight: 700;
          cursor: pointer;
          transition:
            transform 0.18s ease,
            box-shadow 0.18s ease,
            border-color 0.18s ease,
            background 0.18s ease;
        }

        .al-primary-btn {
          background: linear-gradient(135deg, #0f766e, #115e59);
          color: white;
          box-shadow: 0 14px 32px -22px rgba(15, 118, 110, 0.7);
        }

        .al-ghost-btn,
        .al-inline-btn {
          background: var(--surface);
          color: var(--text);
          border-color: var(--border);
        }

        .al-primary-btn:hover,
        .al-ghost-btn:hover,
        .al-inline-btn:hover,
        .al-link:hover {
          transform: translateY(-1px);
        }

        .al-primary-btn:disabled,
        .al-ghost-btn:disabled {
          opacity: 0.45;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }

        .al-banner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          margin-bottom: 1rem;
          padding: 0.95rem 1rem;
          border-radius: 1rem;
          border: 1px solid color-mix(in srgb, var(--danger) 30%, var(--border));
          background: color-mix(in srgb, var(--danger) 8%, var(--surface));
          color: var(--danger);
        }

        .al-banner button {
          border: none;
          background: transparent;
          color: inherit;
          font: inherit;
          font-weight: 700;
          cursor: pointer;
        }

        .al-layout {
          display: grid;
          grid-template-columns: minmax(0, 1.45fr) minmax(21rem, 0.9fr);
          gap: 1rem;
          align-items: start;
        }

        .al-feed,
        .al-detail {
          border-radius: 1.35rem;
          border: 1px solid var(--border);
          background: color-mix(in srgb, var(--surface) 92%, transparent);
          backdrop-filter: blur(18px);
          box-shadow: 0 22px 56px -40px rgba(15, 23, 42, 0.4);
        }

        .al-feed {
          overflow: hidden;
        }

        .al-feed-head,
        .al-pagination,
        .al-detail-head,
        .al-meta-panel {
          padding-inline: 1.1rem;
        }

        .al-feed-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          padding-top: 1rem;
          padding-bottom: 0.9rem;
          border-bottom: 1px solid var(--border);
        }

        .al-feed-title h2,
        .al-detail-head h2 {
          margin: 0;
        }

        .al-feed-title p,
        .al-detail-head p {
          margin: 0.35rem 0 0;
          color: var(--muted);
          font-family: "IBM Plex Mono", monospace;
          font-size: 0.78rem;
        }

        .al-loading-pill {
          padding: 0.45rem 0.7rem;
          border-radius: 999px;
          background: color-mix(in srgb, var(--primary) 10%, transparent);
          color: var(--primary);
          font-size: 0.78rem;
          font-weight: 700;
        }

        .al-list-head,
        .al-row {
          display: grid;
          grid-template-columns: 1.15fr 1fr 1.2fr 1.1fr 0.8fr;
          gap: 0.8rem;
        }

        .al-list-head {
          padding: 0.85rem 1.1rem;
          border-bottom: 1px solid var(--border);
          background: color-mix(in srgb, var(--surface-2, #edf2f7) 55%, var(--surface));
          color: var(--muted);
          font-size: 0.7rem;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .al-list {
          display: grid;
        }

        .al-row {
          width: 100%;
          padding: 1rem 1.1rem;
          border: none;
          border-bottom: 1px solid color-mix(in srgb, var(--border) 60%, transparent);
          background: transparent;
          text-align: start;
          cursor: pointer;
          transition: background 0.18s ease, transform 0.18s ease;
        }

        .al-row:hover {
          background: color-mix(in srgb, #0f766e 4%, transparent);
        }

        .al-row.is-active {
          background: linear-gradient(
            90deg,
            color-mix(in srgb, #0f766e 12%, transparent),
            color-mix(in srgb, #0f766e 3%, transparent)
          );
          box-shadow: inset 3px 0 0 #0f766e;
        }

        .al-cell {
          display: grid;
          gap: 0.35rem;
          min-width: 0;
          color: var(--text);
        }

        .al-cell code,
        .al-meta-row code,
        .al-page-copy {
          font-family: "IBM Plex Mono", monospace;
        }

        .al-cell-label {
          display: none;
          font-size: 0.68rem;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--muted);
        }

        .al-person,
        .al-subject {
          display: grid;
          gap: 0.2rem;
          min-width: 0;
        }

        .al-person strong,
        .al-detail-card strong {
          font-size: 0.95rem;
        }

        .al-person small,
        .al-detail-card small {
          color: var(--muted);
          overflow-wrap: anywhere;
        }

        .al-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: fit-content;
          max-width: 100%;
          padding: 0.42rem 0.72rem;
          border-radius: 999px;
          font-size: 0.72rem;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .al-badge--success {
          background: color-mix(in srgb, #10b981 15%, transparent);
          color: #047857;
        }

        .al-badge--warning {
          background: color-mix(in srgb, #f59e0b 16%, transparent);
          color: #b45309;
        }

        .al-badge--danger {
          background: color-mix(in srgb, #ef4444 14%, transparent);
          color: #b91c1c;
        }

        .al-badge--violet {
          background: color-mix(in srgb, #6366f1 14%, transparent);
          color: #4338ca;
        }

        .al-badge--info {
          background: color-mix(in srgb, #0ea5a4 14%, transparent);
          color: #0f766e;
        }

        .al-badge--neutral {
          background: color-mix(in srgb, var(--muted) 12%, transparent);
          color: var(--muted);
        }

        .al-empty,
        .al-placeholder {
          display: grid;
          place-items: center;
          gap: 0.85rem;
          padding: 3rem 1.5rem;
          text-align: center;
          color: var(--muted);
        }

        .al-empty h3,
        .al-empty p,
        .al-placeholder p {
          margin: 0;
        }

        .al-empty-icon {
          display: grid;
          place-items: center;
          width: 3.5rem;
          height: 3.5rem;
          border-radius: 1rem;
          background: color-mix(in srgb, var(--primary) 10%, transparent);
          color: var(--primary);
        }

        .al-pagination {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          padding-top: 1rem;
          padding-bottom: 1rem;
          border-top: 1px solid var(--border);
        }

        .al-page-copy {
          display: flex;
          gap: 1rem;
          color: var(--muted);
          font-size: 0.8rem;
        }

        .al-page-actions,
        .al-card-actions {
          display: flex;
          gap: 0.65rem;
          flex-wrap: wrap;
        }

        .al-detail {
          position: sticky;
          top: 1.2rem;
          padding-top: 1rem;
          overflow: hidden;
        }

        .al-detail-head {
          padding-bottom: 1rem;
          border-bottom: 1px solid var(--border);
        }

        .al-detail-grid {
          display: grid;
          gap: 0.85rem;
          padding: 1rem 1.1rem;
        }

        .al-detail-card {
          display: grid;
          gap: 0.35rem;
          padding: 0.95rem;
          border-radius: 1rem;
          border: 1px solid var(--border);
          background: color-mix(in srgb, var(--surface) 96%, var(--surface-2, #edf2f7));
        }

        .al-detail-label {
          font-size: 0.72rem;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--muted);
        }

        .al-link {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 2.3rem;
          padding: 0 0.9rem;
          border-radius: 0.85rem;
          border: 1px solid var(--border);
          background: var(--surface);
          color: var(--text);
          text-decoration: none;
          font-size: 0.82rem;
          font-weight: 700;
          transition:
            transform 0.18s ease,
            box-shadow 0.18s ease;
        }

        .al-meta-panel {
          display: grid;
          gap: 0.7rem;
          padding-top: 0.1rem;
          padding-bottom: 0.8rem;
        }

        .al-meta-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.8rem;
          padding: 0.8rem 0;
          border-bottom: 1px solid color-mix(in srgb, var(--border) 55%, transparent);
        }

        .al-meta-row span {
          color: var(--muted);
        }

        .al-meta-row code {
          color: var(--text);
          font-size: 0.78rem;
          overflow-wrap: anywhere;
          text-align: end;
        }

        @media (max-width: 1180px) {
          .al-hero,
          .al-layout {
            grid-template-columns: 1fr;
          }

          .al-detail {
            position: static;
          }
        }

        @media (max-width: 900px) {
          .al-root {
            padding: 1rem;
          }

          .al-toolbar-head,
          .al-scope-strip {
            display: grid;
          }

          .al-toolbar-grid {
            grid-template-columns: 1fr 1fr;
          }

          .al-field--search {
            grid-column: span 2;
          }

          .al-list-head {
            display: none;
          }

          .al-row {
            grid-template-columns: 1fr 1fr;
          }

          .al-cell-label {
            display: block;
          }

        }

        @media (max-width: 640px) {
          .al-stats,
          .al-toolbar-grid,
          .al-row {
            grid-template-columns: 1fr;
          }

          .al-toolbar-metrics,
          .al-scope-switch,
          .al-toolbar-foot {
            width: 100%;
          }

          .al-scope-switch {
            display: grid;
            grid-template-columns: 1fr;
          }

          .al-field--search {
            grid-column: span 1;
          }

          .al-toolbar-actions,
          .al-pagination,
          .al-toolbar-foot {
            flex-direction: column;
            align-items: stretch;
          }

          .al-page-copy,
          .al-page-actions {
            justify-content: space-between;
          }
        }
      `}</style>
    </div>
  );
}
