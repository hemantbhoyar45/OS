import React from 'react';
import { GanttSegment } from '../../engine/schedulerTypes';

interface GanttChartProps {
  segments: GanttSegment[];
  totalTime: number;
  currentTime?: number;
  isInteractive?: boolean;
}

// Consistent colors for processes by PID
const PROCESS_COLORS: Record<number, { bg: string; border: string; text: string }> = {
  [-1]: { bg: 'bg-slate-950/70', border: 'border-slate-800', text: 'text-slate-500' }, // IDLE
  1: { bg: 'bg-blue-600/40', border: 'border-blue-500', text: 'text-blue-300' },
  2: { bg: 'bg-emerald-600/40', border: 'border-emerald-500', text: 'text-emerald-300' },
  3: { bg: 'bg-purple-600/40', border: 'border-purple-500', text: 'text-purple-300' },
  4: { bg: 'bg-amber-600/40', border: 'border-amber-500', text: 'text-amber-300' },
  5: { bg: 'bg-rose-600/40', border: 'border-rose-500', text: 'text-rose-300' },
  6: { bg: 'bg-cyan-600/40', border: 'border-cyan-500', text: 'text-cyan-300' },
  7: { bg: 'bg-indigo-600/40', border: 'border-indigo-500', text: 'text-indigo-300' },
  8: { bg: 'bg-teal-600/40', border: 'border-teal-500', text: 'text-teal-300' }
};

export const GanttChart: React.FC<GanttChartProps> = ({
  segments,
  totalTime,
  currentTime,
  isInteractive = true
}) => {
  if (segments.length === 0 || totalTime <= 0) {
    return (
      <div className="h-24 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-center text-xs text-slate-500 italic">
        No execution data available.
      </div>
    );
  }

  // Get color for process
  const getColor = (pid: number) => {
    if (pid === -1) return PROCESS_COLORS[-1];
    const key = ((pid - 1) % 8) + 1;
    return PROCESS_COLORS[key] || PROCESS_COLORS[1];
  };

  return (
    <div className="space-y-2">
      {/* Visual Gantt Bar */}
      <div className="relative w-full h-14 bg-slate-950 rounded-xl border border-slate-800 flex overflow-hidden shadow-inner">
        {segments.map((seg, idx) => {
          const duration = seg.endTime - seg.startTime;
          const widthPct = (duration / totalTime) * 100;
          const color = getColor(seg.pid);
          const isIdle = seg.pid === -1;

          return (
            <div
              key={idx}
              style={{ width: `${widthPct}%` }}
              className={`h-full border-r ${color.bg} ${color.border} flex flex-col items-center justify-center transition-all relative group cursor-pointer hover:brightness-125 select-none`}
              title={`${seg.processName}: ${seg.startTime} ➔ ${seg.endTime} (${duration} time units)`}
            >
              <span className={`text-xs font-mono font-bold truncate px-1 ${color.text}`}>
                {isIdle ? 'IDLE' : seg.processName}
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                {duration}u
              </span>

              {/* Tooltip on hover */}
              {isInteractive && (
                <div className="absolute bottom-full mb-1 hidden group-hover:flex flex-col items-center z-30 pointer-events-none">
                  <div className="bg-slate-900 border border-slate-700 text-white text-[11px] font-mono px-2 py-1 rounded shadow-xl whitespace-nowrap">
                    <strong>{seg.processName}</strong>: [{seg.startTime} to {seg.endTime}] ({duration} units)
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Playback Cursor Line */}
        {currentTime !== undefined && (
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-rose-500 z-20 shadow-[0_0_8px_rgba(244,63,94,0.8)] pointer-events-none transition-all duration-150"
            style={{ left: `${(currentTime / totalTime) * 100}%` }}
          >
            <div className="w-2.5 h-2.5 bg-rose-500 rounded-full -ml-1 -top-1 absolute shadow-sm" />
          </div>
        )}
      </div>

      {/* Time Scale Axis */}
      <div className="relative w-full h-6 flex justify-between text-[11px] font-mono text-slate-400 px-0.5">
        <span>0</span>
        {segments.map((seg, idx) => {
          const leftPct = (seg.endTime / totalTime) * 100;
          return (
            <span
              key={idx}
              style={{ left: `${leftPct}%` }}
              className="absolute -translate-x-1/2 text-slate-400"
            >
              {seg.endTime}
            </span>
          );
        })}
      </div>
    </div>
  );
};
