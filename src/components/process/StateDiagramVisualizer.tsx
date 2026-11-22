import React from 'react';
import { ProcessState, PCBData } from '../../engine/processManagerTypes';
import { Sparkles, ArrowRight, Eye, ShieldAlert, CheckCircle2 } from 'lucide-react';

interface StateDiagramVisualizerProps {
  allProcesses: PCBData[];
  selectedStateFilter: ProcessState | 'ALL';
  onSelectStateFilter: (state: ProcessState | 'ALL') => void;
  onInspectProcess: (pcb: PCBData) => void;
  lastTrigger?: string;
}

export const StateDiagramVisualizer: React.FC<StateDiagramVisualizerProps> = ({
  allProcesses,
  selectedStateFilter,
  onSelectStateFilter,
  onInspectProcess,
  lastTrigger
}) => {
  // Count processes per state
  const stateCounts: Record<ProcessState, number> = {
    NEW: allProcesses.filter((p) => p.state === 'NEW').length,
    READY: allProcesses.filter((p) => p.state === 'READY').length,
    RUNNING: allProcesses.filter((p) => p.state === 'RUNNING').length,
    WAITING: allProcesses.filter((p) => p.state === 'WAITING').length,
    TERMINATED: allProcesses.filter((p) => p.state === 'TERMINATED').length
  };

  const statesConfig: { id: ProcessState; label: string; desc: string; color: string; border: string; bg: string; text: string }[] = [
    {
      id: 'NEW',
      label: 'NEW',
      desc: 'Created & awaiting admission',
      color: 'blue',
      border: 'border-blue-500/50',
      bg: 'bg-blue-950/40',
      text: 'text-blue-400'
    },
    {
      id: 'READY',
      label: 'READY',
      desc: 'In ready queue awaiting CPU',
      color: 'emerald',
      border: 'border-emerald-500/50',
      bg: 'bg-emerald-950/40',
      text: 'text-emerald-400'
    },
    {
      id: 'RUNNING',
      label: 'RUNNING',
      desc: 'Executing on CPU Core',
      color: 'purple',
      border: 'border-purple-500/50',
      bg: 'bg-purple-950/40',
      text: 'text-purple-400'
    },
    {
      id: 'WAITING',
      label: 'WAITING',
      desc: 'Blocked on I/O or event',
      color: 'amber',
      border: 'border-amber-500/50',
      bg: 'bg-amber-950/40',
      text: 'text-amber-400'
    },
    {
      id: 'TERMINATED',
      label: 'TERMINATED',
      desc: 'Finished execution / Exit',
      color: 'rose',
      border: 'border-rose-500/50',
      bg: 'bg-rose-950/40',
      text: 'text-rose-400'
    }
  ];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div>
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <span>Canonical 5-State Process Model Diagram</span>
            {lastTrigger && (
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                Last: {lastTrigger}
              </span>
            )}
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Click on any state bubble to filter active processes or view state transitions.
          </p>
        </div>

        <button
          onClick={() => onSelectStateFilter('ALL')}
          className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium border transition-all ${
            selectedStateFilter === 'ALL'
              ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
              : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
          }`}
        >
          View All ({allProcesses.length})
        </button>
      </div>

      {/* Interactive State Flow Layout */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
        {statesConfig.map((s) => {
          const isSelected = selectedStateFilter === s.id;
          const count = stateCounts[s.id];
          const hasProcesses = count > 0;

          return (
            <div
              key={s.id}
              onClick={() => onSelectStateFilter(isSelected ? 'ALL' : s.id)}
              className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between select-none relative overflow-hidden group ${
                isSelected
                  ? `${s.bg} ${s.border} ring-2 ring-${s.color}-500/50 shadow-lg`
                  : hasProcesses
                  ? `${s.bg} ${s.border} hover:brightness-125`
                  : 'bg-slate-950/40 border-slate-850 opacity-60 hover:opacity-100'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs font-mono font-bold tracking-wider ${s.text}`}>
                    {s.label}
                  </span>
                  <span
                    className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full ${
                      hasProcesses
                        ? `${s.bg} ${s.text} border ${s.border}`
                        : 'bg-slate-900 text-slate-500'
                    }`}
                  >
                    {count}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-snug">{s.desc}</p>
              </div>

              {/* Processes in this state preview */}
              <div className="mt-3 pt-2 border-t border-slate-800/80 flex flex-wrap gap-1">
                {allProcesses
                  .filter((p) => p.state === s.id)
                  .map((p) => (
                    <button
                      key={p.pid}
                      onClick={(e) => {
                        e.stopPropagation();
                        onInspectProcess(p);
                      }}
                      className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 transition-colors"
                      title="Inspect PCB"
                    >
                      {p.name}
                    </button>
                  ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Transition Guide Arrows Card */}
      <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800/80 text-[11px] font-mono text-slate-400 grid grid-cols-1 md:grid-cols-3 gap-2">
        <div className="flex items-center gap-1.5">
          <span className="text-blue-400 font-bold">NEW ➔ READY:</span>
          <span>Admit (Job Loaded)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-emerald-400 font-bold">READY ➔ RUNNING:</span>
          <span>Dispatch (Scheduler)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-amber-400 font-bold">RUNNING ➔ WAITING:</span>
          <span>I/O Wait (SI=1, SI=2)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-emerald-400 font-bold">WAITING ➔ READY:</span>
          <span>I/O Event Complete</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-purple-400 font-bold">RUNNING ➔ READY:</span>
          <span>Preempt (Timer/TQ)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-rose-400 font-bold">RUNNING ➔ EXIT:</span>
          <span>Terminate (H, SI=3)</span>
        </div>
      </div>
    </div>
  );
};
