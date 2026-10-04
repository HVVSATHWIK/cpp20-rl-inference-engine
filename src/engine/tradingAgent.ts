import { AgentAction, AgentMetrics, Order, OrderBookSnapshot, PolicyInferenceResult, Trade } from '../types/market';
import { NeuralPolicyEngine } from './neuralPolicy';
import { OrderBook } from './orderBook';

export class TradingAgent {
  public id: string = 'rl_agent_0';
  private policy: NeuralPolicyEngine;
  private metrics: AgentMetrics;
  private activeOrderIds: Set<string> = new Set();
  private pnlHistory: number[] = [];
  private shortfallHistory: number[] = [0];
  private initialCash: number = 100000;
  private feeBps: number = 1.0;
  private rebateBps: number = 0.2;
  private inventoryRiskFactor: number = 0.005;

  // Optimal Execution State
  private targetShares: number = 100; // Target parent order to acquire
  private executedShares: number = 0;
  private arrivalPrice: number = 150.0;
  private totalNotionalExecuted: number = 0;
  private executionHorizonTicks: number = 120;
  private elapsedTicks: number = 0;
  private twapAccumulator: number = 0;

  constructor(policy: NeuralPolicyEngine, feeBps: number = 1.0, rebateBps: number = 0.2) {
    this.policy = policy;
    this.feeBps = feeBps;
    this.rebateBps = rebateBps;
    this.metrics = this.createInitialMetrics();
  }

  private createInitialMetrics(): AgentMetrics {
    return {
      cash: this.initialCash,
      inventory: 0,
      realizedPnL: 0,
      unrealizedPnL: 0,
      totalPnL: 0,
      maxDrawdown: 0,
      peakPnL: 0,
      sharpeRatio: 0,
      tradesCount: 0,
      winRate: 0,
      inventoryPenalty: 0,
      totalFeesPaid: 0,
      fillRate: 0,
      ordersSubmitted: 0,
      ordersFilled: 0,
      targetShares: this.targetShares,
      executedShares: 0,
      remainingShares: this.targetShares,
      completionRate: 0,
      arrivalPrice: this.arrivalPrice,
      averageExecutionPrice: this.arrivalPrice,
      implementationShortfall: 0,
      slippageBps: 0,
      twapAdvantageBps: 0,
    };
  }

  public reset(arrivalPrice: number = 150.0): void {
    this.arrivalPrice = arrivalPrice;
    this.executedShares = 0;
    this.totalNotionalExecuted = 0;
    this.elapsedTicks = 0;
    this.twapAccumulator = 0;
    this.activeOrderIds.clear();
    this.pnlHistory = [];
    this.shortfallHistory = [0];
    this.metrics = this.createInitialMetrics();
    this.metrics.arrivalPrice = arrivalPrice;
    this.metrics.averageExecutionPrice = arrivalPrice;
  }

