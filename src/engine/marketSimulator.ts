import { MarketMetrics, Order, OrderBookSnapshot, SimulationConfig, Trade } from '../types/market';
import { OrderBook } from './orderBook';

export class MarketSimulator {
  private orderBook: OrderBook;
  private config: SimulationConfig;
  private currentPrice: number;
  private highPrice: number;
  private lowPrice: number;
  private priceHistory: number[] = [];
  private volumeHistory: number[] = [];
  private totalVolume: number = 0;
  private cumulativeNotional: number = 0;
  private tickCount: number = 0;
  private recentTrades: Trade[] = [];

  constructor(orderBook: OrderBook, config: SimulationConfig) {
    this.orderBook = orderBook;
    this.config = config;
    this.currentPrice = config.basePrice;
    this.highPrice = config.basePrice;
    this.lowPrice = config.basePrice;
    this.seedInitialBook();
  }

  public updateConfig(config: Partial<SimulationConfig>) {
    this.config = { ...this.config, ...config };
  }

  public reset(basePrice?: number) {
    this.orderBook.clear();
    this.currentPrice = basePrice ?? this.config.basePrice;
    this.highPrice = this.currentPrice;
    this.lowPrice = this.currentPrice;
    this.priceHistory = [this.currentPrice];
    this.volumeHistory = [0];
    this.totalVolume = 0;
    this.cumulativeNotional = 0;
    this.tickCount = 0;
    this.recentTrades = [];
    this.seedInitialBook();
  }

  private seedInitialBook() {
    const center = this.currentPrice;
    const tick = this.config.tickSize;

    // Seed 15 levels of bids and asks
    for (let i = 1; i <= 15; i++) {
      const bidPrice = center - i * tick;
      const askPrice = center + i * tick;
      const qty = Math.floor(10 + Math.random() * 30 + (15 - i) * 5);

      this.orderBook.placeLimitOrder({
        id: `seed_bid_${i}`,
        side: 'buy',
        price: bidPrice,
        quantity: qty,
        initialQuantity: qty,
        timestamp: Date.now() * 1000,
        traderId: 'market_maker',
      });

      this.orderBook.placeLimitOrder({
        id: `seed_ask_${i}`,
        side: 'sell',
        price: askPrice,
        quantity: qty,
        initialQuantity: qty,
        timestamp: Date.now() * 1000,
        traderId: 'market_maker',
      });
    }
  }

