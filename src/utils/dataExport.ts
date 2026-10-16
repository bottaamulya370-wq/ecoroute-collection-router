import { SmartBin, FleetTruck, GraphNode } from '../types';
import { PathResult } from '../algorithms/AStarRouter';

export const downloadMLTrainingDatasetCSV = () => {
  const headers = [
    'reading_id',
    'timestamp',
    'bin_id',
    'zone',
    'waste_type',
    'fill_pct',
    'rate_last_4h',
    'weight_kg',
    'ambient_temp_c',
    'battery_mv',
    'hour_of_day',
    'is_weekend',
    'precipitation_mm',
    'citizen_reports_count',
    'target_fill_next_4h',
  ];

  const rows: string[] = [headers.join(',')];
  const zones = ['Downtown Commercial', 'Residential North', 'Industrial Park', 'Eco Park & Marina'];
  const wasteTypes = ['General Waste', 'Recyclables', 'Organic Compost', 'Electronic Waste'];

  const now = Date.now();
  let id = 10001;

  for (let b = 101; b <= 116; b++) {
    const binId = `BIN-${b}`;
    const zone = zones[b % zones.length];
    const wasteType = wasteTypes[b % wasteTypes.length];
    const zoneMultiplier = zone.includes('Commercial') ? 1.4 : zone.includes('Industrial') ? 1.2 : 0.9;

    // Generate 120 time-series readings per bin across 5 days (every 1 hr)
    let currentFill = 20 + (b * 3) % 40;
    let currentWeight = 30 + (b * 5) % 80;

    for (let h = 120; h >= 0; h--) {
      const timestamp = new Date(now - h * 3600 * 1000).toISOString();
      const hourOfDay = (24 - (h % 24)) % 24;
      const isWeekend = (h % 168) < 48 ? 1 : 0;
      const precipitation = h > 40 && h < 55 ? 4.2 : 0.0;

      // Diurnal activity multiplier: higher generation between 09:00 and 20:00
      const activityCurve = hourOfDay >= 9 && hourOfDay <= 20 ? 1.8 : 0.4;
      const deltaRate = Number(((0.8 + Math.sin(hourOfDay / 3.8) * 0.6) * zoneMultiplier * activityCurve).toFixed(2));

      currentFill = Math.min(100, currentFill + deltaRate);
      currentWeight = Math.min(320, currentWeight + deltaRate * 2.1);

      // Reset on collection when reaching high fill
      if (currentFill >= 94) {
        currentFill = 8.0;
        currentWeight = 15.0;
      }

      const tempC = Number((18 + Math.sin(hourOfDay / 3.5) * 6 + (Math.random() * 1.5)).toFixed(1));
      const batteryMv = Math.round(3980 - (120 - h) * 0.8);
      const reports = currentFill > 85 ? Math.floor(Math.random() * 3) + 1 : 0;

      // Ground truth target 4 hours ahead
      const target4h = Math.min(100, Number((currentFill + deltaRate * 4.0).toFixed(1)));

      rows.push([
        id++,
        timestamp,
        binId,
        `"${zone}"`,
        `"${wasteType}"`,
        currentFill.toFixed(1),
        deltaRate,
        currentWeight.toFixed(1),
        tempC,
        batteryMv,
        hourOfDay,
        isWeekend,
        precipitation,
        reports,
        target4h,
      ].join(','));
    }
  }

  const csvContent = rows.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `ecoroute_smartcity_sensor_dataset_5k.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const downloadCityGeoJSON = (bins: SmartBin[], depot: GraphNode) => {
  const geojson = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [-122.414, 37.776],
        },
        properties: {
          id: depot.id,
          name: depot.name,
          category: 'Depot & Recovery Facility',
        },
      },
      ...bins.map(b => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [b.lng, b.lat],
        },
        properties: {
          id: b.id,
          name: b.name,
          zone: b.zone,
          fillLevel: b.fillLevel,
          weightKg: b.currentWeightKg,
          capacityLiters: b.capacityLiters,
          wasteType: b.wasteType,
          urgencyScore: b.urgencyScore,
          status: b.status,
          sensorHealth: b.sensorHealth,
          lastCollection: b.lastCollectionTime,
        },
      })),
    ],
  };

  const jsonString = JSON.stringify(geojson, null, 2);
  const blob = new Blob([jsonString], { type: 'application/geo+json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `ecoroute_smart_bins_gis.geojson`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const downloadDriverManifest = (truck: FleetTruck, legs: PathResult[]) => {
  const lines: string[] = [
    `============================================================`,
    `ECOROUTE MUNICIPAL SMART WASTE ROUTER - DRIVER MANIFEST`,
    `Generated at: ${new Date().toLocaleString()}`,
    `Truck ID: ${truck.id} (${truck.name})`,
    `Driver: ${truck.driver} | License: ${truck.licensePlate}`,
    `Powertrain: ${truck.fuelType} | Capacity: ${truck.capacityKg} kg`,
    `Current Cargo Load: ${truck.currentLoadKg} kg (${Math.round((truck.currentLoadKg / truck.capacityKg) * 100)}%)`,
    `============================================================`,
    ``,
    `TURN-BY-TURN COLLECTION SCHEDULE:`,
    `------------------------------------------------------------`,
  ];

  if (legs.length === 0) {
    lines.push(`No active route segments currently dispatched.`);
  } else {
    legs.forEach((leg, index) => {
      lines.push(`STOP #${index + 1}: ${leg.pathNodeIds[0]} -> ${leg.pathNodeIds[leg.pathNodeIds.length - 1]}`);
      lines.push(`  Distance: ${leg.totalDistanceKm} km | Est. Travel Time: ${leg.estimatedMinutes} mins`);
      lines.push(`  Traversed Intersections: ${leg.pathNodeIds.join(' -> ')}`);
      lines.push(`  Estimated Fuel/Power: ${leg.fuelLiters} L / kWh`);
      lines.push(`------------------------------------------------------------`);
    });
  }

  lines.push(``);
  lines.push(`DRIVER OPERATIONAL CHECKLIST:`);
  lines.push(`[ ] Conduct pre-trip brake & tire pressure inspection`);
  lines.push(`[ ] Ensure hydraulic compactor safety interlock is engaged`);
  lines.push(`[ ] Tare on-board weigh-scale before leaving Central Depot`);
  lines.push(`[ ] Check in via Mobile Data Terminal (MDT) upon arrival at each bin`);
  lines.push(`============================================================`);

  const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `manifest_${truck.id}_${Date.now()}.txt`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
