import React, { useState } from 'react';
import { SmartBin, CitizenReport } from '../types';
import { X, Camera, Upload, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface NewReportModalProps {
  bins: SmartBin[];
  isOpen: boolean;
  onClose: () => void;
  onSubmitReport: (report: Omit<CitizenReport, 'id' | 'timestamp' | 'upvotes' | 'status' | 'verifiedByAI'>) => void;
}

export const NewReportModal: React.FC<NewReportModalProps> = ({
  bins,
  isOpen,
  onClose,
  onSubmitReport,
}) => {
  if (!isOpen) return null;

  const [binId, setBinId] = useState<string>(bins[0]?.id || 'BIN-101');
  const [issueType, setIssueType] = useState<CitizenReport['issueType']>('Overflowing Bin');
  const [citizenName, setCitizenName] = useState<string>('Jordan Reed');
  const [locationDescription, setLocationDescription] = useState<string>('Bin is over capacity and packaging waste is spilling onto the pedestrian path.');
  const [selectedPhoto, setSelectedPhoto] = useState<string>('/src/assets/images/bin_overflow_report_1790502768121.jpg');

  const selectedBin = bins.find(b => b.id === binId) || bins[0];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmitReport({
      binId,
      binName: selectedBin.name,
      citizenName: citizenName || 'Anonymous Citizen',
      issueType,
      locationDescription,
      imageUrl: selectedPhoto,
    });
    onClose();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white">Report Overflowing or Damaged Bin</h2>
            <p className="text-xs text-slate-400">Public sanitation complaint dispatch</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Bin Select */}
          <div>
            <label className="text-xs text-slate-300 font-medium block mb-1">
              Select Smart Bin Location:
            </label>
            <select
              value={binId}
              onChange={(e) => setBinId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:border-slate-700"
            >
              {bins.map(b => (
                <option key={b.id} value={b.id}>
                  {b.id} - {b.name} ({b.zone})
                </option>
              ))}
            </select>
          </div>

          {/* Issue Type */}
          <div>
            <label className="text-xs text-slate-300 font-medium block mb-1">
              Issue Category:
            </label>
            <select
              value={issueType}
              onChange={(e) => setIssueType(e.target.value as CitizenReport['issueType'])}
              className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-slate-700"
            >
              <option value="Overflowing Bin">Overflowing Bin (Severe)</option>
              <option value="Damaged Lid">Damaged / Stuck Lid</option>
              <option value="Illegal Dumping">Illegal Bulk Dumping</option>
              <option value="Pest / Odor">Pest / Odor Nuisance</option>
              <option value="Sensor Offline">Sensor Offline / Vandalized</option>
            </select>
          </div>

          {/* Citizen Name */}
          <div>
            <label className="text-xs text-slate-300 font-medium block mb-1">
              Your Name / Resident Handle:
            </label>
            <input
              type="text"
              value={citizenName}
              onChange={(e) => setCitizenName(e.target.value)}
              placeholder="e.g. Jordan Reed"
              className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-slate-700"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-xs text-slate-300 font-medium block mb-1">
              Incident Details & Precise Landmarks:
            </label>
            <textarea
              rows={3}
              value={locationDescription}
              onChange={(e) => setLocationDescription(e.target.value)}
              placeholder="Describe condition, e.g. cardboard boxes stacking on pavement..."
              className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-slate-700 resize-none"
              required
            />
          </div>

          {/* Photo Attachment & Preview */}
          <div>
            <label className="text-xs text-slate-300 font-medium block mb-1.5">
              Photo Verification:
            </label>
            <div className="flex items-center gap-3">
              <div className="w-20 h-16 rounded-lg overflow-hidden border border-slate-800 bg-slate-950 relative shrink-0">
                <img
                  src={selectedPhoto}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="flex-1 space-y-1.5">
                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg cursor-pointer transition">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Device Photo</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
                <div className="text-[10px] text-slate-500">
                  JPG/PNG up to 10MB · Civic image geotagged
                </div>
              </div>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 transition"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-sm transition active:scale-[0.98]"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Submit Civic Complaint</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
