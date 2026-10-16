import React, { useState, useEffect } from 'react';
import { 
  Radio, 
  Send, 
  Terminal, 
  Cpu, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  Sliders, 
  Wifi, 
  Zap,
  ShieldAlert,
  X
} from 'lucide-react';
import { SmartBin, SensorErrorCode } from '../types';

interface IoTTelemetrySimulatorProps {
  isOpen: boolean;
  onClose: () => void;
  bins: SmartBin[];
  onInjectTelemetry: (
    binId: string, 
    fillPct: number, 
    weightKg: number, 
    tempC: number, 
    errorCode?: SensorErrorCode
  ) => void;
}

interface MqttPacket {
  id: string;
  topic: string;
  timestamp: string;
  binId: string;
  payload: {
    device_id: string;
    firmware: string;
    distance_cm: number;
    fill_level_pct: number;
    weight_kg: number;
    battery_mv: number;
    temp_c: number;
    rssi_dbm: number;
    error_code?: string;
  };
}

export const IoTTelemetrySimulator: React.FC<IoTTelemetrySimulatorProps> = ({
  isOpen,
  onClose,
  bins,
  onInjectTelemetry,
}) => {
  const [selectedBinId, setSelectedBinId] = useState<string>(bins[0]?.id || 'BIN-101');
  const [fillLevel, setFillLevel] = useState<number>(85);
  const [weightKg, setWeightKg] = useState<number>(230);
  const [temperatureC, setTemperatureC] = useState<number>(24.5);
  const [selectedErrorCode, setSelectedErrorCode] = useState<SensorErrorCode | 'NONE'>('NONE');
  const [packets, setPackets] = useState<MqttPacket[]>([]);
  const [isAutoStreaming, setIsAutoStreaming] = useState<boolean>(true);

  // Initialize selected bin state when bin changes
  useEffect(() => {
    const target = bins.find(b => b.id === selectedBinId);
    if (target) {
      setFillLevel(target.fillLevel);
      setWeightKg(target.currentWeightKg);
      setTemperatureC(target.temperatureC);
    }
  }, [selectedBinId, bins]);

  // Simulate passive background MQTT telemetry stream every 4 seconds
  useEffect(() => {
    if (!isAutoStreaming || !isOpen) return;

    const interval = setInterval(() => {
      if (bins.length === 0) return;
      const randomBin = bins[Math.floor(Math.random() * bins.length)];
      const jitterFill = Math.min(100, Math.max(5, randomBin.fillLevel + (Math.random() * 2 - 0.5)));
      const distCm = Math.round(110 - (jitterFill / 100) * 95);

      const packet: MqttPacket = {
        id: `pkt-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        topic: `smartcity/nodes/${randomBin.id}/telemetry`,
        timestamp: new Date().toLocaleTimeString(),
        binId: randomBin.id,
        payload: {
          device_id: `ESP32-NODE-${randomBin.id.replace('BIN-', '')}`,
          firmware: 'v2.8.4-mbedTLS',
          distance_cm: distCm,
          fill_level_pct: Number(jitterFill.toFixed(1)),
          weight_kg: Number((randomBin.currentWeightKg + (Math.random() * 1.5 - 0.2)).toFixed(1)),
          battery_mv: 3940 - Math.floor(Math.random() * 50),
          temp_c: Number((22.5 + Math.random() * 4).toFixed(1)),
          rssi_dbm: -64 - Math.floor(Math.random() * 18),
          error_code: randomBin.activeErrorCode,
        },
      };

      setPackets(prev => [packet, ...prev.slice(0, 15)]);
    }, 3800);

    return () => clearInterval(interval);
  }, [isAutoStreaming, isOpen, bins]);

  if (!isOpen) return null;

  const currentBin = bins.find(b => b.id === selectedBinId);

  const handleTransmit = () => {
    const err = selectedErrorCode === 'NONE' ? undefined : selectedErrorCode;
    onInjectTelemetry(selectedBinId, fillLevel, weightKg, temperatureC, err);

    // Push explicitly into MQTT log
    const distCm = Math.round(110 - (fillLevel / 100) * 95);
    const manualPacket: MqttPacket = {
      id: `pkt-manual-${Date.now()}`,
      topic: `smartcity/nodes/${selectedBinId}/telemetry/injected`,
      timestamp: new Date().toLocaleTimeString(),
      binId: selectedBinId,
      payload: {
        device_id: `ESP32-NODE-${selectedBinId.replace('BIN-', '')}`,
        firmware: 'v2.8.4-mbedTLS',
        distance_cm: distCm,
        fill_level_pct: fillLevel,
        weight_kg: weightKg,
        battery_mv: 3910,
        temp_c: temperatureC,
        rssi_dbm: -58,
        error_code: err,
      },
    };

    setPackets(prev => [manualPacket, ...prev.slice(0, 15)]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">
                  IoT Edge Hardware & MQTT Telemetry Streamer
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-purple-950 text-purple-300 border border-purple-800">
                  MQTT v5.0 / TLS
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Live simulated hardware stream from ESP32 + HC-SR04 ultrasonic & HX711 load cell transceivers
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsAutoStreaming(!isAutoStreaming)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium border transition ${
                isAutoStreaming
                  ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >
              <Wifi className="w-3.5 h-3.5" />
              <span>{isAutoStreaming ? 'Stream Active' : 'Stream Paused'}</span>
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-y-auto">
          {/* Left Column: Manual Packet Injection Workbench (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-white uppercase tracking-wider">
              <Sliders className="w-4 h-4 text-purple-400" />
              <span>Edge Telemetry Injector</span>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 space-y-3.5">
              {/* Select Bin */}
              <div>
                <label className="text-xs text-slate-400 block mb-1">Target IoT Device Node</label>
                <select
                  value={selectedBinId}
                  onChange={e => setSelectedBinId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-3 py-2 text-xs font-mono focus:border-purple-500 focus:outline-none"
                >
                  {bins.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.id} - {b.name} ({b.fillLevel}%)
                    </option>
                  ))}
                </select>
              </div>

              {/* Fill Level Slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Ultrasonic Fill Percentage:</span>
                  <span className="font-mono text-white font-bold">{fillLevel}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={fillLevel}
                  onChange={e => setFillLevel(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>Empty (110cm)</span>
                  <span>Calculated dist: {Math.round(110 - (fillLevel / 100) * 95)}cm</span>
                  <span>Overflow (&lt;15cm)</span>
                </div>
              </div>

              {/* Weight Slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">HX711 Strain Gauge Weight:</span>
                  <span className="font-mono text-white font-bold">{weightKg} kg</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="450"
                  value={weightKg}
                  onChange={e => setWeightKg(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>Empty Tare (12kg)</span>
                  <span>Nominal Full (240kg)</span>
                  <span>Heavy Anomaly (&gt;350kg)</span>
                </div>
              </div>

              {/* Temperature */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Chamber Temperature:</span>
                  <span className="font-mono text-white font-bold">{temperatureC}°C</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="55"
                  step="0.5"
                  value={temperatureC}
                  onChange={e => setTemperatureC(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
              </div>

              {/* Error Code Injection */}
              <div>
                <label className="text-xs text-slate-400 block mb-1">
                  Inject Hardware Diagnostic Code
                </label>
                <select
                  value={selectedErrorCode}
                  onChange={e => setSelectedErrorCode(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-3 py-2 text-xs font-mono focus:border-purple-500 focus:outline-none"
                >
                  <option value="NONE">NONE (Normal Operational State)</option>
                  <option value="ERR_WEIGHT_SPIKE_ANOMALY">ERR_WEIGHT_SPIKE_ANOMALY (Weight Surge)</option>
                  <option value="ERR_LID_ACTUATOR_STUCK">ERR_LID_ACTUATOR_STUCK (Compactor Flap Jammed)</option>
                  <option value="ERR_US_ECHO_TIMEOUT">ERR_US_ECHO_TIMEOUT (Transducer Echo Lost)</option>
                  <option value="ERR_OPTICAL_DIRT_BLIND">ERR_OPTICAL_DIRT_BLIND (Soiled Lens)</option>
                  <option value="ERR_BATTERY_DRAIN_SURGE">ERR_BATTERY_DRAIN_SURGE (Power Fault)</option>
                  <option value="ERR_TEMPERATURE_OVERHEAT">ERR_TEMPERATURE_OVERHEAT (Thermal Spike)</option>
                </select>
              </div>

              {/* Transmit Button */}
              <button
                onClick={handleTransmit}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold rounded-lg shadow-md transition active:scale-[0.98]"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Publish MQTT Telemetry Packet</span>
              </button>
            </div>

            {/* Quick Trigger Presets */}
            <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 space-y-2">
              <span className="text-[11px] font-semibold text-slate-400 block">
                Quick Real-World Anomaly Scenarios
              </span>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <button
                  onClick={() => {
                    setFillLevel(96);
                    setWeightKg(365);
                    setSelectedErrorCode('ERR_WEIGHT_SPIKE_ANOMALY');
                  }}
                  className="p-2 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 text-left border border-slate-800 hover:border-slate-700 transition"
                >
                  <span className="font-semibold text-rose-400 block">Masonry Dumping</span>
                  <span className="text-[10px] text-slate-500">+180kg dense spike</span>
                </button>
                <button
                  onClick={() => {
                    setFillLevel(92);
                    setWeightKg(240);
                    setSelectedErrorCode('ERR_LID_ACTUATOR_STUCK');
                  }}
                  className="p-2 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 text-left border border-slate-800 hover:border-slate-700 transition"
                >
                  <span className="font-semibold text-amber-400 block">Jammed Compactor</span>
                  <span className="text-[10px] text-slate-500">Solar flap seized 45°</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Live MQTT Packet Stream Console (7 cols) */}
          <div className="lg:col-span-7 flex flex-col space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-white uppercase tracking-wider">
                <Terminal className="w-4 h-4 text-emerald-400" />
                <span>MQTT Broker Ingestion Stream (Port 8883 TLS)</span>
              </div>
              <span className="text-[10px] font-mono text-slate-400">
                {packets.length} packets logged
              </span>
            </div>

            <div className="flex-1 bg-slate-950 rounded-xl border border-slate-800 p-3 font-mono text-xs overflow-y-auto max-h-[460px] space-y-2.5">
              {packets.length === 0 ? (
                <div className="text-slate-500 text-center py-12">
                  <Cpu className="w-8 h-8 mx-auto mb-2 text-slate-600 animate-pulse" />
                  <span>Connecting to MQTT Broker broker.smartcity.internal:8883...</span>
                </div>
              ) : (
                packets.map(pkt => {
                  const isErr = !!pkt.payload.error_code;
                  return (
                    <div
                      key={pkt.id}
                      className={`p-2.5 rounded-lg border text-[11px] leading-relaxed transition ${
                        isErr
                          ? 'bg-rose-950/20 border-rose-800/60 text-rose-200'
                          : 'bg-slate-900/80 border-slate-800/80 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between text-slate-400 text-[10px] mb-1">
                        <span className="text-emerald-400 font-semibold">{pkt.topic}</span>
                        <span className="text-slate-500">{pkt.timestamp}</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-slate-800/60">
                        <div>
                          <span className="text-slate-500 block text-[9px]">FILL LEVEL</span>
                          <span className={`font-bold ${pkt.payload.fill_level_pct >= 85 ? 'text-rose-400' : 'text-slate-200'}`}>
                            {pkt.payload.fill_level_pct}%
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[9px]">WEIGHT</span>
                          <span className="text-slate-200 font-bold">{pkt.payload.weight_kg} kg</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[9px]">BATTERY</span>
                          <span className="text-emerald-400 font-bold">{pkt.payload.battery_mv} mV</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[9px]">SIGNAL</span>
                          <span className="text-sky-400 font-bold">{pkt.payload.rssi_dbm} dBm</span>
                        </div>
                      </div>
                      {isErr && (
                        <div className="mt-1.5 pt-1 border-t border-rose-800/40 text-rose-300 font-bold flex items-center gap-1.5 text-[10px]">
                          <ShieldAlert className="w-3 h-3 text-rose-400 shrink-0" />
                          <span>DIAGNOSTIC FLAG: {pkt.payload.error_code}</span>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
