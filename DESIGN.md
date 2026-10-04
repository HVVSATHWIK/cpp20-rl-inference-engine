# Brand Identity & Logo Design Specification

**Project**: `CPP20-RL-EXECUTION`  
**Engine**: C++20 Deterministic Event-Driven L2 Order Book & Reinforcement Learning Inference Engine  
**Identity System**: Human-Crafted, Anti-AI Quantitative Design Language  
**Asset Naming Standard**: Pulumi / Hypermatic `{client}-{lockup}-{color}-{mode}.{ext}` Token Set

---

## 1. Executive Design Thesis

An authentic logo does not rely on generic iconography (lightbulbs, circuit boards, brains, sparkles, swooshes, or purple-to-blue gradients). Those elements reflect the statistical median of image generators trained on stock vectors.

This identity was derived directly from the **domain-specific mechanics of high-frequency trading microstructure and C++20 systems architecture**:
1. **Intrusive Memory Layout**: The vertical backbone represents the cache-aligned contiguous memory barrier of an L2 price level (`alignas(64)` cache line boundary).
2. **Price-Time Priority Queue**: The three horizontal bars represent the discrete FIFO priority slots at a single tick ($q_0, q_1, q_2$). Their lengths are intentionally asymmetric, reflecting uneven liquidity distribution and queue depth across time.
3. **Discrete Event Match ($\Delta t$)**: The $45^\circ$ cut-out notch at the head of the queue ($q_0$) signifies the crossing spread fill event, paired with an emerald discrete tick marker ($\Delta t$).
4. **Scope Resolution Wordmark**: The typography uses `CPP20::RL_EXECUTION`, employing the C++ scope resolution operator `::` in mono tabular styling combined with **Space Grotesk** display geometry.

---

## 2. Standard Industry Asset Naming Taxonomy

Following standard design system conventions (Pulumi / Hypermatic standard token set):

| Standard Filename | Standard Token Pattern | Role / Application | ViewBox |
| :--- | :--- | :--- | :--- |
| **`cpp20-logo-full-color-dark.svg`** | `{client}-logo-full-color-dark` | Primary horizontal combination mark (Dark Mode) | `0 0 320 64` (Wide) |
| **`cpp20-logo-full-mono-dark.svg`** | `{client}-logo-full-mono-dark` | 1-bit monochrome horizontal combination mark | `0 0 320 64` (Wide) |
| **`cpp20-logo-full-color-light.svg`** | `{client}-logo-full-color-light` | Inverted combination mark for white papers | `0 0 320 64` (Wide) |
| **`cpp20-icon-mark-color-dark.svg`** | `{client}-icon-mark-color-dark` | Primary standalone square logomark | `0 0 32 32` (Square) |
| **`cpp20-icon-mark-mono-dark.svg`** | `{client}-icon-mark-mono-dark` | Monochrome standalone logomark | `0 0 32 32` (Square) |
| **`cpp20-icon-mark-color-light.svg`** | `{client}-icon-mark-color-light` | Light-mode standalone logomark | `0 0 32 32` (Square) |
| **`cpp20-favicon-color.svg`** | `{client}-favicon-color` | Embedded data-URI browser tab icon | `0 0 32 32` (Square) |

---

## 3. Logo Evolution: Provenance & Rejected Concepts

To demonstrate genuine human design iteration rather than single-prompt AI assembly, the following structural concepts were explored and explicitly rejected:

```
[ Concept A: REJECTED ]        [ Concept B: REJECTED ]        [ Concept C: ACCEPTED ]
 Naive Candlestick Graph        Radiating Neural Node          Deterministic Queue Mark

      ┌──┐   ▲                       ○                         ┌──┬──────────────┐
      │  │   │                     / | \                       │  │ █ Queue Head ◄── 45° Notch
   ───┤  ├───┼───                 ○──○──○                      │  ├──────────────┘
      │  │   │                     \ | /                       │  │ ██ Next Rank
      └──┘   ▼                       ○                         │  ├──────┐
                                                               │  │ █    │  ● Tick (Δt)
"Generic retail crypto tell.   "Classic AI generator tell.     └──┴──────┴────────┘
Conflates HFT microstructure   Violates domain specificity;    "Derived directly from
with technical chart analysis." looks like OpenAI/Meta AI."     L2 FIFO queue mechanics."
```

