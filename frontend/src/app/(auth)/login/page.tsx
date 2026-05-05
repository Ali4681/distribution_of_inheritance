"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import toast from "react-hot-toast";
import { Icon } from "@/components/ui/Icon";
import { useApp } from "@/components/providers/AppProvider";
import { useSignIn } from "@/hooks";

export default function LoginPage() {
  const router = useRouter();
  const { t, locale, theme, toggleLocale, toggleTheme } = useApp();
  const { signIn, loading } = useSignIn();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [focused, setFocused] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await signIn({ email, password });
      router.push("/home");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.unableToSignIn);
    }
  }

  return (
    <main className="auth-shell">
      {/* Decorative ambient background */}
      <div className="auth-aurora" aria-hidden="true">
        <div className="aurora-blob aurora-blob--1" />
        <div className="aurora-blob aurora-blob--2" />
        <div className="aurora-grid" />
      </div>

      <section className="auth-form-pane">
        <div className="auth-form-wrap">
          {/* Header */}
          <header
            className="auth-header animate-rise"
            style={{ animationDelay: "0ms" }}
          >
            <div className="brand">
              <div className="brand-mark">
                <Icon name="tree" />
                <span className="brand-mark-ping" aria-hidden="true" />
              </div>
              <div>
                <p className="brand-name">{t.appName}</p>
                <p className="brand-tag">{t.appDescription}</p>
              </div>
            </div>

            <div className="auth-controls">
              <button
                className="icon-btn"
                onClick={toggleLocale}
                type="button"
                aria-label={
                  locale === "en" ? t.switchToArabic : t.switchToEnglish
                }
                title={
                  locale === "en" ? t.switchToArabic : t.switchToEnglish
                }
              >
                <span className="icon-btn-label">
                  {locale === "en" ? "EN" : "AR"}
                </span>
              </button>
              <button
                className="icon-btn"
                onClick={toggleTheme}
                type="button"
                aria-label={
                  theme === "light"
                    ? t.switchToDark
                    : t.switchToLight
                }
                title={
                  theme === "light"
                    ? t.switchToDark
                    : t.switchToLight
                }
              >
                <Icon name={theme === "light" ? "sun" : "moon"} size={16} />
              </button>
            </div>
          </header>

          {/* Card */}
          <div
            className="auth-card animate-rise"
            style={{ animationDelay: "120ms" }}
          >
            <div className="auth-card-eyebrow">
              <span className="dot" />
              <span>{t.login}</span>
            </div>
            <h1 className="auth-title">
              <span className="auth-title-line">{t.welcome}</span>
              <span className="auth-title-line auth-title-accent">
                {t.welcomeBack}
              </span>
            </h1>
            <p className="auth-sub">{t.signInIntro}</p>

            <form onSubmit={handleSubmit} className="auth-form">
              <label
                className={`a-field ${focused === "email" ? "is-focused" : ""}`}
              >
                <span className="a-label">{t.email}</span>
                <div className="a-input-wrap">
                  <input
                    className="a-input"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={() => setFocused("email")}
                    onBlur={() => setFocused(null)}
                    required
                    dir="ltr"
                    autoComplete="email"
                  />
                  <span className="a-input-line" />
                </div>
              </label>

              <label
                className={`a-field ${focused === "password" ? "is-focused" : ""}`}
              >
                <span className="a-label">{t.password}</span>
                <div className="a-input-wrap">
                  <input
                    className="a-input"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setFocused("password")}
                    onBlur={() => setFocused(null)}
                    required
                    minLength={6}
                    autoComplete="current-password"
                  />
                  <span className="a-input-line" />
                </div>
              </label>

              <button disabled={loading} type="submit" className="cta-btn">
                <span className="cta-btn-text">
                  {loading ? t.loading : t.login}
                </span>
                <span className="cta-btn-arrow" aria-hidden="true">
                  {locale === "ar" ? "←" : "→"}
                </span>
                <span className="cta-btn-shine" aria-hidden="true" />
              </button>
            </form>

            <p className="auth-footer-text">
              {t.dontHaveAccount}{" "}
              <Link href="/register" className="auth-link">
                {t.register}
              </Link>
            </p>
          </div>
        </div>
      </section>

      {/* Editorial side */}
      <aside className="auth-editorial">
        <div className="editorial-inner">
          <div
            className="editorial-number animate-rise"
            style={{ animationDelay: "200ms" }}
          >
            01
          </div>
          <p
            className="editorial-eyebrow animate-rise"
            style={{ animationDelay: "260ms" }}
          >
            {t.automaticLayout}
          </p>
          <h2
            className="editorial-title animate-rise"
            style={{ animationDelay: "320ms" }}
          >
            {t.loginEditorialLine1}
            <br />
            {t.loginEditorialLine2}
            <br />
            {t.loginEditorialLine3}
          </h2>

          <ul className="editorial-list">
            {[t.familyTree, t.eligibleHeirs, t.blockedHeirs, t.exportPdf].map(
              (item, i) => (
                <li
                  key={item}
                  className="editorial-item animate-rise"
                  style={{ animationDelay: `${400 + i * 80}ms` }}
                >
                  <span className="editorial-item-index">0{i + 1}</span>
                  <span className="editorial-item-label">{item}</span>
                  <span className="editorial-item-rule" />
                </li>
              ),
            )}
          </ul>

          {/* Decorative olive branch */}
          <svg
            className="editorial-branch"
            viewBox="0 0 200 400"
            aria-hidden="true"
          >
            <path d="M100 0 Q 100 200 100 400" className="branch-stem" />
            {[...Array(8)].map((_, i) => (
              <g
                key={i}
                className="branch-leaf"
                style={{ animationDelay: `${i * 120}ms` }}
              >
                <ellipse
                  cx={i % 2 === 0 ? 70 : 130}
                  cy={40 + i * 45}
                  rx="18"
                  ry="7"
                  transform={`rotate(${i % 2 === 0 ? -30 : 30} ${i % 2 === 0 ? 70 : 130} ${40 + i * 45})`}
                />
              </g>
            ))}
          </svg>
        </div>
      </aside>

      <style jsx global>{`
        .auth-shell {
          position: relative;
          display: grid;
          grid-template-columns: 1fr;
          min-height: 100vh;
          background: var(--bg);
          overflow: hidden;
          font-family: "Fraunces", "Cormorant Garamond", Georgia, serif;
        }
        @media (min-width: 1024px) {
          .auth-shell {
            grid-template-columns: 1.05fr 0.95fr;
          }
        }

        /* Ambient background */
        .auth-aurora {
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 0;
        }
        .aurora-blob {
          position: absolute;
          border-radius: 50%;
          filter: blur(90px);
          opacity: 0.45;
          animation: drift 18s ease-in-out infinite;
        }
        .aurora-blob--1 {
          width: 520px;
          height: 520px;
          background: radial-gradient(circle, var(--primary), transparent 70%);
          top: -160px;
          left: -120px;
        }
        .aurora-blob--2 {
          width: 620px;
          height: 620px;
          background: radial-gradient(circle, #d4a373, transparent 70%);
          bottom: -200px;
          right: -140px;
          animation-delay: -6s;
        }
        .aurora-grid {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(var(--border) 1px, transparent 1px),
            linear-gradient(90deg, var(--border) 1px, transparent 1px);
          background-size: 64px 64px;
          mask-image: radial-gradient(
            ellipse at center,
            black 30%,
            transparent 75%
          );
          opacity: 0.25;
        }
        @keyframes drift {
          0%,
          100% {
            transform: translate(0, 0) scale(1);
          }
          50% {
            transform: translate(40px, -30px) scale(1.08);
          }
        }

        /* Form pane */
        .auth-form-pane {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px 20px;
        }
        .auth-form-wrap {
          width: 100%;
          max-width: 460px;
        }

        .auth-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 40px;
        }
        .brand {
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .brand-mark {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 46px;
          height: 46px;
          border-radius: 14px;
          background: linear-gradient(
            135deg,
            var(--primary),
            color-mix(in srgb, var(--primary) 60%, #000)
          );
          color: white;
          box-shadow: 0 10px 30px -10px
            color-mix(in srgb, var(--primary) 60%, transparent);
        }
        .brand-mark-ping {
          position: absolute;
          inset: -4px;
          border-radius: 16px;
          border: 1.5px solid var(--primary);
          animation: ping 2.4s ease-out infinite;
        }
        @keyframes ping {
          0% {
            opacity: 0.8;
            transform: scale(0.9);
          }
          100% {
            opacity: 0;
            transform: scale(1.35);
          }
        }
        .brand-name {
          font-family: "Fraunces", Georgia, serif;
          font-size: 20px;
          font-weight: 800;
          letter-spacing: -0.02em;
          line-height: 1;
        }
        .brand-tag {
          font-family: "Inter", sans-serif;
          font-size: 12px;
          color: var(--muted);
          margin-top: 4px;
          letter-spacing: 0.02em;
        }
        .auth-controls {
          display: flex;
          gap: 8px;
        }
        .icon-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 42px;
          height: 42px;
          padding: 0 12px;
          border-radius: 12px;
          border: 1px solid var(--border);
          background: var(--surface);
          color: var(--text);
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.08em;
          font-family: "Inter", sans-serif;
          cursor: pointer;
          transition:
            transform 0.2s ease,
            border-color 0.2s ease,
            background 0.2s ease;
        }
        .icon-btn:hover {
          transform: translateY(-2px);
          border-color: var(--primary);
          background: color-mix(in srgb, var(--primary) 8%, var(--surface));
        }
        .icon-btn:active {
          transform: translateY(0);
        }

        /* Card */
        .auth-card {
          position: relative;
          padding: 36px 32px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 24px;
          box-shadow:
            0 1px 0 rgba(255, 255, 255, 0.04) inset,
            0 40px 80px -40px rgba(0, 0, 0, 0.25);
        }
        .auth-card-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-family: "Inter", sans-serif;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.2em;
          color: var(--muted);
          margin-bottom: 16px;
        }
        .dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--primary);
          box-shadow: 0 0 0 4px
            color-mix(in srgb, var(--primary) 20%, transparent);
          animation: pulse 2s ease-in-out infinite;
        }
        @keyframes pulse {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.4;
          }
        }
        .auth-title {
          font-family: "Fraunces", Georgia, serif;
          font-size: 44px;
          line-height: 1;
          font-weight: 900;
          letter-spacing: -0.035em;
          margin: 0 0 14px;
          display: flex;
          flex-direction: column;
        }
        .auth-title-line {
          display: block;
        }
        .auth-title-accent {
          font-style: italic;
          color: var(--primary);
          font-weight: 500;
        }
        .auth-sub {
          font-family: "Inter", sans-serif;
          font-size: 14px;
          color: var(--muted);
          margin: 0 0 28px;
          line-height: 1.55;
        }

        .auth-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .a-field {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .a-label {
          font-family: "Inter", sans-serif;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.16em;
          color: var(--muted);
          transition: color 0.2s ease;
        }
        .a-field.is-focused .a-label {
          color: var(--primary);
        }
        .a-input-wrap {
          position: relative;
        }
        .a-input {
          width: 100%;
          height: 48px;
          background: transparent;
          border: none;
          border-bottom: 1.5px solid var(--border);
          padding: 0 4px;
          font-family: "Inter", sans-serif;
          font-size: 16px;
          color: var(--text);
          outline: none;
          transition: border-color 0.3s ease;
        }
        .a-input-line {
          position: absolute;
          inset-inline-start: 0;
          bottom: -1.5px;
          height: 1.5px;
          width: 0;
          background: var(--primary);
          transition: width 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .a-field.is-focused .a-input-line {
          width: 100%;
        }

        .cta-btn {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          width: 100%;
          height: 56px;
          margin-top: 8px;
          border: none;
          border-radius: 16px;
          background: linear-gradient(
            135deg,
            var(--primary),
            color-mix(in srgb, var(--primary) 55%, #111)
          );
          color: white;
          font-family: "Inter", sans-serif;
          font-size: 15px;
          font-weight: 700;
          letter-spacing: 0.02em;
          cursor: pointer;
          overflow: hidden;
          transition:
            transform 0.2s ease,
            box-shadow 0.3s ease;
          box-shadow: 0 14px 30px -12px
            color-mix(in srgb, var(--primary) 60%, transparent);
        }
        .cta-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 20px 40px -14px
            color-mix(in srgb, var(--primary) 70%, transparent);
        }
        .cta-btn:hover:not(:disabled) .cta-btn-arrow {
          transform: translateX(4px);
        }
        [dir="rtl"] .cta-btn:hover:not(:disabled) .cta-btn-arrow {
          transform: translateX(-4px);
        }
        .cta-btn:hover:not(:disabled) .cta-btn-shine {
          transform: translateX(220%) skewX(-20deg);
        }
        .cta-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .cta-btn-arrow {
          transition: transform 0.3s ease;
          font-size: 18px;
        }
        .cta-btn-shine {
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

        .auth-footer-text {
          font-family: "Inter", sans-serif;
          text-align: center;
          font-size: 13px;
          color: var(--muted);
          margin-top: 24px;
        }
        .auth-link {
          color: var(--primary);
          font-weight: 700;
          text-decoration: none;
          border-bottom: 1.5px solid transparent;
          transition: border-color 0.2s ease;
        }
        .auth-link:hover {
          border-color: var(--primary);
        }

        /* Editorial pane */
        .auth-editorial {
          display: none;
          position: relative;
          z-index: 1;
          align-items: center;
          padding: 0 64px;
          border-inline-start: 1px solid var(--border);
          background:
            radial-gradient(
              ellipse at top right,
              color-mix(in srgb, var(--primary) 10%, transparent),
              transparent 60%
            ),
            var(--surface);
          overflow: hidden;
        }
        @media (min-width: 1024px) {
          .auth-editorial {
            display: flex;
          }
        }

        .editorial-inner {
          position: relative;
          max-width: 520px;
          z-index: 2;
        }
        .editorial-number {
          font-family: "Fraunces", Georgia, serif;
          font-size: 14px;
          font-weight: 500;
          letter-spacing: 0.3em;
          color: var(--primary);
          margin-bottom: 20px;
        }
        .editorial-eyebrow {
          font-family: "Inter", sans-serif;
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.24em;
          color: var(--muted);
          margin: 0 0 28px;
        }
        .editorial-title {
          font-family: "Fraunces", Georgia, serif;
          font-size: 56px;
          line-height: 1.02;
          letter-spacing: -0.035em;
          font-weight: 900;
          margin: 0 0 48px;
        }
        .editorial-title em {
          font-style: italic;
          font-weight: 400;
          color: var(--primary);
        }

        .editorial-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 0;
        }
        .editorial-item {
          display: flex;
          align-items: center;
          gap: 20px;
          padding: 18px 0;
          border-top: 1px solid var(--border);
          font-family: "Inter", sans-serif;
          transition: padding-inline-start 0.3s ease;
        }
        .editorial-item:last-child {
          border-bottom: 1px solid var(--border);
        }
        .editorial-item:hover {
          padding-inline-start: 12px;
        }
        .editorial-item-index {
          font-family: "Fraunces", Georgia, serif;
          font-size: 12px;
          color: var(--primary);
          letter-spacing: 0.2em;
          min-width: 24px;
        }
        .editorial-item-label {
          flex: 1;
          font-size: 15px;
          font-weight: 600;
          color: var(--text);
        }
        .editorial-item-rule {
          width: 24px;
          height: 1.5px;
          background: var(--primary);
          transition: width 0.3s ease;
        }
        .editorial-item:hover .editorial-item-rule {
          width: 48px;
        }

        /* Branch */
        .editorial-branch {
          position: absolute;
          top: -40px;
          right: -80px;
          width: 180px;
          height: 380px;
          opacity: 0.12;
          pointer-events: none;
        }
        .branch-stem {
          fill: none;
          stroke: var(--primary);
          stroke-width: 2;
          stroke-dasharray: 800;
          stroke-dashoffset: 800;
          animation: draw 2.4s ease forwards;
        }
        .branch-leaf {
          fill: var(--primary);
          opacity: 0;
          transform-origin: center;
          animation: leaf-in 0.6s ease forwards;
        }
        @keyframes draw {
          to {
            stroke-dashoffset: 0;
          }
        }
        @keyframes leaf-in {
          from {
            opacity: 0;
            transform: scale(0.3);
          }
          to {
            opacity: 0.9;
            transform: scale(1);
          }
        }

        /* Entrance */
        .animate-rise {
          opacity: 0;
          transform: translateY(18px);
          animation: rise 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes rise {
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .animate-rise,
          .aurora-blob,
          .dot,
          .brand-mark-ping,
          .branch-stem,
          .branch-leaf {
            animation: none !important;
          }
          .animate-rise {
            opacity: 1;
            transform: none;
          }
        }
      `}</style>
    </main>
  );
}
