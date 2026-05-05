"use client";

import Link from "next/link";
import { useApp } from "@/components/providers/AppProvider";
import { useCases } from "@/hooks/use-cases";
import { useMe } from "@/hooks/use-users";
import { CaseStatus, Role } from "@/types";
import { formatDate, formatMoney, formatNumber } from "@/utils/format";
import { caseStatusLabel } from "@/utils/labels";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

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

export default function AdminCasesPage() {
  const { t, locale } = useApp();
  const { data: me } = useMe();
  const { data: cases, loading, error } = useCases();
  const mounted = useIsClient();
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const [filter, setFilter] = useState<CaseStatus | "ALL">("ALL");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Particle canvas background
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const particles: {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      opacity: number;
      hue: number;
    }[] = [];

    for (let i = 0; i < 60; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        size: Math.random() * 1.5 + 0.5,
        opacity: Math.random() * 0.4 + 0.1,
        hue: Math.random() * 40 + 160,
      });
    }

    let animId: number;
    function animate() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 70%, 60%, ${p.opacity})`;
        ctx.fill();
      });
      animId = requestAnimationFrame(animate);
    }
    animate();
    return () => cancelAnimationFrame(animId);
  }, [mounted]);

  const filteredCases = (cases ?? []).filter(
    (c) => filter === "ALL" || c.status === filter,
  );

  const stats = {
    total: (cases ?? []).length,
    calculated: (cases ?? []).filter((c) => c.status === CaseStatus.CALCULATED)
      .length,
    draft: (cases ?? []).filter((c) => c.status === CaseStatus.DRAFT).length,
    closed: (cases ?? []).filter((c) => c.status === CaseStatus.CLOSED).length,
  };

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

  return (
    <div className="ac-root">
      <canvas ref={canvasRef} className="ac-canvas" aria-hidden="true" />

      {/* Header */}
      <header className={`ac-header ${mounted ? "ac-header--visible" : ""}`}>
        <div className="ac-header-left">
          <div className="ac-eyebrow">
            <span className="ac-eyebrow-line" />
            <span>{t.admin}</span>
          </div>
          <h1 className="ac-title">
            <span className="ac-title-word">{t.caseRegistryTitle}</span>
            <span className="ac-title-word ac-title-word--accent">
              {t.caseRegistryAccent}
            </span>
          </h1>
          <p className="ac-subtitle">
            {formatNumber(stats.total)} {t.totalCasesAcrossUsers}
          </p>
        </div>

        <div className="ac-stats-row">
          {[
            { label: t.total, value: stats.total, color: "#2dd4bf", delay: 0 },
            {
              label: t.active,
              value: stats.draft,
              color: "#f59e0b",
              delay: 80,
            },
            {
              label: t.calculated,
              value: stats.calculated,
              color: "#4ade80",
              delay: 160,
            },
            {
              label: t.closed,
              value: stats.closed,
              color: "#94a3b8",
              delay: 240,
            },
          ].map((s) => (
            <div
              key={s.label}
              className={`ac-stat ${mounted ? "ac-stat--visible" : ""}`}
              style={
                {
                  "--delay": `${s.delay}ms`,
                  "--clr": s.color,
                } as React.CSSProperties
              }
            >
              <span className="ac-stat-value">{formatNumber(s.value)}</span>
              <span className="ac-stat-label">{s.label}</span>
              <div className="ac-stat-bar" />
            </div>
          ))}
        </div>
      </header>

      {/* Filter tabs */}
      <div className={`ac-filters ${mounted ? "ac-filters--visible" : ""}`}>
        {(
          [
            "ALL",
            CaseStatus.DRAFT,
            CaseStatus.CALCULATED,
            CaseStatus.CLOSED,
          ] as const
        ).map((f) => (
          <button
            key={f}
            type="button"
            className={`ac-filter-btn ${filter === f ? "ac-filter-btn--active" : ""}`}
            onClick={() => setFilter(f)}
          >
            {f === "ALL" ? t.allCases : caseStatusLabel(f, t)}
          </button>
        ))}
      </div>

      {/* Table */}
      <section
        className={`ac-table-wrap ${mounted ? "ac-table-wrap--visible" : ""}`}
      >
        {loading ? (
          <div className="ac-loading">
            <div className="ac-loading-bars">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="ac-loading-bar"
                  style={{ "--i": i } as React.CSSProperties}
                />
              ))}
            </div>
            <span>{t.loading}</span>
          </div>
        ) : error ? (
          <div className="ac-error">{error}</div>
        ) : (
          <div className="ac-table-scroll">
            <table className="ac-table">
              <thead>
                <tr>
                  {[
                    t.deceasedName,
                    t.deathDate,
                    t.totalEstate,
                    t.familyMembers,
                    t.status,
                    t.actions,
                  ].map((h) => (
                    <th key={h} className="ac-th">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredCases.map((item, idx) => (
                  <tr
                    key={item.id}
                    className={`ac-tr ${hoveredRow === item.id ? "ac-tr--hovered" : ""} ${mounted ? "ac-tr--visible" : ""}`}
                    style={
                      { "--row-delay": `${idx * 40}ms` } as React.CSSProperties
                    }
                    onMouseEnter={() => setHoveredRow(item.id)}
                    onMouseLeave={() => setHoveredRow(null)}
                  >
                    <td className="ac-td">
                      <div className="ac-name-cell">
                        <div className="ac-name-avatar">
                          {item.deceasedName.charAt(0)}
                        </div>
                        <span className="ac-name-text">
                          {item.deceasedName}
                        </span>
                      </div>
                    </td>
                    <td className="ac-td ac-td--muted">
                      {formatDate(item.deathDate, locale)}
                    </td>
                    <td className="ac-td ac-td--mono">
                      {formatMoney(item.totalEstate, item.currency, locale)}
                    </td>
                    <td className="ac-td">
                      <div className="ac-members-cell">
                        <div className="ac-members-dots">
                          {[
                            ...Array(
                              Math.min(item._count?.familyMembers ?? 0, 5),
                            ),
                          ].map((_, i) => (
                            <span
                              key={i}
                              className="ac-member-dot"
                              style={{ "--dot-i": i } as React.CSSProperties}
                            />
                          ))}
                        </div>
                        <span>{item._count?.familyMembers ?? 0}</span>
                      </div>
                    </td>
                    <td className="ac-td">
                      <span
                        className={`ac-badge ac-badge--${item.status.toLowerCase()}`}
                      >
                        <span className="ac-badge-dot" />
                        {caseStatusLabel(item.status, t)}
                      </span>
                    </td>
                    <td className="ac-td">
                      <Link href={`/cases/${item.id}`} className="ac-open-btn">
                        <span>{t.open}</span>
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 14 14"
                          fill="none"
                        >
                          <path
                            d="M2 7h10M7 2l5 5-5 5"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredCases.length === 0 && (
              <div className="ac-empty">
                <div className="ac-empty-icon">◎</div>
                <p>{t.noCasesFound}</p>
              </div>
            )}
          </div>
        )}
      </section>

      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@400;500&family=Instrument+Serif:ital@0;1&display=swap");

        .ac-root {
          position: relative;
          min-height: 100vh;
          padding: 2rem;
          font-family: "Syne", sans-serif;
          overflow: hidden;
        }

        .ac-canvas {
          position: fixed;
          inset: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: 0;
          opacity: 0.6;
        }

        /* Header */
        .ac-header {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 2rem;
          margin-bottom: 2.5rem;
          opacity: 0;
          transform: translateY(24px);
          transition:
            opacity 0.7s ease,
            transform 0.7s ease;
        }
        .ac-header--visible {
          opacity: 1;
          transform: translateY(0);
        }

        .ac-eyebrow {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.28em;
          text-transform: uppercase;
          color: var(--primary);
          margin-bottom: 12px;
        }
        .ac-eyebrow-line {
          display: block;
          width: 28px;
          height: 1.5px;
          background: var(--primary);
        }

        .ac-title {
          font-family: "Instrument Serif", Georgia, serif;
          font-size: clamp(40px, 5vw, 64px);
          font-weight: 400;
          line-height: 0.95;
          letter-spacing: -0.03em;
          margin: 0 0 12px;
          display: flex;
          flex-direction: column;
        }
        .ac-title-word {
          display: block;
        }
        .ac-title-word--accent {
          font-style: italic;
          color: var(--primary);
        }

        .ac-subtitle {
          font-size: 13px;
          color: var(--muted);
          margin: 0;
          font-family: "DM Mono", monospace;
          font-weight: 400;
        }

        /* Stats */
        .ac-stats-row {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          align-self: flex-end;
        }

        .ac-stat {
          position: relative;
          padding: 16px 20px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 16px;
          min-width: 90px;
          overflow: hidden;
          opacity: 0;
          transform: translateY(20px) scale(0.95);
          transition:
            opacity 0.6s ease var(--delay, 0ms),
            transform 0.6s ease var(--delay, 0ms),
            box-shadow 0.3s ease;
        }
        .ac-stat--visible {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
        .ac-stat:hover {
          box-shadow: 0 8px 32px -8px
            color-mix(in srgb, var(--clr) 40%, transparent);
          border-color: color-mix(in srgb, var(--clr) 50%, var(--border));
        }

        .ac-stat-value {
          display: block;
          font-family: "DM Mono", monospace;
          font-variant-numeric: tabular-nums;
          font-feature-settings: "tnum";
          font-size: 36px;
          font-weight: 800;
          line-height: 1;
          color: var(--clr, var(--primary));
          margin-bottom: 4px;
        }
        .ac-stat-label {
          display: block;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--muted);
        }
        .ac-stat-bar {
          position: absolute;
          bottom: 0;
          inset-inline-start: 0;
          height: 2px;
          width: 100%;
          background: linear-gradient(
            90deg,
            var(--clr, var(--primary)),
            transparent
          );
          opacity: 0.5;
        }

        /* Filters */
        .ac-filters {
          position: relative;
          z-index: 1;
          display: flex;
          gap: 8px;
          margin-bottom: 1.5rem;
          opacity: 0;
          transform: translateY(16px);
          transition:
            opacity 0.6s ease 0.2s,
            transform 0.6s ease 0.2s;
        }
        .ac-filters--visible {
          opacity: 1;
          transform: translateY(0);
        }

        .ac-filter-btn {
          padding: 8px 18px;
          border-radius: 999px;
          border: 1px solid var(--border);
          background: var(--surface);
          color: var(--muted);
          font-family: "Syne", sans-serif;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.06em;
          cursor: pointer;
          transition: all 0.25s ease;
        }
        .ac-filter-btn:hover {
          border-color: var(--primary);
          color: var(--text);
        }
        .ac-filter-btn--active {
          background: var(--primary);
          border-color: var(--primary);
          color: white;
        }

        /* Table */
        .ac-table-wrap {
          position: relative;
          z-index: 1;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 20px;
          overflow: hidden;
          opacity: 0;
          transform: translateY(20px);
          transition:
            opacity 0.7s ease 0.3s,
            transform 0.7s ease 0.3s;
          box-shadow: 0 24px 64px -24px rgba(0, 0, 0, 0.2);
        }
        .ac-table-wrap--visible {
          opacity: 1;
          transform: translateY(0);
        }

        .ac-table-scroll {
          overflow-x: auto;
        }

        .ac-table {
          width: 100%;
          border-collapse: collapse;
        }

        .ac-th {
          padding: 16px 20px;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: var(--muted);
          text-align: start;
          background: color-mix(
            in srgb,
            var(--surface-2, #eef1f4) 60%,
            var(--surface)
          );
          border-bottom: 1px solid var(--border);
          white-space: nowrap;
        }

        .ac-tr {
          border-bottom: 1px solid
            color-mix(in srgb, var(--border) 60%, transparent);
          opacity: 0;
          transform: translateX(-12px);
          transition:
            opacity 0.5s ease var(--row-delay, 0ms),
            transform 0.5s ease var(--row-delay, 0ms),
            background 0.2s ease;
        }
        .ac-tr--visible {
          opacity: 1;
          transform: translateX(0);
        }
        [dir="rtl"] .ac-tr {
          transform: translateX(12px);
        }
        [dir="rtl"] .ac-tr--visible {
          transform: translateX(0);
        }
        .ac-tr--hovered {
          background: color-mix(in srgb, var(--primary) 5%, transparent);
        }
        .ac-tr:last-child {
          border-bottom: none;
        }

        .ac-td {
          padding: 16px 20px;
          font-size: 14px;
          color: var(--text);
          white-space: nowrap;
        }
        .ac-td--muted {
          color: var(--muted);
          font-size: 13px;
        }
        .ac-td--mono {
          font-family: "DM Mono", monospace;
          font-size: 13px;
          color: var(--primary);
          font-weight: 500;
        }

        /* Name cell */
        .ac-name-cell {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .ac-name-avatar {
          width: 34px;
          height: 34px;
          border-radius: 10px;
          background: linear-gradient(
            135deg,
            var(--primary),
            color-mix(in srgb, var(--primary) 60%, #000)
          );
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          font-weight: 800;
          flex-shrink: 0;
          font-family: "Instrument Serif", serif;
        }
        .ac-name-text {
          font-weight: 700;
          font-size: 14px;
        }

        /* Members */
        .ac-members-cell {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .ac-members-dots {
          display: flex;
          gap: 3px;
        }
        .ac-member-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--primary);
          opacity: calc(1 - var(--dot-i) * 0.15);
        }

        /* Badge */
        .ac-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 12px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }
        .ac-badge-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: currentColor;
        }
        .ac-badge--draft {
          background: color-mix(in srgb, #f59e0b 14%, transparent);
          color: #f59e0b;
        }
        .ac-badge--calculated {
          background: color-mix(in srgb, #4ade80 14%, transparent);
          color: #15803d;
        }
        .dark .ac-badge--calculated {
          color: #4ade80;
        }
        .ac-badge--closed {
          background: color-mix(in srgb, var(--muted) 14%, transparent);
          color: var(--muted);
        }

        /* Open button */
        .ac-open-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          border-radius: 10px;
          border: 1px solid var(--border);
          background: var(--surface);
          color: var(--text);
          font-family: "Syne", sans-serif;
          font-size: 12px;
          font-weight: 700;
          text-decoration: none;
          transition: all 0.25s ease;
        }
        .ac-open-btn:hover {
          background: var(--primary);
          border-color: var(--primary);
          color: white;
          transform: translateY(-1px);
          box-shadow: 0 6px 20px -6px
            color-mix(in srgb, var(--primary) 60%, transparent);
        }
        .ac-open-btn svg {
          transition: transform 0.25s ease;
        }
        [dir="rtl"] .ac-open-btn svg {
          transform: scaleX(-1);
        }
        .ac-open-btn:hover svg {
          transform: translateX(3px);
        }
        [dir="rtl"] .ac-open-btn:hover svg {
          transform: scaleX(-1) translateX(3px);
        }

        /* Loading */
        .ac-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 20px;
          padding: 60px;
          color: var(--muted);
          font-size: 13px;
          font-family: "DM Mono", monospace;
        }
        .ac-loading-bars {
          display: flex;
          gap: 4px;
          align-items: flex-end;
          height: 32px;
        }
        .ac-loading-bar {
          width: 4px;
          border-radius: 2px;
          background: var(--primary);
          animation: bar-bounce 1s ease-in-out infinite;
          animation-delay: calc(var(--i) * 0.12s);
        }
        @keyframes bar-bounce {
          0%,
          100% {
            height: 8px;
            opacity: 0.4;
          }
          50% {
            height: 32px;
            opacity: 1;
          }
        }

        .ac-error {
          padding: 40px;
          color: var(--danger);
          font-family: "DM Mono", monospace;
          font-size: 13px;
        }

        .ac-empty {
          padding: 60px;
          text-align: center;
          color: var(--muted);
        }
        .ac-empty-icon {
          font-size: 40px;
          margin-bottom: 12px;
          opacity: 0.3;
        }
        .ac-empty p {
          font-family: "DM Mono", monospace;
          font-size: 13px;
          margin: 0;
        }

        @media (max-width: 768px) {
          .ac-root {
            padding: 1rem;
          }
          .ac-header {
            flex-direction: column;
          }
          .ac-title {
            font-size: 40px;
          }
          .ac-stats-row {
            width: 100%;
          }
          .ac-stat {
            flex: 1;
            min-width: 70px;
          }
        }
      `}</style>
    </div>
  );
}
