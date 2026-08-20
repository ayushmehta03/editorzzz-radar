"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, FormEvent } from "react";
import { ForgotPassword, checkPhoneCooldown } from "@/lib/api"; 

export default function ForgotPasswordPage() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [identifier, setIdentifier] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErr, setFieldErr] = useState(false);
  const [success, setSuccess] = useState(false);

  const [cooldown, setCooldown] = useState(0);
  const [blocked, setBlocked] = useState(false);
  const [checkingCooldown, setCheckingCooldown] = useState(false);

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

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function checkCooldownFor(id: string) {
    if (!id.trim()) return { cooldown: 0, blocked: false };
    setCheckingCooldown(true);
    try {
      const res: any = await checkPhoneCooldown({ identifier: id.trim() });
      const c = typeof res?.cooldown === "number" ? res.cooldown : 0;
      const b = !!res?.blocked;
      setCooldown(c);
      setBlocked(b);
      return { cooldown: c, blocked: b };
    } catch {
      return { cooldown: 0, blocked: false };
    } finally {
      setCheckingCooldown(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldErr(false);

    const id = identifier.trim();
    if (!id) {
      setFieldErr(true);
      setError("Enter your username or phone number.");
      return;
    }

    setLoading(true);

    const status = await checkCooldownFor(id);
    if (status.blocked) {
      setError("Too many attempts. Try again later.");
      setLoading(false);
      return;
    }
    if (status.cooldown > 0) {
      setError(`Please wait ${status.cooldown}s before requesting another code.`);
      setLoading(false);
      return;
    }

    try {
      const res: any = await ForgotPassword({ identifier: id });
      setSuccess(true);
      setTimeout(() => {
        router.push(`/reset-password`);
      }, 1200);
      void res;
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
      setFieldErr(true);
      setError(message || "No account found with that username or phone.");
      return;
    }

    if (status === 429) {
      setError(message || "Too many attempts. Try again shortly.");
      setBlocked(true);
      return;
    }

    if (status === 400) {
      setError(message || "Check your details and try again.");
      return;
    }

    setError(message || "Something went wrong. Try again in a moment.");
  }

  const disabled = loading || checkingCooldown || cooldown > 0 || blocked || success;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:ital,wght@0,400;0,700;1,400&family=Space+Grotesk:wght@400;500;700;900&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .fpw-root {
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

        .fpw-root::before {
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

        .fpw-wrap {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 420px;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .fpw-canvas-wrap {
          width: 72px;
          height: 72px;
          margin-bottom: 8px;
          opacity: 0;
          animation: fadeUp 0.6s ease 0.1s forwards;
          position: relative;
        }
        .fpw-canvas { width: 100%; height: 100%; display: block; }

        .fpw-check {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transform: scale(0.6);
          transition: opacity 0.3s ease, transform 0.3s ease;
        }
        .fpw-check.fpw-check-on { opacity: 1; transform: scale(1); }
        .fpw-check svg { width: 28px; height: 28px; stroke: #7dffb0; }
        .fpw-check-path {
          stroke-dasharray: 24;
          stroke-dashoffset: 24;
          transition: stroke-dashoffset 0.5s ease 0.15s;
        }
        .fpw-check-on .fpw-check-path { stroke-dashoffset: 0; }

        .fpw-eyebrow {
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
        .fpw-eyebrow.fpw-eyebrow-success { color: #7dffb0; }

        .fpw-title {
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

        .fpw-sub {
          margin-top: 10px;
          font-size: 11px;
          letter-spacing: 0.04em;
          color: rgba(240,237,232,0.45);
          text-align: center;
          max-width: 320px;
          line-height: 1.6;
          opacity: 0;
          animation: fadeUp 0.6s ease 0.4s forwards;
        }

        .fpw-form {
          width: 100%;
          margin-top: 30px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          opacity: 0;
          animation: fadeUp 0.6s ease 0.5s forwards;
        }

        .fpw-field { display: flex; flex-direction: column; gap: 8px; }

        .fpw-label {
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: rgba(240,237,232,0.5);
        }

        .fpw-input {
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
        .fpw-input::placeholder { color: rgba(240,237,232,0.25); }
        .fpw-input:focus {
          border-color: #e8ff47;
          background: #141400;
        }
        .fpw-input.fpw-input-err { border-color: rgba(255,90,90,0.6); }
        .fpw-input:disabled { opacity: 0.6; }

        .fpw-hint {
          font-size: 9.5px;
          letter-spacing: 0.02em;
          color: rgba(240,237,232,0.3);
        }

        .fpw-error {
          border: 2px solid rgba(255,90,90,0.4);
          background: rgba(255,90,90,0.08);
          color: #ffb3b3;
          font-size: 11px;
          line-height: 1.6;
          padding: 12px 14px;
        }

        .fpw-submit {
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
        .fpw-submit:hover:not(:disabled) { background: #f2ffb0; }
        .fpw-submit:active:not(:disabled) { transform: translateY(1px); }
        .fpw-submit:disabled {
          background: transparent;
          color: rgba(232,255,71,0.4);
          border-color: rgba(232,255,71,0.2);
          cursor: not-allowed;
        }
        .fpw-submit.fpw-submit-success {
          background: #7dffb0;
          border-color: #7dffb0;
          color: #0a0a0a;
        }
        .fpw-submit:focus-visible {
          outline: 2px solid #f0ede8;
          outline-offset: 3px;
        }

        .fpw-spinner {
          width: 13px;
          height: 13px;
          border: 2px solid rgba(10,10,10,0.25);
          border-top-color: #0a0a0a;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }

        .fpw-login {
          margin-top: 24px;
          text-align: center;
          font-size: 12px;
          color: rgba(240,237,232,0.45);
          opacity: 0;
          animation: fadeIn 0.6s ease 0.7s forwards;
        }
        .fpw-login button {
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
        .fpw-login button:hover { color: #f2ffb0; }
        .fpw-login button:focus-visible {
          outline: 2px solid #e8ff47;
          outline-offset: 2px;
        }

        .fpw-back {
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
          animation: fadeIn 0.6s ease 0.8s forwards;
        }
        .fpw-back:hover { color: #e8ff47; }

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

        @media (prefers-reduced-motion: reduce) {
          .fpw-canvas-wrap, .fpw-eyebrow, .fpw-title, .fpw-sub,
          .fpw-form, .fpw-login, .fpw-back {
            animation: none;
            opacity: 1;
          }
          .fpw-spinner { animation: none; }
        }

        @media (max-width: 380px) {
          .fpw-input { padding: 12px 14px; }
          .fpw-submit { padding: 14px; }
        }
      `}</style>

      <div className="fpw-root">
        <div className="fpw-wrap">
          <div className="fpw-canvas-wrap">
            <canvas ref={canvasRef} className="fpw-canvas" />
            <div className={`fpw-check${success ? " fpw-check-on" : ""}`}>
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path className="fpw-check-path" d="M4 12l6 6L20 6" />
              </svg>
            </div>
          </div>

          <p className={`fpw-eyebrow${success ? " fpw-eyebrow-success" : ""}`}>
            {success ? "CODE SENT" : "ACCOUNT RECOVERY"}
          </p>
          <h1 className="fpw-title">{success ? "Check Your Phone" : "Forgot Password"}</h1>
          <p className="fpw-sub">
            {success
              ? "A verification code is on its way. Taking you to reset your password..."
              : "Enter your username or phone and we'll text you a code to reset your password."}
          </p>

          {!success && (
            <form className="fpw-form" onSubmit={handleSubmit} noValidate>
              {error && <div className="fpw-error" role="alert">{error}</div>}

              <div className="fpw-field">
                <label className="fpw-label" htmlFor="identifier">Username or Phone</label>
                <input
                  id="identifier"
                  name="identifier"
                  type="text"
                  autoComplete="username"
                  className={`fpw-input${fieldErr ? " fpw-input-err" : ""}`}
                  value={identifier}
                  onChange={(e) => {
                    setIdentifier(e.target.value);
                    if (fieldErr) setFieldErr(false);
                    if (error) setError(null);
                  }}
                  disabled={loading}
                />
                {cooldown > 0 && (
                  <span className="fpw-hint">You can request another code in {cooldown}s.</span>
                )}
              </div>

              <button type="submit" className="fpw-submit" disabled={disabled}>
                {loading || checkingCooldown ? (
                  <>
                    <span className="fpw-spinner" />
                    SENDING
                  </>
                ) : cooldown > 0 ? (
                  `WAIT ${cooldown}S`
                ) : blocked ? (
                  "TRY AGAIN LATER"
                ) : (
                  "SEND RESET CODE"
                )}
              </button>
            </form>
          )}

          <p className="fpw-login">
            Remembered it?{" "}
            <button type="button" onClick={() => router.push("/hire/login")}>
              Back to sign in
            </button>
          </p>

          <button type="button" className="fpw-back" onClick={() => router.push("/")}>
            ← Back to radar.editorzzz
          </button>
        </div>
      </div>
    </>
  );
}