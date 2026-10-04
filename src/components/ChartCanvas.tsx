import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Trade } from '../types/market';

interface ChartCanvasProps {
  priceHistory: number[];
  volumeHistory: number[];
  trades: Trade[];
  vwap: number;
  arrivalPrice?: number;
}

export const ChartCanvas: React.FC<ChartCanvasProps> = ({
  priceHistory,
  volumeHistory,
  trades,
  vwap,
  arrivalPrice = 150.0,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({ width: 800, height: 360 });

  // Hover state for interactive inspection
  const [hoverInfo, setHoverInfo] = useState<{
    x: number;
    y: number;
    price: number;
    volume: number;
    tickIndex: number;
    spreadDiff: number;
  } | null>(null);

  // ResizeObserver for rock-solid responsive sizing without canvas flickering
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setDimensions({
            width: Math.floor(width),
            height: Math.floor(height),
          });
        }
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const drawChart = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = Math.max(200, dimensions.width);
    const height = Math.max(180, dimensions.height);

    if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
      canvas.width = width * dpr;
      canvas.height = height * dpr;
    }

    ctx.save();
    ctx.scale(dpr, dpr);

    // Deep dark background
    ctx.fillStyle = '#0d1322';
    ctx.fillRect(0, 0, width, height);

    if (!priceHistory || priceHistory.length < 2) {
      ctx.fillStyle = '#64748b';
      ctx.font = '12px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('Awaiting live market order flow...', width / 2, height / 2);
      ctx.restore();
      return;
    }

    // Chart layout geometry
    const padding = { top: 32, right: 74, bottom: 28, left: 16 };
    const chartW = Math.max(50, width - padding.left - padding.right);
    const chartH = Math.max(60, height - padding.top - padding.bottom);

    // Height partitions: Price chart takes ~76%, Volume takes ~18%, gap is 6px
    const priceH = Math.floor(chartH * 0.76);
    const volumeGap = 6;
    const volumeTop = padding.top + priceH + volumeGap;
    const volumeH = Math.max(22, chartH - priceH - volumeGap);
    const volumeBottom = volumeTop + volumeH;

    // Price scaling with safe margin padding
    const validPrices = priceHistory.filter((p) => typeof p === 'number' && !isNaN(p) && p > 0);
    const minP = validPrices.length > 0 ? Math.min(...validPrices) : 149.0;
    const maxP = validPrices.length > 0 ? Math.max(...validPrices) : 151.0;
    const padP = Math.max(0.06, (maxP - minP) * 0.12);
    const scaleMin = minP - padP;
    const scaleMax = maxP + padP;
    const priceRange = Math.max(0.01, scaleMax - scaleMin);

    const count = priceHistory.length;
    const getX = (i: number) => {
      if (count <= 1) return padding.left;
      return padding.left + (Math.max(0, Math.min(count - 1, i)) / (count - 1)) * chartW;
    };

    const getY = (price: number) => {
      const clamped = Math.max(scaleMin, Math.min(scaleMax, price));
      return padding.top + priceH - ((clamped - scaleMin) / priceRange) * priceH;
    };

    // Horizontal Price Gridlines & Labels
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 4]);

    const numGridLines = 4;
    for (let i = 0; i <= numGridLines; i++) {
      const p = scaleMin + (i / numGridLines) * priceRange;
      const y = getY(p);

      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();

      // High-contrast Price Axis Label
      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`$${p.toFixed(2)}`, width - padding.right + 6, y + 3);
    }
    ctx.setLineDash([]);

    // Vertical Time / Tick Gridlines & X-Axis Labels
    const numTimeLines = Math.min(5, Math.max(2, Math.floor(chartW / 120)));
    for (let k = 0; k <= numTimeLines; k++) {
      const idx = Math.floor((k / numTimeLines) * (count - 1));
      const x = getX(idx);

      ctx.strokeStyle = '#162033';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 4]);
      ctx.beginPath();
      ctx.moveTo(x, padding.top);
      ctx.lineTo(x, volumeBottom);
      ctx.stroke();
      ctx.setLineDash([]);

      // Tick index label at the bottom
      ctx.fillStyle = '#64748b';
      ctx.font = '9px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      const label = k === numTimeLines ? 'Now' : `t=${idx}`;
      ctx.fillText(label, x, volumeBottom + 16);
    }

    // Volume Sub-pane Separator Line
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding.left, volumeTop - 3);
    ctx.lineTo(width - padding.right, volumeTop - 3);
    ctx.stroke();

    // Volume Sub-pane Header Label
    ctx.fillStyle = '#64748b';
    ctx.font = '9px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText('VOL (SHARES)', padding.left, volumeTop + 8);

    // Volume Histogram (strictly clamped within volumeH)
    const validVols = volumeHistory.filter((v) => typeof v === 'number' && !isNaN(v) && v >= 0);
    const maxVol = Math.max(10, ...validVols);
    const barWidth = Math.max(1.8, Math.min(6, (chartW / count) * 0.78));

    for (let i = 0; i < count; i++) {
      const vol = Math.max(0, volumeHistory[i] || 0);
      const ratio = Math.min(1.0, vol / maxVol);
      const barH = Math.max(1, Math.floor(ratio * volumeH));
      const barX = getX(i);
      const barY = volumeBottom - barH;

      const isUp = i > 0 && priceHistory[i] >= priceHistory[i - 1];
      ctx.fillStyle = isUp ? 'rgba(16, 185, 129, 0.50)' : 'rgba(244, 63, 94, 0.50)';
      ctx.fillRect(Math.floor(barX - barWidth / 2), barY, barWidth, barH);
    }

    // Arrival Price Baseline (S₀)
    if (arrivalPrice >= scaleMin && arrivalPrice <= scaleMax) {
      const arrY = getY(arrivalPrice);
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1.2;
      ctx.setLineDash([2, 4]);
      ctx.beginPath();
      ctx.moveTo(padding.left, arrY);
      ctx.lineTo(width - padding.right, arrY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Right-side badge for S₀
      ctx.fillStyle = 'rgba(245, 158, 11, 0.15)';
      ctx.fillRect(width - padding.right + 4, arrY - 7, 64, 14);
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1;
      ctx.strokeRect(width - padding.right + 4, arrY - 7, 64, 14);

      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 9px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`S₀ $${arrivalPrice.toFixed(2)}`, width - padding.right + 7, arrY + 4);
    }

    // Dynamic VWAP Trace
    if (vwap >= scaleMin && vwap <= scaleMax) {
      const vwapY = getY(vwap);
      ctx.strokeStyle = '#818cf8';
      ctx.lineWidth = 1.4;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(padding.left, vwapY);
      ctx.lineTo(width - padding.right, vwapY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Right-side badge for VWAP
      ctx.fillStyle = 'rgba(129, 140, 248, 0.15)';
      ctx.fillRect(width - padding.right + 4, vwapY - 7, 64, 14);
      ctx.strokeStyle = '#818cf8';
      ctx.lineWidth = 1;
      ctx.strokeRect(width - padding.right + 4, vwapY - 7, 64, 14);

      ctx.fillStyle = '#a5b4fc';
      ctx.font = 'bold 9px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`VW $${vwap.toFixed(2)}`, width - padding.right + 7, vwapY + 4);
    }

    // Area Fill Gradient Under Price Curve
    const areaGrad = ctx.createLinearGradient(0, padding.top, 0, padding.top + priceH);
    areaGrad.addColorStop(0, 'rgba(59, 130, 246, 0.22)');
    areaGrad.addColorStop(1, 'rgba(59, 130, 246, 0.01)');

    ctx.beginPath();
    ctx.moveTo(getX(0), getY(priceHistory[0]));
    for (let i = 1; i < count; i++) {
      ctx.lineTo(getX(i), getY(priceHistory[i]));
    }
    ctx.lineTo(getX(count - 1), padding.top + priceH);
    ctx.lineTo(getX(0), padding.top + priceH);
    ctx.closePath();
    ctx.fillStyle = areaGrad;
    ctx.fill();

    // Price Line
    ctx.beginPath();
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2.0;
    for (let i = 0; i < count; i++) {
      const x = getX(i);
      const y = getY(priceHistory[i]);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Current Price End-Cap Badge on Right Axis
    const lastPrice = priceHistory[count - 1];
    const lastX = getX(count - 1);
    const lastY = getY(lastPrice);

    // Pulse point
    ctx.beginPath();
    ctx.arc(lastX, lastY, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = '#60a5fa';
    ctx.fill();
    ctx.strokeStyle = '#1e3a8a';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Last price badge on axis
    ctx.fillStyle = '#2563eb';
    ctx.fillRect(width - padding.right + 4, lastY - 8, 64, 16);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`$${lastPrice.toFixed(2)}`, width - padding.right + 8, lastY + 4);

    // RL Agent Fill Execution Triangles (Aggressive & Passive Buys/Sells)
    const agentTrades = trades.filter((t) => t.buyerId === 'rl_agent_0' || t.sellerId === 'rl_agent_0');
    for (let i = 0; i < Math.min(10, agentTrades.length); i++) {
      const trade = agentTrades[i];
      const tradeY = getY(trade.price);
      const tradeX = Math.max(padding.left + 10, lastX - (i + 1) * (chartW / 18));

      ctx.save();
      ctx.fillStyle = trade.side === 'buy' ? '#10b981' : '#f43f5e';
      ctx.beginPath();
      if (trade.side === 'buy') {
        // Upward triangle for buy execution
        ctx.moveTo(tradeX, tradeY - 4);
        ctx.lineTo(tradeX - 4, tradeY + 5);
        ctx.lineTo(tradeX + 4, tradeY + 5);
      } else {
        // Downward triangle for sell execution
        ctx.moveTo(tradeX, tradeY + 4);
        ctx.lineTo(tradeX - 4, tradeY - 5);
        ctx.lineTo(tradeX + 4, tradeY - 5);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // Interactive Hover Crosshair
    if (hoverInfo) {
      const hX = hoverInfo.x;
      const hY = hoverInfo.y;

      // Vertical line
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(hX, padding.top);
      ctx.lineTo(hX, volumeBottom);
      ctx.stroke();

      // Horizontal line
      ctx.beginPath();
      ctx.moveTo(padding.left, hY);
      ctx.lineTo(width - padding.right, hY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Point circle
      ctx.beginPath();
      ctx.arc(hX, hY, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#38bdf8';
      ctx.fill();
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    ctx.restore();
  }, [priceHistory, volumeHistory, trades, vwap, arrivalPrice, hoverInfo, dimensions]);

  useEffect(() => {
    drawChart();
  }, [drawChart]);

  // Mouse hover event handler for crosshair
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || priceHistory.length < 2) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX - rect.left;

    const padding = { top: 32, right: 74, bottom: 28, left: 16 };
    const chartW = Math.max(50, rect.width - padding.left - padding.right);

    if (clientX < padding.left || clientX > rect.width - padding.right) {
      setHoverInfo(null);
      return;
    }

    const count = priceHistory.length;
    const progress = (clientX - padding.left) / chartW;
    const index = Math.max(0, Math.min(count - 1, Math.round(progress * (count - 1))));

    const p = priceHistory[index];
    const vol = volumeHistory[index] || 0;
    const diff = p - arrivalPrice;

    // Y position calculation
    const validPrices = priceHistory.filter((v) => typeof v === 'number' && !isNaN(v) && v > 0);
    const minP = validPrices.length > 0 ? Math.min(...validPrices) : 149;
    const maxP = validPrices.length > 0 ? Math.max(...validPrices) : 151;
    const padP = Math.max(0.06, (maxP - minP) * 0.12);
    const scaleMin = minP - padP;
    const scaleMax = maxP + padP;
    const priceRange = Math.max(0.01, scaleMax - scaleMin);
    const priceH = Math.floor((rect.height - padding.top - padding.bottom) * 0.76);
    const y = padding.top + priceH - ((Math.max(scaleMin, Math.min(scaleMax, p)) - scaleMin) / priceRange) * priceH;

    setHoverInfo({
      x: clientX,
      y,
      price: p,
      volume: vol,
      tickIndex: index,
      spreadDiff: diff,
    });
  };

  const handleMouseLeave = () => {
    setHoverInfo(null);
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative w-full h-full bg-[#0d1322] border border-[#1e293b] rounded overflow-hidden flex flex-col select-none"
    >
      {/* Top Header Bar with Clean Terminal Legend */}
      <div className="absolute top-2 left-3 right-3 z-10 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center space-x-2">
          <span className="text-slate-100 font-display font-bold text-xs tracking-tight">
            MARKET TICK & EXECUTION FEED
          </span>
          <span className="text-[10px] font-mono text-slate-400 bg-slate-800/80 px-1.5 py-0.2 rounded border border-slate-700">
            L3 Stream
          </span>
          <span className="hidden sm:inline-block text-[10px] font-mono text-blue-400">
            {priceHistory.length} Ticks
          </span>
        </div>

        {/* Legend */}
        <div className="flex items-center space-x-3 text-[10px] font-mono text-slate-400 bg-[#090d16]/90 px-2 py-0.5 rounded border border-[#1e293b]">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-0.5 bg-blue-500 inline-block" />
            <span className="text-slate-300">Price</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-0.5 bg-indigo-400 border-b border-indigo-400 border-dashed inline-block" />
            <span className="text-indigo-300">VWAP</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-0.5 bg-amber-400 border-b border-amber-400 border-dotted inline-block" />
            <span className="text-amber-300">S₀ Target</span>
          </span>
          <span className="hidden md:flex items-center gap-1">
            <span className="text-emerald-400 font-bold">▲</span>
            <span className="text-slate-400">RL Fills</span>
          </span>
        </div>
      </div>

      {/* Interactive Hover Tooltip */}
      {hoverInfo && (
        <div
          className="absolute z-20 pointer-events-none bg-[#090d16] border border-slate-700 rounded px-2.5 py-1.5 text-[11px] font-mono text-slate-200 shadow-lg"
          style={{
            top: Math.max(35, Math.min(hoverInfo.y - 45, dimensions.height - 75)),
            left: Math.max(16, Math.min(hoverInfo.x - 65, dimensions.width - 165)),
          }}
        >
          <div className="flex items-center justify-between gap-3 text-[10px] text-slate-400 border-b border-slate-800 pb-1 mb-1">
            <span>Tick #{hoverInfo.tickIndex}</span>
            <span
              className={
                hoverInfo.spreadDiff <= 0 ? 'text-emerald-400' : 'text-rose-400'
              }
            >
              {hoverInfo.spreadDiff <= 0 ? '' : '+'}
              {hoverInfo.spreadDiff.toFixed(2)} vs S₀
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span>Price: <strong className="text-blue-400">${hoverInfo.price.toFixed(2)}</strong></span>
            <span>Vol: <strong className="text-slate-300">{hoverInfo.volume}</strong></span>
          </div>
        </div>
      )}

      <canvas ref={canvasRef} className="w-full flex-1 block cursor-crosshair" />
    </div>
  );
};
