import React, { useState } from 'react';
import { SmartBin, HeapItem } from '../types';
import { MaxHeapPriorityQueue } from '../algorithms/HeapPriorityQueue';
import { MLFillPredictor } from '../algorithms/MLFillPredictor';
import { 
  GitFork, 
  Sparkles, 
  ArrowDown, 
  Sliders, 
  Code2, 
  AlertCircle, 
  Clock, 
  Flame, 
  ChevronRight,
  TrendingUp,
  Cpu,
  RefreshCw
} from 'lucide-react';

interface HeapVisualizerViewProps {
  bins: SmartBin[];
  heapQueue: MaxHeapPriorityQueue;
  onExtractMax: () => void;
  onSelectBin: (bin: SmartBin) => void;
  onUpdateBinFill: (binId: string, newFill: number) => void;
}

export const HeapVisualizerView: React.FC<HeapVisualizerViewProps> = ({
  bins,
  heapQueue,
  onExtractMax,
  onSelectBin,
  onUpdateBinFill,
}) => {
  const [selectedBinId, setSelectedBinId] = useState<string>(bins[0]?.id || 'BIN-101');
  const [activeTab, setActiveTab] = useState<'heap' | 'ml'>('heap');

  // What-if simulator sliders for the selected bin
  const [tempAdjust, setTempAdjust] = useState<number>(0); // -10 to +10 C
  const [weekendToggle, setWeekendToggle] = useState<boolean>(false);
  const [rainToggle, setRainToggle] = useState<boolean>(false);

  const selectedBin = bins.find(b => b.id === selectedBinId) || bins[0];

  // Dynamic ML prediction with what-if modifiers
  const mlFeatures = {
    currentFill: selectedBin.fillLevel,
    rateLast4Hours: 3.5 + (tempAdjust > 0 ? tempAdjust * 0.2 : 0),
    hourOfDay: 14,
    isWeekend: weekendToggle,
    zoneWeight: selectedBin.zone.includes('Commercial') ? 1.4 : selectedBin.zone.includes('Industrial') ? 1.2 : 1.0,
    weatherPenalty: rainToggle ? 1.25 : 1.0,
    reportedIssuesCount: selectedBin.associatedReportsCount,
  };

  const prediction = MLFillPredictor.predict(mlFeatures);

  const heapItems = heapQueue.getItems();
  const treeNodes = heapQueue.getTreeRepresentation();

  return (
    <div className="space-y-6">
      {/* Top Selector Banner */}
      <div className="bg-[#090e1c]/80 backdrop-blur-xl border border-white/[0.08] rounded-2xl p-5 sm:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-5 shadow-2xl relative overflow-hidden">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
            <span>ADSA Data Engine</span>
            <span className="text-slate-600">/</span>
            <span className="text-emerald-400 font-mono font-semibold">Max-Heap O(log N) Priority Queue</span>
            <span className="text-slate-600">/</span>
            <span className="text-sky-400 font-mono">Supervised Regression</span>
          </div>
          <h1 className="font-display text-xl sm:text-2xl font-bold text-white tracking-tight mt-1">
            Priority Queue & Machine Learning Prediction Studio
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-3xl leading-relaxed">
            Real-time urgency sorting using a binary Max-Heap paired with multi-variable fill progression prediction.
          </p>
        </div>

        {/* Segmented View Switcher */}
        <div className="flex items-center gap-1 p-1 bg-slate-950/80 rounded-xl border border-white/[0.08] shadow-inner">
          <button
            onClick={() => setActiveTab('heap')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
              activeTab === 'heap'
                ? 'bg-slate-800 text-white shadow-sm border border-white/[0.1]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <GitFork className="w-3.5 h-3.5 text-emerald-400" />
            <span>Max-Heap Tree</span>
          </button>
          <button
            onClick={() => setActiveTab('ml')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
              activeTab === 'ml'
                ? 'bg-slate-800 text-white shadow-sm border border-white/[0.1]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cpu className="w-3.5 h-3.5 text-sky-400" />
            <span>ML Prediction Lab</span>
          </button>
        </div>
      </div>

      {activeTab === 'heap' ? (
        /* Max-Heap View */
        <div className="space-y-6">
          {/* Heap Controls & Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#090e1c]/80 backdrop-blur-md border border-white/[0.08] rounded-2xl p-4 shadow-xl relative overflow-hidden">
              <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold">Total Containers in Heap</div>
              <div className="text-3xl font-extrabold font-mono text-white mt-1.5 tabular-nums">
                {heapItems.length}
              </div>
              <div className="text-[11px] text-slate-400 mt-1 font-mono">
                Root: <span className="text-emerald-400 font-semibold">{heapItems[0]?.binId || 'None'}</span> ({heapItems[0]?.urgencyScore.toFixed(1) || 0} pts)
              </div>
            </div>

            <div className="bg-[#090e1c]/80 backdrop-blur-md border border-white/[0.08] rounded-2xl p-4 shadow-xl relative overflow-hidden">
              <div className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-semibold">Extraction Complexity</div>
              <div className="text-3xl font-extrabold font-mono text-emerald-400 mt-1.5">
                O(log N)
              </div>
              <div className="text-[11px] text-slate-400 mt-1 font-mono">
                Log₂(N) ≈ {Math.ceil(Math.log2(Math.max(1, heapItems.length)))} maximum swaps
              </div>
            </div>

            <div className="bg-[#090e1c]/80 backdrop-blur-md border border-white/[0.08] rounded-2xl p-4 shadow-xl relative overflow-hidden">
              <div className="text-[10px] font-mono uppercase tracking-wider text-sky-400 font-semibold">Heap Invariant</div>
              <div className="text-base font-bold font-mono text-white mt-1.5">
                A[parent] ≥ A[child]
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Urgency strictly decreases with depth
              </div>
            </div>

            {/* Interactive Extract Max Action */}
            <div className="bg-[#090e1c]/80 backdrop-blur-md border border-white/[0.08] rounded-2xl p-4 shadow-xl flex flex-col justify-between">
              <div className="text-[10px] font-mono uppercase tracking-wider text-rose-400 font-semibold">Priority Dispatch</div>
              <button
                onClick={onExtractMax}
                disabled={heapItems.length === 0}
                className="mt-2 w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 disabled:bg-slate-800 disabled:text-slate-500 rounded-xl shadow-lg shadow-rose-950/40 transition active:scale-[0.98]"
              >
                <ArrowDown className="w-3.5 h-3.5" />
                <span>Extract Max (Pop Root)</span>
              </button>
            </div>
          </div>

          {/* Graphical Binary Tree Representation */}
          <div className="bg-[#090e1c]/80 backdrop-blur-xl border border-white/[0.08] rounded-2xl p-5 sm:p-6 overflow-x-auto shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-display text-base font-bold text-white tracking-tight">
                  Binary Max-Heap Visual Hierarchy
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Node format: [Bin ID] / Urgency Score. Root always stores highest collection urgency.
                </p>
              </div>
              <span className="text-xs font-mono text-slate-400 bg-slate-950/80 px-2.5 py-1 rounded-lg border border-white/[0.08]">
                Depth Levels: {Math.floor(Math.log2(Math.max(1, heapItems.length))) + 1}
              </span>
            </div>

            {/* Tree Nodes Display */}
            <div className="py-6 min-w-[650px] flex flex-col items-center gap-6">
              {[0, 1, 2, 3].map(depth => {
                const nodesAtDepth = treeNodes.filter(n => n.depth === depth);
                if (nodesAtDepth.length === 0) return null;

                return (
                  <div key={`depth-${depth}`} className="w-full flex justify-around items-center">
                    {nodesAtDepth.map(node => {
                      const isRoot = node.index === 0;
                      const isCritical = node.item.urgencyScore >= 85;

                      return (
                        <div
                          key={`tree-node-${node.index}`}
                          onClick={() => {
                            const found = bins.find(b => b.id === node.item.binId);
                            if (found) onSelectBin(found);
                          }}
                          className={`cursor-pointer p-3 rounded-2xl border text-center transition-all hover:scale-105 min-w-[110px] shadow-lg ${
                            isRoot
                              ? 'bg-rose-950/80 border-rose-500 shadow-rose-950/50 text-rose-200'
                              : isCritical
                              ? 'bg-amber-950/60 border-amber-500/70 text-amber-200 shadow-amber-950/40'
                              : 'bg-slate-950/80 border-white/[0.08] text-slate-300 hover:border-white/[0.2]'
                          }`}
                        >
                          <div className="text-[10px] font-mono text-slate-400 flex items-center justify-between gap-1">
                            <span>#{node.index}</span>
                            {isRoot && <span className="text-rose-400 font-bold uppercase tracking-wider text-[9px] bg-rose-950 px-1 rounded border border-rose-800/60">Root</span>}
                          </div>
                          <div className="font-bold text-xs font-mono text-white mt-1">
                            {node.item.binId}
                          </div>
                          <div className="text-xs font-mono font-bold text-emerald-400 tabular-nums mt-0.5">
                            {node.item.urgencyScore.toFixed(1)} pts
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                            Fill: {node.item.fillLevel}%
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Underlying Array Backing Representation */}
          <div className="bg-[#090e1c]/80 backdrop-blur-xl border border-white/[0.08] rounded-2xl p-5 sm:p-6 shadow-2xl">
            <h2 className="font-display text-base font-bold text-white tracking-tight mb-1">
              Contiguous Memory Array Storage (Zero-Pointer Overhead)
            </h2>
            <p className="text-xs text-slate-400 mb-4">
              Array mapping: Parent = ⌊(i - 1)/2⌋, Left Child = 2i + 1, Right Child = 2i + 2
            </p>

            <div className="flex flex-wrap gap-2">
              {heapItems.map((item, idx) => (
                <div
                  key={`arr-${item.binId}`}
                  className="bg-slate-950/80 border border-white/[0.08] rounded-xl p-2.5 min-w-[100px] text-center shadow-sm"
                >
                  <div className="text-[10px] font-mono text-slate-500">[{idx}]</div>
                  <div className="text-xs font-mono font-bold text-white mt-0.5">{item.binId}</div>
                  <div className="text-[11px] font-mono text-rose-400 font-bold">{item.urgencyScore.toFixed(1)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Machine Learning Prediction Studio */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Bin ML Controls & Features */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-5">
            <div>
              <label className="text-xs text-slate-400 font-medium block mb-1">
                Select Smart Bin to Inspect
              </label>
              <select
                value={selectedBinId}
                onChange={(e) => setSelectedBinId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:border-slate-700"
              >
                {bins.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.id} - {b.name} ({b.fillLevel}%)
                  </option>
                ))}
              </select>
            </div>

            {/* Current Fill Level Slider */}
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-slate-300">Simulate Ultrasonic Fill Level:</span>
                <span className="font-mono font-bold text-white tabular-nums">{selectedBin.fillLevel}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                value={selectedBin.fillLevel}
                onChange={(e) => onUpdateBinFill(selectedBin.id, Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
            </div>

            {/* What-If Experimentation Scenarios */}
            <div className="pt-4 border-t border-slate-800 space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
                <Sliders className="w-3.5 h-3.5 text-sky-400" />
                <span>What-If Scenario Simulation</span>
              </div>

              {/* Weather Rain Surge */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Rain & Food Delivery Surge (+25%):</span>
                <button
                  onClick={() => setRainToggle(!rainToggle)}
                  className={`px-2.5 py-1 rounded text-[11px] font-mono transition ${
                    rainToggle ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {rainToggle ? 'Active' : 'Off'}
                </button>
              </div>

              {/* Weekend Festival Surge */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Weekend Foot Traffic (+35%):</span>
                <button
                  onClick={() => setWeekendToggle(!weekendToggle)}
                  className={`px-2.5 py-1 rounded text-[11px] font-mono transition ${
                    weekendToggle ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {weekendToggle ? 'Active' : 'Off'}
                </button>
              </div>
            </div>

            {/* Model Evaluation Statistics */}
            <div className="pt-4 border-t border-slate-800 space-y-2 text-xs">
              <div className="text-xs font-semibold text-white">Model Metrics (Scikit-Learn)</div>
              <div className="flex justify-between text-slate-400">
                <span>R² Regression Score:</span>
                <span className="font-mono text-emerald-400 font-bold">{prediction.r2Score}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Mean Absolute Error (MAE):</span>
                <span className="font-mono text-slate-200">{prediction.maePercent}%</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Dominant Predictor:</span>
                <span className="font-mono text-sky-400">{prediction.dominantFeature}</span>
              </div>
            </div>
          </div>

          {/* 24-Hour Projected Trajectory Curve */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 lg:col-span-2 space-y-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-sm font-semibold text-white tracking-wide">
                    24-Hour Predictive Fill Trajectory & Uncertainty Envelope
                  </h2>
                  <p className="text-xs text-slate-400">
                    Confidence interval: 95% Bayesian bounds with diurnal activity peaks
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-slate-400">Time Until 100% Full:</span>
                  <div className="text-base font-bold font-mono text-amber-400">
                    {prediction.hoursUntilFull} hours
                  </div>
                </div>
              </div>

              {/* Trajectory SVG Curve */}
              <div className="w-full h-52 bg-slate-950 rounded-xl p-3 border border-slate-800 relative">
                <svg viewBox="0 0 500 160" className="w-full h-full">
                  {/* Grid Lines */}
                  {[0, 25, 50, 75, 100].map(val => {
                    const y = 140 - (val / 100) * 120;
                    return (
                      <g key={`grid-${val}`}>
                        <line x1="30" y1={y} x2="480" y2={y} stroke="#1e293b" strokeWidth="0.8" />
                        <text x="22" y={y + 3} fill="#64748b" fontSize="8" textAnchor="end" fontFamily="monospace">
                          {val}%
                        </text>
                      </g>
                    );
                  })}

                  {/* 100% Critical Threshold line */}
                  <line x1="30" y1="20" x2="480" y2="20" stroke="#f43f5e" strokeWidth="1" strokeDasharray="3,3" />

                  {/* Confidence Envelope Area */}
                  {(() => {
                    const pointsUpper = prediction.projectedCurve24h.map((pt, i) => {
                      const x = 40 + i * 36;
                      const y = 140 - (pt.upperBound / 100) * 120;
                      return `${x},${y}`;
                    });
                    const pointsLower = [...prediction.projectedCurve24h]
                      .reverse()
                      .map((pt, i) => {
                        const originalIdx = prediction.projectedCurve24h.length - 1 - i;
                        const x = 40 + originalIdx * 36;
                        const y = 140 - (pt.lowerBound / 100) * 120;
                        return `${x},${y}`;
                      });
                    const polyPoints = [...pointsUpper, ...pointsLower].join(' ');
                    return <polygon points={polyPoints} fill="#0ea5e9" fillOpacity="0.12" />;
                  })()}

                  {/* Main Regression Line */}
                  <path
                    d={prediction.projectedCurve24h
                      .map((pt, i) => {
                        const x = 40 + i * 36;
                        const y = 140 - (pt.fill / 100) * 120;
                        return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                      })
                      .join(' ')}
                    fill="none"
                    stroke="#38bdf8"
                    strokeWidth="2.5"
                  />

                  {/* Data Points on curve */}
                  {prediction.projectedCurve24h.map((pt, i) => {
                    const x = 40 + i * 36;
                    const y = 140 - (pt.fill / 100) * 120;
                    return (
                      <circle
                        key={`pt-${i}`}
                        cx={x}
                        cy={y}
                        r={pt.fill >= 100 ? 4 : 2.5}
                        fill={pt.fill >= 100 ? '#f43f5e' : '#38bdf8'}
                      />
                    );
                  })}
                </svg>

                {/* X Axis time labels */}
                <div className="flex justify-between px-8 text-[9px] font-mono text-slate-500 mt-1">
                  <span>Now (+0h)</span>
                  <span>+4h</span>
                  <span>+8h</span>
                  <span>+12h</span>
                  <span>+16h</span>
                  <span>+20h</span>
                  <span>+24h</span>
                </div>
              </div>
            </div>

            {/* Recommended Action Card */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-emerald-400" />
                <span className="text-slate-300 font-medium">Recommended Municipal Action:</span>
              </div>
              <span className="font-mono font-semibold text-emerald-400">
                {prediction.recommendedAction}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
