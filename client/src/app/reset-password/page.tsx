"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, KeyboardEvent, ClipboardEvent, FormEvent } from "react";
import { ResetPassword, ForgotPassword, checkPhoneCooldown } from "@/lib/api"; // adjust import path to wherever api.ts lives

const OTP_LENGTH = 4;

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const identifierFromQuery = searchParams.get("identifier") ?? "";

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [identifier, setIdentifier] = useState(identifierFromQuery);
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passwordErr, setPasswordErr] = useState<string | null>(null);
  const [confirmErr, setConfirmErr] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const [success, setSuccess] = useState(false);

  const [cooldown, setCooldown] = useState(0);
  const [blocked, setBlocked] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendNote, setResendNote] = useState<string | null>(null);

  const missingIdentifier = !identifier.trim();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let angle = 0;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const draw = () => {
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const radius = Math.min(cx, cy) - 4;
      const color = success ? "125,255,176" : "232,255,71";

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      [1, 0.6].forEach((scale) => {
        ctx.beginPath();
        ctx.arc(cx, cy, radius * scale, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${color},0.10)`;
        ctx.lineWidth = 1;
        ctx.stroke();
      });

      const sweepArc = (Math.PI * 2) / 3;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angle);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, radius, -sweepArc, 0);
      ctx.closePath();
      ctx.fillStyle = `rgba(${color},0.08)`;
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(radius, 0);
      ctx.strokeStyle = `rgba(${color},0.6)`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();

      ctx.beginPath();
      ctx.arc(cx, cy, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${color},0.7)`;
      ctx.fill();

      angle += success ? 0.03 : 0.016;
      animId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, [success]);

  // On mount, ask if a cooldown/block is already active for this identifier
  useEffect(() => {
    if (!identifier.trim()) return;
    checkPhoneCooldown({ identifier: identifier.trim() })
      .then((res: any) => {
        if (res?.cooldown) setCooldown(res.cooldown);
        if (res?.blocked) setBlocked(true);
      })
      .catch(() => {
        // Non-fatal — just means we don't know the cooldown state yet
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cooldown ticker
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  function setDigit(index: number, raw: string) {
    const value = raw.replace(/\D/g, "");
    if (!value) {
      const next = [...digits];
      next[index] = "";
      setDigits(next);
      return;
    }

    const chars = value.split("");
    const next = [...digits];
    let i = index;
    for (const ch of chars) {
      if (i >= OTP_LENGTH) break;
      next[i] = ch;
      i++;
    }
    setDigits(next);

    const focusIndex = Math.min(i, OTP_LENGTH - 1);
    inputRefs.current[focusIndex]?.focus();
  }

  function handleKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
      const next = [...digits];
      next[index - 1] = "";
      setDigits(next);
      e.preventDefault();
    }
    if (e.key === "ArrowLeft" && index > 0) inputRefs.current[index - 1]?.focus();
    if (e.key === "ArrowRight" && index < OTP_LENGTH - 1) inputRefs.current[index + 1]?.focus();
  }

  function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (!text) return;
    const next = Array(OTP_LENGTH).fill("");
    text.split("").forEach((ch, i) => (next[i] = ch));
    setDigits(next);
    inputRefs.current[Math.min(text.length, OTP_LENGTH - 1)]?.focus();
  }

  function triggerShake(message: string) {
    setError(message);
    setShake(true);
    setTimeout(() => setShake(false), 400);
  }

  function getStrength(pw: string): number {
    let score = 0;
    if (pw.length >= 8) score++;
    if (pw.length >= 12) score++;
    if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
    if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score++;
    return Math.min(score, 4);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setPasswordErr(null);
    setConfirmErr(null);

    const id = identifier.trim();
    const otp = digits.join("");

    if (!id) {
      triggerShake("Enter your username or phone number.");
      return;
    }
    if (otp.length !== OTP_LENGTH) {
      triggerShake(`Enter the ${OTP_LENGTH}-digit code.`);
      return;
    }
    if (newPassword.length < 8) {
      setPasswordErr("Use at least 8 characters.");
      return;
    }
    if (confirmPassword !== newPassword) {
      setConfirmErr("Passwords don't match.");
      return;
    }

    setLoading(true);
    try {
      await ResetPassword({ identifier: id, otp, new_password: newPassword });
      setSuccess(true);
      setTimeout(() => router.push("/hire/login"), 1400);
    } catch (err: any) {
      handleApiError(err);
    } finally {
      setLoading(false);
    }
  }

  function handleApiError(err: any) {
    const status = err?.status ?? err?.response?.status;
    const payload = err?.data ?? err?.response?.data ?? err;
    const message: string | undefined = payload?.error;

    if (status === 404) {
      triggerShake(message || "Account not found for that username or phone.");
      return;
    }

    if (status === 400 && message?.toLowerCase().includes("no active")) {
      triggerShake("Your code expired. Request a new one below.");
      return;
    }

    if (status === 400 && message?.toLowerCase().includes("invalid or expired otp")) {
      triggerShake(message);
      setDigits(Array(OTP_LENGTH).fill(""));
      inputRefs.current[0]?.focus();
      return;
    }

    triggerShake(message || "Something went wrong. Try again.");
  }

  async function handleResend() {
    const id = identifier.trim();
    if (!id || cooldown > 0 || blocked || resending) return;

    setResendNote(null);
    setError(null);
    setResending(true);
    try {
      const res: any = await ForgotPassword({ identifier: id });
      setResendNote(res?.message || "New code sent.");
      setDigits(Array(OTP_LENGTH).fill(""));
      inputRefs.current[0]?.focus();
      // ForgotPassword doesn't return a cooldown value itself — re-check the backend's
      // own cooldown state right after sending so the timer reflects reality.
      const cd: any = await checkPhoneCooldown({ identifier: id }).catch(() => null);
      if (typeof cd?.cooldown === "number" && cd.cooldown > 0) {
        setCooldown(cd.cooldown);
      } else {
        setCooldown(60); // sane client-side fallback if the backend reports none
      }
      if (cd?.blocked) setBlocked(true);
    } catch (err: any) {
      const status = err?.status ?? err?.response?.status;
      const payload = err?.data ?? err?.response?.data ?? err;
      const message: string | undefined = payload?.error;

      if (status === 429) {
        setError(message || "Too many attempts. Try again shortly.");
        setBlocked(true);
      } else if (status === 404) {
        triggerShake(message || "Account not found for that username or phone.");
      } else {
        setError(message || "Couldn't resend the code. Try again in a moment.");
      }
    } finally {
      setResending(false);
    }
  }

  const strength = getStrength(newPassword);
  const strengthLabel = ["", "Weak", "Fair", "Good", "Strong"][strength];
  const strengthTone = strength <= 1 ? "weak" : strength === 2 ? "mid" : "strong";

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
          align-items: center;
          justify-content: center;
          overflow-x: hidden;
          position: relative;
          padding: 24px;
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

        .rpw-wrap {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 440px;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 32px 0 48px;
        }

        .rpw-canvas-wrap {
          width: 64px;
          height: 64px;
          margin-bottom: 6px;
          opacity: 0;
          animation: fadeUp 0.6s ease 0.1s forwards;
          position: relative;
        }
        .rpw-canvas { width: 100%; height: 100%; display: block; }

        .rpw-check {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transform: scale(0.6);
          transition: opacity 0.3s ease, transform 0.3s ease;
        }
        .rpw-check.rpw-check-on { opacity: 1; transform: scale(1); }
        .rpw-check svg { width: 26px; height: 26px; stroke: #7dffb0; }
        .rpw-check-path {
          stroke-dasharray: 24;
          stroke-dashoffset: 24;
          transition: stroke-dashoffset 0.5s ease 0.15s;
        }
        .rpw-check-on .rpw-check-path { stroke-dashoffset: 0; }

        .rpw-eyebrow {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.26em;
          text-transform: uppercase;
          color: #e8ff47;
          margin-bottom: 10px;
          opacity: 0;
          animation: fadeUp 0.6s ease 0.2s forwards;
          transition: color 0.3s;
        }
        .rpw-eyebrow.rpw-eyebrow-success { color: #7dffb0; }

        .rpw-title {
          font-family: 'Space Grotesk', sans-serif;
          font-weight: 900;
          font-size: clamp(28px, 6.5vw, 38px);
          text-transform: uppercase;
          letter-spacing: -0.02em;
          line-height: 1;
          text-align: center;
          opacity: 0;
          animation: fadeUp 0.6s ease 0.3s forwards;
        }

        .rpw-sub {
          margin-top: 10px;
          font-size: 11px;
          letter-spacing: 0.04em;
          color: rgba(240,237,232,0.45);
          text-align: center;
          max-width: 340px;
          line-height: 1.6;
          opacity: 0;
          animation: fadeUp 0.6s ease 0.4s forwards;
        }
        .rpw-sub strong { color: rgba(240,237,232,0.7); font-weight: 700; }

        .rpw-form {
          width: 100%;
          margin-top: 30px;
          display: flex;
          flex-direction: column;
          gap: 18px;
          opacity: 0;
          animation: fadeUp 0.6s ease 0.5s forwards;
        }

        .rpw-field { display: flex; flex-direction: column; gap: 8px; }

        .rpw-label {
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: rgba(240,237,232,0.5);
        }

        .rpw-input {
          width: 100%;
          background: #111;
          border: 2px solid rgba(240,237,232,0.12);
          color: #f0ede8;
          font-family: 'Space Mono', monospace;
          font-size: 14px;
          padding: 14px 16px;
          outline: none;
          transition: border-color 0.2s, background 0.2s;
        }
        .rpw-input::placeholder { color: rgba(240,237,232,0.25); }
        .rpw-input:focus {
          border-color: #e8ff47;
          background: #141400;
        }
        .rpw-input.rpw-input-err { border-color: rgba(255,90,90,0.6); }
        .rpw-input:disabled { opacity: 0.6; }
        .rpw-input.rpw-has-toggle { padding-right: 52px; }

        .rpw-input-row { position: relative; display: flex; align-items: center; }

        .rpw-toggle {
          position: absolute;
          right: 12px;
          background: none;
          border: none;
          color: rgba(240,237,232,0.4);
          font-family: 'Space Mono', monospace;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          cursor: pointer;
          padding: 6px;
          transition: color 0.2s;
        }
        .rpw-toggle:hover { color: #e8ff47; }
        .rpw-toggle:focus-visible {
          outline: 2px solid #e8ff47;
          outline-offset: 2px;
        }

        .rpw-otp-row {
          display: flex;
          gap: 14px;
          justify-content: center;
        }
        .rpw-otp-row.rpw-shake { animation: shake 0.4s ease; }

        @media (min-width: 400px) {
          .rpw-otp-row { gap: 18px; }
        }

        .rpw-otp-input {
          width: 56px;
          height: 64px;
          text-align: center;
          background: #111;
          border: 2px solid rgba(240,237,232,0.12);
          color: #f0ede8;
          font-family: 'Space Grotesk', sans-serif;
          font-weight: 700;
          font-size: 24px;
          outline: none;
          transition: border-color 0.2s, background 0.2s;
        }
        @media (min-width: 400px) {
          .rpw-otp-input { width: 62px; height: 72px; font-size: 28px; }
        }
        .rpw-otp-input:focus {
          border-color: #e8ff47;
          background: #141400;
        }
        .rpw-otp-input.rpw-otp-filled { border-color: rgba(232,255,71,0.4); }
        .rpw-otp-input.rpw-otp-err { border-color: rgba(255,90,90,0.6); }
        .rpw-otp-input.rpw-otp-success { border-color: #7dffb0; color: #7dffb0; }
        .rpw-otp-input:disabled { opacity: 0.6; }

        .rpw-hint {
          font-size: 9.5px;
          letter-spacing: 0.02em;
          color: rgba(240,237,232,0.3);
        }
        .rpw-field-err {
          font-size: 9.5px;
          letter-spacing: 0.02em;
          color: #ffb3b3;
        }

        .rpw-strength {
          display: flex;
          gap: 4px;
          margin-top: 2px;
        }
        .rpw-strength-seg {
          height: 3px;
          flex: 1;
          background: rgba(240,237,232,0.1);
          transition: background 0.25s;
        }
        .rpw-strength-seg.rpw-strength-on-weak { background: #ff5a5a; }
        .rpw-strength-seg.rpw-strength-on-mid { background: #e8ff47; }
        .rpw-strength-seg.rpw-strength-on-strong { background: #7dffb0; }

        .rpw-error {
          border: 2px solid rgba(255,90,90,0.4);
          background: rgba(255,90,90,0.08);
          color: #ffb3b3;
          font-size: 11px;
          line-height: 1.6;
          padding: 12px 14px;
          text-align: center;
        }
        .rpw-note {
          border: 2px solid rgba(232,255,71,0.3);
          background: rgba(232,255,71,0.06);
          color: #e8ff47;
          font-size: 11px;
          line-height: 1.6;
          padding: 12px 14px;
          text-align: center;
        }

        .rpw-submit {
          margin-top: 4px;
          position: relative;
          background: #e8ff47;
          color: #0a0a0a;
          border: 2px solid #e8ff47;
          font-family: 'Space Mono', monospace;
          font-weight: 700;
          font-size: 12px;
          letter-spacing: 0.16em;
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
        .rpw-submit:active:not(:disabled) { transform: translateY(1px); }
        .rpw-submit:disabled {
          background: transparent;
          color: rgba(232,255,71,0.4);
          border-color: rgba(232,255,71,0.2);
          cursor: not-allowed;
        }
        .rpw-submit.rpw-submit-success {
          background: #7dffb0;
          border-color: #7dffb0;
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

        .rpw-resend-row {
          margin-top: 4px;
          text-align: center;
          font-size: 11px;
          color: rgba(240,237,232,0.4);
        }
        .rpw-resend-btn {
          background: none;
          border: none;
          color: #e8ff47;
          font-family: 'Space Mono', monospace;
          font-weight: 700;
          font-size: 11px;
          cursor: pointer;
          text-decoration: underline;
          text-underline-offset: 3px;
        }
        .rpw-resend-btn:hover:not(:disabled) { color: #f2ffb0; }
        .rpw-resend-btn:disabled {
          color: rgba(240,237,232,0.3);
          cursor: not-allowed;
          text-decoration: none;
        }
        .rpw-resend-btn:focus-visible {
          outline: 2px solid #e8ff47;
          outline-offset: 2px;
        }

        .rpw-divider-row {
          margin-top: 26px;
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
          opacity: 0;
          animation: fadeIn 0.6s ease 0.7s forwards;
        }
        .rpw-divider-line { flex: 1; height: 1px; background: rgba(240,237,232,0.1); }
        .rpw-divider-text {
          font-size: 9px;
          letter-spacing: 0.16em;
          color: rgba(240,237,232,0.25);
          text-transform: uppercase;
        }

        .rpw-login {
          margin-top: 20px;
          text-align: center;
          font-size: 12px;
          color: rgba(240,237,232,0.45);
          opacity: 0;
          animation: fadeIn 0.6s ease 0.8s forwards;
        }
        .rpw-login button {
          background: none;
          border: none;
          color: #e8ff47;
          font-family: 'Space Mono', monospace;
          font-weight: 700;
          font-size: 12px;
          cursor: pointer;
          text-decoration: underline;
          text-underline-offset: 3px;
        }
        .rpw-login button:hover { color: #f2ffb0; }
        .rpw-login button:focus-visible {
          outline: 2px solid #e8ff47;
          outline-offset: 2px;
        }

        .rpw-back {
          margin-top: 32px;
          font-size: 10px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: rgba(240,237,232,0.25);
          background: none;
          border: none;
          cursor: pointer;
          transition: color 0.2s;
          opacity: 0;
          animation: fadeIn 0.6s ease 0.9s forwards;
        }
        .rpw-back:hover { color: #e8ff47; }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes shake {
          10%, 90% { transform: translateX(-2px); }
          20%, 80% { transform: translateX(4px); }
          30%, 50%, 70% { transform: translateX(-8px); }
          40%, 60% { transform: translateX(8px); }
        }

        @media (prefers-reduced-motion: reduce) {
          .rpw-canvas-wrap, .rpw-eyebrow, .rpw-title, .rpw-sub,
          .rpw-form, .rpw-divider-row, .rpw-login, .rpw-back {
            animation: none;
            opacity: 1;
          }
          .rpw-otp-row.rpw-shake { animation: none; }
          .rpw-spinner { animation: none; }
        }

        @media (max-width: 380px) {
          .rpw-input { padding: 12px 14px; }
          .rpw-submit { padding: 14px; }
          .rpw-otp-input { width: 48px; height: 58px; font-size: 20px; }
          .rpw-otp-row { gap: 10px; }
        }
      `}</style>

      <div className="rpw-root">
        <div className="rpw-wrap">
          <div className="rpw-canvas-wrap">
            <canvas ref={canvasRef} className="rpw-canvas" />
            <div className={`rpw-check${success ? " rpw-check-on" : ""}`}>
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path className="rpw-check-path" d="M4 12l6 6L20 6" />
              </svg>
            </div>
          </div>

          <p className={`rpw-eyebrow${success ? " rpw-eyebrow-success" : ""}`}>
            {success ? "PASSWORD UPDATED" : "ACCOUNT RECOVERY"}
          </p>
          <h1 className="rpw-title">{success ? "All Set!" : "Reset Password"}</h1>
          <p className="rpw-sub">
            {success ? (
              "Your password has been changed. Taking you to sign in..."
            ) : (
              <>Enter the <strong>{OTP_LENGTH}-digit code</strong> sent to your phone, then set a new password.</>
            )}
          </p>

          {!success && (
            <form className="rpw-form" onSubmit={handleSubmit} noValidate>
              {error && <div className="rpw-error" role="alert">{error}</div>}
              {resendNote && !error && <div className="rpw-note">{resendNote}</div>}

              {missingIdentifier ? (
                <div className="rpw-field">
                  <label className="rpw-label" htmlFor="identifier">Username or Phone</label>
                  <input
                    id="identifier"
                    name="identifier"
                    type="text"
                    autoComplete="username"
                    className="rpw-input"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    disabled={loading}
                  />
                  <span className="rpw-hint">
                    We couldn't tell who this code was sent to — confirm your username or phone.
                  </span>
                </div>
              ) : (
                <div className="rpw-field">
                  <span className="rpw-label">Sending code to</span>
                  <span className="rpw-hint" style={{ fontSize: "12px", color: "rgba(240,237,232,0.6)" }}>
                    {identifier}
                  </span>
                </div>
              )}

              <div className="rpw-field">
                <label className="rpw-label" style={{ textAlign: "center" }}>Verification Code</label>
                <div
                  className={`rpw-otp-row${shake ? " rpw-shake" : ""}`}
                  onPaste={handlePaste}
                >
                  {digits.map((d, i) => (
                    <input
                      key={i}
                      ref={(el) => { inputRefs.current[i] = el; }}
                      className={`rpw-otp-input${d ? " rpw-otp-filled" : ""}${error ? " rpw-otp-err" : ""}${success ? " rpw-otp-success" : ""}`}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={1}
                      value={d}
                      onChange={(e) => setDigit(i, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(i, e)}
                      disabled={loading}
                      aria-label={`Digit ${i + 1} of ${OTP_LENGTH}`}
                    />
                  ))}
                </div>
                <div className="rpw-resend-row">
                  {blocked
                    ? "Too many attempts. Try again later."
                    : cooldown > 0
                    ? <>Resend available in <strong>{cooldown}s</strong></>
                    : "Didn't get a code?"}
                  {!blocked && cooldown === 0 && (
                    <>
                      {" "}
                      <button
                        type="button"
                        className="rpw-resend-btn"
                        onClick={handleResend}
                        disabled={resending || missingIdentifier}
                      >
                        {resending ? "Sending..." : "Resend code"}
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="rpw-field">
                <label className="rpw-label" htmlFor="new_password">New Password</label>
                <div className="rpw-input-row">
                  <input
                    id="new_password"
                    name="new_password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    className={`rpw-input rpw-has-toggle${passwordErr ? " rpw-input-err" : ""}`}
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      if (passwordErr) setPasswordErr(null);
                    }}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    className="rpw-toggle"
                    onClick={() => setShowPassword((s) => !s)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? "HIDE" : "SHOW"}
                  </button>
                </div>
                {newPassword && (
                  <div>
                    <div className="rpw-strength">
                      {[0, 1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className={`rpw-strength-seg${i < strength ? ` rpw-strength-on-${strengthTone}` : ""}`}
                        />
                      ))}
                    </div>
                    <span className="rpw-hint">{strengthLabel}</span>
                  </div>
                )}
                {passwordErr && <span className="rpw-field-err">{passwordErr}</span>}
              </div>

              <div className="rpw-field">
                <label className="rpw-label" htmlFor="confirm_password">Confirm New Password</label>
                <div className="rpw-input-row">
                  <input
                    id="confirm_password"
                    name="confirm_password"
                    type={showConfirm ? "text" : "password"}
                    autoComplete="new-password"
                    className={`rpw-input rpw-has-toggle${confirmErr ? " rpw-input-err" : ""}`}
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (confirmErr) setConfirmErr(null);
                    }}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    className="rpw-toggle"
                    onClick={() => setShowConfirm((s) => !s)}
                    aria-label={showConfirm ? "Hide password" : "Show password"}
                  >
                    {showConfirm ? "HIDE" : "SHOW"}
                  </button>
                </div>
                {confirmErr && <span className="rpw-field-err">{confirmErr}</span>}
              </div>

              <button type="submit" className="rpw-submit" disabled={loading}>
                {loading ? (
                  <>
                    <span className="rpw-spinner" />
                    RESETTING
                  </>
                ) : (
                  "RESET PASSWORD"
                )}
              </button>
            </form>
          )}

          <div className="rpw-divider-row">
            <div className="rpw-divider-line" />
            <span className="rpw-divider-text">ALL DONE?</span>
            <div className="rpw-divider-line" />
          </div>

          <p className="rpw-login">
            Remembered your password?{" "}
            <button type="button" onClick={() => router.push("/hire/login")}>
              Sign in
            </button>
          </p>

          <button type="button" className="rpw-back" onClick={() => router.push("/")}>
            ← Back to radar.editorzzz
          </button>
        </div>
      </div>
    </>
  );
}