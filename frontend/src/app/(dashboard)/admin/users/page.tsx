"use client";

import toast from "react-hot-toast";
import { Icon } from "@/components/ui/Icon";
import { useApp } from "@/components/providers/AppProvider";
import { useDialog } from "@/components/providers/DialogProvider";
import { useDeleteUser, useMe, useUsers } from "@/hooks/use-users";
import { Role } from "@/types";
import { formatDate, formatNumber } from "@/utils/format";
import { roleLabel } from "@/utils/labels";
import { useRef, useState, useSyncExternalStore } from "react";

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

export default function AdminUsersPage() {
  const { t, locale } = useApp();
  const { confirm } = useDialog();
  const { data: me } = useMe();
  const { data: users, loading, error, refetch } = useUsers();
  const { deleteUser, loading: deleting } = useDeleteUser();
  const mounted = useIsClient();
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  async function handleDelete(id: string) {
    const approved = await confirm({
      title: t.deleteUserTitle,
      description: t.deleteThisUser,
      confirmLabel: t.delete,
      cancelLabel: t.cancel,
      tone: "danger",
    });
    if (!approved) return;
    setDeletingId(id);
    try {
      await deleteUser(id);
      toast.success(t.userDeleted);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.deleteFailed);
    } finally {
      setDeletingId(null);
    }
  }

  const filtered = (users ?? []).filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()),
  );

  const stats = {
    total: (users ?? []).length,
    active: (users ?? []).filter((u) => u.isActive).length,
    admins: (users ?? []).filter((u) => u.role === Role.ADMIN).length,
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
    <div className="au-root">
      {/* Mesh gradient bg */}
      <div className="au-mesh" aria-hidden="true">
        <div className="au-mesh-blob au-mesh-blob--1" />
        <div className="au-mesh-blob au-mesh-blob--2" />
        <div className="au-mesh-blob au-mesh-blob--3" />
      </div>

      {/* Header */}
      <header className={`au-header ${mounted ? "au-header--in" : ""}`}>
        <div>
          <div className="au-eyebrow">
            <span className="au-eyebrow-tag">{t.systemCode}</span>
            <span className="au-eyebrow-sep" aria-hidden="true">
              ·
            </span>
            <span>{t.admin}</span>
          </div>
          <h1 className="au-title">
            {t.userManagementTitle}
            <em>{t.userManagementAccent}</em>
          </h1>
        </div>

        <div className="au-header-right">
          {/* Stats chips */}
          <div className="au-chips">
            {[
              { label: t.total, val: stats.total, color: "var(--primary)" },
              { label: t.active, val: stats.active, color: "#4ade80" },
              { label: t.admins, val: stats.admins, color: "#a78bfa" },
            ].map((chip, i) => (
              <div
                key={chip.label}
                className={`au-chip ${mounted ? "au-chip--in" : ""}`}
                style={
                  {
                    "--chip-delay": `${i * 80}ms`,
                    "--chip-clr": chip.color,
                  } as React.CSSProperties
                }
              >
                <span
                  className="au-chip-dot"
                  style={{ background: chip.color }}
                />
                <span className="au-chip-val">{formatNumber(chip.val)}</span>
                <span className="au-chip-label">{chip.label}</span>
              </div>
            ))}
          </div>

          {/* Search */}
          <div
            className={`au-search ${mounted ? "au-search--in" : ""}`}
            onClick={() => searchRef.current?.focus()}
          >
            <svg
              className="au-search-icon"
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
            >
              <circle
                cx="6"
                cy="6"
                r="4.5"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <path
                d="M10 10l2.5 2.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
            <input
              ref={searchRef}
              type="text"
              className="au-search-input"
              placeholder={t.searchUsers}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                type="button"
                className="au-search-clear"
                onClick={() => setSearch("")}
              >
                ×
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Table */}
      <section className={`au-panel ${mounted ? "au-panel--in" : ""}`}>
        {loading ? (
          <div className="au-loading">
            <div className="au-spinner" />
            <span>{t.loading}</span>
          </div>
        ) : error ? (
          <div className="au-error">{error}</div>
        ) : (
          <div className="au-scroll">
            <table className="au-table">
              <thead>
                <tr className="au-thead-row">
                  <th className="au-th">#</th>
                  <th className="au-th">{t.name}</th>
                  <th className="au-th">{t.email}</th>
                  <th className="au-th">{t.role}</th>
                  <th className="au-th">{t.status}</th>
                  <th className="au-th">{t.createdAt}</th>
                  <th className="au-th au-th--end">{t.actions}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((user, idx) => (
                  <tr
                    key={user.id}
                    className={`au-tr ${hoveredRow === user.id ? "au-tr--hover" : ""} ${mounted ? "au-tr--in" : ""} ${deletingId === user.id ? "au-tr--deleting" : ""}`}
                    style={
                      { "--tr-delay": `${idx * 35}ms` } as React.CSSProperties
                    }
                    onMouseEnter={() => setHoveredRow(user.id)}
                    onMouseLeave={() => setHoveredRow(null)}
                  >
                    <td className="au-td au-td--index">
                      <span className="au-row-num">
                        {String(idx + 1).padStart(2, "0")}
                      </span>
                    </td>

                    <td className="au-td">
                      <div className="au-user-cell">
                        <div
                          className="au-avatar"
                          style={
                            {
                              "--avatar-hue": `${(user.name.charCodeAt(0) * 37) % 360}deg`,
                            } as React.CSSProperties
                          }
                        >
                          {user.name.slice(0, 2).toUpperCase()}
                          {user.isActive && <span className="au-avatar-ping" />}
                        </div>
                        <div>
                          <div className="au-user-name">{user.name}</div>
                          {user.id === me?.id && (
                            <div className="au-you-tag">{t.you}</div>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="au-td au-td--mono">{user.email}</td>

                    <td className="au-td">
                      <span
                        className={`au-role au-role--${user.role.toLowerCase()}`}
                      >
                        <span aria-hidden="true">
                          {user.role === Role.ADMIN ? "⬡" : "◎"}
                        </span>
                        {roleLabel(user.role, t)}
                      </span>
                    </td>

                    <td className="au-td">
                      <div
                        className={`au-status ${user.isActive ? "au-status--active" : "au-status--inactive"}`}
                      >
                        <span className="au-status-pip" />
                        {user.isActive ? t.active : t.inactive}
                      </div>
                    </td>

                    <td className="au-td au-td--muted">
                      {formatDate(user.createdAt, locale)}
                    </td>

                    <td className="au-td au-td--end">
                      <button
                        type="button"
                        className="au-delete-btn"
                        disabled={
                          deleting || user.id === me?.id || deletingId !== null
                        }
                        onClick={() => handleDelete(user.id)}
                      >
                        {deletingId === user.id ? (
                          <span className="au-mini-spin" />
                        ) : (
                          <Icon name="trash" size={14} />
                        )}
                        <span>{t.delete}</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filtered.length === 0 && (
              <div className="au-empty">
                <div className="au-empty-glyph">∅</div>
                <p>
                  {t.noUsersMatch} <span>{search}</span>
                </p>
              </div>
            )}
          </div>
        )}

        {/* Footer bar */}
        {!loading && !error && (
          <div className="au-footer-bar">
            <span className="au-footer-count">
              {formatNumber(filtered.length)} / {formatNumber(stats.total)}{" "}
              {t.usersCountLabel}
            </span>
            <div className="au-footer-line" />
          </div>
        )}
      </section>

      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:ital,wght@0,400;0,500;1,400&family=Instrument+Serif:ital@0;1&display=swap");

        .au-root {
          position: relative;
          min-height: 100vh;
          padding: 2rem;
          font-family: "Syne", sans-serif;
        }

        /* Mesh background */
        .au-mesh {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 0;
          overflow: hidden;
        }
        .au-mesh-blob {
          position: absolute;
          border-radius: 50%;
          filter: blur(120px);
          opacity: 0.08;
        }
        .au-mesh-blob--1 {
          width: 600px;
          height: 600px;
          background: var(--primary);
          top: -200px;
          right: -100px;
          animation: mesh-drift 20s ease-in-out infinite;
        }
        .au-mesh-blob--2 {
          width: 500px;
          height: 500px;
          background: #7c3aed;
          bottom: -150px;
          left: -100px;
          animation: mesh-drift 25s ease-in-out infinite reverse;
        }
        .au-mesh-blob--3 {
          width: 400px;
          height: 400px;
          background: #f59e0b;
          top: 40%;
          left: 40%;
          animation: mesh-drift 18s ease-in-out infinite 4s;
        }
        @keyframes mesh-drift {
          0%,
          100% {
            transform: translate(0, 0);
          }
          33% {
            transform: translate(40px, -30px);
          }
          66% {
            transform: translate(-20px, 20px);
          }
        }

        /* Header */
        .au-header {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 1.5rem;
          margin-bottom: 2rem;
          opacity: 0;
          transform: translateY(20px);
          transition:
            opacity 0.6s ease,
            transform 0.6s ease;
        }
        .au-header--in {
          opacity: 1;
          transform: translateY(0);
        }

        .au-eyebrow {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.22em;
          color: var(--muted);
          text-transform: uppercase;
          margin-bottom: 10px;
        }
        .au-eyebrow-tag {
          background: color-mix(in srgb, var(--primary) 15%, transparent);
          color: var(--primary);
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 10px;
        }
        .au-eyebrow-sep {
          color: var(--border);
        }

        .au-title {
          font-family: "Instrument Serif", Georgia, serif;
          font-size: clamp(38px, 5vw, 60px);
          font-weight: 400;
          line-height: 0.95;
          letter-spacing: -0.03em;
          margin: 0;
          display: flex;
          flex-direction: column;
        }
        .au-title em {
          font-style: italic;
          color: var(--primary);
        }

        .au-header-right {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 12px;
        }

        /* Chips */
        .au-chips {
          display: flex;
          gap: 8px;
        }
        .au-chip {
          display: flex;
          align-items: center;
          gap: 7px;
          padding: 7px 14px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 999px;
          opacity: 0;
          transform: scale(0.85);
          transition:
            opacity 0.5s ease var(--chip-delay),
            transform 0.5s ease var(--chip-delay),
            box-shadow 0.25s ease;
        }
        .au-chip--in {
          opacity: 1;
          transform: scale(1);
        }
        .au-chip:hover {
          border-color: var(--chip-clr);
          box-shadow: 0 0 0 3px
            color-mix(in srgb, var(--chip-clr) 15%, transparent);
        }
        .au-chip-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .au-chip-val {
          font-family: "DM Mono", monospace;
          font-variant-numeric: tabular-nums;
          font-feature-settings: "tnum";
          font-size: 20px;
          font-weight: 800;
          line-height: 1;
          color: var(--chip-clr);
        }
        .au-chip-label {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.1em;
          color: var(--muted);
          text-transform: uppercase;
        }

        /* Search */
        .au-search {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 16px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 12px;
          min-width: 240px;
          cursor: text;
          opacity: 0;
          transform: translateY(8px);
          transition:
            opacity 0.5s ease 0.3s,
            transform 0.5s ease 0.3s,
            border-color 0.2s ease,
            box-shadow 0.2s ease;
        }
        .au-search--in {
          opacity: 1;
          transform: translateY(0);
        }
        .au-search:focus-within {
          border-color: var(--primary);
          box-shadow: 0 0 0 3px
            color-mix(in srgb, var(--primary) 15%, transparent);
        }
        .au-search-icon {
          color: var(--muted);
          flex-shrink: 0;
        }
        .au-search-input {
          flex: 1;
          border: none;
          background: transparent;
          color: var(--text);
          font-family: "DM Mono", monospace;
          font-size: 13px;
          outline: none;
        }
        .au-search-input::placeholder {
          color: var(--muted);
        }
        .au-search-clear {
          background: none;
          border: none;
          color: var(--muted);
          font-size: 18px;
          line-height: 1;
          padding: 0;
          cursor: pointer;
          transition: color 0.2s;
        }
        .au-search-clear:hover {
          color: var(--text);
        }

        /* Panel */
        .au-panel {
          position: relative;
          z-index: 1;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 20px;
          overflow: hidden;
          opacity: 0;
          transform: translateY(16px);
          transition:
            opacity 0.6s ease 0.15s,
            transform 0.6s ease 0.15s;
          box-shadow: 0 32px 80px -32px rgba(0, 0, 0, 0.18);
        }
        .au-panel--in {
          opacity: 1;
          transform: translateY(0);
        }

        .au-scroll {
          overflow-x: auto;
        }

        .au-table {
          width: 100%;
          border-collapse: collapse;
        }

        .au-thead-row {
          background: color-mix(
            in srgb,
            var(--surface-2, #eef1f4) 70%,
            var(--surface)
          );
        }

        .au-th {
          padding: 14px 18px;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.24em;
          text-transform: uppercase;
          color: var(--muted);
          text-align: start;
          border-bottom: 1px solid var(--border);
          white-space: nowrap;
        }
        .au-th--end {
          text-align: end;
        }

        .au-tr {
          border-bottom: 1px solid
            color-mix(in srgb, var(--border) 50%, transparent);
          opacity: 0;
          transform: translateY(8px);
          transition:
            opacity 0.45s ease var(--tr-delay, 0ms),
            transform 0.45s ease var(--tr-delay, 0ms),
            background 0.2s ease;
        }
        .au-tr--in {
          opacity: 1;
          transform: translateY(0);
        }
        .au-tr--hover {
          background: color-mix(in srgb, var(--primary) 4%, transparent);
        }
        .au-tr--deleting {
          opacity: 0.4;
          pointer-events: none;
        }
        .au-tr:last-child {
          border-bottom: none;
        }

        .au-td {
          padding: 14px 18px;
          font-size: 14px;
          color: var(--text);
          white-space: nowrap;
        }
        .au-td--index {
          width: 48px;
        }
        .au-td--muted {
          color: var(--muted);
          font-size: 13px;
        }
        .au-td--mono {
          font-family: "DM Mono", monospace;
          font-size: 12px;
          color: var(--muted);
        }
        .au-td--end {
          text-align: end;
        }

        .au-row-num {
          font-family: "DM Mono", monospace;
          font-size: 11px;
          color: var(--muted);
          opacity: 0.5;
        }

        /* User cell */
        .au-user-cell {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .au-avatar {
          position: relative;
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: hsl(var(--avatar-hue, 168deg), 55%, 32%);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 800;
          flex-shrink: 0;
          letter-spacing: 0.04em;
        }
        .au-avatar-ping {
          position: absolute;
          bottom: -2px;
          inset-inline-end: -2px;
          width: 9px;
          height: 9px;
          border-radius: 50%;
          background: #4ade80;
          border: 2px solid var(--surface);
        }
        .au-user-name {
          font-weight: 700;
          font-size: 14px;
        }
        .au-you-tag {
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--primary);
          margin-top: 2px;
        }

        /* Role */
        .au-role {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.06em;
          padding: 4px 10px;
          border-radius: 6px;
        }
        .au-role--admin {
          background: color-mix(in srgb, #7c3aed 14%, transparent);
          color: #7c3aed;
        }
        .dark .au-role--admin {
          color: #a78bfa;
        }
        .au-role--user {
          background: color-mix(in srgb, var(--muted) 12%, transparent);
          color: var(--muted);
        }

        /* Status */
        .au-status {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.04em;
        }
        .au-status-pip {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .au-status--active {
          color: #15803d;
        }
        .dark .au-status--active {
          color: #4ade80;
        }
        .au-status--active .au-status-pip {
          background: #4ade80;
          box-shadow: 0 0 0 3px color-mix(in srgb, #4ade80 25%, transparent);
          animation: pip-pulse 2s ease-in-out infinite;
        }
        .au-status--inactive {
          color: var(--muted);
        }
        .au-status--inactive .au-status-pip {
          background: var(--muted);
        }
        @keyframes pip-pulse {
          0%,
          100% {
            box-shadow: 0 0 0 3px color-mix(in srgb, #4ade80 25%, transparent);
          }
          50% {
            box-shadow: 0 0 0 6px color-mix(in srgb, #4ade80 0%, transparent);
          }
        }

        /* Delete button */
        .au-delete-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 7px 14px;
          border-radius: 8px;
          border: 1px solid color-mix(in srgb, var(--danger) 30%, var(--border));
          background: color-mix(in srgb, var(--danger) 6%, transparent);
          color: var(--danger);
          font-family: "Syne", sans-serif;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.25s ease;
        }
        .au-delete-btn:hover:not(:disabled) {
          background: var(--danger);
          border-color: var(--danger);
          color: white;
          transform: translateY(-1px);
          box-shadow: 0 6px 20px -6px
            color-mix(in srgb, var(--danger) 50%, transparent);
        }
        .au-delete-btn:disabled {
          opacity: 0.35;
          cursor: not-allowed;
        }

        .au-mini-spin {
          display: block;
          width: 12px;
          height: 12px;
          border: 1.5px solid currentColor;
          border-top-color: transparent;
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
        }
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        /* Footer bar */
        .au-footer-bar {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 12px 18px;
          border-top: 1px solid var(--border);
          background: color-mix(
            in srgb,
            var(--surface-2, #eef1f4) 40%,
            var(--surface)
          );
        }
        .au-footer-count {
          font-family: "DM Mono", monospace;
          font-size: 11px;
          color: var(--muted);
          white-space: nowrap;
        }
        .au-footer-line {
          flex: 1;
          height: 1px;
          background: linear-gradient(90deg, var(--border), transparent);
        }

        /* Loading */
        .au-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          padding: 60px;
          color: var(--muted);
          font-family: "DM Mono", monospace;
          font-size: 13px;
        }
        .au-spinner {
          width: 32px;
          height: 32px;
          border: 2px solid var(--border);
          border-top-color: var(--primary);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        .au-error {
          padding: 40px;
          color: var(--danger);
          font-family: "DM Mono", monospace;
          font-size: 13px;
        }

        .au-empty {
          padding: 60px;
          text-align: center;
          color: var(--muted);
        }
        .au-empty-glyph {
          font-size: 48px;
          opacity: 0.2;
          margin-bottom: 12px;
          font-family: "Instrument Serif", serif;
        }
        .au-empty p {
          font-family: "DM Mono", monospace;
          font-size: 13px;
          margin: 0;
        }

        @media (max-width: 768px) {
          .au-root {
            padding: 1rem;
          }
          .au-header {
            flex-direction: column;
            align-items: flex-start;
          }
          .au-header-right {
            width: 100%;
            align-items: flex-start;
          }
          .au-search {
            min-width: unset;
            width: 100%;
          }
          .au-title {
            font-size: 38px;
          }
        }
      `}</style>
    </div>
  );
}
