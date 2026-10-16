import React, { useState } from 'react';
import { 
  SmartBin, 
  FleetTruck, 
  GraphNode, 
  GraphEdge 
} from '../types';
import { RoadGraph, PathResult } from '../algorithms/AStarRouter';
import { downloadDriverManifest } from '../utils/dataExport';
import { 
  Truck, 
  Navigation, 
  Play, 
  CheckCircle2, 
  Fuel, 
  Clock, 
  ArrowRight, 
  Compass, 
  Sparkles,
  Zap,
  Activity,
  Layers,
  FileText,
  Gauge,
  MapPin,
  Check
} from 'lucide-react';

interface RouteAndFleetViewProps {
  bins: SmartBin[];
  trucks: FleetTruck[];
  roadGraph: RoadGraph;
  onDispatchFleet: () => void;
  isDispatching: boolean;
  activeRouteLegs: PathResult[];
  onSelectBin: (bin: SmartBin) => void;
  onCollectBin?: (binId: string) => void;
}

export const RouteAndFleetView: React.FC<RouteAndFleetViewProps> = ({
  bins,
  trucks,
  roadGraph,
  onDispatchFleet,
  isDispatching,
  activeRouteLegs,
  onSelectBin,
  onCollectBin,
}) => {
  // Sandbox test between any two nodes
  const [startNodeId, setStartNodeId] = useState<string>('DEPOT-CENTRAL');
  const [endNodeId, setEndNodeId] = useState<string>('BIN-102');
  const [selectedTruckId, setSelectedTruckId] = useState<string>('TRK-01');

  const nodesList = Array.from(roadGraph.nodes.values());
  const calculatedPath = roadGraph.findAStarPath(startNodeId, endNodeId);
  const selectedTruck = trucks.find(t => t.id === selectedTruckId) || trucks[0];

  return (
    <div className="space-y-6">
      {/* Fleet Dispatch Overview Header */}
      <div className="bg-[#090e1c]/80 backdrop-blur-xl border border-white/[0.08] rounded-2xl p-5 sm:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-5 shadow-2xl relative overflow-hidden">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
            <span>Fleet Operations & Graph Routing</span>
            <span className="text-slate-600">/</span>
            <span className="text-emerald-400 font-mono font-semibold">A* Search Heuristic f(n) = g(n) + h(n)</span>
          </div>
          <h1 className="font-display text-xl sm:text-2xl font-bold text-white tracking-tight mt-1">
            Dynamic Fleet Management & Multi-Stop Dispatch
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-3xl leading-relaxed">
            Assigns Heap-prioritized overflowing containers to available municipal trucks, optimizing multi-stop routes across road congestion matrices.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => downloadDriverManifest(selectedTruck, activeRouteLegs)}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 border border-white/[0.08] rounded-xl shadow-sm transition active:scale-[0.98]"
          >
            <FileText className="w-3.5 h-3.5 text-sky-400" />
            <span>Export Manifest</span>
          </button>

          <button
            onClick={onDispatchFleet}
            disabled={isDispatching}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:bg-slate-800 disabled:text-slate-500 rounded-xl shadow-lg shadow-emerald-950/60 border border-emerald-400/30 transition active:scale-[0.98]"
          >
            {isDispatching ? (
              <>
                <Zap className="w-4 h-4 text-emerald-400 animate-spin" />
                <span>Simulating Round...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                <span>Dispatch Fleet (A*)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Fleet Truck Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {trucks.map(truck => {
          const loadPercent = Math.min(100, Math.round((truck.currentLoadKg / truck.capacityKg) * 100));
          const isWorking = truck.status !== 'Idle' && truck.status !== 'Off-Duty';
          const isSelected = truck.id === selectedTruckId;

          return (
            <div
              key={truck.id}
              onClick={() => setSelectedTruckId(truck.id)}
              className={`bg-[#090e1c]/80 backdrop-blur-md border rounded-2xl p-5 flex flex-col justify-between cursor-pointer transition-all shadow-xl hover:shadow-2xl ${
                isSelected
                  ? 'border-sky-500 ring-1 ring-sky-500/50 shadow-sky-950/30'
                  : isWorking
                  ? 'border-emerald-500/50'
                  : 'border-white/[0.08] hover:border-white/[0.16]'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-sky-400">
                      <Truck className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-white">{truck.name}</h3>
                      <div className="text-[11px] text-slate-400 font-mono">
                        {truck.licensePlate} · {truck.fuelType}
                      </div>
                    </div>
                  </div>

                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium ${
                    truck.status === 'Collecting'
                      ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-800/60 animate-pulse'
                      : truck.status === 'En Route'
                      ? 'bg-sky-950/70 text-sky-300 border border-sky-800/60'
                      : 'bg-slate-950 text-slate-400 border border-slate-800'
                  }`}>
                    {truck.status}
                  </span>
                </div>

                {/* Driver & Model */}
                <div className="text-xs text-slate-400 space-y-1 mb-4">
                  <div className="flex justify-between">
                    <span>Assigned Driver:</span>
                    <span className="text-slate-200 font-medium">{truck.driver}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Vehicle Model:</span>
                    <span className="text-slate-300 truncate max-w-[160px]">{truck.vehicleModel}</span>
                  </div>
                </div>

                {/* Payload Capacity Bar */}
                <div className="space-y-1.5 mb-3">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Cargo Payload:</span>
                    <span className="font-mono text-slate-200 font-semibold">
                      {truck.currentLoadKg} / {truck.capacityKg} kg ({loadPercent}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        loadPercent >= 90 ? 'bg-rose-500' : loadPercent >= 60 ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${loadPercent}%` }}
                    />
                  </div>
                </div>

                {/* Battery / Fuel */}
                <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                  <span className="flex items-center gap-1">
                    <Fuel className="w-3.5 h-3.5 text-slate-500" />
                    <span>Battery / Energy Level:</span>
                  </span>
                  <span className="font-mono text-emerald-400 font-bold">{truck.fuelLevelPercent}%</span>
                </div>
              </div>

              {/* Route Summary */}
              <div className="pt-4 border-t border-slate-800 text-xs text-slate-400 flex justify-between items-center">
                <span>Stops: {truck.assignedRoute.length} scheduled</span>
                <span className="font-mono text-emerald-400">
                  {truck.collectedBinIds.length} collected today
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* In-Cab Mobile Data Terminal (MDT) for Selected Truck */}
      {selectedTruck && (
        <div className="bg-[#090e1c]/80 backdrop-blur-xl border border-sky-500/40 rounded-2xl p-5 sm:p-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 px-3.5 py-1 bg-sky-500/15 text-sky-300 border-b border-l border-sky-500/30 rounded-bl-xl font-mono text-[10px] font-bold uppercase tracking-wider">
            In-Cab MDT Terminal // Touchscreen HUD
          </div>

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5">
            <div>
              <div className="flex items-center gap-2">
                <Navigation className="w-4 h-4 text-sky-400 animate-pulse" />
                <h3 className="font-display text-base font-bold text-white tracking-tight">
                  {selectedTruck.name} — Driver Cockpit ({selectedTruck.driver})
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Real-time telematics, hydraulic compaction status, and turn-by-turn waypoint execution
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
              <div className="px-3 py-1.5 bg-slate-950/80 rounded-xl border border-white/[0.08] flex items-center gap-2">
                <Gauge className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-slate-400">Hydraulic Compactor:</span>
                <span className="text-amber-300 font-bold">185 bar</span>
              </div>
              <div className="px-3 py-1.5 bg-slate-950/80 rounded-xl border border-white/[0.08] flex items-center gap-2">
                <Activity className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-slate-400">Tare Scale:</span>
                <span className="text-emerald-300 font-bold">Calibrated (±0.5kg)</span>
              </div>
            </div>
          </div>

          {/* Active Navigation Manifest in MDT */}
          <div className="bg-[#050811]/90 rounded-2xl border border-white/[0.08] p-4 sm:p-5 space-y-3.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-white flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                Next Dispatched Stops on Route
              </span>
              <span className="text-slate-400 font-mono text-[11px] bg-slate-950 px-2 py-0.5 rounded border border-white/[0.08]">
                {selectedTruck.assignedRoute.length} total waypoints
              </span>
            </div>

            {selectedTruck.assignedRoute.length === 0 ? (
              <div className="text-xs text-slate-500 py-3 text-center">
                Truck is currently waiting at Central Eco-Depot. Click "Dispatch Optimized Fleet (A*)" above to generate dynamic route legs.
              </div>
            ) : (
              <div className="space-y-2">
                {selectedTruck.assignedRoute.slice(0, 4).map((stopId, idx) => {
                  const targetBin = bins.find(b => b.id === stopId);
                  const isCurrent = idx === 0;

                  return (
                    <div
                      key={`stop-${stopId}-${idx}`}
                      className={`p-3 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs transition ${
                        isCurrent
                          ? 'bg-sky-950/30 border-sky-600/60 text-sky-200'
                          : 'bg-slate-900/60 border-slate-800 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                          isCurrent ? 'bg-sky-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                        }`}>
                          {idx + 1}
                        </span>
                        <div>
                          <div className="font-semibold text-white">
                            {stopId} {targetBin ? `— ${targetBin.name}` : '(Depot / Road Waypoint)'}
                          </div>
                          {targetBin && (
                            <div className="text-[11px] text-slate-400">
                              Zone: {targetBin.zone} · Current Fill: <span className="font-mono text-rose-400">{targetBin.fillLevel}%</span> · Mass: {targetBin.currentWeightKg} kg
                            </div>
                          )}
                        </div>
                      </div>

                      {targetBin && onCollectBin && (
                        <button
                          onClick={() => onCollectBin(targetBin.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow transition whitespace-nowrap self-start sm:self-auto"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Empty & Tare Bin</span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* A* Search Pathfinding Algorithm Sandbox */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-white tracking-wide">
              A* Shortest Pathfinding Interactive Workbench
            </h2>
            <p className="text-xs text-slate-400">
              Evaluates road distance and real-time traffic congestion factor using admissible Euclidean heuristic
            </p>
          </div>
          <span className="text-xs font-mono text-slate-400 bg-slate-950 px-2.5 py-1 rounded border border-slate-800">
            Admissible Heuristic: h(n) = Euclidean Distance
          </span>
        </div>

        {/* Node Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-xs text-slate-400 font-medium block mb-1">
              Start Node:
            </label>
            <select
              value={startNodeId}
              onChange={(e) => setStartNodeId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg px-3 py-2 text-xs font-mono focus:outline-none"
            >
              {nodesList.map(node => (
                <option key={node.id} value={node.id}>
                  {node.id} - {node.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-slate-400 font-medium block mb-1">
              Destination Node:
            </label>
            <select
              value={endNodeId}
              onChange={(e) => setEndNodeId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg px-3 py-2 text-xs font-mono focus:outline-none"
            >
              {nodesList.map(node => (
                <option key={node.id} value={node.id}>
                  {node.id} - {node.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Calculated A* Path Result */}
        {calculatedPath ? (
          <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-2.5 bg-slate-900 rounded-md border border-slate-800/80">
                <div className="text-slate-400">Road Distance:</div>
                <div className="text-base font-bold font-mono text-white mt-0.5">
                  {calculatedPath.totalDistanceKm} km
                </div>
              </div>

              <div className="p-2.5 bg-slate-900 rounded-md border border-slate-800/80">
                <div className="text-slate-400">Estimated Travel Time:</div>
                <div className="text-base font-bold font-mono text-sky-400 mt-0.5">
                  {calculatedPath.estimatedMinutes} mins
                </div>
              </div>

              <div className="p-2.5 bg-slate-900 rounded-md border border-slate-800/80">
                <div className="text-slate-400">Fuel Expenditure:</div>
                <div className="text-base font-bold font-mono text-amber-400 mt-0.5">
                  {calculatedPath.fuelLiters} L
                </div>
              </div>

              <div className="p-2.5 bg-slate-900 rounded-md border border-slate-800/80">
                <div className="text-slate-400">Traffic Delay:</div>
                <div className="text-base font-bold font-mono text-rose-400 mt-0.5">
                  +{calculatedPath.trafficDelayMinutes} mins
                </div>
              </div>
            </div>

            {/* Waypoint Sequence */}
            <div>
              <div className="text-[11px] text-slate-400 font-mono uppercase mb-1.5">
                Waypoint Path Traversed ({calculatedPath.pathNodeIds.length} hops):
              </div>
              <div className="flex flex-wrap items-center gap-1.5 font-mono text-xs text-slate-300">
                {calculatedPath.pathNodeIds.map((nodeId, idx) => (
                  <React.Fragment key={`waypoint-${idx}`}>
                    <span className="px-2 py-0.5 bg-slate-900 border border-slate-800 rounded font-semibold text-emerald-400">
                      {nodeId}
                    </span>
                    {idx < calculatedPath.pathNodeIds.length - 1 && (
                      <ArrowRight className="w-3 h-3 text-slate-600 shrink-0" />
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-slate-950 text-center text-xs text-slate-500 rounded-lg">
            No valid road connection between selected nodes.
          </div>
        )}
      </div>

      {/* Dispatched Multi-Stop Legs Detail (if available) */}
      {activeRouteLegs.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-white tracking-wide mb-3">
            Active Multi-Stop Collection Manifest (A* Segments)
          </h2>
          <div className="space-y-2">
            {activeRouteLegs.map((leg, idx) => (
              <div
                key={`manifest-${idx}`}
                className="p-3 bg-slate-950 border border-slate-800/80 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono"
              >
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] font-bold">
                    {idx + 1}
                  </span>
                  <span className="text-slate-300 font-medium">
                    {leg.pathNodeIds[0]} → {leg.pathNodeIds[leg.pathNodeIds.length - 1]}
                  </span>
                  <span className="text-slate-500">
                    ({leg.pathNodeIds.length} road intersections)
                  </span>
                </div>
                <div className="flex items-center gap-4 text-slate-400">
                  <span>{leg.totalDistanceKm} km</span>
                  <span>{leg.estimatedMinutes} min</span>
                  <span className="text-emerald-400">{leg.fuelLiters} L fuel</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
