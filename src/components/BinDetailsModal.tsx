import React from 'react';
import { SmartBin, SensorErrorCode } from '../types';
import { 
  X, 
  Trash2, 
  Battery, 
  Thermometer, 
  Clock, 
  Activity, 
  AlertTriangle, 
  RefreshCw, 
  Zap, 
  MapPin,
  CheckCircle2,
  Wrench,
  Scale,
  Cpu,
  RotateCcw,
  Check
} from 'lucide-react';

interface BinDetailsModalProps {
  bin: SmartBin | null;
  onClose: () => void;
  onEmptyBin: (binId: string) => void;
  onSpikeBin: (binId: string) => void;
  onResolveAlert?: (alertId: string) => void;
  onTriggerAnomaly?: (binId: string, errorCode: SensorErrorCode, weightDelta?: number) => void;
}

export const BinDetailsModal: React.FC<BinDetailsModalProps> = ({
  bin,
  onClose,
  onEmptyBin,
  onSpikeBin,
  onResolveAlert,
  onTriggerAnomaly,
}) => {
  if (!bin) return null;

  const isCritical = bin.fillLevel >= 85;
  const isApproaching = bin.fillLevel >= 70 && bin.fillLevel < 85;
  const hasFault = bin.activeAlert || bin.activeErrorCode || bin.sensorHealth === 'Error' || bin.sensorHealth === 'Degraded';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white ${
              isCritical ? 'bg-rose-500' : isApproaching ? 'bg-amber-500' : 'bg-emerald-500'
            }`}>
              {bin.fillLevel}%
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">{bin.name}</h2>
                {hasFault && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-rose-950 text-rose-300 border border-rose-800 animate-pulse">
                    Maintenance Alert
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-400 font-mono">
                {bin.id} · {bin.zone} · {bin.wasteType}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Active Sensor Error / Weight Spike Alert Banner */}
          {hasFault ? (
            <div className="bg-rose-950/40 border border-rose-800/60 rounded-xl p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-rose-300 font-semibold text-xs">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>Hardware &amp; Sensor Anomaly Flagged</span>
                </div>
                <span className="px-2 py-0.5 bg-slate-950 border border-slate-800 rounded font-mono text-[10px] text-amber-300 font-bold">
                  {bin.activeErrorCode || 'ERR_HARDWARE_FLAG'}
                </span>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                {bin.activeAlert?.description || 
                  (bin.activeErrorCode === 'ERR_WEIGHT_SPIKE_ANOMALY' 
                    ? `Abnormal load cell weight surge (+${bin.weightAnomalyKg || 180} kg) detected without volumetric ultrasonic fill change. Suspected heavy construction/masonry dumping.`
                    : bin.activeErrorCode === 'ERR_US_ECHO_TIMEOUT'
                    ? '40 kHz ultrasonic ping pulse timed out. Transducer face obscured or damaged.'
                    : 'Sensor subsystem telemetry deviation flagged for technician inspection.')}
              </p>

              {bin.weightAnomalyKg && (
                <div className="flex items-center gap-4 text-xs font-mono text-slate-400 pt-1">
                  <span>Weight Spike: <strong className="text-rose-400">+{bin.weightAnomalyKg} kg</strong></span>
                  <span>Gross Weight: <strong className="text-white">{bin.currentWeightKg} kg</strong></span>
                </div>
              )}

              {bin.activeAlert && (
                <div className="pt-2 border-t border-rose-900/40 flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-mono">
                    Status: <strong className="text-amber-300">{bin.activeAlert.status}</strong>
                  </span>
                  {onResolveAlert && (
                    <button
                      onClick={() => onResolveAlert(bin.activeAlert!.id)}
                      className="px-2.5 py-1 text-xs font-medium text-emerald-300 bg-emerald-950/80 hover:bg-emerald-900/80 border border-emerald-800/60 rounded transition flex items-center gap-1"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Calibrate &amp; Clear Alert</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>All Subsystems Nominal (Acoustic Transducer, Optical Aperture, Load Cell Tare)</span>
              </div>
              <span className="font-mono text-emerald-400 font-bold text-[11px]">0 ERRORS</span>
            </div>
          )}

          {/* IoT Ultrasonic Telemetry Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-950/70 border border-slate-800 p-3 rounded-xl">
              <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-1">
                <Battery className="w-3.5 h-3.5 text-emerald-400" />
                <span>Battery</span>
              </div>
              <div className="text-base font-bold font-mono text-white tabular-nums">
                {bin.batteryLevel}%
              </div>
              <div className="text-[10px] text-slate-500 font-mono">Li-Ion Solar Recharged</div>
            </div>

            <div className="bg-slate-950/70 border border-slate-800 p-3 rounded-xl">
              <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-1">
                <Thermometer className="w-3.5 h-3.5 text-amber-400" />
                <span>Temperature</span>
              </div>
              <div className="text-base font-bold font-mono text-white tabular-nums">
                {bin.temperatureC}°C
              </div>
              <div className="text-[10px] text-slate-500 font-mono">Internal Thermal Probe</div>
            </div>

            <div className="bg-slate-950/70 border border-slate-800 p-3 rounded-xl">
              <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-1">
                <Trash2 className="w-3.5 h-3.5 text-sky-400" />
                <span>Payload Weight</span>
              </div>
              <div className="text-base font-bold font-mono text-white tabular-nums">
                {bin.currentWeightKg} kg
              </div>
              <div className="text-[10px] text-slate-500 font-mono">Load Cell Strain Gauge</div>
            </div>

            <div className="bg-slate-950/70 border border-slate-800 p-3 rounded-xl">
              <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-1">
                <Activity className="w-3.5 h-3.5 text-purple-400" />
                <span>Sensor Health</span>
              </div>
              <div className={`text-base font-bold font-mono ${
                bin.sensorHealth === 'Error' ? 'text-rose-400' : bin.sensorHealth === 'Degraded' ? 'text-amber-400' : 'text-emerald-400'
              }`}>
                {bin.sensorHealth}
              </div>
              <div className="text-[10px] text-slate-500 font-mono">Ultrasonic 40kHz</div>
            </div>
          </div>

          {/* Fill Level Progress Bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300 font-medium">Volumetric Fill Capacity ({bin.capacityLiters} L):</span>
              <span className={`font-mono font-bold ${
                isCritical ? 'text-rose-400' : isApproaching ? 'text-amber-400' : 'text-emerald-400'
              }`}>
                {bin.fillLevel}% ({(bin.capacityLiters * (bin.fillLevel / 100)).toFixed(0)} L)
              </span>
            </div>
            <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden border border-slate-800">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isCritical ? 'bg-rose-500' : isApproaching ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${bin.fillLevel}%` }}
              />
            </div>
          </div>

          {/* AI Machine Learning Forecast Box */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-white flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                AI Fill Progression Forecast
              </span>
              <span className="text-slate-400 font-mono">Scikit-Learn Regression</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs pt-1">
              <div>
                <span className="text-slate-400">Time Until 100% Full:</span>
                <div className="text-sm font-mono font-bold text-amber-400 mt-0.5">
                  {bin.predictedHoursToFull} hours
                </div>
              </div>
              <div>
                <span className="text-slate-400">Next 4h Forecasted Fill:</span>
                <div className="text-sm font-mono font-bold text-slate-200 mt-0.5">
                  {bin.predictedFillNext4h}%
                </div>
              </div>
            </div>
          </div>

          {/* Location & Last Collection */}
          <div className="text-xs text-slate-400 flex flex-col sm:flex-row justify-between gap-2 border-t border-slate-800 pt-4">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span>Last emptied: {bin.lastCollectionTime}</span>
            </div>
            <div className="flex items-center gap-1.5 font-mono text-[11px]">
              <MapPin className="w-3.5 h-3.5 text-slate-500" />
              <span>GPS: {bin.lat.toFixed(4)}, {bin.lng.toFixed(4)}</span>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="px-6 py-4 bg-slate-950/60 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onSpikeBin(bin.id);
              }}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-amber-300 bg-amber-950/40 hover:bg-amber-900/40 border border-amber-800/60 rounded-lg transition"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>+25% Fill Spike</span>
            </button>

            {onTriggerAnomaly && !hasFault && (
              <button
                onClick={() => {
                  onTriggerAnomaly(bin.id, 'ERR_WEIGHT_SPIKE_ANOMALY', 180);
                }}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-rose-300 bg-rose-950/40 hover:bg-rose-900/40 border border-rose-800/60 rounded-lg transition"
                title="Test abnormal weight surge alert"
              >
                <Scale className="w-3.5 h-3.5" />
                <span>Simulate Weight Spike (+180kg)</span>
              </button>
            )}
          </div>

          <button
            onClick={() => {
              onEmptyBin(bin.id);
              onClose();
            }}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-sm transition"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Empty / Collect Bin Now</span>
          </button>
        </div>
      </div>
    </div>
  );
};

