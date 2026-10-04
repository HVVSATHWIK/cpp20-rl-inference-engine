import React from 'react';
import { Cpu, CheckCircle2 } from 'lucide-react';
import { PolicyInferenceResult } from '../types/market';
import { NeuralPolicyEngine } from '../engine/neuralPolicy';

interface InferenceInspectorProps {
  inference: PolicyInferenceResult | null;
  simdEnabled: boolean;
}

export const InferenceInspector: React.FC<InferenceInspectorProps> = ({
  inference,
  simdEnabled,
}) => {
  if (!inference) {
    return (
      <div className="bg-[#0d1322] border border-[#1e293b] rounded p-4 flex items-center justify-center text-slate-500 font-mono text-xs h-full">
        Initializing neural policy scratchpad...
      </div>
    );
  }

  return (
    <div className="bg-[#0d1322] border border-[#1e293b] rounded p-2.5 flex flex-col h-full font-mono text-xs select-none">
      {/* Header Bar */}
      <div className="flex items-center justify-between pb-1.5 border-b border-[#1e293b] mb-2">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded bg-[#131b2e] text-blue-400 border border-[#1e293b]">
            <Cpu className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="font-display font-bold text-slate-100 text-xs tracking-tight">
              POLICY FORWARD-PASS PIPELINE
            </div>
            <div className="text-[10px] text-slate-400 font-sans flex items-center gap-1.5">
              <span>Zero-Allocation Scratchpad</span>
              <span className="text-slate-600">•</span>
              <span title="Measured live in Browser V8 JavaScript engine">
                Browser Latency: <strong className="font-mono text-emerald-400 font-bold">{inference.latencyNs >= 1000 ? `${(inference.latencyNs / 1000).toFixed(1)} µs` : `${inference.latencyNs} ns`}</strong>
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <span
            className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-semibold border ${
              simdEnabled
                ? 'bg-blue-950 text-blue-300 border-blue-700'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
          >
            {simdEnabled ? 'WASM SIMD 128' : 'Scalar Baseline'}
          </span>
          <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-semibold bg-[#131b2e] text-slate-300 border border-[#1e293b]">
            H(π): {inference.entropy.toFixed(2)} nats
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 flex-1 overflow-hidden">
        {/* 1. Input Observation State Vector */}
        <div className="bg-[#090d16] rounded p-2 border border-[#1e293b] flex flex-col overflow-hidden">
          <div className="text-[10px] font-bold text-slate-200 font-sans pb-1 mb-1 border-b border-[#1e293b] flex items-center justify-between">
            <span className="text-slate-100">Observation Vector (Dim=10)</span>
            <span className="text-[9px] text-blue-400 font-mono font-semibold">std::span</span>
          </div>
          <div className="space-y-1 overflow-y-auto flex-1 pr-1">
            {inference.inputFeatures.map((feat) => {
              const clampedNorm = Math.max(-1, Math.min(1, feat.normalized));
              const isPositive = clampedNorm >= 0;
              const barPercent = Math.abs(clampedNorm) * 50;

              return (
                <div key={feat.name} className="text-[10px]">
                  <div className="flex justify-between items-center text-slate-400 mb-0.5 font-sans">
                    <span className="truncate text-slate-300 font-medium text-[10px]">{feat.name}</span>
                    <span className="text-slate-100 font-bold font-mono ml-1 tabular-nums text-[11px]">
                      {feat.value.toFixed(2)}
                    </span>
                  </div>
                  {/* Divergence Bar */}
                  <div className="relative h-1.5 bg-slate-900 rounded overflow-hidden flex border border-slate-800/80">
                    <div className="w-1/2 flex justify-end">
                      {!isPositive && (
                        <div
                          className="h-full bg-rose-500 rounded-l"
                          style={{ width: `${barPercent * 2}%` }}
                        />
                      )}
                    </div>
                    <div className="w-px bg-slate-500 h-full" />
                    <div className="w-1/2 flex justify-start">
                      {isPositive && (
                        <div
                          className="h-full bg-blue-500 rounded-r"
                          style={{ width: `${barPercent * 2}%` }}
                        />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 2. Hidden Tensor Activations */}
        <div className="bg-[#090d16] rounded p-2 border border-[#1e293b] flex flex-col overflow-hidden">
          <div className="text-[10px] font-bold text-slate-200 font-sans pb-1 mb-1 border-b border-[#1e293b] flex items-center justify-between">
            <span className="text-slate-100">Hidden Tensor Activations</span>
            <span className="text-[9px] text-slate-400 font-mono font-semibold">GELU MLP</span>
          </div>

          <div className="space-y-2 overflow-y-auto flex-1 pr-1">
            {inference.layerActivations.slice(1).map((layer) => (
              <div key={layer.layerName} className="space-y-1">
                <div className="flex justify-between items-center text-[10px] text-slate-400 font-sans">
                  <span className="font-semibold text-slate-200">{layer.layerName}</span>
                  <span className="font-mono text-slate-400 tabular-nums text-[10px]">μ={layer.mean.toFixed(2)}</span>
                </div>
                {/* 16-element activation micro-grid */}
                <div className="grid grid-cols-8 gap-0.5 p-1 bg-[#0d1322] rounded border border-[#1e293b]">
                  {layer.values.map((v, i) => {
                    const normVal = Math.min(1, Math.max(0, (v + 1) / 2));
                    const bg =
                      normVal > 0.65
                        ? 'bg-blue-600 text-white font-bold'
                        : normVal > 0.4
                        ? 'bg-blue-900/80 text-blue-200 font-semibold'
                        : 'bg-slate-800 text-slate-500';
                    return (
                      <div
                        key={i}
                        className={`h-3.5 rounded flex items-center justify-center text-[8px] ${bg}`}
                        title={`Neuron ${i}: ${v.toFixed(3)}`}
                      >
                        {v > 0 ? '+' : '-'}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 3. Action Probability Distribution π(a|s) */}
        <div className="bg-[#090d16] rounded p-2 border border-[#1e293b] flex flex-col overflow-hidden">
          <div className="text-[10px] font-bold text-slate-200 font-sans pb-1 mb-1 border-b border-[#1e293b] flex items-center justify-between">
            <span className="text-slate-100">Action Distribution π(a|s)</span>
            <span className="text-[9px] text-blue-400 font-bold font-sans uppercase tracking-wider">Policy Output</span>
          </div>

          <div className="space-y-1 overflow-y-auto flex-1 pr-1">
            {inference.probabilities.map((prob, i) => {
              const isSelected = i === inference.actionIndex;
              const percent = (prob * 100).toFixed(1);
              const qVal = inference.qValues ? inference.qValues[i]?.toFixed(1) : null;

              return (
                <div
                  key={i}
                  className={`p-1.5 rounded transition-colors ${
                    isSelected
                      ? 'bg-blue-950/90 border-l-2 border-l-blue-400 border border-blue-600/80 shadow-xs'
                      : 'bg-[#0d1322] border border-[#1e293b]/80 text-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="truncate flex items-center gap-1.5 font-sans font-medium">
                      {isSelected ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 inline shrink-0" />
                          <strong className="text-white font-bold">{NeuralPolicyEngine.ACTION_NAMES[i]}</strong>
                          <span className="text-[8px] uppercase bg-blue-500 text-white px-1 rounded font-bold ml-1">
                            ARGMAX
                          </span>
                        </>
                      ) : (
                        <span className="text-slate-300">{NeuralPolicyEngine.ACTION_NAMES[i]}</span>
                      )}
                    </span>
                    <span
                      className={`font-mono text-[11px] tabular-nums ${
                        isSelected ? 'font-bold text-blue-300' : 'text-slate-300'
                      }`}
                    >
                      {percent}% {qVal && <span className="text-slate-500 font-normal text-[9px]">({qVal})</span>}
                    </span>
                  </div>
                  <div className="h-1.5 bg-slate-800 rounded overflow-hidden">
                    <div
                      className={`h-full rounded ${isSelected ? 'bg-blue-400 font-bold' : 'bg-slate-600'}`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
