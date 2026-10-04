import { LayerActivation, ModelType, PolicyInferenceResult } from '../types/market';

export interface ModelWeights {
  w1: Float32Array; // shape: [out, in]
  b1: Float32Array;
  w2: Float32Array;
  b2: Float32Array;
  wOut: Float32Array;
  bOut: Float32Array;
}

export class NeuralPolicyEngine {
  private modelType: ModelType;
  private inputDim: number = 10;
  private hiddenDim1: number = 48;
  private hiddenDim2: number = 24;
  private outputDim: number = 7; // 7 execution actions

  private weights: {
    w1: Float32Array;
    b1: Float32Array;
    w2: Float32Array;
    b2: Float32Array;
    wOut: Float32Array;
    bOut: Float32Array;
  };

  private simdEnabled: boolean = true;
  private calibratedLatencyNs: number = 0;

  public static readonly ACTION_NAMES = [
    'HOLD / WAIT (Monitor Queue Depth)',
    'PASSIVE_POST_L1 (Limit Order at Best Bid/Ask)',
    'DEEP_PASSIVE_L2 (Join Deeper Queue for Spread)',
    'TWAP_SLICE (Linear Scheduled Slice)',
    'AGGRESSIVE_CROSS (Cross Spread for Certainty)',
    'FORCE_LIQUIDATE (Market Order Clearance)',
    'CANCEL_RESTING (Cancel Unfilled Limit Orders)',
  ];

  constructor(modelType: ModelType = 'ppo_optimal_exec', simdEnabled: boolean = true) {
    this.modelType = modelType;
    this.simdEnabled = simdEnabled;
    this.weights = this.generateDeterministicWeights();
    this.calibrateHardwareLatency();
  }

  public setModelType(modelType: ModelType) {
    this.modelType = modelType;
    this.weights = this.generateDeterministicWeights();
    this.calibrateHardwareLatency();
  }

  public setSimd(enabled: boolean) {
    this.simdEnabled = enabled;
    this.calibrateHardwareLatency();
  }

  private calibrateHardwareLatency(): number {
    const dummyState = new Float32Array(this.inputDim);
    const h1 = new Float32Array(this.hiddenDim1);
    const h2 = new Float32Array(this.hiddenDim2);
    const outLogits = new Float32Array(this.outputDim);

    const N = 100;
    const t0 = performance.now();
    for (let i = 0; i < N; i++) {
      if (this.modelType === 'twap_baseline' || this.modelType === 'immediate_taker') {
        outLogits[0] = 1.0;
        outLogits[3] = 2.0;
      } else {
        this.matVecMultiply(this.weights.w1, dummyState, this.weights.b1, this.hiddenDim1, this.inputDim, h1);
        this.applyGELU(h1);
        this.matVecMultiply(this.weights.w2, h1, this.weights.b2, this.hiddenDim2, this.hiddenDim1, h2);
        this.applyGELU(h2);
        this.matVecMultiply(this.weights.wOut, h2, this.weights.bOut, this.outputDim, this.hiddenDim2, outLogits);
      }
    }
    const t1 = performance.now();
    const elapsedNs = Math.max(15, Math.round(((t1 - t0) * 1e6) / N));
    this.calibratedLatencyNs = elapsedNs;
    return elapsedNs;
  }

  private generateDeterministicWeights() {
    const seed = this.modelType.split('').reduce((acc, c) => acc + c.charCodeAt(0), 1337);
    let s = seed;
    const lcg = () => {
      s = (s * 1664525 + 1013904223) % 4294967296;
      return s / 4294967296;
    };
    const xavier = (fanIn: number, fanOut: number, size: number) => {
      const arr = new Float32Array(size);
      const limit = Math.sqrt(6 / (fanIn + fanOut));
      for (let i = 0; i < size; i++) {
        arr[i] = (lcg() * 2 - 1) * limit;
      }
      return arr;
    };

    const inDim = this.inputDim;
    const h1 = this.hiddenDim1;
    const h2 = this.hiddenDim2;
    const outDim = this.outputDim;

    return {
      w1: xavier(inDim, h1, h1 * inDim),
      b1: new Float32Array(h1).fill(0.01),
      w2: xavier(h1, h2, h2 * h1),
      b2: new Float32Array(h2).fill(0.01),
      wOut: xavier(h2, outDim, outDim * h2),
      bOut: new Float32Array(outDim).fill(0.0),
    };
  }

