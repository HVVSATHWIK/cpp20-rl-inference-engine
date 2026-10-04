import React from 'react';
import { ListFilter } from 'lucide-react';
import { Trade } from '../types/market';

interface TradeLogViewProps {
  trades: Trade[];
}

export const TradeLogView: React.FC<TradeLogViewProps> = ({ trades }) => {
  return (
    <div className="bg-[#0d1322] border border-[#1e293b] rounded p-2.5 flex flex-col h-full min-h-0 overflow-hidden font-mono text-xs select-none">
      {/* Header */}
      <div className="flex items-center justify-between pb-1.5 mb-1 border-b border-[#1e293b] shrink-0">
        <div className="flex items-center gap-1.5 text-slate-100 font-display font-bold text-xs">
          <ListFilter className="w-3.5 h-3.5 text-blue-400" />
          <span>EXECUTION BLOTTER & TAPE</span>
        </div>
        <div className="text-[10px] text-slate-400 font-sans font-medium flex items-center gap-1">
          <span>Filled:</span>
          <span className="font-mono text-white font-bold tabular-nums text-[11px]">{trades.length}</span>
        </div>
      </div>

      {/* 5-Column Table Header */}
      <div className="grid grid-cols-12 text-[9px] text-slate-400 pb-1 px-1.5 border-b border-[#1e293b] uppercase font-sans font-bold tracking-tight shrink-0">
        <div className="col-span-2 text-left">Time</div>
        <div className="col-span-2 text-center">Side</div>
        <div className="col-span-3 text-right">Price ($)</div>
        <div className="col-span-2 text-right">Qty</div>
        <div className="col-span-3 text-right">Participant</div>
      </div>

      {/* Scrollable Trades List with Perfect Column Alignment - Strictly Bounded */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-0.5 py-0.5 pr-1">
        {trades.length === 0 ? (
          <div className="text-slate-500 text-center py-10 text-[11px] font-sans">
            Awaiting order fills from simulation engine...
          </div>
        ) : (
          trades.slice(0, 50).map((t) => {
            const isAgent = t.buyerId === 'rl_agent_0' || t.sellerId === 'rl_agent_0';
            const isBuy = t.side === 'buy';

            return (
              <div
                key={t.id}
                className={`grid grid-cols-12 px-1.5 py-0.5 rounded text-[11px] items-center border border-transparent transition-colors ${
                  isAgent
                    ? 'bg-blue-950/70 border-blue-700/80 text-blue-100'
                    : 'hover:bg-slate-800/40 text-slate-300'
                }`}
              >
                {/* Time */}
                <div className="col-span-2 text-slate-400 text-[10px] tabular-nums">
                  {new Date(t.timestamp / 1000).toLocaleTimeString([], {
                    minute: '2-digit',
                    second: '2-digit',
                  })}
                </div>

                {/* Side (Visually Distinguishable at a Glance) */}
                <div className="col-span-2 flex justify-center">
                  <span
                    className={`px-1.5 py-0.2 rounded text-[9px] font-bold tracking-wide ${
                      isBuy
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/50'
                    }`}
                  >
                    {isBuy ? 'BUY' : 'SELL'}
                  </span>
                </div>

                {/* Price */}
                <div
                  className={`col-span-3 text-right font-bold tabular-nums ${
                    isBuy ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  ${t.price.toFixed(2)}
                </div>

                {/* Quantity */}
                <div className="col-span-2 text-right text-white font-medium tabular-nums">
                  {t.quantity}
                </div>

                {/* Counterparty */}
                <div className="col-span-3 text-right truncate">
                  {isAgent ? (
                    <span className="text-blue-300 font-bold bg-blue-900/80 px-1.5 py-0.2 rounded text-[8px] border border-blue-600">
                      RL AGENT
                    </span>
                  ) : (
                    <span className="text-slate-400 text-[10px]">
                      {t.buyerId === 'market_maker' ? 'MM' : 'TAKER'}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
