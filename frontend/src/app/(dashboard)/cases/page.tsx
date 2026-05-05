"use client";

import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";
import toast from "react-hot-toast";
import { useDialog } from "@/components/providers/DialogProvider";
import { Icon } from "@/components/ui/Icon";
import { useApp } from "@/components/providers/AppProvider";
import { useCases, useDeleteCase } from "@/hooks/use-cases";
import { CaseStatus } from "@/types";
import { formatDate, formatMoney, formatNumber } from "@/utils/format";
import { caseStatusLabel } from "@/utils/labels";

function subscribe() {
  return () => {};
}

function useIsClient() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}

export default function CasesPage() {
  const { t, locale } = useApp();
  const { confirm } = useDialog();
  const { data: cases, loading, error, refetch } = useCases();
  const { deleteCase, loading: deleting } = useDeleteCase();
  const mounted = useIsClient();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"ALL" | CaseStatus>("ALL");

  const filtered = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    return (cases ?? []).filter((item) => {
      const matchesSearch =
        !normalized || item.deceasedName.toLowerCase().includes(normalized);
      const matchesStatus = filter === "ALL" || item.status === filter;
      return matchesSearch && matchesStatus;
    });
  }, [cases, filter, search]);

  const stats = {
    total: cases?.length ?? 0,
    calculated:
      cases?.filter((item) => item.status === CaseStatus.CALCULATED).length ??
      0,
    draft: cases?.filter((item) => item.status === CaseStatus.DRAFT).length ?? 0,
    closed:
      cases?.filter((item) => item.status === CaseStatus.CLOSED).length ?? 0,
  };

  async function handleDelete(id: string) {
    const approved = await confirm({
      title: t.deleteCaseTitle,
      description: t.deleteThisCase,
      confirmLabel: t.delete,
      cancelLabel: t.cancel,
      tone: "danger",
    });
    if (!approved) return;
    try {
      await deleteCase(id);
      toast.success(t.deleted);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.deleteFailed);
    }
  }

  return (
    <div className="cp-root">
      <div className="cp-bg" aria-hidden="true">
        <div className="cp-bg-grid" />
        <div className="cp-bg-ring cp-bg-ring--1" />
        <div className="cp-bg-ring cp-bg-ring--2" />
      </div>

      <header className={`cp-header ${mounted ? "cp-header--in" : ""}`}>
        <div>
          <p className="cp-eyebrow">
            <span className="cp-eyebrow-line" />
            {t.cases}
          </p>
          <h2 className="cp-title">
            {t.casePortfolioTitle}
            <em>{t.casePortfolioAccent}</em>
          </h2>
          <p className="cp-subtitle">{t.appDescription}</p>
        </div>

        <Link href="/cases/new" className="cp-create-btn">
          <Icon name="plus" />
          <span>{t.newCase}</span>
          <span className="cp-create-arrow" aria-hidden="true">
            {locale === "ar" ? "←" : "→"}
          </span>
        </Link>
      </header>

      <section className="cp-metrics">
        {[
          { label: t.total, value: stats.total, tone: "teal" },
          { label: t.draft, value: stats.draft, tone: "amber" },
          { label: t.calculated, value: stats.calculated, tone: "green" },
          { label: t.closed, value: stats.closed, tone: "neutral" },
        ].map((metric, index) => (
          <div
            key={metric.label}
            className={`cp-metric cp-metric--${metric.tone} ${mounted ? "cp-metric--in" : ""}`}
            style={{ "--metric-i": index } as React.CSSProperties}
          >
            <span className="cp-metric-value">{formatNumber(metric.value)}</span>
            <span className="cp-metric-label">{metric.label}</span>
          </div>
        ))}
      </section>

      <section className={`cp-toolbar ${mounted ? "cp-toolbar--in" : ""}`}>
        <label className="cp-search">
          <span className="cp-control-label">{t.search}</span>
          <div className="cp-search-box">
            <Icon name="search" size={16} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t.deceasedName}
            />
          </div>
        </label>

        <div className="cp-filter-group" aria-label={t.status}>
          {(["ALL", CaseStatus.DRAFT, CaseStatus.CALCULATED, CaseStatus.CLOSED] as const).map(
            (item) => (
              <button
                key={item}
                type="button"
                className={`cp-filter ${filter === item ? "cp-filter--active" : ""}`}
                onClick={() => setFilter(item)}
              >
                {item === "ALL" ? t.all : caseStatusLabel(item, t)}
              </button>
            ),
          )}
        </div>
      </section>

      <section className={`cp-panel ${mounted ? "cp-panel--in" : ""}`}>
        <div className="cp-panel-head">
          <div>
            <p className="cp-panel-kicker">{t.registry}</p>
            <h3 className="cp-panel-title">
              {formatNumber(filtered.length)} / {formatNumber(stats.total)}{" "}
              {t.cases}
            </h3>
          </div>
        </div>

        {loading ? (
          <div className="cp-state">
            <div className="cp-loader">
              {[...Array(4)].map((_, index) => (
                <span
                  key={index}
                  style={{ "--loader-i": index } as React.CSSProperties}
                />
              ))}
            </div>
            <p>{t.loading}</p>
          </div>
        ) : error ? (
          <div className="cp-state cp-state--error">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="cp-empty">
            <div className="cp-empty-mark">00</div>
            <p>{t.noCases}</p>
            <Link href="/cases/new" className="cp-empty-link">
              {t.newCase}
            </Link>
          </div>
        ) : (
          <div className="cp-table-wrap">
            <table className="cp-table">
              <thead>
                <tr>
                  <th>{t.deceasedName}</th>
                  <th>{t.deathDate}</th>
                  <th>{t.totalEstate}</th>
                  <th>{t.familyMembers}</th>
                  <th>{t.status}</th>
                  <th>{t.actions}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item, index) => (
                  <tr
                    key={item.id}
                    style={{ "--row-i": index } as React.CSSProperties}
                  >
                    <td>
                      <div className="cp-case">
                        <span className="cp-avatar">
                          {item.deceasedName.charAt(0)}
                        </span>
                        <div>
                          <strong>{item.deceasedName}</strong>
                          <small>{item.currency}</small>
                        </div>
                      </div>
                    </td>
                    <td>{formatDate(item.deathDate, locale)}</td>
                    <td>{formatMoney(item.totalEstate, item.currency, locale)}</td>
                    <td>
                      <span className="cp-count">
                        {item._count?.familyMembers ?? 0}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`cp-status cp-status--${item.status.toLowerCase()}`}
                      >
                        <span />
                        {caseStatusLabel(item.status, t)}
                      </span>
                    </td>
                    <td>
                      <div className="cp-actions">
                        <Link href={`/cases/${item.id}`} className="cp-open-btn">
                          {t.open}
                        </Link>
                        <button
                          type="button"
                          className="cp-delete-btn"
                          disabled={deleting}
                          onClick={() => handleDelete(item.id)}
                          title={t.delete}
                        >
                          <Icon name="trash" size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@400;500&family=Instrument+Serif:ital@0;1&display=swap");

        .cp-root {
          position: relative;
          min-height: 100vh;
          padding-bottom: 3rem;
          font-family: "Syne", sans-serif;
        }
        .cp-bg {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 0;
          overflow: hidden;
        }
        .cp-bg-grid {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(var(--border) 1px, transparent 1px),
            linear-gradient(90deg, var(--border) 1px, transparent 1px);
          background-size: 56px 56px;
          mask-image: radial-gradient(
            ellipse at 58% 8%,
            black 22%,
            transparent 74%
          );
          opacity: 0.17;
        }
        .cp-bg-ring {
          position: absolute;
          border-radius: 50%;
          border: 1px solid color-mix(in srgb, var(--primary) 14%, transparent);
        }
        .cp-bg-ring--1 {
          width: 720px;
          height: 720px;
          top: -390px;
          right: -260px;
        }
        .cp-bg-ring--2 {
          width: 460px;
          height: 460px;
          left: -210px;
          bottom: -190px;
          border-color: color-mix(in srgb, var(--accent) 18%, transparent);
        }
        .cp-header,
        .cp-metrics,
        .cp-toolbar,
        .cp-panel {
          position: relative;
          z-index: 1;
        }
        .cp-header {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 24px;
          margin-bottom: 22px;
          padding-top: 10px;
          opacity: 0;
          transform: translateY(18px);
          transition:
            opacity 0.7s ease,
            transform 0.7s ease;
        }
        .cp-header--in {
          opacity: 1;
          transform: translateY(0);
        }
        .cp-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          margin: 0 0 10px;
          color: var(--primary);
          font-family: "DM Mono", monospace;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.24em;
          text-transform: uppercase;
        }
        .cp-eyebrow-line {
          width: 28px;
          height: 1px;
          background: var(--primary);
        }
        .cp-title {
          display: flex;
          flex-direction: column;
          margin: 0;
          font-family: "Instrument Serif", Georgia, serif;
          font-size: clamp(44px, 7vw, 76px);
          font-weight: 400;
          letter-spacing: -0.03em;
          line-height: 0.92;
        }
        .cp-title em {
          color: var(--primary);
          font-style: italic;
        }
        .cp-subtitle {
          max-width: 560px;
          margin: 16px 0 0;
          color: var(--muted);
          font-family: "DM Mono", monospace;
          font-size: 13px;
          line-height: 1.7;
        }
        .cp-create-btn {
          display: inline-flex;
          min-height: 50px;
          align-items: center;
          justify-content: center;
          gap: 10px;
          border-radius: 14px;
          padding: 0 22px;
          background: linear-gradient(
            135deg,
            var(--primary),
            color-mix(in srgb, var(--primary) 55%, #111)
          );
          color: white;
          font-weight: 800;
          text-decoration: none;
          box-shadow: 0 16px 34px -16px
            color-mix(in srgb, var(--primary) 68%, transparent);
        }
        .dark .cp-create-btn {
          color: #082f2c;
        }
        .cp-create-arrow {
          font-family: "DM Mono", monospace;
        }
        .cp-metrics {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 14px;
          margin-bottom: 16px;
        }
        .cp-metric {
          position: relative;
          min-height: 108px;
          overflow: hidden;
          border: 1px solid var(--border);
          border-radius: 16px;
          background: var(--surface);
          padding: 18px;
          opacity: 0;
          transform: translateY(14px);
          transition:
            opacity 0.55s ease calc(var(--metric-i) * 65ms),
            transform 0.55s ease calc(var(--metric-i) * 65ms);
        }
        .cp-metric--in {
          opacity: 1;
          transform: translateY(0);
        }
        .cp-metric::after {
          content: "";
          position: absolute;
          inset-inline: 18px;
          bottom: 0;
          height: 3px;
          background: var(--primary);
        }
        .cp-metric--amber::after {
          background: var(--warning);
        }
        .cp-metric--green::after {
          background: var(--success);
        }
        .cp-metric--neutral::after {
          background: var(--muted);
        }
        .cp-metric-value {
          display: block;
          font-family: "DM Mono", monospace;
          font-variant-numeric: tabular-nums;
          font-feature-settings: "tnum";
          font-size: 34px;
          font-weight: 800;
          line-height: 1;
        }
        .cp-metric-label {
          display: block;
          margin-top: 12px;
          color: var(--muted);
          font-family: "DM Mono", monospace;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
        }
        .cp-toolbar {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 14px;
          margin-bottom: 16px;
          opacity: 0;
          transform: translateY(14px);
          transition:
            opacity 0.65s ease 0.1s,
            transform 0.65s ease 0.1s;
        }
        .cp-toolbar--in {
          opacity: 1;
          transform: translateY(0);
        }
        .cp-search,
        .cp-filter-group {
          border: 1px solid var(--border);
          border-radius: 16px;
          background: var(--surface);
          padding: 12px;
        }
        .cp-control-label {
          display: block;
          margin-bottom: 8px;
          color: var(--muted);
          font-family: "DM Mono", monospace;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.18em;
          text-transform: uppercase;
        }
        .cp-search-box {
          display: flex;
          align-items: center;
          gap: 10px;
          min-height: 42px;
          border-bottom: 1.5px solid var(--border);
          color: var(--muted);
        }
        .cp-search-box input {
          width: 100%;
          border: none;
          outline: none;
          background: transparent;
          color: var(--text);
          font: inherit;
        }
        .cp-filter-group {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .cp-filter {
          min-height: 38px;
          border: 1px solid transparent;
          border-radius: 10px;
          background: transparent;
          color: var(--muted);
          padding: 0 12px;
          font-family: "DM Mono", monospace;
          font-size: 11px;
          font-weight: 700;
        }
        .cp-filter--active {
          border-color: color-mix(in srgb, var(--primary) 26%, var(--border));
          background: color-mix(in srgb, var(--primary) 10%, transparent);
          color: var(--primary);
        }
        .cp-panel {
          overflow: hidden;
          border: 1px solid var(--border);
          border-radius: 20px;
          background: var(--surface);
          box-shadow: 0 30px 70px -42px rgba(0, 0, 0, 0.24);
          opacity: 0;
          transform: translateY(16px);
          transition:
            opacity 0.7s ease 0.16s,
            transform 0.7s ease 0.16s;
        }
        .cp-panel--in {
          opacity: 1;
          transform: translateY(0);
        }
        .cp-panel-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 18px 22px;
          border-bottom: 1px solid var(--border);
          background: color-mix(in srgb, var(--surface-2) 54%, var(--surface));
        }
        .cp-panel-kicker {
          margin: 0 0 5px;
          color: var(--primary);
          font-family: "DM Mono", monospace;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.2em;
          text-transform: uppercase;
        }
        .cp-panel-title {
          margin: 0;
          font-size: 20px;
          font-weight: 800;
        }
        .cp-state,
        .cp-empty {
          padding: 46px 22px;
          text-align: center;
          color: var(--muted);
          font-family: "DM Mono", monospace;
        }
        .cp-state--error {
          color: var(--danger);
        }
        .cp-loader {
          display: inline-flex;
          align-items: end;
          gap: 5px;
          height: 30px;
          margin-bottom: 12px;
        }
        .cp-loader span {
          width: 5px;
          height: 22px;
          border-radius: 999px;
          background: var(--primary);
          animation: cp-loader 0.8s ease-in-out infinite alternate;
          animation-delay: calc(var(--loader-i) * 90ms);
        }
        @keyframes cp-loader {
          to {
            height: 10px;
            opacity: 0.45;
          }
        }
        .cp-empty-mark {
          margin-bottom: 10px;
          color: var(--primary);
          font-family: "Instrument Serif", Georgia, serif;
          font-size: 48px;
          line-height: 1;
        }
        .cp-empty-link {
          display: inline-flex;
          margin-top: 14px;
          color: var(--primary);
          font-weight: 800;
          text-decoration: none;
        }
        .cp-table-wrap {
          overflow-x: auto;
        }
        .cp-table {
          width: 100%;
          min-width: 920px;
          border-collapse: collapse;
        }
        .cp-table th {
          padding: 14px 18px;
          border-bottom: 1px solid var(--border);
          color: var(--muted);
          font-family: "DM Mono", monospace;
          font-size: 10px;
          letter-spacing: 0.14em;
          text-align: start;
          text-transform: uppercase;
        }
        .cp-table td {
          padding: 16px 18px;
          border-bottom: 1px solid var(--border);
          color: var(--text);
          font-size: 14px;
        }
        .cp-table tr {
          animation: cp-row-in 0.45s ease calc(var(--row-i) * 38ms) both;
        }
        @keyframes cp-row-in {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .cp-case {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .cp-avatar {
          display: flex;
          width: 38px;
          height: 38px;
          align-items: center;
          justify-content: center;
          border-radius: 11px;
          background: color-mix(in srgb, var(--primary) 12%, transparent);
          color: var(--primary);
          font-weight: 800;
        }
        .cp-case strong,
        .cp-case small {
          display: block;
        }
        .cp-case small {
          margin-top: 3px;
          color: var(--muted);
          font-family: "DM Mono", monospace;
          font-size: 10px;
        }
        .cp-count {
          display: inline-flex;
          min-width: 34px;
          justify-content: center;
          border-radius: 999px;
          padding: 5px 10px;
          background: color-mix(in srgb, var(--primary) 10%, transparent);
          color: var(--primary);
          font-family: "DM Mono", monospace;
          font-size: 12px;
          font-weight: 800;
        }
        .cp-status {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          border-radius: 999px;
          padding: 5px 10px;
          background: color-mix(in srgb, var(--muted) 10%, transparent);
          color: var(--muted);
          font-family: "DM Mono", monospace;
          font-size: 11px;
          font-weight: 700;
        }
        .cp-status span {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: currentColor;
        }
        .cp-status--draft {
          background: color-mix(in srgb, var(--warning) 14%, transparent);
          color: var(--warning);
        }
        .cp-status--calculated {
          background: color-mix(in srgb, var(--success) 14%, transparent);
          color: var(--success);
        }
        .cp-status--closed {
          background: color-mix(in srgb, var(--muted) 14%, transparent);
          color: var(--muted);
        }
        .cp-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .cp-open-btn,
        .cp-delete-btn {
          display: inline-flex;
          min-height: 36px;
          align-items: center;
          justify-content: center;
          border: 1px solid var(--border);
          border-radius: 10px;
          background: var(--surface);
          color: var(--text);
          text-decoration: none;
          font-weight: 800;
        }
        .cp-open-btn {
          padding: 0 14px;
          font-size: 12px;
        }
        .cp-delete-btn {
          width: 36px;
          color: var(--danger);
        }
        .cp-delete-btn:disabled {
          opacity: 0.45;
        }
        @media (max-width: 1120px) {
          .cp-header {
            align-items: flex-start;
            flex-direction: column;
          }
          .cp-metrics {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .cp-toolbar {
            grid-template-columns: 1fr;
          }
          .cp-filter-group {
            flex-wrap: wrap;
          }
        }
        @media (max-width: 640px) {
          .cp-metrics {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
