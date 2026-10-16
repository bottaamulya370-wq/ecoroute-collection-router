import { SmartBin, GraphNode } from '../types';

export interface CityProfile {
  id: string;
  name: string;
  country: string;
  centerLat: number;
  centerLng: number;
  description: string;
  depotNode: GraphNode;
  bins: Partial<SmartBin>[];
}

export const CITY_PROFILES: CityProfile[] = [
  {
    id: 'metro-central',
    name: 'Metropolis Central',
    country: 'USA (San Francisco District)',
    centerLat: 37.7749,
    centerLng: -122.4194,
    description: 'High-density urban tech corridor with commercial shopping arcades and mixed transit hubs.',
    depotNode: {
      id: 'DEPOT-CENTRAL',
      name: 'Central Eco-Depot & Recovery Facility',
      x: 500,
      y: 350,
      type: 'depot',
    },
    bins: [
      { id: 'BIN-101', name: 'City Plaza North Concourse', zone: 'Downtown Commercial', lat: 37.7749, lng: -122.4194 },
      { id: 'BIN-102', name: 'Metro Grand Station West', zone: 'Downtown Commercial', lat: 37.7794, lng: -122.4186 },
      { id: 'BIN-103', name: 'Market Promenade & 5th Ave', zone: 'Downtown Commercial', lat: 37.7831, lng: -122.4082 },
      { id: 'BIN-104', name: 'Union Square Retail Corner', zone: 'Downtown Commercial', lat: 37.7879, lng: -122.4074 },
      { id: 'BIN-105', name: 'Pinecrest Apartments Block A', zone: 'Residential North', lat: 37.7915, lng: -122.4125 },
      { id: 'BIN-106', name: 'Oakridge Terrace Community Park', zone: 'Residential North', lat: 37.7942, lng: -122.4201 },
      { id: 'BIN-107', name: 'Hillside Garden Residences', zone: 'Residential North', lat: 37.7928, lng: -122.4298 },
      { id: 'BIN-108', name: 'Civic Center Green Promenade', zone: 'Eco Park & Marina', lat: 37.7812, lng: -122.4172 },
      { id: 'BIN-109', name: 'Embarcadero Waterfront Ferry Pier', zone: 'Eco Park & Marina', lat: 37.7955, lng: -122.3937 },
      { id: 'BIN-110', name: 'Marina Green Recreation Path', zone: 'Eco Park & Marina', lat: 37.8049, lng: -122.4371 },
      { id: 'BIN-111', name: 'Mission Industrial Fabrication Yard', zone: 'Industrial Park', lat: 37.7612, lng: -122.4138 },
      { id: 'BIN-112', name: 'AeroTech Research Hub North', zone: 'Industrial Park', lat: 37.7554, lng: -122.3982 },
      { id: 'BIN-113', name: 'Logistics Center Loading Bay 4', zone: 'Industrial Park', lat: 37.7511, lng: -122.3915 },
      { id: 'BIN-114', name: 'Harbor Freight Terminal Yard', zone: 'Industrial Park', lat: 37.7478, lng: -122.3872 },
      { id: 'BIN-115', name: 'Valencia Cultural Arts Plaza', zone: 'Downtown Commercial', lat: 37.7645, lng: -122.4215 },
      { id: 'BIN-116', name: 'Presidio Overlook Eco Pavilion', zone: 'Eco Park & Marina', lat: 37.7989, lng: -122.4662 },
    ]
  },
  {
    id: 'manhattan-nyc',
    name: 'Manhattan Commercial Core',
    country: 'USA (New York City)',
    centerLat: 40.7580,
    centerLng: -73.9855,
    description: 'Ultra-dense grid network with intense pedestrian footfall, Broadway entertainment venues, and food markets.',
    depotNode: {
      id: 'DEPOT-CENTRAL',
      name: 'Hudson Yards Sanitation & Green Transfer Hub',
      x: 500,
      y: 350,
      type: 'depot',
    },
    bins: [
      { id: 'BIN-101', name: 'Times Square & 42nd St Plaza', zone: 'Downtown Commercial', lat: 40.7580, lng: -73.9855 },
      { id: 'BIN-102', name: 'Grand Central Terminal 42nd St', zone: 'Downtown Commercial', lat: 40.7527, lng: -73.9772 },
      { id: 'BIN-103', name: 'Herald Square & 34th St Macy\'s', zone: 'Downtown Commercial', lat: 40.7505, lng: -73.9879 },
      { id: 'BIN-104', name: 'Rockefeller Center Promenade', zone: 'Downtown Commercial', lat: 40.7587, lng: -73.9787 },
      { id: 'BIN-105', name: 'Upper West Side 72nd & Broadway', zone: 'Residential North', lat: 40.7788, lng: -73.9825 },
      { id: 'BIN-106', name: 'Central Park West & 81st Museum', zone: 'Residential North', lat: 40.7813, lng: -73.9740 },
      { id: 'BIN-107', name: 'Upper East Side 86th St Lex', zone: 'Residential North', lat: 40.7794, lng: -73.9556 },
      { id: 'BIN-108', name: 'Bryant Park Reading Room Corner', zone: 'Eco Park & Marina', lat: 40.7536, lng: -73.9832 },
      { id: 'BIN-109', name: 'High Line Park 14th St Entrance', zone: 'Eco Park & Marina', lat: 40.7420, lng: -74.0080 },
      { id: 'BIN-110', name: 'Battery Park City Promenade', zone: 'Eco Park & Marina', lat: 40.7100, lng: -74.0170 },
      { id: 'BIN-111', name: 'Meatpacking District Pier 57', zone: 'Industrial Park', lat: 40.7435, lng: -74.0090 },
      { id: 'BIN-112', name: 'Chelsea Market Loading Freight Bay', zone: 'Industrial Park', lat: 40.7420, lng: -74.0048 },
      { id: 'BIN-113', name: 'Hudson Yards Rail Yard Gate 3', zone: 'Industrial Park', lat: 40.7538, lng: -74.0020 },
      { id: 'BIN-114', name: 'East River Marine Transfer Station', zone: 'Industrial Park', lat: 40.7780, lng: -73.9410 },
      { id: 'BIN-115', name: 'SoHo Broadway & Prince St', zone: 'Downtown Commercial', lat: 40.7250, lng: -73.9980 },
      { id: 'BIN-116', name: 'Union Square Greenmarket West', zone: 'Eco Park & Marina', lat: 40.7359, lng: -73.9911 },
    ]
  },
  {
    id: 'westminster-london',
    name: 'Westminster & Central London',
    country: 'United Kingdom',
    centerLat: 51.5074,
    centerLng: -0.1278,
    description: 'Historic city layout with pedestrianized cultural precincts, Thames riverside paths, and low-emission zones.',
    depotNode: {
      id: 'DEPOT-CENTRAL',
      name: 'Waterloo Eco-Logistics Depot',
      x: 500,
      y: 350,
      type: 'depot',
    },
    bins: [
      { id: 'BIN-101', name: 'Trafalgar Square North Terrace', zone: 'Downtown Commercial', lat: 51.5080, lng: -0.1281 },
      { id: 'BIN-102', name: 'Covent Garden Market Piazza', zone: 'Downtown Commercial', lat: 51.5117, lng: -0.1235 },
      { id: 'BIN-103', name: 'Piccadilly Circus Eros Fountain', zone: 'Downtown Commercial', lat: 51.5101, lng: -0.1344 },
      { id: 'BIN-104', name: 'Oxford Circus Retail Crossing', zone: 'Downtown Commercial', lat: 51.5152, lng: -0.1419 },
      { id: 'BIN-105', name: 'Marylebone High Street Square', zone: 'Residential North', lat: 51.5204, lng: -0.1518 },
      { id: 'BIN-106', name: 'Regent\'s Park Outer Circle Gate', zone: 'Residential North', lat: 51.5284, lng: -0.1540 },
      { id: 'BIN-107', name: 'Fitzrovia Charlotte Street Green', zone: 'Residential North', lat: 51.5195, lng: -0.1365 },
      { id: 'BIN-108', name: 'St. James\'s Park Duck Island', zone: 'Eco Park & Marina', lat: 51.5028, lng: -0.1332 },
      { id: 'BIN-109', name: 'South Bank Riverside Promenade', zone: 'Eco Park & Marina', lat: 51.5065, lng: -0.1170 },
      { id: 'BIN-110', name: 'Hyde Park Corner Eco Pavilion', zone: 'Eco Park & Marina', lat: 51.5033, lng: -0.1517 },
      { id: 'BIN-111', name: 'Nine Elms Waste Recovery Depot', zone: 'Industrial Park', lat: 51.4820, lng: -0.1280 },
      { id: 'BIN-112', name: 'Battersea Logistics Terminal', zone: 'Industrial Park', lat: 51.4815, lng: -0.1450 },
      { id: 'BIN-113', name: 'Vauxhall Rail Arches Freight Bay', zone: 'Industrial Park', lat: 51.4860, lng: -0.1240 },
      { id: 'BIN-114', name: 'King\'s Cross Goods Yard North', zone: 'Industrial Park', lat: 51.5350, lng: -0.1260 },
      { id: 'BIN-115', name: 'Leicester Square Cinema Walk', zone: 'Downtown Commercial', lat: 51.5104, lng: -0.1306 },
      { id: 'BIN-116', name: 'Victoria Embankment Gardens', zone: 'Eco Park & Marina', lat: 51.5085, lng: -0.1215 },
    ]
  },
  {
    id: 'bangalore-tech',
    name: 'Electronic City Smart Corridor',
    country: 'India (Bangalore)',
    centerLat: 12.8452,
    centerLng: 77.6602,
    description: 'Major technology corridor with sprawling tech parks, rapid electronic waste generation, and high-density campuses.',
    depotNode: {
      id: 'DEPOT-CENTRAL',
      name: 'Phase 1 Central Municipal Waste Station',
      x: 500,
      y: 350,
      type: 'depot',
    },
    bins: [
      { id: 'BIN-101', name: 'Infosys Main Gate 1 & Transit Concourse', zone: 'Downtown Commercial', lat: 12.8502, lng: 77.6652 },
      { id: 'BIN-102', name: 'Wipro Campus Avenue Gate 3', zone: 'Downtown Commercial', lat: 12.8445, lng: 77.6580 },
      { id: 'BIN-103', name: 'Hosur Road Toll Plaza Bus Stop', zone: 'Downtown Commercial', lat: 12.8390, lng: 77.6690 },
      { id: 'BIN-104', name: 'Velankani Tech Park Food Street', zone: 'Downtown Commercial', lat: 12.8415, lng: 77.6625 },
      { id: 'BIN-105', name: 'Neeladri Nagar High-Rise Residences', zone: 'Residential North', lat: 12.8530, lng: 77.6520 },
      { id: 'BIN-106', name: 'Doddathogur Lake View Enclave', zone: 'Residential North', lat: 12.8565, lng: 77.6610 },
      { id: 'BIN-107', name: 'Celebrity Square Township Block C', zone: 'Residential North', lat: 12.8590, lng: 77.6685 },
      { id: 'BIN-108', name: 'Electronic City Central Park Amphitheater', zone: 'Eco Park & Marina', lat: 12.8470, lng: 77.6640 },
      { id: 'BIN-109', name: 'Hebbagodi Lake Eco-Restoration Trail', zone: 'Eco Park & Marina', lat: 12.8320, lng: 77.6740 },
      { id: 'BIN-110', name: 'Bio-Retention Swale & Arboretum', zone: 'Eco Park & Marina', lat: 12.8420, lng: 77.6530 },
      { id: 'BIN-111', name: 'Phase 2 Electronic Hardware Cluster', zone: 'Industrial Park', lat: 12.8350, lng: 77.6780 },
      { id: 'BIN-112', name: 'Semiconductor Fabrication Lab Bay B', zone: 'Industrial Park', lat: 12.8310, lng: 77.6820 },
      { id: 'BIN-113', name: 'Heavy Machinery Logistics Hub 12', zone: 'Industrial Park', lat: 12.8280, lng: 77.6890 },
      { id: 'BIN-114', name: 'E-Waste Recycling & Recovery Yard', zone: 'Industrial Park', lat: 12.8250, lng: 77.6920 },
      { id: 'BIN-115', name: 'TCS Think Campus Food Court 2', zone: 'Downtown Commercial', lat: 12.8465, lng: 77.6720 },
      { id: 'BIN-116', name: 'Green Campus Butterfly Botanical Garden', zone: 'Eco Park & Marina', lat: 12.8490, lng: 77.6760 },
    ]
  }
];
