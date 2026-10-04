import React from 'react';
import {
  Play,
  Pause,
  SkipForward,
  RotateCcw,
  Zap,
  Gauge,
  BookOpen,
  Sliders,
  FileText,
} from 'lucide-react';
import { MarketMetrics, ModelType, SimulationConfig } from '../types/market';
import { BrandLogo } from './BrandLogo';

interface HeaderProps {
  isRunning: boolean;
  onTogglePlay: () => void;
  onStep: () => void;
  onReset: () => void;
  metrics: MarketMetrics;
  config: SimulationConfig;
  onUpdateConfig: (config: Partial<SimulationConfig>) => void;
  onOpenBenchmark: () => void;
  onOpenArchitecture: () => void;
  onOpenDossier: () => void;
  onOpenAudit: () => void;
  lastLatencyNs: number;
}

export const Header: React.FC<HeaderProps> = ({
  isRunning,
  onTogglePlay,
  onStep,
  onReset,
  metrics,
  config,
  onUpdateConfig,
  onOpenBenchmark,
  onOpenArchitecture,
  onOpenDossier,
  onOpenAudit,
  lastLatencyNs,
}) => {
  return (
    <header className="border-b border-[#1e293b] bg-[#090d16] px-4 py-2 sticky top-0 z-40 select-none">
      <div className="flex flex-wrap items-center justify-between gap-2.5 max-w-[1920px] mx-auto">
        {/* Left: Product Logo & Engine Badges */}
        <div className="flex items-center space-x-3">
          <BrandLogo variant="full" size="md" />
          <div className="h-6 w-px bg-[#1e293b] hidden md:block" />
          <div className="flex flex-col justify-center">
            <div className="flex items-center space-x-1.5">
              <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-[#131b2e] text-slate-300 border border-[#1e293b]">
                C++20
              </span>
              <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-blue-950/80 text-blue-300 border border-blue-800">
                WASM
              </span>
              <span className="hidden sm:inline-block px-1.5 py-0.2 rounded text-[10px] font-sans font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-800">
                Optimal Execution
              </span>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-slate-400 font-sans mt-0.5">
              <span className="flex items-center gap-1">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isRunning ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                  }`}
                />
                <span className="font-mono text-[10px]">{isRunning ? 'LIVE RUNNING' : 'PAUSED'}</span>
              </span>
              <span className="text-slate-600">•</span>
              <span className="font-mono text-slate-400">Tick #{metrics.tickCount}</span>
            </div>
          </div>
        </div>

        {/* Center: Live Terminal Ticker Metrics */}
        <div className="hidden lg:flex items-center space-x-4 text-xs font-mono bg-[#0d1322] px-3 py-1.5 rounded border border-[#1e293b]">
          <div>
            <div className="text-[9px] text-slate-500 uppercase tracking-wider font-sans font-semibold">Mid Price</div>
            <div className="text-xs font-bold text-slate-100">${metrics.midPrice.toFixed(2)}</div>
          </div>
          <div className="h-5 w-px bg-[#1e293b]" />
          <div>
            <div className="text-[9px] text-slate-500 uppercase tracking-wider font-sans font-semibold">Spread</div>
            <div className="text-xs font-bold text-blue-400">${metrics.spread.toFixed(2)}</div>
          </div>
          <div className="h-5 w-px bg-[#1e293b]" />
          <div>
            <div className="text-[9px] text-slate-500 uppercase tracking-wider font-sans font-semibold">Market VWAP</div>
            <div className="text-xs font-bold text-slate-300">${metrics.vwap.toFixed(2)}</div>
          </div>
          <div className="h-5 w-px bg-[#1e293b]" />
          <div>
            <div className="text-[9px] text-slate-500 uppercase tracking-wider font-sans font-semibold">Volatility</div>
            <div className="text-xs font-bold text-indigo-400">{(metrics.realizedVolatility * 100).toFixed(1)}%</div>
          </div>
          <div className="h-5 w-px bg-[#1e293b]" />
          <div title="Forward pass execution time measured live in browser V8 runtime">
            <div className="text-[9px] text-slate-500 uppercase tracking-wider font-sans font-semibold">Browser Pass</div>
            <div className="text-xs font-bold text-emerald-400 flex items-center gap-1">
              <Zap className="w-3 h-3 fill-current text-emerald-400" />
              {lastLatencyNs > 0 ? (lastLatencyNs >= 1000 ? `${(lastLatencyNs / 1000).toFixed(1)} µs` : `${lastLatencyNs} ns`) : '--'}
            </div>
          </div>
        </div>

        {/* Right: Simulation Controls & Modal Triggers */}
        <div className="flex items-center space-x-2">
          {/* Strategy Selector */}
          <div className="relative">
            <select
              value={config.modelType}
              onChange={(e) => onUpdateConfig({ modelType: e.target.value as ModelType })}
              className="bg-[#0d1322] border border-[#1e293b] text-slate-200 text-xs rounded px-2.5 py-1.5 pr-7 font-sans font-semibold focus:outline-none focus:border-blue-500 cursor-pointer appearance-none hover:border-slate-700"
            >
              <option value="ppo_optimal_exec">RL Adaptive Execution (PPO)</option>
              <option value="twap_baseline">TWAP Execution Baseline</option>
              <option value="vwap_baseline">VWAP Dynamic Baseline</option>
              <option value="immediate_taker">Aggressive Market Order</option>
              <option value="scalar_baseline">Scalar C++ Baseline (No SIMD)</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
              <Sliders className="w-3 h-3" />
            </div>
          </div>

          {/* SIMD Acceleration Toggle */}
          <button
            onClick={() => onUpdateConfig({ simdOptimization: !config.simdOptimization })}
            title={config.simdOptimization ? 'SIMD 4-Lane Vectorization' : 'Scalar C++ Baseline'}
            className={`btn-terminal px-2 py-1.5 rounded text-xs font-mono font-semibold flex items-center gap-1 border transition-colors ${
              config.simdOptimization
                ? 'bg-blue-600 text-white border-blue-500 hover:bg-blue-700'
                : 'bg-[#0d1322] text-slate-400 border-[#1e293b] hover:bg-[#131b2e]'
            }`}
          >
            <Zap className="w-3.5 h-3.5 fill-current" />
            <span>{config.simdOptimization ? 'SIMD' : 'SCALAR'}</span>
          </button>

          {/* Speed / Rate Slider */}
          <div className="hidden sm:flex items-center bg-[#0d1322] border border-[#1e293b] rounded px-2 py-1 text-xs font-mono">
            <span className="text-[10px] text-slate-500 font-sans font-semibold mr-1.5">Interval:</span>
            <input
              type="range"
              min="15"
              max="300"
              step="15"
              value={config.tickRateMs}
              onChange={(e) => onUpdateConfig({ tickRateMs: Number(e.target.value) })}
              className="w-14 accent-blue-500 cursor-pointer"
              title={`${config.tickRateMs}ms per tick`}
            />
            <span className="text-[10px] text-slate-300 w-8 text-right font-semibold ml-1">{config.tickRateMs}ms</span>
          </div>

          {/* Play / Step / Reset Cluster */}
          <div className="flex items-center bg-[#0d1322] rounded border border-[#1e293b] p-0.5">
            <button
              onClick={onTogglePlay}
              className={`btn-terminal px-2 py-1 rounded text-xs font-bold transition-colors flex items-center gap-1 ${
                isRunning
                  ? 'bg-amber-950/80 text-amber-300 border border-amber-800 hover:bg-amber-900'
                  : 'bg-emerald-600 text-white border border-emerald-500 hover:bg-emerald-700'
              }`}
              title={isRunning ? 'Pause Simulation' : 'Run Simulation'}
            >
              {isRunning ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              <span className="text-[10px]">{isRunning ? 'Pause' : 'Run'}</span>
            </button>
            <button
              onClick={onStep}
              disabled={isRunning}
              className="p-1 text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Step Single Tick"
            >
              <SkipForward className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onReset}
              className="p-1 text-slate-400 hover:text-slate-200 transition-colors"
              title="Reset Order Book & Simulation"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Benchmark Trigger */}
          <button
            onClick={onOpenBenchmark}
            className="btn-terminal px-2.5 py-1.5 rounded text-xs font-semibold bg-[#0d1322] text-slate-300 border border-[#1e293b] hover:bg-[#131b2e] hover:border-slate-700 transition-colors flex items-center gap-1"
          >
            <Gauge className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline">Benchmark</span>
          </button>

          {/* C++20 Architecture Guide */}
          <button
            onClick={onOpenArchitecture}
            className="btn-terminal px-2.5 py-1.5 rounded text-xs font-semibold bg-[#0d1322] text-slate-300 border border-[#1e293b] hover:bg-[#131b2e] hover:border-slate-700 transition-colors flex items-center gap-1"
          >
            <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden md:inline">C++20 Arch</span>
          </button>

          {/* Anti-AI Design Audit Trigger */}
          <button
            onClick={onOpenAudit}
            className="btn-terminal px-2 py-1.5 rounded text-xs font-semibold bg-emerald-950/70 text-emerald-300 border border-emerald-800 hover:bg-emerald-900 transition-colors flex items-center gap-1"
            title="Inspect 57-Gate Anti-AI Design Audit"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="hidden sm:inline">Anti-AI Audit</span>
          </button>

          {/* Systems Dossier */}
          <button
            onClick={onOpenDossier}
            className="btn-terminal px-2.5 py-1.5 rounded text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <FileText className="w-3.5 h-3.5 text-blue-100" />
            <span>Systems Dossier</span>
          </button>
        </div>
      </div>
    </header>
  );
};