  public extractFeatures(
    book: OrderBookSnapshot,
    priceHistory: number[],
    realizedVol: number,
    volumeIntensity: number = 0.5
  ): { stateVector: Float32Array; featureMeta: { name: string; value: number; normalized: number }[] } {
    const currentPrice = book.midPrice;
    const prev1 = priceHistory.length > 1 ? priceHistory[priceHistory.length - 2] : currentPrice;
    const ret1 = (currentPrice - prev1) / Math.max(1, prev1);

    const spread = book.spread;
    const ofi = book.orderImbalance; // -1 to +1
    const microSkew = spread > 0 ? (book.microPrice - book.midPrice) / spread : 0;

    // Execution features
    const remainingFraction = Math.max(0, Math.min(1, (this.targetShares - this.executedShares) / this.targetShares));
    const elapsedFraction = Math.min(1, this.elapsedTicks / this.executionHorizonTicks);
    const urgency = remainingFraction / Math.max(0.01, 1.0 - elapsedFraction);

    const avgPrice = this.executedShares > 0 ? this.totalNotionalExecuted / this.executedShares : currentPrice;
    const shortfallBps = ((avgPrice - this.arrivalPrice) / this.arrivalPrice) * 10000;

    const stateVector = new Float32Array([
      ret1 * 100, // [0] 1-Tick Return
      ofi, // [1] Order Flow Imbalance
      Math.min(5, spread / 0.05), // [2] Spread in ticks
      microSkew, // [3] Micro-price skew
      realizedVol * 10, // [4] Volatility
      remainingFraction, // [5] Remaining fraction
      elapsedFraction, // [6] Elapsed fraction
      Math.max(-1, Math.min(1, shortfallBps / 50)), // [7] Shortfall normalized
      Math.min(1, volumeIntensity), // [8] Incoming volume intensity
      Math.min(3, urgency), // [9] Urgency ratio
    ]);

    const featureMeta = [
      { name: '1-Tick Return', value: ret1, normalized: stateVector[0] },
      { name: 'Order Imbalance (OFI)', value: ofi, normalized: stateVector[1] },
      { name: 'Spread (Ticks)', value: spread, normalized: stateVector[2] },
      { name: 'Micro-Price Skew', value: microSkew, normalized: stateVector[3] },
      { name: 'Realized Volatility', value: realizedVol, normalized: stateVector[4] },
      { name: 'Remaining Order %', value: remainingFraction * 100, normalized: stateVector[5] },
      { name: 'Elapsed Horizon %', value: elapsedFraction * 100, normalized: stateVector[6] },
      { name: 'Shortfall (bps)', value: shortfallBps, normalized: stateVector[7] },
      { name: 'Liquidity Intensity', value: volumeIntensity, normalized: stateVector[8] },
      { name: 'Execution Urgency', value: urgency, normalized: stateVector[9] },
    ];

    return { stateVector, featureMeta };
  }