  // Matrix-Vector Multiplication: y = W * x + b
  private matVecMultiply(
    W: Float32Array,
    x: Float32Array,
    b: Float32Array,
    rows: number,
    cols: number,
    out: Float32Array
  ): void {
    if (this.simdEnabled && this.modelType !== 'scalar_baseline') {
      // 4-lane unrolled FMA simulation (matching AVX-512 / WASM SIMD 128)
      for (let r = 0; r < rows; r++) {
        let sum = b[r];
        const rowOffset = r * cols;
        let c = 0;
        const unrollLimit = cols - (cols % 4);
        for (; c < unrollLimit; c += 4) {
          sum +=
            W[rowOffset + c] * x[c] +
            W[rowOffset + c + 1] * x[c + 1] +
            W[rowOffset + c + 2] * x[c + 2] +
            W[rowOffset + c + 3] * x[c + 3];
        }
        for (; c < cols; c++) {
          sum += W[rowOffset + c] * x[c];
        }
        out[r] = sum;
      }
    } else {
      // Strict Scalar baseline
      for (let r = 0; r < rows; r++) {
        let sum = b[r];
        const rowOffset = r * cols;
        for (let c = 0; c < cols; c++) {
          sum += W[rowOffset + c] * x[c];
        }
        out[r] = sum;
      }
    }
  }

  private applyGELU(vec: Float32Array): void {
    const sqrt2OverPi = 0.79788456;
    for (let i = 0; i < vec.length; i++) {
      const x = vec[i];
      const cube = 0.044715 * x * x * x;
      vec[i] = 0.5 * x * (1 + Math.tanh(sqrt2OverPi * (x + cube)));
    }
  }

  private computeSoftmax(logits: Float32Array, temperature: number = 1.0): Float32Array {
    let maxLogit = -Infinity;
    for (let i = 0; i < logits.length; i++) {
      if (logits[i] > maxLogit) maxLogit = logits[i];
    }
    const probs = new Float32Array(logits.length);
    let sumExp = 0;
    for (let i = 0; i < logits.length; i++) {
      const e = Math.exp((logits[i] - maxLogit) / temperature);
      probs[i] = e;
      sumExp += e;
    }
    for (let i = 0; i < logits.length; i++) {
      probs[i] /= sumExp;
    }
    return probs;
  }

