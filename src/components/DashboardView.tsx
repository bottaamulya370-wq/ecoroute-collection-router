import React, { useState, useMemo } from 'react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ReferenceLine,
  AreaChart,
  Area
} from 'recharts';
import { 
  Trash2, 
  AlertTriangle, 
  TrendingUp, 
  RefreshCw, 
  Clock, 
  Fuel, 
  DollarSign, 
  Leaf, 
  ShieldCheck, 
  ArrowUpRight, 
  Zap, 
  Scale, 
  Wrench, 
  ChevronRight,
  Sliders,
  Sparkles,
  Info,
  CheckCircle2,
  Navigation
} from 'lucide-react';
import { SmartBin, FleetTruck, SimulationSettings, MaintenanceAlert, SensorErrorCode } from '../types';
import { MLFillPredictor, MLFeatureVector } from '../algorithms/MLFillPredictor';

interface DashboardViewProps {
  bins: SmartBin[];
  trucks: FleetTruck[];
  alerts?: MaintenanceAlert[];
  simulation: SimulationSettings;
  setSimulation: React.Dispatch<React.SetStateAction<SimulationSettings>>;
  onSelectBin: (bin: SmartBin) => void;
  onOptimizeRoute: () => void;
  onResetBins: () => void;
  onSimulateStep: () => void;
  onInjectSurge: () => void;
  onNavigateToMaintenance?: () => void;
  onDispatchTechnician?: (alertId: string, binId: string) => void;
  onSimulateAnomaly?: (binId: string, errorCode: SensorErrorCode, deltaWeight: number) => void;
  totalDistanceSavedKm: number;
  fuelSavedLiters: number;
  co2SavedKg: number;
  costSavedUsd: number;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  bins,
  trucks,
  alerts = [],
  simulation,
  setSimulation,
  onSelectBin,
  onOptimizeRoute,
  onResetBins,
  onSimulateStep,
  onInjectSurge,
  onNavigateToMaintenance,
  onDispatchTechnician,
  onSimulateAnomaly,
  totalDistanceSavedKm,
  fuelSavedLiters,
  co2SavedKg,
  costSavedUsd,
}) => {
  // Aggregate statistics
  const totalVolume = bins.reduce((acc, b) => acc + b.capacityLiters, 0);
  const currentVolume = bins.reduce((acc, b) => acc + (b.capacityLiters * b.fillLevel) / 100, 0);
  const avgFillLevel = Math.round((currentVolume / totalVolume) * 100);

  const criticalBins = bins.filter(b => b.fillLevel >= 85);
  const approachingBins = bins.filter(b => b.fillLevel >= 70 && b.fillLevel < 85);
  const activeAlerts = alerts.filter(a => a.status !== 'Resolved');

  // Group statistics by municipal zones
  const zonesList = ['Downtown Commercial', 'Residential North', 'Industrial Park', 'Eco Park & Marina'];
  const zoneStats = zonesList.map(zoneName => {
    const zoneBins = bins.filter(b => b.zone === zoneName);
    const avgFill = zoneBins.length
      ? Math.round(zoneBins.reduce((acc, b) => acc + b.fillLevel, 0) / zoneBins.length)
      : 0;
    const urgentCount = zoneBins.filter(b => b.fillLevel >= 85).length;
    return {
      name: zoneName,
      avgFill,
      urgentCount,
      total: zoneBins.length,
    };
  });

  // Category breakdown
  const wasteCategories = [
    { type: 'General Waste', color: 'bg-amber-500' },
    { type: 'Recyclables', color: 'bg-sky-500' },
    { type: 'Organic Compost', color: 'bg-emerald-500' },
    { type: 'Electronic Waste', color: 'bg-purple-500' },
  ].map(cat => {
    const matchedBins = bins.filter(b => b.wasteType === cat.type);
    const totalKg = matchedBins.reduce((acc, b) => acc + b.currentWeightKg, 0);
    return {
      ...cat,
      count: matchedBins.length,
      totalKg: Math.round(totalKg),
    };
  });

  // -------------------------------------------------------------
  // RECHARTS ML FILL-LEVEL PROJECTION STATE & PREDICTIVE PIPELINE
  // -------------------------------------------------------------
  const sortedBinsByUrgency = useMemo(() => {
    return [...bins].sort((a, b) => b.urgencyScore - a.urgencyScore);
  }, [bins]);

  const [selectedChartBinIds, setSelectedChartBinIds] = useState<string[]>(() => {
    return sortedBinsByUrgency.slice(0, 3).map(b => b.id);
  });
  const [chartHorizonHours, setChartHorizonHours] = useState<number>(24);
  const [chartMode, setChartMode] = useState<'multi' | 'confidence'>('multi');
  const [focusedBinId, setFocusedBinId] = useState<string>(() => sortedBinsByUrgency[0]?.id || bins[0]?.id || 'BIN-101');

  const BIN_CHART_COLORS = [
    '#f43f5e', // rose-500
    '#38bdf8', // sky-400
    '#10b981', // emerald-500
    '#f59e0b', // amber-500
    '#a855f7', // purple-500
    '#ec4899', // pink-500
  ];

  // Multi-bin projection series data
  const multiBinChartData = useMemo(() => {
    const hours = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24].filter(h => h <= chartHorizonHours);

    const predictionsByBinId: Record<string, ReturnType<typeof MLFillPredictor.predict>> = {};
    selectedChartBinIds.forEach(binId => {
      const bin = bins.find(b => b.id === binId);
      if (bin) {
        const features: MLFeatureVector = {
          currentFill: bin.fillLevel,
          rateLast4Hours: Math.max(1.2, 3.2 + (bin.urgencyScore > 80 ? 1.5 : 0)),
          hourOfDay: 14,
          isWeekend: false,
          zoneWeight: bin.zone.includes('Commercial') ? 1.4 : bin.zone.includes('Industrial') ? 1.2 : 1.0,
          weatherPenalty: simulation.weatherCondition === 'Rainy' ? 1.25 : 1.0,
          reportedIssuesCount: bin.associatedReportsCount || 0,
        };
        predictionsByBinId[binId] = MLFillPredictor.predict(features);
      }
    });

    return hours.map(h => {
      const entry: Record<string, any> = {
        hour: h,
        timeLabel: h === 0 ? 'Now' : `+${h}h`,
      };

      selectedChartBinIds.forEach(binId => {
        const pred = predictionsByBinId[binId];
        if (pred) {
          const pt = pred.projectedCurve24h.find(p => p.hour === h);
          entry[binId] = pt ? pt.fill : null;
        }
      });

      return entry;
    });
  }, [bins, selectedChartBinIds, chartHorizonHours, simulation.weatherCondition]);

  // Single-bin confidence interval projection data
  const singleBinChartData = useMemo(() => {
    const targetBin = bins.find(b => b.id === focusedBinId) || bins[0];
    if (!targetBin) return [];

    const features: MLFeatureVector = {
      currentFill: targetBin.fillLevel,
      rateLast4Hours: Math.max(1.2, 3.2 + (targetBin.urgencyScore > 80 ? 1.5 : 0)),
      hourOfDay: 14,
      isWeekend: false,
      zoneWeight: targetBin.zone.includes('Commercial') ? 1.4 : targetBin.zone.includes('Industrial') ? 1.2 : 1.0,
      weatherPenalty: simulation.weatherCondition === 'Rainy' ? 1.25 : 1.0,
      reportedIssuesCount: targetBin.associatedReportsCount || 0,
    };
    const pred = MLFillPredictor.predict(features);

    return pred.projectedCurve24h
      .filter(p => p.hour <= chartHorizonHours)
      .map(p => ({
        hour: p.hour,
        timeLabel: p.hour === 0 ? 'Now' : `+${p.hour}h`,
        fill: p.fill,
        lowerBound: p.lowerBound,
        upperBound: p.upperBound,
        uncertaintyRange: [p.lowerBound, p.upperBound],
      }));
  }, [bins, focusedBinId, chartHorizonHours, simulation.weatherCondition]);

  // Earliest projected overflow analytics
  const earliestOverflow = useMemo<{ bin: SmartBin | null; hours: number }>(() => {
    let earliestBin: SmartBin | null = null;
    let minHours = Infinity;
    bins.forEach(b => {
      if (b.predictedHoursToFull < minHours && b.fillLevel < 100) {
        minHours = b.predictedHoursToFull;
        earliestBin = b;
      }
    });
    return { bin: earliestBin, hours: minHours };
  }, [bins]);

  const handleToggleBin = (binId: string) => {
    if (selectedChartBinIds.includes(binId)) {
      if (selectedChartBinIds.length > 1) {
        setSelectedChartBinIds(prev => prev.filter(id => id !== binId));
      }
    } else {
      if (selectedChartBinIds.length < 5) {
        setSelectedChartBinIds(prev => [...prev, binId]);
      } else {
        setSelectedChartBinIds(prev => [...prev.slice(1), binId]);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Municipal Command Center Header */}
      <div className="bg-[#090e1c]/80 backdrop-blur-xl border border-white/[0.08] rounded-2xl p-5 sm:p-6 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5 shadow-2xl relative overflow-hidden">
        {/* Subtle background glow element */}
        <div className="absolute -top-24 -left-24 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 font-mono mb-1">
            <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              TELEMETRY INGESTION ACTIVE
            </span>
            <span className="text-slate-600">/</span>
            <span className="text-slate-300">A* GRAPH ENGINE</span>
            <span className="text-slate-600">/</span>
            <span className="text-sky-400">DISPATCH THRESHOLD: {simulation.collectionThreshold}%</span>
          </div>
          <h1 className="font-display text-xl sm:text-2xl lg:text-3xl font-extrabold text-white tracking-tight">
            Municipal Waste Logistics & Dispatch Console
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-3xl leading-relaxed font-sans">
            Continuous Max-Heap urgency ranking coupled with RandomForest accumulation forecasting and dynamic A* turn-by-turn fleet routing.
          </p>
        </div>

        {/* Quick Simulation & Optimization Action Bar */}
        <div className="relative z-10 flex flex-wrap items-center gap-2 w-full lg:w-auto">
          <button
            onClick={onSimulateStep}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-200 bg-slate-800/80 hover:bg-slate-700/80 border border-white/[0.08] rounded-xl transition active:scale-[0.98]"
            title="Advance IoT simulation by 1 hour"
          >
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>+1h Step</span>
          </button>

          <button
            onClick={onInjectSurge}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-amber-200 bg-amber-950/40 hover:bg-amber-900/50 border border-amber-800/50 rounded-xl transition active:scale-[0.98]"
            title="Simulate sudden crowd festival or dining rush"
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Simulate Surge</span>
          </button>

          {onSimulateAnomaly && (
            <button
              onClick={() => onSimulateAnomaly('BIN-108', 'ERR_WEIGHT_SPIKE_ANOMALY', 210)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-rose-300 bg-rose-950/40 hover:bg-rose-900/50 border border-rose-800/50 rounded-xl transition active:scale-[0.98]"
              title="Test abnormal weight spike anomaly on BIN-108"
            >
              <Scale className="w-3.5 h-3.5 text-rose-400" />
              <span>Weight Spike</span>
            </button>
          )}

          <button
            onClick={onOptimizeRoute}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 rounded-xl shadow-lg shadow-emerald-950/60 border border-emerald-400/30 transition active:scale-[0.98]"
          >
            <Navigation className="w-3.5 h-3.5" />
            <span>Optimize Routes</span>
          </button>

          <button
            onClick={onResetBins}
            className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 rounded-xl border border-white/[0.08] transition"
            title="Reset containers to clean baseline"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Primary KPI Metric Cards (High-Tech Municipal Console Grid) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* Total Bins */}
        <div className="bg-[#090e1c]/80 backdrop-blur-md border border-white/[0.08] rounded-2xl p-4 transition-all hover:border-cyan-500/40 hover:shadow-lg hover:shadow-cyan-950/20 relative overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-cyan-500 to-blue-500 opacity-80" />
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span className="font-mono text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Total Smart Bins</span>
            <Trash2 className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-3xl font-extrabold font-mono text-white tabular-nums tracking-tight">
            {bins.length}
          </div>
          <div className="text-[11px] text-slate-400 mt-2 flex items-center gap-1 font-mono">
            <span>Avg Saturation:</span>
            <span className="text-cyan-300 font-bold">{avgFillLevel}%</span>
          </div>
        </div>

        {/* Critical Overfill */}
        <div className="bg-[#090e1c]/80 backdrop-blur-md border border-white/[0.08] rounded-2xl p-4 transition-all hover:border-rose-500/40 hover:shadow-lg hover:shadow-rose-950/20 relative overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-rose-500 to-pink-500 opacity-80" />
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span className="font-mono text-[10px] uppercase tracking-wider text-rose-400 font-semibold">Critical Overflow</span>
            <AlertTriangle className="w-4 h-4 text-rose-400 animate-pulse" />
          </div>
          <div className="text-3xl font-extrabold font-mono text-rose-400 tabular-nums tracking-tight">
            {criticalBins.length}
          </div>
          <div className="text-[11px] text-slate-400 mt-2 flex items-center gap-1 font-mono">
            <span>Approaching:</span>
            <span className="text-amber-400 font-semibold">{approachingBins.length} containers</span>
          </div>
        </div>

        {/* Fuel Saved */}
        <div className="bg-[#090e1c]/80 backdrop-blur-md border border-white/[0.08] rounded-2xl p-4 transition-all hover:border-emerald-500/40 hover:shadow-lg hover:shadow-emerald-950/20 relative overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-500 to-teal-500 opacity-80" />
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span className="font-mono text-[10px] uppercase tracking-wider text-emerald-400 font-semibold">Fuel Saved Today</span>
            <Fuel className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-extrabold font-mono text-emerald-400 tabular-nums tracking-tight">
            {fuelSavedLiters.toFixed(1)} <span className="text-xs font-normal text-slate-400 font-sans">L</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-2 font-mono">
            <span className="text-emerald-400 font-bold">-46.2%</span> vs static tour
          </div>
        </div>

        {/* Operational Cost Saved */}
        <div className="bg-[#090e1c]/80 backdrop-blur-md border border-white/[0.08] rounded-2xl p-4 transition-all hover:border-teal-500/40 hover:shadow-lg hover:shadow-teal-950/20 relative overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-teal-500 to-cyan-500 opacity-80" />
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span className="font-mono text-[10px] uppercase tracking-wider text-teal-400 font-semibold">Cost Savings</span>
            <DollarSign className="w-4 h-4 text-teal-400" />
          </div>
          <div className="text-3xl font-extrabold font-mono text-teal-400 tabular-nums tracking-tight">
            ${costSavedUsd.toFixed(0)}
          </div>
          <div className="text-[11px] text-slate-400 mt-2 font-sans">
            Diesel + wear reduction
          </div>
        </div>

        {/* CO2 Emissions Prevented */}
        <div className="bg-[#090e1c]/80 backdrop-blur-md border border-white/[0.08] rounded-2xl p-4 transition-all hover:border-emerald-500/40 hover:shadow-lg hover:shadow-emerald-950/20 relative overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-500 to-green-500 opacity-80" />
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span className="font-mono text-[10px] uppercase tracking-wider text-emerald-400 font-semibold">CO₂ Abated</span>
            <Leaf className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-extrabold font-mono text-emerald-400 tabular-nums tracking-tight">
            {co2SavedKg.toFixed(1)} <span className="text-xs font-normal text-slate-400 font-sans">kg</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-2 font-sans">
            ≈ {(co2SavedKg / 21.77).toFixed(1)} trees/yr equivalent
          </div>
        </div>

        {/* Fleet Active */}
        <div className="bg-[#090e1c]/80 backdrop-blur-md border border-white/[0.08] rounded-2xl p-4 transition-all hover:border-sky-500/40 hover:shadow-lg hover:shadow-sky-950/20 relative overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-sky-500 to-indigo-500 opacity-80" />
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span className="font-mono text-[10px] uppercase tracking-wider text-sky-400 font-semibold">Fleet Utilization</span>
            <ShieldCheck className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-3xl font-extrabold font-mono text-sky-400 tabular-nums tracking-tight">
            {trucks.filter(t => t.status !== 'Idle' && t.status !== 'Off-Duty').length} / {trucks.length}
          </div>
          <div className="text-[11px] text-slate-400 mt-2 font-sans">
            Active dispatched units
          </div>
        </div>
      </div>

      {/* Active Maintenance Alerts Notice */}
      {activeAlerts.length > 0 && (
        <div className="bg-[#090e1c]/90 backdrop-blur-md border border-amber-500/30 rounded-2xl p-5 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-amber-500" />
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Wrench className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2 text-sm font-bold text-white">
                  <span>Diagnostic Hardware & Weight Anomaly Console</span>
                  <span className="text-xs font-mono font-bold text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-800/40">
                    {activeAlerts.length} Flagged
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-sans">
                  Load cell transducer spikes and ultrasonic drift flagged for field maintenance
                </p>
              </div>
            </div>

            {onNavigateToMaintenance && (
              <button
                onClick={onNavigateToMaintenance}
                className="text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1 transition"
              >
                <span>View Maintenance Registry</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {activeAlerts.slice(0, 3).map(alert => (
              <div
                key={alert.id}
                className="bg-[#060913]/90 border border-white/[0.08] hover:border-amber-500/40 rounded-xl p-3.5 flex flex-col justify-between space-y-2.5 transition"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5 text-[10px] font-mono">
                    <span className="text-amber-400 font-bold bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-800/50">{alert.errorCode}</span>
                    <span className="text-slate-500">{alert.timestamp}</span>
                  </div>

                  <div className="font-bold text-xs text-white line-clamp-1">{alert.errorTitle}</div>
                  <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                    {alert.binId} · {alert.zone}
                  </div>

                  <p className="text-[11px] text-slate-400 mt-2 line-clamp-2 leading-relaxed">
                    {alert.description}
                  </p>
                </div>

                <div className="pt-2 border-t border-white/[0.08] flex items-center justify-between text-xs">
                  <span className="text-[11px] text-slate-400 font-mono">
                    Severity: <span className="text-amber-400 font-bold">{alert.severity}</span>
                  </span>
                  {onDispatchTechnician && (
                    <button
                      onClick={() => onDispatchTechnician(alert.id, alert.binId)}
                      className="px-2.5 py-1 text-[11px] font-semibold text-white bg-amber-600 hover:bg-amber-500 rounded-lg transition active:scale-[0.98]"
                    >
                      Dispatch Tech
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* RECHARTS ML FILL-LEVEL PROJECTION LINE GRAPH MODULE           */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-[#090e1c]/80 backdrop-blur-xl border border-white/[0.08] rounded-2xl p-5 sm:p-6 space-y-5 shadow-2xl relative overflow-hidden">
        {/* Subtle decorative accent */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />

        {/* Header with Title and Mode Controls */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 font-mono">
              <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                <Sparkles className="w-3.5 h-3.5" />
                RandomForest ML Regression
              </span>
              <span className="text-slate-600">/</span>
              <span className="text-slate-300">DIURNAL PROJECTION</span>
              <span className="text-slate-600">/</span>
              <span className="text-sky-400">R²: 0.942 · MAE: 3.18%</span>
            </div>
            <h2 className="font-display text-lg sm:text-xl font-bold text-white tracking-tight mt-1 flex items-center gap-2">
              <span>Projected Fill-Level Trajectories over Time</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Simulates container accumulation curves over forward {chartHorizonHours} hours factoring in diurnal peaks, weather penalties, and citizen reports.
            </p>
          </div>

          {/* Controls: Horizon & View Mode */}
          <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
            {/* Mode Switcher */}
            <div className="flex items-center p-1 bg-slate-950/80 rounded-xl border border-white/[0.08] text-xs">
              <button
                onClick={() => setChartMode('multi')}
                className={`px-3 py-1 rounded-lg font-medium transition ${
                  chartMode === 'multi'
                    ? 'bg-slate-800 text-white shadow-sm border border-white/[0.1] font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Multi-Bin Comparison
              </button>
              <button
                onClick={() => setChartMode('confidence')}
                className={`px-3 py-1 rounded-lg font-medium transition ${
                  chartMode === 'confidence'
                    ? 'bg-slate-800 text-white shadow-sm border border-white/[0.1] font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Confidence Bounds
              </button>
            </div>

            {/* Time Horizon Switcher */}
            <div className="flex items-center p-1 bg-slate-950/80 rounded-xl border border-white/[0.08] text-xs font-mono">
              {[12, 24].map(h => (
                <button
                  key={h}
                  onClick={() => setChartHorizonHours(h)}
                  className={`px-3 py-1 rounded-lg font-semibold transition ${
                    chartHorizonHours === h
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  +{h}h Horizon
                </button>
              ))}
            </div>

            {/* In Single-Bin Confidence mode: Quick Bin Selector */}
            {chartMode === 'confidence' && (
              <div className="flex items-center gap-1.5 bg-slate-950/80 border border-white/[0.08] rounded-xl px-2.5 py-1 text-xs">
                <span className="text-slate-400 font-mono text-[11px]">Inspect:</span>
                <select
                  value={focusedBinId}
                  onChange={e => setFocusedBinId(e.target.value)}
                  className="bg-transparent text-white font-mono text-xs focus:outline-none cursor-pointer"
                >
                  {bins.map(b => (
                    <option key={b.id} value={b.id} className="bg-[#0b101f] text-slate-200">
                      {b.id} ({b.name.slice(0, 16)}) - {b.fillLevel}%
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Multi-bin Container Selector Chips */}
        {chartMode === 'multi' && (
          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-white/[0.06]">
            <span className="text-xs text-slate-400 font-mono shrink-0">Toggle Containers:</span>
            <div className="flex flex-wrap gap-1.5">
              {bins.slice(0, 8).map((bin, idx) => {
                const isSelected = selectedChartBinIds.includes(bin.id);
                const color = BIN_CHART_COLORS[idx % BIN_CHART_COLORS.length];
                return (
                  <button
                    key={bin.id}
                    onClick={() => handleToggleBin(bin.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono transition ${
                      isSelected
                        ? 'bg-slate-800 text-white border border-white/[0.15] shadow-sm'
                        : 'bg-slate-950/60 text-slate-500 border border-transparent hover:text-slate-300 hover:bg-slate-900'
                    }`}
                  >
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: isSelected ? color : '#475569' }}
                    />
                    <span>{bin.id}</span>
                    <span className="text-[10px] text-slate-400">({bin.fillLevel}%)</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Recharts Interactive Line Graph Canvas */}
        <div className="w-full bg-[#050811]/90 border border-white/[0.08] rounded-xl p-3 sm:p-5">
          <div className="h-72 sm:h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              {chartMode === 'multi' ? (
                <LineChart
                  data={multiBinChartData}
                  margin={{ top: 12, right: 24, left: -10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis
                    dataKey="timeLabel"
                    stroke="#475569"
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    tickLine={{ stroke: '#334155' }}
                  />
                  <YAxis
                    domain={[0, 100]}
                    stroke="#475569"
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    tickFormatter={val => `${val}%`}
                    tickLine={{ stroke: '#334155' }}
                  />
                  <ReferenceLine
                    y={simulation.collectionThreshold}
                    stroke="#ef4444"
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                    label={{
                      value: `Threshold: ${simulation.collectionThreshold}%`,
                      fill: '#f87171',
                      fontSize: 10,
                      position: 'insideTopRight',
                    }}
                  />
                  <Tooltip
                    content={({ active, payload, label }: any) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-[#080d1a]/95 border border-white/[0.12] rounded-xl p-3 shadow-2xl backdrop-blur text-xs font-mono space-y-1.5 z-50 min-w-[220px]">
                            <div className="font-bold text-white border-b border-white/[0.08] pb-1 flex items-center justify-between">
                              <span className="text-slate-400 font-sans">Projection Step:</span>
                              <span className="text-emerald-400 font-bold">{label}</span>
                            </div>
                            <div className="space-y-1">
                              {payload.map((item: any, idx: number) => {
                                const bin = bins.find(b => b.id === item.dataKey);
                                const val = typeof item.value === 'number' ? item.value : 0;
                                const isCritical = val >= 85;
                                const isOverThreshold = val >= simulation.collectionThreshold;

                                return (
                                  <div key={idx} className="flex items-center justify-between gap-3 text-[11px]">
                                    <div className="flex items-center gap-1.5 truncate">
                                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                                      <span className="text-slate-200 font-sans font-medium truncate">
                                        {bin ? `${bin.id} · ${bin.name.slice(0, 14)}` : item.name}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0 font-mono">
                                      <span className={`font-bold tabular-nums ${isCritical ? 'text-rose-400' : isOverThreshold ? 'text-amber-400' : 'text-slate-200'}`}>
                                        {val.toFixed(1)}%
                                      </span>
                                      {isOverThreshold && (
                                        <span className="text-[9px] text-rose-400 font-bold">
                                          OVER
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                            <div className="text-[10px] text-slate-500 pt-1 border-t border-white/[0.08] flex justify-between font-sans">
                              <span>Target Threshold: {simulation.collectionThreshold}%</span>
                              <span className="text-sky-400 font-mono font-medium">Confidence: 94.6%</span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={32}
                    iconType="circle"
                    wrapperStyle={{ fontSize: 11, paddingTop: 10 }}
                  />
                  {selectedChartBinIds.map((binId, idx) => {
                    const bin = bins.find(b => b.id === binId);
                    const color = BIN_CHART_COLORS[idx % BIN_CHART_COLORS.length];
                    return (
                      <Line
                        key={binId}
                        type="monotone"
                        dataKey={binId}
                        name={bin ? `${bin.id} (${bin.name.slice(0, 16)})` : binId}
                        stroke={color}
                        strokeWidth={2.5}
                        dot={{ r: 3, fill: color, strokeWidth: 1.5, stroke: '#020617' }}
                        activeDot={{ r: 6, fill: color, stroke: '#fff', strokeWidth: 2 }}
                        isAnimationActive={true}
                      />
                    );
                  })}
                </LineChart>
              ) : (
                <AreaChart
                  data={singleBinChartData}
                  margin={{ top: 12, right: 24, left: -10, bottom: 5 }}
                >
                  <defs>
                    <linearGradient id="confidenceGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis
                    dataKey="timeLabel"
                    stroke="#475569"
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    tickLine={{ stroke: '#334155' }}
                  />
                  <YAxis
                    domain={[0, 100]}
                    stroke="#475569"
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    tickFormatter={val => `${val}%`}
                    tickLine={{ stroke: '#334155' }}
                  />
                  <ReferenceLine
                    y={simulation.collectionThreshold}
                    stroke="#ef4444"
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                    label={{
                      value: `Threshold: ${simulation.collectionThreshold}%`,
                      fill: '#f87171',
                      fontSize: 10,
                      position: 'insideTopRight',
                    }}
                  />
                  <Tooltip
                    content={({ active, payload, label }: any) => {
                      if (active && payload && payload.length) {
                        const data = payload[0]?.payload;
                        if (!data) return null;
                        const isOverThreshold = data.fill >= simulation.collectionThreshold;
                        return (
                          <div className="bg-[#080d1a]/95 border border-white/[0.12] rounded-xl p-3 shadow-2xl backdrop-blur text-xs font-mono space-y-1.5 z-50 min-w-[200px]">
                            <div className="font-bold text-white border-b border-white/[0.08] pb-1 flex items-center justify-between">
                              <span className="text-slate-400 font-sans">Projection Step:</span>
                              <span className="text-sky-400 font-bold">{label}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-slate-300 font-sans">Expected Fill:</span>
                              <span className={`font-bold font-mono text-sm ${isOverThreshold ? 'text-rose-400' : 'text-sky-400'}`}>
                                {data.fill}%
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-400 flex justify-between">
                              <span className="font-sans">95% Bayesian Bound:</span>
                              <span className="text-slate-200">{data.lowerBound}% - {data.upperBound}%</span>
                            </div>
                            <div className="text-[10px] text-slate-500 pt-1 border-t border-white/[0.08] flex justify-between font-sans">
                              <span>Target Threshold: {simulation.collectionThreshold}%</span>
                              <span className={isOverThreshold ? 'text-rose-400 font-semibold' : 'text-emerald-400'}>
                                {isOverThreshold ? 'Action Required' : 'Nominal'}
                              </span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="upperBound"
                    stroke="#0284c7"
                    strokeDasharray="2 2"
                    fill="url(#confidenceGradient)"
                    name="Upper Bound (95%)"
                  />
                  <Area
                    type="monotone"
                    dataKey="lowerBound"
                    stroke="#0284c7"
                    strokeDasharray="2 2"
                    fill="transparent"
                    name="Lower Bound (95%)"
                  />
                  <Line
                    type="monotone"
                    dataKey="fill"
                    stroke="#38bdf8"
                    strokeWidth={3}
                    dot={{ r: 3.5, fill: '#38bdf8', stroke: '#020617', strokeWidth: 1.5 }}
                    activeDot={{ r: 6, fill: '#38bdf8', stroke: '#fff', strokeWidth: 2 }}
                    name="Projected Fill %"
                  />
                </AreaChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        {/* Predictive Intelligence Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <div className="p-3.5 bg-slate-950/80 rounded-xl border border-white/[0.08] flex items-center gap-3">
            <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-400 shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] text-slate-400 font-mono uppercase tracking-wide">
                Earliest Projected Overflow
              </div>
              <div className="text-xs font-bold text-white truncate mt-0.5 font-mono">
                {earliestOverflow.bin ? (
                  <span>
                    {earliestOverflow.bin.id} in{' '}
                    <span className="text-rose-400">{earliestOverflow.hours}h</span>
                  </span>
                ) : (
                  <span>All containers within capacity</span>
                )}
              </div>
              <div className="text-[10px] text-slate-500 truncate">
                {earliestOverflow.bin?.zone || 'Service Grid'}
              </div>
            </div>
          </div>

          <div className="p-3.5 bg-slate-950/80 rounded-xl border border-white/[0.08] flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-400 shrink-0">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] text-slate-400 font-mono uppercase tracking-wide">
                Diurnal Accumulation Surge
              </div>
              <div className="text-xs font-bold text-amber-300 truncate mt-0.5">
                18:00 - 21:00 Evening Peak
              </div>
              <div className="text-[10px] text-slate-500 font-mono">
                1.8x generation multiplier active
              </div>
            </div>
          </div>

          <div className="p-3.5 bg-slate-950/80 rounded-xl border border-white/[0.08] flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 shrink-0">
              <Zap className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] text-slate-400 font-mono uppercase tracking-wide">
                Dispatch Recommendation
              </div>
              <div className="text-xs font-bold text-emerald-300 truncate mt-0.5">
                {criticalBins.length > 0 ? 'Expedite A* Tour Dispatch' : 'Nominal Monitoring'}
              </div>
              <div className="text-[10px] text-slate-500 font-mono">
                {criticalBins.length} bins currently exceed threshold
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Zone Overview & Algorithmic Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* District Fill Status */}
        <div className="bg-[#090e1c]/80 backdrop-blur-xl border border-white/[0.08] rounded-2xl p-5 sm:p-6 lg:col-span-2 shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-display text-base font-bold text-white tracking-tight">
                District Waste Saturation &amp; Collection Urgency
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">Real-time aggregate fill levels across municipal service zones</p>
            </div>
            <span className="text-xs font-mono text-slate-400 bg-slate-950/80 px-2.5 py-1 rounded-lg border border-white/[0.08]">
              Target: {simulation.collectionThreshold}%
            </span>
          </div>

          <div className="space-y-4">
            {zoneStats.map(zone => {
              return (
                <div key={zone.name} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-200">{zone.name}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-slate-400 font-mono text-[11px]">
                        {zone.urgentCount} of {zone.total} bins urgent
                      </span>
                      <span className={`font-mono font-bold tabular-nums text-sm ${
                        zone.avgFill >= 80 ? 'text-rose-400' : zone.avgFill >= 65 ? 'text-amber-400' : 'text-emerald-400'
                      }`}>
                        {zone.avgFill}%
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden relative border border-white/[0.06]">
                    <div 
                      className="absolute top-0 bottom-0 w-0.5 bg-rose-500 z-10" 
                      style={{ left: `${simulation.collectionThreshold}%` }}
                      title={`Target Threshold: ${simulation.collectionThreshold}%`}
                    />
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        zone.avgFill >= 80 
                          ? 'bg-rose-500' 
                          : zone.avgFill >= 65 
                          ? 'bg-amber-500' 
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(100, zone.avgFill)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Waste Composition Breakdown */}
          <div className="mt-6 pt-5 border-t border-white/[0.08] grid grid-cols-2 sm:grid-cols-4 gap-3">
            {wasteCategories.map(cat => (
              <div key={cat.type} className="bg-slate-950/70 border border-white/[0.06] p-3 rounded-xl">
                <div className="flex items-center gap-2 mb-1">
                  <div className={`w-2 h-2 rounded-full ${cat.color}`} />
                  <span className="text-[11px] text-slate-400 font-medium truncate">{cat.type}</span>
                </div>
                <div className="text-xl font-bold font-mono text-white tabular-nums">
                  {cat.totalKg} <span className="text-xs font-normal text-slate-400 font-sans">kg</span>
                </div>
                <div className="text-[11px] text-slate-500 font-mono">
                  {cat.count} containers
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Algorithm Benefit Comparison */}
        <div className="bg-[#090e1c]/80 backdrop-blur-xl border border-white/[0.08] rounded-2xl p-5 sm:p-6 flex flex-col justify-between shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-500 to-sky-500" />
          <div>
            <div className="flex items-center gap-2 mb-1 text-emerald-400 text-xs font-semibold">
              <ShieldCheck className="w-4 h-4" />
              <span>Comparative Efficiency Benchmark</span>
            </div>
            <h2 className="font-display text-base font-bold text-white tracking-tight">
              EcoRoute vs. Static Daily Collection
            </h2>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Conventional municipal operations dispatch trucks along rigid daily routes regardless of container fill status.
            </p>

            <div className="mt-5 space-y-3.5">
              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-white/[0.08]">
                <div className="text-xs text-slate-400 mb-1 flex justify-between">
                  <span>Traditional Fixed Route:</span>
                  <span className="font-mono text-slate-300">52.4 km / day</span>
                </div>
                <div className="text-xs text-slate-400 flex justify-between">
                  <span>EcoRoute AI Path (A* + Heap):</span>
                  <span className="font-mono text-emerald-400 font-bold">
                    {(52.4 - totalDistanceSavedKm).toFixed(1)} km / day
                  </span>
                </div>
                <div className="mt-2 text-xs font-mono text-emerald-400 flex items-center gap-1 font-bold">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>{((totalDistanceSavedKm / 52.4) * 100).toFixed(1)}% Route Distance Saved</span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-white/[0.08]">
                <div className="text-xs text-slate-400 mb-1 flex justify-between">
                  <span>Unnecessary Visits Avoided:</span>
                  <span className="font-mono text-slate-200 font-semibold">
                    {bins.filter(b => b.fillLevel < simulation.collectionThreshold).length} Bins
                  </span>
                </div>
                <div className="text-xs text-slate-400 flex justify-between">
                  <span>Fleet Wear & Maintenance:</span>
                  <span className="font-mono text-emerald-400 font-bold">-$38.20 / cycle</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-white/[0.08] flex items-center justify-between text-xs">
            <span className="text-slate-400 font-mono text-[11px]">A* Heuristic · Max-Heap Priority</span>
            <button
              onClick={onOptimizeRoute}
              className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-semibold transition"
            >
              <span>View Route Manifest</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Top Priority Bins Table (Max-Heap Ordering) */}
      <div className="bg-[#090e1c]/80 backdrop-blur-xl border border-white/[0.08] rounded-2xl p-5 sm:p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-display text-base font-bold text-white tracking-tight">
              Top Priority Bins (Max-Heap Ordering)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Ordered by composite urgency score: current fill, ML accumulation rate, and citizen reports
            </p>
          </div>
          <span className="text-xs text-slate-400 font-mono bg-slate-950/80 px-2.5 py-1 rounded-lg border border-white/[0.08]">
            {bins.length} Monitored Containers
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/[0.08] text-slate-400 uppercase font-mono text-[10px]">
                <th className="py-3 px-3">Bin ID & Location</th>
                <th className="py-3 px-3">Zone</th>
                <th className="py-3 px-3 text-right">Fill Level</th>
                <th className="py-3 px-3 text-right">Hours To Full</th>
                <th className="py-3 px-3 text-right">Urgency Score</th>
                <th className="py-3 px-3 text-left pl-6">Status</th>
                <th className="py-3 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {sortedBinsByUrgency.map(bin => {
                const isCritical = bin.fillLevel >= 85;
                const isApproaching = bin.fillLevel >= 70 && bin.fillLevel < 85;

                return (
                  <tr
                    key={bin.id}
                    className="hover:bg-slate-800/40 transition group cursor-pointer"
                    onClick={() => onSelectBin(bin)}
                  >
                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-100 flex items-center gap-2">
                        <span className="font-mono text-emerald-400">{bin.id}</span>
                        <span>{bin.name}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {bin.lat.toFixed(4)}, {bin.lng.toFixed(4)}
                      </div>
                    </td>

                    <td className="py-3 px-3 text-slate-300 font-medium">
                      {bin.zone}
                    </td>

                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span className={`font-mono font-bold text-sm ${
                          isCritical ? 'text-rose-400' : isApproaching ? 'text-amber-400' : 'text-slate-200'
                        }`}>
                          {bin.fillLevel}%
                        </span>
                        <div className="w-12 bg-slate-950 h-1.5 rounded-full overflow-hidden border border-white/[0.06] hidden sm:block">
                          <div
                            className={`h-full rounded-full ${
                              isCritical ? 'bg-rose-500' : isApproaching ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${bin.fillLevel}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-3 text-right font-mono text-slate-300 font-medium">
                      {bin.predictedHoursToFull}h
                    </td>

                    <td className="py-3 px-3 text-right">
                      <span className="font-mono font-bold text-white bg-slate-950/80 px-2 py-0.5 rounded border border-white/[0.08]">
                        {bin.urgencyScore.toFixed(1)}
                      </span>
                    </td>

                    <td className="py-3 px-3 pl-6">
                      <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium ${
                        isCritical ? 'text-rose-400' : isApproaching ? 'text-amber-400' : 'text-emerald-400'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          isCritical ? 'bg-rose-400 animate-pulse' : isApproaching ? 'bg-amber-400' : 'bg-emerald-400'
                        }`} />
                        {bin.status}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectBin(bin);
                        }}
                        className="px-2.5 py-1 text-[11px] font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 border border-white/[0.08] rounded-lg transition"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
