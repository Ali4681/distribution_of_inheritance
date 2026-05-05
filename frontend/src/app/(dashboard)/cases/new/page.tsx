"use client";

import { FormEvent, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Icon } from "@/components/ui/Icon";
import { ProjectDatePicker } from "@/components/ui/ProjectDatePicker";
import { useApp } from "@/components/providers/AppProvider";
import { useCreateCase } from "@/hooks/use-cases";

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

const currencyOptions = [
  { value: "SYP", label: { ar: "ليرة سورية", en: "Syrian pound" } },
  { value: "USD", label: { ar: "دولار أمريكي", en: "US dollar" } },
  { value: "SAR", label: { ar: "ريال سعودي", en: "Saudi riyal" } },
  { value: "EUR", label: { ar: "يورو", en: "Euro" } },
  { value: "TRY", label: { ar: "ليرة تركية", en: "Turkish lira" } },
  { value: "AED", label: { ar: "درهم إماراتي", en: "UAE dirham" } },
] as const;

export default function NewCasePage() {
  const router = useRouter();
  const { t, locale } = useApp();
  const { createCase, loading } = useCreateCase();
  const mounted = useIsClient();
  const [focused, setFocused] = useState<string | null>(null);
  const [form, setForm] = useState({
    deceasedName: "",
    deathDate: new Date().toISOString().slice(0, 10),
    totalEstate: "",
    currency: "SYP",
    funeralCosts: "0",
    debts: "0",
    mandatoryWill: "0",
    optionalWill: "0",
  });

  function update(key: keyof typeof form, value: string) {
    setForm((c) => ({ ...c, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const created = await createCase({
        deceasedName: form.deceasedName,
        deathDate: form.deathDate,
        totalEstate: Number(form.totalEstate),
        currency: form.currency,
        funeralCosts: Number(form.funeralCosts || 0),
        debts: Number(form.debts || 0),
        mandatoryWill: Number(form.mandatoryWill || 0),
        optionalWill: Number(form.optionalWill || 0),
      });
      toast.success(t.caseCreated);
      router.push(`/cases/${created.id}`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t.failedToCreateCase,
      );
    }
  }

  const moneyFields = [
    { key: "totalEstate", label: t.totalEstate, required: true, icon: "◆" },
    { key: "funeralCosts", label: t.funeralCosts, required: false, icon: "◇" },
    { key: "debts", label: t.debts, required: false, icon: "◈" },
    {
      key: "mandatoryWill",
      label: t.mandatoryWill,
      required: false,
      icon: "⬡",
    },
    { key: "optionalWill", label: t.optionalWill, required: false, icon: "⬢" },
  ] as const;

  return (
    <div className="nc-root">
      {/* Decorative background */}
      <div className="nc-bg" aria-hidden="true">
        <div className="nc-bg-ring nc-bg-ring--1" />
        <div className="nc-bg-ring nc-bg-ring--2" />
        <div className="nc-bg-grid" />
      </div>

      <div className="nc-wrap">
        {/* Header */}
        <header className={`nc-header ${mounted ? "nc-header--in" : ""}`}>
          <div className="nc-header-num">03</div>
          <div className="nc-header-text">
            <p className="nc-eyebrow">
              <span className="nc-eyebrow-dot" />
              {t.newCase}
            </p>
            <h1 className="nc-title">
              {t.openNewCaseTitle}
              <em>{t.openNewCaseAccent}</em>
            </h1>
            <p className="nc-subtitle">{t.newCaseIntro}</p>
          </div>
        </header>

        {/* Form card */}
        <div className={`nc-card ${mounted ? "nc-card--in" : ""}`}>
          {/* Card header stripe */}
          <div className="nc-card-top">
            <div className="nc-card-top-label">{t.caseDetails}</div>
            <div className="nc-card-top-steps">
              <span className="nc-step nc-step--active">1 {t.details}</span>
              <span className="nc-step-sep">{locale === "ar" ? "←" : "→"}</span>
              <span className="nc-step">2 {t.family}</span>
              <span className="nc-step-sep">{locale === "ar" ? "←" : "→"}</span>
              <span className="nc-step">3 {t.calculate}</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="nc-form">
            {/* Deceased name */}
            <div
              className={`nc-field nc-field--full nc-field--name ${focused === "deceasedName" ? "nc-field--focused" : ""}`}
              style={{ "--fi": 0 } as React.CSSProperties}
            >
              <label className="nc-label" htmlFor="nc-deceased">
                <span className="nc-label-glyph">✦</span>
                {t.deceasedName}
              </label>
              <div className="nc-input-wrap">
                <input
                  id="nc-deceased"
                  className="nc-input nc-input--lg"
                  value={form.deceasedName}
                  onChange={(e) => update("deceasedName", e.target.value)}
                  onFocus={() => setFocused("deceasedName")}
                  onBlur={() => setFocused(null)}
                  placeholder={t.fullNamePlaceholder}
                  required
                />
                <span className="nc-line" />
              </div>
            </div>

            {/* Date + Currency row */}
            <div
              className="nc-row"
              style={{ "--fi": 1 } as React.CSSProperties}
            >
              <div
                className={`nc-field ${focused === "deathDate" ? "nc-field--focused" : ""}`}
              >
                <label className="nc-label" htmlFor="nc-date">
                  <span className="nc-label-glyph">☪</span>
                  {t.deathDate}
                </label>
                <ProjectDatePicker
                  id="nc-date"
                  label={t.deathDate}
                  value={form.deathDate}
                  onChange={(nextValue) => update("deathDate", nextValue)}
                  locale={locale}
                  required
                  onOpen={() => setFocused("deathDate")}
                  onClose={() => setFocused(null)}
                  variant="line"
                />
              </div>
              <div
                className={`nc-field ${focused === "currency" ? "nc-field--focused" : ""}`}
              >
                <label className="nc-label" htmlFor="nc-currency">
                  <span className="nc-label-glyph">◎</span>
                  {t.currency}
                </label>
                <div className="nc-input-wrap">
                  <select
                    id="nc-currency"
                    className="nc-input nc-input--mono nc-select"
                    value={form.currency}
                    onChange={(e) => update("currency", e.target.value)}
                    onFocus={() => setFocused("currency")}
                    onBlur={() => setFocused(null)}
                    required
                  >
                    {currencyOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {locale === "ar"
                          ? `${option.label.ar} (${option.value})`
                          : `${option.label.en} (${option.value})`}
                      </option>
                    ))}
                  </select>
                  <span className="nc-select-arrow" aria-hidden="true">
                    v
                  </span>
                  <span className="nc-line" />
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="nc-divider">
              <span>{t.financialDetails}</span>
            </div>

            {/* Money fields grid */}
            <div className="nc-money-grid">
              {moneyFields.map((field, i) => (
                <div
                  key={field.key}
                  className={`nc-field nc-money-field ${field.key === "totalEstate" ? "nc-money-field--primary" : ""} ${focused === field.key ? "nc-field--focused" : ""}`}
                  style={{ "--fi": i + 2 } as React.CSSProperties}
                >
                  <label className="nc-label" htmlFor={`nc-${field.key}`}>
                    <span className="nc-label-glyph">{field.icon}</span>
                    {field.label}
                    {field.required && <span className="nc-required">*</span>}
                  </label>
                  <div className="nc-input-wrap nc-input-wrap--money">
                    <span className="nc-currency-badge">
                      {form.currency || "—"}
                    </span>
                    <input
                      id={`nc-${field.key}`}
                      className="nc-input nc-input--money"
                      type="number"
                      min="0"
                      step="0.01"
                      value={form[field.key]}
                      onChange={(e) => update(field.key, e.target.value)}
                      onFocus={() => setFocused(field.key)}
                      onBlur={() => setFocused(null)}
                      required={field.required}
                    />
                    <span className="nc-line" />
                  </div>
                </div>
              ))}
            </div>

            {/* Submit */}
            <div className="nc-submit-row">
              <button
                type="button"
                className="nc-back-btn"
                onClick={() => router.back()}
              >
                <span aria-hidden="true">{locale === "ar" ? "→" : "←"}</span>
                <span>{t.back}</span>
              </button>
              <button
                type="submit"
                disabled={loading}
                className="nc-submit-btn"
              >
                {loading ? (
                  <>
                    <span className="nc-submit-spin" />
                    <span>{t.loading}</span>
                  </>
                ) : (
                  <>
                    <Icon name="plus" />
                    <span>{t.create}</span>
                    <span className="nc-submit-arrow" aria-hidden="true">
                      {locale === "ar" ? "←" : "→"}
                    </span>
                    <span className="nc-submit-shine" aria-hidden="true" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:ital,wght@0,400;0,500;1,400&family=Instrument+Serif:ital@0;1&display=swap");

        .nc-root {
          position: relative;
          min-height: 100vh;
          padding: 2rem 0;
          font-family: "Syne", sans-serif;
          overflow: hidden;
        }

        /* BG decoration */
        .nc-bg {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 0;
        }
        .nc-bg-ring {
          position: absolute;
          border-radius: 50%;
          border: 1px solid color-mix(in srgb, var(--primary) 12%, transparent);
          animation: ring-pulse 8s ease-in-out infinite;
        }
        .nc-bg-ring--1 {
          width: 700px;
          height: 700px;
          top: -300px;
          right: -200px;
        }
        .nc-bg-ring--2 {
          width: 500px;
          height: 500px;
          bottom: -200px;
          left: -150px;
          animation-delay: -4s;
        }
        @keyframes ring-pulse {
          0%,
          100% {
            transform: scale(1);
            opacity: 0.6;
          }
          50% {
            transform: scale(1.04);
            opacity: 1;
          }
        }
        .nc-bg-grid {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(var(--border) 1px, transparent 1px),
            linear-gradient(90deg, var(--border) 1px, transparent 1px);
          background-size: 56px 56px;
          mask-image: radial-gradient(
            ellipse at 60% 20%,
            black 20%,
            transparent 70%
          );
          opacity: 0.18;
        }

        .nc-wrap {
          position: relative;
          z-index: 1;
          max-width: 760px;
          margin: 0 auto;
          padding: 0 1.5rem;
        }

        /* Header */
        .nc-header {
          display: flex;
          align-items: flex-start;
          gap: 24px;
          margin-bottom: 2.5rem;
          opacity: 0;
          transform: translateY(22px);
          transition:
            opacity 0.7s ease,
            transform 0.7s ease;
        }
        .nc-header--in {
          opacity: 1;
          transform: translateY(0);
        }

        .nc-header-num {
          font-family: "Instrument Serif", Georgia, serif;
          font-size: 72px;
          line-height: 0.9;
          font-weight: 400;
          color: color-mix(in srgb, var(--primary) 20%, var(--border));
          letter-spacing: -0.04em;
          flex-shrink: 0;
          padding-top: 4px;
        }

        .nc-eyebrow {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.26em;
          text-transform: uppercase;
          color: var(--primary);
          margin: 0 0 12px;
        }
        .nc-eyebrow-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--primary);
          animation: dot-pulse 2s ease-in-out infinite;
          box-shadow: 0 0 0 3px
            color-mix(in srgb, var(--primary) 20%, transparent);
        }
        @keyframes dot-pulse {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.4;
          }
        }

        .nc-title {
          font-family: "Instrument Serif", Georgia, serif;
          font-size: clamp(34px, 5vw, 52px);
          font-weight: 400;
          line-height: 0.95;
          letter-spacing: -0.03em;
          margin: 0 0 14px;
          display: flex;
          flex-direction: column;
        }
        .nc-title em {
          font-style: italic;
          color: var(--primary);
          font-weight: 400;
        }
        .nc-subtitle {
          font-family: "DM Mono", monospace;
          font-size: 13px;
          color: var(--muted);
          margin: 0;
          line-height: 1.6;
        }

        /* Card */
        .nc-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 24px;
          overflow: hidden;
          box-shadow: 0 32px 80px -32px rgba(0, 0, 0, 0.18);
          opacity: 0;
          transform: translateY(24px);
          transition:
            opacity 0.7s ease 0.12s,
            transform 0.7s ease 0.12s;
        }
        .nc-card--in {
          opacity: 1;
          transform: translateY(0);
        }

        .nc-card-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
          padding: 16px 28px;
          border-bottom: 1px solid var(--border);
          background: color-mix(
            in srgb,
            var(--surface-2, #eef1f4) 60%,
            var(--surface)
          );
        }
        .nc-card-top-label {
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.24em;
          text-transform: uppercase;
          color: var(--muted);
        }
        .nc-card-top-steps {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 11px;
          font-weight: 700;
          color: var(--muted);
        }
        .nc-step {
          font-family: "DM Mono", monospace;
        }
        .nc-step--active {
          color: var(--primary);
        }
        .nc-step-sep {
          opacity: 0.4;
        }

        /* Form */
        .nc-form {
          padding: 28px;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .nc-field {
          display: flex;
          flex-direction: column;
          gap: 8px;
          animation: field-in 0.5s ease calc(var(--fi, 0) * 60ms + 200ms) both;
        }
        @keyframes field-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .nc-field--full {
          grid-column: 1 / -1;
        }

        .nc-label {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: var(--muted);
          transition: color 0.2s ease;
        }
        .nc-field--focused .nc-label {
          color: var(--primary);
        }
        .nc-label-glyph {
          font-size: 12px;
          opacity: 0.6;
        }
        .nc-required {
          color: var(--danger);
        }

        .nc-input-wrap {
          position: relative;
        }
        .nc-input-wrap--money {
          display: flex;
          align-items: center;
        }

        .nc-input {
          width: 100%;
          height: 46px;
          background: transparent;
          border: none;
          border-bottom: 1.5px solid var(--border);
          color: var(--text);
          padding: 0 4px;
          font-family: "Syne", sans-serif;
          font-size: 15px;
          outline: none;
          transition: border-color 0.2s ease;
        }
        .nc-input--lg {
          font-size: 18px;
          height: 52px;
        }
        .nc-input--mono {
          font-family: "DM Mono", monospace;
          letter-spacing: 0.1em;
        }
        .nc-input--money {
          flex: 1;
          padding-inline-start: 0;
          font-family: "DM Mono", monospace;
          font-size: 15px;
        }
        .nc-input:focus {
          border-color: var(--primary);
        }
        .nc-input::placeholder {
          color: color-mix(in srgb, var(--muted) 50%, transparent);
        }
        .nc-select {
          appearance: none;
          cursor: pointer;
          padding-inline-end: 28px;
        }
        .nc-select-arrow {
          position: absolute;
          inset-inline-end: 6px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--muted);
          font-size: 18px;
          pointer-events: none;
          transition: color 0.2s ease;
        }
        .nc-field--focused .nc-select-arrow {
          color: var(--primary);
        }

        .nc-currency-badge {
          font-family: "DM Mono", monospace;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.12em;
          color: var(--primary);
          background: color-mix(in srgb, var(--primary) 10%, transparent);
          padding: 3px 7px;
          border-radius: 5px;
          margin-inline-end: 10px;
          white-space: nowrap;
          flex-shrink: 0;
          border-bottom: 1.5px solid transparent;
          align-self: flex-end;
          margin-bottom: 1.5px;
        }

        .nc-line {
          position: absolute;
          inset-inline-start: 0;
          bottom: -1.5px;
          height: 1.5px;
          width: 0;
          background: var(--primary);
          transition: width 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .nc-field--focused .nc-line {
          width: 100%;
        }

        .nc-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
          animation: field-in 0.5s ease calc(var(--fi, 0) * 60ms + 200ms) both;
        }

        .nc-divider {
          display: flex;
          align-items: center;
          gap: 12px;
          color: var(--muted);
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          margin: 4px 0;
        }
        .nc-divider::before,
        .nc-divider::after {
          content: "";
          flex: 1;
          height: 1px;
          background: var(--border);
        }

        .nc-money-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px 24px;
        }
        .nc-money-field--primary {
          grid-column: 1 / -1;
          padding: 16px;
          border-radius: 12px;
          background: color-mix(in srgb, var(--primary) 5%, var(--surface));
          border: 1px solid
            color-mix(in srgb, var(--primary) 20%, var(--border));
        }
        .nc-money-field--primary .nc-input {
          font-size: 20px;
          height: 54px;
        }

        /* Submit row */
        .nc-submit-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding-top: 8px;
          animation: field-in 0.5s ease 680ms both;
        }

        .nc-back-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: none;
          border: none;
          font-family: "DM Mono", monospace;
          font-size: 13px;
          color: var(--muted);
          cursor: pointer;
          padding: 8px 0;
          transition: color 0.2s ease;
        }
        .nc-back-btn:hover {
          color: var(--text);
        }

        .nc-submit-btn {
          position: relative;
          overflow: hidden;
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 14px 28px;
          border: none;
          border-radius: 14px;
          background: linear-gradient(
            135deg,
            var(--primary),
            color-mix(in srgb, var(--primary) 55%, #111)
          );
          color: white;
          font-family: "Syne", sans-serif;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          transition:
            transform 0.2s ease,
            box-shadow 0.3s ease;
          box-shadow: 0 12px 28px -10px
            color-mix(in srgb, var(--primary) 60%, transparent);
        }
        .dark .nc-submit-btn {
          color: #082f2c;
        }
        .nc-submit-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 18px 36px -12px
            color-mix(in srgb, var(--primary) 70%, transparent);
        }
        .nc-submit-btn:hover:not(:disabled) .nc-submit-arrow {
          transform: translateX(4px);
        }
        [dir="rtl"] .nc-submit-btn:hover:not(:disabled) .nc-submit-arrow {
          transform: translateX(-4px);
        }
        .nc-submit-btn:hover:not(:disabled) .nc-submit-shine {
          transform: translateX(220%) skewX(-20deg);
        }
        .nc-submit-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .nc-submit-arrow {
          transition: transform 0.3s ease;
          font-size: 16px;
        }
        .nc-submit-shine {
          position: absolute;
          top: 0;
          inset-inline-start: 0;
          width: 40%;
          height: 100%;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0.25),
            transparent
          );
          transform: translateX(-120%) skewX(-20deg);
          transition: transform 0.8s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .nc-submit-spin {
          display: block;
          width: 14px;
          height: 14px;
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

        @media (max-width: 600px) {
          .nc-header {
            flex-direction: column;
            gap: 12px;
          }
          .nc-header-num {
            font-size: 48px;
          }
          .nc-form {
            padding: 20px;
          }
          .nc-row,
          .nc-money-grid {
            grid-template-columns: 1fr;
          }
          .nc-money-field--primary {
            grid-column: auto;
          }
        }
      `}</style>
    </div>
  );
}
