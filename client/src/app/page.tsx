"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export default function HomePage() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Radar sweep animation on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let angle = 0;
    const dots: { x: number; y: number; alpha: number; r: number }[] = [];

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    // Seed a few blip dots
    for (let i = 0; i < 6; i++) {
      const a = Math.random() * Math.PI * 2;
      const d = 60 + Math.random() * 160;
      dots.push({
        x: Math.cos(a) * d,
        y: Math.sin(a) * d,
        alpha: 0,
        r: 2 + Math.random() * 2,
      });
    }

    const draw = () => {
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const radius = Math.min(cx, cy) - 16;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Outer rings
      [1, 0.66, 0.33].forEach((scale) => {
        ctx.beginPath();
        ctx.arc(cx, cy, radius * scale, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(232,255,71,0.08)";
        ctx.lineWidth = 1;
        ctx.stroke();
      });

      // Cross hairs
      ctx.strokeStyle = "rgba(232,255,71,0.06)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx - radius, cy);
      ctx.lineTo(cx + radius, cy);
      ctx.moveTo(cx, cy - radius);
      ctx.lineTo(cx, cy + radius);
      ctx.stroke();

      // Sweep gradient trail
      // Draw sweep as a filled arc
      const sweepArc = (Math.PI * 2) / 3; // 120° trail
      const grad = ctx.createLinearGradient(cx, cy, cx + radius, cy);
      grad.addColorStop(0, "rgba(232,255,71,0.0)");
      grad.addColorStop(1, "rgba(232,255,71,0.12)");

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angle);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, radius, -sweepArc, 0);
      ctx.closePath();
      ctx.fillStyle = "rgba(232,255,71,0.07)";
      ctx.fill();

      // Sweep line
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(radius, 0);
      ctx.strokeStyle = "rgba(232,255,71,0.55)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();

      // Blip dots — light up when sweep passes over them
      dots.forEach((dot) => {
        const dotAngle = Math.atan2(dot.y, dot.x);
        let diff = angle % (Math.PI * 2) - dotAngle;
        if (diff < 0) diff += Math.PI * 2;
        if (diff < 0.15) dot.alpha = 1;
        dot.alpha *= 0.975;

        if (dot.alpha > 0.01) {
          ctx.beginPath();
          ctx.arc(cx + dot.x, cy + dot.y, dot.r, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(232,255,71,${dot.alpha * 0.9})`;
          ctx.fill();
          // glow
          ctx.beginPath();
          ctx.arc(cx + dot.x, cy + dot.y, dot.r + 4, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(232,255,71,${dot.alpha * 0.15})`;
          ctx.fill();
        }
      });

      // Center dot
      ctx.beginPath();
      ctx.arc(cx, cy, 3, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(232,255,71,0.6)";
      ctx.fill();

      angle += 0.012;
      animId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:ital,wght@0,400;0,700;1,400&family=Space+Grotesk:wght@400;500;700;900&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .rdr-root {
          min-height: 100vh;
          background: #0a0a0a;
          font-family: 'Space Mono', monospace;
          color: #f0ede8;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          position: relative;
          padding: 24px;
        }

        /* Subtle grid bg */
        .rdr-root::before {
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

        .rdr-wrap {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 100%;
          max-width: 900px;
          gap: 0;
        }

        /* Radar canvas */
        .rdr-canvas-wrap {
          position: relative;
          width: 260px;
          height: 260px;
          flex-shrink: 0;
          margin-bottom: -24px;
        }
        @media (min-width: 640px) {
          .rdr-canvas-wrap { width: 300px; height: 300px; }
        }
        .rdr-canvas {
          width: 100%;
          height: 100%;
          display: block;
        }

        /* Header text */
        .rdr-eyebrow {
          font-family: 'Space Mono', monospace;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.28em;
          text-transform: uppercase;
          color: #e8ff47;
          margin-bottom: 12px;
          opacity: 0;
          animation: fadeUp 0.6s ease 0.2s forwards;
        }
        .rdr-title {
          font-family: 'Space Grotesk', sans-serif;
          font-weight: 900;
          font-size: clamp(52px, 12vw, 96px);
          text-transform: uppercase;
          letter-spacing: -0.03em;
          line-height: 0.9;
          color: #f0ede8;
          text-align: center;
          opacity: 0;
          animation: fadeUp 0.7s ease 0.35s forwards;
        }
        .rdr-title span {
          color: #e8ff47;
          display: inline-block;
        }
        .rdr-sub {
          margin-top: 16px;
          font-family: 'Space Mono', monospace;
          font-size: clamp(11px, 2.5vw, 13px);
          font-weight: 400;
          letter-spacing: 0.06em;
          color: rgba(240,237,232,0.45);
          text-align: center;
          max-width: 380px;
          line-height: 1.7;
          opacity: 0;
          animation: fadeUp 0.7s ease 0.5s forwards;
        }

        /* Divider */
        .rdr-divider {
          width: 100%;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(232,255,71,0.2), transparent);
          margin: 36px 0;
          opacity: 0;
          animation: fadeIn 0.6s ease 0.7s forwards;
        }

        /* Continue label */
        .rdr-continue-label {
          font-family: 'Space Mono', monospace;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: rgba(240,237,232,0.3);
          margin-bottom: 20px;
          opacity: 0;
          animation: fadeIn 0.6s ease 0.8s forwards;
        }

        /* Cards row */
        .rdr-cards {
          display: grid;
          grid-template-columns: 1fr;
          gap: 12px;
          width: 100%;
          opacity: 0;
          animation: fadeUp 0.7s ease 0.9s forwards;
        }
        @media (min-width: 600px) {
          .rdr-cards { grid-template-columns: 1fr 1fr; gap: 16px; }
        }

        .rdr-card {
          position: relative;
          border: 2px solid rgba(240,237,232,0.1);
          background: #111;
          padding: 28px 24px;
          cursor: pointer;
          transition: border-color 0.2s, background 0.2s, transform 0.15s;
          display: flex;
          flex-direction: column;
          gap: 12px;
          overflow: hidden;
          text-align: left;
          outline: none;
        }
        .rdr-card::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(232,255,71,0.04), transparent 60%);
          opacity: 0;
          transition: opacity 0.25s;
          pointer-events: none;
        }
        .rdr-card:hover {
          border-color: #e8ff47;
          background: #161616;
          transform: translateY(-2px);
        }
        .rdr-card:hover::after { opacity: 1; }
        .rdr-card:active { transform: translateY(0px); }

        /* Card accent top bar */
        .rdr-card-bar {
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 3px;
          background: #e8ff47;
          transform: scaleX(0);
          transform-origin: left;
          transition: transform 0.25s ease;
        }
        .rdr-card:hover .rdr-card-bar { transform: scaleX(1); }

        .rdr-card-icon {
          width: 44px;
          height: 44px;
          border: 2px solid rgba(232,255,71,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #e8ff47;
          flex-shrink: 0;
          transition: background 0.2s, border-color 0.2s;
        }
        .rdr-card:hover .rdr-card-icon {
          background: rgba(232,255,71,0.1);
          border-color: #e8ff47;
        }

        .rdr-card-role {
          font-family: 'Space Mono', monospace;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: #e8ff47;
        }
        .rdr-card-title {
          font-family: 'Space Grotesk', sans-serif;
          font-weight: 900;
          font-size: clamp(20px, 4vw, 26px);
          text-transform: uppercase;
          letter-spacing: 0.01em;
          color: #f0ede8;
          line-height: 1.0;
        }
        .rdr-card-desc {
          font-family: 'Space Mono', monospace;
          font-size: 11px;
          font-weight: 400;
          line-height: 1.7;
          color: rgba(240,237,232,0.4);
          margin-top: 2px;
        }
        .rdr-card-cta {
          margin-top: 8px;
          display: flex;
          align-items: center;
          gap: 8px;
          font-family: 'Space Mono', monospace;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #e8ff47;
          transition: gap 0.2s;
        }
        .rdr-card:hover .rdr-card-cta { gap: 12px; }
        .rdr-card-arrow {
          font-size: 14px;
          transition: transform 0.2s;
        }
        .rdr-card:hover .rdr-card-arrow { transform: translateX(3px); }

        /* Bottom note */
        .rdr-note {
          margin-top: 32px;
          font-family: 'Space Mono', monospace;
          font-size: 10px;
          letter-spacing: 0.1em;
          color: rgba(240,237,232,0.2);
          text-align: center;
          opacity: 0;
          animation: fadeIn 0.6s ease 1.2s forwards;
        }

        /* Animations */
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }

        /* Reduced motion */
        @media (prefers-reduced-motion: reduce) {
          .rdr-eyebrow, .rdr-title, .rdr-sub,
          .rdr-divider, .rdr-continue-label,
          .rdr-cards, .rdr-note {
            animation: none;
            opacity: 1;
          }
        }
      `}</style>

      <div className="rdr-root">
        <div className="rdr-wrap">

          {/* Radar canvas */}
          <div className="rdr-canvas-wrap">
            <canvas ref={canvasRef} className="rdr-canvas" />
          </div>

          {/* Heading */}
          <p className="rdr-eyebrow">TALENT INTELLIGENCE PLATFORM</p>
          <h1 className="rdr-title">
            RAD<span>A</span>R
          </h1>
          <p className="rdr-sub">
            Find who's building. Discover who's winning.<br />
            Pick your role to get started.
          </p>

          <div className="rdr-divider" />

          <p className="rdr-continue-label">CONTINUE AS</p>

          {/* Cards */}
          <div className="rdr-cards">

            {/* Editor card */}
            <button
              className="rdr-card"
              onClick={() => router.push("/login-editors")}
            >
              <div className="rdr-card-bar" />
              <div className="rdr-card-icon">
                {/* Pencil icon inline SVG */}
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </div>
              <div>
                <div className="rdr-card-role">FOR CREATORS</div>
                <div className="rdr-card-title">Editor /<br />Designer</div>
              </div>
              <p className="rdr-card-desc">
                Showcase your work, enter contests,<br />
                and get discovered by top studios.
              </p>
              <div className="rdr-card-cta">
                CONTINUE
                <span className="rdr-card-arrow">→</span>
              </div>
            </button>

            {/* Hiring Manager card */}
            <button
              className="rdr-card"
              onClick={() => router.push("/login")}
            >
              <div className="rdr-card-bar" />
              <div className="rdr-card-icon">
                {/* Briefcase icon inline SVG */}
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
                  <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
                </svg>
              </div>
              <div>
                <div className="rdr-card-role">FOR STUDIOS &amp; TEAMS</div>
                <div className="rdr-card-title">Hiring<br />Manager</div>
              </div>
              <p className="rdr-card-desc">
                Browse verified talent, review contest<br />
                results, and hire with confidence.
              </p>
              <div className="rdr-card-cta">
                CONTINUE
                <span className="rdr-card-arrow">→</span>
              </div>
            </button>

          </div>

          <p className="rdr-note">
            NO ALGORITHMS. NO NOISE. JUST TALENT ON RADAR.
          </p>

        </div>
      </div>
    </>
  );
}