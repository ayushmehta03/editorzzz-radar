"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, KeyboardEvent, ClipboardEvent } from "react";
import { verifyPhone, resendPhoneOtp, checkPhoneCooldown } from "@/lib/api"; // adjust import path to wherever api.ts lives

const OTP_LENGTH = 4;

export default function VerifyPhonePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const userId = searchParams.get("id") ?? "";

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const [success, setSuccess] = useState(false);

  const [cooldown, setCooldown] = useState(0);
  const [blocked, setBlocked] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendNote, setResendNote] = useState<string | null>(null);

  // Missing id — nothing to verify
  const missingId = !userId;

  // Quiet radar sweep, matching login/register
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

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      [1, 0.6].forEach((scale) => {
        ctx.beginPath();
        ctx.arc(cx, cy, radius * scale, 0, Math.PI * 2);
        ctx.strokeStyle = success ? "rgba(125,255,176,0.14)" : "rgba(232,255,71,0.10)";
        ctx.lineWidth = 1;
        ctx.stroke();
      });

      const sweepArc = (Math.PI * 2) / 3;
      const color = success ? "125,255,176" : "232,255,71";
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

  // On mount, ask the backend if a cooldown/block is already active for this user
  useEffect(() => {
    if (!userId) return;
    checkPhoneCooldown({ user_id: userId })
      .then((res: any) => {
        if (res?.cooldown) setCooldown(res.cooldown);
        if (res?.blocked) setBlocked(true);
      })
      .catch(() => {
        // Non-fatal — just means we don't know the cooldown state yet
      });
  }, [userId]);

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

  async function handleVerify(code?: string) {
    const otp = (code ?? digits.join("")).trim();
    setError(null);

    if (!userId) {
      triggerShake("Missing account reference. Go back and try registering or logging in again.");
      return;
    }
    if (otp.length !== OTP_LENGTH) {
      triggerShake(`Enter the ${OTP_LENGTH}-digit code.`);
      return;
    }

    setLoading(true);
    try {
      const res = await verifyPhone({ user_id: userId, otp });

      if (res?.token) {
        setSuccess(true);
        localStorage.setItem("hirer_token", res.token);
        setTimeout(() => router.push("/hire/dashboard"), 1400);
        return;
      }
      handleApiError(res);
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
      triggerShake(message || "Account not found. Check your link and try again.");
      return;
    }

    if (status === 400 && message?.toLowerCase().includes("already verified")) {
      setError(null);
      router.push("/hire/login");
      return;
    }

    if (status === 400 && message?.toLowerCase().includes("no active")) {
      triggerShake("Your verification session expired. Request a new code below.");
      return;
    }

    triggerShake(message || "Invalid or expired code. Try again.");
    setDigits(Array(OTP_LENGTH).fill(""));
    inputRefs.current[0]?.focus();
  }

  async function handleResend() {
    if (!userId || cooldown > 0 || blocked || resending) return;
    setResendNote(null);
    setError(null);
    setResending(true);
    try {
      const res: any = await resendPhoneOtp({ user_id: userId });
      setResendNote(res?.message || "New code sent.");
      if (typeof res?.cooldown === "number") setCooldown(res.cooldown);
      setDigits(Array(OTP_LENGTH).fill(""));
      inputRefs.current[0]?.focus();
    } catch (err: any) {
      const status = err?.status ?? err?.response?.status;
      const payload = err?.data ?? err?.response?.data ?? err;
      const message: string | undefined = payload?.error;

      if (status === 429) {
        // backend enforces its own backoff; surface the message and block resend
        setError(message || "Too many attempts. Try again shortly.");
        setBlocked(true);
      } else if (status === 400 && message?.toLowerCase().includes("already verified")) {
        router.push("/hire/login");
      } else {
        setError(message || "Couldn't resend the code. Try again in a moment.");
      }
    } finally {
      setResending(false);
    }
  }

  const code = digits.join("");
  const canSubmit = code.length === OTP_LENGTH && !loading && !success;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:ital,wght@0,400;0,700;1,400&family=Space+Grotesk:wght@400;500;700;900&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .vfy-root {
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

        .vfy-root::before {
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

        .vfy-wrap {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 420px;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .vfy-canvas-wrap {
          width: 72px;
          height: 72px;
          margin-bottom: 8px;
          opacity: 0;
          animation: fadeUp 0.6s ease 0.1s forwards;
          position: relative;
        }
        .vfy-canvas { width: 100%; height: 100%; display: block; }

        .vfy-check {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transform: scale(0.6);
          transition: opacity 0.3s ease, transform 0.3s ease;
        }
        .vfy-check.vfy-check-on {
          opacity: 1;
          transform: scale(1);
        }
        .vfy-check svg {
          width: 28px;
          height: 28px;
          stroke: #7dffb0;
        }
        .vfy-check-path {
          stroke-dasharray: 24;
          stroke-dashoffset: 24;
          transition: stroke-dashoffset 0.5s ease 0.15s;
        }
        .vfy-check-on .vfy-check-path {
          stroke-dashoffset: 0;
        }

        .vfy-eyebrow {
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
        .vfy-eyebrow.vfy-eyebrow-success { color: #7dffb0; }

        .vfy-title {
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

        .vfy-sub {
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
        .vfy-sub strong { color: rgba(240,237,232,0.7); font-weight: 700; }

        .vfy-otp-row {
          display: flex;
          gap: 14px;
          margin-top: 32px;
          opacity: 0;
          animation: fadeUp 0.6s ease 0.5s forwards;
        }
        .vfy-otp-row.vfy-shake {
          animation: fadeUp 0.6s ease 0.5s forwards, shake 0.4s ease;
        }

        @media (min-width: 400px) {
          .vfy-otp-row { gap: 18px; }
        }

        .vfy-otp-input {
          width: 58px;
          height: 68px;
          text-align: center;
          background: #111;
          border: 2px solid rgba(240,237,232,0.12);
          color: #f0ede8;
          font-family: 'Space Grotesk', sans-serif;
          font-weight: 700;
          font-size: 26px;
          outline: none;
          transition: border-color 0.2s, background 0.2s;
        }
        @media (min-width: 400px) {
          .vfy-otp-input { width: 66px; height: 76px; font-size: 30px; }
        }
        .vfy-otp-input:focus {
          border-color: #e8ff47;
          background: #141400;
        }
        .vfy-otp-input.vfy-otp-filled {
          border-color: rgba(232,255,71,0.4);
        }
        .vfy-otp-input.vfy-otp-err {
          border-color: rgba(255,90,90,0.6);
        }
        .vfy-otp-input.vfy-otp-success {
          border-color: #7dffb0;
          color: #7dffb0;
        }
        .vfy-otp-input:disabled {
          opacity: 0.6;
        }

        .vfy-error {
          margin-top: 18px;
          border: 2px solid rgba(255,90,90,0.4);
          background: rgba(255,90,90,0.08);
          color: #ffb3b3;
          font-size: 11px;
          line-height: 1.6;
          padding: 12px 14px;
          width: 100%;
          text-align: center;
        }

        .vfy-note {
          margin-top: 18px;
          border: 2px solid rgba(232,255,71,0.3);
          background: rgba(232,255,71,0.06);
          color: #e8ff47;
          font-size: 11px;
          line-height: 1.6;
          padding: 12px 14px;
          width: 100%;
          text-align: center;
        }

        .vfy-submit {
          margin-top: 24px;
          width: 100%;
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
          opacity: 0;
          animation: fadeUp 0.6s ease 0.6s forwards;
        }
        .vfy-submit:hover:not(:disabled) { background: #f2ffb0; }
        .vfy-submit:active:not(:disabled) { transform: translateY(1px); }
        .vfy-submit:disabled {
          background: transparent;
          color: rgba(232,255,71,0.4);
          border-color: rgba(232,255,71,0.2);
          cursor: not-allowed;
        }
        .vfy-submit.vfy-submit-success {
          background: #7dffb0;
          border-color: #7dffb0;
        }
        .vfy-submit:focus-visible {
          outline: 2px solid #f0ede8;
          outline-offset: 3px;
        }

        .vfy-spinner {
          width: 13px;
          height: 13px;
          border: 2px solid rgba(10,10,10,0.25);
          border-top-color: #0a0a0a;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }

        .vfy-resend-row {
          margin-top: 24px;
          text-align: center;
          font-size: 11px;
          color: rgba(240,237,232,0.4);
          opacity: 0;
          animation: fadeIn 0.6s ease 0.7s forwards;
        }
        .vfy-resend-btn {
          background: none;
          border: none;
          color: #e8ff47;
          font-family: 'Space Mono', monospace;
          font-weight: 700;
          font-size: 11px;
          letter-spacing: 0.04em;
          cursor: pointer;
          text-decoration: underline;
          text-underline-offset: 3px;
        }
        .vfy-resend-btn:hover:not(:disabled) { color: #f2ffb0; }
        .vfy-resend-btn:disabled {
          color: rgba(240,237,232,0.3);
          cursor: not-allowed;
          text-decoration: none;
        }
        .vfy-resend-btn:focus-visible {
          outline: 2px solid #e8ff47;
          outline-offset: 2px;
        }

        .vfy-back {
          margin-top: 36px;
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
        .vfy-back:hover { color: #e8ff47; }

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
          .vfy-canvas-wrap, .vfy-eyebrow, .vfy-title, .vfy-sub,
          .vfy-otp-row, .vfy-submit, .vfy-resend-row, .vfy-back {
            animation: none;
            opacity: 1;
          }
          .vfy-otp-row.vfy-shake { animation: none; }
          .vfy-spinner { animation: none; }
        }

        @media (max-width: 360px) {
          .vfy-otp-input { width: 50px; height: 60px; font-size: 22px; }
          .vfy-otp-row { gap: 10px; }
        }
      `}</style>

      <div className="vfy-root">
        <div className="vfy-wrap">
          <div className="vfy-canvas-wrap">
            <canvas ref={canvasRef} className="vfy-canvas" />
            <div className={`vfy-check${success ? " vfy-check-on" : ""}`}>
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path className="vfy-check-path" d="M4 12l6 6L20 6" />
              </svg>
            </div>
          </div>

          <p className={`vfy-eyebrow${success ? " vfy-eyebrow-success" : ""}`}>
            {success ? "VERIFIED" : "ONE MORE STEP"}
          </p>
          <h1 className="vfy-title">{success ? "Thank You!" : "Verify Phone"}</h1>
          <p className="vfy-sub">
            {success ? (
              "Your phone is verified. Taking you to your dashboard..."
            ) : missingId ? (
              "This link is missing an account reference. Go back and register or log in again."
            ) : (
              <>Enter the <strong>{OTP_LENGTH}-digit code</strong> we sent to your phone.</>
            )}
          </p>

          {!missingId && (
            <>
              <div
                className={`vfy-otp-row${shake ? " vfy-shake" : ""}`}
                onPaste={handlePaste}
              >
                {digits.map((d, i) => (
                  <input
                    key={i}
                    ref={(el) => { inputRefs.current[i] = el; }}
                    className={`vfy-otp-input${d ? " vfy-otp-filled" : ""}${error ? " vfy-otp-err" : ""}${success ? " vfy-otp-success" : ""}`}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    value={d}
                    onChange={(e) => setDigit(i, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(i, e)}
                    disabled={loading || success}
                    autoFocus={i === 0}
                    aria-label={`Digit ${i + 1} of ${OTP_LENGTH}`}
                  />
                ))}
              </div>

              {error && <div className="vfy-error" role="alert">{error}</div>}
              {resendNote && !error && <div className="vfy-note">{resendNote}</div>}

              <button
                type="button"
                className={`vfy-submit${success ? " vfy-submit-success" : ""}`}
                disabled={!canSubmit}
                onClick={() => handleVerify()}
              >
                {success ? (
                  "VERIFIED"
                ) : loading ? (
                  <>
                    <span className="vfy-spinner" />
                    VERIFYING
                  </>
                ) : (
                  "VERIFY & CONTINUE"
                )}
              </button>

              <p className="vfy-resend-row">
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
                      className="vfy-resend-btn"
                      onClick={handleResend}
                      disabled={resending || success}
                    >
                      {resending ? "Sending..." : "Resend code"}
                    </button>
                  </>
                )}
              </p>
            </>
          )}

          <button type="button" className="vfy-back" onClick={() => router.push("/")}>
            ← Back to radar.editorzzz
          </button>
        </div>
      </div>
    </>
  );
}