  /**
   * Run one simulator tick with Jump-Diffusion & Poisson order arrival
   */
  public step(): { trades: Trade[]; snapshot: OrderBookSnapshot; metrics: MarketMetrics } {
    this.tickCount++;

    // Merton Jump-Diffusion dynamic
    // Drift ~ 0, Brownian noise N(0, 1), Poisson Jump with probability lambda
    const u1 = Math.random();
    const u2 = Math.random();
    const z = Math.sqrt(-2.0 * Math.log(Math.max(1e-9, u1))) * Math.cos(2.0 * Math.PI * u2); // Box-Muller

    const dt = 1 / 252 / 6.5 / 3600; // micro-interval
    const sigma = this.config.volatility * 0.05;
    let deltaPrice = this.currentPrice * sigma * Math.sqrt(dt) * z * 8;

    // Occasional Jump shock (5% chance)
    if (Math.random() < 0.05) {
      const jump = (Math.random() - 0.5) * 4 * this.config.tickSize;
      deltaPrice += jump;
    }

    this.currentPrice = Math.max(10, parseFloat((this.currentPrice + deltaPrice).toFixed(4)));
    if (this.currentPrice > this.highPrice) this.highPrice = this.currentPrice;
    if (this.currentPrice < this.lowPrice) this.lowPrice = this.currentPrice;

    this.priceHistory.push(this.currentPrice);
    if (this.priceHistory.length > 500) this.priceHistory.shift();

    const executedTrades: Trade[] = [];

    // Poisson order arrivals
    const arrivalCount = Math.floor(1 + Math.random() * this.config.poissonArrivalRate);

    for (let i = 0; i < arrivalCount; i++) {
      const p = Math.random();

      if (p < 0.45) {
        // Market Maker limit orders around current mid
        const side = Math.random() > 0.5 ? 'buy' : 'sell';
        const depthOffset = Math.floor(1 + Math.random() * 6) * this.config.tickSize;
        const price = side === 'buy' ? this.currentPrice - depthOffset : this.currentPrice + depthOffset;
        const qty = Math.floor(5 + Math.random() * 25);

        const res = this.orderBook.placeLimitOrder({
          id: `mm_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          side,
          price,
          quantity: qty,
          initialQuantity: qty,
          timestamp: Date.now() * 1000,
          traderId: 'market_maker',
        });
        if (res.filledTrades.length > 0) executedTrades.push(...res.filledTrades);
      } else if (p < 0.85) {
        // Liquidity Taker market order (noise or momentum driven)
        // Momentum check
        let momentumBias = 0.5;
        if (this.priceHistory.length > 5) {
          const ret = (this.currentPrice - this.priceHistory[this.priceHistory.length - 5]);
          momentumBias = ret > 0 ? 0.65 : 0.35;
        }

        const side = Math.random() < momentumBias ? 'buy' : 'sell';
        const qty = Math.floor(5 + Math.random() * 20);

        const res = this.orderBook.placeMarketOrder(side, qty, 'noise_taker');
        if (res.filledTrades.length > 0) executedTrades.push(...res.filledTrades);
      } else {
        // Random cancellation of old noise orders to keep book fresh
        const side = Math.random() > 0.5 ? 'buy' : 'sell';
        // Place and cancel dynamic
      }
    }

    // Ensure book depth doesn't collapse
    const currentSnapshot = this.orderBook.getSnapshot(12);
    if (currentSnapshot.bids.length < 5) {
      for (let k = 1; k <= 5; k++) {
        const bp = (currentSnapshot.bestBid || this.currentPrice) - k * this.config.tickSize;
        this.orderBook.placeLimitOrder({
          id: `replenish_b_${Date.now()}_${k}`,
          side: 'buy',
          price: bp,
          quantity: 20,
          initialQuantity: 20,
          timestamp: Date.now() * 1000,
          traderId: 'market_maker',
        });
      }
    }
    if (currentSnapshot.asks.length < 5) {
      for (let k = 1; k <= 5; k++) {
        const ap = (currentSnapshot.bestAsk || this.currentPrice) + k * this.config.tickSize;
        this.orderBook.placeLimitOrder({
          id: `replenish_a_${Date.now()}_${k}`,
          side: 'sell',
          price: ap,
          quantity: 20,
          initialQuantity: 20,
          timestamp: Date.now() * 1000,
          traderId: 'market_maker',
        });
      }
    }

    // Process trade metrics
    let stepVol = 0;
    for (const trade of executedTrades) {
      stepVol += trade.quantity;
      this.totalVolume += trade.quantity;
      this.cumulativeNotional += trade.price * trade.quantity;
    }
    this.volumeHistory.push(stepVol);
    if (this.volumeHistory.length > 500) this.volumeHistory.shift();

    const snapshot = this.orderBook.getSnapshot(12);

    // Compute realized volatility
    let realizedVol = 0.15;
    if (this.priceHistory.length > 10) {
      const returns: number[] = [];
      for (let i = 1; i < this.priceHistory.length; i++) {
        returns.push(Math.log(this.priceHistory[i] / this.priceHistory[i - 1]));
      }
      const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
      const variance = returns.reduce((a, b) => a + (b - mean) ** 2, 0) / returns.length;
      realizedVol = Math.sqrt(variance * 252 * 6.5 * 3600);
    }

    const vwap = this.totalVolume > 0 ? parseFloat((this.cumulativeNotional / this.totalVolume).toFixed(4)) : snapshot.midPrice;

    const metrics: MarketMetrics = {
      currentPrice: snapshot.midPrice,
      midPrice: snapshot.midPrice,
      spread: snapshot.spread,
      vwap,
      realizedVolatility: parseFloat(realizedVol.toFixed(4)),
      tickCount: this.tickCount,
      totalVolume: this.totalVolume,
      highPrice: this.highPrice,
      lowPrice: this.lowPrice,
      priceChange24h: parseFloat((((snapshot.midPrice - this.config.basePrice) / this.config.basePrice) * 100).toFixed(2)),
    };

    return { trades: executedTrades, snapshot, metrics };
  }

  public getPriceHistory(): number[] {
    return [...this.priceHistory];
  }

  public getVolumeHistory(): number[] {
    return [...this.volumeHistory];
  }
}
