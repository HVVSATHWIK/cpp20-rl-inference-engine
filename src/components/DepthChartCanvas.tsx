import React, { useRef, useEffect, useCallback } from 'react';
import { OrderBookSnapshot } from '../types/market';

interface DepthChartCanvasProps {
  snapshot: OrderBookSnapshot;
}

export const DepthChartCanvas: React.FC<DepthChartCanvasProps> = ({ snapshot }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sizeRef = useRef<{ width: number; height: number }>({ width: 0, height: 0 });

  // Render cumulative market depth onto canvas given bounded logical CSS dimensions
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

      // Dark canvas background
      ctx.fillStyle = '#0d1322';
      ctx.fillRect(0, 0, width, height);

      const bids = snapshot.bids || [];
      const asks = snapshot.asks || [];

      if (bids.length === 0 || asks.length === 0) {
        ctx.fillStyle = '#64748b';
        ctx.font = '10px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('Awaiting cumulative depth...', width / 2, height / 2);
        ctx.restore();
        return;
      }

      const maxCumVol = Math.max(
        10,
        bids[bids.length - 1]?.totalVolume || 0,
        asks[asks.length - 1]?.totalVolume || 0
      );

      const padding = { top: 10, bottom: 20, left: 8, right: 8 };
      const chartW = Math.max(40, width - padding.left - padding.right);
      const chartH = Math.max(20, height - padding.top - padding.bottom);
      const midX = padding.left + chartW / 2;

      const getY = (vol: number) => {
        const clamped = Math.max(0, Math.min(maxCumVol, vol));
        return padding.top + chartH - (clamped / maxCumVol) * chartH;
      };

      // Draw BID Depth (Emerald Green)
      ctx.beginPath();
      ctx.moveTo(midX, padding.top + chartH);
      for (let i = 0; i < bids.length; i++) {
        const x = midX - ((i + 1) / bids.length) * (chartW / 2);
        const y = getY(bids[i].totalVolume);
        ctx.lineTo(x, y);
      }
      const lastBidX = padding.left;
      ctx.lineTo(lastBidX, padding.top + chartH);
      ctx.closePath();

      const bidGradient = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartH);
      bidGradient.addColorStop(0, 'rgba(16, 185, 129, 0.35)');
      bidGradient.addColorStop(1, 'rgba(16, 185, 129, 0.02)');
      ctx.fillStyle = bidGradient;
      ctx.fill();

      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Draw ASK Depth (Rose Red)
      ctx.beginPath();
      ctx.moveTo(midX, padding.top + chartH);
      for (let i = 0; i < asks.length; i++) {
        const x = midX + ((i + 1) / asks.length) * (chartW / 2);
        const y = getY(asks[i].totalVolume);
        ctx.lineTo(x, y);
      }
      const lastAskX = width - padding.right;
      ctx.lineTo(lastAskX, padding.top + chartH);
      ctx.closePath();

      const askGradient = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartH);
      askGradient.addColorStop(0, 'rgba(244, 63, 94, 0.35)');
      askGradient.addColorStop(1, 'rgba(244, 63, 94, 0.02)');
      ctx.fillStyle = askGradient;
      ctx.fill();

      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Midline (Mid price separation)
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 3]);
      ctx.beginPath();
      ctx.moveTo(midX, padding.top);
      ctx.lineTo(midX, padding.top + chartH);
      ctx.stroke();
      ctx.setLineDash([]);

      // Bottom Axis Footers
      ctx.font = '9px "JetBrains Mono", monospace';
      ctx.fillStyle = '#94a3b8';
      ctx.textAlign = 'center';
      ctx.fillText(`Mid: $${snapshot.midPrice.toFixed(2)}`, midX, padding.top + chartH + 14);

      ctx.textAlign = 'left';
      ctx.fillStyle = '#10b981';
      ctx.fillText(`Bids (${snapshot.totalBidVolume})`, padding.left + 2, padding.top + chartH + 14);

      ctx.textAlign = 'right';
      ctx.fillStyle = '#f43f5e';
      ctx.fillText(`Asks (${snapshot.totalAskVolume})`, width - padding.right - 2, padding.top + chartH + 14);

      ctx.restore();
    },
    [snapshot]
  );

  // ResizeObserver attaches strictly to containerRef, NOT the canvas element.
  // This breaks any cyclic layout feedback loop.
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

    const rect = container.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      sizeRef.current = { width: rect.width, height: rect.height };
      renderCanvas(rect.width, rect.height);
    }

    return () => ro.disconnect();
  }, [renderCanvas]);

  // Re-render when snapshot updates
  useEffect(() => {
    if (sizeRef.current.width > 0 && sizeRef.current.height > 0) {
      renderCanvas(sizeRef.current.width, sizeRef.current.height);
    }
  }, [snapshot, renderCanvas]);

  return (
    <div className="w-full h-full min-h-0 overflow-hidden bg-[#0d1322] border border-[#1e293b] rounded flex flex-col p-2 select-none">
      <div className="text-[10px] font-sans text-slate-300 font-bold mb-1 flex items-center justify-between shrink-0">
        <span className="font-display">CUMULATIVE MARKET DEPTH</span>
        <span className="text-[9px] font-mono text-slate-500 font-normal">
          Total: {snapshot.totalBidVolume + snapshot.totalAskVolume}
        </span>
      </div>
      {/* Bounded Chart Container: canvas is absolutely positioned so it cannot expand parent height */}
      <div
        ref={containerRef}
        className="relative w-full flex-1 min-h-0 overflow-hidden bg-[#0d1322] rounded"
      >
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full block"
        />
      </div>
    </div>
  );
};
