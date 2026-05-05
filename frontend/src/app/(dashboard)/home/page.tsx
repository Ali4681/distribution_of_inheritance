"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { Icon } from "@/components/ui/Icon";
import { useApp } from "@/components/providers/AppProvider";
import { useCases } from "@/hooks/use-cases";
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

export default function HomePage() {
  const { t, locale } = useApp();
  const { data: cases, loading, error } = useCases();
  const mounted = useIsClient();

  const totalCases = cases?.length ?? 0;
  const calculatedCases =
    cases?.filter((item) => item.status === CaseStatus.CALCULATED).length ?? 0;
  const draftCases =
    cases?.filter((item) => item.status === CaseStatus.DRAFT).length ?? 0;
  const totalEstate =
    cases?.reduce((sum, item) => sum + Number(item.totalEstate ?? 0), 0) ?? 0;
  const latestCases = cases?.slice(0, 6) ?? [];

  return (
    <div className="hp-root">
      <div className="hp-bg" aria-hidden="true">
        <div className="hp-bg-grid" />
        <div className="hp-bg-ring hp-bg-ring--1" />
        <div className="hp-bg-ring hp-bg-ring--2" />
      </div>

      <section className={`hp-hero ${mounted ? "hp-hero--in" : ""}`}>
        <div className="hp-hero-copy">
          <p className="hp-eyebrow">
            <span className="hp-eyebrow-dot" />
            {t.dashboard}
          </p>
          <h2 className="hp-title">
            {t.manageInheritance}
            <em>{t.withStructure}</em>
          </h2>
          <p className="hp-subtitle">{t.treeHint}</p>
        </div>

        <div className="hp-hero-actions">
          <Link href="/cases/new" className="hp-primary-btn">
            <Icon name="plus" />
            <span>{t.newCase}</span>
            <span className="hp-btn-arrow" aria-hidden="true">
              {locale === "ar" ? "←" : "→"}
            </span>
          </Link>
          <Link href="/cases" className="hp-secondary-btn">
            <Icon name="cases" />
            <span>{t.cases}</span>
          </Link>
        </div>
      </section>

      <section className="hp-stat-grid">
        {[
          {
            label: t.totalCases,
            value: formatNumber(totalCases),
            icon: "cases" as const,
            tone: "teal",
          },
          {
            label: t.calculatedCases,
            value: formatNumber(calculatedCases),
            icon: "calculator" as const,
            tone: "green",
          },
          {
            label: t.draftCases,
            value: formatNumber(draftCases),
            icon: "file" as const,
            tone: "amber",
          },
          {
            label: t.totalManagedEstate,
            value: formatMoney(totalEstate, "SYP", locale),
            icon: "shield" as const,
            tone: "blue",
          },
        ].map((stat, index) => (
          <div
            key={stat.label}
            className={`hp-stat hp-stat--${stat.tone} ${mounted ? "hp-stat--in" : ""}`}
            style={{ "--stat-i": index } as React.CSSProperties}
          >
            <div className="hp-stat-icon">
              <Icon name={stat.icon} />
            </div>
            <p className="hp-stat-label">{stat.label}</p>
            <p className="hp-stat-value">{stat.value}</p>
            <span className="hp-stat-line" />
          </div>
        ))}
      </section>

      <section className={`hp-panel ${mounted ? "hp-panel--in" : ""}`}>
        <div className="hp-panel-head">
          <div>
            <p className="hp-panel-kicker">{t.recentActivity}</p>
            <h3 className="hp-panel-title">{t.latestCases}</h3>
          </div>
          <Link href="/cases" className="hp-panel-link">
            {t.cases}
            <span aria-hidden="true">{locale === "ar" ? "←" : "→"}</span>
          </Link>
        </div>

        {loading ? (
          <div className="hp-state">{t.loading}</div>
        ) : error ? (
          <div className="hp-state hp-state--error">{error}</div>
        ) : !latestCases.length ? (
          <div className="hp-empty">
            <div className="hp-empty-mark">01</div>
            <p>{t.noCases}</p>
            <Link href="/cases/new" className="hp-empty-link">
              {t.newCase}
            </Link>
          </div>
        ) : (
          <div className="hp-table-wrap">
            <table className="hp-table">
              <thead>
                <tr>
                  <th>{t.deceasedName}</th>
                  <th>{t.deathDate}</th>
                  <th>{t.totalEstate}</th>
                  <th>{t.status}</th>
                  <th>{t.actions}</th>
                </tr>
              </thead>
              <tbody>
                {latestCases.map((item, index) => (
                  <tr
                    key={item.id}
                    style={{ "--row-i": index } as React.CSSProperties}
                  >
                    <td>
                      <div className="hp-case-name">
                        <span>{item.deceasedName.charAt(0)}</span>
                        <strong>{item.deceasedName}</strong>
                      </div>
                    </td>
                    <td>{formatDate(item.deathDate, locale)}</td>
                    <td>{formatMoney(item.totalEstate, item.currency, locale)}</td>
                    <td>
                      <span className={`hp-status hp-status--${item.status.toLowerCase()}`}>
                        <span />
                        {caseStatusLabel(item.status, t)}
                      </span>
                    </td>
                    <td>
                      <Link href={`/cases/${item.id}`} className="hp-open-btn">
                        {t.open}
                      </Link>
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

        .hp-root {
          position: relative;
          min-height: 100vh;
          padding: 0 0 3rem;
          font-family: "Syne", sans-serif;
        }
        .hp-bg {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 0;
          overflow: hidden;
        }
        .hp-bg-grid {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(var(--border) 1px, transparent 1px),
            linear-gradient(90deg, var(--border) 1px, transparent 1px);
          background-size: 58px 58px;
          mask-image: radial-gradient(
            ellipse at 55% 10%,
            black 18%,
            transparent 72%
          );
          opacity: 0.18;
        }
        .hp-bg-ring {
          position: absolute;
          border-radius: 50%;
          border: 1px solid color-mix(in srgb, var(--primary) 14%, transparent);
        }
        .hp-bg-ring--1 {
          width: 680px;
          height: 680px;
          top: -360px;
          right: -260px;
        }
        .hp-bg-ring--2 {
          width: 460px;
          height: 460px;
          left: -220px;
          bottom: -180px;
          border-color: color-mix(in srgb, var(--accent) 18%, transparent);
        }
        .hp-hero,
        .hp-stat-grid,
        .hp-panel {
          position: relative;
          z-index: 1;
        }
        .hp-hero {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 24px;
          margin-bottom: 28px;
          padding: 12px 0 4px;
          opacity: 0;
          transform: translateY(18px);
          transition:
            opacity 0.7s ease,
            transform 0.7s ease;
        }
        .hp-hero--in {
          opacity: 1;
          transform: translateY(0);
        }
        .hp-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          margin: 0 0 12px;
          color: var(--primary);
          font-family: "DM Mono", monospace;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.22em;
          text-transform: uppercase;
        }
        .hp-eyebrow-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--primary);
          box-shadow: 0 0 0 4px
            color-mix(in srgb, var(--primary) 18%, transparent);
        }
        .hp-title {
          display: flex;
          flex-direction: column;
          margin: 0;
          font-family: "Instrument Serif", Georgia, serif;
          font-size: clamp(42px, 7vw, 76px);
          font-weight: 400;
          line-height: 0.92;
          letter-spacing: -0.03em;
        }
        .hp-title em {
          color: var(--primary);
          font-style: italic;
        }
        .hp-subtitle {
          max-width: 620px;
          margin: 18px 0 0;
          color: var(--muted);
          font-family: "DM Mono", monospace;
          font-size: 13px;
          line-height: 1.7;
        }
        .hp-hero-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }
        .hp-primary-btn,
        .hp-secondary-btn,
        .hp-panel-link,
        .hp-open-btn,
        .hp-empty-link {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          text-decoration: none;
          font-weight: 800;
        }
        .hp-primary-btn {
          position: relative;
          min-height: 48px;
          border-radius: 14px;
          padding: 0 20px;
          background: linear-gradient(
            135deg,
            var(--primary),
            color-mix(in srgb, var(--primary) 55%, #111)
          );
          color: white;
          box-shadow: 0 16px 34px -16px
            color-mix(in srgb, var(--primary) 68%, transparent);
        }
        .dark .hp-primary-btn {
          color: #082f2c;
        }
        .hp-secondary-btn {
          min-height: 48px;
          border: 1px solid var(--border);
          border-radius: 14px;
          padding: 0 18px;
          background: var(--surface);
          color: var(--text);
        }
        .hp-btn-arrow {
          font-family: "DM Mono", monospace;
        }
        .hp-stat-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 16px;
          margin-bottom: 18px;
        }
        .hp-stat {
          position: relative;
          min-height: 158px;
          overflow: hidden;
          border: 1px solid var(--border);
          border-radius: 18px;
          background: var(--surface);
          padding: 18px;
          opacity: 0;
          transform: translateY(18px);
          transition:
            opacity 0.6s ease calc(var(--stat-i) * 70ms),
            transform 0.6s ease calc(var(--stat-i) * 70ms);
        }
        .hp-stat--in {
          opacity: 1;
          transform: translateY(0);
        }
        .hp-stat-icon {
          display: flex;
          width: 42px;
          height: 42px;
          align-items: center;
          justify-content: center;
          border-radius: 12px;
          background: color-mix(in srgb, var(--primary) 12%, transparent);
          color: var(--primary);
        }
        .hp-stat-label {
          margin: 18px 0 6px;
          color: var(--muted);
          font-family: "DM Mono", monospace;
          font-size: 11px;
          line-height: 1.35;
          text-transform: uppercase;
        }
        .hp-stat-value {
          margin: 0;
          font-family: "DM Mono", monospace;
          font-variant-numeric: tabular-nums;
          font-feature-settings: "tnum";
          font-size: 26px;
          font-weight: 800;
          line-height: 1.05;
        }
        .hp-stat-line {
          position: absolute;
          inset-inline: 18px;
          bottom: 0;
          height: 3px;
          background: var(--primary);
          opacity: 0.8;
        }
        .hp-stat--green .hp-stat-line,
        .hp-stat--green .hp-stat-icon {
          color: #15803d;
          background: color-mix(in srgb, #15803d 12%, transparent);
        }
        .hp-stat--green .hp-stat-line {
          background: #15803d;
        }
        .hp-stat--amber .hp-stat-line,
        .hp-stat--amber .hp-stat-icon {
          color: #d97706;
          background: color-mix(in srgb, #d97706 13%, transparent);
        }
        .hp-stat--amber .hp-stat-line {
          background: #d97706;
        }
        .hp-stat--blue .hp-stat-line,
        .hp-stat--blue .hp-stat-icon {
          color: #2563eb;
          background: color-mix(in srgb, #2563eb 12%, transparent);
        }
        .hp-stat--blue .hp-stat-line {
          background: #2563eb;
        }
        .hp-panel {
          overflow: hidden;
          border: 1px solid var(--border);
          border-radius: 20px;
          background: var(--surface);
          box-shadow: 0 30px 70px -42px rgba(0, 0, 0, 0.24);
          opacity: 0;
          transform: translateY(18px);
          transition:
            opacity 0.7s ease 0.16s,
            transform 0.7s ease 0.16s;
        }
        .hp-panel--in {
          opacity: 1;
          transform: translateY(0);
        }
        .hp-panel-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 20px 24px;
          border-bottom: 1px solid var(--border);
          background: color-mix(in srgb, var(--surface-2) 54%, var(--surface));
        }
        .hp-panel-kicker {
          margin: 0 0 5px;
          color: var(--primary);
          font-family: "DM Mono", monospace;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.2em;
          text-transform: uppercase;
        }
        .hp-panel-title {
          margin: 0;
          font-size: 22px;
          font-weight: 800;
        }
        .hp-panel-link {
          color: var(--primary);
          font-family: "DM Mono", monospace;
          font-size: 12px;
        }
        .hp-state,
        .hp-empty {
          padding: 44px 24px;
          text-align: center;
          color: var(--muted);
          font-family: "DM Mono", monospace;
        }
        .hp-state--error {
          color: var(--danger);
        }
        .hp-empty-mark {
          margin-bottom: 10px;
          color: var(--primary);
          font-family: "Instrument Serif", Georgia, serif;
          font-size: 46px;
          line-height: 1;
        }
        .hp-empty-link {
          margin-top: 14px;
          color: var(--primary);
        }
        .hp-table-wrap {
          overflow-x: auto;
        }
        .hp-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 760px;
        }
        .hp-table th {
          padding: 14px 18px;
          color: var(--muted);
          font-family: "DM Mono", monospace;
          font-size: 10px;
          letter-spacing: 0.14em;
          text-align: start;
          text-transform: uppercase;
          border-bottom: 1px solid var(--border);
        }
        .hp-table td {
          padding: 16px 18px;
          border-bottom: 1px solid var(--border);
          color: var(--text);
          font-size: 14px;
        }
        .hp-table tr {
          animation: hp-row-in 0.45s ease calc(var(--row-i) * 45ms) both;
        }
        @keyframes hp-row-in {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .hp-case-name {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .hp-case-name span {
          display: flex;
          width: 34px;
          height: 34px;
          align-items: center;
          justify-content: center;
          border-radius: 10px;
          background: color-mix(in srgb, var(--primary) 12%, transparent);
          color: var(--primary);
          font-weight: 800;
        }
        .hp-status {
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
        .hp-status span {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: currentColor;
        }
        .hp-status--draft {
          background: color-mix(in srgb, var(--warning) 14%, transparent);
          color: var(--warning);
        }
        .hp-status--calculated {
          background: color-mix(in srgb, var(--success) 14%, transparent);
          color: var(--success);
        }
        .hp-status--closed {
          background: color-mix(in srgb, var(--muted) 14%, transparent);
          color: var(--muted);
        }
        .hp-open-btn {
          min-height: 34px;
          border: 1px solid var(--border);
          border-radius: 10px;
          padding: 0 13px;
          background: var(--surface);
          color: var(--text);
          font-size: 12px;
        }
        @media (max-width: 1080px) {
          .hp-hero {
            align-items: flex-start;
            flex-direction: column;
          }
          .hp-stat-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
        @media (max-width: 640px) {
          .hp-stat-grid {
            grid-template-columns: 1fr;
          }
          .hp-panel-head {
            align-items: flex-start;
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
}
