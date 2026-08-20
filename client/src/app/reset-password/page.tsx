"use client";

import { useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ResetPassword } from "@/lib/api"; 
import { toast } from "sonner";
import { Lock, Eye, EyeOff, ArrowLeft, ShieldCheck } from "lucide-react";

const OTP_LENGTH = 4;

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const identifier = searchParams.get("identifier") || "";

  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  const handleOtpChange = (value: string, index: number) => {
    if (!/^[0-9]?$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < OTP_LENGTH - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (!text) return;
    const next = Array(OTP_LENGTH).fill("");
    text.split("").forEach((ch, i) => (next[i] = ch));
    setOtp(next);
    inputsRef.current[Math.min(text.length, OTP_LENGTH - 1)]?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!identifier) {
      toast.error("MISSING ACCOUNT REFERENCE — RESTART FROM FORGOT PASSWORD");
      return;
    }

    const finalOtp = otp.join("");

    if (finalOtp.length !== OTP_LENGTH) {
      toast.error(`ENTER COMPLETE ${OTP_LENGTH}-DIGIT OTP`);
      return;
    }

    if (password.length < 8) {
      toast.error("PASSWORD MUST BE 8+ CHARS");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("PASSWORDS DON'T MATCH");
      return;
    }

    try {
      setLoading(true);

      const res = await ResetPassword({
        identifier,
        otp: finalOtp,
        new_password: password,
      });

      toast.success(res?.message?.toUpperCase() || "PASSWORD RESET SUCCESSFUL");

      setTimeout(() => {
        router.push("/hire/login");
      }, 1500);
    } catch (err: any) {
      const message = err?.data?.error || err?.response?.data?.error || err?.message;
      toast.error(message?.toUpperCase() || "SOMETHING WENT WRONG");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rpw-card">
      {/* Header */}
      <div className="rpw-card-header">
        <div className="rpw-icon-badge">
          <ShieldCheck size={26} strokeWidth={2.5} />
        </div>
        <h1 className="rpw-title">New Password</h1>
        <p className="rpw-sub">Secure your account with a new password.</p>
      </div>

      <form onSubmit={handleSubmit} className="rpw-form">
        {/* OTP Inputs */}
        <div className="rpw-field">
          <label className="rpw-label">{OTP_LENGTH}-Digit Verification Code</label>
          <div className="rpw-otp-row" onPaste={handlePaste}>
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={(el) => { inputsRef.current[index] = el; }}
                value={digit}
                onChange={(e) => handleOtpChange(e.target.value, index)}
                onKeyDown={(e) => handleKeyDown(e, index)}
                maxLength={1}
                inputMode="numeric"
                pattern="[0-9]*"
                className={`rpw-otp-input${digit ? " rpw-otp-filled" : ""}`}
                disabled={loading}
                aria-label={`Digit ${index + 1} of ${OTP_LENGTH}`}
              />
            ))}
          </div>
        </div>

        {/* New Password */}
        <div className="rpw-field">
          <label className="rpw-label" htmlFor="password">New Password</label>
          <div className="rpw-input-row">
            <span className="rpw-input-icon"><Lock size={16} strokeWidth={2.5} /></span>
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
              className="rpw-input rpw-has-icon rpw-has-toggle"
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="rpw-toggle"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={16} strokeWidth={2.5} /> : <Eye size={16} strokeWidth={2.5} />}
            </button>
          </div>
        </div>

        {/* Confirm Password */}
        <div className="rpw-field">
          <label className="rpw-label" htmlFor="confirm_password">Confirm New Password</label>
          <div className="rpw-input-row">
            <span className="rpw-input-icon"><Lock size={16} strokeWidth={2.5} /></span>
            <input
              id="confirm_password"
              type={showConfirm ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
              className="rpw-input rpw-has-icon rpw-has-toggle"
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setShowConfirm((s) => !s)}
              className="rpw-toggle"
              aria-label={showConfirm ? "Hide password" : "Show password"}
            >
              {showConfirm ? <EyeOff size={16} strokeWidth={2.5} /> : <Eye size={16} strokeWidth={2.5} />}
            </button>
          </div>
        </div>

        {/* Submit */}
        <button type="submit" disabled={loading} className="rpw-submit">
          {loading ? (
            <>
              <span className="rpw-spinner" />
              UPDATING
            </>
          ) : (
            "RESET PASSWORD"
          )}
        </button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  const router = useRouter();

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:ital,wght@0,400;0,700;1,400&family=Space+Grotesk:wght@400;500;700;900&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .rpw-root {
          min-height: 100vh;
          background: #0a0a0a;
          font-family: 'Space Mono', monospace;
          color: #f0ede8;
          display: flex;
          flex-direction: column;
          position: relative;
          overflow-x: hidden;
        }

        .rpw-root::before {
          content: '';
          position: fixed;
          inset: 0;
          background-image:
            linear-gradient(rgba(232,255,71,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(232,255,71,0.03) 1px, transparent 1px);
          background-size: 48px 48px;
          pointer-events: none;
          z-index: 0;
        }

        /* Navbar */
        .rpw-nav {
          position: sticky;
          top: 0;
          z-index: 20;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 24px;
          border-bottom: 2px solid rgba(240,237,232,0.1);
          background: rgba(10,10,10,0.85);
          backdrop-filter: blur(6px);
        }
        .rpw-nav-back {
          display: flex;
          align-items: center;
          gap: 8px;
          background: none;
          border: none;
          color: rgba(240,237,232,0.6);
          cursor: pointer;
          padding: 6px 10px;
          transition: color 0.2s, background 0.2s;
          font-family: 'Space Mono', monospace;
        }
        .rpw-nav-back:hover { color: #e8ff47; background: rgba(232,255,71,0.06); }
        .rpw-nav-back span {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.16em;
          text-transform: uppercase;
        }
        .rpw-nav-brand {
          font-family: 'Space Grotesk', sans-serif;
          font-weight: 900;
          font-size: 18px;
          text-transform: uppercase;
          letter-spacing: -0.02em;
        }
        .rpw-nav-brand span { color: #e8ff47; }
        .rpw-nav-spacer { width: 72px; }

        /* Main */
        .rpw-main {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 48px 24px;
          position: relative;
          z-index: 1;
        }

        .rpw-card {
          width: 100%;
          max-width: 420px;
          border: 2px solid rgba(240,237,232,0.12);
          background: #111;
          padding: 32px 28px;
          opacity: 0;
          animation: fadeUp 0.6s ease 0.1s forwards;
        }
        @media (min-width: 480px) {
          .rpw-card { padding: 40px 36px; }
        }

        .rpw-card-header {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding-bottom: 28px;
          margin-bottom: 28px;
          border-bottom: 2px solid rgba(240,237,232,0.1);
        }

        .rpw-icon-badge {
          width: 56px;
          height: 56px;
          border: 2px solid #e8ff47;
          color: #e8ff47;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 18px;
        }

        .rpw-title {
          font-family: 'Space Grotesk', sans-serif;
          font-weight: 900;
          font-size: clamp(24px, 5.5vw, 30px);
          text-transform: uppercase;
          letter-spacing: -0.02em;
          line-height: 1;
          color: #f0ede8;
          margin-bottom: 10px;
        }

        .rpw-sub {
          font-size: 10.5px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: rgba(240,237,232,0.4);
          line-height: 1.6;
          max-width: 280px;
        }

        .rpw-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .rpw-field { display: flex; flex-direction: column; gap: 8px; }

        .rpw-label {
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: rgba(240,237,232,0.5);
        }

        .rpw-otp-row {
          display: grid;
          grid-template-columns: repeat(${OTP_LENGTH}, 1fr);
          gap: 10px;
        }

        .rpw-otp-input {
          width: 100%;
          aspect-ratio: 1;
          text-align: center;
          background: #0a0a0a;
          border: 2px solid rgba(240,237,232,0.15);
          color: #f0ede8;
          font-family: 'Space Grotesk', sans-serif;
          font-weight: 900;
          font-size: 22px;
          outline: none;
          transition: border-color 0.2s, background 0.2s;
        }
        .rpw-otp-input:focus {
          border-color: #e8ff47;
          background: #141400;
        }
        .rpw-otp-input.rpw-otp-filled { border-color: rgba(232,255,71,0.4); }
        .rpw-otp-input:disabled { opacity: 0.5; }

        .rpw-input-row {
          position: relative;
          display: flex;
          align-items: center;
          border: 2px solid rgba(240,237,232,0.15);
          background: #0a0a0a;
          transition: border-color 0.2s, background 0.2s;
        }
        .rpw-input-row:focus-within {
          border-color: #e8ff47;
          background: #141400;
        }

        .rpw-input-icon {
          padding-left: 14px;
          display: flex;
          align-items: center;
          color: rgba(240,237,232,0.4);
          flex-shrink: 0;
        }

        .rpw-input {
          width: 100%;
          background: transparent;
          border: none;
          color: #f0ede8;
          font-family: 'Space Mono', monospace;
          font-size: 14px;
          font-weight: 700;
          padding: 14px 16px;
          outline: none;
        }
        .rpw-input::placeholder { color: rgba(240,237,232,0.25); }
        .rpw-input.rpw-has-icon { padding-left: 10px; }
        .rpw-input.rpw-has-toggle { padding-right: 6px; }

        .rpw-toggle {
          background: none;
          border: none;
          color: rgba(240,237,232,0.4);
          cursor: pointer;
          padding: 12px 14px;
          display: flex;
          align-items: center;
          transition: color 0.2s;
          flex-shrink: 0;
        }
        .rpw-toggle:hover { color: #e8ff47; }
        .rpw-toggle:focus-visible {
          outline: 2px solid #e8ff47;
          outline-offset: -2px;
        }

        .rpw-submit {
          margin-top: 4px;
          background: #e8ff47;
          color: #0a0a0a;
          border: 2px solid #e8ff47;
          font-family: 'Space Grotesk', sans-serif;
          font-weight: 900;
          font-size: 13px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          padding: 16px;
          cursor: pointer;
          transition: background 0.2s, color 0.2s, transform 0.1s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
        }
        .rpw-submit:hover:not(:disabled) { background: #f2ffb0; }
        .rpw-submit:active:not(:disabled) { transform: translate(1px, 1px); }
        .rpw-submit:disabled {
          background: transparent;
          color: rgba(232,255,71,0.4);
          border-color: rgba(232,255,71,0.2);
          cursor: not-allowed;
        }
        .rpw-submit:focus-visible {
          outline: 2px solid #f0ede8;
          outline-offset: 3px;
        }

        .rpw-spinner {
          width: 13px;
          height: 13px;
          border: 2px solid rgba(10,10,10,0.25);
          border-top-color: #0a0a0a;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }

        .rpw-footer {
          text-align: center;
          padding: 20px;
          border-top: 2px solid rgba(240,237,232,0.1);
          background: #111;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.24em;
          text-transform: uppercase;
          color: rgba(240,237,232,0.3);
          position: relative;
          z-index: 1;
        }
        .rpw-footer span { color: #e8ff47; }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @media (prefers-reduced-motion: reduce) {
          .rpw-card { animation: none; opacity: 1; }
          .rpw-spinner { animation: none; }
        }

        .rpw-loading {
          font-family: 'Space Grotesk', sans-serif;
          font-weight: 900;
          font-size: 12px;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: rgba(240,237,232,0.4);
        }
      `}</style>

      <div className="rpw-root">
        {/* Navbar */}
        <nav className="rpw-nav">
          <button className="rpw-nav-back" onClick={() => router.back()}>
            <ArrowLeft size={15} strokeWidth={2.5} />
            <span>Back</span>
          </button>
          <div className="rpw-nav-brand">
            radar.<span>editorzzz</span>
          </div>
          <div className="rpw-nav-spacer" />
        </nav>

        {/* Main */}
        <main className="rpw-main">
          <Suspense fallback={<div className="rpw-loading">Loading...</div>}>
            <ResetPasswordForm />
          </Suspense>
        </main>

        <footer className="rpw-footer">
          radar.<span>editorzzz</span> • Secure Authentication • 2026
        </footer>
      </div>
    </>
  );
}