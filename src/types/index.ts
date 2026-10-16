export type WasteCategory = 'General Waste' | 'Recyclables' | 'Organic Compost' | 'Electronic Waste';

export type BinStatus = 'Normal' | 'Approaching Full' | 'Critical / Overflow' | 'Maintenance' | 'Collected';

export type SensorErrorCode = 
  | 'ERR_US_ECHO_TIMEOUT'       // Ultrasonic echo timeout (transducer blocked/blinded)
  | 'ERR_WEIGHT_SPIKE_ANOMALY'  // Abnormal weight jump (>150kg/h or density >3.5kg/L)
  | 'ERR_OPTICAL_DIRT_BLIND'    // Optical / ToF sensor lens heavily soiled
  | 'ERR_LID_ACTUATOR_STUCK'    // Compactor solar flap or aperture mechanism jammed
  | 'ERR_BATTERY_DRAIN_SURGE'   // Parasitic battery drain rate abnormal
  | 'ERR_TEMPERATURE_OVERHEAT'; // Internal container thermal spike (>48°C)

export type MaintenanceSeverity = 'Warning' | 'High' | 'Critical';
export type MaintenanceStatus = 'Flagged' | 'Technician Dispatched' | 'Inspecting On-Site' | 'Resolved';

export interface MaintenanceAlert {
  id: string;
  binId: string;
  binName: string;
  zone: string;
  errorCode: SensorErrorCode;
  errorTitle: string;
  severity: MaintenanceSeverity;
  status: MaintenanceStatus;
  timestamp: string;
  description: string;
  currentFillLevel: number;
  currentWeightKg: number;
  weightDeltaKg?: number; // Sudden weight anomaly jump
  expectedWeightKg?: number;
  assignedTechnician?: string;
  technicianNotes?: string;
  recommendedAction: string;
}

export interface SmartBin {
  id: string;
  name: string;
  zone: string;
  x: number; // Grid X (0 - 1000)
  y: number; // Grid Y (0 - 700)
  lat: number;
  lng: number;
  fillLevel: number; // 0 to 100%
  capacityLiters: number;
  currentWeightKg: number;
  batteryLevel: number; // 0 to 100%
  temperatureC: number;
  lastCollectionTime: string;
  hoursSinceCollection: number;
  predictedHoursToFull: number;
  predictedFillNext4h: number;
  urgencyScore: number;
  wasteType: WasteCategory;
  sensorHealth: 'Optimal' | 'Recalibrating' | 'Degraded' | 'Error';
  historicalReadings: { timestamp: string; fill: number }[];
  associatedReportsCount: number;
  status?: BinStatus;
  activeAlert?: MaintenanceAlert;
  activeErrorCode?: SensorErrorCode;
  weightAnomalyKg?: number;
}

export type TruckStatus = 'Idle' | 'En Route' | 'Collecting' | 'Returning to Depot' | 'Off-Duty';

export interface FleetTruck {
  id: string;
  name: string;
  driver: string;
  licensePlate: string;
  vehicleModel: string;
  fuelType: 'EV Clean Electric' | 'Euro-6 Bio-Diesel' | 'Compressed CNG';
  capacityKg: number;
  currentLoadKg: number;
  fuelLevelPercent: number;
  status: TruckStatus;
  currentX: number;
  currentY: number;
  targetBinId?: string;
  assignedRoute: string[]; // sequence of bin IDs + depot
  routeProgress: number; // percentage of route completed
  totalKmToday: number;
  collectedBinIds: string[];
  co2SavedKg: number;
}

export interface GraphNode {
  id: string;
  name: string;
  x: number;
  y: number;
  type: 'depot' | 'bin' | 'intersection' | 'landfill';
  binId?: string;
}

export interface GraphEdge {
  from: string;
  to: string;
  distanceKm: number;
  trafficFactor: number; // 1.0 (clear) to 2.2 (congested)
  speedLimitKmh: number;
}

export interface HeapItem {
  binId: string;
  binName: string;
  urgencyScore: number;
  fillLevel: number;
  predictedHoursToFull: number;
  zone: string;
}

export interface CitizenReport {
  id: string;
  binId: string;
  binName: string;
  citizenName: string;
  issueType: 'Overflowing Bin' | 'Damaged Lid' | 'Illegal Dumping' | 'Pest / Odor' | 'Sensor Offline';
  timestamp: string;
  status: 'Pending Review' | 'Verified' | 'Dispatched' | 'Resolved';
  imageUrl: string;
  upvotes: number;
  locationDescription: string;
  verifiedByAI: boolean;
}

export interface SimulationSettings {
  isRunning: boolean;
  speedMultiplier: number;
  weatherCondition: 'Clear' | 'Rainy' | 'High Temperature / Heatwave' | 'Weekend Event';
  trafficCondition: 'Normal' | 'Peak Rush Hour' | 'Light';
  collectionThreshold: number; // e.g. 75%
}
