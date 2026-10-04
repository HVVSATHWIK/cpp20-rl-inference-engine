# C++20 Low-Latency Execution Engine Core

**CPP20::RL_EXECUTION is a native C++20 low-latency optimal-execution engine prototype with a fixed-capacity L2 matching engine, deterministic market simulation, RL policy inference, implementation-shortfall analysis, and a WebAssembly quantitative terminal.**

---

## 1. Architectural Overview & Source Layout

```
cpp/
├── CMakeLists.txt              # Standard CMake build configuration (portable by default)
├── Makefile                    # Direct GNU Make script (all, test, benchmark, sanitize)
├── include/
│   ├── types.hpp               # Core domain types & C++20 `ExecutionPolicy` Concept
│   ├── order_book.hpp          # alignas(64) L2 PriceLevel & intrusive memory pool arena
│   ├── neural_policy.hpp       # Loop-unrolled forward pass, fast GELU, stable Softmax
│   └── market_simulator.hpp    # Merton Jump-Diffusion & Perold Implementation Shortfall
├── src/
│   └── main.cpp                # 100,000-sample high-resolution benchmark with memory tracking
└── tests/
    └── test_engine.cpp         # Native unit test suite (FIFO, invariants, numerics, IS math)
```

---

## 2. Core Systems & C++20 Features

### A. Static Compile-Time Polymorphism (C++20 Concepts)
The execution-policy abstraction uses compile-time constrained static polymorphism (`concept ExecutionPolicy`) rather than a virtual interface, avoiding virtual table pointer indirections and dynamic dispatch:

```cpp
template <typename T>
concept ExecutionPolicy = requires(T policy, std::span<const float> state) {
    { policy.forward(state) } -> std::same_as<ActionType>;
    { policy.entropy() } -> std::floating_point;
    { policy.reset() } -> std::same_as<void>;
};

// Verified at compile time:
static_assert(hft::core::ExecutionPolicy<NeuralExecutionEngine>);
```

### B. Intrusive Fixed-Capacity Memory Model (Allocation-Free Hot Path)
* **Preallocated Memory Pool**: Limit orders reside in a contiguous static arena (`std::array<OrderNode, PoolSize>`), managed via an intrusive free-index stack. Node allocation and deallocation run in $O(1)$ time with no instrumented global `malloc` or `new` invocations.
* **Cache-Line Aligned Price Levels**: `PriceLevel` is explicitly aligned and padded to 64 bytes (`static_assert(sizeof(PriceLevel) == 64)` and `static_assert(alignof(PriceLevel) == 64)`). This creates a cache-line-aware layout where each price bucket occupies exactly one 64-byte hardware cache line.
* **Intrusive FIFO Priority**: Each level maintains a doubly linked list of resting orders with `head` and `tail` pointers, ensuring $O(1)$ queue insertion and strictly preserved price-time execution priority.

### C. Neural Policy Architecture & Numerical Safeguards
* **Network Topology**: Continuous 10-dimensional microstructure state vector $\rightarrow$ Dense Layer 1 (48 units) $\rightarrow$ Dense Layer 2 (24 units) $\rightarrow$ Action Logits (7 discrete optimal execution actions).
* **Instruction-Level Parallelism**: Dense layer matrix multiplications utilize manual 4-lane loop unrolling to maximize CPU pipeline utilization and instruction-level parallelism. Compiler vectorization (SIMD) is treated as an optimization report verification, not an intrinsic assumption.
* **Polynomial GELU Approximation**: Evaluates the Hendrycks & Gimpel (2016) approximation $\text{GELU}(x) \approx 0.5x(1 + \tanh(\sqrt{2/\pi}(x + 0.044715x^3)))$, bounded to $[-10.0, 10.0]$ to prevent single-precision float overflow.
* **Numerically Stable Softmax**: Subtracts $\max(z_i)$ prior to exponentiation to prevent overflow, with checks for non-finite inputs.

---

## 3. Microstructure & Implementation Shortfall Formulation

The engine adheres strictly to the quantitative formulation of **Perold (1988) Implementation Shortfall (IS)**:

### Mathematical Conventions
* **Arrival Benchmark**: $S_0$ (mid-price at parent order arrival timestamp).
* **For BUY Parent Orders**:
  $$\text{IS} = \text{Actual Execution Cost} - \text{Arrival Benchmark} = \sum_{i} P_i q_i - S_0 \sum_{i} q_i$$
  * $\text{IS} < 0 \implies$ **Execution Savings** (Shares accumulated at average price below $S_0$).
  * $\text{IS} > 0 \implies$ **Slippage Cost** (Shares accumulated at average price above $S_0$).
