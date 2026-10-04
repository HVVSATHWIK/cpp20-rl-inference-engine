import React, { useState } from 'react';
import {
  X,
  Award,
  Code2,
  CheckCircle,
  HelpCircle,
  Compass,
  Zap,
  Target,
  AlertTriangle,
} from 'lucide-react';

interface ResearchDossierModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ResearchDossierModal: React.FC<ResearchDossierModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'corrections' | 'architecture' | 'rl' | 'benchmarks' | 'interview' | 'antiai'>('corrections');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 sm:p-5 font-sans select-none">
      <div className="bg-[#0d1322] border border-[#1e293b] rounded w-full max-w-5xl h-[90vh] flex flex-col shadow-2xl overflow-hidden text-slate-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#1e293b] bg-[#090d16]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-[#131b2e] border border-[#1e293b] text-blue-400 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xs font-bold text-slate-100 font-display tracking-tight">
                  C++20 RL-BASED OPTIMAL EXECUTION ENGINE DOSSIER
                </h2>
                <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-blue-950/80 text-blue-300 border border-blue-800">
                  Systems Research
                </span>
              </div>
              <p className="text-[10px] text-slate-400">
                Independent Systems Engineering Research Inspired by Market Microstructure
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

        {/* Tab Bar */}
        <div className="flex border-b border-[#1e293b] px-5 bg-[#090d16] gap-1 text-xs font-semibold overflow-x-auto">
          <button
            onClick={() => setActiveTab('corrections')}
            className={`py-2 px-2.5 border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap text-xs ${
              activeTab === 'corrections'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            1. Technical Scope
          </button>
          <button
            onClick={() => setActiveTab('architecture')}
            className={`py-2 px-2.5 border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap text-xs ${
              activeTab === 'architecture'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            2. Minimal Architecture
          </button>
          <button
            onClick={() => setActiveTab('rl')}
            className={`py-2 px-2.5 border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap text-xs ${
              activeTab === 'rl'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Target className="w-3.5 h-3.5" />
            3. Optimal Execution
          </button>
          <button
            onClick={() => setActiveTab('benchmarks')}
            className={`py-2 px-2.5 border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap text-xs ${
              activeTab === 'benchmarks'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            4. Benchmark Protocol
          </button>
          <button
            onClick={() => setActiveTab('interview')}
            className={`py-2 px-2.5 border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap text-xs ${
              activeTab === 'interview'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            5. Interview & Roadmap
          </button>
          <button
            onClick={() => setActiveTab('antiai')}
            className={`py-2 px-2.5 border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap text-xs ${
              activeTab === 'antiai'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Compass className="w-3.5 h-3.5 text-emerald-400" />
            6. Anti-AI Design Philosophy
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-5 text-xs text-slate-300 space-y-4">
          {activeTab === 'corrections' && (
            <div className="space-y-3">
              <div className="bg-[#090d16] border border-[#1e293b] rounded p-3">
                <h3 className="font-bold text-amber-300 text-xs mb-1 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  Engineering Audit: 5 Critical Technical Adjustments
                </h3>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  To build a defensible systems project that senior engineers respect, we eliminate speculative claims, over-engineering, and ambiguous problem definitions.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="bg-[#090d16] border border-[#1e293b] rounded p-3 space-y-1.5">
                  <div className="font-bold text-blue-400">1. Sub-200ns Target is Premature</div>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    Specifying sub-200ns and AVX-512 before benchmarking is an aspiration, not an engineering result. We establish a clean <strong>scalar C++ baseline first</strong>, profile it on actual hardware, and adopt SIMD vectorization only if comparative measurements demonstrate a justified speedup.
                  </p>
                </div>

                <div className="bg-[#090d16] border border-[#1e293b] rounded p-3 space-y-1.5">
                  <div className="font-bold text-blue-400">2. Avoid First-Version Over-Engineering</div>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    Packaging an L3 order book, custom memory pools, lock-free queues, AVX-512, and PPO simultaneously creates immense debugging friction. We start with a <strong>deterministic, single-threaded event loop</strong> and standard containers. Concurrency is added only if an empirically measured bottleneck requires it.
                  </p>
                </div>

                <div className="bg-[#090d16] border border-[#1e293b] rounded p-3 space-y-1.5">
                  <div className="font-bold text-blue-400">3. Focus on Optimal Order Execution</div>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    Market making and order execution are distinct problems. We choose <strong>RL-based Optimal Order Execution</strong>: liquidating or acquiring a fixed parent order (e.g. 100 shares over 120 ticks) while minimizing <strong>Implementation Shortfall</strong> against arrival price S₀, compared directly with TWAP and VWAP baselines.
                  </p>
                </div>

                <div className="bg-[#090d16] border border-[#1e293b] rounded p-3 space-y-1.5">
                  <div className="font-bold text-blue-400">4. Nuanced Architecture Claims</div>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    A 64-byte aligned structure is not automatically faster, and lock-free queues are often slower than simple queues without high thread contention. We build a simple, correct baseline first, then demonstrate any custom optimization with controlled A/B benchmarks.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'architecture' && (
            <div className="space-y-3">
              <h3 className="font-bold text-slate-100 text-xs">The Core Engine: Built for Correctness First</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs">
                <div className="border border-[#1e293b] rounded p-3 bg-[#090d16]">
                  <div className="font-bold mb-1 text-blue-400">Phase 1: Deterministic Core</div>
                  <ul className="space-y-1 text-slate-400 text-[11px]">
                    <li>• Single-threaded discrete event loop</li>
                    <li>• Simple price-time priority order book</li>
                    <li>• Exact tick replay without race conditions</li>
                    <li>• Thorough unit testing with GoogleTest</li>
                  </ul>
                </div>

                <div className="border border-[#1e293b] rounded p-3 bg-[#090d16]">
                  <div className="font-bold mb-1 text-indigo-400">Phase 2: Scalar C++ Inference</div>
                  <ul className="space-y-1 text-slate-400 text-[11px]">
                    <li>• Compact MLP policy (&lt;2,000 parameters)</li>
                    <li>• Direct array buffers (no dynamic heap alloc)</li>
                    <li>• Plain scalar matrix-vector multiplication</li>
                    <li>• Numerical parity check vs PyTorch (&lt;1e-5)</li>
                  </ul>
                </div>

                <div className="border border-[#1e293b] rounded p-3 bg-[#090d16]">
                  <div className="font-bold mb-1 text-emerald-400">Phase 3: Validated Extensions</div>
                  <ul className="space-y-1 text-slate-400 text-[11px]">
                    <li>• Unrolled SIMD loop vectorization</li>
                    <li>• Static memory pool for order nodes</li>
                    <li>• SPSC queue between feed and engine</li>
                    <li>• Controlled comparative profiling</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'rl' && (
            <div className="space-y-3">
              <h3 className="font-bold text-slate-100 text-xs">Problem Formulation: Optimal Order Execution</h3>
              <div className="bg-[#090d16] border border-[#1e293b] rounded p-3 space-y-2 text-xs">
                <div className="font-bold text-slate-200">1. Implementation Shortfall (IS):</div>
                <div className="font-mono bg-[#05080f] p-2 rounded border border-[#1e293b] text-blue-300 text-[11px]">
                  {'IS = \\sum_{k=1}^N P_k \\cdot q_k - Q \\cdot S_0'}
                </div>
                <p className="text-slate-400 text-[11px]">
                  Where S₀ is the arrival price when the parent order is received, P_k is the fill price of slice k, and q_k is the quantity filled.
                </p>

                <div className="font-bold text-slate-200 pt-1">2. Benchmark Execution Baselines:</div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-1 text-[11px]">
                  <div className="bg-[#05080f] p-2 rounded border border-[#1e293b]">
                    <strong className="text-blue-400 block mb-0.5">TWAP Baseline:</strong>
                    Slices parent order evenly across T periods: q_t = Q / T.
                  </div>
                  <div className="bg-[#05080f] p-2 rounded border border-[#1e293b]">
                    <strong className="text-indigo-400 block mb-0.5">VWAP Baseline:</strong>
                    Slices order proportionally to incoming market volume flow.
                  </div>
                  <div className="bg-[#05080f] p-2 rounded border border-[#1e293b]">
                    <strong className="text-rose-400 block mb-0.5">Aggressive Taker:</strong>
                    Crosses spread with immediate market orders (highest impact).
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'benchmarks' && (
            <div className="space-y-3">
              <h3 className="font-bold text-slate-100 text-xs">Refined Benchmarking & Profiling Protocol</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="bg-[#090d16] p-3 rounded border border-[#1e293b] space-y-1 text-[11px] text-slate-400">
                  <div className="font-bold text-blue-400 mb-1 font-sans text-xs">Native Linux Environment:</div>
                  <div>• Hardware specs: CPU model, L1/L2/L3 cache sizes</div>
                  <div>• Compiler & flags: GCC 13+ / Clang 17+ with -O3 -march=native -DNDEBUG</div>
                  <div>• Thermal state: Fixed performance governor (cpupower)</div>
                  <div>• Warm-up: 1,000 passes to prime instruction cache</div>
                  <div>• Statistics: Report p50, p90, p95, p99 across 10 trials</div>
                </div>

                <div className="bg-[#090d16] p-3 rounded border border-[#1e293b] space-y-1 text-[11px] text-slate-400">
                  <div className="font-bold text-emerald-400 mb-1 font-sans text-xs">Browser WebAssembly Environment:</div>
                  <div>• Runs inside JavaScript V8 / SpiderMonkey JIT environments</div>
                  <div>• Subject to browser event loop scheduling jitter and GC pauses</div>
                  <div>• Demonstrates relative WASM SIMD gains vs scalar baseline</div>
                  <div>• Strict nanosecond claims always refer to native Linux binaries</div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'interview' && (
            <div className="space-y-3">
              <h3 className="font-bold text-slate-100 text-xs">Revised 12-Week Roadmap & Interview Strategy</h3>
              <div className="border border-[#1e293b] rounded overflow-hidden text-[11px]">
                <table className="w-full text-left">
                  <thead className="bg-[#090d16] text-slate-400 font-bold uppercase text-[9px]">
                    <tr>
                      <th className="p-2">Phase</th>
                      <th className="p-2">Priority</th>
                      <th className="p-2">Core Deliverable</th>
                      <th className="p-2">Optional Extension</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1e293b]">
                    <tr>
                      <td className="p-2 font-bold text-slate-200">Weeks 1–2</td>
                      <td className="p-2 text-blue-400 font-semibold">Essential</td>
                      <td className="p-2">C++20 foundations, order book, unit tests</td>
                      <td className="p-2 text-slate-500">Custom node pool</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-bold text-slate-200">Weeks 3–4</td>
                      <td className="p-2 text-blue-400 font-semibold">Essential</td>
                      <td className="p-2">Deterministic simulator, TWAP/VWAP baselines, RL env</td>
                      <td className="p-2 text-slate-500">Complex Poisson queues</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-bold text-slate-200">Weeks 5–6</td>
                      <td className="p-2 text-blue-400 font-semibold">Essential</td>
                      <td className="p-2">Train small policy (PPO/DQN), scalar C++ inference</td>
                      <td className="p-2 text-slate-500">Multi-agent dynamics</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-bold text-slate-200">Weeks 7–8</td>
                      <td className="p-2 text-blue-400 font-semibold">Essential</td>
                      <td className="p-2">Numerical parity check, Google Benchmark (p50/p99)</td>
                      <td className="p-2 text-slate-500">AVX-512 FMA unrolling</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-bold text-slate-200">Weeks 9–10</td>
                      <td className="p-2 text-indigo-400 font-semibold">Important</td>
                      <td className="p-2">WebAssembly compilation and React dashboard</td>
                      <td className="p-2 text-slate-500">WASM SIMD 128 comparison</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-bold text-slate-200">Weeks 11–12</td>
                      <td className="p-2 text-slate-400 font-semibold">Finalization</td>
                      <td className="p-2">Experiments, profiling report, documentation, demo</td>
                      <td className="p-2 text-slate-500">Lock-free SPSC queue</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'antiai' && (
            <div className="space-y-3">
              <div className="bg-[#090d16] border border-[#1e293b] rounded p-3">
                <h3 className="font-bold text-emerald-400 text-xs mb-1 flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  Anti-AI Design & Human Systems Craft
                </h3>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Websites produced by automated generators suffer from a distinct statistical fingerprint: centered heroes, three identical cards, purple gradients, Inter/Roboto fonts, uniform 16px border radiuses, and copy full of generic buzzwords like &quot;elevate your workflow&quot;. This project deliberately breaks every AI default to build an authentic, operator-grade systems tool.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="bg-[#090d16] border border-[#1e293b] rounded p-2.5 space-y-1">
                  <div className="font-bold text-blue-400">1. Typographic Contrast (No Inter Fallback)</div>
                  <p className="text-slate-400 text-[11px]">
                    We paired <strong>Space Grotesk</strong> for bold display headings, <strong>Source Sans 3</strong> for clean body readability, and <strong>JetBrains Mono</strong> for tabular financial ticks and latency metrics. Correct display letter-spacing (-0.03em) creates deliberate optical personality.
                  </p>
                </div>

                <div className="bg-[#090d16] border border-[#1e293b] rounded p-2.5 space-y-1">
                  <div className="font-bold text-blue-400">2. Color Restraint (No Purple/Indigo Gradients)</div>
                  <p className="text-slate-400 text-[11px]">
                    Instead of generic Tailwind indigo/purple gradients or acid-green halos, we committed to a single dominant primary: <strong>Institutional Cobalt (#1d4ed8)</strong>, chalk white (#ffffff), and slate neutrals (#f6f8fb, #0f172a), mirroring real trading workstations.
                  </p>
                </div>

                <div className="bg-[#090d16] border border-[#1e293b] rounded p-2.5 space-y-1">
                  <div className="font-bold text-blue-400">3. Operator Density Over Card Bloat</div>
                  <p className="text-slate-400 text-[11px]">
                    We eliminated the &quot;cards inside cards inside cards&quot; pattern and uniform rounded-2xl bubbles. We use structural hairlines (1px slate borders), left-aligned data tables, dense order books, and tactile physical button states.
                  </p>
                </div>

                <div className="bg-[#090d16] border border-[#1e293b] rounded p-2.5 space-y-1">
                  <div className="font-bold text-blue-400">4. Authentic Technical Copy</div>
                  <p className="text-slate-400 text-[11px]">
                    Zero corporate filler or vague &quot;AI-powered&quot; hype. Every metric connects to concrete financial microstructure: <em>Implementation Shortfall ($)</em>, <em>Slippage in basis points</em>, <em>Arrival Price S₀</em>, <em>Poisson arrival rate</em>, and <em>Google Benchmark p50/p99 tail latency</em>.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
