import React, { useState } from 'react';
import { CitizenReport, SmartBin } from '../types';
import { 
  Users, 
  Plus, 
  ThumbsUp, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Camera, 
  MapPin, 
  ShieldCheck,
  Filter
} from 'lucide-react';

interface CitizenPortalViewProps {
  reports: CitizenReport[];
  bins: SmartBin[];
  onOpenReportModal: () => void;
  onUpvoteReport: (reportId: string) => void;
}

export const CitizenPortalView: React.FC<CitizenPortalViewProps> = ({
  reports,
  bins,
  onOpenReportModal,
  onUpvoteReport,
}) => {
  const [filterStatus, setFilterStatus] = useState<string>('All');

  const filteredReports = filterStatus === 'All'
    ? reports
    : reports.filter(r => r.status === filterStatus);

  return (
    <div className="space-y-6">
      {/* Citizen Portal Header */}
      <div className="bg-[#090e1c]/80 backdrop-blur-xl border border-white/[0.08] rounded-2xl p-5 sm:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-5 shadow-2xl relative overflow-hidden">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
            <span>Civic Telemetry & Incident Reporting</span>
            <span className="text-slate-600">/</span>
            <span className="text-emerald-400 font-mono font-semibold">Vision AI Verification & Heap Rebalance</span>
          </div>
          <h1 className="font-display text-xl sm:text-2xl font-bold text-white tracking-tight mt-1">
            Citizen Waste & Overflow Reporting Portal
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-3xl leading-relaxed">
            Empowering residents to submit overflow complaints and damaged bin photos. AI evaluates ticket severity and prioritizes truck dispatch.
          </p>
        </div>

        <button
          onClick={onOpenReportModal}
          className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 rounded-xl shadow-lg shadow-emerald-950/60 border border-emerald-400/30 transition active:scale-[0.98] whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          <span>Report Overflowing Bin</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 p-1 bg-slate-950/80 border border-white/[0.08] rounded-xl w-fit text-xs">
        {['All', 'Pending Review', 'Verified', 'Dispatched', 'Resolved'].map(st => (
          <button
            key={st}
            onClick={() => setFilterStatus(st)}
            className={`px-3 py-1.5 rounded-lg font-semibold transition ${
              filterStatus === st
                ? 'bg-slate-800 text-white shadow-sm border border-white/[0.1]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {st}
          </button>
        ))}
      </div>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredReports.map(report => (
          <div
            key={report.id}
            className="bg-[#090e1c]/80 backdrop-blur-md border border-white/[0.08] rounded-2xl overflow-hidden flex flex-col justify-between hover:border-white/[0.16] shadow-xl transition-all"
          >
            <div>
              {/* Image Preview with Scrim */}
              <div className="relative aspect-video w-full overflow-hidden bg-slate-950">
                <img
                  src={report.imageUrl}
                  alt={report.issueType}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    // Fallback to stylized SVG placeholder if image fails
                    e.currentTarget.style.display = 'none';
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent pointer-events-none" />

                {/* Status Badge */}
                <div className="absolute top-3 right-3">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold ${
                    report.status === 'Dispatched'
                      ? 'bg-sky-500/90 text-white'
                      : report.status === 'Verified'
                      ? 'bg-amber-500/90 text-slate-950'
                      : report.status === 'Resolved'
                      ? 'bg-emerald-500/90 text-white'
                      : 'bg-slate-800/90 text-slate-300'
                  }`}>
                    {report.status}
                  </span>
                </div>

                {/* AI Verified Badge */}
                {report.verifiedByAI && (
                  <div className="absolute top-3 left-3 bg-emerald-950/80 backdrop-blur border border-emerald-500/40 text-emerald-300 px-2 py-0.5 rounded text-[10px] flex items-center gap-1 font-mono">
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                    <span>AI Validated</span>
                  </div>
                )}

                {/* Bin Name Overlay */}
                <div className="absolute bottom-2.5 left-3 right-3 text-white">
                  <div className="text-xs font-bold truncate">{report.binName}</div>
                  <div className="text-[10px] text-slate-300 font-mono">ID: {report.binId}</div>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-4 space-y-2">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span className="font-semibold text-white">{report.issueType}</span>
                  <span className="font-mono">{report.timestamp}</span>
                </div>

                <p className="text-xs text-slate-300 line-clamp-2">
                  {report.locationDescription}
                </p>

                <div className="text-[11px] text-slate-500">
                  Reported by: <span className="text-slate-400 font-medium">{report.citizenName}</span>
                </div>
              </div>
            </div>

            {/* Card Footer with Upvote Button */}
            <div className="px-4 py-3 bg-slate-950/60 border-t border-slate-800/80 flex items-center justify-between">
              <span className="text-[11px] text-slate-500 font-mono">
                Ticket: #{report.id}
              </span>

              <button
                onClick={() => onUpvoteReport(report.id)}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded transition active:scale-95"
              >
                <ThumbsUp className="w-3.5 h-3.5 text-sky-400" />
                <span>{report.upvotes}</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
