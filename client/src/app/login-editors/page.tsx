"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { loginEditor } from "@/lib/api";

export default function EditorLoginPage() {
  const router = useRouter();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const isPhone = /^\d+$/.test(identifier.trim());

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!identifier.trim() || !password) {
      setError("ALL FIELDS ARE REQUIRED.");
      return;
    }

    setLoading(true);
    try {
      const res = await loginEditor({
        identifier: identifier.trim(),
        password,
      });

      // Phone not verified → redirect to OTP page
      if (res?.redirect === "/verify-phone") {
        router.push(`/editor/verify-phone?id=${res.id}`);
        return;
      }

      if (res?.token) {
        localStorage.setItem("editor_token", res.token);
        router.push("/editor/dashboard");
      }
    } catch (err: any) {
      const msg: string = err.message || "";
      if (msg.toLowerCase().includes("no account found")) {
        setError("NO ACCOUNT FOUND. PLEASE REGISTER FIRST.");
      } else if (msg.toLowerCase().includes("invalid password")) {
        setError("WRONG PASSWORD. TRY AGAIN.");
      } else if (msg.toLowerCase().includes("phone verification")) {
        setError("PHONE VERIFICATION REQUIRED.");
      } else {
        setError(msg || "SOMETHING WENT WRONG. TRY AGAIN.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:ital,wght@0,400;0,700;1,400&family=Space+Grotesk:wght@400;500;700;900&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .el-root {
          min-height: 100vh;
          background: #0a0a0a;
          font-family: 'Space Mono', monospace;
          color: #f0ede8;
          display: flex;
          overflow: hidden;
          position: relative;
        }

        /* grid bg */
        .el-root::before {
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

        /* ── Left panel ── */
        .el-left {
          display: none;
          position: relative;
          flex: 1;
          background: #0d0d0d;
          border-right: 1px solid rgba(232,255,71,0.08);
          flex-direction: column;
          justify-content: space-between;
          padding: 48px;
          overflow: hidden;
          z-index: 1;
        }
        @media (min-width: 1024px) { .el-left { display: flex; } }

        .el-left-grid {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(232,255,71,0.035) 1px, transparent 1px),
            linear-gradient(90deg, rgba(232,255,71,0.035) 1px, transparent 1px);
          background-size: 32px 32px;
          pointer-events: none;
        }

        /* animated film strip lines */
        .el-film-line {
          position: absolute;
          left: 0; right: 0;
          height: 2px;
          background: linear-gradient(90deg, transparent 0%, rgba(232,255,71,0.4) 40%, rgba(232,255,71,0.4) 60%, transparent 100%);
          pointer-events: none;
        }
        .el-film-line:nth-child(1) { animation: filmScroll 6s ease-in-out infinite; }
        .el-film-line:nth-child(2) { animation: filmScroll 6s ease-in-out 2s infinite; }
        .el-film-line:nth-child(3) { animation: filmScroll 6s ease-in-out 4s infinite; }
        @keyframes filmScroll {
          0%   { top: -2px; opacity: 0; }
          8%   { opacity: 0.8; }
          92%  { opacity: 0.8; }
          100% { top: 100%; opacity: 0; }
        }

        .el-left-brand { position: relative; z-index: 2; }
        .el-left-logo {
          font-family: 'Space Grotesk', sans-serif;
          font-weight: 900;
          font-size: 36px;
          text-transform: uppercase;
          letter-spacing: -0.03em;
          color: #f0ede8;
          line-height: 1;
        }
        .el-left-logo span { color: #e8ff47; }
        .el-left-tag {
          margin-top: 8px;
          font-family: 'Space Mono', monospace;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: rgba(240,237,232,0.3);
        }

        /* decorative quote cards */
        .el-left-quotes {
          position: relative;
          z-index: 2;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .el-quote-card {
          border: 1px solid rgba(232,255,71,0.1);
          padding: 20px 24px;
          background: rgba(232,255,71,0.02);
          opacity: 0;
          animation: fadeUp 0.6s ease forwards;
        }
        .el-quote-card:nth-child(1) { animation-delay: 0.3s; }
        .el-quote-card:nth-child(2) { animation-delay: 0.45s; }
        .el-quote-card:nth-child(3) { animation-delay: 0.6s; }
        .el-quote-mark {
          font-family: 'Space Grotesk', sans-serif;
          font-weight: 900;
          font-size: 28px;
          color: #e8ff47;
          line-height: 1;
          margin-bottom: 6px;
          opacity: 0.6;
        }
        .el-quote-text {
          font-family: 'Space Mono', monospace;
          font-size: 11px;
          font-weight: 400;
          font-style: italic;
          color: rgba(240,237,232,0.5);
          line-height: 1.6;
        }
        .el-quote-author {
          margin-top: 8px;
          font-family: 'Space Mono', monospace;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: rgba(240,237,232,0.25);
        }

        /* editorzzz badge on left */
        .el-partner-badge {
          position: relative;
          z-index: 2;
          display: inline-flex;
          align-items: center;
          gap: 10px;
          border: 1px solid rgba(232,255,71,0.2);
          padding: 10px 16px;
          background: rgba(232,255,71,0.04);
        }
        .el-partner-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #e8ff47;
          flex-shrink: 0;
          animation: pulse 2s ease-in-out infinite;
        }
        @keyframes pulse {
          0%,100% { opacity: 1; transform: scale(1); }
          50%      { opacity: 0.5; transform: scale(0.8); }
        }
        .el-partner-text {
          font-family: 'Space Mono', monospace;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: rgba(240,237,232,0.4);
        }
        .el-partner-text span {
          color: #e8ff47;
        }

        .el-left-footer {
          position: relative;
          z-index: 2;
          font-family: 'Space Mono', monospace;
          font-size: 10px;
          letter-spacing: 0.12em;
          color: rgba(240,237,232,0.2);
        }

        /* ── Right panel (form) ── */
        .el-right {
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
          .el-right {
            width: 480px;
            flex-shrink: 0;
            padding: 48px 56px;
          }
        }

        .el-form-wrap {
          width: 100%;
          max-width: 400px;
        }

        /* back */
        .el-back {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-family: 'Space Mono', monospace;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: rgba(240,237,232,0.3);
          background: none;
          border: none;
          cursor: pointer;
          padding: 0;
          margin-bottom: 40px;
          transition: color 0.2s;
          opacity: 0;
          animation: fadeIn 0.5s ease 0.1s forwards;
        }
        .el-back:hover { color: #e8ff47; }

        /* editorzzz notice banner */
        .el-notice {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          background: rgba(232,255,71,0.05);
          border: 1.5px solid rgba(232,255,71,0.2);
          padding: 12px 14px;
          margin-bottom: 28px;
          opacity: 0;
          animation: fadeUp 0.5s ease 0.25s forwards;
        }
        .el-notice-icon {
          color: #e8ff47;
          flex-shrink: 0;
          margin-top: 1px;
        }
        .el-notice-text {
          font-family: 'Space Mono', monospace;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.06em;
          line-height: 1.65;
          color: rgba(240,237,232,0.5);
          text-transform: uppercase;
        }
        .el-notice-text span {
          color: #e8ff47;
        }

        /* heading */
        .el-eyebrow {
          font-family: 'Space Mono', monospace;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.28em;
          text-transform: uppercase;
          color: #e8ff47;
          margin-bottom: 10px;
          opacity: 0;
          animation: fadeUp 0.5s ease 0.3s forwards;
        }
        .el-heading {
          font-family: 'Space Grotesk', sans-serif;
          font-weight: 900;
          font-size: clamp(32px, 6vw, 44px);
          text-transform: uppercase;
          letter-spacing: -0.02em;
          line-height: 0.95;
          color: #f0ede8;
          margin-bottom: 8px;
          opacity: 0;
          animation: fadeUp 0.5s ease 0.38s forwards;
        }
        .el-sub {
          font-family: 'Space Mono', monospace;
          font-size: 11px;
          color: rgba(240,237,232,0.35);
          line-height: 1.6;
          margin-bottom: 32px;
          opacity: 0;
          animation: fadeUp 0.5s ease 0.46s forwards;
        }

        /* tabs — email vs phone */
        .el-tabs {
          display: flex;
          gap: 2px;
          margin-bottom: 20px;
          opacity: 0;
          animation: fadeUp 0.5s ease 0.52s forwards;
        }
        .el-tab {
          flex: 1;
          padding: 10px;
          background: #111;
          border: 1.5px solid rgba(240,237,232,0.08);
          font-family: 'Space Mono', monospace;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: rgba(240,237,232,0.3);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          transition: border-color 0.2s, color 0.2s, background 0.2s;
        }
        .el-tab.active {
          border-color: #e8ff47;
          color: #e8ff47;
          background: rgba(232,255,71,0.05);
        }
        .el-tab:hover:not(.active) {
          border-color: rgba(240,237,232,0.2);
          color: rgba(240,237,232,0.6);
        }

        /* form */
        .el-form {
          display: flex;
          flex-direction: column;
          gap: 14px;
          opacity: 0;
          animation: fadeUp 0.5s ease 0.58s forwards;
        }

        .el-field { display: flex; flex-direction: column; gap: 6px; }
        .el-label {
          font-family: 'Space Mono', monospace;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: rgba(240,237,232,0.4);
          transition: color 0.2s;
        }
        .el-field.focused .el-label { color: #e8ff47; }

        .el-input-wrap {
          position: relative;
          display: flex;
          align-items: center;
        }

        /* phone prefix */
        .el-phone-prefix {
          position: absolute;
          left: 14px;
          font-family: 'Space Mono', monospace;
          font-size: 13px;
          font-weight: 700;
          color: rgba(240,237,232,0.4);
          pointer-events: none;
          z-index: 1;
          transition: color 0.2s;
        }
        .el-field.focused .el-phone-prefix { color: rgba(240,237,232,0.7); }

        .el-input {
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
          -webkit-appearance: none;
          border-radius: 0;
        }
        .el-input::placeholder { color: rgba(240,237,232,0.18); font-weight: 400; }
        .el-input:focus { border-color: #e8ff47; background: #131313; }
        .el-input.has-prefix { padding-left: 52px; }
        .el-input.has-right  { padding-right: 48px; }

        .el-input-btn {
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
        .el-input-btn:hover { color: #e8ff47; }

        /* forgot */
        .el-forgot {
          display: flex;
          justify-content: flex-end;
          margin-top: -4px;
        }
        .el-forgot-btn {
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
        .el-forgot-btn:hover { color: #e8ff47; }

        /* forgot panel */
        .el-forgot-panel {
          background: #111;
          border: 1.5px solid rgba(232,255,71,0.15);
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-top: -4px;
          animation: fadeUp 0.3s ease;
        }
        .el-forgot-panel-title {
          font-family: 'Space Mono', monospace;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: rgba(240,237,232,0.35);
          line-height: 1.6;
        }
        .el-forgot-panel-title span { color: #e8ff47; }
        .el-forgot-panel-link {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 11px 16px;
          background: #e8ff47;
          color: #0a0a0a;
          font-family: 'Space Grotesk', sans-serif;
          font-weight: 900;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          text-decoration: none;
          transition: opacity 0.2s;
          border: none;
          cursor: pointer;
          width: 100%;
          justify-content: center;
        }
        .el-forgot-panel-link:hover { opacity: 0.85; }

        /* error */
        .el-error {
          background: rgba(255,80,80,0.08);
          border: 1.5px solid rgba(255,80,80,0.3);
          padding: 10px 14px;
          font-family: 'Space Mono', monospace;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.08em;
          color: #ff8080;
          animation: shake 0.3s ease;
        }
        @keyframes shake {
          0%,100% { transform: translateX(0); }
          25%      { transform: translateX(-6px); }
          75%      { transform: translateX(6px); }
        }

        /* submit */
        .el-submit {
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
          position: relative;
          overflow: hidden;
          transition: opacity 0.2s, transform 0.1s;
        }
        .el-submit::after {
          content: '';
          position: absolute;
          inset: 0;
          background: rgba(255,255,255,0.15);
          opacity: 0;
          transition: opacity 0.2s;
        }
        .el-submit:hover::after { opacity: 1; }
        .el-submit:active { transform: translateY(1px); }
        .el-submit:disabled { opacity: 0.5; cursor: not-allowed; }

        .el-spinner {
          width: 16px;
          height: 16px;
          border: 2.5px solid rgba(10,10,10,0.3);
          border-top-color: #0a0a0a;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* divider */
        .el-or {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 4px 0;
        }
        .el-or-line { flex: 1; height: 1px; background: rgba(240,237,232,0.08); }
        .el-or-text {
          font-family: 'Space Mono', monospace;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: rgba(240,237,232,0.2);
        }

        /* register */
        .el-register {
          text-align: center;
          font-family: 'Space Mono', monospace;
          font-size: 11px;
          color: rgba(240,237,232,0.3);
          line-height: 1.5;
        }
        .el-register-link {
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
        .el-register-link:hover { opacity: 0.75; }

        .el-bottom-note {
          margin-top: 32px;
          text-align: center;
          font-family: 'Space Mono', monospace;
          font-size: 9px;
          letter-spacing: 0.12em;
          color: rgba(240,237,232,0.15);
          opacity: 0;
          animation: fadeIn 0.6s ease 1.1s forwards;
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

      <div className="el-root">

        {/* ── Left decorative panel ── */}
        <div className="el-left">
          <div className="el-left-grid" />
          <div className="el-film-line" />
          <div className="el-film-line" />
          <div className="el-film-line" />

          <div className="el-left-brand">
            <div className="el-left-logo">RAD<span>A</span>R</div>
            <div className="el-left-tag">TALENT INTELLIGENCE PLATFORM</div>
          </div>

          <div className="el-left-quotes">
            <div className="el-quote-card">
              <div className="el-quote-mark">"</div>
              <div className="el-quote-text">Your reel is your resume. Make every frame count.</div>
              <div className="el-quote-author">— RADAR EDITOR COLLECTIVE</div>
            </div>
            <div className="el-quote-card">
              <div className="el-quote-mark">"</div>
              <div className="el-quote-text">Compete. Get noticed. Get hired. No middlemen.</div>
              <div className="el-quote-author">— RADAR MANIFESTO</div>
            </div>
            <div className="el-quote-card">
              <div className="el-quote-mark">"</div>
              <div className="el-quote-text">The best editors don't apply — they get found.</div>
              <div className="el-quote-author">— RADAR HIRING REPORT 2024</div>
            </div>
          </div>

          <div className="el-partner-badge">
            <div className="el-partner-dot" />
            <div className="el-partner-text">POWERED BY <span>EDITORZZZ.COM</span></div>
          </div>

          <div className="el-left-footer">
            © {new Date().getFullYear()} RADAR · ALL RIGHTS RESERVED
          </div>
        </div>

        {/* ── Right form panel ── */}
        <div className="el-right">
          <div className="el-form-wrap">

            {/* Back */}
            <button className="el-back" onClick={() => router.push("/")}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 5l-7 7 7 7"/>
              </svg>
              BACK TO HOME
            </button>

            {/* Editorzzz notice */}
            <div className="el-notice">
              <div className="el-notice-icon">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
              </div>
              <div className="el-notice-text">
                USE YOUR <span>EDITORZZZ.COM</span> CREDENTIALS TO SIGN IN.<br />
                SAME ACCOUNT — WORKS ACROSS BOTH PLATFORMS.
              </div>
            </div>

            {/* Heading */}
            <p className="el-eyebrow">EDITOR PORTAL</p>
            <h1 className="el-heading">SIGN IN<br />TO RADAR.</h1>
            <p className="el-sub">Enter your editorzzz.com email / phone<br />and password to continue.</p>

            {/* Login type tabs */}
            <EditorLoginForm
              router={router}
              loading={loading}
              error={error}
              identifier={identifier}
              setIdentifier={setIdentifier}
              password={password}
              setPassword={setPassword}
              showPassword={showPassword}
              setShowPassword={setShowPassword}
              focusedField={focusedField}
              setFocusedField={setFocusedField}
              handleLogin={handleLogin}
            />

            <p className="el-bottom-note">
              RADAR × EDITORZZZ · SECURE · VERIFIED · TRUSTED
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

/* ── Extracted inner form component so hooks are clean ── */
function EditorLoginForm({
  router, loading, error,
  identifier, setIdentifier,
  password, setPassword,
  showPassword, setShowPassword,
  focusedField, setFocusedField,
  handleLogin,
}: any) {
  const [mode, setMode] = useState<"email" | "phone">("email");
  const [showForgot, setShowForgot] = useState(false);

  return (
    <>
      {/* Tabs */}
      <div className="el-tabs">
        <button
          type="button"
          className={`el-tab ${mode === "email" ? "active" : ""}`}
          onClick={() => { setMode("email"); setIdentifier(""); }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
            <polyline points="22,6 12,13 2,6"/>
          </svg>
          EMAIL
        </button>
        <button
          type="button"
          className={`el-tab ${mode === "phone" ? "active" : ""}`}
          onClick={() => { setMode("phone"); setIdentifier(""); }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/>
            <line x1="12" y1="18" x2="12.01" y2="18"/>
          </svg>
          PHONE
        </button>
      </div>

      <form className="el-form" onSubmit={handleLogin} noValidate>

        {/* Identifier */}
        <div className={`el-field ${focusedField === "id" ? "focused" : ""}`}>
          <label className="el-label" htmlFor="identifier">
            {mode === "email" ? "EMAIL ADDRESS" : "PHONE NUMBER"}
          </label>
          <div className="el-input-wrap">
            {mode === "phone" && (
              <span className="el-phone-prefix">+91</span>
            )}
            <input
              id="identifier"
              type={mode === "email" ? "email" : "tel"}
              inputMode={mode === "phone" ? "numeric" : "email"}
              maxLength={mode === "phone" ? 10 : undefined}
              className={`el-input ${mode === "phone" ? "has-prefix" : ""}`}
              placeholder={mode === "email" ? "you@editorzzz.com" : "10-digit mobile number"}
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              onFocus={() => setFocusedField("id")}
              onBlur={() => setFocusedField(null)}
              autoComplete={mode === "email" ? "email" : "tel"}
            />
          </div>
        </div>

        {/* Password */}
        <div className={`el-field ${focusedField === "password" ? "focused" : ""}`}>
          <label className="el-label" htmlFor="password">PASSWORD</label>
          <div className="el-input-wrap">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              className="el-input has-right"
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={() => setFocusedField("password")}
              onBlur={() => setFocusedField(null)}
              autoComplete="current-password"
            />
            <button
              type="button"
              className="el-input-btn"
              onClick={() => setShowPassword((p: boolean) => !p)}
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

        {/* Forgot password toggle */}
        <div className="el-forgot">
          <button
            type="button"
            className="el-forgot-btn"
            onClick={() => setShowForgot((v: boolean) => !v)}
          >
            FORGOT PASSWORD?
          </button>
        </div>

        {/* Forgot panel */}
        {showForgot && (
          <div className="el-forgot-panel">
            <div className="el-forgot-panel-title">
              RESET YOUR PASSWORD AT{" "}
              <span>EDITORZZZ.COM</span>.<br />
              USE THE SAME CREDENTIALS HERE AFTER RESET.
            </div>
            <a
              href="https://editorzzz.com/forgot-password"
              target="_blank"
              rel="noopener noreferrer"
              className="el-forgot-panel-link"
            >
              RESET ON EDITORZZZ.COM
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                <polyline points="15 3 21 3 21 9"/>
                <line x1="10" y1="14" x2="21" y2="3"/>
              </svg>
            </a>
          </div>
        )}

        {/* Error */}
        {error && <div className="el-error">⚠ {error}</div>}

        {/* Submit */}
        <button type="submit" className="el-submit" disabled={loading}>
          {loading ? (
            <>
              <div className="el-spinner" />
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
        <div className="el-or">
          <div className="el-or-line" />
          <span className="el-or-text">OR</span>
          <div className="el-or-line" />
        </div>

        {/* Register */}
        <div className="el-register">
          DON'T HAVE AN ACCOUNT?&nbsp;
          <a
            href="https://editorzzz.com/register"
            target="_blank"
            rel="noopener noreferrer"
            className="el-register-link"
          >
            REGISTER ON EDITORZZZ.COM →
          </a>
        </div>

      </form>
    </>
  );
}