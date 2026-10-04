# CPP20-RL-EXECUTION: Low-Latency Algorithmic Execution Terminal

![C++20](https://img.shields.io/badge/C%2B%2B-20-00599C?logo=c%2B%2B&logoColor=white)
![WebAssembly](https://img.shields.io/badge/WebAssembly-Terminal-654FF0?logo=webassembly&logoColor=white)
![Native p50](https://img.shields.io/badge/Native%20p50-3.28%C2%B5s-3b82f6)
![Instrumented Allocation](https://img.shields.io/badge/Hot%20Path-Instrumented%20new%2Fdelete-10b981)
![Implementation Shortfall](https://img.shields.io/badge/Execution-Implementation%20Shortfall-f59e0b)
![License MIT](https://img.shields.io/badge/License-MIT-slate.svg)

> A native C++20 optimal-execution engine prototype with a fixed-capacity L2 matching engine, deterministic market simulation, RL policy inference, implementation-shortfall analytics, reproducible native benchmarking, and an interactive WebAssembly quantitative terminal.

---

## Live System Architecture & Animation Loop

```text
┌───────────────────────────────────────────────────────────────────────────────┐
│                  DETERMINISTIC SIMULATION & INFERENCE PIPELINE                │
└───────────────────────────────────────────────────────────────────────────────┘

 [1. Event Tick]       [2. Feature State]      [3. RL Policy]       [4. Execution]
 ─────────────────     ──────────────────      ───────────────       ─────────────
 Market simulation     std::span state         GELU MLP              FIFO Queue
 L2 updates            10D observation        Softmax               Market Fill
 Poisson arrivals      OFI / spread           7 actions             Shortfall
        │                      │                    │                    │
        ▼                      ▼                    ▼                    ▼
 ┌──────────────┐      ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
 │   L2 BOOK    │ ───► │ OBSERVATION  │ ─►  │ NEURAL POLICY│ ─►  │   EXECUTION  │
 │   SNAPSHOT   │      │   VECTOR     │     │   FORWARD    │     │    ENGINE    │
 └──────────────┘      └──────────────┘     └──────────────┘     └──────────────┘
        │                      │                    │                    │
        ▼                      ▼                    ▼                    ▼
 Best Bid / Ask          OFI / Micro-Skew     Dense 48x10          Action Selection
 Spread / Micro-price    Return / Volatility  Dense 24x48          Parent Order
 Queue State             Remaining Shares     Softmax 7             IS / bps
```

The browser terminal visualizes the state transitions above. UI animation is presentation-only and is intentionally separated from the native benchmark path.

---

# Live Terminal Animation System

The interface uses subtle, event-driven motion rather than continuous decorative animation.

Animation is triggered by:

- market ticks
- order-book updates
- price changes
- execution fills
- selected RL actions
- simulation state changes

The animation layer does **not** participate in native C++ benchmark timing.

## Animation design goals

- Maintain a professional quantitative-terminal appearance.
- Provide immediate visual feedback for live updates.
- Avoid excessive motion and visual noise.
- Never make animation imply a performance guarantee.
- Respect `prefers-reduced-motion`.
- Keep rendering work isolated from the measured native engine.

### `src/hooks/useTerminalMotion.ts`

```tsx
import { useEffect, useState } from "react";

export function useTerminalMotion(signal: string | number) {
  const [active, setActive] = useState(false);

  useEffect(() => {
    let frame1 = 0;
    let frame2 = 0;

    frame1 = requestAnimationFrame(() => {
      setActive(true);

      frame2 = requestAnimationFrame(() => {
        setActive(false);
      });
    });

    return () => {
      cancelAnimationFrame(frame1);
      cancelAnimationFrame(frame2);
    };
  }, [signal]);

  return active;
}
```

### `src/styles/terminalMotion.css`

```css
@keyframes terminal-update {
  0% {
    opacity: 0.92;
    transform: translateY(0);
    background-color: transparent;
  }

  35% {
    opacity: 1;
    transform: translateY(-1px);
    background-color: rgb(37 99 235 / 0.14);
  }

  100% {
    opacity: 1;
    transform: translateY(0);
    background-color: transparent;
  }
}

@keyframes terminal-buy-flash {
  0% {
    background-color: transparent;
  }

  30% {
    background-color: rgb(16 185 129 / 0.18);
  }

  100% {
    background-color: transparent;
  }
}

@keyframes terminal-sell-flash {
  0% {
    background-color: transparent;
  }

  30% {
    background-color: rgb(244 63 94 / 0.18);
  }

  100% {
    background-color: transparent;
  }
}

@keyframes terminal-argmax {
  0% {
    box-shadow: 0 0 0 0 rgb(59 130 246 / 0);
  }

  40% {
    box-shadow: 0 0 0 2px rgb(59 130 246 / 0.22);
  }

  100% {
    box-shadow: 0 0 0 0 rgb(59 130 246 / 0);
  }
}

@keyframes terminal-live-dot {
  0%,
  100% {
    opacity: 0.65;
    transform: scale(0.92);
  }

  50% {
    opacity: 1;
    transform: scale(1);
  }
}

.terminal-update {
  animation: terminal-update 220ms ease-out;
}

.terminal-buy-flash {
  animation: terminal-buy-flash 240ms ease-out;
}

.terminal-sell-flash {
  animation: terminal-sell-flash 240ms ease-out;
}

.terminal-argmax {
  animation: terminal-argmax 400ms ease-out;
}

.terminal-live-dot {
  animation: terminal-live-dot 1.4s ease-in-out infinite;
}

@media (prefers-reduced-motion: reduce) {
  .terminal-update,
  .terminal-buy-flash,
  .terminal-sell-flash,
  .terminal-argmax,
  .terminal-live-dot {
    animation: none !important;
    transition: none !important;
  }
}
```

### Example: animated live metric

```tsx
import { useTerminalMotion } from "../hooks/useTerminalMotion";

interface LiveMetricProps {
  value: string;
  signal: string | number;
}

export function LiveMetric({ value, signal }: LiveMetricProps) {
  const active = useTerminalMotion(signal);

  return (
    <span
      className={[
        "tabular-nums transition-colors",
        active ? "terminal-update" : ""
      ].join(" ")}
    >
      {value}
    </span>
  );
}
```

### Example: order-book update animation

```tsx
interface OrderBookRowProps {
  price: number;
  size: number;
  side: "bid" | "ask";
  updateId: number;
}

export function OrderBookRow({
  price,
  size,
  side,
  updateId
}: OrderBookRowProps) {
  const active = useTerminalMotion(updateId);

  const flash =
    active
      ? side === "bid"
        ? "terminal-buy-flash"
        : "terminal-sell-flash"
      : "";

  return (
    <div
      className={[
        "grid grid-cols-4 items-center",
        "tabular-nums transition-colors",
        flash
      ].join(" ")}
    >
      <span>{price.toFixed(2)}</span>
      <span>{size.toLocaleString()}</span>
      <span>{side === "bid" ? "BID" : "ASK"}</span>
      <span>{updateId}</span>
    </div>
  );
}
```

### Example: selected RL action

```tsx
interface ActionCardProps {
  selected: boolean;
  label: string;
  probability: number;
  actionVersion: number;
}

export function ActionCard({
  selected,
  label,
  probability,
  actionVersion
}: ActionCardProps) {
  const active = useTerminalMotion(actionVersion);

  const className = [
    "rounded-sm border px-2 py-1",
    "transition-colors",
    selected
      ? "border-blue-500/80 bg-blue-950/80 text-blue-100"
      : "border-slate-800 bg-slate-950 text-slate-300",
    selected && active ? "terminal-argmax" : ""
  ].join(" ");

  return (
    <div className={className}>
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium">
          {label}
        </span>

        {selected && (
          <span className="rounded border border-blue-500/60 px-1 text-[9px] text-blue-300">
            ARGMAX
          </span>
        )}
      </div>

      <div className="mt-1 h-1 overflow-hidden rounded bg-slate-800">
        <div
          className="h-full bg-blue-500 transition-[width] duration-200"
          style={{
            width: `${Math.max(0, Math.min(100, probability * 100))}%`
          }}
        />
      </div>
    </div>
  );
}
```

### Example: live simulation indicator

```tsx
export function LiveIndicator({
  running
}: {
  running: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5 text-[10px] font-semibold tracking-wide">
      <span
        className={[
          "h-1.5 w-1.5 rounded-full",
          running
            ? "bg-emerald-400 terminal-live-dot"
            : "bg-slate-500"
        ].join(" ")}
      />

      <span className={running ? "text-emerald-300" : "text-slate-400"}>
        {running ? "LIVE RUNNING" : "PAUSED"}
      </span>
    </div>
  );
}
```

### Animation architecture

```text
Simulation Tick
      │
      ▼
React State Update
      │
      ├── Market chart update
      ├── Order-book update
      ├── RL action update
      ├── Execution update
      └── Tape update
              │
              ▼
       Motion Signal
              │
              ▼
     requestAnimationFrame
              │
              ▼
       CSS transition /
       CSS keyframe pulse
```

Animations are presentation-only. They are never included in the measured native C++ execution path.

---

# Native C++20 Systems Core

## 1. C++20 Concepts & Static Polymorphism

The execution-policy abstraction uses a compile-time constrained interface rather than a virtual base class.

```cpp
template <typename T>
concept ExecutionPolicy =
    requires(T policy, std::span<const float> state) {
        { policy.forward(state) } -> std::same_as<ActionType>;
        { policy.entropy() } -> std::floating_point;
        { policy.reset() } -> std::same_as<void>;
    };
```

The concrete execution engine is validated at compile time:

```cpp
static_assert(
    hft::core::ExecutionPolicy<NeuralExecutionEngine>,
    "NeuralExecutionEngine must satisfy ExecutionPolicy"
);
```

This provides static polymorphism for the execution-policy abstraction without requiring a virtual interface.

---

# 2. Fixed-Capacity L2 Matching Engine

The native order book uses:

- fixed-capacity storage
- intrusive doubly-linked order nodes
- FIFO price-time priority
- sorted bid/ask price levels
- level compaction
- explicit cache-line-aware layout
- runtime invariant verification

Representative structure:

```cpp
struct alignas(64) PriceLevel {
    double price{0.0};
    uint32_t total_volume{0};
    uint32_t order_count{0};

    OrderNode* head{nullptr};
    OrderNode* tail{nullptr};

    uint8_t padding[32]{};

    static_assert(sizeof(PriceLevel) == 64);

    void push_back(OrderNode* node) noexcept {
        node->next = nullptr;
        node->prev = tail;

        if (tail) {
            tail->next = node;
        } else {
            head = node;
        }

        tail = node;
        total_volume += node->quantity;
        order_count++;
    }
};
```

The project uses cache-line-aware layout rather than claiming that alignment alone universally eliminates false sharing.

---

# 3. Instrumented Hot-Path Memory Tracking

The benchmark instruments:

```text
operator new
operator new[]
operator delete
operator delete[]
```

The current benchmark result:

```text
operator new:       0 calls
operator new[]:     0 calls
operator delete:    0 calls
operator delete[]:  0 calls
Bytes Allocated:    0 bytes
```

Interpretation:

> No instrumented global new/delete activity was observed during the measured hot path.

This is an instrumentation result, not a universal claim that every possible allocator in every runtime is absent.

---

# 4. Native Neural Execution Policy

The policy implements a compact MLP:

```text
Input
  10 features
      │
      ▼
Dense Layer 1
  48 hidden
      │
      ▼
GELU
      │
      ▼
Dense Layer 2
  24 hidden
      │
      ▼
GELU
      │
      ▼
Output Layer
  7 actions
      │
      ▼
Numerically Stable Softmax
      │
      ▼
Action Distribution
```

The dense loops use manual four-lane unrolling to expose instruction-level parallelism.

This is not described as guaranteed hardware SIMD.

The GELU implementation uses a polynomial approximation with input bounds:

```cpp
inline float fast_gelu(float x) noexcept {
    if (x <= GELU_MIN) {
        return 0.0f;
    }

    if (x >= GELU_MAX) {
        return x;
    }

    constexpr float k = 0.7978845608f;

    const float cubic = x * x * x;
    const float inner = k * (x + 0.044715f * cubic);

    return 0.5f * x * (1.0f + std::tanh(inner));
}
```

Softmax subtracts the maximum logit before exponentiation for numerical stability:

```cpp
float max_logit = logits[0];

for (float value : logits) {
    max_logit = std::max(max_logit, value);
}

float sum = 0.0f;

for (size_t i = 0; i < logits.size(); ++i) {
    probabilities[i] = std::exp(logits[i] - max_logit);
    sum += probabilities[i];
}

for (float& probability : probabilities) {
    probability /= sum;
}
```

---

# 5. Deterministic Market Microstructure Simulator

## Price Dynamics

The simulator uses seeded Merton Jump-Diffusion dynamics.

The important property for testing is deterministic replay under identical:

- initial configuration
- random seed
- simulation state
- event sequence

## Order Arrivals

L2 liquidity replenishment and simulated market activity use Poisson event generation.

## Order Flow Imbalance

```text
OFI = (Q_bid - Q_ask) / (Q_bid + Q_ask)
```

with:

```text
OFI ∈ [-1, +1]
```

## Micro-Price

```text
P_micro =
(P_bid * Q_ask + P_ask * Q_bid)
--------------------------------
        Q_bid + Q_ask
```

The order-book state, spread, micro-price, volume and OFI are derived from the same market snapshot.

---

# 6. Optimal Execution & Implementation Shortfall

The system evaluates a parent order over a finite execution horizon.

The implementation shortfall formulation is:

```text
IS = Σ(P_k * q_k) - Q_target * S_0
```

For the configured buy-side convention:

```text
IS <= 0  → Execution Savings
IS >  0  → Slippage Cost
```

The terminal presents both:

- dollar shortfall
- shortfall in basis points
- average fill price
- arrival price
- completion percentage
- TWAP comparison
- shortfall trajectory

TWAP advantage:

```text
TWAP Advantage =
(P_TWAP - P_avg)
-----------------
     P_TWAP
     × 10,000 bps
```

---

# 7. Empirical Native C++20 Benchmark

The official portable Release benchmark was executed on:

```text
CPU:
Server-class Intel Xeon host

Architecture:
x86_64

Environment:
Linux 4.19 gVisor container

Compiler:
GCC 12.3.0

Language:
C++20

Build:
-O3 -std=c++20

Timing:
std::chrono::steady_clock

Warm-up:
1,000 unmeasured passes

Measured:
100,000 iterations per run

Runs:
3
```

## Official Portable `-O3` Results

| Metric | Run 1 | Run 2 | Run 3 | Representative |
|---|---:|---:|---:|---:|
| p50 | 3,281 ns | 3,280 ns | 3,280 ns | **3,280 ns** |
| p90 | 3,289 ns | 3,550 ns | 3,287 ns | **3,289 ns** |
| p99 | 4,656 ns | 6,634 ns | 6,951 ns | **6,634 ns** |
| p99.9 | 9,140 ns | 11,208 ns | 13,045 ns | **11,208 ns** |
| Mean | 3,338.4 ns | 3,392.3 ns | 3,442.6 ns | **3,392.3 ns** |
| Minimum | 3,262 ns | 3,260 ns | 3,263 ns | **3,262 ns** |
| Maximum | 124,025 ns | 138,597 ns | 299,701 ns | **138,597 ns** |
| Throughput | 295,106/s | 290,396/s | 286,018/s | **290,396/s** |

### Representative native result

```text
p50:       3,280 ns
p90:       3,289 ns
p99:       6,634 ns
p99.9:    11,208 ns
Mean:      3,392.3 ns
Throughput:
           290,396 inferences/sec
```

These values were measured on the specified host and are not universal performance guarantees.

---

# 8. Host-Optimized Native Benchmark

An optional host-specific build is available:

```bash
cmake -S cpp \
  -B cpp/build_native \
  -DCMAKE_BUILD_TYPE=Release \
  -DENABLE_NATIVE_OPT=ON

cmake --build cpp/build_native --parallel
```

Configuration:

```text
-std=c++20
-O3
-march=native
```

Measured result:

```text
p50:
3,136 ns

Throughput:
307,423 inferences/sec
```

This is a host-specific optimization result and should not be treated as portable across CPU architectures.

---

# 9. Native vs Browser Runtime

| Dimension | Native C++20 | Browser / WebAssembly |
|---|---|---|
| Runtime | Standalone native executable | Browser V8 / WebAssembly |
| Timing | `steady_clock` | `performance.now()` |
| Main Role | Systems core / benchmark | Interactive terminal |
| Representative Metric | 3,280 ns p50 | 3.6 µs browser pass |
| Allocation Context | Instrumented native hot path | Managed browser runtime |
| Environment | Host CPU | Browser sandbox |

The values are intentionally reported separately because the two environments have different runtimes and timing mechanisms.

---

# 10. Correctness Verification

The native test suite contains:

```text
88 assertions
0 failures
```

Verified areas include:

```text
✓ Order insertion
✓ Sorted price-level accounting
✓ FIFO queue priority
✓ Partial execution
✓ Order cancellation
✓ Level compaction
✓ Micro-price
✓ Order Flow Imbalance
✓ C++20 ExecutionPolicy concept
✓ GELU numerical behavior
✓ Softmax normalization
✓ Deterministic simulation
✓ Implementation Shortfall
```

---

# 11. Sanitizer Verification

The native implementation has also been verified with:

```text
AddressSanitizer
UndefinedBehaviorSanitizer
```

Result:

```text
0 errors
0 leaks
0 boundary violations
0 reported undefined behavior
```

Sanitized builds are used for correctness validation and are not used as the official performance benchmark.

---

# 12. Terminal UI Overview

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ CPP20::RL_EXECUTION   [C++20] [WASM] [Optimal Execution]   Browser Pass ... │
├───────────────────────────────────────────────────────────┬──────────────────┤
│                                                           │                  │
│ MARKET TICK & EXECUTION FEED                              │ L2 ORDER BOOK    │
│ • Live price curve                                        │ • BBO            │
│ • VWAP                                                     │ • Queue depth    │
│ • Arrival target                                           │ • OFI / Spread   │
│ • Volume                                                   │ • Micro-price    │
│                                                           │                  │
├───────────────────────────────────────────────────────────┼──────────────────┤
│                                                           │                  │
│ POLICY FORWARD-PASS PIPELINE                              │ CUMULATIVE       │
│ • Observation Vector                                      │ MARKET DEPTH     │
│ • GELU activations                                         │ • Bid curve      │
│ • Action distribution                                      │ • Ask curve      │
│ • Selected ARGMAX                                          │ • Midpoint       │
│ • Browser pass                                             │                  │
│                                                           │                  │
├───────────────────────────────────────────────────────────┼──────────────────┤
│                                                           │                  │
│ OPTIMAL EXECUTION MONITOR                                 │ EXECUTION TAPE   │
│ • Implementation Shortfall                                 │ • BUY / SELL     │
│ • Average Fill                                             │ • Price / Qty    │
│ • Completion                                               │ • Participant    │
│ • TWAP comparison                                          │ • RL fills       │
│ • Shortfall trajectory                                     │ • Scroll buffer  │
│                                                           │                  │
└───────────────────────────────────────────────────────────┴──────────────────┘
```

---

# 13. Live Terminal Interaction Model

```text
Simulation Tick
      │
      ▼
Market State Update
      │
      ├──────────────► Price Chart
      │
      ├──────────────► L2 Order Book
      │
      ├──────────────► OFI / Micro-Price
      │
      ▼
Observation Vector
      │
      ▼
RL Policy Forward Pass
      │
      ▼
Action Distribution
      │
      ▼
Execution Decision
      │
      ├──────────────► Execution Tape
      │
      ├──────────────► Parent Order Progress
      │
      └──────────────► Implementation Shortfall
                              │
                              ▼
                         UI Animation
```

---

# 14. Animation Principles

The animation system is intentionally restrained.

### Market Updates

Price changes may trigger:

```text
subtle line interpolation
small value flash
micro tooltip update
volume-bar transition
```

### Order Book Updates

Bids and asks use short-lived row highlights:

```text
BUY:
emerald flash

SELL:
rose flash
```

### RL Policy

The selected action receives:

```text
ARGMAX indicator
blue highlight
short pulse
probability bar transition
```

### Execution

New fills may trigger:

```text
BUY:
emerald row flash

SELL:
rose row flash

RL Agent:
blue institutional highlight
```

### System State

The live indicator uses a subtle pulsing dot:

```text
● LIVE RUNNING
```

Pause removes the animation.

Reduced-motion users receive no animation.

---

# 15. Animation Performance Rules

The animation layer must obey the following:

1. Never block simulation state updates.
2. Never participate in native benchmark timing.
3. Never alter market-data calculations.
4. Never create artificial execution latency.
5. Prefer CSS transitions/keyframes for simple presentation effects.
6. Use `requestAnimationFrame` only for presentation state synchronization.
7. Respect `prefers-reduced-motion`.
8. Keep animation durations short and deterministic.
9. Avoid continuous high-cost canvas effects.
10. Do not use animation to hide stale or missing data.

---

# 16. Brand Identity & Provenance

The brand mark is derived from actual project primitives rather than generic AI symbolism.

```text
       L2 Price-Level Spine
               │
               ▼
        ┌──┬────────────────────┐
        │  │ █ Head of Queue    │◄── Execution Notch
        │  ├────────────────────┘
        │  │ ███ Next Priority
        │  ├───────────────┐
        │  │ ██ Passive    │
        │  └───────────────┘
        │
        │                 ●  Discrete Tick Event
        └───────────────────────
```

Design elements:

- **Vertical Spine:** cache-line-aware price-level structure.
- **Asymmetric Queue Slots:** FIFO priority and heterogeneous displayed liquidity.
- **Execution Notch:** spread-crossing execution event.
- **Tick Marker:** discrete event dispatch.
- **Wordmark:** `CPP20::RL_EXECUTION`.
- **Typography:** Space Grotesk + JetBrains Mono for the C++ scope-resolution element.
- **Output:** scalable SVG rather than raster graphics.

Detailed rationale and design history are documented in:

```text
DESIGN.md
```

---

# 17. Repository Structure

```text
cpp20-rl-execution/
│
├── cpp/
│   ├── include/
│   │   ├── types.hpp
│   │   ├── order_book.hpp
│   │   ├── neural_policy.hpp
│   │   └── market_simulator.hpp
│   │
│   ├── src/
│   │   └── main.cpp
│   │
│   ├── tests/
│   │   └── test_engine.cpp
│   │
│   ├── benchmarks/
│   │   └── latest.txt
│   │
│   ├── CMakeLists.txt
│   ├── Makefile
│   └── README.md
│
├── src/
│   ├── components/
│   │   ├── ChartCanvas.tsx
│   │   ├── OrderBookView.tsx
│   │   ├── InferenceInspector.tsx
│   │   ├── DepthChartCanvas.tsx
│   │   ├── AgentPerformanceView.tsx
│   │   ├── TradeLogView.tsx
│   │   ├── Header.tsx
│   │   └── BrandLogo.tsx
│   │
│   ├── engine/
│   ├── hooks/
│   │   └── useTerminalMotion.ts
│   │
│   ├── styles/
│   │   └── terminalMotion.css
│   │
│   └── App.tsx
│
├── DESIGN.md
├── LICENSE
└── package.json
```

---

# 18. Quickstart

## Prerequisites

```text
Node.js >= 18
npm >= 9

C++20 compiler:
GCC 11+
Clang 13+
or compatible MSVC
```

---

## Frontend

Clone the repository:

```bash
git clone https://github.com/<your-username>/cpp20-rl-inference-engine.git
cd cpp20-rl-inference-engine
```

Install dependencies:

```bash
npm install
```

Start the development terminal:

```bash
npm run dev
```

Build the application:

```bash
npm run build
```

Run TypeScript checks:

```bash
npm run lint
```

Run the project benchmark command:

```bash
npm run test:benchmark
```

---

# 19. Native C++20 Build

## Portable Release

```bash
cmake -S cpp \
  -B cpp/build \
  -DCMAKE_BUILD_TYPE=Release

cmake --build cpp/build --parallel
```

Run tests:

```bash
./cpp/build/hft_test
```

Run benchmark:

```bash
./cpp/build/hft_benchmark
```

---

## Native Host-Optimized Build

```bash
cmake -S cpp \
  -B cpp/build_native \
  -DCMAKE_BUILD_TYPE=Release \
  -DENABLE_NATIVE_OPT=ON

cmake --build cpp/build_native --parallel
```

This build uses:

```text
-O3
-march=native
```

and is therefore host-specific.

---

# 20. Sanitizer Build

For correctness validation:

```bash
cmake -S cpp \
  -B cpp/build_sanitize \
  -DCMAKE_BUILD_TYPE=Debug \
  -DENABLE_SANITIZERS=ON

cmake --build cpp/build_sanitize --parallel

./cpp/build_sanitize/hft_test
```

Sanitizers are not used for official performance numbers.

---

# 21. Benchmark Reproducibility

The benchmark result artifact is stored at:

```text
cpp/benchmarks/latest.txt
```

The artifact records:

```text
CPU
Operating system
Compiler
C++ standard
Optimization flags
Architecture flags
Warm-up iterations
Measured iterations
Clock source
Percentiles
Throughput
Allocation counters
```

The official portable benchmark uses:

```text
100,000 measured iterations
1,000 warm-up iterations
std::chrono::steady_clock
```

Three consecutive benchmark runs were used for representative metrics.

---

# 22. Current Verification Gates

```text
cmake --build cpp/build
        PASSED

Native Correctness Suite
        88 / 88 assertions PASSED

ASan + UBSan
        0 errors
        0 leaks

npm run lint
        PASSED
        0 TypeScript errors

npm run build
        PASSED
        clean production bundle

npm run test:benchmark
        PASSED
```

---

# 23. Current Native Performance Snapshot

```text
Portable Release (-O3)

p50:        3,280 ns
p90:        3,289 ns
p99:        6,634 ns
p99.9:     11,208 ns

Mean:
3,392.3 ns
(median of per-run means)

Throughput:
290,396 inferences/sec
```

Optional host optimization:

```text
-march=native

p50:
3,136 ns

Throughput:
307,423 inferences/sec
```

No instrumented global new/delete activity was observed during the measured hot path.

---

# 24. Remaining Limitations

### Single-threaded hot path

The matching engine and policy currently execute sequentially on one thread.

Parallel multi-venue execution would require additional concurrency architecture and should only be introduced when justified by workload and measurement.

### Synthetic market dynamics

The simulator uses seeded stochastic market dynamics rather than historical ITCH/OUCH packet captures.

This makes the environment reproducible and controllable, but it is not a claim of historical market realism.

### Browser versus native timing

Browser/WebAssembly timing and native C++ timing use different runtimes and measurement mechanisms.

They are reported separately.

### Hardware-specific results

The benchmark numbers are measurements from the specified host environment and are not universal guarantees.

### Compiler vectorization

The neural policy currently relies on compact unrolled loops to expose instruction-level parallelism.

Compiler-generated SIMD is treated as an implementation detail unless verified separately.

---

# 25. Engineering Philosophy

The project intentionally prioritizes:

```text
Correctness
    ↓
Determinism
    ↓
Measured Performance
    ↓
Memory Discipline
    ↓
Observable Execution
    ↓
Visual Clarity
```

Performance claims are only published when they can be reproduced from the actual benchmark.

UI animation is treated as presentation logic and is never confused with native engine performance.

---

# License

Distributed under the MIT License.

See:

```text
LICENSE
```
