import React, { useState, useMemo } from 'react';
import { 
  SmartBin, 
  FleetTruck, 
  GraphNode, 
  GraphEdge,
  SimulationSettings 
} from '../types';
import { DEPOT_NODE } from '../data/mockData';
import { MLFillPredictor, MLFeatureVector } from '../algorithms/MLFillPredictor';
import { 
  Layers, 
  Activity, 
  Truck, 
  Filter, 
  Sparkles,
  TrendingUp,
  Clock,
  Compass,
  Sliders,
  ChevronRight,
  Zap,
  Info
} from 'lucide-react';

interface CityHeatmapViewProps {
  bins: SmartBin[];
  trucks: FleetTruck[];
  intersections: GraphNode[];
  edges: GraphEdge[];
  onSelectBin: (bin: SmartBin) => void;
  selectedBin: SmartBin | null;
  activeRouteLegs: { pathCoordinates: { x: number; y: number }[] }[];
  simulation?: SimulationSettings;
}

export const CityHeatmapView: React.FC<CityHeatmapViewProps> = ({
  bins,
  trucks,
  intersections,
  edges,
  onSelectBin,
  selectedBin,
  activeRouteLegs,
  simulation,
}) => {
  // Layer visibility toggles
  const [showHeatmap, setShowHeatmap] = useState(false); // Current fill heatmap
  const [showPredictiveHeatmap, setShowPredictiveHeatmap] = useState(true); // AI Predictive Fill-Level Heatmap
  const [predictiveHorizonHours, setPredictiveHorizonHours] = useState<number>(4); // +4h, +8h, +12h, +24h
  const [showCorridorGlow, setShowCorridorGlow] = useState(true); // Road graph corridor predictive gradient
  const [showRoads, setShowRoads] = useState(true);
  const [showTrucks, setShowTrucks] = useState(true);
  const [showRoutePath, setShowRoutePath] = useState(true);
  const [selectedZone, setSelectedZone] = useState<string>('All');

  const zones = ['All', 'Downtown Commercial', 'Residential West', 'Waterfront Boardwalk', 'Industrial Park', 'University Campus'];

  const filteredBins = selectedZone === 'All' 
    ? bins 
    : bins.filter(b => b.zone === selectedZone);

  // SVG viewport coordinates
  const viewBoxWidth = 1000;
  const viewBoxHeight = 700;

  // -------------------------------------------------------------
  // SPATIAL ML FILL-LEVEL PREDICTION PIPELINE
  // -------------------------------------------------------------
  const binPredictions = useMemo(() => {
    return bins.map(bin => {
      const features: MLFeatureVector = {
        currentFill: bin.fillLevel,
        rateLast4Hours: Math.max(1.2, 3.2 + (bin.urgencyScore > 80 ? 1.5 : 0)),
        hourOfDay: 14,
        isWeekend: false,
        zoneWeight: bin.zone.includes('Commercial') ? 1.4 : bin.zone.includes('Industrial') ? 1.2 : 1.0,
        weatherPenalty: simulation?.weatherCondition === 'Rainy' ? 1.25 : 1.0,
        reportedIssuesCount: bin.associatedReportsCount || 0,
      };

      const pred = MLFillPredictor.predict(features);
      const curvePoint = pred.projectedCurve24h.find(p => p.hour === predictiveHorizonHours);
      const projectedFill = curvePoint 
        ? curvePoint.fill 
        : Math.min(100, Number((bin.fillLevel + (100 - bin.fillLevel) * (predictiveHorizonHours / Math.max(0.1, pred.hoursUntilFull))).toFixed(1)));

      return {
        binId: bin.id,
        bin,
        currentFill: bin.fillLevel,
        projectedFill,
        deltaPercent: Number((projectedFill - bin.fillLevel).toFixed(1)),
        hoursUntilFull: pred.hoursUntilFull,
        isCritical: projectedFill >= 85,
        isApproaching: projectedFill >= 70 && projectedFill < 85,
        isModerate: projectedFill >= 50 && projectedFill < 70,
        confidence: pred.confidencePercent,
        x: bin.x,
        y: bin.y,
      };
    });
  }, [bins, predictiveHorizonHours, simulation?.weatherCondition]);

  const binPredictionMap = useMemo(() => {
    const map = new Map<string, typeof binPredictions[0]>();
    binPredictions.forEach(p => map.set(p.binId, p));
    return map;
  }, [binPredictions]);

  // Aggregate metrics for predictive overlay HUD
  const predictiveStats = useMemo<{
    criticalCount: number;
    approachingCount: number;
    thresholdExceededCount: number;
    fastestBin: SmartBin | null;
    maxDelta: number;
  }>(() => {
    const criticalCount = binPredictions.filter(p => p.projectedFill >= 85).length;
    const approachingCount = binPredictions.filter(p => p.projectedFill >= 70 && p.projectedFill < 85).length;
    const threshold = simulation?.collectionThreshold ?? 75;
    const thresholdExceededCount = binPredictions.filter(p => p.projectedFill >= threshold).length;

    let maxDelta = -Infinity;
    let fastestBin: SmartBin | null = null;
    binPredictions.forEach(p => {
      if (p.deltaPercent > maxDelta) {
        maxDelta = p.deltaPercent;
        fastestBin = p.bin;
      }
    });

    return {
      criticalCount,
      approachingCount,
      thresholdExceededCount,
      fastestBin,
      maxDelta,
    };
  }, [binPredictions, simulation?.collectionThreshold]);

  // -------------------------------------------------------------
  // ROAD GRAPH PREDICTIVE CORRIDOR HEAT OVERLAY
  // Computes dynamic gradient intensity on road edges connecting
  // to bins projected to have high accumulation
  // -------------------------------------------------------------
  const predictiveRoadCorridors = useMemo(() => {
    if (!showPredictiveHeatmap || !showCorridorGlow) return [];

    return edges.map((edge, idx) => {
      const nodeA = [...intersections, ...bins, DEPOT_NODE].find(n => n.id === edge.from);
      const nodeB = [...intersections, ...bins, DEPOT_NODE].find(n => n.id === edge.to);
      if (!nodeA || !nodeB) return null;

      const predA = binPredictionMap.get(edge.from);
      const predB = binPredictionMap.get(edge.to);

      // Max projected saturation along this road segment
      const fillA = predA ? predA.projectedFill : (edge.from.startsWith('BIN-') ? 55 : 30);
      const fillB = predB ? predB.projectedFill : (edge.to.startsWith('BIN-') ? 55 : 30);
      const maxFill = Math.max(fillA, fillB);

      // Only highlight segments leading to containers with impending volume (>= 65%)
      if (maxFill < 65) return null;

      const isCritical = maxFill >= 85;
      const isElevated = maxFill >= 72;

      return {
        id: `pred-corridor-${idx}`,
        nodeA,
        nodeB,
        maxFill,
        isCritical,
        isElevated,
        strokeColor: isCritical ? '#d946ef' : isElevated ? '#a855f7' : '#06b6d4',
        strokeWidth: isCritical ? 4.5 : isElevated ? 3.5 : 2.2,
        opacity: isCritical ? 0.85 : isElevated ? 0.65 : 0.45,
      };
    }).filter((c): c is NonNullable<typeof c> => c !== null);
  }, [edges, intersections, bins, binPredictionMap, showPredictiveHeatmap, showCorridorGlow]);

  const selectedBinPrediction = selectedBin ? binPredictionMap.get(selectedBin.id) : null;

  // Track truck heading / rotation angle based on movement trajectory during dispatch
  const prevTruckCoordsRef = React.useRef<Record<string, { x: number; y: number; heading: number }>>({});
  const truckHeadings = useMemo(() => {
    const headings: Record<string, number> = {};
    trucks.forEach(t => {
      const prev = prevTruckCoordsRef.current[t.id];
      if (prev) {
        const dx = t.currentX - prev.x;
        const dy = t.currentY - prev.y;
        // If moved more than 2 pixels, calculate new heading
        if (Math.hypot(dx, dy) > 2) {
          headings[t.id] = Math.round(Math.atan2(dy, dx) * (180 / Math.PI));
        } else {
          headings[t.id] = prev.heading;
        }
      } else {
        headings[t.id] = 0;
      }
      prevTruckCoordsRef.current[t.id] = { x: t.currentX, y: t.currentY, heading: headings[t.id] };
    });
    return headings;
  }, [trucks]);

  return (
    <div className="space-y-5">
      {/* Map Control Header */}
      <div className="bg-[#090e1c]/80 backdrop-blur-xl border border-white/[0.08] rounded-2xl p-5 flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 shadow-2xl">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
            <span>Metropolis Spatial GIS</span>
            <span className="text-slate-600">/</span>
            <span className="text-emerald-400 font-mono">1000m × 700m Road Grid</span>
            <span className="text-slate-600">/</span>
            <span className="text-purple-400 font-mono flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              ML Heatmap Overlay
            </span>
          </div>
          <h1 className="font-display text-lg sm:text-xl font-bold text-white tracking-tight mt-1">
            City Waste Heatmap & Predictive Spatial Saturation
          </h1>
        </div>

        {/* Layer Toggles & Predictive Horizon Selector */}
        <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto">
          {/* Zone Selector */}
          <div className="flex items-center gap-1.5 bg-slate-950/80 border border-white/[0.08] rounded-xl px-2.5 py-1 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedZone}
              onChange={(e) => setSelectedZone(e.target.value)}
              className="bg-transparent text-slate-200 text-xs focus:outline-none cursor-pointer"
            >
              {zones.map(z => (
                <option key={z} value={z} className="bg-[#0b101f] text-slate-200">
                  {z}
                </option>
              ))}
            </select>
          </div>

          {/* Toggle Predictive Fill-Level Heatmap (Primary Feature) */}
          <button
            onClick={() => setShowPredictiveHeatmap(!showPredictiveHeatmap)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-xl border font-medium transition active:scale-[0.98] ${
              showPredictiveHeatmap
                ? 'bg-purple-950/60 text-purple-200 border-purple-500/60 shadow-lg shadow-purple-950/50'
                : 'bg-slate-900/60 text-slate-400 border-white/[0.08] hover:text-slate-200'
            }`}
          >
            <Sparkles className={`w-3.5 h-3.5 ${showPredictiveHeatmap ? 'text-purple-400 animate-pulse' : 'text-slate-400'}`} />
            <span>Predictive Heatmap</span>
            {showPredictiveHeatmap && (
              <span className="px-1.5 py-0.2 bg-purple-900/90 text-purple-200 rounded text-[10px] font-mono font-bold">
                +{predictiveHorizonHours}h
              </span>
            )}
          </button>

          {/* Predictive Horizon Buttons (Visible when predictive heatmap is active) */}
          {showPredictiveHeatmap && (
            <div className="flex items-center bg-slate-950/80 border border-purple-800/50 rounded-xl p-0.5 text-xs font-mono">
              {[4, 8, 12, 24].map(h => (
                <button
                  key={h}
                  onClick={() => setPredictiveHorizonHours(h)}
                  className={`px-2 py-0.5 rounded-lg text-[11px] transition ${
                    predictiveHorizonHours === h
                      ? 'bg-purple-600 text-white font-bold shadow-sm'
                      : 'text-purple-300/70 hover:text-purple-200 hover:bg-slate-800/60'
                  }`}
                >
                  +{h}h
                </button>
              ))}
            </div>
          )}

          {/* Toggle Current Heatmap */}
          <button
            onClick={() => setShowHeatmap(!showHeatmap)}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-xl border transition ${
              showHeatmap
                ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                : 'bg-slate-900/60 text-slate-400 border-white/[0.08]'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Current Heat</span>
          </button>

          {/* Toggle Roads */}
          <button
            onClick={() => setShowRoads(!showRoads)}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-xl border transition ${
              showRoads
                ? 'bg-sky-500/15 text-sky-300 border-sky-500/30'
                : 'bg-slate-900/60 text-slate-400 border-white/[0.08]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Road Graph</span>
          </button>

          {/* Toggle Trucks */}
          <button
            onClick={() => setShowTrucks(!showTrucks)}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-xl border transition ${
              showTrucks
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                : 'bg-slate-900/60 text-slate-400 border-white/[0.08]'
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            <span>Fleet</span>
          </button>
        </div>
      </div>

      {/* Map Canvas / SVG Viewport */}
      <div className="bg-[#050811] border border-white/[0.08] rounded-2xl overflow-hidden relative shadow-2xl">
        {/* Predictive Spatial Telemetry Floating HUD (Top Right) */}
        {showPredictiveHeatmap && (
          <div className="absolute top-4 right-4 z-20 bg-slate-950/90 backdrop-blur border border-purple-800/60 p-3 rounded-xl text-xs space-y-2 shadow-2xl max-w-xs animate-in fade-in duration-300">
            <div className="flex items-center justify-between border-b border-purple-900/60 pb-1.5">
              <div className="flex items-center gap-1.5 text-purple-300 font-semibold">
                <Sparkles className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
                <span>AI Predictive Heatmap Overlay</span>
              </div>
              <span className="font-mono text-[10px] text-purple-400 bg-purple-950/80 px-2 py-0.5 rounded border border-purple-800/50">
                +{predictiveHorizonHours}h Forecast
              </span>
            </div>

            <div className="space-y-1 text-[11px] text-slate-300">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Projected Critical (≥85%):</span>
                <span className={`font-mono font-bold ${predictiveStats.criticalCount > 0 ? 'text-fuchsia-400' : 'text-emerald-400'}`}>
                  {predictiveStats.criticalCount} containers
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Approaching Full (70–84%):</span>
                <span className="font-mono text-purple-300 font-semibold">
                  {predictiveStats.approachingCount} containers
                </span>
              </div>
              {predictiveStats.fastestBin && (
                <div className="flex justify-between items-center pt-0.5">
                  <span className="text-slate-400">Fastest Accumulation:</span>
                  <span className="font-mono text-amber-300 truncate max-w-[120px]">
                    {predictiveStats.fastestBin.id} (+{predictiveStats.maxDelta}%)
                  </span>
                </div>
              )}
            </div>

            {/* Quick Horizon Buttons in HUD */}
            <div className="pt-1.5 border-t border-purple-900/40 flex items-center justify-between text-[10px]">
              <span className="text-slate-400">Lookahead:</span>
              <div className="flex items-center gap-1 font-mono">
                {[4, 8, 12, 24].map(h => (
                  <button
                    key={h}
                    onClick={() => setPredictiveHorizonHours(h)}
                    className={`px-1.5 py-0.5 rounded transition ${
                      predictiveHorizonHours === h
                        ? 'bg-purple-600 text-white font-bold'
                        : 'bg-slate-900 text-slate-400 hover:text-white'
                    }`}
                  >
                    +{h}h
                  </button>
                ))}
              </div>
            </div>

            {/* Road Corridor Toggle */}
            <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
              <span>Road Corridor Influx Glow:</span>
              <button
                onClick={() => setShowCorridorGlow(!showCorridorGlow)}
                className={`px-1.5 py-0.5 rounded font-mono transition ${
                  showCorridorGlow
                    ? 'bg-purple-950 text-purple-300 border border-purple-800'
                    : 'bg-slate-900 text-slate-500'
                }`}
              >
                {showCorridorGlow ? 'ON' : 'OFF'}
              </button>
            </div>
          </div>
        )}

        {/* Spatial Symbology Legend (Top Left) */}
        <div className="absolute top-4 left-4 z-10 bg-slate-900/90 backdrop-blur border border-slate-800 p-3 rounded-xl text-xs space-y-2 pointer-events-none hidden sm:block max-w-[200px]">
          <div className="font-semibold text-white text-[11px] uppercase tracking-wider font-mono">
            Spatial Symbology
          </div>

          {/* Current Heatmap Legend */}
          <div className="space-y-1 text-[11px] text-slate-300">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 border border-white/40" />
              <span>Current Critical (≥85%)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 border border-white/40" />
              <span>Approaching Full (70–84%)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border border-white/40" />
              <span>Nominal (&lt;70%)</span>
            </div>
          </div>

          {/* Predictive Overlay Legend (shown when active) */}
          {showPredictiveHeatmap && (
            <div className="pt-1.5 border-t border-slate-800/80 space-y-1 text-[11px]">
              <div className="text-[10px] font-mono text-purple-300 font-semibold uppercase flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5" />
                <span>Projected (+{predictiveHorizonHours}h)</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full bg-fuchsia-500 shadow-sm shadow-fuchsia-500" />
                <span>Projected Critical (≥85%)</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                <span>Projected High (70–84%)</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <span className="w-3.5 h-0.5 bg-fuchsia-400 rounded-full" />
                <span>Corridor Influx Heat</span>
              </div>
            </div>
          )}

          <div className="pt-1 border-t border-slate-800/80 flex items-center gap-2 text-slate-300 text-[11px]">
            <span className="w-3.5 h-3.5 rounded bg-indigo-500 flex items-center justify-center text-[9px] text-white font-bold">
              D
            </span>
            <span>Central Depot / MRF</span>
          </div>
        </div>

        {/* SVG City Map Container */}
        <div className="w-full aspect-[10/7] relative overflow-hidden bg-[#090d16]">
          <svg
            viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
            className="w-full h-full select-none"
          >
            <defs>
              {/* Standard Current Fill Heatmap Gradients */}
              <radialGradient id="heat-critical" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.75" />
                <stop offset="40%" stopColor="#fb923c" stopOpacity="0.45" />
                <stop offset="80%" stopColor="#facc15" stopOpacity="0.15" />
                <stop offset="100%" stopColor="#000000" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="heat-medium" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.55" />
                <stop offset="50%" stopColor="#10b981" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#000000" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="heat-low" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#000000" stopOpacity="0" />
              </radialGradient>

              {/* ------------------------------------------------------------- */}
              {/* ML PREDICTIVE HEATMAP GRADIENTS (High-Tech Violet/Fuchsia)   */}
              {/* ------------------------------------------------------------- */}
              <radialGradient id="pred-heat-critical" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#d946ef" stopOpacity="0.85" />
                <stop offset="35%" stopColor="#a855f7" stopOpacity="0.55" />
                <stop offset="70%" stopColor="#6366f1" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#000000" stopOpacity="0" />
              </radialGradient>

              <radialGradient id="pred-heat-elevated" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#a855f7" stopOpacity="0.75" />
                <stop offset="40%" stopColor="#06b6d4" stopOpacity="0.38" />
                <stop offset="75%" stopColor="#0284c7" stopOpacity="0.15" />
                <stop offset="100%" stopColor="#000000" stopOpacity="0" />
              </radialGradient>

              <radialGradient id="pred-heat-moderate" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.55" />
                <stop offset="50%" stopColor="#0284c7" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#000000" stopOpacity="0" />
              </radialGradient>

              {/* Active Fleet Truck Headlight Beam Projection */}
              <linearGradient id="headlight-beam" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#fef08a" stopOpacity="0.55" />
                <stop offset="100%" stopColor="#fef08a" stopOpacity="0" />
              </linearGradient>

              {/* Luminous Vehicle Aura Glow Filter */}
              <filter id="truck-glow-active" x="-50%" y="-50%" width="200%" height="200%">
                <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor="#10b981" floodOpacity="0.65" />
              </filter>
              <filter id="truck-glow-moving" x="-50%" y="-50%" width="200%" height="200%">
                <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor="#38bdf8" floodOpacity="0.75" />
              </filter>

              {/* City Grid pattern */}
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1e293b" strokeWidth="0.5" strokeOpacity="0.3" />
              </pattern>
            </defs>

            {/* City Ground Grid */}
            <rect width="1000" height="700" fill="url(#grid)" />

            {/* Zone Districts Watermark Boundaries */}
            <g opacity="0.14">
              <rect x="380" y="160" width="300" height="180" rx="16" fill="#3b82f6" />
              <rect x="140" y="180" width="220" height="400" rx="16" fill="#10b981" />
              <rect x="740" y="140" width="220" height="400" rx="16" fill="#06b6d4" />
              <rect x="360" y="480" width="360" height="170" rx="16" fill="#f59e0b" />
              <rect x="200" y="80" width="260" height="90" rx="12" fill="#8b5cf6" />
            </g>

            {/* District Labels */}
            <g fill="#475569" fontSize="12" fontFamily="sans-serif" fontWeight="600" letterSpacing="2">
              <text x="530" y="180" textAnchor="middle">DOWNTOWN COMMERCIAL</text>
              <text x="250" y="210" textAnchor="middle">RESIDENTIAL WEST</text>
              <text x="850" y="170" textAnchor="middle">WATERFRONT BOARDWALK</text>
              <text x="540" y="660" textAnchor="middle">INDUSTRIAL LOGISTICS HUB</text>
              <text x="330" y="100" textAnchor="middle">UNIVERSITY CAMPUS</text>
            </g>

            {/* Road Network Graph Base Edges */}
            {showRoads && (
              <g>
                {edges.map((edge, index) => {
                  const nodeA = [...intersections, ...bins, DEPOT_NODE].find(n => n.id === edge.from);
                  const nodeB = [...intersections, ...bins, DEPOT_NODE].find(n => n.id === edge.to);
                  if (!nodeA || !nodeB) return null;

                  const strokeColor =
                    edge.trafficFactor >= 1.25 ? '#ef4444' : edge.trafficFactor >= 1.1 ? '#f59e0b' : '#334155';
                  const strokeWidth = edge.trafficFactor >= 1.25 ? 2.5 : 1.8;

                  return (
                    <line
                      key={`edge-${index}`}
                      x1={nodeA.x}
                      y1={nodeA.y}
                      x2={nodeB.x}
                      y2={nodeB.y}
                      stroke={strokeColor}
                      strokeWidth={strokeWidth}
                      strokeDasharray={edge.trafficFactor >= 1.25 ? '4,3' : undefined}
                      opacity={0.65}
                    />
                  );
                })}

                {/* Road Intersections */}
                {intersections.map(node => (
                  <circle
                    key={node.id}
                    cx={node.x}
                    cy={node.y}
                    r={3}
                    fill="#64748b"
                    opacity={0.6}
                  />
                ))}
              </g>
            )}

            {/* A* Optimized Active Routes (Dispatched Trucks) */}
            {showRoutePath && activeRouteLegs.length > 0 && (
              <g>
                {activeRouteLegs.map((leg, legIdx) => {
                  if (!leg.pathCoordinates || leg.pathCoordinates.length < 2) return null;
                  const pathData = leg.pathCoordinates
                    .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`)
                    .join(' ');

                  return (
                    <g key={`route-leg-${legIdx}`}>
                      <path
                        d={pathData}
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="5"
                        strokeOpacity="0.3"
                      />
                      <path
                        d={pathData}
                        fill="none"
                        stroke="#34d399"
                        strokeWidth="2.5"
                        strokeDasharray="6,4"
                        strokeLinecap="round"
                      />
                    </g>
                  );
                })}
              </g>
            )}

            {/* ------------------------------------------------------------- */}
            {/* PREDICTIVE FILL-LEVEL HEATMAP GRADIENT ON TOP OF ROAD GRAPH   */}
            {/* ------------------------------------------------------------- */}
            {showPredictiveHeatmap && (
              <g className="predictive-heatmap-overlay" style={{ mixBlendMode: 'screen' }}>
                {/* 1. Road Corridor Predictive Heat Streaks */}
                {predictiveRoadCorridors.map(corridor => {
                  if (!corridor) return null;
                  return (
                    <g key={corridor.id}>
                      {/* Outer aura glow on the road segment */}
                      <line
                        x1={corridor.nodeA.x}
                        y1={corridor.nodeA.y}
                        x2={corridor.nodeB.x}
                        y2={corridor.nodeB.y}
                        stroke={corridor.strokeColor}
                        strokeWidth={corridor.strokeWidth * 2.2}
                        strokeOpacity={corridor.opacity * 0.4}
                        strokeLinecap="round"
                      />
                      {/* Core radiant predictive heat line */}
                      <line
                        x1={corridor.nodeA.x}
                        y1={corridor.nodeA.y}
                        x2={corridor.nodeB.x}
                        y2={corridor.nodeB.y}
                        stroke={corridor.strokeColor}
                        strokeWidth={corridor.strokeWidth}
                        strokeOpacity={corridor.opacity}
                        strokeLinecap="round"
                        strokeDasharray={corridor.isCritical ? '8,4' : undefined}
                      />
                    </g>
                  );
                })}

                {/* 2. Predictive Spatial Fill Radial Glow Gradients at Container Coordinates */}
                {filteredBins.map(bin => {
                  const pred = binPredictionMap.get(bin.id);
                  if (!pred) return null;

                  // Radius and gradient determined by ML predicted fill at the chosen horizon
                  const radius =
                    pred.projectedFill >= 85
                      ? 105
                      : pred.projectedFill >= 70
                      ? 80
                      : pred.projectedFill >= 50
                      ? 55
                      : 35;

                  const gradientId =
                    pred.projectedFill >= 85
                      ? 'url(#pred-heat-critical)'
                      : pred.projectedFill >= 70
                      ? 'url(#pred-heat-elevated)'
                      : 'url(#pred-heat-moderate)';

                  return (
                    <g key={`pred-heat-${bin.id}`}>
                      {/* Main predictive heat cluster */}
                      <circle
                        cx={bin.x}
                        cy={bin.y}
                        r={radius}
                        fill={gradientId}
                        className="pointer-events-none transition-all duration-700"
                      />

                      {/* Pulsing warning aura for containers projected to exceed threshold */}
                      {pred.isCritical && (
                        <circle
                          cx={bin.x}
                          cy={bin.y}
                          r={radius * 0.55}
                          fill="none"
                          stroke="#d946ef"
                          strokeWidth="1.5"
                          strokeDasharray="4,3"
                          opacity="0.7"
                          className="animate-pulse"
                        />
                      )}
                    </g>
                  );
                })}
              </g>
            )}

            {/* Standard Current Fill Heatmap (if toggled on simultaneously) */}
            {showHeatmap && (
              <g style={{ mixBlendMode: 'screen' }}>
                {filteredBins.map(bin => {
                  const radius = bin.fillLevel >= 85 ? 90 : bin.fillLevel >= 70 ? 65 : 40;
                  const gradientId =
                    bin.fillLevel >= 85
                      ? 'url(#heat-critical)'
                      : bin.fillLevel >= 70
                      ? 'url(#heat-medium)'
                      : 'url(#heat-low)';

                  return (
                    <circle
                      key={`heat-${bin.id}`}
                      cx={bin.x}
                      cy={bin.y}
                      r={radius}
                      fill={gradientId}
                      className="pointer-events-none transition-all duration-700"
                    />
                  );
                })}
              </g>
            )}

            {/* Central Depot / Recovery Facility */}
            <g
              transform={`translate(${DEPOT_NODE.x}, ${DEPOT_NODE.y})`}
              className="cursor-pointer"
            >
              <circle r="22" fill="#1e1b4b" stroke="#6366f1" strokeWidth="2.5" />
              <rect x="-10" y="-10" width="20" height="20" rx="3" fill="#6366f1" />
              <text
                y="3.5"
                textAnchor="middle"
                fill="#ffffff"
                fontSize="10"
                fontFamily="sans-serif"
                fontWeight="bold"
              >
                DEPOT
              </text>
              <text
                y="34"
                textAnchor="middle"
                fill="#818cf8"
                fontSize="9"
                fontFamily="sans-serif"
                fontWeight="600"
              >
                Central Material Recovery
              </text>
            </g>

            {/* Smart Bins Nodes with Telemetry Rings & Predictive Fill Badges */}
            {filteredBins.map(bin => {
              const isSelected = selectedBin?.id === bin.id;
              const pred = binPredictionMap.get(bin.id);
              const isCurrentCritical = bin.fillLevel >= 85;
              const isCurrentApproaching = bin.fillLevel >= 70 && bin.fillLevel < 85;
              const fillColor = isCurrentCritical ? '#f43f5e' : isCurrentApproaching ? '#f59e0b' : '#10b981';

              // Predictive indicator color
              const predColor = pred?.isCritical ? '#d946ef' : pred?.isApproaching ? '#a855f7' : '#06b6d4';

              return (
                <g
                  key={bin.id}
                  transform={`translate(${bin.x}, ${bin.y})`}
                  onClick={() => onSelectBin(bin)}
                  className="cursor-pointer group"
                >
                  {/* Selection pulse ring */}
                  {isSelected && (
                    <circle
                      r="19"
                      fill="none"
                      stroke="#38bdf8"
                      strokeWidth="2.5"
                      className="animate-ping"
                    />
                  )}

                  {/* Pulsing ring for current overflow */}
                  {isCurrentCritical && (
                    <circle
                      r="16"
                      fill="none"
                      stroke="#f43f5e"
                      strokeWidth="1.5"
                      opacity="0.8"
                    />
                  )}

                  {/* Predictive Future Warning Ring (when predictive overlay is active) */}
                  {showPredictiveHeatmap && pred?.isCritical && !isCurrentCritical && (
                    <circle
                      r="17"
                      fill="none"
                      stroke="#d946ef"
                      strokeWidth="1.8"
                      strokeDasharray="3,2"
                      opacity="0.9"
                      className="animate-pulse"
                    />
                  )}

                  {/* Outer circle housing */}
                  <circle
                    r="11"
                    fill="#0f172a"
                    stroke={isSelected ? '#38bdf8' : showPredictiveHeatmap && pred?.isCritical ? '#d946ef' : fillColor}
                    strokeWidth={isSelected ? '2.5' : '2'}
                  />

                  {/* Inner fill arc / level indicator */}
                  <circle
                    r="6.5"
                    fill={fillColor}
                    opacity="0.95"
                  />

                  {/* Bin ID Label */}
                  <text
                    y="-15"
                    textAnchor="middle"
                    fill={isSelected ? '#38bdf8' : '#e2e8f0'}
                    fontSize="9.5"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    {bin.id}
                  </text>

                  {/* Dual Telemetry Label: Current vs Predicted */}
                  {showPredictiveHeatmap && pred ? (
                    <g>
                      <text
                        y="22"
                        textAnchor="middle"
                        fill={fillColor}
                        fontSize="8"
                        fontFamily="monospace"
                        fontWeight="bold"
                      >
                        {bin.fillLevel}%
                      </text>
                      <text
                        y="31"
                        textAnchor="middle"
                        fill={predColor}
                        fontSize="7.5"
                        fontFamily="monospace"
                        fontWeight="bold"
                      >
                        +{predictiveHorizonHours}h: {pred.projectedFill}%
                      </text>
                    </g>
                  ) : (
                    <text
                      y="22"
                      textAnchor="middle"
                      fill={fillColor}
                      fontSize="8.5"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      {bin.fillLevel}%
                    </text>
                  )}
                </g>
              );
            })}

            {/* Active Fleet Trucks (Smooth Hardware-Accelerated Animated Markers) */}
            {showTrucks &&
              trucks.map(truck => {
                const isWorking = truck.status !== 'Idle' && truck.status !== 'Off-Duty';
                const isCollecting = truck.status === 'Collecting';
                const heading = truckHeadings[truck.id] || 0;
                const loadPercent = Math.min(100, Math.round((truck.currentLoadKg / truck.capacityKg) * 100));

                return (
                  <g
                    key={truck.id}
                    style={{
                      transform: `translate(${truck.currentX}px, ${truck.currentY}px)`,
                      transition: 'transform 1400ms cubic-bezier(0.22, 1, 0.36, 1)',
                      willChange: 'transform',
                    }}
                    className="pointer-events-none"
                  >
                    {/* Sonar Radar Pulse when Active */}
                    {isWorking && (
                      <>
                        {/* Outer expanding sonar wave */}
                        <circle
                          r="22"
                          fill="none"
                          stroke={isCollecting ? "#10b981" : "#38bdf8"}
                          strokeWidth="1.5"
                          className="animate-ping"
                          opacity="0.35"
                        />
                        {/* Inner rotating sensor halo */}
                        <circle
                          r="16"
                          fill={isCollecting ? "rgba(16, 185, 129, 0.1)" : "rgba(56, 189, 248, 0.1)"}
                          stroke={isCollecting ? "#10b981" : "#38bdf8"}
                          strokeWidth="1"
                          strokeDasharray="4 2"
                          className="animate-spin"
                          style={{ animationDuration: '6s' }}
                        />
                      </>
                    )}

                    {/* Directional Rotating Vehicle Chassis */}
                    <g
                      style={{
                        transform: `rotate(${heading}deg)`,
                        transformOrigin: '0px 0px',
                        transition: 'transform 800ms cubic-bezier(0.34, 1.56, 0.64, 1)',
                      }}
                    >
                      {/* Headlights beam projection when en route or collecting */}
                      {isWorking && (
                        <polygon
                          points="10,-6 28,-14 28,14 10,6"
                          fill="url(#headlight-beam)"
                        />
                      )}

                      {/* Rear municipal compactor hopper body */}
                      <rect
                        x="-14"
                        y="-8.5"
                        width="16"
                        height="17"
                        rx="2"
                        fill="#0c1322"
                        stroke={isWorking ? (isCollecting ? "#10b981" : "#38bdf8") : "#475569"}
                        strokeWidth="1.5"
                      />

                      {/* Compactor load bar strip on hopper */}
                      <rect
                        x="-12"
                        y="-6.5"
                        width="3"
                        height="13"
                        rx="1"
                        fill="#1e293b"
                      />
                      <rect
                        x="-12"
                        y={-6.5 + (13 * (1 - loadPercent / 100))}
                        width="3"
                        height={13 * (loadPercent / 100)}
                        rx="1"
                        fill={loadPercent > 80 ? "#f43f5e" : loadPercent > 50 ? "#f59e0b" : "#10b981"}
                      />

                      {/* Front Driver Cabin */}
                      <rect
                        x="2"
                        y="-7.5"
                        width="11"
                        height="15"
                        rx="3"
                        fill={truck.fuelType === 'EV Clean Electric' ? '#059669' : '#0284c7'}
                        stroke="#ffffff"
                        strokeWidth="1.5"
                      />

                      {/* Windshield Glass Highlight */}
                      <rect
                        x="7"
                        y="-5.5"
                        width="4.5"
                        height="11"
                        rx="1.5"
                        fill="#bae6fd"
                        opacity="0.9"
                      />

                      {/* Flashing Amber Roof Light Bar */}
                      <circle
                        cx="3.5"
                        cy="0"
                        r="2.2"
                        fill={isWorking ? "#f59e0b" : "#64748b"}
                        className={isWorking ? "animate-pulse" : ""}
                        stroke="#ffffff"
                        strokeWidth="0.5"
                      />
                    </g>

                    {/* Upright Telemetry Badge (Always stays horizontal for readability) */}
                    <g transform="translate(0, -23)">
                      <rect
                        x="-32"
                        y="-9"
                        width="64"
                        height="17"
                        rx="8.5"
                        fill="#060913"
                        stroke={isWorking ? (isCollecting ? "#10b981" : "#38bdf8") : "#334155"}
                        strokeWidth="1"
                        opacity="0.95"
                      />
                      <circle
                        cx="-22"
                        cy="-0.5"
                        r="2.5"
                        fill={isWorking ? (isCollecting ? "#10b981" : "#38bdf8") : "#64748b"}
                        className={isWorking ? "animate-pulse" : ""}
                      />
                      <text
                        x="-3"
                        y="2.5"
                        textAnchor="middle"
                        fill="#ffffff"
                        fontSize="7.5"
                        fontFamily="monospace"
                        fontWeight="bold"
                      >
                        {truck.id} {isWorking ? `(${loadPercent}%)` : '· Idle'}
                      </text>
                    </g>
                  </g>
                );
              })}
          </svg>
        </div>
      </div>

      {/* Selected Bin Fast Telemetry & ML Forecast Card */}
      {selectedBin && (
        <div className="bg-[#090e1c]/80 backdrop-blur-xl border border-white/[0.08] rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-2xl animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <div className={`h-12 w-12 rounded-xl flex items-center justify-center font-bold font-mono text-white text-base shadow-md ${
              selectedBin.fillLevel >= 85 ? 'bg-rose-500 shadow-rose-950/60' : selectedBin.fillLevel >= 70 ? 'bg-amber-500 shadow-amber-950/60' : 'bg-emerald-500 shadow-emerald-950/60'
            }`}>
              {selectedBin.fillLevel}%
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display font-bold text-white text-base">{selectedBin.name}</span>
                <span className="text-xs font-mono text-emerald-400 bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-800/40">{selectedBin.id}</span>
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                <span>{selectedBin.zone}</span> · <span>{selectedBin.wasteType}</span> · <span className="font-mono">Weight: {selectedBin.currentWeightKg} kg</span>
              </div>
            </div>
          </div>

          {/* Predictive ML Forecast Stats for Selected Container */}
          {selectedBinPrediction && (
            <div className="flex flex-wrap items-center gap-5 text-xs font-mono border-t md:border-t-0 md:border-l border-white/[0.08] pt-3 md:pt-0 md:pl-5">
              <div>
                <span className="text-slate-400 block text-[10px] font-sans">CURRENT FILL</span>
                <span className="text-white font-bold text-sm">{selectedBin.fillLevel}%</span>
              </div>
              <div>
                <span className="text-purple-400 block text-[10px] font-sans">
                  PREDICTED (+{predictiveHorizonHours}h)
                </span>
                <span className={`font-bold text-sm ${selectedBinPrediction.isCritical ? 'text-fuchsia-400' : 'text-purple-300'}`}>
                  {selectedBinPrediction.projectedFill}%
                  <span className="text-[11px] text-amber-400 ml-1">
                    (+{selectedBinPrediction.deltaPercent}%)
                  </span>
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] font-sans">HOURS TO FULL</span>
                <span className="text-amber-400 font-bold text-sm">{selectedBinPrediction.hoursUntilFull}h</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] font-sans">ML CONFIDENCE</span>
                <span className="text-emerald-400 font-bold text-sm">{selectedBinPrediction.confidence}%</span>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 w-full md:w-auto self-end md:self-auto">
            <button
              onClick={() => onSelectBin(selectedBin)}
              className="flex-1 md:flex-initial px-4 py-2.5 text-xs font-semibold text-white bg-slate-800/80 hover:bg-slate-700/80 border border-white/[0.1] rounded-xl shadow-sm transition active:scale-[0.98]"
            >
              Open Full Diagnostic
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
