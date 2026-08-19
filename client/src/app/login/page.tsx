"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function HireLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!email || !password) {
      setError("ALL FIELDS ARE REQUIRED.");
      return;
    }
    setLoading(true);
    try {
      // TODO: replace with real API call
      await new Promise((r) => setTimeout(r, 1200));
      router.push("/hire/dashboard");
    } catch (err: any) {
      setError(err.message || "INVALID CREDENTIALS. TRY AGAIN.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:ital,wght@0,400;0,700;1,400&family=Space+Grotesk:wght@400;500;700;900&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .hl-root {
          min-height: 100vh;
          background: #0a0a0a;
          font-family: 'Space Mono', monospace;
          color: #f0ede8;
          display: flex;
          overflow: hidden;
          position: relative;
        }

        /* grid bg */
        .hl-root::before {
          content: '';
          position: fixed;
          inset: 0;
          background-image:
            linear-gradient(rgba(232,255,71,0.025) 1px, transparent 1px),
            linear-gradient(90deg, rgba(232,255,71,0.025) 1px, transparent 1px);
          background-size: 48px 48px;
          pointer-events: none;
          z-index: 0;
        }

        /* ── Left panel (decorative) ── */
        .hl-left {
          display: none;
          position: relative;
          flex: 1;
          background: #0d0d0d;
          border-right: 1px solid rgba(232,255,71,0.1);
          flex-direction: column;
          justify-content: space-between;
          padding: 48px;
          overflow: hidden;
          z-index: 1;
        }
        @media (min-width: 1024px) { .hl-left { display: flex; } }

        .hl-left-grid {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(232,255,71,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(232,255,71,0.04) 1px, transparent 1px);
          background-size: 32px 32px;
          pointer-events: none;
        }

        /* animated scan line */
        .hl-scan {
          position: absolute;
          left: 0; right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(232,255,71,0.5), transparent);
          animation: scan 4s ease-in-out infinite;
          pointer-events: none;
        }
        @keyframes scan {
          0%   { top: 0%;   opacity: 0; }
          10%  { opacity: 1; }
          90%  { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }

        .hl-left-brand {
          position: relative;
          z-index: 2;
        }
        .hl-left-logo {
          font-family: 'Space Grotesk', sans-serif;
          font-weight: 900;
          font-size: 36px;
          text-transform: uppercase;
          letter-spacing: -0.03em;
          color: #f0ede8;
          line-height: 1;
        }
        .hl-left-logo span { color: #e8ff47; }
        .hl-left-tag {
          margin-top: 8px;
          font-family: 'Space Mono', monospace;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: rgba(240,237,232,0.3);
        }

        /* big decorative stat blocks */
        .hl-left-stats {
          position: relative;
          z-index: 2;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .hl-stat-block {
          border: 1px solid rgba(232,255,71,0.1);
          padding: 20px 24px;
          background: rgba(232,255,71,0.02);
          opacity: 0;
          animation: fadeUp 0.6s ease forwards;
        }
        .hl-stat-block:nth-child(1) { animation-delay: 0.4s; }
        .hl-stat-block:nth-child(2) { animation-delay: 0.55s; }
        .hl-stat-block:nth-child(3) { animation-delay: 0.7s; }
        .hl-stat-num {
          font-family: 'Space Grotesk', sans-serif;
          font-weight: 900;
          font-size: 40px;
          color: #e8ff47;
          letter-spacing: -0.02em;
          line-height: 1;
        }
        .hl-stat-label {
          font-family: 'Space Mono', monospace;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: rgba(240,237,232,0.35);
          margin-top: 4px;
        }

        .hl-left-footer {
          position: relative;
          z-index: 2;
          font-family: 'Space Mono', monospace;
          font-size: 10px;
          letter-spacing: 0.12em;
          color: rgba(240,237,232,0.2);
        }

        /* ── Right panel (form) ── */
        .hl-right {
          position: relative;
          z-index: 1;
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 32px 24px;
          min-height: 100vh;
        }
        @media (min-width: 1024px) {
          .hl-right {
            width: 480px;
            flex-shrink: 0;
            min-height: 100vh;
            padding: 48px 56px;
          }
        }

        .hl-form-wrap {
          width: 100%;
          max-width: 400px;
        }

        /* back button */
        .hl-back {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-family: 'Space Mono', monospace;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: rgba(240,237,232,0.35);
          background: none;
          border: none;
          cursor: pointer;
          padding: 0;
          margin-bottom: 40px;
          transition: color 0.2s;
          opacity: 0;
          animation: fadeIn 0.5s ease 0.1s forwards;
        }
        .hl-back:hover { color: #e8ff47; }

        /* heading */
        .hl-eyebrow {
          font-family: 'Space Mono', monospace;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.28em;
          text-transform: uppercase;
          color: #e8ff47;
          margin-bottom: 10px;
          opacity: 0;
          animation: fadeUp 0.5s ease 0.2s forwards;
        }
        .hl-heading {
          font-family: 'Space Grotesk', sans-serif;
          font-weight: 900;
          font-size: clamp(32px, 6vw, 44px);
          text-transform: uppercase;
          letter-spacing: -0.02em;
          line-height: 0.95;
          color: #f0ede8;
          margin-bottom: 8px;
          opacity: 0;
          animation: fadeUp 0.5s ease 0.3s forwards;
        }
        .hl-sub {
          font-family: 'Space Mono', monospace;
          font-size: 11px;
          color: rgba(240,237,232,0.35);
          line-height: 1.6;
          margin-bottom: 36px;
          opacity: 0;
          animation: fadeUp 0.5s ease 0.4s forwards;
        }

        /* form */
        .hl-form {
          display: flex;
          flex-direction: column;
          gap: 14px;
          opacity: 0;
          animation: fadeUp 0.5s ease 0.5s forwards;
        }

        .hl-field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .hl-label {
          font-family: 'Space Mono', monospace;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: rgba(240,237,232,0.4);
          transition: color 0.2s;
        }
        .hl-field.focused .hl-label { color: #e8ff47; }

        .hl-input-wrap {
          position: relative;
          display: flex;
          align-items: center;
        }
        .hl-input {
          width: 100%;
          background: #111;
          border: 1.5px solid rgba(240,237,232,0.1);
          color: #f0ede8;
          font-family: 'Space Mono', monospace;
          font-size: 13px;
          font-weight: 700;
          padding: 14px 16px;
          outline: none;
          transition: border-color 0.2s, background 0.2s;
          border-radius: 0;
          -webkit-appearance: none;
        }
        .hl-input::placeholder { color: rgba(240,237,232,0.18); font-weight: 400; }
        .hl-input:focus {
          border-color: #e8ff47;
          background: #131313;
        }
        .hl-input.has-right { padding-right: 48px; }

        .hl-input-btn {
          position: absolute;
          right: 14px;
          background: none;
          border: none;
          cursor: pointer;
          color: rgba(240,237,232,0.3);
          display: flex;
          align-items: center;
          padding: 0;
          transition: color 0.2s;
        }
        .hl-input-btn:hover { color: #e8ff47; }

        /* forgot */
        .hl-forgot {
          display: flex;
          justify-content: flex-end;
          margin-top: -4px;
        }
        .hl-forgot-btn {
          background: none;
          border: none;
          font-family: 'Space Mono', monospace;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: rgba(240,237,232,0.3);
          cursor: pointer;
          padding: 0;
          transition: color 0.2s;
          text-decoration: underline;
          text-decoration-style: dotted;
          text-underline-offset: 3px;
        }
        .hl-forgot-btn:hover { color: #e8ff47; }

        /* error */
        .hl-error {
          background: rgba(255,80,80,0.08);
          border: 1.5px solid rgba(255,80,80,0.3);
          padding: 10px 14px;
          font-family: 'Space Mono', monospace;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.1em;
          color: #ff8080;
          animation: shake 0.3s ease;
        }
        @keyframes shake {
          0%,100% { transform: translateX(0); }
          25% { transform: translateX(-6px); }
          75% { transform: translateX(6px); }
        }

        /* submit */
        .hl-submit {
          margin-top: 6px;
          width: 100%;
          padding: 16px 24px;
          background: #e8ff47;
          color: #0a0a0a;
          border: none;
          font-family: 'Space Grotesk', sans-serif;
          font-weight: 900;
          font-size: 14px;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          transition: background 0.2s, transform 0.1s;
          position: relative;
          overflow: hidden;
        }
        .hl-submit::after {
          content: '';
          position: absolute;
          inset: 0;
          background: rgba(255,255,255,0.15);
          opacity: 0;
          transition: opacity 0.2s;
        }
        .hl-submit:hover::after { opacity: 1; }
        .hl-submit:active { transform: translateY(1px); }
        .hl-submit:disabled { opacity: 0.5; cursor: not-allowed; }

        /* spinner */
        .hl-spinner {
          width: 16px;
          height: 16px;
          border: 2.5px solid rgba(10,10,10,0.3);
          border-top-color: #0a0a0a;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* divider */
        .hl-or {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 4px 0;
        }
        .hl-or-line {
          flex: 1;
          height: 1px;
          background: rgba(240,237,232,0.08);
        }
        .hl-or-text {
          font-family: 'Space Mono', monospace;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: rgba(240,237,232,0.2);
        }

        /* register link */
        .hl-register {
          text-align: center;
          font-family: 'Space Mono', monospace;
          font-size: 11px;
          color: rgba(240,237,232,0.3);
          line-height: 1.5;
        }
        .hl-register-link {
          background: none;
          border: none;
          font-family: 'Space Mono', monospace;
          font-size: 11px;
          font-weight: 700;
          color: #e8ff47;
          cursor: pointer;
          padding: 0;
          text-decoration: underline;
          text-decoration-style: dotted;
          text-underline-offset: 3px;
          transition: opacity 0.2s;
        }
        .hl-register-link:hover { opacity: 0.75; }

        /* bottom note */
        .hl-bottom-note {
          margin-top: 32px;
          text-align: center;
          font-family: 'Space Mono', monospace;
          font-size: 9px;
          letter-spacing: 0.12em;
          color: rgba(240,237,232,0.15);
          opacity: 0;
          animation: fadeIn 0.6s ease 1s forwards;
        }

        /* animations */
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }

        @media (prefers-reduced-motion: reduce) {
          * { animation: none !important; opacity: 1 !important; }
        }
      `}</style>

      <div className="hl-root">

        {/* ── Left decorative panel ── */}
        <div className="hl-left">
          <div className="hl-left-grid" />
          <div className="hl-scan" />

          <div className="hl-left-brand">
            <div className="hl-left-logo">RAD<span>A</span>R</div>
            <div className="hl-left-tag">TALENT INTELLIGENCE PLATFORM</div>
          </div>

          <div className="hl-left-stats">
            <div className="hl-stat-block">
              <div className="hl-stat-num">2,400+</div>
              <div className="hl-stat-label">VERIFIED EDITORS ON PLATFORM</div>
            </div>
            <div className="hl-stat-block">
              <div className="hl-stat-num">340+</div>
              <div className="hl-stat-label">CONTESTS COMPLETED</div>
            </div>
            <div className="hl-stat-block">
              <div className="hl-stat-num">98%</div>
              <div className="hl-stat-label">HIRING SATISFACTION RATE</div>
            </div>
          </div>

          <div className="hl-left-footer">
            © {new Date().getFullYear()} RADAR · ALL RIGHTS RESERVED
          </div>
        </div>

        {/* ── Right form panel ── */}
        <div className="hl-right">
          <div className="hl-form-wrap">

            {/* Back */}
            <button className="hl-back" onClick={() => router.push("/")}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 5l-7 7 7 7"/>
              </svg>
              BACK TO HOME
            </button>

            {/* Heading */}
            <p className="hl-eyebrow">HIRING MANAGER PORTAL</p>
            <h1 className="hl-heading">WELCOME<br />BACK.</h1>
            <p className="hl-sub">Sign in to access your talent dashboard<br />and manage your hiring pipeline.</p>

            {/* Form */}
            <form className="hl-form" onSubmit={handleLogin} noValidate>

              {/* Email */}
              <div className={`hl-field ${focusedField === "email" ? "focused" : ""}`}>
                <label className="hl-label" htmlFor="email">WORK EMAIL</label>
                <div className="hl-input-wrap">
                  <input
                    id="email"
                    type="email"
                    className="hl-input"
                    placeholder="you@studio.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={() => setFocusedField("email")}
                    onBlur={() => setFocusedField(null)}
                    autoComplete="email"
                  />
                </div>
              </div>

              {/* Password */}
              <div className={`hl-field ${focusedField === "password" ? "focused" : ""}`}>
                <label className="hl-label" htmlFor="password">PASSWORD</label>
                <div className="hl-input-wrap">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    className="hl-input has-right"
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setFocusedField("password")}
                    onBlur={() => setFocusedField(null)}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="hl-input-btn"
                    onClick={() => setShowPassword((p) => !p)}
                    tabIndex={-1}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                        <line x1="1" y1="1" x2="23" y2="23"/>
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Forgot password */}
              <div className="hl-forgot">
                <button
                  type="button"
                  className="hl-forgot-btn"
                  onClick={() => router.push("/hire/forgot-password")}
                >
                  FORGOT PASSWORD?
                </button>
              </div>

              {/* Error */}
              {error && <div className="hl-error">{error}</div>}

              {/* Submit */}
              <button type="submit" className="hl-submit" disabled={loading}>
                {loading ? (
                  <>
                    <div className="hl-spinner" />
                    SIGNING IN...
                  </>
                ) : (
                  <>
                    SIGN IN
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14M12 5l7 7-7 7"/>
                    </svg>
                  </>
                )}
              </button>

              {/* Divider */}
              <div className="hl-or">
                <div className="hl-or-line" />
                <span className="hl-or-text">OR</span>
                <div className="hl-or-line" />
              </div>

              {/* Register */}
              <div className="hl-register">
                DON'T HAVE AN ACCOUNT?&nbsp;
                <button
                  type="button"
                  className="hl-register-link"
                  onClick={() => router.push("/hire/register")}
                >
                  REGISTER NOW →
                </button>
              </div>

            </form>

            <p className="hl-bottom-note">
              RADAR · SECURE · VERIFIED · TRUSTED
            </p>

          </div>
        </div>

      </div>
    </>
  );
}