"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, FormEvent } from "react";
import { login } from "@/lib/api"; // adjust import path to wherever api.ts lives

export default function HireLoginPage() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ identifier?: boolean; password?: boolean }>({});

  // Radar sweep animation on canvas (same signature as the landing page, smaller + quieter)
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
        ctx.strokeStyle = "rgba(232,255,71,0.10)";
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
      ctx.fillStyle = "rgba(232,255,71,0.08)";
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(radius, 0);
      ctx.strokeStyle = "rgba(232,255,71,0.6)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();

      ctx.beginPath();
      ctx.arc(cx, cy, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(232,255,71,0.7)";
      ctx.fill();

      angle += 0.016;
      animId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    if (!identifier.trim() || !password) {
      setFieldErrors({
        identifier: !identifier.trim(),
        password: !password,
      });
      setError("Enter your username or phone, and your password.");
      return;
    }

    setLoading(true);
    try {
      const res = await login({ identifier: identifier.trim(), password });

      // Success shape: { message: "Login successful", token: string }
      if (res?.token) {
        localStorage.setItem("hirer_token", res.token);
        router.push("/dashboard");
        return;
      }

      // Defensive fallback if the API layer resolves without throwing on non-2xx
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
    const message: string | undefined = payload?.message || payload?.error;

    // 403 — phone not verified yet, backend already queued an OTP
    if (status === 403 || payload?.redirect === "/verify-phone") {
      const id = payload?.id;
      router.push(id ? `/verify-phone?id=${id}` : "/verify-phone");
      return;
    }

    // 404 — no hirer account found for that identifier
    if (status === 404) {
      setError(message || "No account found. Create an account first.");
      setFieldErrors({ identifier: true });
      return;
    }

    // 401 — wrong password
    if (status === 401) {
      setError(message || "Incorrect password. Try again.");
      setFieldErrors({ password: true });
      return;
    }

    // 400 — malformed input
    if (status === 400) {
      setError(message || "Enter your username or phone, and your password.");
      return;
    }

    setError(message || "Something went wrong. Try again in a moment.");
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:ital,wght@0,400;0,700;1,400&family=Space+Grotesk:wght@400;500;700;900&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .hlg-root {
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

        .hlg-root::before {
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

        .hlg-wrap {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 420px;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .hlg-canvas-wrap {
          width: 72px;
          height: 72px;
          margin-bottom: 8px;
          opacity: 0;
          animation: fadeUp 0.6s ease 0.1s forwards;
        }
        .hlg-canvas { width: 100%; height: 100%; display: block; }

        .hlg-eyebrow {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.26em;
          text-transform: uppercase;
          color: #e8ff47;
          margin-bottom: 10px;
          opacity: 0;
          animation: fadeUp 0.6s ease 0.2s forwards;
        }

        .hlg-title {
          font-family: 'Space Grotesk', sans-serif;
          font-weight: 900;
          font-size: clamp(30px, 7vw, 40px);
          text-transform: uppercase;
          letter-spacing: -0.02em;
          line-height: 1;
          text-align: center;
          opacity: 0;
          animation: fadeUp 0.6s ease 0.3s forwards;
        }

        .hlg-sub {
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

        .hlg-form {
          width: 100%;
          margin-top: 32px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          opacity: 0;
          animation: fadeUp 0.6s ease 0.5s forwards;
        }

        .hlg-field { display: flex; flex-direction: column; gap: 8px; }

        .hlg-label {
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: rgba(240,237,232,0.5);
        }

        .hlg-input-row {
          position: relative;
          display: flex;
          align-items: center;
        }

        .hlg-input {
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
        .hlg-input::placeholder { color: rgba(240,237,232,0.25); }
        .hlg-input:focus {
          border-color: #e8ff47;
          background: #141400;
        }
        .hlg-input.hlg-input-err {
          border-color: rgba(255,90,90,0.6);
        }
        .hlg-input[type="password"],
        .hlg-input.hlg-has-toggle {
          padding-right: 52px;
        }

        .hlg-toggle {
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
        .hlg-toggle:hover { color: #e8ff47; }
        .hlg-toggle:focus-visible {
          outline: 2px solid #e8ff47;
          outline-offset: 2px;
        }

        .hlg-row-between {
          display: flex;
          justify-content: flex-end;
        }

        .hlg-link {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: rgba(240,237,232,0.45);
          text-decoration: none;
          background: none;
          border: none;
          cursor: pointer;
          transition: color 0.2s;
        }
        .hlg-link:hover { color: #e8ff47; }
        .hlg-link:focus-visible {
          outline: 2px solid #e8ff47;
          outline-offset: 2px;
        }

        .hlg-error {
          border: 2px solid rgba(255,90,90,0.4);
          background: rgba(255,90,90,0.08);
          color: #ffb3b3;
          font-size: 11px;
          line-height: 1.6;
          padding: 12px 14px;
        }

        .hlg-submit {
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
        .hlg-submit:hover:not(:disabled) { background: #f2ffb0; }
        .hlg-submit:active:not(:disabled) { transform: translateY(1px); }
        .hlg-submit:disabled {
          background: transparent;
          color: #e8ff47;
          cursor: not-allowed;
        }
        .hlg-submit:focus-visible {
          outline: 2px solid #f0ede8;
          outline-offset: 3px;
        }

        .hlg-spinner {
          width: 13px;
          height: 13px;
          border: 2px solid rgba(10,10,10,0.25);
          border-top-color: #0a0a0a;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }

        .hlg-divider-row {
          margin-top: 28px;
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
          opacity: 0;
          animation: fadeIn 0.6s ease 0.7s forwards;
        }
        .hlg-divider-line {
          flex: 1;
          height: 1px;
          background: rgba(240,237,232,0.1);
        }
        .hlg-divider-text {
          font-size: 9px;
          letter-spacing: 0.16em;
          color: rgba(240,237,232,0.25);
          text-transform: uppercase;
        }

        .hlg-register {
          margin-top: 20px;
          text-align: center;
          font-size: 12px;
          color: rgba(240,237,232,0.45);
          opacity: 0;
          animation: fadeIn 0.6s ease 0.8s forwards;
        }
        .hlg-register button {
          background: none;
          border: none;
          color: #e8ff47;
          font-family: 'Space Mono', monospace;
          font-weight: 700;
          font-size: 12px;
          letter-spacing: 0.03em;
          cursor: pointer;
          text-decoration: underline;
          text-underline-offset: 3px;
        }
        .hlg-register button:hover { color: #f2ffb0; }
        .hlg-register button:focus-visible {
          outline: 2px solid #e8ff47;
          outline-offset: 2px;
        }

        .hlg-back {
          margin-top: 36px;
          font-size: 10px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: rgba(240,237,232,0.25);
          text-decoration: none;
          background: none;
          border: none;
          cursor: pointer;
          transition: color 0.2s;
          opacity: 0;
          animation: fadeIn 0.6s ease 0.9s forwards;
        }
        .hlg-back:hover { color: #e8ff47; }

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
          .hlg-canvas-wrap, .hlg-eyebrow, .hlg-title, .hlg-sub,
          .hlg-form, .hlg-divider-row, .hlg-register, .hlg-back {
            animation: none;
            opacity: 1;
          }
          .hlg-spinner { animation: none; }
        }

        @media (max-width: 380px) {
          .hlg-input { padding: 12px 14px; }
          .hlg-submit { padding: 14px; }
        }
      `}</style>

      <div className="hlg-root">
        <div className="hlg-wrap">
          <div className="hlg-canvas-wrap">
            <canvas ref={canvasRef} className="hlg-canvas" />
          </div>

          <p className="hlg-eyebrow">FOR STUDIOS &amp; TEAMS</p>
          <h1 className="hlg-title">Hiring Manager</h1>
          <p className="hlg-sub">
            Sign in to browse verified talent and review contest results.
          </p>

          <form className="hlg-form" onSubmit={handleSubmit} noValidate>
            {error && <div className="hlg-error" role="alert">{error}</div>}

            <div className="hlg-field">
              <label className="hlg-label" htmlFor="identifier">
                Username or Phone
              </label>
              <div className="hlg-input-row">
                <input
                  id="identifier"
                  name="identifier"
                  type="text"
                  autoComplete="username"
                  placeholder="Username or phone"
                  className={`hlg-input${fieldErrors.identifier ? " hlg-input-err" : ""}`}
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="hlg-field">
              <label className="hlg-label" htmlFor="password">
                Password
              </label>
              <div className="hlg-input-row">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className={`hlg-input hlg-has-toggle${fieldErrors.password ? " hlg-input-err" : ""}`}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
                <button
                  type="button"
                  className="hlg-toggle"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? "HIDE" : "SHOW"}
                </button>
              </div>
              <div className="hlg-row-between">
                <button
                  type="button"
                  className="hlg-link"
                  onClick={() => router.push("/forgot-password")}
                >
                  Forgot password?
                </button>
              </div>
            </div>

            <button type="submit" className="hlg-submit" disabled={loading}>
              {loading ? (
                <>
                  <span className="hlg-spinner" />
                  SIGNING IN
                </>
              ) : (
                "SIGN IN"
              )}
            </button>
          </form>

          <div className="hlg-divider-row">
            <div className="hlg-divider-line" />
            <span className="hlg-divider-text">NEW HERE</span>
            <div className="hlg-divider-line" />
          </div>

          <p className="hlg-register">
            Don't have an account?{" "}
            <button type="button" onClick={() => router.push("/register")}>
              Register now
            </button>
          </p>

          <button type="button" className="hlg-back" onClick={() => router.push("/")}>
            ← Back to radar.editorzzz
          </button>
        </div>
      </div>
    </>
  );
}