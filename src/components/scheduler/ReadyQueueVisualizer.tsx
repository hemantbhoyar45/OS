import React from 'react';
import { Cpu, Users, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { TimeStepState } from '../../engine/schedulerTypes';

interface ReadyQueueVisualizerProps {
  currentStep?: TimeStepState;
}

export const ReadyQueueVisualizer: React.FC<ReadyQueueVisualizerProps> = ({ currentStep }) => {
  if (!currentStep) {
    return null;
  }

  const isRunningIdle = currentStep.runningPid === -1;

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
      {/* CPU State (5 cols) */}
      <div className="md:col-span-5 bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-1.5 font-semibold text-white">
            <Cpu className="w-4 h-4 text-blue-400" />
            CPU Core Status
          </span>
          <span className="font-mono text-slate-400">Time: {currentStep.time}</span>
        </div>

        <div className={`p-3 rounded-lg border flex items-center justify-between font-mono ${
          isRunningIdle
            ? 'bg-slate-900/60 border-slate-800 text-slate-500'
            : 'bg-blue-950/40 border-blue-500/50 text-blue-300'
        }`}>
          <div>
            <span className="text-[10px] uppercase text-slate-500 block">Executing Process</span>
            <span className="text-base font-bold">
              {isRunningIdle ? 'CPU IDLE' : currentStep.runningName}
            </span>
          </div>

          {!isRunningIdle && (
            <span className="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
              Active Slice
            </span>
          )}
        </div>

        <p className="text-[11px] text-slate-400 font-mono truncate">
          {currentStep.log}
        </p>
      </div>

      {/* Ready Queue (7 cols) */}
      <div className="md:col-span-7 bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-1.5 font-semibold text-white">
            <Users className="w-4 h-4 text-emerald-400" />
            Ready Queue (Waiting for CPU)
          </span>
          <span className="font-mono text-slate-400">
            {currentStep.readyQueuePids.length} in queue
          </span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto min-h-[58px] p-1.5 bg-slate-900/40 rounded-lg border border-slate-800/80">
          {currentStep.readyQueuePids.length === 0 ? (
            <span className="text-xs text-slate-600 italic px-2">Ready Queue is empty.</span>
          ) : (
            currentStep.readyQueuePids.map((pid, idx) => {
              const pInfo = currentStep.processStates.find((p) => p.pid === pid);
              return (
                <div
                  key={pid}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs font-mono font-bold shrink-0 shadow-sm"
                >
                  <span className="text-[10px] text-slate-400 mr-1">#{idx + 1}</span>
                  <span>{pInfo ? pInfo.name : `P${pid}`}</span>
                  <span className="text-[10px] text-slate-400 ml-1">
                    (rem: {pInfo?.remainingBurst ?? '?'})
                  </span>
                </div>
              );
            })
          )}
        </div>

        {/* Process Status Indicators */}
        <div className="flex flex-wrap gap-2 pt-1 text-[11px] font-mono">
          {currentStep.processStates.map((ps) => {
            const statusLabel =
              ps.state === 0 ? 'Not Arrived' : ps.state === 1 ? 'Ready' : ps.state === 2 ? 'Running' : 'Done';
            const statusColor =
              ps.state === 2
                ? 'text-blue-400 bg-blue-500/10 border-blue-500/30'
                : ps.state === 1
                ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
                : ps.state === 3
                ? 'text-purple-400 bg-purple-500/10 border-purple-500/30'
                : 'text-slate-500 bg-slate-900 border-slate-800';

            return (
              <span
                key={ps.pid}
                className={`px-2 py-0.5 rounded border ${statusColor}`}
                title={`Remaining burst: ${ps.remainingBurst}`}
              >
                {ps.name}: {statusLabel}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
};