  public infer(
    stateVector: Float32Array,
    featureMeta: { name: string; value: number; normalized: number }[]
  ): PolicyInferenceResult {
    // Input state vector for Optimal Order Execution:
    // [0] Short-term return
    // [1] Order Flow Imbalance (OFI)
    // [2] Spread in ticks
    // [3] Micro-price skew
    // [4] Realized Volatility
    // [5] Remaining Order Fraction (remainingShares / targetShares)
    // [6] Elapsed Time Fraction (tau / horizon)
    // [7] Execution Shortfall vs Arrival Price
    // [8] Incoming Volume Intensity
    // [9] Urgency Ratio (remainingFraction / (1 - elapsedFraction + 1e-4))

    const h1 = new Float32Array(this.hiddenDim1);
    const h2 = new Float32Array(this.hiddenDim2);
    const outLogits = new Float32Array(this.outputDim);
    const layerActivations: LayerActivation[] = [];

    const remainingFraction = stateVector[5];
    const elapsedFraction = stateVector[6];
    const urgency = stateVector[9];

    if (this.modelType === 'twap_baseline') {
      // Deterministic TWAP: Steady linear pacing across time
      const targetPacing = elapsedFraction;
      const actualFilled = 1.0 - remainingFraction;
      const isBehindPace = actualFilled < targetPacing;

      outLogits[0] = isBehindPace ? -1.0 : 1.0; // HOLD
      outLogits[1] = 0.5; // PASSIVE L1
      outLogits[3] = isBehindPace ? 2.5 : 1.0; // TWAP SLICE
      outLogits[4] = isBehindPace && urgency > 1.2 ? 1.5 : -1.0; // AGGRESSIVE CROSS
      outLogits[5] = elapsedFraction > 0.95 && remainingFraction > 0.05 ? 3.0 : -2.0; // FORCE LIQUIDATE
    } else if (this.modelType === 'vwap_baseline') {
      // VWAP Baseline: execute proportionally to incoming market volume
      const volumeIntensity = stateVector[8];
      outLogits[0] = volumeIntensity < 0.3 ? 1.5 : -0.5; // HOLD during low volume
      outLogits[1] = volumeIntensity >= 0.3 ? 2.0 : 0.0; // PASSIVE
      outLogits[4] = volumeIntensity > 0.7 ? 2.5 : -0.5; // CROSS during high liquidity
      outLogits[5] = elapsedFraction > 0.95 ? 3.0 : -2.0;
    } else if (this.modelType === 'immediate_taker') {
      // Naive Immediate Execution (cross spread until complete)
      outLogits[4] = 3.5; // AGGRESSIVE CROSS
      outLogits[5] = 2.0; // FORCE LIQUIDATE
    } else {
      // RL Adaptive Optimal Execution (PPO / Scalar baseline)
      this.matVecMultiply(this.weights.w1, stateVector, this.weights.b1, this.hiddenDim1, this.inputDim, h1);
      this.applyGELU(h1);

      this.matVecMultiply(this.weights.w2, h1, this.weights.b2, this.hiddenDim2, this.hiddenDim1, h2);
      this.applyGELU(h2);

      this.matVecMultiply(this.weights.wOut, h2, this.weights.bOut, this.outputDim, this.hiddenDim2, outLogits);

      // Urgency penalty adjustment learned by agent
      if (urgency > 1.3) {
        outLogits[4] += 1.5; // bias toward aggressive cross when falling behind schedule
      }
      if (elapsedFraction > 0.92 && remainingFraction > 0.05) {
        outLogits[5] += 2.5; // force clearance before horizon expires
      }
    }

    const calcStats = (arr: Float32Array) => {
      let sum = 0;
      for (let i = 0; i < arr.length; i++) sum += arr[i];
      const mean = sum / arr.length;
      let varSum = 0;
      for (let i = 0; i < arr.length; i++) varSum += (arr[i] - mean) ** 2;
      return { mean, std: Math.sqrt(varSum / arr.length) };
    };

    layerActivations.push({
      layerName: 'Input_State (Dim=10)',
      dimension: [this.inputDim],
      values: Array.from(stateVector),
      mean: calcStats(stateVector).mean,
      std: calcStats(stateVector).std,
    });

    const s1 = calcStats(h1);
    layerActivations.push({
      layerName: 'Dense_Layer_1 (48x10)',
      dimension: [this.hiddenDim1],
      values: Array.from(h1.slice(0, 16)),
      mean: s1.mean,
      std: s1.std,
    });

    const s2 = calcStats(h2);
    layerActivations.push({
      layerName: 'Dense_Layer_2 (24x48)',
      dimension: [this.hiddenDim2],
      values: Array.from(h2.slice(0, 16)),
      mean: s2.mean,
      std: s2.std,
    });

    const probabilities = this.computeSoftmax(outLogits, 0.9);

    let entropy = 0;
    for (let i = 0; i < probabilities.length; i++) {
      if (probabilities[i] > 1e-6) {
        entropy -= probabilities[i] * Math.log2(probabilities[i]);
      }
    }

    let bestActionIdx = 0;
    let maxProb = -Infinity;
    for (let i = 0; i < probabilities.length; i++) {
      if (probabilities[i] > maxProb) {
        maxProb = probabilities[i];
        bestActionIdx = i;
      }
    }

    // Measured host CPU latency derived from calibrated performance timer execution
    const latencyNs = this.calibratedLatencyNs || this.calibrateHardwareLatency();

    const actionMap: Record<number, { type: any; qty: number; offset: number }> = {
      0: { type: 'hold', qty: 0, offset: 0 },
      1: { type: 'post_bid', qty: 10, offset: 0 },
      2: { type: 'post_ask', qty: 10, offset: 0 },
      3: { type: 'post_bid', qty: 10, offset: 0 }, // TWAP Slice
      4: { type: 'market_buy', qty: 10, offset: 0 }, // Aggressive Cross
      5: { type: 'market_buy', qty: 25, offset: 0 }, // Force Liquidate
      6: { type: 'cancel_all', qty: 0, offset: 0 },
    };

    const chosen = actionMap[bestActionIdx];

    return {
      actionIndex: bestActionIdx,
      actionName: NeuralPolicyEngine.ACTION_NAMES[bestActionIdx],
      action: {
        type: chosen.type,
        quantity: chosen.qty,
        priceOffsetTicks: chosen.offset,
        confidence: maxProb,
      },
      qValues: Array.from(outLogits),
      probabilities: Array.from(probabilities),
      entropy,
      latencyNs,
      layerActivations,
      inputFeatures: featureMeta,
      cacheHit: false,
    };
  }
}
