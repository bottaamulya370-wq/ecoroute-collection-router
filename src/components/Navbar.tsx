import React, { useState } from 'react';
import { 
  Play, 
  Pause, 
  Download, 
  Sparkles, 
  CloudRain, 
  Sun, 
  Activity, 
  MapPin, 
  GitFork, 
  Truck, 
  Users, 
  Cpu,
  Wrench,
  Radio,
  FileSpreadsheet,
  Globe,
  Database,
  ChevronDown,
  Layers,
  CheckCircle2,
  Palette,
  Check
} from 'lucide-react';
import { SimulationSettings } from '../types';
import { CITY_PROFILES } from '../data/cityPresets';

export type BackgroundTheme = 'obsidian' | 'carbon' | 'navy' | 'emerald' | 'slate';

export interface ThemeOption {
  id: BackgroundTheme;
  name: string;
  previewBg: string;
  borderClass: string;
  description: string;
}

export const THEME_OPTIONS: ThemeOption[] = [
  { 
    id: 'obsidian', 
    name: 'Obsidian Slate', 
    previewBg: '#0b0f19', 
    borderClass: 'border-slate-600',
    description: 'Clean titanium charcoal (Recommended)' 
  },
  { 
    id: 'carbon', 
    name: 'Deep Carbon', 
    previewBg: '#030407', 
    borderClass: 'border-neutral-700',
    description: 'Pure pitch black OLED' 
  },
  { 
    id: 'navy', 
    name: 'Maritime Navy', 
    previewBg: '#060e1b', 
    borderClass: 'border-cyan-600',
    description: 'Deep oceanic dispatch blue' 
  },
  { 
    id: 'emerald', 
    name: 'Cyber Emerald', 
    previewBg: '#04100c', 
    borderClass: 'border-emerald-600',
    description: 'Eco-command forest tint' 
  },
  { 
    id: 'slate', 
    name: 'Graphite Slate', 
    previewBg: '#111622', 
    borderClass: 'border-slate-500',
    description: 'Industrial soft slate gray' 
  },
];

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  simulation: SimulationSettings;
  setSimulation: React.Dispatch<React.SetStateAction<SimulationSettings>>;
  onExportPDF: () => void;
  criticalBinCount: number;
  maintenanceAlertCount?: number;
  onOpenIoTTelemetry?: () => void;
  onExportMLDataset?: () => void;
  onExportGeoJSON?: () => void;
  currentCityId: string;
  onSelectCity: (cityId: string) => void;
  bgTheme?: BackgroundTheme;
  onSelectBgTheme?: (theme: BackgroundTheme) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  simulation,
  setSimulation,
  onExportPDF,
  criticalBinCount,
  maintenanceAlertCount = 0,
  onOpenIoTTelemetry,
  onExportMLDataset,
  onExportGeoJSON,
  currentCityId,
  onSelectCity,
  bgTheme = 'obsidian',
  onSelectBgTheme,
}) => {
  const [isDataMenuOpen, setIsDataMenuOpen] = useState(false);
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);

  const navTabs = [
    { id: 'dashboard', label: 'Dashboard', icon: Activity },
    { id: 'map', label: 'City Heatmap', icon: MapPin },
    { id: 'heap', label: 'Heap Priority & ML', icon: GitFork },
    { id: 'fleet', label: 'Route & Fleet', icon: Truck },
    { id: 'maintenance', label: 'Maintenance', icon: Wrench },
    { id: 'reports', label: 'Citizen Reports', icon: Users },
    { id: 'architecture', label: 'Dossier & Viva', icon: Cpu },
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#060913]/90 backdrop-blur-xl border-b border-white/[0.08] transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          
          {/* Zone 1: High-Tech Brand Wordmark & City Topology */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="relative flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/5 border border-emerald-500/30 text-emerald-400 shadow-sm shadow-emerald-950">
                <Sparkles className="w-4 h-4" />
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-display text-base font-extrabold tracking-tight text-white">
                    EcoRoute
                  </span>
                  <span className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.2 bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 rounded font-semibold hidden sm:inline-block">
                    AI OS
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 font-mono tracking-wide hidden lg:block -mt-0.5">
                  Smart Municipal Logistics
                </div>
              </div>
            </div>

            {/* City Corridor Selector with subtle high-tech separator */}
            <div className="hidden lg:flex items-center gap-2 pl-3 border-l border-white/[0.08] text-xs">
              <div className="flex items-center gap-1.5 bg-slate-900/80 hover:bg-slate-800/80 px-2.5 py-1 rounded-lg border border-white/[0.06] transition group">
                <Globe className="w-3.5 h-3.5 text-emerald-400/80 group-hover:text-emerald-400 shrink-0 transition" />
                <select
                  value={currentCityId}
                  onChange={e => onSelectCity(e.target.value)}
                  className="bg-transparent text-slate-300 text-xs font-medium focus:outline-none focus:text-white cursor-pointer transition pr-1"
                >
                  {CITY_PROFILES.map(city => (
                    <option key={city.id} value={city.id} className="bg-[#0b101f] text-slate-200">
                      {city.name} · {city.country.split(' ')[0]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Zone 2: Navigation Links (Polished Segmented Control) */}
          <nav className="hidden md:flex items-center gap-1 p-1 bg-slate-950/60 rounded-xl border border-white/[0.06] shadow-inner">
            {navTabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative flex items-center gap-2 px-3 py-1.5 text-xs rounded-lg transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-slate-800/90 text-white font-semibold shadow-sm border border-white/[0.1] shadow-slate-950/50'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 font-medium'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 transition-colors ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                  <span>{tab.label}</span>
                  {tab.id === 'heap' && criticalBinCount > 0 && (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                  )}
                  {tab.id === 'maintenance' && maintenanceAlertCount > 0 && (
                    <span className="px-1.5 py-0.2 text-[9px] font-mono font-bold text-amber-300 bg-amber-950/60 border border-amber-800/50 rounded-full">
                      {maintenanceAlertCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Operations, Theme & Simulation HUD */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Live IoT Telemetry Streamer Trigger */}
            {onOpenIoTTelemetry && (
              <button
                onClick={onOpenIoTTelemetry}
                title="Launch Live Edge Hardware Telemetry Simulator & MQTT Streamer"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-950/40 hover:bg-purple-900/50 text-purple-300 border border-purple-800/60 rounded-xl text-xs font-medium transition shadow-sm hover:border-purple-600/60 active:scale-[0.98]"
              >
                <Radio className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
                <span className="hidden sm:inline font-mono">IoT Streamer</span>
              </button>
            )}

            {/* Weather & Simulation Step Toggles */}
            <div className="hidden xl:flex items-center gap-1 bg-slate-950/70 border border-white/[0.08] rounded-xl p-1 text-xs">
              <button
                onClick={() =>
                  setSimulation(prev => ({
                    ...prev,
                    weatherCondition: prev.weatherCondition === 'Clear' ? 'Rainy' : 'Clear',
                  }))
                }
                title="Toggle Weather Condition Penalty"
                className="flex items-center gap-1.5 px-2.5 py-1 text-slate-300 hover:text-white rounded-lg hover:bg-slate-800/60 transition"
              >
                {simulation.weatherCondition === 'Clear' ? (
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                ) : (
                  <CloudRain className="w-3.5 h-3.5 text-sky-400" />
                )}
                <span className="text-[11px] font-medium">{simulation.weatherCondition}</span>
              </button>

              <div className="w-px h-3.5 bg-slate-800" />

              <button
                onClick={() =>
                  setSimulation(prev => ({ ...prev, isRunning: !prev.isRunning }))
                }
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition text-[11px] font-medium ${
                  simulation.isRunning
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm'
                    : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'
                }`}
              >
                {simulation.isRunning ? (
                  <>
                    <Pause className="w-3 h-3 text-emerald-400" />
                    <span>Run</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3 h-3 text-slate-400" />
                    <span>Stop</span>
                  </>
                )}
              </button>
            </div>

            {/* Background Color Theme Switcher Dropdown */}
            {onSelectBgTheme && (
              <div className="relative">
                <button
                  onClick={() => {
                    setIsThemeMenuOpen(!isThemeMenuOpen);
                    setIsDataMenuOpen(false);
                  }}
                  title="Change Background Color Theme"
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-200 bg-slate-800/80 hover:bg-slate-700/80 border border-white/[0.1] rounded-xl shadow-sm transition active:scale-[0.98]"
                >
                  <Palette className="w-3.5 h-3.5 text-sky-400" />
                  <span className="hidden sm:inline">Theme</span>
                  <div 
                    className="w-2.5 h-2.5 rounded-full border border-white/40 shrink-0 ml-0.5" 
                    style={{ backgroundColor: THEME_OPTIONS.find(t => t.id === bgTheme)?.previewBg || '#0b0f19' }} 
                  />
                </button>

                {isThemeMenuOpen && (
                  <div
                    className="absolute right-0 mt-2 w-64 bg-[#0b101f] border border-white/[0.12] rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in"
                    onClick={() => setIsThemeMenuOpen(false)}
                  >
                    <div className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider text-slate-400 border-b border-white/[0.06] mb-1.5 flex items-center justify-between">
                      <span>Background Palette</span>
                      <span className="text-emerald-400 font-bold">5 Colors</span>
                    </div>

                    <div className="space-y-1">
                      {THEME_OPTIONS.map(opt => {
                        const isSelected = bgTheme === opt.id;
                        return (
                          <button
                            key={opt.id}
                            onClick={() => onSelectBgTheme(opt.id)}
                            className={`w-full flex items-center justify-between gap-3 px-3 py-2 rounded-xl text-xs text-left transition ${
                              isSelected
                                ? 'bg-slate-800/90 text-white font-semibold border border-white/[0.1]'
                                : 'text-slate-300 hover:bg-slate-800/50 hover:text-white'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <span
                                className={`w-4 h-4 rounded-full shrink-0 border ${opt.borderClass} shadow-sm`}
                                style={{ backgroundColor: opt.previewBg }}
                              />
                              <div>
                                <div className="font-semibold text-white leading-tight">{opt.name}</div>
                                <div className="text-[10px] text-slate-400 leading-tight">{opt.description}</div>
                              </div>
                            </div>
                            {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Data Hub Export Menu */}
            <div className="relative">
              <button
                onClick={() => {
                  setIsDataMenuOpen(!isDataMenuOpen);
                  setIsThemeMenuOpen(false);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-800/80 hover:bg-slate-700/80 border border-white/[0.1] rounded-xl shadow-sm transition active:scale-[0.98]"
              >
                <Database className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">Data Hub</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {isDataMenuOpen && (
                <div
                  className="absolute right-0 mt-2 w-60 bg-[#0b101f] border border-white/[0.12] rounded-2xl shadow-2xl p-1.5 z-50 animate-in fade-in"
                  onClick={() => setIsDataMenuOpen(false)}
                >
                  <div className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider text-slate-500 border-b border-white/[0.06] mb-1">
                    Export Municipal Telemetry
                  </div>
                  <button
                    onClick={onExportMLDataset}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-left text-slate-200 hover:bg-slate-800/80 rounded-xl transition"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div>
                      <div className="font-semibold text-white">ML Sensor Dataset (CSV)</div>
                      <div className="text-[10px] text-slate-400 font-mono">5k readings for Python/Pandas</div>
                    </div>
                  </button>

                  <button
                    onClick={onExportGeoJSON}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-left text-slate-200 hover:bg-slate-800/80 rounded-xl transition"
                  >
                    <Globe className="w-4 h-4 text-sky-400 shrink-0" />
                    <div>
                      <div className="font-semibold text-white">GIS GeoJSON Export</div>
                      <div className="text-[10px] text-slate-400 font-mono">For QGIS, ArcGIS & Mapbox</div>
                    </div>
                  </button>

                  <div className="h-px bg-white/[0.08] my-1" />

                  <button
                    onClick={onExportPDF}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-left text-emerald-300 hover:bg-emerald-950/40 rounded-xl transition"
                  >
                    <Download className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div>
                      <div className="font-semibold text-emerald-200">Municipal Audit PDF</div>
                      <div className="text-[10px] text-emerald-400/80 font-mono">Defra environmental report</div>
                    </div>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Nav Tabs Bar */}
        <div className="md:hidden flex items-center overflow-x-auto py-2 gap-1 border-t border-white/[0.06]">
          {navTabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg whitespace-nowrap transition ${
                  isActive
                    ? 'bg-slate-800 text-white font-medium border border-white/[0.1]'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-3 h-3" />
                <span>{tab.label}</span>
                {tab.id === 'maintenance' && maintenanceAlertCount > 0 && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