* **Basis Points Calculation**:
  $$\text{IS}_{\text{bps}} = \frac{\text{IS}}{S_0 \times Q_{\text{filled}}} \times 10{,}000$$
* **TWAP Advantage**:
  $$\text{Advantage}_{\text{bps}} = \frac{P_{\text{TWAP}} - \bar{P}_{\text{exec}}}{P_{\text{TWAP}}} \times 10{,}000$$

---

## 4. Benchmark Methodology & Memory Tracking

The native benchmark (`cpp/src/main.cpp`) enforces the following experimental protocols:

1. **Pre-Reservations Outside Measured Path**: All storage containers (such as the latency sample vector) are pre-reserved prior to benchmark start.
2. **Clock Source**: Utilizes `std::chrono::steady_clock` (monotonic clock; implementation-selected resolution) for measuring elapsed duration.
3. **Warm-up Phase**: Executes 1,000 unmeasured forward passes to reduce first-run effects before sampling.
4. **Dead-Code Elimination Barrier**: Wraps output actions in an assembly barrier (`asm volatile("" : : "r,m"(val) : "memory")`) to guarantee that aggressive compiler optimization (`-O3`) does not discard the forward pass.
5. **Active Allocation Interception**: Overrides global `operator new`, `operator new[]`, `operator delete`, and `operator delete[]` with atomic tracking counters during the 100,000 measured iterations:
   * Confirms `0 calls` to `operator new` / `operator new[]`.
   * Confirms `0 calls` to `operator delete` / `operator delete[]`.
   * Confirms `0 bytes` allocated through instrumented global operators during the measured hot path.
   * Reports: `INSTRUMENTED NEW/DELETE ALLOCATION INVARIANT VERIFIED`.

---

## 5. Measured Native Benchmark Results

### Target Hardware & Environment
* **CPU**: Intel x86_64, Family 6, Model 85 (Server Class Xeon), 2 vCPUs @ 2.40 GHz
* **Operating System**: Linux 4.19.0-gvisor x86_64
* **Compiler**: GCC 12.3.0 (`g++ (Ubuntu 12.3.0-1ubuntu1~22.04.3) 12.3.0`)
* **Standard**: ISO/IEC 14882:2020 (`-std=c++20`, `__cplusplus = 202002L`)
* **Build Configuration**: Release (`-O3 -Wall -Wextra -Wpedantic -Wconversion`)
* **Measured Iterations**: 100,000 forward passes (after 1,000 unmeasured warm-up iterations)
* **Allocation Counter**: 0 calls `operator new`, 0 calls `operator delete`, 0 bytes allocated

### Empirical Latency & Throughput (Three Consecutive Runs)

| Metric | Run 1 | Run 2 | Run 3 | **Representative Median** |
| :--- | :---: | :---: | :---: | :---: |
| **p50 Latency** | 3,281 ns | 3,280 ns | 3,280 ns | **3,280 ns** (3.28 µs) |
| **p90 Latency** | 3,289 ns | 3,550 ns | 3,287 ns | **3,289 ns** (3.29 µs) |
| **p99 Latency** | 4,656 ns | 6,634 ns | 6,951 ns | **6,634 ns** (6.63 µs) |
| **p99.9 Latency** | 9,140 ns | 11,208 ns | 13,045 ns | **11,208 ns** (11.21 µs) |
| **Mean Latency** | 3,338.4 ns | 3,392.3 ns | 3,442.6 ns | **3,392.3 ns** (3.39 µs) |
| **Min Latency** | 3,262 ns | 3,260 ns | 3,263 ns | **3,260 ns** (3.26 µs) |
| **Max Latency** | 124,025 ns | 138,597 ns | 299,701 ns | **138,597 ns** |
| **Throughput** | 295,106 inf/s | 290,396 inf/s | 286,018 inf/s | **290,396 inferences/sec** |
| **operator new** | 0 calls | 0 calls | 0 calls | **0 calls** |
| **Bytes Allocated** | 0 bytes | 0 bytes | 0 bytes | **0 bytes** |

*These values were measured on the specified host and are not universal performance guarantees.*

### Optional Host-Specific Optimization (`-march=native`)
*This result is host-specific and should not be treated as portable across CPU architectures.*
* **p50**: 3,136 ns | **p90**: 3,143 ns | **p99**: 6,837 ns | **Throughput**: 307,423 inferences/sec | **Allocations**: 0 bytes

