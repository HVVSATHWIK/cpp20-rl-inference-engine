import { Order, OrderBookLevel, OrderBookSnapshot, OrderSide, Trade } from '../types/market';

interface PriceLevelQueue {
  price: number;
  orders: Order[];
  totalQuantity: number;
}

export class OrderBook {
  private bids: Map<number, PriceLevelQueue> = new Map();
  private asks: Map<number, PriceLevelQueue> = new Map();
  private orderIndex: Map<string, { order: Order; queue: PriceLevelQueue }> = new Map();
  private tickSize: number;
  private tradeHistory: Trade[] = [];
  private maxHistory: number = 200;

  constructor(tickSize: number = 0.05) {
    this.tickSize = tickSize;
  }

  public roundPrice(price: number): number {
    return Math.round(price / this.tickSize) * this.tickSize;
  }

  public placeLimitOrder(order: Order): { filledTrades: Trade[]; restingOrder: Order | null } {
    const filledTrades: Trade[] = [];
    let remainingQty = order.quantity;
    const roundedPrice = this.roundPrice(order.price);
    order.price = roundedPrice;

    if (order.side === 'buy') {
      // Cross against resting asks if order.price >= best ask
      while (remainingQty > 0) {
        const bestAskPrice = this.getBestAskPrice();
        if (bestAskPrice === null || bestAskPrice > order.price) break;

        const queue = this.asks.get(bestAskPrice);
        if (!queue || queue.orders.length === 0) {
          this.asks.delete(bestAskPrice);
          continue;
        }

        const restingOrder = queue.orders[0];
        const matchQty = Math.min(remainingQty, restingOrder.quantity);
        const matchPrice = restingOrder.price;

        const trade: Trade = {
          id: `tr_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          price: matchPrice,
          quantity: matchQty,
          side: 'buy',
          timestamp: Date.now() * 1000,
          buyerId: order.traderId,
          sellerId: restingOrder.traderId,
        };
        filledTrades.push(trade);
        this.tradeHistory.unshift(trade);
        if (this.tradeHistory.length > this.maxHistory) this.tradeHistory.pop();

        remainingQty -= matchQty;
        restingOrder.quantity -= matchQty;
        queue.totalQuantity -= matchQty;

        if (restingOrder.quantity <= 0) {
          queue.orders.shift();
          this.orderIndex.delete(restingOrder.id);
        }

        if (queue.orders.length === 0) {
          this.asks.delete(bestAskPrice);
        }
      }
    } else {
      // Cross against resting bids if order.price <= best bid
      while (remainingQty > 0) {
        const bestBidPrice = this.getBestBidPrice();
        if (bestBidPrice === null || bestBidPrice < order.price) break;

        const queue = this.bids.get(bestBidPrice);
        if (!queue || queue.orders.length === 0) {
          this.bids.delete(bestBidPrice);
          continue;
        }

        const restingOrder = queue.orders[0];
        const matchQty = Math.min(remainingQty, restingOrder.quantity);
        const matchPrice = restingOrder.price;

        const trade: Trade = {
          id: `tr_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          price: matchPrice,
          quantity: matchQty,
          side: 'sell',
          timestamp: Date.now() * 1000,
          buyerId: restingOrder.traderId,
          sellerId: order.traderId,
        };
        filledTrades.push(trade);
        this.tradeHistory.unshift(trade);
        if (this.tradeHistory.length > this.maxHistory) this.tradeHistory.pop();

        remainingQty -= matchQty;
        restingOrder.quantity -= matchQty;
        queue.totalQuantity -= matchQty;

        if (restingOrder.quantity <= 0) {
          queue.orders.shift();
          this.orderIndex.delete(restingOrder.id);
        }

        if (queue.orders.length === 0) {
          this.bids.delete(bestBidPrice);
        }
      }
    }

    // Place remaining quantity into book
    if (remainingQty > 0) {
      order.quantity = remainingQty;
      const targetMap = order.side === 'buy' ? this.bids : this.asks;
      let queue = targetMap.get(roundedPrice);
      if (!queue) {
        queue = { price: roundedPrice, orders: [], totalQuantity: 0 };
        targetMap.set(roundedPrice, queue);
      }
      queue.orders.push(order);
      queue.totalQuantity += remainingQty;
      this.orderIndex.set(order.id, { order, queue });
      return { filledTrades, restingOrder: order };
    }

    return { filledTrades, restingOrder: null };
  }

