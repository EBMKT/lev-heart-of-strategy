import { cn } from "@/lib/utils";

interface LevEmblemProps {
  className?: string;
  active?: boolean;
  size?: number;
}

/**
 * LEV Emblem — geometric lion + heart mark.
 * Two overlapping rotated diamonds forming a stylized mane crown around
 * a central mane-heart. Animates when active (LEV speaking).
 */
export function LevEmblem({ className, active = false, size = 72 }: LevEmblemProps) {
  return (
    <div
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      {/* Outer glow ring */}
      <div
        className={cn(
          "absolute inset-0 rounded-full",
          active && "animate-lev-glow",
        )}
        style={{
          background:
            "radial-gradient(circle, oklch(0.78 0.095 82 / 0.25), transparent 65%)",
        }}
      />
      {/* Rotating outer ring */}
      <svg
        viewBox="0 0 100 100"
        className={cn("absolute inset-0 animate-lev-spin-slow", active && "opacity-100", !active && "opacity-70")}
        aria-hidden
      >
        <defs>
          <linearGradient id="lev-gold" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="oklch(0.85 0.11 85)" />
            <stop offset="100%" stopColor="oklch(0.6 0.08 70)" />
          </linearGradient>
        </defs>
        {/* mane rays */}
        {Array.from({ length: 12 }).map((_, i) => {
          const angle = (i * 360) / 12;
          return (
            <line
              key={i}
              x1="50"
              y1="8"
              x2="50"
              y2="16"
              stroke="url(#lev-gold)"
              strokeWidth="1.4"
              strokeLinecap="round"
              transform={`rotate(${angle} 50 50)`}
              opacity={i % 2 === 0 ? 0.9 : 0.5}
            />
          );
        })}
        <circle
          cx="50"
          cy="50"
          r="34"
          fill="none"
          stroke="url(#lev-gold)"
          strokeWidth="0.6"
          strokeDasharray="2 4"
          opacity="0.5"
        />
      </svg>

      {/* Central lion+heart glyph */}
      <svg
        viewBox="0 0 100 100"
        className={cn("relative", active && "animate-lev-pulse")}
        style={{ width: size * 0.6, height: size * 0.6 }}
        aria-hidden
      >
        <defs>
          <linearGradient id="lev-core" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="oklch(0.9 0.11 85)" />
            <stop offset="100%" stopColor="oklch(0.55 0.09 70)" />
          </linearGradient>
        </defs>
        {/* Stylized lion mane: hexagonal facets */}
        <polygon
          points="50,10 78,26 78,60 50,86 22,60 22,26"
          fill="none"
          stroke="url(#lev-core)"
          strokeWidth="1.5"
          opacity="0.7"
        />
        <polygon
          points="50,20 70,32 70,58 50,74 30,58 30,32"
          fill="oklch(0.2 0.01 260 / 0.6)"
          stroke="url(#lev-core)"
          strokeWidth="1"
        />
        {/* Heart at core (LEV = heart in Hebrew) */}
        <path
          d="M50 62 C42 54, 36 50, 36 44 C36 39, 40 36, 44 36 C47 36, 49 38, 50 40 C51 38, 53 36, 56 36 C60 36, 64 39, 64 44 C64 50, 58 54, 50 62 Z"
          fill="url(#lev-core)"
        />
        {/* Eye/star spark */}
        <circle cx="50" cy="30" r="1.6" fill="oklch(0.95 0.02 90)" />
      </svg>
    </div>
  );
}

export function LevWordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "font-serif text-2xl tracking-[0.35em] text-gold",
        className,
      )}
    >
      LEV
    </span>
  );
}
