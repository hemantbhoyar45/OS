import React from 'react';
import { Plus, Trash2, RotateCcw, Sparkles, Sliders } from 'lucide-react';
import { ProcessInput, SchedulerAlgorithmId } from '../../engine/schedulerTypes';
import { SCHEDULER_PRESETS } from '../../engine/schedulerPresets';

interface ProcessInputTableProps {
  processes: ProcessInput[];
  onProcessesChange: (processes: ProcessInput[]) => void;
  timeQuantum: number;
  onTimeQuantumChange: (tq: number) => void;
  lowerIsHigherPriority: boolean;
  onTogglePriorityConvention: (val: boolean) => void;
  selectedAlgorithm: SchedulerAlgorithmId;
  onSelectAlgorithm: (algo: SchedulerAlgorithmId) => void;
  selectedPresetId: string;
  onSelectPreset: (presetId: string) => void;
}

export const ProcessInputTable: React.FC<ProcessInputTableProps> = ({
  processes,
  onProcessesChange,
  timeQuantum,
  onTimeQuantumChange,
  lowerIsHigherPriority,
  onTogglePriorityConvention,
  selectedAlgorithm,
  onSelectAlgorithm,
  selectedPresetId,
  onSelectPreset
}) => {
  const handleAddProcess = () => {
    const nextPid = processes.length > 0 ? Math.max(...processes.map((p) => p.pid)) + 1 : 1;
    const newProc: ProcessInput = {
      pid: nextPid,
      name: `P${nextPid}`,
      arrivalTime: processes.length > 0 ? processes[processes.length - 1].arrivalTime + 1 : 0,
      burstTime: 4,
      priority: 2
    };
    onProcessesChange([...processes, newProc]);
  };

  const handleRemoveProcess = (pid: number) => {
    if (processes.length <= 1) return;
    onProcessesChange(processes.filter((p) => p.pid !== pid));
  };

  const handleUpdateProcess = (pid: number, field: keyof ProcessInput, value: any) => {
    onProcessesChange(
      processes.map((p) => (p.pid === pid ? { ...p, [field]: value } : p))
    );
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
      {/* Top Header & Presets */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-indigo-400" />
          <h3 className="text-sm font-semibold text-white">Workload Configuration & Parameters</h3>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Preset:
          </span>
          <select
            value={selectedPresetId}
            onChange={(e) => onSelectPreset(e.target.value)}
            className="bg-slate-950 text-xs rounded-xl px-3 py-1.5 border border-slate-800 text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
          >
            {SCHEDULER_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Global Scheduling Parameters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Algorithm Select */}
        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
          <label className="text-[10px] uppercase font-mono text-slate-400 block">
            Scheduling Algorithm
          </label>
          <select
            value={selectedAlgorithm}
            onChange={(e) => onSelectAlgorithm(e.target.value as SchedulerAlgorithmId)}
            className="w-full bg-slate-900 text-xs rounded-lg px-2.5 py-1.5 border border-slate-700 text-white font-medium focus:outline-none focus:border-blue-500"
          >
            <option value="fcfs">First Come First Serve (FCFS)</option>
            <option value="sjf">Shortest Job First (SJF Non-preemptive)</option>
            <option value="srtf">Shortest Remaining Time First (SRTF Preemptive)</option>
            <option value="rr">Round Robin (RR)</option>
            <option value="priority_np">Priority (Non-preemptive)</option>
            <option value="priority_p">Priority (Preemptive)</option>
          </select>
        </div>

        {/* Time Quantum (For Round Robin) */}
        <div className={`p-3 rounded-xl border space-y-1 transition-all ${
          selectedAlgorithm === 'rr' ? 'bg-slate-950 border-blue-500/40 shadow-sm' : 'bg-slate-950/60 border-slate-800 opacity-60'
        }`}>
          <div className="flex items-center justify-between">
            <label className="text-[10px] uppercase font-mono text-slate-400 block">
              Time Quantum (RR)
            </label>
            <span className="text-xs font-mono font-bold text-blue-400">{timeQuantum} units</span>
          </div>
          <input
            type="number"
            min="1"
            max="20"
            value={timeQuantum}
            onChange={(e) => onTimeQuantumChange(Math.max(1, Number(e.target.value)))}
            className="w-full bg-slate-900 text-xs rounded-lg px-2.5 py-1 border border-slate-700 text-white font-mono focus:outline-none"
          />
        </div>

        {/* Priority Convention */}
        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
          <label className="text-[10px] uppercase font-mono text-slate-400 block">
            Priority Convention
          </label>
          <button
            onClick={() => onTogglePriorityConvention(!lowerIsHigherPriority)}
            className="w-full bg-slate-900 hover:bg-slate-850 text-xs rounded-lg px-2.5 py-1.5 border border-slate-700 text-slate-200 font-medium text-left flex items-center justify-between"
          >
            <span>{lowerIsHigherPriority ? 'Lower # = Higher Priority' : 'Higher # = Higher Priority'}</span>
            <span className="text-[10px] font-mono text-indigo-400">Toggle</span>
          </button>
        </div>
      </div>

      {/* Process Table Inputs */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-white">Process Table (Ready to Schedule)</span>
          <button
            onClick={handleAddProcess}
            className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium flex items-center gap-1 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Process</span>
          </button>
        </div>

        <div className="overflow-x-auto bg-slate-950 rounded-xl border border-slate-800">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 bg-slate-900/60 text-left">
                <th className="py-2 px-3">PID</th>
                <th className="py-2 px-3">Name</th>
                <th className="py-2 px-3">Arrival Time (AT)</th>
                <th className="py-2 px-3">Burst Time (BT)</th>
                <th className="py-2 px-3">Priority</th>
                <th className="py-2 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {processes.map((p) => (
                <tr key={p.pid} className="hover:bg-slate-900/40">
                  <td className="py-1.5 px-3 font-bold text-white">P{p.pid}</td>
                  <td className="py-1.5 px-3">
                    <input
                      type="text"
                      value={p.name}
                      onChange={(e) => handleUpdateProcess(p.pid, 'name', e.target.value)}
                      className="w-24 bg-slate-900 text-xs px-2 py-0.5 rounded border border-slate-700 text-slate-200 focus:outline-none"
                    />
                  </td>
                  <td className="py-1.5 px-3">
                    <input
                      type="number"
                      min="0"
                      value={p.arrivalTime}
                      onChange={(e) =>
                        handleUpdateProcess(p.pid, 'arrivalTime', Math.max(0, Number(e.target.value)))
                      }
                      className="w-20 bg-slate-900 text-xs px-2 py-0.5 rounded border border-slate-700 text-slate-200 focus:outline-none font-mono"
                    />
                  </td>
                  <td className="py-1.5 px-3">
                    <input
                      type="number"
                      min="1"
                      value={p.burstTime}
                      onChange={(e) =>
                        handleUpdateProcess(p.pid, 'burstTime', Math.max(1, Number(e.target.value)))
                      }
                      className="w-20 bg-slate-900 text-xs px-2 py-0.5 rounded border border-slate-700 text-slate-200 focus:outline-none font-mono"
                    />
                  </td>
                  <td className="py-1.5 px-3">
                    <input
                      type="number"
                      min="0"
                      value={p.priority}
                      onChange={(e) =>
                        handleUpdateProcess(p.pid, 'priority', Math.max(0, Number(e.target.value)))
                      }
                      className="w-20 bg-slate-900 text-xs px-2 py-0.5 rounded border border-slate-700 text-slate-200 focus:outline-none font-mono"
                    />
                  </td>
                  <td className="py-1.5 px-3 text-right">
                    <button
                      onClick={() => handleRemoveProcess(p.pid)}
                      disabled={processes.length <= 1}
                      className="p-1 text-slate-500 hover:text-rose-400 disabled:opacity-30 transition-colors"
                      title="Remove Process"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
