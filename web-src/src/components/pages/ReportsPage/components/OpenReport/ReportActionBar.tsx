import React from 'react';
import { Report } from '../../../../../types';
import { runPanelAction } from '../../../../../utils/panelActions';
import { getReportTypeStyles } from '../../../../../utils/misc';

interface ReportActionBarProps {
  currentReport: Report;
  onBack: () => void;
  onExport: (report: Report) => void;
  onDelete: () => void;
  onClose: () => void;
  onReopen: () => void;
  onClaim?: () => void;
}

export const ReportActionBar: React.FC<ReportActionBarProps> = ({
  currentReport,
  onBack,
  onExport,
  onDelete,
  onClose,
  onReopen,
  onClaim,
}) => (
  <div className="flex flex-col gap-4 mb-6 w-full">
    {/* Top Row: Navigation + Actions */}
    <div className="flex flex-wrap justify-between items-center gap-3">
      <div className="flex items-center gap-2 flex-wrap">
        <button
          className="w-9 h-9 rounded-lg bg-black/40 text-muted hover:text-white hover:bg-black/60 flex items-center justify-center transition-all border border-border/50 group"
          onClick={onBack}
        >
          <i className="fa-solid fa-arrow-left text-sm"></i>
        </button>
        <span className="text-sm font-rajdhani text-muted/60 font-bold uppercase tracking-widest bg-black/30 h-9 px-4 flex items-center justify-center rounded-lg border border-border/50">
          #{currentReport.Id}
        </span>
        <span
          className={`text-sm font-rajdhani font-bold uppercase tracking-widest px-2.5 py-1 rounded-lg border ${
            currentReport.Status === 'Closed'
              ? 'bg-red-500/10 text-red-400 border-red-500/20'
              : 'bg-green-500/10 text-green-400 border-green-500/20'
          }`}
        >
          {currentReport.Status === 'Active' ? 'Open' : 'Closed'}
        </span>
        {currentReport.Type && (
          <span
            className={`text-sm font-rajdhani font-bold uppercase tracking-widest px-2.5 py-1 rounded-lg border ${getReportTypeStyles(currentReport.Type)}`}
          >
            {currentReport.Type}
          </span>
        )}
        {currentReport.Priority && currentReport.Priority !== 'Normal' && (
          <span
            className={`text-sm font-rajdhani font-bold uppercase tracking-widest px-2.5 py-1 rounded-lg border ${
              currentReport.Priority === 'Urgent'
                ? 'bg-red-500/10 text-red-400 border-red-500/20'
                : currentReport.Priority === 'High'
                  ? 'bg-orange-500/10 text-orange-400 border-orange-500/20'
                  : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
            }`}
          >
            {currentReport.Priority}
          </span>
        )}
      </div>

      <div className="flex gap-2">
        {currentReport.Status === 'Active' && !currentReport.ClaimedBy && (
          <button
            className="h-9 px-4 rounded-lg text-blue-400 hover:text-white hover:bg-blue-500/20 flex items-center gap-2 border border-blue-500/20 transition-all text-[11px] font-rajdhani font-bold uppercase tracking-wider"
            onClick={onClaim}
          >
            <i className="fa-solid fa-hand"></i> Claim
          </button>
        )}
        {currentReport.Status !== 'Closed' && (
          <button
            className="h-9 px-4 rounded-lg text-orange-400 hover:text-white hover:bg-orange-500/20 flex items-center gap-2 border border-orange-500/20 transition-all text-[11px] font-rajdhani font-bold uppercase tracking-wider"
            onClick={onClose}
          >
            <i className="fa-solid fa-lock text-[10px]"></i> Close
          </button>
        )}
        {currentReport.Status === 'Closed' && (
          <>
            <button
              className="h-9 px-4 rounded-lg text-green-400 hover:text-white hover:bg-green-500/20 flex items-center gap-2 border border-green-500/20 transition-all text-[11px] font-rajdhani font-bold uppercase tracking-wider"
              onClick={onReopen}
            >
              <i className="fa-solid fa-lock-open text-[10px]"></i> Reopen
            </button>
            <button
              className="h-9 px-4 rounded-lg text-muted hover:text-white hover:bg-white/10 flex items-center gap-2 border border-border/50 transition-all text-[11px] font-rajdhani font-bold uppercase tracking-wider"
              onClick={() => onExport(currentReport)}
            >
              <i className="fa-solid fa-file-export text-[10px]"></i> Export
            </button>
            <button
              className="h-9 px-4 rounded-lg text-red-400 hover:text-white hover:bg-red-500/20 flex items-center gap-2 border border-red-500/20 transition-all text-[11px] font-rajdhani font-bold uppercase tracking-wider"
              onClick={onDelete}
            >
              <i className="fa-solid fa-trash-can text-[10px]"></i> Delete
            </button>
          </>
        )}
      </div>
    </div>

    {/* Report Title + Reporter Info */}
    <div>
      <h1 className="text-xl font-rajdhani font-black text-primary leading-tight tracking-wide uppercase mb-2">
        {currentReport.Title || currentReport.Description || currentReport.Chats?.[0]?.Message || 'No description'}
      </h1>
      <div className="flex items-center gap-3 mt-1 text-muted/70 flex-wrap">
        <div className="flex items-center gap-2.5 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
          <div className="w-6 h-6 rounded-full bg-black/60 border border-border/50 flex items-center justify-center">
            <i className="fa-solid fa-user text-[10px] text-accent/80"></i>
          </div>
          <span className="text-xs font-rajdhani font-bold text-primary/90 uppercase tracking-wider">
            {currentReport.Chats?.[0]?.Sender || 'Unknown'} ({currentReport.OpenById || '?'})
          </span>
        </div>
        <span className="w-1.5 h-1.5 rounded-full bg-border/50"></span>
        <div className="flex items-center gap-2">
          <i className="fa-solid fa-clock text-[10px] text-muted/60"></i>
          <span className="text-[11px] font-mono font-bold text-muted/80">
            {currentReport.Chats?.[0]?.Time || '--:--'}
          </span>
        </div>
        {currentReport.ClaimedByName && (
          <>
            <span className="w-1 h-1 rounded-full bg-border"></span>
            <span className="text-[10px] font-rajdhani font-bold text-accent/60 uppercase tracking-wider">
              Claimed by {currentReport.ClaimedByName}
            </span>
          </>
        )}
        <div className="flex gap-2 ml-auto">
          <button
            className="h-7 px-3 rounded text-emerald-400 hover:text-white hover:bg-emerald-500/20 border border-emerald-500/20 transition-all text-[10px] font-rajdhani font-bold uppercase tracking-wider flex items-center gap-1.5"
            onClick={() => runPanelAction('revivePlayer', { player: Number(currentReport.OpenById) })}
          >
            <i className="fa-solid fa-heart-pulse"></i> Revive
          </button>
          <button
            className="h-7 px-3 rounded text-sky-400 hover:text-white hover:bg-sky-500/20 border border-sky-500/20 transition-all text-[10px] font-rajdhani font-bold uppercase tracking-wider flex items-center gap-1.5"
            onClick={() => runPanelAction('teleportPlayer', { player: Number(currentReport.OpenById), type: 'Goto' })}
          >
            <i className="fa-solid fa-location-arrow"></i> Go to
          </button>
          <button
            className="h-7 px-3 rounded text-indigo-400 hover:text-white hover:bg-indigo-500/20 border border-indigo-500/20 transition-all text-[10px] font-rajdhani font-bold uppercase tracking-wider flex items-center gap-1.5"
            onClick={() => runPanelAction('teleportPlayer', { player: Number(currentReport.OpenById), type: 'Bring' })}
          >
            <i className="fa-solid fa-magnet"></i> Bring
          </button>
          <button
            className="h-7 px-3 rounded text-purple-400 hover:text-white hover:bg-purple-500/20 border border-purple-500/20 transition-all text-[10px] font-rajdhani font-bold uppercase tracking-wider flex items-center gap-1.5"
            onClick={() => runPanelAction('spectatePlayer', { player: Number(currentReport.OpenById) })}
          >
            <i className="fa-solid fa-eye"></i> Spectate
          </button>
        </div>
      </div>
    </div>
  </div>
);
