import React, { useRef, useEffect, useCallback } from 'react';
import { Target, Clock } from 'lucide-react';
import { AgentMetrics } from '../types/market';

interface AgentPerformanceViewProps {
  metrics: AgentMetrics;
  shortfallHistory: number[];
}

export const AgentPerformanceView: React.FC<AgentPerformanceViewProps> = ({
  metrics,
  shortfallHistory,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sizeRef = useRef<{ width: number; height: number }>({ width: 0, height: 0 });

  // Render chart onto the canvas given logical CSS dimensions
  const renderCanvas = useCallback(
    (width: number, height: number) => {
      const canvas = canvasRef.current;
      if (!canvas || width <= 0 || height <= 0) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      const pixelWidth = Math.floor(width * dpr);
      const pixelHeight = Math.floor(height * dpr);

      // Only resize drawing buffer when pixel dimensions actually change
      if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
        canvas.width = pixelWidth;
        canvas.height = pixelHeight;
      }

      ctx.save();
      ctx.scale(dpr, dpr);

      // Terminal obsidian background
      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, width, height);

      const pad = { top: 14, bottom: 18, left: 14, right: 74 };
      const chartW = Math.max(40, width - pad.left - pad.right);
      const chartH = Math.max(25, height - pad.top - pad.bottom);

      // 1. Data Sanitization & Extraction
      const validVals = shortfallHistory.filter((v) => typeof v === 'number' && !isNaN(v));

      // Handle Sparse State (< 2 observations)
      if (validVals.length < 2) {
        const zeroY = Math.round(pad.top + chartH / 2);
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(pad.left, zeroY);
        ctx.lineTo(pad.left + chartW, zeroY);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = '#94a3b8';
        ctx.font = '9px "JetBrains Mono", monospace';
        ctx.textAlign = 'left';
        ctx.fillText('$0.00 (S₀)', pad.left + chartW + 6, zeroY + 3);

        ctx.fillStyle = '#64748b';
        ctx.font = '10px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('Awaiting trade execution (0 fills)...', pad.left + chartW / 2, zeroY - 8);
        ctx.restore();
        return;
      }

      // 2. Dynamic Auto-Ranging: Symmetrical around 0 so $0 S₀ baseline is always centered
      const actualMin = Math.min(0, ...validVals);
      const actualMax = Math.max(0, ...validVals);
      const maxAbs = Math.max(0.20, Math.abs(actualMin), Math.abs(actualMax));
      // Pad by 25% for breathing room
      const yBound = parseFloat((maxAbs * 1.25).toFixed(2));
      const rawMin = -yBound;
      const rawMax = yBound;
      const range = rawMax - rawMin;

      const getX = (i: number) => pad.left + (i / Math.max(1, validVals.length - 1)) * chartW;
      const getY = (val: number) => {
        const clamped = Math.max(rawMin, Math.min(rawMax, val));
        return pad.top + chartH - ((clamped - rawMin) / range) * chartH;
      };

      const zeroY = getY(0); // Perfectly centered at pad.top + chartH / 2

      // 3. Subtle Reference Grid
      ctx.strokeStyle = '#131b2e';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(pad.left, getY(yBound * 0.5));
      ctx.lineTo(pad.left + chartW, getY(yBound * 0.5));
      ctx.moveTo(pad.left, getY(-yBound * 0.5));
      ctx.lineTo(pad.left + chartW, getY(-yBound * 0.5));
      ctx.stroke();

      // 4. Distinct $0.00 S₀ Arrival Price Benchmark Baseline
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 1.2;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(pad.left, zeroY);
      ctx.lineTo(pad.left + chartW, zeroY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Right-Hand Axis Labels
      ctx.fillStyle = '#60a5fa';
      ctx.font = '9px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillText('$0.00 (S₀)', pad.left + chartW + 6, zeroY + 3);

      ctx.fillStyle = '#f43f5e';
      ctx.font = '8px "JetBrains Mono", monospace';
      ctx.fillText(`+$${yBound.toFixed(2)} [Slip]`, pad.left + chartW + 6, pad.top + 7);

      ctx.fillStyle = '#10b981';
      ctx.font = '8px "JetBrains Mono", monospace';
      ctx.fillText(`-$${yBound.toFixed(2)} [Save]`, pad.left + chartW + 6, pad.top + chartH);

      const currentIS = validVals[validVals.length - 1];
      const isOutperforming = currentIS <= 0;

      // 5. Sparse Observation State (2 to 4 observations)
      if (validVals.length <= 4) {
        ctx.strokeStyle = isOutperforming ? '#10b981' : '#f43f5e';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        for (let i = 0; i < validVals.length; i++) {
          const x = getX(i);
          const y = getY(validVals[i]);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();

        for (let i = 0; i < validVals.length; i++) {
          const x = getX(i);
          const y = getY(validVals[i]);
          ctx.fillStyle = validVals[i] <= 0 ? '#10b981' : '#f43f5e';
          ctx.beginPath();
          ctx.arc(x, y, 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#090d16';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }

        ctx.fillStyle = '#64748b';
        ctx.font = '8px "JetBrains Mono", monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`Accumulating trajectory (${validVals.length} observations)...`, pad.left, pad.top - 3);
      } else {
        // 6. Full Time-Series Trajectory (N > 4)
        // A. Subtle Area Fill strictly hugging the curve to the $0 S₀ baseline
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(getX(0), zeroY);
        for (let i = 0; i < validVals.length; i++) {
          ctx.lineTo(getX(i), getY(validVals[i]));
        }
        ctx.lineTo(getX(validVals.length - 1), zeroY);
        ctx.closePath();

        const fillGrad = ctx.createLinearGradient(0, pad.top, 0, pad.top + chartH);
        if (isOutperforming) {
          fillGrad.addColorStop(0, 'rgba(16, 185, 129, 0.01)');
          fillGrad.addColorStop(0.5, 'rgba(16, 185, 129, 0.06)');
          fillGrad.addColorStop(1, 'rgba(16, 185, 129, 0.12)');
        } else {
          fillGrad.addColorStop(0, 'rgba(244, 63, 94, 0.12)');
          fillGrad.addColorStop(0.5, 'rgba(244, 63, 94, 0.06)');
          fillGrad.addColorStop(1, 'rgba(244, 63, 94, 0.01)');
        }
        ctx.fillStyle = fillGrad;
        ctx.fill();
        ctx.restore();

        // B. Main Trajectory Line
        ctx.beginPath();
        ctx.lineWidth = 1.8;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.strokeStyle = isOutperforming ? '#10b981' : '#f43f5e';

        for (let i = 0; i < validVals.length; i++) {
          const x = getX(i);
          const y = getY(validVals[i]);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // C. Endpoint Marker on the latest observation
        const lastIdx = validVals.length - 1;
        const lastX = getX(lastIdx);
        const lastY = getY(validVals[lastIdx]);

        // Glow ring
        ctx.fillStyle = isOutperforming ? 'rgba(16, 185, 129, 0.25)' : 'rgba(244, 63, 94, 0.25)';
        ctx.beginPath();
        ctx.arc(lastX, lastY, 5, 0, Math.PI * 2);
        ctx.fill();

        // Core dot
        ctx.fillStyle = isOutperforming ? '#10b981' : '#f43f5e';
        ctx.beginPath();
        ctx.arc(lastX, lastY, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Top Value Readout Callout
        ctx.fillStyle = '#f1f5f9';
        ctx.font = 'bold 8px "JetBrains Mono", monospace';
        ctx.textAlign = 'right';
        const badgeText = `Current IS: ${currentIS <= 0 ? '-' : '+'}$${Math.abs(currentIS).toFixed(2)}`;
        ctx.fillText(badgeText, pad.left + chartW, pad.top - 3);
      }

      // 7. X-Axis Progress Markings
      ctx.fillStyle = '#64748b';
      ctx.font = '8px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillText('Arrival (t=0)', pad.left, pad.top + chartH + 13);
      ctx.textAlign = 'right';
      ctx.fillText(`Current (t=${validVals.length})`, pad.left + chartW, pad.top + chartH + 13);

      ctx.restore();
    },
    [shortfallHistory]
  );

  // ResizeObserver: attaches strictly to the bounded chart container, not the canvas.
  // This prevents canvas bitmap dimensions from triggering layout recalculations or feedback loops.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          sizeRef.current = { width, height };
          renderCanvas(width, height);
        }
      }
    });

    ro.observe(container);

    // Initial measurement
    const rect = container.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      sizeRef.current = { width: rect.width, height: rect.height };
      renderCanvas(rect.width, rect.height);
    }

    return () => ro.disconnect();
  }, [renderCanvas]);

  // Re-render when shortfallHistory updates
  useEffect(() => {
    if (sizeRef.current.width > 0 && sizeRef.current.height > 0) {
      renderCanvas(sizeRef.current.width, sizeRef.current.height);
    }
  }, [shortfallHistory, renderCanvas]);

  const completionPercent = Math.min(100, Math.max(0, metrics.completionRate));
  const isSavings = metrics.implementationShortfall <= 0;

  return (
    <div className="bg-[#0d1322] border border-[#1e293b] rounded p-2.5 flex flex-col h-full min-h-0 overflow-hidden font-mono text-xs select-none">
      {/* Header */}
      <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-[#1e293b] shrink-0">
        <div className="flex items-center gap-1.5 text-slate-100 font-display font-bold text-xs">
          <Target className="w-3.5 h-3.5 text-blue-400" />
          <span>OPTIMAL EXECUTION MONITOR</span>
        </div>
        <div className="text-[10px] text-slate-400 font-sans flex items-center gap-1.5">
          <Clock className="w-3 h-3 text-slate-400" />
          <span>Target: <strong className="text-white font-mono">{metrics.targetShares} Shares</strong></span>
          <span className="text-slate-600">•</span>
          <span className="text-slate-300 font-mono">Horizon: 120 Ticks</span>
        </div>
      </div>

      {/* 4 Primary Top Metrics (Easily Scannable) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 mb-2 shrink-0">
        {/* Metric 1: Shortfall */}
        <div className="bg-[#090d16] p-2 rounded border border-[#1e293b] flex flex-col justify-between">
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-[9px] text-slate-400 uppercase font-sans font-bold tracking-tight">SHORTFALL (IS)</span>
            <span
              className={`text-[8px] font-bold px-1 rounded uppercase tracking-wider ${
                isSavings ? 'bg-emerald-950 text-emerald-300 border border-emerald-700' : 'bg-rose-950 text-rose-300 border border-rose-700'
              }`}
            >
              {isSavings ? 'SAVINGS' : 'SLIPPAGE'}
            </span>
          </div>
          <div
            className={`text-sm font-bold tabular-nums leading-tight ${
              isSavings ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {isSavings ? '-' : '+'}${Math.abs(metrics.implementationShortfall).toFixed(2)}
          </div>
          <div className="text-[9px] text-slate-400 font-sans">
            {isSavings ? 'Execution Alpha' : 'Execution Cost'}
          </div>
        </div>

        {/* Metric 2: Avg Fill vs S0 */}
        <div className="bg-[#090d16] p-2 rounded border border-[#1e293b] flex flex-col justify-between">
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-[9px] text-slate-400 uppercase font-sans font-bold tracking-tight">AVG FILL (P̄)</span>
            <span className="text-[8px] font-mono text-slate-400">
              S₀: ${metrics.arrivalPrice.toFixed(2)}
            </span>
          </div>
          <div className="text-sm font-bold text-slate-100 tabular-nums leading-tight">
            ${metrics.averageExecutionPrice.toFixed(2)}
          </div>
          <div
            className={`text-[9px] font-mono ${
              isSavings ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {metrics.slippageBps <= 0 ? '' : '+'}
            {metrics.slippageBps.toFixed(1)} bps vs S₀
          </div>
        </div>

        {/* Metric 3: TWAP Advantage */}
        <div className="bg-[#090d16] p-2 rounded border border-[#1e293b] flex flex-col justify-between">
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-[9px] text-slate-400 uppercase font-sans font-bold tracking-tight">VS TWAP</span>
            <span
              className={`text-[8px] font-bold px-1 rounded uppercase tracking-wider ${
                metrics.twapAdvantageBps >= 0
                  ? 'bg-blue-950 text-blue-300 border border-blue-700'
                  : 'bg-slate-800 text-slate-400 border border-slate-600'
              }`}
            >
              {metrics.twapAdvantageBps >= 0 ? 'ADVANTAGE' : 'BEHIND'}
            </span>
          </div>
          <div
            className={`text-sm font-bold tabular-nums leading-tight ${
              metrics.twapAdvantageBps >= 0 ? 'text-blue-400' : 'text-slate-300'
            }`}
          >
            {metrics.twapAdvantageBps >= 0 ? '+' : ''}
            {metrics.twapAdvantageBps.toFixed(1)} bps
          </div>
          <div className="text-[9px] text-slate-400 font-sans">Linear Slicing Benchmark</div>
        </div>

        {/* Metric 4: Filled Quantity */}
        <div className="bg-[#090d16] p-2 rounded border border-[#1e293b] flex flex-col justify-between">
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-[9px] text-slate-400 uppercase font-sans font-bold tracking-tight">FILLED QTY</span>
            <span className="text-[8px] font-mono text-slate-400">
              {metrics.executedShares}/{metrics.targetShares}
            </span>
          </div>
          <div className="text-sm font-bold text-slate-100 tabular-nums leading-tight">
            {completionPercent.toFixed(1)}%
          </div>
          <div className="text-[9px] text-slate-400 font-sans">
            Remaining: {Math.max(0, metrics.targetShares - metrics.executedShares)} shs
          </div>
        </div>
      </div>

      {/* Execution Progress Bar with Milestone Markers */}
      <div className="mb-2 shrink-0">
        <div className="flex justify-between text-[10px] text-slate-400 mb-1 font-sans">
          <span>Parent Order Slicing</span>
          <span className="font-mono text-slate-300">{metrics.executedShares} of {metrics.targetShares} shares filled</span>
        </div>
        <div className="relative w-full bg-[#090d16] rounded-sm h-2.5 overflow-hidden border border-[#1e293b]">
          <div
            className={`h-full transition-all duration-300 ${
              completionPercent >= 100
                ? 'bg-emerald-500'
                : 'bg-gradient-to-r from-blue-600 to-indigo-500'
            }`}
            style={{ width: `${completionPercent}%` }}
          />
          {/* Milestone Ticks at 25%, 50%, 75% */}
          <div className="absolute inset-y-0 left-1/4 w-px bg-slate-700/60" />
          <div className="absolute inset-y-0 left-2/4 w-px bg-slate-700/60" />
          <div className="absolute inset-y-0 left-3/4 w-px bg-slate-700/60" />
        </div>
      </div>

      {/* Shortfall Cost Trajectory Line Canvas - Strictly Bounded */}
      <div className="flex-1 min-h-0 flex flex-col">
        <div className="flex items-center justify-between text-[10px] font-semibold text-slate-400 mb-1 font-sans shrink-0">
          <span>SHORTFALL COST TRAJECTORY (IS vs S₀)</span>
          <span className="text-[9px] font-mono text-slate-500">
            Perold (1988) Formulation
          </span>
        </div>
        <div
          ref={containerRef}
          className="relative w-full flex-1 min-h-[120px] max-h-[190px] overflow-hidden bg-[#090d16] rounded border border-[#1e293b]"
        >
          {/* Absolute positioning ensures canvas never influences container layout dimensions */}
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full block"
          />
        </div>
      </div>
    </div>
  );
};
