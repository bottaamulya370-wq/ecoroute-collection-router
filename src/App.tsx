import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  SmartBin, 
  FleetTruck, 
  CitizenReport, 
  SimulationSettings, 
  HeapItem,
  GraphNode,
  MaintenanceAlert,
  SensorErrorCode
} from './types';
import { 
  INITIAL_BINS, 
  INITIAL_TRUCKS, 
  ROAD_INTERSECTIONS, 
  ROAD_EDGES, 
  INITIAL_CITIZEN_REPORTS, 
  INITIAL_MAINTENANCE_ALERTS,
  DEPOT_NODE, 
  ENVIRONMENTAL_FACTORS 
} from './data/mockData';
import { CITY_PROFILES } from './data/cityPresets';
import { MaxHeapPriorityQueue } from './algorithms/HeapPriorityQueue';
import { RoadGraph, PathResult } from './algorithms/AStarRouter';
import { MLFillPredictor } from './algorithms/MLFillPredictor';
import { generateSmartCityPDFReport } from './utils/pdfReportGenerator';
import { downloadMLTrainingDatasetCSV, downloadCityGeoJSON } from './utils/dataExport';

import { Navbar, BackgroundTheme, THEME_OPTIONS } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { CityHeatmapView } from './components/CityHeatmapView';
import { HeapVisualizerView } from './components/HeapVisualizerView';
import { RouteAndFleetView } from './components/RouteAndFleetView';
import { MaintenanceAlertsView } from './components/MaintenanceAlertsView';
import { CitizenPortalView } from './components/CitizenPortalView';
import { ArchitectureView } from './components/ArchitectureView';
import { BinDetailsModal } from './components/BinDetailsModal';
import { NewReportModal } from './components/NewReportModal';
import { ToastContainer, ToastMessage } from './components/ToastNotification';
import { IoTTelemetrySimulator } from './components/IoTTelemetrySimulator';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [currentCityId, setCurrentCityId] = useState<string>('metro-central');
  const [bgTheme, setBgTheme] = useState<BackgroundTheme>(() => {
    return (localStorage.getItem('ecoroute_bg_theme') as BackgroundTheme) || 'obsidian';
  });
  const [bins, setBins] = useState<SmartBin[]>(INITIAL_BINS);
  const [trucks, setTrucks] = useState<FleetTruck[]>(INITIAL_TRUCKS);
  const [reports, setReports] = useState<CitizenReport[]>(INITIAL_CITIZEN_REPORTS);
  const [alerts, setAlerts] = useState<MaintenanceAlert[]>(INITIAL_MAINTENANCE_ALERTS);

  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isTelemetryModalOpen, setIsTelemetryModalOpen] = useState(false);
  const [selectedBin, setSelectedBin] = useState<SmartBin | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isDispatching, setIsDispatching] = useState(false);
  const [activeRouteLegs, setActiveRouteLegs] = useState<PathResult[]>([]);

  // Toast Notification helper
  const addToast = (type: 'success' | 'warning' | 'error' | 'info', title: string, message: string) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts(prev => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  };

  const dismissToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Synchronize Background Color Theme with DOM body
  useEffect(() => {
    document.body.className = `theme-${bgTheme} text-slate-100 antialiased font-sans selection:bg-emerald-500/30 selection:text-emerald-300`;
    localStorage.setItem('ecoroute_bg_theme', bgTheme);
  }, [bgTheme]);

  const handleSelectBgTheme = (newTheme: BackgroundTheme) => {
    setBgTheme(newTheme);
    const themeObj = THEME_OPTIONS.find(t => t.id === newTheme);
    addToast('info', 'Background Palette Updated', `Switched theme to ${themeObj?.name || newTheme}.`);
  };

  // City Topology Switcher
  const handleSelectCity = (cityId: string) => {
    setCurrentCityId(cityId);
    const profile = CITY_PROFILES.find(p => p.id === cityId);
    if (!profile) return;
    setBins(prev => prev.map((b, idx) => {
      const cityBin = profile.bins[idx % profile.bins.length];
      return {
        ...b,
        name: cityBin.name || b.name,
        zone: cityBin.zone || b.zone,
        lat: cityBin.lat || b.lat,
        lng: cityBin.lng || b.lng,
      };
    }));
    addToast('info', 'Municipal Topology Switched', `Active corridor set to ${profile.name} (${profile.country}).`);
  };

  // Telemetry Injection Handler
  const handleInjectTelemetry = (
    binId: string, 
    fillPct: number, 
    weightKg: number, 
    tempC: number, 
    errorCode?: SensorErrorCode
  ) => {
    setBins(prev => prev.map(b => {
      if (b.id === binId) {
        const updated = {
          ...b,
          fillLevel: fillPct,
          currentWeightKg: weightKg,
          temperatureC: tempC,
          activeErrorCode: errorCode,
          sensorHealth: (errorCode ? 'Error' : 'Optimal') as any,
          status: (errorCode ? 'Maintenance' : (fillPct >= 85 ? 'Critical / Overflow' : (fillPct >= 70 ? 'Approaching Full' : 'Normal'))) as any,
        };
        return recalculateBinML(updated, b.associatedReportsCount);
      }
      return b;
    }));

    if (errorCode) {
      const targetBin = bins.find(b => b.id === binId);
      const newAlert: MaintenanceAlert = {
        id: `MNT-${Date.now().toString().slice(-4)}`,
        binId,
        binName: targetBin?.name || binId,
        zone: targetBin?.zone || 'Commercial',
        errorCode,
        errorTitle: errorCode === 'ERR_WEIGHT_SPIKE_ANOMALY' 
          ? 'Abnormal Load Cell Mass Surge' 
          : errorCode === 'ERR_LID_ACTUATOR_STUCK' 
          ? 'Solar Compacting Flap Jammed' 
          : 'Sensor Telemetry Diagnostic Warning',
        severity: errorCode === 'ERR_WEIGHT_SPIKE_ANOMALY' ? 'Critical' : 'High',
        status: 'Flagged',
        timestamp: 'Just now',
        currentFillLevel: fillPct,
        currentWeightKg: weightKg,
        description: `MQTT edge diagnostic payload reported ${errorCode}. Immediate inspection flagged.`,
        recommendedAction: 'Dispatch field technician for on-site transducer calibration.',
      };
      setAlerts(prev => [newAlert, ...prev]);
      addToast('error', 'Hardware Alert Triggered', `Diagnostic code ${errorCode} on ${binId}. Maintenance ticket issued.`);
    } else {
      addToast('success', 'MQTT Telemetry Processed', `Container ${binId} updated to ${fillPct}% fill (${weightKg} kg). Priority re-ranked.`);
    }
  };

  // Data Hub exports
  const handleExportMLDataset = () => {
    downloadMLTrainingDatasetCSV();
    addToast('success', 'Dataset Exported', '5,000+ row IoT sensor time-series dataset (CSV) downloaded.');
  };

  const handleExportGeoJSON = () => {
    downloadCityGeoJSON(bins, DEPOT_NODE);
    addToast('success', 'GeoJSON Exported', 'Spatial container GIS coordinates downloaded.');
  };

  // Simulation settings
  const [simulation, setSimulation] = useState<SimulationSettings>({
    isRunning: true,
    speedMultiplier: 1,
    weatherCondition: 'Clear',
    trafficCondition: 'Normal',
    collectionThreshold: 75,
  });

  // Environmental dynamic stats
  const [totalDistanceSavedKm, setTotalDistanceSavedKm] = useState<number>(23.8);
  const [fuelSavedLiters, setFuelSavedLiters] = useState<number>(14.2);
  const [co2SavedKg, setCo2SavedKg] = useState<number>(38.1);
  const [costSavedUsd, setCostSavedUsd] = useState<number>(54.6);

  // Initialize RoadGraph
  const roadGraph = useMemo(() => {
    const binNodes: GraphNode[] = bins.map(b => ({
      id: b.id,
      name: b.name,
      x: b.x,
      y: b.y,
      type: 'bin',
      binId: b.id,
    }));
    const graphNodes: GraphNode[] = [DEPOT_NODE, ...ROAD_INTERSECTIONS, ...binNodes];
    return new RoadGraph(graphNodes, ROAD_EDGES);
  }, [bins]);

  // Initialize Max-Heap Priority Queue
  const heapQueue = useMemo(() => {
    const heapItems: HeapItem[] = bins.map(b => ({
      binId: b.id,
      binName: b.name,
      urgencyScore: b.urgencyScore,
      fillLevel: b.fillLevel,
      predictedHoursToFull: b.predictedHoursToFull,
      zone: b.zone,
    }));
    return new MaxHeapPriorityQueue(heapItems);
  }, [bins]);

  // Recalculate Urgency Score for a bin using ML prediction
  const recalculateBinML = (bin: SmartBin, reportsCount: number): SmartBin => {
    const weatherPenalty = simulation.weatherCondition === 'Rainy' ? 1.25 : 1.0;
    const zoneWeight = bin.zone.includes('Commercial') ? 1.4 : bin.zone.includes('Industrial') ? 1.2 : 1.0;

    const mlResult = MLFillPredictor.predict({
      currentFill: bin.fillLevel,
      rateLast4Hours: 3.2,
      hourOfDay: 14,
      isWeekend: false,
      zoneWeight,
      weatherPenalty,
      reportedIssuesCount: reportsCount,
    });

    return {
      ...bin,
      predictedHoursToFull: mlResult.hoursUntilFull,
      predictedFillNext4h: mlResult.predictedFillNext4h,
      urgencyScore: mlResult.urgencyScore,
      status: bin.fillLevel >= 85 ? 'Critical / Overflow' : bin.fillLevel >= 70 ? 'Approaching Full' : 'Normal',
    };
  };

  // IoT Ultrasonic Live Pulse Simulation
  useEffect(() => {
    if (!simulation.isRunning) return;

    const interval = setInterval(() => {
      setBins(prevBins => {
        return prevBins.map(bin => {
          // Add random increment 0.3% - 1.2%
          const weatherBoost = simulation.weatherCondition === 'Rainy' ? 1.3 : 1.0;
          const zoneBoost = bin.zone.includes('Commercial') ? 1.4 : 1.0;
          const delta = (Math.random() * 0.9 + 0.3) * weatherBoost * zoneBoost;

          const newFill = Math.min(100, Number((bin.fillLevel + delta).toFixed(1)));
          const binReportsCount = reports.filter(r => r.binId === bin.id && r.status !== 'Resolved').length;

          const updatedBin = {
            ...bin,
            fillLevel: newFill,
            currentWeightKg: Math.round(bin.currentWeightKg + delta * 2.2),
          };

          return recalculateBinML(updatedBin, binReportsCount);
        });
      });
    }, 4000);

    return () => clearInterval(interval);
  }, [simulation.isRunning, simulation.weatherCondition, reports]);

  // Handle Dispatching the Optimized Fleet
  const handleDispatchFleet = () => {
    if (isDispatching) return;

    // 1. Identify bins exceeding collection threshold or top urgency
    const targetBins = bins
      .filter(b => b.fillLevel >= simulation.collectionThreshold || b.urgencyScore >= 75)
      .sort((a, b) => b.urgencyScore - a.urgencyScore);

    if (targetBins.length === 0) {
      addToast('warning', 'Bins Within Threshold', 'All containers currently have sufficient remaining capacity. No immediate dispatch needed.');
      return;
    }

    setIsDispatching(true);
    addToast('info', 'Fleet Dispatched', `Dispatched collection trucks to ${targetBins.length} priority stops via A* routing.`);

    // 2. Select stops for Truck Alpha and plan tour
    const stopNodeIds = targetBins.map(b => b.id);
    const tourResult = roadGraph.planMultiStopTour('DEPOT-CENTRAL', stopNodeIds);
    setActiveRouteLegs(tourResult.fullLegs);

    // Switch to Map tab to watch the route
    setActiveTab('map');

    // 3. Update Truck Alpha status and assigned route
    setTrucks(prev => prev.map(t => {
      if (t.id === 'TRK-01') {
        return {
          ...t,
          status: 'Collecting',
          assignedRoute: tourResult.orderedStopIds,
          currentLoadKg: 0,
        };
      }
      return t;
    }));

    // 4. Animate truck traveling and emptying bins sequentially
    let step = 0;
    const totalSteps = tourResult.orderedStopIds.length;

    const timer = setInterval(() => {
      step++;
      if (step >= totalSteps) {
        clearInterval(timer);
        setIsDispatching(false);

        // Reset Truck Alpha to Idle at Depot
        setTrucks(prev => prev.map(t => {
          if (t.id === 'TRK-01') {
            return {
              ...t,
              status: 'Idle',
              currentX: DEPOT_NODE.x,
              currentY: DEPOT_NODE.y,
              collectedBinIds: [...t.collectedBinIds, ...stopNodeIds],
              totalKmToday: Number((t.totalKmToday + tourResult.totalDistanceKm).toFixed(1)),
            };
          }
          return t;
        }));

        // Calculate environmental savings vs traditional 52.4km daily tour
        const savedKm = Math.max(8, 52.4 - tourResult.totalDistanceKm);
        const savedLiters = savedKm * ENVIRONMENTAL_FACTORS.dieselPerKmTraditional;
        const savedCo2 = savedLiters * ENVIRONMENTAL_FACTORS.co2KgPerLiterDiesel;
        const savedCost = savedLiters * ENVIRONMENTAL_FACTORS.costPerLiterFuelUsd + savedKm * ENVIRONMENTAL_FACTORS.truckWearAndTearCostPerKmUsd;

        setTotalDistanceSavedKm(prev => Number((prev + savedKm).toFixed(1)));
        setFuelSavedLiters(prev => Number((prev + savedLiters).toFixed(1)));
        setCo2SavedKg(prev => Number((prev + savedCo2).toFixed(1)));
        setCostSavedUsd(prev => Number((prev + savedCost).toFixed(2)));

        // Mark associated citizen reports as Resolved
        setReports(prev => prev.map(r => {
          if (stopNodeIds.includes(r.binId)) {
            return { ...r, status: 'Resolved' };
          }
          return r;
        }));

        addToast('success', 'Collection Completed', `Fleet round completed. Saved ${savedKm.toFixed(1)} km & ${savedCo2.toFixed(1)} kg CO₂.`);
        return;
      }

      const currentStopId = tourResult.orderedStopIds[step];
      const targetNode = roadGraph.nodes.get(currentStopId);

      if (targetNode) {
        // Move truck coordinates
        setTrucks(prev => prev.map(t => {
          if (t.id === 'TRK-01') {
            return {
              ...t,
              currentX: targetNode.x,
              currentY: targetNode.y,
            };
          }
          return t;
        }));

        // If it's a bin, empty it
        if (targetNode.type === 'bin' || currentStopId.startsWith('BIN-')) {
          setBins(prev => prev.map(b => {
            if (b.id === currentStopId) {
              return {
                ...b,
                fillLevel: 8,
                currentWeightKg: 18,
                lastCollectionTime: 'Just now',
                hoursSinceCollection: 0,
                urgencyScore: 12.0,
                status: 'Collected',
              };
            }
            return b;
          }));

          // Increase truck payload load
          setTrucks(prev => prev.map(t => {
            if (t.id === 'TRK-01') {
              return {
                ...t,
                currentLoadKg: Math.min(t.capacityKg, t.currentLoadKg + 220),
              };
            }
            return t;
          }));
        }
      }
    }, 1800);
  };

  // Extract Max from Heap
  const handleExtractMax = () => {
    const maxItem = heapQueue.extractMax();
    if (!maxItem) return;

    // Dispatch Truck Alpha directly to that single bin
    const bin = bins.find(b => b.id === maxItem.binId);
    if (!bin) return;

    handleEmptyBin(bin.id);
    addToast('success', 'Max-Heap Root Dispatched', `⚡ Container ${bin.id} (${bin.name}) with urgency score ${maxItem.urgencyScore.toFixed(1)} dispatched & emptied!`);
  };

  // Empty Bin
  const handleEmptyBin = (binId: string) => {
    setBins(prev => prev.map(b => {
      if (b.id === binId) {
        return {
          ...b,
          fillLevel: 5,
          currentWeightKg: 12,
          lastCollectionTime: 'Just now',
          hoursSinceCollection: 0,
          urgencyScore: 10.0,
          status: 'Collected',
        };
      }
      return b;
    }));

    // Resolve reports for this bin
    setReports(prev => prev.map(r => r.binId === binId ? { ...r, status: 'Resolved' } : r));
  };

  // Simulate Ultrasonic Spike (+25%)
  const handleSpikeBin = (binId: string) => {
    setBins(prev => prev.map(b => {
      if (b.id === binId) {
        const newFill = Math.min(100, b.fillLevel + 25);
        return recalculateBinML({
          ...b,
          fillLevel: newFill,
          currentWeightKg: b.currentWeightKg + 65,
        }, b.associatedReportsCount);
      }
      return b;
    }));
  };

  // Advance simulation by 1 hour
  const handleSimulateStep = () => {
    setBins(prev => prev.map(b => {
      const increment = Math.round(Math.random() * 8 + 4);
      const newFill = Math.min(100, b.fillLevel + increment);
      return recalculateBinML({
        ...b,
        fillLevel: newFill,
        hoursSinceCollection: b.hoursSinceCollection + 1,
      }, b.associatedReportsCount);
    }));
  };

  // Inject Downtown Surge
  const handleInjectSurge = () => {
    setBins(prev => prev.map(b => {
      if (b.zone === 'Downtown Commercial' || b.zone === 'University Campus') {
        const newFill = Math.min(100, b.fillLevel + 28);
        return recalculateBinML({
          ...b,
          fillLevel: newFill,
          currentWeightKg: b.currentWeightKg + 75,
        }, b.associatedReportsCount);
      }
      return b;
    }));
  };

  // Reset all bins to morning clean baseline
  const handleResetBins = () => {
    setBins(prev => prev.map(b => ({
      ...b,
      fillLevel: Math.floor(Math.random() * 18 + 10),
      currentWeightKg: 25,
      urgencyScore: 15.0,
      status: 'Normal',
      lastCollectionTime: '1 hour ago',
    })));
  };

  // Submit new citizen report
  const handleSubmitReport = (newReportData: Omit<CitizenReport, 'id' | 'timestamp' | 'upvotes' | 'status' | 'verifiedByAI'>) => {
    const reportId = `RPT-${Math.floor(Math.random() * 8999 + 1000)}`;
    const newReport: CitizenReport = {
      ...newReportData,
      id: reportId,
      timestamp: 'Just now',
      status: 'Verified',
      upvotes: 1,
      verifiedByAI: true,
    };

    setReports(prev => [newReport, ...prev]);

    // Update the bin's urgency and associated reports count
    setBins(prev => prev.map(b => {
      if (b.id === newReportData.binId) {
        const updatedReportsCount = b.associatedReportsCount + 1;
        const newFill = Math.min(100, b.fillLevel + 12);
        return recalculateBinML({
          ...b,
          fillLevel: newFill,
          associatedReportsCount: updatedReportsCount,
        }, updatedReportsCount);
      }
      return b;
    }));
  };

  // Upvote report
  const handleUpvoteReport = (reportId: string) => {
    setReports(prev => prev.map(r => {
      if (r.id === reportId) {
        return { ...r, upvotes: r.upvotes + 1 };
      }
      return r;
    }));
  };

  // Maintenance: Dispatch Technician
  const handleDispatchTechnician = (alertId: string, technicianName: string) => {
    setAlerts(prev => prev.map(a => {
      if (a.id === alertId) {
        return {
          ...a,
          status: 'Technician Dispatched',
          assignedTechnician: technicianName,
        };
      }
      return a;
    }));

    // Update associated bin
    const targetAlert = alerts.find(a => a.id === alertId);
    if (targetAlert) {
      setBins(prev => prev.map(b => {
        if (b.id === targetAlert.binId) {
          return {
            ...b,
            activeAlert: b.activeAlert ? {
              ...b.activeAlert,
              status: 'Technician Dispatched',
              assignedTechnician: technicianName,
            } : undefined
          };
        }
        return b;
      }));
    }
  };

  // Maintenance: Resolve Alert & Calibrate Bin
  const handleResolveAlert = (alertId: string) => {
    const targetAlert = alerts.find(a => a.id === alertId);
    setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, status: 'Resolved' } : a));

    if (targetAlert) {
      setBins(prev => prev.map(b => {
        if (b.id === targetAlert.binId) {
          return {
            ...b,
            sensorHealth: 'Optimal',
            activeErrorCode: undefined,
            weightAnomalyKg: undefined,
            status: b.fillLevel >= 85 ? 'Critical / Overflow' : b.fillLevel >= 70 ? 'Approaching Full' : 'Normal',
            activeAlert: undefined,
          };
        }
        return b;
      }));
    }
  };

  // Maintenance: Simulate Anomaly / Weight Spike
  const handleSimulateAnomaly = (binId: string, errorCode: SensorErrorCode, weightDeltaKg?: number) => {
    const targetBin = bins.find(b => b.id === binId);
    if (!targetBin) return;

    let errorTitle = 'Hardware Subsystem Alert';
    let description = 'Automated sensor health probe detected telemetry inconsistency.';
    let recommendedAction = 'Technician field inspection and diagnostic run.';
    let severity: 'Critical' | 'High' | 'Warning' = 'High';

    if (errorCode === 'ERR_WEIGHT_SPIKE_ANOMALY') {
      const delta = weightDeltaKg || 180;
      errorTitle = `Abnormal Load Cell Weight Surge (+${delta} kg)`;
      description = `Sudden weight jump (+${delta} kg) without proportional ultrasonic volumetric change. Suspected illegal dumping of masonry/scrap or load cell strain gauge drift.`;
      recommendedAction = 'Dispatch field technician for physical scale tare audit & debris inspection.';
      severity = 'Critical';
    } else if (errorCode === 'ERR_US_ECHO_TIMEOUT') {
      errorTitle = 'Ultrasonic Transducer Echo Timeout';
      description = '40 kHz ping pulse emitted but no echo reflection detected for 3 consecutive poll cycles (>40ms). Transducer face may be obscured or blinded.';
      recommendedAction = 'Clean acoustic membrane face, check wiring harness, cycle transducer.';
      severity = 'Warning';
    } else if (errorCode === 'ERR_LID_ACTUATOR_STUCK') {
      errorTitle = 'Solar Compactor Flap Jammed';
      description = 'Optical position encoder reports compaction aperture stuck at partial stroke. High acoustic reflection scatter.';
      recommendedAction = 'Clear obstruction from feed hopper and test motor torque limit.';
      severity = 'High';
    } else if (errorCode === 'ERR_OPTICAL_DIRT_BLIND') {
      errorTitle = 'Optical / ToF Lens Heavily Soiled';
      description = 'Time-of-Flight IR attenuation exceeded 85% threshold. Lens surface covered with grease/dust.';
      recommendedAction = 'Clean optical sapphire lens with isopropyl swab.';
      severity = 'Warning';
    } else if (errorCode === 'ERR_BATTERY_DRAIN_SURGE') {
      errorTitle = 'Parasitic Solar Battery Drain Surge';
      description = 'Li-Ion storage discharging at >4.5% per hour despite sunlight exposure.';
      recommendedAction = 'Inspect solar regulator PCB and battery cell impedance.';
      severity = 'High';
    } else if (errorCode === 'ERR_TEMPERATURE_OVERHEAT') {
      errorTitle = 'Internal Thermal Chamber Overheat (>48°C)';
      description = 'Internal bin enclosure temperature exceeded safe operating threshold. Risk of thermal degradation.';
      recommendedAction = 'Ventilate enclosure, check solar compactor heat sink, inspect for internal combustion hazard.';
      severity = 'Critical';
    }

    const newAlert: MaintenanceAlert = {
      id: `MNT-${Math.floor(Math.random() * 899 + 100)}`,
      binId: targetBin.id,
      binName: targetBin.name,
      zone: targetBin.zone,
      errorCode,
      errorTitle,
      severity,
      status: 'Flagged',
      timestamp: 'Just now',
      description,
      currentFillLevel: targetBin.fillLevel,
      currentWeightKg: targetBin.currentWeightKg + (weightDeltaKg || 0),
      weightDeltaKg,
      expectedWeightKg: targetBin.currentWeightKg,
      recommendedAction,
    };

    setAlerts(prev => [newAlert, ...prev]);

    // Update the bin
    setBins(prev => prev.map(b => {
      if (b.id === binId) {
        return {
          ...b,
          sensorHealth: errorCode === 'ERR_WEIGHT_SPIKE_ANOMALY' ? 'Error' : 'Degraded',
          activeErrorCode: errorCode,
          weightAnomalyKg: weightDeltaKg,
          currentWeightKg: b.currentWeightKg + (weightDeltaKg || 0),
          status: 'Maintenance',
          activeAlert: newAlert,
          urgencyScore: Math.min(100, b.urgencyScore + 15),
        };
      }
      return b;
    }));
  };

  // Export PDF Report
  const handleExportPDF = () => {
    generateSmartCityPDFReport({
      bins,
      trucks,
      reports,
      alerts,
      totalDistanceSavedKm,
      fuelSavedLiters,
      co2SavedKg,
      costSavedUsd,
      activeRouteSummary: 'A* Multi-Stop Tour Active',
    });
  };

  const criticalCount = bins.filter(b => b.fillLevel >= 85).length;
  const maintenanceCount = alerts.filter(a => a.status !== 'Resolved').length;

  return (
    <div className="min-h-screen bg-transparent text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-300">
      {/* Top Navigation Bar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        simulation={simulation}
        setSimulation={setSimulation}
        onExportPDF={handleExportPDF}
        criticalBinCount={criticalCount}
        maintenanceAlertCount={maintenanceCount}
        onOpenIoTTelemetry={() => setIsTelemetryModalOpen(true)}
        onExportMLDataset={handleExportMLDataset}
        onExportGeoJSON={handleExportGeoJSON}
        currentCityId={currentCityId}
        onSelectCity={handleSelectCity}
        bgTheme={bgTheme}
        onSelectBgTheme={handleSelectBgTheme}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'dashboard' && (
          <DashboardView
            bins={bins}
            trucks={trucks}
            alerts={alerts}
            simulation={simulation}
            setSimulation={setSimulation}
            onSelectBin={(bin) => setSelectedBin(bin)}
            onOptimizeRoute={handleDispatchFleet}
            onResetBins={handleResetBins}
            onSimulateStep={handleSimulateStep}
            onInjectSurge={handleInjectSurge}
            onNavigateToMaintenance={() => setActiveTab('maintenance')}
            onDispatchTechnician={handleDispatchTechnician}
            onSimulateAnomaly={handleSimulateAnomaly}
            totalDistanceSavedKm={totalDistanceSavedKm}
            fuelSavedLiters={fuelSavedLiters}
            co2SavedKg={co2SavedKg}
            costSavedUsd={costSavedUsd}
          />
        )}

        {activeTab === 'map' && (
          <CityHeatmapView
            bins={bins}
            trucks={trucks}
            intersections={ROAD_INTERSECTIONS}
            edges={ROAD_EDGES}
            onSelectBin={(bin) => setSelectedBin(bin)}
            selectedBin={selectedBin}
            activeRouteLegs={activeRouteLegs}
            simulation={simulation}
          />
        )}

        {activeTab === 'heap' && (
          <HeapVisualizerView
            bins={bins}
            heapQueue={heapQueue}
            onExtractMax={handleExtractMax}
            onSelectBin={(bin) => setSelectedBin(bin)}
            onUpdateBinFill={(binId, newFill) => {
              setBins(prev => prev.map(b => b.id === binId ? recalculateBinML({ ...b, fillLevel: newFill }, b.associatedReportsCount) : b));
            }}
          />
        )}

        {activeTab === 'fleet' && (
          <RouteAndFleetView
            bins={bins}
            trucks={trucks}
            roadGraph={roadGraph}
            onDispatchFleet={handleDispatchFleet}
            isDispatching={isDispatching}
            activeRouteLegs={activeRouteLegs}
            onSelectBin={(bin) => setSelectedBin(bin)}
            onCollectBin={handleEmptyBin}
          />
        )}

        {activeTab === 'maintenance' && (
          <MaintenanceAlertsView
            alerts={alerts}
            bins={bins}
            onDispatchTechnician={handleDispatchTechnician}
            onResolveAlert={handleResolveAlert}
            onSimulateAnomaly={handleSimulateAnomaly}
            onSelectBin={(bin) => setSelectedBin(bin)}
          />
        )}

        {activeTab === 'reports' && (
          <CitizenPortalView
            reports={reports}
            bins={bins}
            onOpenReportModal={() => setIsReportModalOpen(true)}
            onUpvoteReport={handleUpvoteReport}
          />
        )}

        {activeTab === 'architecture' && (
          <ArchitectureView />
        )}
      </main>

      {/* Bin Telemetry Diagnostic Modal */}
      <BinDetailsModal
        bin={selectedBin}
        onClose={() => setSelectedBin(null)}
        onEmptyBin={handleEmptyBin}
        onSpikeBin={handleSpikeBin}
        onResolveAlert={handleResolveAlert}
        onTriggerAnomaly={handleSimulateAnomaly}
      />

      {/* New Citizen Report Modal */}
      <NewReportModal
        bins={bins}
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        onSubmitReport={handleSubmitReport}
      />

      {/* IoT Edge Hardware & MQTT Streamer Modal */}
      <IoTTelemetrySimulator
        isOpen={isTelemetryModalOpen}
        onClose={() => setIsTelemetryModalOpen(false)}
        bins={bins}
        onInjectTelemetry={handleInjectTelemetry}
      />

      {/* Modern Floating Toast Notifications */}
      <ToastContainer
        toasts={toasts}
        onDismiss={dismissToast}
      />

      {/* Quiet, Clean Footer compliant with anti-slop rules */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>EcoRoute Municipal Solid Waste Intelligent Logistics OS</span>
          <div className="flex items-center gap-3">
            <span>A* Road Graph Search</span>
            <span aria-hidden="true">·</span>
            <span>Max-Heap Priority Queue</span>
            <span aria-hidden="true">·</span>
            <span>Scikit-Learn ML Regression</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
