import React from 'react';
import { X, Code2, Cpu, Zap, Layers, GitBranch } from 'lucide-react';

interface CppArchitectureModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CppArchitectureModal: React.FC<CppArchitectureModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 font-mono select-none">
      <div className="bg-[#0d1322] border border-[#1e293b] rounded w-full max-w-3xl max-h-[90vh] overflow-y-auto flex flex-col shadow-xl text-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between p-3.5 border-b border-[#1e293b] sticky top-0 bg-[#090d16] z-10">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded bg-[#131b2e] border border-[#1e293b] flex items-center justify-center text-blue-400">
              <Code2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs font-bold text-slate-100 font-display tracking-tight">
                C++20 HIGH-PERFORMANCE ENGINE ARCHITECTURE
              </h2>
              <p className="text-[10px] text-slate-400 font-sans">
                Zero-copy, cache-aligned RL inference and deterministic matching engine
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

        {/* Content */}
        <div className="p-4 space-y-4 text-xs text-slate-300">
          {/* Section 1: C++20 Concepts */}
          <div className="bg-[#090d16] p-3 rounded border border-[#1e293b]">
            <h3 className="text-blue-400 font-bold text-xs flex items-center gap-1.5 mb-1.5 font-sans">
              <Cpu className="w-3.5 h-3.5" />
              1. C++20 Concepts & Static Compile-Time Dispatch
            </h3>
            <p className="text-slate-400 leading-relaxed mb-2.5 text-[11px]">
              Virtual method calls introduce a pointer indirection via the vtable, risking branch mispredictions.
              The engine uses modern <strong>C++20 Concepts</strong> to enforce policy interfaces statically at compile time:
            </p>
            <div className="bg-[#05080f] text-slate-200 p-2.5 rounded text-[10px] overflow-x-auto border border-[#1e293b]">
              <pre>{`template <typename T>
concept RLInferencePolicy = requires(T policy, std::span<const float> state) {
    { policy.forward(state) } -> std::same_as<ActionOutput>;
    { policy.entropy() } -> std::floating_point;
    { policy.reset_hidden_state() } -> std::same_as<void>;
};

template <RLInferencePolicy Policy>
class OrderBookEngine {
    Policy policy_;
    alignas(64) std::array<float, 16> state_scratchpad_;
public:
    void on_market_tick(const MarketTick& tick) noexcept {
        extract_features(tick, state_scratchpad_);
        const auto action = policy_.forward(state_scratchpad_);
        route_order(action);
    }
};`}</pre>
            </div>
          </div>

          {/* Section 2: Stack Scratchpads & Memory Layout */}
          <div className="bg-[#090d16] p-3 rounded border border-[#1e293b]">
            <h3 className="text-indigo-400 font-bold text-xs flex items-center gap-1.5 mb-1.5 font-sans">
              <Layers className="w-3.5 h-3.5" />
              2. Zero-Allocation Stack Scratchpad & Contiguous Arrays
            </h3>
            <p className="text-slate-400 leading-relaxed mb-2.5 text-[11px]">
              Heap allocations (<code className="text-blue-300">malloc/new</code>) are strictly prohibited on the hot path. All neural weights and activation buffers reside in contiguous fixed-size arrays:
            </p>
            <div className="bg-[#05080f] text-slate-200 p-2.5 rounded text-[10px] overflow-x-auto border border-[#1e293b]">
              <pre>{`struct alignas(64) InferenceScratchpad {
    std::array<float, 10> input_vector;
    std::array<float, 48> hidden_layer_1;
    std::array<float, 24> hidden_layer_2;
    std::array<float, 7>  output_logits;
    std::array<float, 7>  action_probabilities;
};`}</pre>
            </div>
          </div>

          {/* Section 3: SIMD Vectorization */}
          <div className="bg-[#090d16] p-3 rounded border border-[#1e293b]">
            <h3 className="text-emerald-400 font-bold text-xs flex items-center gap-1.5 mb-1.5 font-sans">
              <Zap className="w-3.5 h-3.5" />
              3. Vectorized AVX-512 FMA & WASM SIMD 128
            </h3>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              Matrix-vector multiplications are unrolled across 4 vector lanes. When compiled for WebAssembly,
              Emscripten emits 128-bit SIMD instructions (<code className="text-blue-300">wasm_f32x4_add</code>, <code className="text-blue-300">wasm_f32x4_mul</code>), achieving sub-microsecond forward passes directly in the browser.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