  public step(
    orderBook: OrderBook,
    snapshot: OrderBookSnapshot,
    priceHistory: number[],
    realizedVol: number,
    volumeIntensity: number = 0.5
  ): { inference: PolicyInferenceResult; generatedOrders: Order[]; trades: Trade[] } {
    this.elapsedTicks++;
    this.twapAccumulator += snapshot.midPrice;

    const { stateVector, featureMeta } = this.extractFeatures(
      snapshot,
      priceHistory,
      realizedVol,
      volumeIntensity
    );
    const inference = this.policy.infer(stateVector, featureMeta);
    const generatedOrders: Order[] = [];
    const allTrades: Trade[] = [];

    // Stop placing aggressive orders if parent order is completely filled
    const isCompleted = this.executedShares >= this.targetShares;
    const remainingQty = Math.max(0, this.targetShares - this.executedShares);
    const now = Date.now() * 1000;

    if (!isCompleted) {
      const action = inference.action;
      const orderQty = Math.min(remainingQty, Math.max(5, action.quantity));

      switch (action.type) {
        case 'hold':
          // Passive monitoring
          break;

        case 'cancel_all':
          this.cancelActiveOrders(orderBook);
          break;

        case 'post_bid': {
          // Passive Limit Order at best bid (queue priority)
          const price = snapshot.bestBid;
          const order: Order = {
            id: `ag_bid_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
            side: 'buy',
            price,
            quantity: orderQty,
            initialQuantity: orderQty,
            timestamp: now,
            traderId: this.id,
          };
          this.metrics.ordersSubmitted++;
          const res = orderBook.placeLimitOrder(order);
          if (res.restingOrder) this.activeOrderIds.add(res.restingOrder.id);
          if (res.filledTrades.length > 0) {
            allTrades.push(...res.filledTrades);
            this.processFills(res.filledTrades, snapshot.midPrice);
          }
          generatedOrders.push(order);
          break;
        }

        case 'market_buy': {
          // Aggressive Spread Crossing (Taker fill)
          this.metrics.ordersSubmitted++;
          const res = orderBook.placeMarketOrder('buy', orderQty, this.id);
          if (res.filledTrades.length > 0) {
            allTrades.push(...res.filledTrades);
            this.processFills(res.filledTrades, snapshot.midPrice, true);
          }
          break;
        }

        case 'post_ask':
        case 'post_spread': {
          // Join best bid to accumulate target shares
          const price = snapshot.bestBid;
          const order: Order = {
            id: `ag_bid_${Date.now()}`,
            side: 'buy',
            price,
            quantity: Math.min(remainingQty, 10),
            initialQuantity: Math.min(remainingQty, 10),
            timestamp: now,
            traderId: this.id,
          };
          this.metrics.ordersSubmitted++;
          const res = orderBook.placeLimitOrder(order);
          if (res.restingOrder) this.activeOrderIds.add(res.restingOrder.id);
          if (res.filledTrades.length > 0) {
            allTrades.push(...res.filledTrades);
            this.processFills(res.filledTrades, snapshot.midPrice);
          }
          generatedOrders.push(order);
          break;
        }
      }
    }

    this.updateMarkToMarket(snapshot.midPrice, realizedVol);

    return { inference, generatedOrders, trades: allTrades };
  }

  public cancelActiveOrders(orderBook: OrderBook) {
    for (const id of this.activeOrderIds) {
      orderBook.cancelOrder(id);
    }
    this.activeOrderIds.clear();
  }

  public processFills(trades: Trade[], midPrice: number, isTaker: boolean = false) {
    for (const trade of trades) {
      const isBuyer = trade.buyerId === this.id;
      if (!isBuyer) continue;

      this.metrics.ordersFilled++;
      this.metrics.tradesCount++;

      const notional = trade.price * trade.quantity;
      const feeRate = isTaker ? this.feeBps / 10000 : -this.rebateBps / 10000;
      const fee = notional * feeRate;
      this.metrics.totalFeesPaid += fee;

      this.executedShares += trade.quantity;
      this.totalNotionalExecuted += notional;
      this.metrics.inventory += trade.quantity;
      this.metrics.cash -= notional + fee;
    }
  }

  private updateMarkToMarket(currentMidPrice: number, realizedVol: number) {
    const remaining = Math.max(0, this.targetShares - this.executedShares);
    this.metrics.remainingShares = remaining;
    this.metrics.executedShares = this.executedShares;
    this.metrics.completionRate = parseFloat(
      ((this.executedShares / this.targetShares) * 100).toFixed(1)
    );

    const avgPrice = this.executedShares > 0 ? this.totalNotionalExecuted / this.executedShares : currentMidPrice;
    this.metrics.averageExecutionPrice = parseFloat(avgPrice.toFixed(3));

    // Implementation Shortfall: Dollar loss compared to buying everything at arrival price S_0
    const benchmarkCost = this.executedShares * this.arrivalPrice;
    const actualCost = this.totalNotionalExecuted;
    const shortfall = actualCost - benchmarkCost;
    this.metrics.implementationShortfall = parseFloat(shortfall.toFixed(2));

    const slippageBps = ((avgPrice - this.arrivalPrice) / Math.max(1, this.arrivalPrice)) * 10000;
    this.metrics.slippageBps = parseFloat(slippageBps.toFixed(1));

    // TWAP benchmark over the same period
    const twapPrice = this.elapsedTicks > 0 ? this.twapAccumulator / this.elapsedTicks : this.arrivalPrice;
    const twapAdvantageBps = ((twapPrice - avgPrice) / Math.max(1, twapPrice)) * 10000;
    this.metrics.twapAdvantageBps = parseFloat(twapAdvantageBps.toFixed(1));

    // Portfolio mark to market
    const inventoryValue = this.metrics.inventory * currentMidPrice;
    const equity = this.metrics.cash + inventoryValue;
    const totalPnl = equity - this.initialCash;
    this.metrics.totalPnL = parseFloat(totalPnl.toFixed(2));
    this.metrics.unrealizedPnL = this.metrics.totalPnL;

    this.pnlHistory.push(this.metrics.totalPnL);
    if (this.pnlHistory.length > 500) this.pnlHistory.shift();

    this.shortfallHistory.push(this.metrics.implementationShortfall);
    if (this.shortfallHistory.length > 500) this.shortfallHistory.shift();

    if (this.metrics.ordersSubmitted > 0) {
      this.metrics.fillRate = parseFloat(
        ((this.metrics.ordersFilled / this.metrics.ordersSubmitted) * 100).toFixed(1)
      );
    }
  }

  public getShortfallHistory(): number[] {
    return [...this.shortfallHistory];
  }

  public getMetrics(): AgentMetrics {
    return { ...this.metrics };
  }
}
