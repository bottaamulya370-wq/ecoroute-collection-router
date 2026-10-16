import React, { useState } from 'react';
import { 
  SmartBin, 
  MaintenanceAlert, 
  SensorErrorCode, 
  MaintenanceSeverity, 
  MaintenanceStatus 
} from '../types';
import { 
  Wrench, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  ShieldAlert, 
  Radio, 
  Scale, 
  Cpu, 
  RotateCcw, 
  UserCheck, 
  Send, 
  Filter, 
  Activity, 
  Plus, 
  ChevronRight,
  Eye,
  Thermometer,
  BatteryCharging,
  Zap,
  Check
} from 'lucide-react';

interface MaintenanceAlertsViewProps {
  alerts: MaintenanceAlert[];
  bins: SmartBin[];
  onDispatchTechnician: (alertId: string, technicianName: string) => void;
  onResolveAlert: (alertId: string) => void;
  onSimulateAnomaly: (binId: string, errorCode: SensorErrorCode, weightDeltaKg?: number) => void;
  onSelectBin: (bin: SmartBin) => void;
}

export const MaintenanceAlertsView: React.FC<MaintenanceAlertsViewProps> = ({
  alerts,
  bins,
  onDispatchTechnician,
  onResolveAlert,
  onSimulateAnomaly,
  onSelectBin,
}) => {
  const [selectedFilter, setSelectedFilter] = useState<'All' | MaintenanceStatus>('All');
  const [categoryFilter, setCategoryFilter] = useState<'All' | 'Sensors' | 'WeightSpikes'>('All');
  const [isSimulateModalOpen, setIsSimulateModalOpen] = useState(false);

  // Simulation form state
  const [simBinId, setSimBinId] = useState<string>(bins[0]?.id || 'BIN-101');
  const [simErrorCode, setSimErrorCode] = useState<SensorErrorCode>('ERR_WEIGHT_SPIKE_ANOMALY');
  const [simWeightDelta, setSimWeightDelta] = useState<number>(180);

  // Dispatch popup state
  const [activeDispatchAlertId, setActiveDispatchAlertId] = useState<string | null>(null);
  const [selectedTech, setSelectedTech] = useState<string>('Carlos Ortiz (Tech Unit-03)');

  const TECHNICIANS = [
    'Carlos Ortiz (Tech Unit-03 - Commercial Sector)',
    'Elena Rostova (Tech Unit-01 - Heavy Mechanics)',
    'Marcus Vance (Tech Unit-02 - IoT & Electronics)',
    'Devon Cole (Tech Unit-04 - Fast Responder)',
  ];

  const filteredAlerts = alerts.filter(a => {
    if (selectedFilter !== 'All' && a.status !== selectedFilter) return false;
    if (categoryFilter === 'Sensors' && a.errorCode === 'ERR_WEIGHT_SPIKE_ANOMALY') return false;
    if (categoryFilter === 'WeightSpikes' && a.errorCode !== 'ERR_WEIGHT_SPIKE_ANOMALY') return false;
    return true;
  });

  const activeAlertsCount = alerts.filter(a => a.status !== 'Resolved').length;
  const criticalCount = alerts.filter(a => a.severity === 'Critical' && a.status !== 'Resolved').length;
  const weightSpikeCount = alerts.filter(a => a.errorCode === 'ERR_WEIGHT_SPIKE_ANOMALY' && a.status !== 'Resolved').length;
  const dispatchedCount = alerts.filter(a => a.status === 'Technician Dispatched').length;

  const handleSimulateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSimulateAnomaly(
      simBinId, 
      simErrorCode, 
      simErrorCode === 'ERR_WEIGHT_SPIKE_ANOMALY' ? simWeightDelta : undefined
    );
    setIsSimulateModalOpen(false);
  };

  const getSeverityBadge = (sev: MaintenanceSeverity) => {
    switch (sev) {
      case 'Critical':
        return 'bg-rose-950/80 text-rose-300 border-rose-800/60';
      case 'High':
        return 'bg-amber-950/80 text-amber-300 border-amber-800/60';
      case 'Warning':
      default:
        return 'bg-yellow-950/70 text-yellow-300 border-yellow-800/50';
    }
  };

  const getStatusBadge = (status: MaintenanceStatus) => {
    switch (status) {
      case 'Flagged':
        return 'bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse';
      case 'Technician Dispatched':
        return 'bg-sky-500/20 text-sky-300 border border-sky-500/30';
      case 'Inspecting On-Site':
        return 'bg-amber-500/20 text-amber-300 border border-amber-500/30';
      case 'Resolved':
        return 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-[#090e1c]/80 backdrop-blur-xl border border-white/[0.08] rounded-2xl p-5 sm:p-6 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5 shadow-2xl relative overflow-hidden">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
            <span>Hardware Health & Diagnostic Supervisor</span>
            <span className="text-slate-600">/</span>
            <span className="text-amber-400 font-mono font-semibold">Automated Anomaly & Sensor Failsafe</span>
            <span className="text-slate-600">/</span>
            <span className="text-sky-400 font-mono">Load Cell Auditing</span>
          </div>
          <h1 className="font-display text-xl sm:text-2xl font-bold text-white tracking-tight mt-1 flex items-center gap-2.5">
            <Wrench className="w-6 h-6 text-amber-400" />
            <span>Bin Sensor & Weight Anomaly Maintenance Alerts</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-3xl leading-relaxed">
            Continuously intercepts ultrasonic transducer timeouts, optical lens fouling, actuator jams, and illegal high-density weight surges, dispatching certified municipal technicians for immediate field rectification.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 w-full lg:w-auto">
          <button
            onClick={() => setIsSimulateModalOpen(true)}
            className="flex-1 lg:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-500 rounded-xl shadow-lg shadow-amber-950/40 border border-amber-400/30 transition active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>Inject Hardware Anomaly</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-[#090e1c]/80 backdrop-blur-md border border-white/[0.08] rounded-2xl p-4 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span className="font-mono text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Active Flags</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-3xl font-extrabold font-mono text-amber-400 tabular-nums">
            {activeAlertsCount}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 font-mono">
            {criticalCount} critical severity
          </div>
        </div>

        <div className="bg-[#090e1c]/80 backdrop-blur-md border border-white/[0.08] rounded-2xl p-4 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span className="font-mono text-[10px] uppercase tracking-wider text-rose-400 font-semibold">Abnormal Weight Spikes</span>
            <Scale className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-3xl font-extrabold font-mono text-rose-400 tabular-nums">
            {weightSpikeCount}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 font-mono">
            Load cell density triggers
          </div>
        </div>

        <div className="bg-[#090e1c]/80 backdrop-blur-md border border-white/[0.08] rounded-2xl p-4 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span className="font-mono text-[10px] uppercase tracking-wider text-sky-400 font-semibold">Technicians Dispatched</span>
            <UserCheck className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-3xl font-extrabold font-mono text-sky-400 tabular-nums">
            {dispatchedCount}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 font-mono">
            Active field crew in transit
          </div>
        </div>

        <div className="bg-[#090e1c]/80 backdrop-blur-md border border-white/[0.08] rounded-2xl p-4 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>Sensor Fleet Health</span>
            <Cpu className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400 tabular-nums">
            {((bins.filter(b => b.sensorHealth === 'Optimal').length / bins.length) * 100).toFixed(0)}%
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {bins.filter(b => b.sensorHealth === 'Optimal').length} of {bins.length} nominal
          </div>
        </div>
      </div>

      {/* Filter and Category Tabs */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Status Filters */}
        <div className="flex items-center gap-1 p-1 bg-slate-950/80 rounded-lg border border-slate-800 text-xs overflow-x-auto max-w-full">
          {(['All', 'Flagged', 'Technician Dispatched', 'Resolved'] as const).map(st => (
            <button
              key={st}
              onClick={() => setSelectedFilter(st)}
              className={`px-3 py-1.5 rounded-md font-medium whitespace-nowrap transition ${
                selectedFilter === st
                  ? 'bg-slate-800 text-white shadow-sm border border-slate-700/60'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {st}
              {st === 'Flagged' && activeAlertsCount > 0 && (
                <span className="ml-1.5 px-1.5 py-0.2 bg-rose-500/30 text-rose-300 rounded-full text-[10px] font-mono">
                  {activeAlertsCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Category Filter */}
        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-slate-400">Filter Type:</span>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as any)}
            className="bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-2.5 py-1 text-xs focus:outline-none"
          >
            <option value="All">All Anomalies & Codes</option>
            <option value="Sensors">Sensor Hardware Errors Only</option>
            <option value="WeightSpikes">Weight Spikes Only</option>
          </select>
        </div>
      </div>

      {/* Alerts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredAlerts.length === 0 ? (
          <div className="col-span-full bg-slate-900 border border-slate-800 rounded-xl p-12 text-center text-slate-400">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2 opacity-80" />
            <h3 className="text-white font-semibold text-base">No Matching Maintenance Alerts</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              All bin ultrasonic transducers, optical apertures, and load cell strain gauges are reporting within normal operating parameters.
            </p>
          </div>
        ) : (
          filteredAlerts.map(alert => {
            const associatedBin = bins.find(b => b.id === alert.binId);
            const isWeightSpike = alert.errorCode === 'ERR_WEIGHT_SPIKE_ANOMALY';

            return (
              <div
                key={alert.id}
                className={`bg-slate-900 border rounded-xl overflow-hidden flex flex-col justify-between transition ${
                  alert.severity === 'Critical'
                    ? 'border-rose-900/60 shadow-lg shadow-rose-950/20'
                    : alert.severity === 'High'
                    ? 'border-amber-900/50'
                    : 'border-slate-800'
                }`}
              >
                {/* Header */}
                <div className="p-4 border-b border-slate-800/80 bg-slate-950/40">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${getSeverityBadge(alert.severity)}`}>
                      {alert.severity} Severity
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold ${getStatusBadge(alert.status)}`}>
                      {alert.status}
                    </span>
                  </div>

                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-sm text-white line-clamp-1">
                        {alert.errorTitle}
                      </h3>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5 flex items-center gap-1.5">
                        <span className="text-emerald-400 font-semibold">{alert.binId}</span>
                        <span>·</span>
                        <span>{alert.zone}</span>
                      </div>
                    </div>

                    <div className="px-2 py-1 bg-slate-950 border border-slate-800 rounded font-mono text-[10px] text-amber-400 font-bold shrink-0">
                      {alert.errorCode}
                    </div>
                  </div>
                </div>

                {/* Body Details */}
                <div className="p-4 space-y-3.5 flex-1">
                  {/* Weight Delta Card if Abnormal Weight Spike */}
                  {isWeightSpike && alert.weightDeltaKg && (
                    <div className="p-2.5 rounded-lg bg-rose-950/30 border border-rose-800/40 space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-rose-300 font-medium flex items-center gap-1.5">
                          <Scale className="w-3.5 h-3.5 text-rose-400" />
                          <span>Weight Surge Anomaly:</span>
                        </span>
                        <span className="font-mono text-rose-400 font-bold text-sm">
                          +{alert.weightDeltaKg} kg
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 flex justify-between font-mono">
                        <span>Current Load: {alert.currentWeightKg} kg</span>
                        <span>Baseline: {alert.expectedWeightKg || 150} kg</span>
                      </div>
                    </div>
                  )}

                  {/* Diagnostic Description */}
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {alert.description}
                  </p>

                  {/* Recommended Action */}
                  <div className="p-2.5 bg-slate-950/70 rounded-lg border border-slate-800/80 text-[11px]">
                    <div className="text-slate-400 font-medium mb-0.5 flex items-center gap-1">
                      <Wrench className="w-3 h-3 text-amber-400" />
                      <span>Recommended Field Protocol:</span>
                    </div>
                    <div className="text-slate-300">{alert.recommendedAction}</div>
                  </div>

                  {/* Technician Assignment */}
                  {alert.assignedTechnician ? (
                    <div className="text-xs text-sky-300 flex items-center gap-1.5 font-mono bg-sky-950/30 p-2 rounded border border-sky-900/40">
                      <UserCheck className="w-3.5 h-3.5 text-sky-400" />
                      <span className="truncate">Assigned: {alert.assignedTechnician}</span>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-500 font-mono flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Reported {alert.timestamp} · Awaiting Technician</span>
                    </div>
                  )}
                </div>

                {/* Footer Actions */}
                <div className="px-4 py-3 bg-slate-950/70 border-t border-slate-800/80 flex items-center justify-between gap-2">
                  {associatedBin && (
                    <button
                      onClick={() => onSelectBin(associatedBin)}
                      className="px-2.5 py-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5 text-slate-400" />
                      <span>Telemetry</span>
                    </button>
                  )}

                  <div className="flex items-center gap-2">
                    {alert.status !== 'Resolved' ? (
                      <>
                        {alert.status === 'Flagged' && (
                          <button
                            onClick={() => setActiveDispatchAlertId(alert.id)}
                            className="px-3 py-1.5 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 rounded-lg shadow-sm transition flex items-center gap-1"
                          >
                            <Send className="w-3 h-3" />
                            <span>Dispatch Tech</span>
                          </button>
                        )}

                        <button
                          onClick={() => onResolveAlert(alert.id)}
                          className="px-3 py-1.5 text-xs font-medium text-emerald-300 hover:text-white bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-800/60 rounded-lg transition flex items-center gap-1"
                          title="Verify resolution and clear error code"
                        >
                          <Check className="w-3 h-3" />
                          <span>Resolve</span>
                        </button>
                      </>
                    ) : (
                      <span className="text-xs text-emerald-400 font-mono font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Inspected & Cleared</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Technician Dispatch Dialog Modal */}
      {activeDispatchAlertId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-sky-400" />
                <span>Dispatch Maintenance Crew</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Assign an on-duty field technician unit to inspect and service the flagged bin.
              </p>
            </div>

            <div>
              <label className="text-xs text-slate-300 font-medium block mb-1.5">
                Select Municipal Technician Unit:
              </label>
              <select
                value={selectedTech}
                onChange={(e) => setSelectedTech(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg px-3 py-2 text-xs font-mono focus:outline-none"
              >
                {TECHNICIANS.map(t => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setActiveDispatchAlertId(null)}
                className="px-4 py-2 text-xs text-slate-400 hover:text-white transition"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onDispatchTechnician(activeDispatchAlertId, selectedTech);
                  setActiveDispatchAlertId(null);
                }}
                className="px-4 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 rounded-lg shadow-sm transition"
              >
                Confirm Dispatch
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inject Hardware Anomaly Simulation Modal */}
      {isSimulateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-400" />
                  <span>Simulate Sensor Fault or Weight Anomaly</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Test the real-time detection, error-code logging, and priority re-ranking engine.
                </p>
              </div>
            </div>

            <form onSubmit={handleSimulateSubmit} className="space-y-4">
              <div>
                <label className="text-xs text-slate-300 font-medium block mb-1">
                  Target Smart Bin:
                </label>
                <select
                  value={simBinId}
                  onChange={(e) => setSimBinId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg px-3 py-2 text-xs font-mono focus:outline-none"
                >
                  {bins.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.id} - {b.name} ({b.zone} - {b.currentWeightKg}kg)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-300 font-medium block mb-1">
                  Fault / Error Code Category:
                </label>
                <select
                  value={simErrorCode}
                  onChange={(e) => setSimErrorCode(e.target.value as SensorErrorCode)}
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg px-3 py-2 text-xs font-mono focus:outline-none"
                >
                  <option value="ERR_WEIGHT_SPIKE_ANOMALY">ERR_WEIGHT_SPIKE_ANOMALY (Abnormal Heavy Load Cell Jump)</option>
                  <option value="ERR_US_ECHO_TIMEOUT">ERR_US_ECHO_TIMEOUT (Ultrasonic Transducer Blockage / Timeout)</option>
                  <option value="ERR_LID_ACTUATOR_STUCK">ERR_LID_ACTUATOR_STUCK (Solar Compactor Flap Jammed)</option>
                  <option value="ERR_OPTICAL_DIRT_BLIND">ERR_OPTICAL_DIRT_BLIND (Optical / ToF Lens Soil Degradation)</option>
                  <option value="ERR_BATTERY_DRAIN_SURGE">ERR_BATTERY_DRAIN_SURGE (Rapid Parasitic Energy Discharge)</option>
                  <option value="ERR_TEMPERATURE_OVERHEAT">ERR_TEMPERATURE_OVERHEAT (Enclosure Thermal Spike &gt;48°C)</option>
                </select>
              </div>

              {simErrorCode === 'ERR_WEIGHT_SPIKE_ANOMALY' && (
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-300">Abnormal Weight Delta Surge:</span>
                    <span className="font-mono font-bold text-rose-400">+{simWeightDelta} kg</span>
                  </div>
                  <input
                    type="range"
                    min="100"
                    max="350"
                    step="10"
                    value={simWeightDelta}
                    onChange={(e) => setSimWeightDelta(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
                  />
                  <div className="text-[10px] text-slate-500 mt-1">
                    Simulates illegal dumping of wet concrete, tile rubble, or mechanical strain tare failure.
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsSimulateModalOpen(false)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-500 rounded-lg shadow-sm transition"
                >
                  Inject Anomaly &amp; Flag Bin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
