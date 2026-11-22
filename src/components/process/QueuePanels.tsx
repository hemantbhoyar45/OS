import React from 'react';
import { PCBData } from '../../engine/processManagerTypes';
import { Users, Clock, AlertTriangle, Eye, Play, CheckCircle2, X } from 'lucide-react';

interface QueuePanelsProps {
  allProcesses: PCBData[];
  readyQueueIds: number[];
  waitingQueueIds: number[];
  newQueueIds: number[];
  terminatedQueueIds: number[];
  runningPid: number;
  onInspectProcess: (pcb: PCBData) => void;
  onAdmitProcess: (pid: number) => void;
  onUnblockProcess: (pid: number) => void;
  onTerminateProcess: (pid: number) => void;
  onDispatchProcess: (pid: number) => void;
}

export const QueuePanels: React.FC<QueuePanelsProps> = ({
  allProcesses,
  readyQueueIds,
  waitingQueueIds,
  newQueueIds,
  terminatedQueueIds,
  runningPid,
  onInspectProcess,
  onAdmitProcess,
  onUnblockProcess,
  onTerminateProcess,
  onDispatchProcess
}) => {
  const pMap = new Map<number, PCBData>(allProcesses.map((p) => [p.pid, p]));

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Ready Queue Panel */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-white">Ready Queue (FIFO / Scheduler Priority)</h3>
          </div>
          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            {readyQueueIds.length} ready
          </span>
        </div>

        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
          {readyQueueIds.length === 0 ? (
            <div className="text-xs text-slate-500 italic p-4 text-center bg-slate-950 rounded-xl border border-slate-800/80">
              Ready Queue is currently empty.
            </div>
          ) : (
            readyQueueIds.map((pid, idx) => {
              const p = pMap.get(pid);
              if (!p) return null;
              return (
                <div
                  key={pid}
                  className="bg-slate-950 p-3 rounded-xl border border-slate-800 hover:border-emerald-500/40 transition-all flex items-center justify-between text-xs font-mono"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-slate-500 text-[10px] w-4">#{idx + 1}</span>
                    <div>
                      <div className="font-bold text-white flex items-center gap-1.5 font-sans">
                        <span>{p.name}</span>
                        <span className="text-[10px] text-slate-400 font-mono">(PID: {p.pid})</span>
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Remaining: <strong className="text-emerald-400">{p.remainingTime}u</strong> | Priority: <strong className="text-white">{p.priority}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => onInspectProcess(p)}
                      className="p-1.5 text-slate-400 hover:text-white rounded bg-slate-900 border border-slate-800 transition-colors"
                      title="Inspect PCB"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDispatchProcess(p.pid)}
                      className="px-2 py-1 text-xs rounded bg-blue-600 hover:bg-blue-500 text-white font-sans font-medium transition-colors"
                      title="Dispatch this process to CPU"
                    >
                      Dispatch
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Waiting / Blocked Queue Panel */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-semibold text-white">Waiting Queue (Blocked on I/O or Events)</h3>
          </div>
          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
            {waitingQueueIds.length} blocked
          </span>
        </div>

        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
          {waitingQueueIds.length === 0 ? (
            <div className="text-xs text-slate-500 italic p-4 text-center bg-slate-950 rounded-xl border border-slate-800/80">
              No processes waiting on I/O.
            </div>
          ) : (
            waitingQueueIds.map((pid) => {
              const p = pMap.get(pid);
              if (!p) return null;
              return (
                <div
                  key={pid}
                  className="bg-slate-950 p-3 rounded-xl border border-amber-500/30 bg-amber-950/10 transition-all flex items-center justify-between text-xs font-mono"
                >
                  <div>
                    <div className="font-bold text-amber-300 flex items-center gap-1.5 font-sans">
                      <span>{p.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono">(PID: {p.pid})</span>
                    </div>
                    <div className="text-[11px] text-slate-300">
                      Reason: <strong className="text-amber-400">{p.waitReason}</strong>
                    </div>
                    <div className="text-[10px] text-slate-500">
                      I/O Wait Remaining: {p.ioRemainingTicks} ticks
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => onInspectProcess(p)}
                      className="p-1.5 text-slate-400 hover:text-white rounded bg-slate-900 border border-slate-800 transition-colors"
                      title="Inspect PCB"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onUnblockProcess(p.pid)}
                      className="px-2 py-1 text-xs rounded bg-emerald-600 hover:bg-emerald-500 text-white font-sans font-medium transition-colors"
                      title="Complete I/O and return to Ready"
                    >
                      Unblock
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
