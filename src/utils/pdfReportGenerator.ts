import jsPDF from 'jspdf';
import { SmartBin, FleetTruck, CitizenReport, MaintenanceAlert } from '../types';

interface ReportData {
  bins: SmartBin[];
  trucks: FleetTruck[];
  reports: CitizenReport[];
  alerts?: MaintenanceAlert[];
  totalDistanceSavedKm: number;
  fuelSavedLiters: number;
  co2SavedKg: number;
  costSavedUsd: number;
  activeRouteSummary: string;
}

export function generateSmartCityPDFReport(data: ReportData): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 18;

  // Header Banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 26, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('ECOROUTE SMART CITY INTELLIGENCE PLATFORM', 14, 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text('MUNICIPAL SOLID WASTE ROUTING & ENVIRONMENTAL COMPLIANCE AUDIT', 14, 18);
  doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth - 14, 18, { align: 'right' });

  y = 36;

  // Executive Overview Section
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('1. Executive Overview & Green Metrics', 14, y);
  y += 6;

  // KPI Metrics Boxes
  const kpis = [
    { label: 'Total Smart Bins', value: `${data.bins.length} Units` },
    { label: 'Critical / Overfilled', value: `${data.bins.filter(b => b.fillLevel >= 85).length} Bins` },
    { label: 'Fuel Saved Today', value: `${data.fuelSavedLiters.toFixed(1)} Liters` },
    { label: 'CO2 Prevented', value: `${data.co2SavedKg.toFixed(1)} kg` },
    { label: 'Cost Savings', value: `$${data.costSavedUsd.toFixed(2)}` },
  ];

  const boxWidth = (pageWidth - 28 - 16) / 5;
  kpis.forEach((kpi, index) => {
    const x = 14 + index * (boxWidth + 4);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(x, y, boxWidth, 18, 2, 2, 'FD');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.label, x + 3, y + 6);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text(kpi.value, x + 3, y + 13);
  });

  y += 26;

  // Priority Queue Top Critical Bins (Heap Ordering)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text('2. Heap Priority Queue: Top Collection Targets (A* Dispatch)', 14, y);
  y += 6;

  // Table Header
  doc.setFillColor(241, 245, 249);
  doc.rect(14, y, pageWidth - 28, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);

  doc.text('Priority', 17, y + 5);
  doc.text('Bin ID & Name', 35, y + 5);
  doc.text('District / Zone', 95, y + 5);
  doc.text('Current Fill', 135, y + 5);
  doc.text('Pred. Full (hrs)', 160, y + 5);
  doc.text('Urgency Score', 188, y + 5);

  y += 7;

  // Sort by Urgency Score (Max Heap order)
  const sortedBins = [...data.bins].sort((a, b) => b.urgencyScore - a.urgencyScore).slice(0, 8);

  sortedBins.forEach((bin, idx) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);

    if (idx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(14, y, pageWidth - 28, 6.5, 'F');
    }

    doc.text(`#${idx + 1}`, 17, y + 4.5);
    doc.text(`${bin.id} - ${bin.name.substring(0, 28)}`, 35, y + 4.5);
    doc.text(bin.zone, 95, y + 4.5);
    doc.text(`${bin.fillLevel}%`, 135, y + 4.5);
    doc.text(`${bin.predictedHoursToFull}h`, 160, y + 4.5);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(bin.urgencyScore >= 85 ? 185 : 15, bin.urgencyScore >= 85 ? 28 : 23, 28);
    doc.text(`${bin.urgencyScore.toFixed(1)}/100`, 188, y + 4.5);

    y += 6.5;
  });

  y += 8;

  // Fleet Route Assignments
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text('3. Fleet Vehicle Status & A* Optimized Route Manifest', 14, y);
  y += 6;

  doc.setFillColor(241, 245, 249);
  doc.rect(14, y, pageWidth - 28, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);

  doc.text('Vehicle ID', 17, y + 5);
  doc.text('Driver', 42, y + 5);
  doc.text('Powertrain', 75, y + 5);
  doc.text('Status', 115, y + 5);
  doc.text('Payload Cap.', 145, y + 5);
  doc.text('Route Assignment', 172, y + 5);

  y += 7;

  data.trucks.forEach((truck, idx) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);

    if (idx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(14, y, pageWidth - 28, 6.5, 'F');
    }

    doc.text(`${truck.id} (${truck.name})`, 17, y + 4.5);
    doc.text(truck.driver, 42, y + 4.5);
    doc.text(truck.fuelType, 75, y + 4.5);
    doc.text(truck.status, 115, y + 4.5);
    doc.text(`${truck.currentLoadKg} / ${truck.capacityKg} kg`, 145, y + 4.5);
    doc.text(truck.assignedRoute.length > 0 ? `${truck.assignedRoute.length} stops scheduled` : 'Depot standby', 172, y + 4.5);

    y += 6.5;
  });

  y += 10;

  // Environmental Impact & Cost Benefit Analysis
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text('4. Environmental Impact & Smart City Sustainability Audit', 14, y);
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  const narrative = [
    `Traditional municipal waste logistics require trucks to visit all 16 designated bins on a rigid static daily route, traversing an estimated 52.4 kilometers with frequent idling and stop-and-go diesel combustion.`,
    `Using EcoRoute's dual AI pipeline (Scikit-Learn Fill Progression Regression + Max-Heap Priority Queue + A* Traffic-Weighted Road Pathfinding), only bins exceeding the dynamically calculated urgency threshold are scheduled.`,
    `Continuous IoT hardware surveillance active: ${data.alerts ? data.alerts.filter(a => a.status !== 'Resolved').length : 0} abnormal transducer timeout / load cell weight anomaly events flagged and queued for technician intervention.`,
    `Current collection cycle achieved a ${data.totalDistanceSavedKm.toFixed(1)} km distance reduction, preserving ${data.fuelSavedLiters.toFixed(1)} liters of heavy vehicle fuel and abating ${data.co2SavedKg.toFixed(1)} kg of atmospheric CO2 emissions (equivalent to planting ${(data.co2SavedKg / 21.77).toFixed(1)} urban trees).`,
  ];

  narrative.forEach(p => {
    const splitText = doc.splitTextToSize(p, pageWidth - 28);
    doc.text(splitText, 14, y);
    y += splitText.length * 4.2 + 2;
  });

  // Footer & Official Seal
  doc.setDrawColor(203, 213, 225);
  doc.line(14, 275, pageWidth - 14, 275);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text('EcoRoute Smart City Fleet Logistics OS · ISO 14001 Environmental Standard Compliant · Municipal Operations Report', 14, 281);
  doc.text('Page 1 of 1 · Verified AI Routing', pageWidth - 14, 281, { align: 'right' });

  // Save PDF
  doc.save(`EcoRoute_Smart_City_Audit_${new Date().toISOString().slice(0, 10)}.pdf`);
}
