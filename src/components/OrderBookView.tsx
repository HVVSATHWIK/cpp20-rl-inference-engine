import React from 'react';
import { Layers, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { OrderBookSnapshot } from '../types/market';

interface OrderBookViewProps {
  snapshot: OrderBookSnapshot;
  agentRestingBuyPrice?: number | null;
  agentRestingSellPrice?: number | null;
}

export const OrderBookView: React.FC<OrderBookViewProps> = ({
  snapshot,
  agentRestingBuyPrice,
  agentRestingSellPrice,
}) => {
  const asks = snapshot.asks || [];
  const bids = snapshot.bids || [];

  const maxAskVol = Math.max(...asks.map((a) => a.totalVolume), 1);
  const maxBidVol = Math.max(...bids.map((b) => b.totalVolume), 1);
  const maxTotalVol = Math.max(maxAskVol, maxBidVol, 10);

  const reversedAsks = [...asks].reverse();

  return (
    <div className="bg-[#0d1322] border border-[#1e293b] rounded p-2.5 flex flex-col h-full font-mono text-xs select-none">
      {/* Header */}
      <div className="flex items-center justify-between pb-1.5 mb-1 border-b border-[#1e293b]">
        <div className="flex items-center gap-1.5 text-slate-100 font-display font-bold text-xs">
          <Layers className="w-3.5 h-3.5 text-blue-400" />
          <span>L2 LIMIT ORDER BOOK</span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-sans">
          <span>OFI:</span>
          <span
            className={`font-mono font-bold tabular-nums flex items-center text-[11px] ${
              snapshot.orderImbalance >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {snapshot.orderImbalance >= 0 ? (
              <ArrowUpRight className="w-3.5 h-3.5 inline text-emerald-400" />
            ) : (
              <ArrowDownRight className="w-3.5 h-3.5 inline text-rose-400" />
            )}
            {Math.abs(snapshot.orderImbalance * 100).toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Table Headers */}
      <div className="grid grid-cols-4 text-[9px] text-slate-400 pb-1 px-1.5 border-b border-[#1e293b] font-sans uppercase font-bold tracking-tight">
        <div className="text-left">Price ($)</div>
        <div className="text-right">Size</div>
        <div className="text-right">Total</div>
        <div className="text-right">Orders</div>
      </div>

      {/* ASKS (Sell Orders) */}
      <div className="flex-1 overflow-y-auto flex flex-col justify-end space-y-0.5 py-0.5 pr-0.5">
        {reversedAsks.map((ask, idx) => {
          const depthPercent = Math.min(85, Math.max(3, (ask.totalVolume / maxTotalVol) * 85));
          const isAgentPrice =
            agentRestingSellPrice && Math.abs(agentRestingSellPrice - ask.price) < 0.001;
          const isBestAsk = idx === reversedAsks.length - 1;

          return (
            <div
              key={`ask_${ask.price}`}
              className={`relative grid grid-cols-4 px-1.5 py-0.5 rounded text-[11px] items-center ${
                isBestAsk
                  ? 'bg-rose-950/70 border-l-2 border-rose-400 font-bold'
                  : isAgentPrice
                  ? 'ring-1 ring-amber-400 bg-amber-950/40'
                  : 'hover:bg-slate-800/40'
              }`}
            >
              {/* Depth bar behind numbers */}
              <div
                className="absolute inset-y-0 right-0 bg-rose-500/15 pointer-events-none rounded-r"
                style={{ width: `${depthPercent}%` }}
              />
              <div className="relative text-left font-bold tabular-nums flex items-center gap-1">
                {isAgentPrice && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" title="Active RL Limit Order" />
                )}
                <span className={isBestAsk ? 'text-rose-300 font-bold text-xs' : 'text-rose-400'}>
                  {ask.price.toFixed(2)}
                </span>
                {isBestAsk && (
                  <span className="text-[8px] uppercase bg-rose-500/30 text-rose-200 px-1 py-0.2 rounded font-bold border border-rose-500/40">
                    ASK
                  </span>
                )}
              </div>
              <div className={`relative text-right font-medium tabular-nums ${isBestAsk ? 'text-white font-bold' : 'text-slate-100'}`}>
                {ask.quantity}
              </div>
              <div className="relative text-right text-slate-300 text-[10px] tabular-nums">{ask.totalVolume}</div>
              <div className="relative text-right text-slate-400 text-[10px] tabular-nums">{ask.orderCount}</div>
            </div>
          );
        })}
      </div>

      {/* SPREAD & MICROPRICE DIVIDER BAR (BBO Anchor) */}
      <div className="my-1 py-1.5 px-2.5 bg-[#141d30] rounded border border-slate-700 flex items-center justify-between text-[11px] shadow-xs">
        <div className="flex items-center gap-1.5">
          <span className="text-slate-300 font-sans font-bold text-[10px]">SPREAD:</span>
          <span className="text-white font-bold tabular-nums text-xs">${snapshot.spread.toFixed(2)}</span>
          <span className="text-blue-300 font-mono text-[9px] font-semibold">
            ({Math.round(snapshot.spread / 0.05)} ticks)
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-slate-300 font-sans font-bold text-[10px]">MICRO:</span>
          <span className="text-indigo-200 font-bold tabular-nums text-xs">${snapshot.microPrice.toFixed(2)}</span>
        </div>
      </div>

      {/* BIDS (Buy Orders) */}
      <div className="flex-1 overflow-y-auto space-y-0.5 py-0.5 pr-0.5">
        {bids.map((bid, idx) => {
          const depthPercent = Math.min(85, Math.max(3, (bid.totalVolume / maxTotalVol) * 85));
          const isAgentPrice =
            agentRestingBuyPrice && Math.abs(agentRestingBuyPrice - bid.price) < 0.001;
          const isBestBid = idx === 0;

          return (
            <div
              key={`bid_${bid.price}`}
              className={`relative grid grid-cols-4 px-1.5 py-0.5 rounded text-[11px] items-center ${
                isBestBid
                  ? 'bg-emerald-950/70 border-l-2 border-emerald-400 font-bold'
                  : isAgentPrice
                  ? 'ring-1 ring-amber-400 bg-amber-950/40'
                  : 'hover:bg-slate-800/40'
              }`}
            >
              {/* Depth bar behind numbers */}
              <div
                className="absolute inset-y-0 right-0 bg-emerald-500/15 pointer-events-none rounded-r"
                style={{ width: `${depthPercent}%` }}
              />
              <div className="relative text-left font-bold tabular-nums flex items-center gap-1">
                {isAgentPrice && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" title="Active RL Limit Order" />
                )}
                <span className={isBestBid ? 'text-emerald-300 font-bold text-xs' : 'text-emerald-400'}>
                  {bid.price.toFixed(2)}
                </span>
                {isBestBid && (
                  <span className="text-[8px] uppercase bg-emerald-500/30 text-emerald-200 px-1 py-0.2 rounded font-bold border border-emerald-500/40">
                    BID
                  </span>
                )}
              </div>
              <div className={`relative text-right font-medium tabular-nums ${isBestBid ? 'text-white font-bold' : 'text-slate-100'}`}>
                {bid.quantity}
              </div>
              <div className="relative text-right text-slate-300 text-[10px] tabular-nums">{bid.totalVolume}</div>
              <div className="relative text-right text-slate-400 text-[10px] tabular-nums">{bid.orderCount}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
