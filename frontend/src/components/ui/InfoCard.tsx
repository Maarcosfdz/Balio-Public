import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { X, CheckCircle2, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";

// ── Persistence helpers ──────────────────────────────────────────────────────

const STORAGE_KEY = (id: string) => `seen-${id}-info`;

export function hasSeenInfoCard(id: string): boolean {
  return localStorage.getItem(STORAGE_KEY(id)) === "true";
}

export function markInfoCardSeen(id: string): void {
  localStorage.setItem(STORAGE_KEY(id), "true");
}

export function resetAllInfoCards(): void {
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith("seen-") && key.endsWith("-info")) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach((k) => localStorage.removeItem(k));
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface InfoCardProps {
  id: string;
  title: string;
  description?: string;
  items?: string[];
  accentColor?: "sky" | "emerald" | "violet" | "amber" | "rose";
}

// ── Floating particle (finance-themed) ───────────────────────────────────────

interface Particle {
  symbol: string;
  x: number;
  y: number;
  size: number;
  delay: number;
  duration: number;
}

const FINANCE_SYMBOLS = ["$", "€", "£", "¥", "₿", "%", "↑", "↓", "◈", "⬡"];

function generateParticles(count: number): Particle[] {
  return Array.from({ length: count }, (_, i) => ({
    symbol: FINANCE_SYMBOLS[i % FINANCE_SYMBOLS.length],
    x: 5 + Math.random() * 90,
    y: 5 + Math.random() * 90,
    size: 9 + Math.random() * 8,
    delay: Math.random() * 1.5,
    duration: 2.5 + Math.random() * 2,
  }));
}

// ── Accent palettes ───────────────────────────────────────────────────────────

const ACCENT = {
  sky: {
    badge: "bg-sky-100 text-sky-600",
    iconBg: "bg-sky-500/10",
    iconText: "text-sky-500",
    bullet: "bg-sky-400",
    btn: "from-sky-500 to-cyan-500",
    glow: "rgba(56,189,248,0.25)",
    border: "border-sky-200",
    particle: "text-sky-300/40",
    barFrom: "#38bdf8",
    barTo: "#22d3ee",
  },
  emerald: {
    badge: "bg-emerald-100 text-emerald-600",
    iconBg: "bg-emerald-500/10",
    iconText: "text-emerald-500",
    bullet: "bg-emerald-400",
    btn: "from-emerald-500 to-teal-500",
    glow: "rgba(52,211,153,0.25)",
    border: "border-emerald-200",
    particle: "text-emerald-300/40",
    barFrom: "#34d399",
    barTo: "#2dd4bf",
  },
  violet: {
    badge: "bg-violet-100 text-violet-600",
    iconBg: "bg-violet-500/10",
    iconText: "text-violet-500",
    bullet: "bg-violet-400",
    btn: "from-violet-500 to-purple-500",
    glow: "rgba(167,139,250,0.25)",
    border: "border-violet-200",
    particle: "text-violet-300/40",
    barFrom: "#a78bfa",
    barTo: "#c084fc",
  },
  amber: {
    badge: "bg-amber-100 text-amber-600",
    iconBg: "bg-amber-500/10",
    iconText: "text-amber-500",
    bullet: "bg-amber-400",
    btn: "from-amber-500 to-orange-500",
    glow: "rgba(251,191,36,0.25)",
    border: "border-amber-200",
    particle: "text-amber-300/40",
    barFrom: "#fbbf24",
    barTo: "#fb923c",
  },
  rose: {
    badge: "bg-rose-100 text-rose-600",
    iconBg: "bg-rose-500/10",
    iconText: "text-rose-500",
    bullet: "bg-rose-400",
    btn: "from-rose-500 to-pink-500",
    glow: "rgba(251,113,133,0.25)",
    border: "border-rose-200",
    particle: "text-rose-300/40",
    barFrom: "#fb7185",
    barTo: "#f472b6",
  },
};

// ── Animated mini-chart bar decoration ───────────────────────────────────────

function MiniChart({ from, to }: { from: string; to: string }) {
  const barsRef = useRef<HTMLDivElement[]>([]);
  const heights = [30, 55, 40, 70, 50, 85, 60, 90, 65, 95];

  useEffect(() => {
    if (!barsRef.current.length) return;
    gsap.from(barsRef.current, {
      scaleY: 0,
      duration: 0.6,
      ease: "back.out(1.4)",
      stagger: 0.05,
      delay: 0.4,
      transformOrigin: "bottom center",
    });
  }, []);

  return (
    <div className="flex items-end gap-[3px] h-10 opacity-60">
      {heights.map((h, i) => (
        <div
          key={i}
          ref={(el) => { if (el) barsRef.current[i] = el; }}
          style={{
            height: `${h}%`,
            width: "5px",
            borderRadius: "2px 2px 0 0",
            background: `linear-gradient(to top, ${from}, ${to})`,
          }}
        />
      ))}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function InfoCard({
  id,
  title,
  description,
  items,
  accentColor = "sky",
}: InfoCardProps) {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(() => !hasSeenInfoCard(id));
  const [exiting, setExiting] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const particlesRef = useRef<HTMLSpanElement[]>([]);
  const bulletRefs = useRef<HTMLDivElement[]>([]);
  const [particles] = useState(() => generateParticles(8));
  const palette = ACCENT[accentColor];
  const isDashboardCard = id.startsWith("dashboard");

  // ── Entrance animation ───────────────────────────────────────────────────
  useEffect(() => {
    if (!visible || !cardRef.current) return;

    const ctx = gsap.context(() => {
      // Card rises from bottom
      gsap.from(cardRef.current, {
        y: 40,
        opacity: 0,
        duration: 0.55,
        ease: "back.out(1.6)",
      });

      // Floating particles drift upward
      particlesRef.current.forEach((el, i) => {
        if (!el) return;
        gsap.fromTo(el, {
          opacity: 0,
        }, {
          y: -18 - i * 3,
          opacity: 0.7,
          duration: particles[i].duration,
          delay: particles[i].delay,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
        });
      });

      // Bullet points stagger in
      gsap.from(bulletRefs.current.filter(Boolean), {
        x: -12,
        opacity: 0,
        duration: 0.35,
        stagger: 0.08,
        delay: 0.3,
        ease: "power2.out",
      });
    });

    return () => ctx.revert();
  }, [visible, particles]);

  if (!visible) return null;

  const dismiss = () => {
    if (!cardRef.current) return;
    setExiting(true);

    gsap.to(cardRef.current, {
      y: 24,
      opacity: 0,
      scale: 0.97,
      duration: 0.35,
      ease: "power2.in",
      onComplete: () => {
        markInfoCardSeen(id);
        setVisible(false);
        setExiting(false);
      },
    });
  };

  const rootClasses = isDashboardCard
    ? `info-card-root fixed left-1/2 top-1/2 z-50 w-[min(96vw,980px)] max-h-[calc(100vh-2rem)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border bg-white/95 backdrop-blur-md ${palette.border}`
    : `info-card-root fixed bottom-5 right-5 z-50 w-[340px] max-w-[calc(100vw-2.5rem)] overflow-hidden rounded-2xl border bg-white/95 backdrop-blur-md ${palette.border}`;

  const bodyClasses = isDashboardCard
    ? "style-dashboard-scroll relative max-h-[calc(100vh-2.25rem)] overflow-y-auto px-5 py-5 sm:px-6 sm:py-6"
    : "relative px-4 py-4 sm:px-5 sm:py-4";

  return (
    <div
      ref={cardRef}
      className={rootClasses}
      style={{ boxShadow: `0 8px 40px ${palette.glow}, 0 2px 12px rgba(0,0,0,0.10)` }}
      aria-live="polite"
    >
      {/* Floating finance particles */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        {particles.map((p, i) => (
          <span
            key={i}
            ref={(el) => { if (el) particlesRef.current[i] = el; }}
            className={`absolute select-none font-mono font-bold ${palette.particle}`}
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              fontSize: `${p.size}px`,
              opacity: 0,
            }}
          >
            {p.symbol}
          </span>
        ))}
      </div>

      {/* Gradient accent strip */}
      <div
        className={`absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r ${palette.btn}`}
      />

      <div className={bodyClasses}>
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {/* Icon orb */}
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${palette.iconBg} ${palette.iconText}`}
            >
              <CheckCircle2 className="h-[18px] w-[18px]" strokeWidth={2.5} />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${palette.badge}`}>
                  {t("infoCard.badge", "Guide")}
                </span>
              </div>
              <h3 className={`mt-0.5 font-bold text-slate-800 leading-tight ${isDashboardCard ? "text-base sm:text-lg" : "text-sm"}`}>
                {title}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Mini chart decoration */}
            <div className="hidden sm:block">
              <MiniChart from={palette.barFrom} to={palette.barTo} />
            </div>

            {/* Close button */}
            <button
              onClick={dismiss}
              disabled={exiting}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              aria-label={t("infoCard.dismiss", "Dismiss")}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Items list */}
        {items && items.length > 0 && (
          <ul className="mt-3 space-y-1.5 pl-1">
            {items.map((item, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <div
                  ref={(el) => { if (el) bulletRefs.current[i] = el; }}
                  className="flex items-center gap-2.5"
                >
                  <ChevronRight className={`h-3.5 w-3.5 shrink-0 mt-0.5 ${palette.iconText}`} strokeWidth={2.5} />
                  <span className={`text-slate-600 ${isDashboardCard ? "text-[0.95rem] leading-relaxed" : "text-sm"}`}>{item}</span>
                </div>
              </li>
            ))}
          </ul>
        )}

        {/* Description */}
        {description && (
          <p className={`mt-2.5 text-slate-500 leading-relaxed pl-1 ${isDashboardCard ? "text-[0.95rem]" : "text-sm"}`}>
            {description}
          </p>
        )}

        {/* Footer action */}
        <div className="mt-4 flex justify-end">
          <button
            onClick={dismiss}
            disabled={exiting}
            className={`info-card-got-it flex items-center gap-1.5 rounded-xl bg-gradient-to-r ${palette.btn} px-4 py-1.5 text-xs font-bold text-white shadow-sm transition hover:opacity-90 active:scale-[0.97]`}
          >
            {t("infoCard.gotIt", "Got it")}
            <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </div>
  );
}
