import React, { useId } from 'react';

export type BrandLogoVariant = 'full' | 'mark' | 'badge';
export type BrandLogoColorScheme = 'color' | 'mono' | 'light' | 'reversed';

interface BrandLogoProps {
  variant?: BrandLogoVariant;
  colorScheme?: BrandLogoColorScheme;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showSubtitle?: boolean;
}

/**
 * Custom Human-Designed Vector Mark for CPP20-RL-EXECUTION.
 *
 * Subject Provenance & Structural Derivation:
 * - Abstracted directly from L2 Price-Time Priority Queues and C++20 intrusive node buffers.
 * - Solid Institutional Cobalt (#3b82f6), chalk white (#f1f5f9), and slate (#1e293b).
 * - Zero generic AI motifs (no circuits, lightbulbs, brains, sparkles, or purple gradients).
 * - Full suite support: Full Color, Flat Monochrome, and Light Mode.
 * - Full SVG Accessibility: <title>, <desc>, role="img", aria-labelledby.
 */
export const BrandLogoMark: React.FC<{
  size?: number;
  colorScheme?: BrandLogoColorScheme;
  className?: string;
}> = ({
  size = 24,
  colorScheme = 'color',
  className = '',
}) => {
  const titleId = useId();
  const descId = useId();

  const isMono = colorScheme === 'mono';
  const isLight = colorScheme === 'light' || colorScheme === 'reversed';

  const frameBg = isLight ? '#f8fafc' : '#090d16';
  const frameBorder = isLight ? '#cbd5e1' : isMono ? '#475569' : '#1e293b';
  const spineColor = isLight ? '#0f172a' : isMono ? '#f8fafc' : '#3b82f6';
  const headColor = isLight ? '#1e293b' : isMono ? '#f8fafc' : '#3b82f6';
  const q1Color = isLight ? '#475569' : isMono ? '#cbd5e1' : '#60a5fa';
  const q2Color = isLight ? '#94a3b8' : isMono ? '#94a3b8' : '#93c5fd';
  const tickColor = isLight ? '#059669' : isMono ? '#e2e8f0' : '#10b981';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
      role="img"
      aria-labelledby={`${titleId} ${descId}`}
    >
      <title id={titleId}>CPP20::RL_EXECUTION Vector Mark</title>
      <desc id={descId}>Deterministic L2 price-time priority queue with discrete tick execution marker</desc>

      {/* Outer Container Border Frame */}
      <rect
        x="1.5"
        y="1.5"
        width="29"
        height="29"
        rx="5"
        fill={frameBg}
        stroke={frameBorder}
        strokeWidth="1.5"
      />

      {/* L2 Price Level Barrier Spine (Vertical Intrusive Queue Backbone) */}
      <rect x="7" y="6" width="3" height="20" rx="1" fill={spineColor} />

      {/* Queue Priority Slot 0 (Queue Head / Active Fill Horizon) with 45° Execution Notch */}
      <path
        d="M10 8.5H22.5L25 11L22.5 13.5H10V8.5Z"
        fill={headColor}
      />

      {/* Queue Priority Slot 1 (Next-in-Priority Depth, Intentionally Asymmetric) */}
      <rect x="10" y="15" width="11" height="3" rx="0.75" fill={q1Color} opacity={isMono ? 0.7 : 0.85} />

      {/* Queue Priority Slot 2 (Passive Resting Queue Level) */}
      <rect x="10" y="20.5" width="6" height="3" rx="0.75" fill={q2Color} opacity={isMono ? 0.45 : 0.55} />

      {/* Discrete Event Tick Marker (Delta-t / Microsecond Dispatch Trigger) */}
      <circle cx="24.5" cy="22" r="1.75" fill={tickColor} />
    </svg>
  );
};

export const BrandLogo: React.FC<BrandLogoProps> = ({
  variant = 'full',
  colorScheme = 'color',
  size = 'md',
  className = '',
  showSubtitle = true,
}) => {
  const iconSizes = {
    sm: 20,
    md: 24,
    lg: 32,
  };

  const markSize = iconSizes[size];

  if (variant === 'mark') {
    return <BrandLogoMark size={markSize} colorScheme={colorScheme} className={className} />;
  }

  const isLight = colorScheme === 'light' || colorScheme === 'reversed';
  const isMono = colorScheme === 'mono';

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      <BrandLogoMark size={markSize} colorScheme={colorScheme} />

      <div className="flex flex-col leading-none">
        {/* Optically balanced bespoke kerning at typeface junction */}
        <div className="flex items-center tracking-[-0.03em]">
          <span
            className={`font-display font-extrabold text-[13px] tracking-tight ${
              isLight ? 'text-slate-900' : 'text-slate-100'
            }`}
          >
            CPP20
          </span>
          <span
            className={`font-mono text-[11px] font-bold mx-[1px] ${
              isLight ? 'text-slate-500' : isMono ? 'text-slate-400' : 'text-blue-400'
            }`}
          >
            ::
          </span>
          <span
            className={`font-display font-extrabold text-[13px] tracking-tight ${
              isLight ? 'text-blue-700' : isMono ? 'text-slate-200' : 'text-blue-400'
            }`}
          >
            RL_EXECUTION
          </span>
        </div>
        {showSubtitle && (
          <span
            className={`text-[9px] font-mono tracking-wider uppercase mt-0.5 ${
              isLight ? 'text-slate-600' : 'text-slate-400'
            }`}
          >
            Deterministic Engine
          </span>
        )}
      </div>
    </div>
  );
};