### Memory Safety & Invariant Verification
* Standalone C++20 Test Suite: **88 passed, 0 failed** (`cpp/tests/test_engine.cpp`)
* Sanitizer Validation: **Clean run under AddressSanitizer (ASan) & UndefinedBehaviorSanitizer (UBSan)**

---

## 6. Building and Running

### Prerequisites
* Any C++20 compliant compiler: `GCC 11+`, `Clang 13+`, or `MSVC 2019 16.10+`.

### Option A: Using Make (Recommended)
```bash
cd cpp

# 1. Build and run comprehensive unit tests
make test

# 2. Build and run high-resolution benchmark
make benchmark

# 3. Optional: Host-specific microarchitecture optimization (-march=native)
make benchmark MARCH_NATIVE=1

# 4. Optional: Run test suite under AddressSanitizer and UndefinedBehaviorSanitizer
make sanitize
```

### Option B: Using CMake
```bash
cd cpp
mkdir build && cd build

# Standard portable build
cmake .. -DCMAKE_BUILD_TYPE=Release
cmake --build .

# Run test suite
ctest --output-on-failure

# Run benchmark
./hft_benchmark
```

### Option C: Direct GCC Compilation from Root
```bash
# Compile and run test suite
g++ -std=c++20 -O3 -Wall -Wextra -Icpp/include cpp/tests/test_engine.cpp -o hft_test
./hft_test

# Compile and run benchmark
g++ -std=c++20 -O3 -Wall -Wextra -Icpp/include cpp/src/main.cpp -o hft_benchmark
./hft_benchmark
```

---

## 7. Native C++ vs. WebAssembly / Browser Distinction

| Dimension | Native C++ Engine (`/cpp`) | Browser / WebAssembly Layer (`/src`) |
| :--- | :--- | :--- |
| **Execution Context** | Standalone native binary on host CPU | V8 JavaScript / WebAssembly sandbox in browser |
| **Timing Source** | `std::chrono::steady_clock` | `performance.now()` in browser event loop |
| **Memory Allocation** | Explicit `0-byte` hot path (operator new intercepted) | Garbage-collected V8 heap memory |
| **Measured Metric** | **Median p50: 3,280 ns, Mean: 3,392 ns** | **Browser Pass: 3.6 µs (V8 runtime)** |
| **Role** | Ground-truth systems core | Visual simulation terminal, blotter, & inspector |

---

## 8. Known Architectural Limitations

1. **Single-Threaded Execution**: The current matching engine and policy run sequentially on a single thread. It is designed for low-latency thread-local execution; cross-thread synchronization queues (e.g., lock-free SPSC queues) are a candidate for future multi-venue extensions.
2. **Synthetic Order Flow**: While the Merton Jump-Diffusion and Poisson replenishment generate realistic price jumps and spread dynamics, it is a mathematical simulation rather than recorded NASDAQ/ITCH historical market depth.
3. **Compiler Vectorization**: Dense matrix arithmetic uses unrolled scalar C++ loops designed to aid compiler auto-vectorization; hand-coded AVX2/AVX-512 assembly intrinsics are not currently implemented.

---

## 9. Frozen System State

### Frontend & WebAssembly Terminal
- Feature-complete quantitative trading terminal.
- Strict blue/white financial styling with stable responsive layout.
- Shortfall trajectory rendered without canvas leakage or malformed fills.
- Browser inference metric measured in the V8 runtime (Browser Pass: 3.6 µs).

### Native C++20 Codebase (`/cpp`)
- Concepts-constrained static polymorphism via `ExecutionPolicy`.
- Fixed-capacity intrusive L2 matching engine with FIFO queue execution.
- 64-byte cache-line-aware/padded `PriceLevel` layout.
- Numerically safeguarded GELU and numerically stable Softmax.
- Deterministic Merton Jump-Diffusion simulation and Perold (1988) Implementation Shortfall.
- Standalone native C++20 test suite (`cpp/tests/test_engine.cpp`).
- Monotonic-duration benchmarking using `std::chrono::steady_clock`.
- Instrumented global `new`/`delete` allocation tracking.

### Build Verification
- `npm run build`: PASSED
- `npm run lint`: PASSED (`tsc --noEmit`, 0 errors)
- `npm run test:benchmark`: PASSED
- `cmake --build cpp/build`: PASSED (`hft_benchmark` & `hft_test`)
- Native Test Suite: PASSED (88 assertions passed, 0 failed)
- Sanitizer Suite (ASan + UBSan): PASSED (0 errors, 0 leaks)

### Current Status
The repository is frozen at the architecture and UI level.
All native performance figures reported above were produced by the reproducible C++ benchmark executed directly on the host hardware.