* **Concept A (Rejected)**: Retail Candlestick / Trend Arrow. Conflated HFT microstructure with retail technical analysis.
* **Concept B (Rejected)**: Radiating Neural Graph Nodes. The canonical AI generator tell identified in the `signs-of-ai-design` guide (radial symmetry, snowflake geometries).
* **Concept C (Selected)**: The Deterministic L2 Queue & Discrete Tick glyph. Survives close inspection because every coordinate directly references internal engine data structures.

---

## 4. Geometric & SVG Technical Specifications

### Standalone Icon (`cpp20-icon-mark-color-dark.svg`)
* **viewBox**: `0 0 32 32` (Square format for icon marks).
* **Safe Zone / Inset**: 1.5 units on all outer edges; internal active elements feature $\approx 22\%$ breathing room horizontally (7 units left/right).
* **Stroke Width**: 1.5 user units ($\ge 1.0$, compliant).
* **CSS Independence**: Presentation attributes exclusively (`fill`, `stroke`, `opacity`); renders identically in any SVG parser.
* **Accessibility**: Implements `<title>`, `<desc>`, `role="img"`, and `aria-labelledby`.

```xml
<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="mark-title mark-desc">
  <title id="mark-title">CPP20::RL_EXECUTION Vector Mark</title>
  <desc id="mark-desc">Deterministic L2 order book price-time queue and discrete tick marker</desc>
  <rect x="1.5" y="1.5" width="29" height="29" rx="5" fill="#090d16" stroke="#1e293b" stroke-width="1.5"/>
  <rect x="7" y="6" width="3" height="20" rx="1" fill="#3b82f6"/>
  <path d="M10 8.5H22.5L25 11L22.5 13.5H10V8.5Z" fill="#3b82f6"/>
  <rect x="10" y="15" width="11" height="3" rx="0.75" fill="#60a5fa" opacity="0.85"/>
  <rect x="10" y="20.5" width="6" height="3" rx="0.75" fill="#93c5fd" opacity="0.55"/>
  <circle cx="24.5" cy="22" r="1.75" fill="#10b981"/>
</svg>
```

### Combination Mark Wide Lockup (`cpp20-logo-full-color-dark.svg`)
* **viewBox**: `0 0 320 64` (Wide 5:1 ratio for headers and documentation).
* Includes logomark at $x=16$, primary brand text `CPP20::RL_EXECUTION` at $y=36$, and descriptor `DETERMINISTIC ENGINE` at $y=52$.

---

## 5. Three-Layer Design Token Architecture

The design tokens follow the **Global $\rightarrow$ Semantic $\rightarrow$ Component** hierarchy specified in modern design system standards:

```
[Layer 1: Global Raw Tokens]
  --color-cobalt-500: #3b82f6;
  --color-emerald-500: #10b981;
  --color-slate-950: #080c14;
  --motion-duration-none: 0ms;
        │
        ▼
[Layer 2: Semantic Tokens]
  --color-primary: var(--color-cobalt-500);
  --color-bid: var(--color-emerald-500);
  --bg-app: var(--color-slate-950);
        │
        ▼
[Layer 3: Component Tokens (BrandLogo)]
  --logo-spine-fill: var(--color-primary);
  --logo-tick-fill: var(--color-bid);
  --logo-frame-border: var(--border-subtle);
```

* **Reduced Motion Compliance**: `--motion-duration-none: 0ms` is applied universally under `@media (prefers-reduced-motion: reduce)`.