  public placeMarketOrder(
    side: OrderSide,
    quantity: number,
    traderId: string
  ): { filledTrades: Trade[]; remainingQuantity: number } {
    const filledTrades: Trade[] = [];
    let remainingQty = quantity;

    if (side === 'buy') {
      while (remainingQty > 0) {
        const bestAskPrice = this.getBestAskPrice();
        if (bestAskPrice === null) break;

        const queue = this.asks.get(bestAskPrice);
        if (!queue || queue.orders.length === 0) {
          this.asks.delete(bestAskPrice);
          continue;
        }

        const restingOrder = queue.orders[0];
        const matchQty = Math.min(remainingQty, restingOrder.quantity);

        const trade: Trade = {
          id: `tr_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          price: restingOrder.price,
          quantity: matchQty,
          side: 'buy',
          timestamp: Date.now() * 1000,
          buyerId: traderId,
          sellerId: restingOrder.traderId,
        };
        filledTrades.push(trade);
        this.tradeHistory.unshift(trade);
        if (this.tradeHistory.length > this.maxHistory) this.tradeHistory.pop();

        remainingQty -= matchQty;
        restingOrder.quantity -= matchQty;
        queue.totalQuantity -= matchQty;

        if (restingOrder.quantity <= 0) {
          queue.orders.shift();
          this.orderIndex.delete(restingOrder.id);
        }

        if (queue.orders.length === 0) {
          this.asks.delete(bestAskPrice);
        }
      }
    } else {
      while (remainingQty > 0) {
        const bestBidPrice = this.getBestBidPrice();
        if (bestBidPrice === null) break;

        const queue = this.bids.get(bestBidPrice);
        if (!queue || queue.orders.length === 0) {
          this.bids.delete(bestBidPrice);
          continue;
        }

        const restingOrder = queue.orders[0];
        const matchQty = Math.min(remainingQty, restingOrder.quantity);

        const trade: Trade = {
          id: `tr_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          price: restingOrder.price,
          quantity: matchQty,
          side: 'sell',
          timestamp: Date.now() * 1000,
          buyerId: restingOrder.traderId,
          sellerId: traderId,
        };
        filledTrades.push(trade);
        this.tradeHistory.unshift(trade);
        if (this.tradeHistory.length > this.maxHistory) this.tradeHistory.pop();

        remainingQty -= matchQty;
        restingOrder.quantity -= matchQty;
        queue.totalQuantity -= matchQty;

        if (restingOrder.quantity <= 0) {
          queue.orders.shift();
          this.orderIndex.delete(restingOrder.id);
        }

        if (queue.orders.length === 0) {
          this.bids.delete(bestBidPrice);
        }
      }
    }

    return { filledTrades, remainingQuantity: remainingQty };
  }

  public cancelOrder(orderId: string): boolean {
    const item = this.orderIndex.get(orderId);
    if (!item) return false;

    const { order, queue } = item;
    const idx = queue.orders.findIndex((o) => o.id === orderId);
    if (idx !== -1) {
      queue.orders.splice(idx, 1);
      queue.totalQuantity -= order.quantity;
      if (queue.orders.length === 0) {
        if (order.side === 'buy') {
          this.bids.delete(queue.price);
        } else {
          this.asks.delete(queue.price);
        }
      }
    }
    this.orderIndex.delete(orderId);
    return true;
  }

  public cancelOrdersByTrader(traderId: string): number {
    let cancelled = 0;
    const toCancel: string[] = [];
    for (const [id, item] of this.orderIndex.entries()) {
      if (item.order.traderId === traderId) {
        toCancel.push(id);
      }
    }
    for (const id of toCancel) {
      if (this.cancelOrder(id)) cancelled++;
    }
    return cancelled;
  }

  public getBestBidPrice(): number | null {
    if (this.bids.size === 0) return null;
    let max = -Infinity;
    for (const price of this.bids.keys()) {
      if (price > max) max = price;
    }
    return max === -Infinity ? null : max;
  }

  public getBestAskPrice(): number | null {
    if (this.asks.size === 0) return null;
    let min = Infinity;
    for (const price of this.asks.keys()) {
      if (price < min) min = price;
    }
    return min === Infinity ? null : min;
  }

  public getSnapshot(depth: number = 10): OrderBookSnapshot {
    const sortedBids: OrderBookLevel[] = Array.from(this.bids.values())
      .filter((q) => q.totalQuantity > 0)
      .sort((a, b) => b.price - a.price)
      .slice(0, depth)
      .map((q) => ({
        price: q.price,
        quantity: q.totalQuantity,
        orderCount: q.orders.length,
        totalVolume: 0,
      }));

    const sortedAsks: OrderBookLevel[] = Array.from(this.asks.values())
      .filter((q) => q.totalQuantity > 0)
      .sort((a, b) => a.price - b.price)
      .slice(0, depth)
      .map((q) => ({
        price: q.price,
        quantity: q.totalQuantity,
        orderCount: q.orders.length,
        totalVolume: 0,
      }));

    // Calculate cumulative depth
    let cumBidVol = 0;
    for (const bid of sortedBids) {
      cumBidVol += bid.quantity;
      bid.totalVolume = cumBidVol;
    }

    let cumAskVol = 0;
    for (const ask of sortedAsks) {
      cumAskVol += ask.quantity;
      ask.totalVolume = cumAskVol;
    }

    const bestBid = sortedBids[0]?.price ?? 100.0;
    const bestAsk = sortedAsks[0]?.price ?? bestBid + this.tickSize;
    const spread = Math.max(this.tickSize, parseFloat((bestAsk - bestBid).toFixed(4)));
    const midPrice = parseFloat(((bestBid + bestAsk) / 2).toFixed(4));

    const topBidQty = sortedBids[0]?.quantity ?? 1;
    const topAskQty = sortedAsks[0]?.quantity ?? 1;
    // Micro-price weighted by opposite side volume
    const microPrice = parseFloat(
      ((topAskQty * bestBid + topBidQty * bestAsk) / (topBidQty + topAskQty)).toFixed(4)
    );

    const totalBidVol = cumBidVol;
    const totalAskVol = cumAskVol;
    const totalVol = totalBidVol + totalAskVol;
    const orderImbalance = totalVol > 0 ? (totalBidVol - totalAskVol) / totalVol : 0;

    return {
      bids: sortedBids,
      asks: sortedAsks,
      bestBid,
      bestAsk,
      spread,
      midPrice,
      microPrice,
      orderImbalance,
      totalBidVolume: totalBidVol,
      totalAskVolume: totalAskVol,
    };
  }

  public getRecentTrades(): Trade[] {
    return [...this.tradeHistory];
  }

  public clear(): void {
    this.bids.clear();
    this.asks.clear();
    this.orderIndex.clear();
    this.tradeHistory = [];
  }
}
