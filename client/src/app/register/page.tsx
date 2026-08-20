"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, FormEvent } from "react";
import { registerUser } from "@/lib/api"; 

interface FormState {
  full_name: string;
  username: string;
  phone: string;
  password: string;
  confirm_password: string;
  company_name: string;
}

interface FormErrors {
  full_name?: string;
  username?: string;
  phone?: string;
  password?: string;
  confirm_password?: string;
  company_name?: string;
}

const INITIAL_FORM: FormState = {
  full_name: "",
  username: "",
  phone: "",
  password: "",
  confirm_password: "",
  company_name: "",
};

export default function HireRegisterPage() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Quiet radar sweep, same signature as the login page
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

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  }

  function validate(): FormErrors {
    const next: FormErrors = {};

    // username: required, min=5, max=20 (matches backend validator tag)
    const username = form.username.trim();
    if (!username) {
      next.username = "Username is required.";
    } else if (username.length < 5 || username.length > 20) {
      next.username = "Username must be 5–20 characters.";
    } else if (!/^[a-zA-Z0-9_.]+$/.test(username)) {
      next.username = "Letters, numbers, underscores and dots only.";
    }

    // phone: required. Accept 10-digit local or +91 prefixed, mirroring the backend's normalization.
    const phone = form.phone.trim();
    const digitsOnly = phone.replace(/\D/g, "");
    if (!phone) {
      next.phone = "Phone number is required.";
    } else if (!(digitsOnly.length === 10 || (phone.startsWith("+") && digitsOnly.length >= 10))) {
      next.phone = "Enter a valid 10-digit phone number.";
    }

    // password: not validator-tagged on the backend, but enforce a sane minimum client-side
    if (!form.password) {
      next.password = "Password is required.";
    } else if (form.password.length < 8) {
      next.password = "Use at least 8 characters.";
    }

    if (form.confirm_password !== form.password) {
      next.confirm_password = "Passwords don't match.";
    }

    return next;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);

    const validation = validate();
    if (Object.keys(validation).length > 0) {
      setErrors(validation);
      setFormError("Fix the highlighted fields and try again.");
      return;
    }

    setLoading(true);
    try {
      const cleanedPhone = form.phone.trim();
      const res = await registerUser({
        full_name: form.full_name.trim(),
        username: form.username.trim(),
        phone: cleanedPhone,
        password: form.password,
        company_name: form.company_name.trim(),
      });

      if (res?.id) {
        router.push(`/verify-phone?id=${res.id}`);
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
    const details: string | undefined = payload?.details;

    // 409 — username or phone already taken
    if (status === 409) {
      if (message?.toLowerCase().includes("username")) {
        setErrors((e) => ({ ...e, username: message }));
      } else if (message?.toLowerCase().includes("phone")) {
        setErrors((e) => ({ ...e, phone: message }));
      }
      setFormError(message || "That account already exists.");
      return;
    }

    // 400 — bad input or server-side validator failure
    if (status === 400) {
      setFormError(details ? `${message}: ${details}` : message || "Check your details and try again.");
      return;
    }

    setFormError(message || "Something went wrong. Try again in a moment.");
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:ital,wght@0,400;0,700;1,400&family=Space+Grotesk:wght@400;500;700;900&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .hrg-root {
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

        .hrg-root::before {
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

        .hrg-wrap {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 460px;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 32px 0 48px;
        }

        .hrg-canvas-wrap {
          width: 64px;
          height: 64px;
          margin-bottom: 6px;
          opacity: 0;
          animation: fadeUp 0.6s ease 0.1s forwards;
        }
        .hrg-canvas { width: 100%; height: 100%; display: block; }

        .hrg-eyebrow {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.26em;
          text-transform: uppercase;
          color: #e8ff47;
          margin-bottom: 10px;
          opacity: 0;
          animation: fadeUp 0.6s ease 0.2s forwards;
        }

        .hrg-title {
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

        .hrg-sub {
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

        .hrg-form {
          width: 100%;
          margin-top: 30px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          opacity: 0;
          animation: fadeUp 0.6s ease 0.5s forwards;
        }

        .hrg-grid-2 {
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
        }
        @media (min-width: 480px) {
          .hrg-grid-2 { grid-template-columns: 1fr 1fr; }
        }

        .hrg-field { display: flex; flex-direction: column; gap: 8px; }

        .hrg-label {
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: rgba(240,237,232,0.5);
          display: flex;
          justify-content: space-between;
          align-items: baseline;
        }
        .hrg-label-optional {
          font-size: 8px;
          font-weight: 400;
          letter-spacing: 0.1em;
          color: rgba(240,237,232,0.25);
          text-transform: none;
        }

        .hrg-input-row {
          position: relative;
          display: flex;
          align-items: center;
        }

        .hrg-input {
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
        .hrg-input::placeholder { color: rgba(240,237,232,0.25); }
        .hrg-input:focus {
          border-color: #e8ff47;
          background: #141400;
        }
        .hrg-input.hrg-input-err {
          border-color: rgba(255,90,90,0.6);
        }
        .hrg-input.hrg-has-toggle { padding-right: 52px; }

        .hrg-toggle {
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
        .hrg-toggle:hover { color: #e8ff47; }
        .hrg-toggle:focus-visible {
          outline: 2px solid #e8ff47;
          outline-offset: 2px;
        }

        .hrg-hint {
          font-size: 9.5px;
          letter-spacing: 0.02em;
          color: rgba(240,237,232,0.3);
        }
        .hrg-field-err {
          font-size: 9.5px;
          letter-spacing: 0.02em;
          color: #ffb3b3;
        }

        .hrg-strength {
          display: flex;
          gap: 4px;
          margin-top: 2px;
        }
        .hrg-strength-seg {
          height: 3px;
          flex: 1;
          background: rgba(240,237,232,0.1);
          transition: background 0.25s;
        }
        .hrg-strength-seg.hrg-strength-on-weak { background: #ff5a5a; }
        .hrg-strength-seg.hrg-strength-on-mid { background: #e8ff47; }
        .hrg-strength-seg.hrg-strength-on-strong { background: #7dffb0; }

        .hrg-error {
          border: 2px solid rgba(255,90,90,0.4);
          background: rgba(255,90,90,0.08);
          color: #ffb3b3;
          font-size: 11px;
          line-height: 1.6;
          padding: 12px 14px;
        }

        .hrg-submit {
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
        .hrg-submit:hover:not(:disabled) { background: #f2ffb0; }
        .hrg-submit:active:not(:disabled) { transform: translateY(1px); }
        .hrg-submit:disabled {
          background: transparent;
          color: #e8ff47;
          cursor: not-allowed;
        }
        .hrg-submit:focus-visible {
          outline: 2px solid #f0ede8;
          outline-offset: 3px;
        }

        .hrg-spinner {
          width: 13px;
          height: 13px;
          border: 2px solid rgba(10,10,10,0.25);
          border-top-color: #0a0a0a;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }

        .hrg-terms {
          font-size: 9.5px;
          line-height: 1.6;
          color: rgba(240,237,232,0.3);
          text-align: center;
        }

        .hrg-divider-row {
          margin-top: 26px;
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
          opacity: 0;
          animation: fadeIn 0.6s ease 0.7s forwards;
        }
        .hrg-divider-line {
          flex: 1;
          height: 1px;
          background: rgba(240,237,232,0.1);
        }
        .hrg-divider-text {
          font-size: 9px;
          letter-spacing: 0.16em;
          color: rgba(240,237,232,0.25);
          text-transform: uppercase;
        }

        .hrg-login {
          margin-top: 20px;
          text-align: center;
          font-size: 12px;
          color: rgba(240,237,232,0.45);
          opacity: 0;
          animation: fadeIn 0.6s ease 0.8s forwards;
        }
        .hrg-login button {
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
        .hrg-login button:hover { color: #f2ffb0; }
        .hrg-login button:focus-visible {
          outline: 2px solid #e8ff47;
          outline-offset: 2px;
        }

        .hrg-back {
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
        .hrg-back:hover { color: #e8ff47; }

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
          .hrg-canvas-wrap, .hrg-eyebrow, .hrg-title, .hrg-sub,
          .hrg-form, .hrg-divider-row, .hrg-login, .hrg-back {
            animation: none;
            opacity: 1;
          }
          .hrg-spinner { animation: none; }
        }

        @media (max-width: 380px) {
          .hrg-input { padding: 12px 14px; }
          .hrg-submit { padding: 14px; }
        }
      `}</style>

      <div className="hrg-root">
        <div className="hrg-wrap">
          <div className="hrg-canvas-wrap">
            <canvas ref={canvasRef} className="hrg-canvas" />
          </div>

          <p className="hrg-eyebrow">FOR STUDIOS &amp; TEAMS</p>
          <h1 className="hrg-title">Create Account</h1>
          <p className="hrg-sub">
            Register as a hiring manager to browse verified talent on radar.editorzzz.
          </p>

          <form className="hrg-form" onSubmit={handleSubmit} noValidate>
            {formError && <div className="hrg-error" role="alert">{formError}</div>}

            <div className="hrg-grid-2">
              <div className="hrg-field">
                <label className="hrg-label" htmlFor="full_name">
                  Full Name
                  <span className="hrg-label-optional">optional</span>
                </label>
                <div className="hrg-input-row">
                  <input
                    id="full_name"
                    name="full_name"
                    type="text"
                    autoComplete="name"
                    className="hrg-input"
                    value={form.full_name}
                    onChange={(e) => updateField("full_name", e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="hrg-field">
                <label className="hrg-label" htmlFor="company_name">
                  Company
                  <span className="hrg-label-optional">optional</span>
                </label>
                <div className="hrg-input-row">
                  <input
                    id="company_name"
                    name="company_name"
                    type="text"
                    autoComplete="organization"
                    className="hrg-input"
                    value={form.company_name}
                    onChange={(e) => updateField("company_name", e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>
            </div>

            <div className="hrg-field">
              <label className="hrg-label" htmlFor="username">Username</label>
              <div className="hrg-input-row">
                <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  className={`hrg-input${errors.username ? " hrg-input-err" : ""}`}
                  value={form.username}
                  onChange={(e) => updateField("username", e.target.value)}
                  disabled={loading}
                  aria-invalid={!!errors.username}
                />
              </div>
              {errors.username ? (
                <span className="hrg-field-err">{errors.username}</span>
              ) : (
                <span className="hrg-hint">5–20 characters, letters, numbers, _ or .</span>
              )}
            </div>

            <div className="hrg-field">
              <label className="hrg-label" htmlFor="phone">Phone Number</label>
              <div className="hrg-input-row">
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  className={`hrg-input${errors.phone ? " hrg-input-err" : ""}`}
                  value={form.phone}
                  onChange={(e) => updateField("phone", e.target.value)}
                  disabled={loading}
                  aria-invalid={!!errors.phone}
                />
              </div>
              {errors.phone ? (
                <span className="hrg-field-err">{errors.phone}</span>
              ) : (
                <span className="hrg-hint">We'll text a code here to verify your account.</span>
              )}
            </div>

            <div className="hrg-field">
              <label className="hrg-label" htmlFor="password">Password</label>
              <div className="hrg-input-row">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  className={`hrg-input hrg-has-toggle${errors.password ? " hrg-input-err" : ""}`}
                  value={form.password}
                  onChange={(e) => updateField("password", e.target.value)}
                  disabled={loading}
                  aria-invalid={!!errors.password}
                />
                <button
                  type="button"
                  className="hrg-toggle"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? "HIDE" : "SHOW"}
                </button>
              </div>
              <PasswordStrength value={form.password} />
              {errors.password && <span className="hrg-field-err">{errors.password}</span>}
            </div>

            <div className="hrg-field">
              <label className="hrg-label" htmlFor="confirm_password">Confirm Password</label>
              <div className="hrg-input-row">
                <input
                  id="confirm_password"
                  name="confirm_password"
                  type={showConfirm ? "text" : "password"}
                  autoComplete="new-password"
                  className={`hrg-input hrg-has-toggle${errors.confirm_password ? " hrg-input-err" : ""}`}
                  value={form.confirm_password}
                  onChange={(e) => updateField("confirm_password", e.target.value)}
                  disabled={loading}
                  aria-invalid={!!errors.confirm_password}
                />
                <button
                  type="button"
                  className="hrg-toggle"
                  onClick={() => setShowConfirm((s) => !s)}
                  aria-label={showConfirm ? "Hide password" : "Show password"}
                >
                  {showConfirm ? "HIDE" : "SHOW"}
                </button>
              </div>
              {errors.confirm_password && (
                <span className="hrg-field-err">{errors.confirm_password}</span>
              )}
            </div>

            <button type="submit" className="hrg-submit" disabled={loading}>
              {loading ? (
                <>
                  <span className="hrg-spinner" />
                  CREATING ACCOUNT
                </>
              ) : (
                "CREATE ACCOUNT"
              )}
            </button>

            <p className="hrg-terms">
              By creating an account you agree to be contacted about your listings and
              hiring activity on radar.editorzzz.
            </p>
          </form>

          <div className="hrg-divider-row">
            <div className="hrg-divider-line" />
            <span className="hrg-divider-text">ALREADY REGISTERED</span>
            <div className="hrg-divider-line" />
          </div>

          <p className="hrg-login">
            Have an account already?{" "}
            <button type="button" onClick={() => router.push("/hire/login")}>
              Sign in
            </button>
          </p>

          <button type="button" className="hrg-back" onClick={() => router.push("/")}>
            ← Back to radar.editorzzz
          </button>
        </div>
      </div>
    </>
  );
}

function PasswordStrength({ value }: { value: string }) {
  const score = getStrength(value);
  const label = ["", "Weak", "Fair", "Good", "Strong"][score];
  const tone = score <= 1 ? "weak" : score === 2 ? "mid" : "strong";

  if (!value) return null;

  return (
    <div>
      <div className="hrg-strength">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`hrg-strength-seg${i < score ? ` hrg-strength-on-${tone}` : ""}`}
          />
        ))}
      </div>
      <span className="hrg-hint">{label}</span>
    </div>
  );
}

function getStrength(pw: string): number {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score++;
  return Math.min(score, 4);
}