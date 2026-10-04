import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Header } from './components/Header';
import { OrderBookView } from './components/OrderBookView';
import { ChartCanvas } from './components/ChartCanvas';
import { DepthChartCanvas } from './components/DepthChartCanvas';
import { InferenceInspector } from './components/InferenceInspector';
import { AgentPerformanceView } from './components/AgentPerformanceView';
import { TradeLogView } from './components/TradeLogView';
import { BenchmarkModal } from './components/BenchmarkModal';
import { CppArchitectureModal } from './components/CppArchitectureModal';
import { ResearchDossierModal } from './components/ResearchDossierModal';
import { AntiAiAuditModal } from './components/AntiAiAuditModal';

import { OrderBook } from './engine/orderBook';
import { MarketSimulator } from './engine/marketSimulator';
import { NeuralPolicyEngine } from './engine/neuralPolicy';
import { TradingAgent } from './engine/tradingAgent';
import {
  AgentMetrics,
  MarketMetrics,
  ModelType,
  OrderBookSnapshot,
  PolicyInferenceResult,
  SimulationConfig,
  Trade,
} from './types/market';

export const App: React.FC = () => {
  // Engine configuration state
  const [config, setConfig] = useState<SimulationConfig>({
    tickRateMs: 50,
    volatility: 0.18,
    poissonArrivalRate: 4,
    tickSize: 0.05,
    basePrice: 150.0,
    feeBps: 1.0,
    rebateBps: 0.2,
    inventoryRiskFactor: 0.005,
    simdOptimization: true,
    modelType: 'ppo_optimal_exec',
  });

  // Simulator running state
  const [isRunning, setIsRunning] = useState<boolean>(true);

  // Engine instances (kept stable in refs)
  const orderBookRef = useRef<OrderBook>(new OrderBook(config.tickSize));
  const policyRef = useRef<NeuralPolicyEngine>(
    new NeuralPolicyEngine(config.modelType, config.simdOptimization)
  );
  const agentRef = useRef<TradingAgent>(
    new TradingAgent(policyRef.current, config.feeBps, config.rebateBps)
  );
  const simulatorRef = useRef<MarketSimulator>(
    new MarketSimulator(orderBookRef.current, config)
  );

  // UI state
  const [snapshot, setSnapshot] = useState<OrderBookSnapshot>(() =>
    orderBookRef.current.getSnapshot(12)
  );
  const [metrics, setMetrics] = useState<MarketMetrics>({
    currentPrice: 150.0,
    midPrice: 150.0,
    spread: 0.05,
    vwap: 150.0,
    realizedVolatility: 0.18,
    tickCount: 0,
    totalVolume: 0,
    highPrice: 150.0,
    lowPrice: 150.0,
    priceChange24h: 0,
  });
  const [agentMetrics, setAgentMetrics] = useState<AgentMetrics>(() =>
    agentRef.current.getMetrics()
  );
  const [inference, setInference] = useState<PolicyInferenceResult | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [priceHistory, setPriceHistory] = useState<number[]>([150.0]);
  const [volumeHistory, setVolumeHistory] = useState<number[]>([0]);
  const [shortfallHistory, setShortfallHistory] = useState<number[]>([0]);

  // Modals
  const [isBenchmarkOpen, setIsBenchmarkOpen] = useState<boolean>(false);
  const [isArchOpen, setIsArchOpen] = useState<boolean>(false);
  const [isDossierOpen, setIsDossierOpen] = useState<boolean>(false);
  const [isAuditOpen, setIsAuditOpen] = useState<boolean>(false);

  // Sync config updates
  const handleUpdateConfig = useCallback((newConfig: Partial<SimulationConfig>) => {
    setConfig((prev) => {
      const updated = { ...prev, ...newConfig };
      if (newConfig.modelType && newConfig.modelType !== prev.modelType) {
        policyRef.current.setModelType(newConfig.modelType);
      }
      if (newConfig.simdOptimization !== undefined) {
        policyRef.current.setSimd(newConfig.simdOptimization);
      }
      if (newConfig.volatility !== undefined || newConfig.poissonArrivalRate !== undefined) {
        simulatorRef.current.updateConfig(updated);
      }
      return updated;
    });
  }, []);

  // Main synchronous discrete simulation tick
  const stepSimulation = useCallback(() => {
    const sim = simulatorRef.current;
    const ob = orderBookRef.current;
    const agent = agentRef.current;

    // 1. Advance market simulation
    const simResult = sim.step();
    const newSnapshot = simResult.snapshot;
    const newMetrics = simResult.metrics;
    const currentPriceHist = sim.getPriceHistory();

    // 2. Run RL Agent step
    const agentResult = agent.step(
      ob,
      newSnapshot,
      currentPriceHist,
      newMetrics.realizedVolatility
    );

    // 3. Batch recent trades
    const combinedTrades = [...agentResult.trades, ...simResult.trades];

    // 4. Update UI state
    setSnapshot(ob.getSnapshot(12));
    setMetrics(newMetrics);
    setAgentMetrics(agent.getMetrics());
    setInference(agentResult.inference);
    setPriceHistory([...currentPriceHist]);
    setVolumeHistory([...sim.getVolumeHistory()]);

    if (combinedTrades.length > 0) {
      setTrades((prev) => [...combinedTrades, ...prev].slice(0, 60));
    }

    setShortfallHistory([...agent.getShortfallHistory()]);
  }, []);

  // Simulation tick loop
  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      stepSimulation();
    }, config.tickRateMs);

    return () => clearInterval(interval);
  }, [isRunning, config.tickRateMs, stepSimulation]);

  // Reset function
  const handleReset = useCallback(() => {
    orderBookRef.current = new OrderBook(config.tickSize);
    policyRef.current = new NeuralPolicyEngine(config.modelType, config.simdOptimization);
    agentRef.current = new TradingAgent(policyRef.current, config.feeBps, config.rebateBps);
    simulatorRef.current = new MarketSimulator(orderBookRef.current, config);

    setSnapshot(orderBookRef.current.getSnapshot(12));
    setMetrics({
      currentPrice: config.basePrice,
      midPrice: config.basePrice,
      spread: config.tickSize,
      vwap: config.basePrice,
      realizedVolatility: config.volatility,
      tickCount: 0,
      totalVolume: 0,
      highPrice: config.basePrice,
      lowPrice: config.basePrice,
      priceChange24h: 0,
    });
    setAgentMetrics(agentRef.current.getMetrics());
    setInference(null);
    setTrades([]);
    setPriceHistory([config.basePrice]);
    setVolumeHistory([0]);
    setShortfallHistory([0]);
  }, [config]);

  return (
    <div className="min-h-screen bg-[#080c14] text-slate-100 flex flex-col antialiased font-sans">
      {/* Top Navigation & Status Bar */}
      <Header
        isRunning={isRunning}
        onTogglePlay={() => setIsRunning(!isRunning)}
        onStep={stepSimulation}
        onReset={handleReset}
        metrics={metrics}
        config={config}
        onUpdateConfig={handleUpdateConfig}
        onOpenBenchmark={() => setIsBenchmarkOpen(true)}
        onOpenArchitecture={() => setIsArchOpen(true)}
        onOpenDossier={() => setIsDossierOpen(true)}
        onOpenAudit={() => setIsAuditOpen(true)}
        lastLatencyNs={inference ? inference.latencyNs : 0}
      />

      {/* Main Terminal Workspace Layout */}
      <main className="flex-1 p-2.5 max-w-[1920px] mx-auto w-full flex flex-col space-y-2.5">
        {/* ROW 1: Real-time Execution Chart (8 cols) + L2 Order Book (4 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 items-stretch">
          <div className="lg:col-span-8 min-w-0 min-h-0 h-[375px] min-h-[320px] flex flex-col">
            <ChartCanvas
              priceHistory={priceHistory}
              volumeHistory={volumeHistory}
              trades={trades}
              vwap={metrics.vwap}
              arrivalPrice={agentMetrics.arrivalPrice}
            />
          </div>
          <div className="lg:col-span-4 min-w-0 min-h-0 h-[375px] min-h-[320px] flex flex-col">
            <OrderBookView
              snapshot={snapshot}
              agentRestingBuyPrice={
                agentMetrics.inventory > 0 ? snapshot.bestBid : null
              }
              agentRestingSellPrice={
                agentMetrics.inventory < 0 ? snapshot.bestAsk : null
              }
            />
          </div>
        </div>

        {/* ROW 2: Policy Forward-Pass Pipeline (8 cols) + Cumulative Market Depth (4 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 items-stretch">
          <div className="lg:col-span-8 min-w-0 min-h-0 h-[235px] flex flex-col">
            <InferenceInspector
              inference={inference}
              simdEnabled={config.simdOptimization}
            />
          </div>
          <div className="lg:col-span-4 min-w-0 min-h-0 h-[235px] flex flex-col">
            <DepthChartCanvas snapshot={snapshot} />
          </div>
        </div>

        {/* ROW 3: Optimal Execution Monitor (6 cols) + Execution Tape (6 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 items-stretch">
          <div className="lg:col-span-6 min-w-0 min-h-0 h-[340px] flex flex-col">
            <AgentPerformanceView
              metrics={agentMetrics}
              shortfallHistory={shortfallHistory}
            />
          </div>
          <div className="lg:col-span-6 min-w-0 min-h-0 h-[340px] flex flex-col">
            <TradeLogView trades={trades} />
          </div>
        </div>
      </main>

      {/* Modals */}
      <BenchmarkModal
        isOpen={isBenchmarkOpen}
        onClose={() => setIsBenchmarkOpen(false)}
        defaultModel={config.modelType}
      />
      <CppArchitectureModal
        isOpen={isArchOpen}
        onClose={() => setIsArchOpen(false)}
      />
      <ResearchDossierModal
        isOpen={isDossierOpen}
        onClose={() => setIsDossierOpen(false)}
      />
      <AntiAiAuditModal
        isOpen={isAuditOpen}
        onClose={() => setIsAuditOpen(false)}
      />
    </div>
  );
};
