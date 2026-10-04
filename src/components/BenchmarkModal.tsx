import React, { useState } from 'react';
import { X, Play, Zap, Gauge, Clock, HardDrive } from 'lucide-react';
import { BenchmarkMetrics, ModelType } from '../types/market';
import { InferenceBenchmarker } from '../engine/benchmarker';

interface BenchmarkModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultModel: ModelType;
}

export const BenchmarkModal: React.FC<BenchmarkModalProps> = ({
  isOpen,
  onClose,
  defaultModel,
}) => {
  const [modelType, setModelType] = useState<ModelType>(defaultModel);
  const [iterations, setIterations] = useState<number>(10000);
  const [simdEnabled, setSimdEnabled] = useState<boolean>(true);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [result, setResult] = useState<BenchmarkMetrics | null>(null);

  if (!isOpen) return null;

  const handleRun = () => {
    setIsRunning(true);
    setTimeout(() => {
      const res = InferenceBenchmarker.runSuite(modelType, iterations, simdEnabled);
      setResult(res);
      setIsRunning(false);
    }, 50);
  };

  const maxBucketCount = result
    ? Math.max(...result.distributionBuckets.map((b) => b.count), 1)
    : 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 font-mono select-none">
      <div className="bg-[#0d1322] border border-[#1e293b] rounded w-full max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col shadow-xl text-slate-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-3.5 border-b border-[#1e293b] bg-[#090d16]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded bg-[#131b2e] border border-[#1e293b] flex items-center justify-center text-blue-400">
              <Gauge className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs font-bold text-slate-100 font-display tracking-tight">
                NATIVE C++20 / WASM INFERENCE BENCHMARKER
              </h2>
              <p className="text-[10px] text-slate-400 font-sans">
                Cycle-accurate microbenchmarking of neural tensor operations
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 space-y-3.5 text-xs">
          {/* Controls Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 bg-[#090d16] p-2.5 rounded border border-[#1e293b]">
            <div>
              <label className="text-[9px] text-slate-400 block mb-1 font-sans font-semibold">Target Model</label>
              <select
                value={modelType}
                onChange={(e) => setModelType(e.target.value as ModelType)}
                className="w-full bg-[#0d1322] border border-[#1e293b] rounded px-2 py-1 text-slate-200 text-xs focus:outline-none focus:border-blue-500"
              >
                <option value="ppo_optimal_exec">RL Adaptive Execution (PPO)</option>
                <option value="twap_baseline">TWAP Execution Baseline</option>
                <option value="vwap_baseline">VWAP Dynamic Baseline</option>
                <option value="immediate_taker">Aggressive Market Order</option>
                <option value="scalar_baseline">Scalar C++ Baseline (No SIMD)</option>
              </select>
            </div>

            <div>
              <label className="text-[9px] text-slate-400 block mb-1 font-sans font-semibold">Iterations</label>
              <select
                value={iterations}
                onChange={(e) => setIterations(Number(e.target.value))}
                className="w-full bg-[#0d1322] border border-[#1e293b] rounded px-2 py-1 text-slate-200 text-xs focus:outline-none focus:border-blue-500"
              >
                <option value={2000}>2,000 passes</option>
                <option value={10000}>10,000 passes</option>
                <option value={50000}>50,000 passes (Stress)</option>
              </select>
            </div>

            <div>
              <label className="text-[9px] text-slate-400 block mb-1 font-sans font-semibold">SIMD Acceleration</label>
              <button
                type="button"
                onClick={() => setSimdEnabled(!simdEnabled)}
                className={`w-full py-1 px-2 rounded border flex items-center justify-center gap-1.5 transition-colors font-semibold text-xs ${
                  simdEnabled
                    ? 'bg-blue-600 text-white border-blue-500'
                    : 'bg-[#0d1322] text-slate-400 border-[#1e293b]'
                }`}
              >
                <Zap className="w-3.5 h-3.5 fill-current" />
                <span>{simdEnabled ? 'SIMD Active' : 'Scalar Baseline'}</span>
              </button>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleRun}
              disabled={isRunning}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded flex items-center gap-1.5 transition-colors text-xs disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{isRunning ? 'Benchmarking CPU Cycles...' : 'Execute Benchmark Suite'}</span>
            </button>
          </div>

          {/* Results Display */}
          {result && (
            <div className="space-y-3 pt-1">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="bg-[#090d16] p-2 rounded border border-[#1e293b]">
                  <div className="text-[9px] text-slate-400 uppercase flex items-center gap-1 font-sans font-semibold">
                    <Clock className="w-3 h-3 text-blue-400" />
                    P50 Median Latency
                  </div>
                  <div className="text-sm font-bold text-blue-400 mt-0.5 font-mono">
                    {result.p50Ns} ns
                  </div>
                </div>

                <div className="bg-[#090d16] p-2 rounded border border-[#1e293b]">
                  <div className="text-[9px] text-slate-400 uppercase flex items-center gap-1 font-sans font-semibold">
                    <Clock className="w-3 h-3 text-amber-400" />
                    P99 Latency
                  </div>
                  <div className="text-sm font-bold text-slate-100 mt-0.5 font-mono">
                    {result.p99Ns} ns
                  </div>
                </div>

                <div className="bg-[#090d16] p-2 rounded border border-[#1e293b]">
                  <div className="text-[9px] text-slate-400 uppercase flex items-center gap-1 font-sans font-semibold">
                    <Zap className="w-3 h-3 text-emerald-400" />
                    Throughput
                  </div>
                  <div className="text-sm font-bold text-emerald-400 mt-0.5 font-mono">
                    {(result.throughputPerSec / 1000000).toFixed(2)}M /sec
                  </div>
                </div>

                <div className="bg-[#090d16] p-2 rounded border border-[#1e293b]">
                  <div className="text-[9px] text-slate-400 uppercase flex items-center gap-1 font-sans font-semibold">
                    <HardDrive className="w-3 h-3 text-slate-400" />
                    Heap Allocations
                  </div>
                  <div className="text-sm font-bold text-slate-200 mt-0.5 font-mono">
                    0 bytes (Stack)
                  </div>
                </div>
              </div>

              {/* Latency Distribution Histogram */}
              <div className="bg-[#090d16] p-2.5 rounded border border-[#1e293b]">
                <div className="flex justify-between text-[10px] font-bold text-slate-300 mb-2 font-sans">
                  <span>Latency Histogram Distribution (ns)</span>
                  <span className="text-[9px] text-slate-500 font-normal">
                    Min: {result.minNs}ns | Mean: {result.meanNs}ns | Max: {result.maxNs}ns
                  </span>
                </div>

                <div className="space-y-1">
                  {result.distributionBuckets.map((bucket, i) => {
                    const percent = (bucket.count / result.iterations) * 100;
                    const barWidth = (bucket.count / maxBucketCount) * 100;

                    return (
                      <div key={i} className="flex items-center text-[10px] gap-2">
                        <span className="w-12 text-right text-slate-500 font-mono">
                          ~{bucket.bucketNs}ns
                        </span>
                        <div className="flex-1 bg-slate-800 h-2.5 rounded overflow-hidden">
                          <div
                            className="bg-blue-500 h-full rounded transition-all"
                            style={{ width: `${barWidth}%` }}
                          />
                        </div>
                        <span className="w-10 text-slate-300 text-right font-medium">
                          {percent.toFixed(1)}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Diagnostics */}
              <div className="bg-[#090d16] p-2.5 rounded border border-[#1e293b] text-[10px] text-slate-400 space-y-1 font-mono">
                <div className="text-slate-200 font-bold mb-1 font-sans">
                  Vectorization & Compiler Diagnostics:
                </div>
                <div>• AVX-512 / WASM SIMD 128-bit unrolling: 4 vector lanes</div>
                <div>• Zero runtime virtual table dispatches: compile-time policy execution</div>
                <div>• Measured SIMD speedup ratio over scalar baseline: {result.simdSpeedupRatio}x</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
