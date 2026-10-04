export type OrderSide = 'buy' | 'sell';
export type OrderType = 'limit' | 'market' | 'cancel';

export interface Order {
  id: string;
  side: OrderSide;
  price: number;
  quantity: number;
  initialQuantity: number;
  timestamp: number; // microseconds
  traderId: string; // 'agent' | 'market_maker' | 'noise' | 'momentum'
}

export interface OrderBookLevel {
  price: number;
  quantity: number;
  orderCount: number;
  totalVolume: number;
}

export interface OrderBookSnapshot {
  bids: OrderBookLevel[]; // sorted descending by price
  asks: OrderBookLevel[]; // sorted ascending by price
  bestBid: number;
  bestAsk: number;
  spread: number;
  midPrice: number;
  microPrice: number;
  orderImbalance: number; // (bidVol - askVol) / (bidVol + askVol)
  totalBidVolume: number;
  totalAskVolume: number;
}

export interface Trade {
  id: string;
  price: number;
  quantity: number;
  side: OrderSide; // taker side
  timestamp: number;
  buyerId: string;
  sellerId: string;
}

export interface MarketMetrics {
  currentPrice: number;
  midPrice: number;
  spread: number;
  vwap: number;
  realizedVolatility: number;
  tickCount: number;
  totalVolume: number;
  highPrice: number;
  lowPrice: number;
  priceChange24h: number;
}

export type ModelType =
  | 'ppo_optimal_exec'
  | 'twap_baseline'
  | 'vwap_baseline'
  | 'immediate_taker'
  | 'scalar_baseline';

export interface AgentAction {
  type: 'hold' | 'post_bid' | 'post_ask' | 'post_spread' | 'market_buy' | 'market_sell' | 'cancel_all';
  priceOffsetTicks?: number; // relative to mid or best
  quantity: number;
  confidence: number;
}

export interface AgentMetrics {
  cash: number;
  inventory: number; // current inventory
  realizedPnL: number;
  unrealizedPnL: number;
  totalPnL: number;
  maxDrawdown: number;
  peakPnL: number;
  sharpeRatio: number;
  tradesCount: number;
  winRate: number;
  inventoryPenalty: number;
  totalFeesPaid: number;
  fillRate: number; // filled / submitted
  ordersSubmitted: number;
  ordersFilled: number;
  // Optimal Order Execution specific metrics
  targetShares: number;
  executedShares: number;
  remainingShares: number;
  completionRate: number; // % of target executed
  arrivalPrice: number; // S_0
  averageExecutionPrice: number; // volume-weighted fill price of agent
  implementationShortfall: number; // total dollar loss vs arrival price
  slippageBps: number; // slippage vs arrival price in basis points
  twapAdvantageBps: number; // bps outperformance vs simple TWAP
}

export interface LayerActivation {
  layerName: string;
  dimension: [number, number] | [number];
  values: number[];
  mean: number;
  std: number;
}

export interface PolicyInferenceResult {
  actionIndex: number;
  actionName: string;
  action: AgentAction;
  qValues?: number[];
  probabilities: number[];
  entropy: number;
  latencyNs: number; // nanoseconds measured/simulated
  layerActivations: LayerActivation[];
  inputFeatures: { name: string; value: number; normalized: number }[];
  cacheHit: boolean;
}

export interface LatencySample {
  latencyNs: number;
  simdEnabled: boolean;
  timestamp: number;
}

export interface BenchmarkMetrics {
  iterations: number;
  totalTimeMs: number;
  throughputPerSec: number;
  p50Ns: number;
  p90Ns: number;
  p99Ns: number;
  p99_9Ns: number;
  minNs: number;
  maxNs: number;
  meanNs: number;
  simdSpeedupRatio: number;
  memoryPerInferenceBytes: number;
  distributionBuckets: { bucketNs: number; count: number }[];
}

export interface SimulationConfig {
  tickRateMs: number; // delay between simulator steps
  volatility: number; // jump & diffusion volatility
  poissonArrivalRate: number; // orders per tick
  tickSize: number; // min price increment (e.g. 0.05)
  basePrice: number; // initial asset price (e.g. 150.00)
  feeBps: number; // transaction fee in basis points (e.g. 1 bps = 0.01%)
  rebateBps: number; // maker rebate (e.g. 0.2 bps)
  inventoryRiskFactor: number; // gamma for penalty
  simdOptimization: boolean;
  modelType: ModelType;
}
