import React, { useState, useEffect, useRef } from 'react';
import {
  Layers,
  Cpu,
  Play,
  Pause,
  RotateCcw,
  StepForward,
  Plus,
  ArrowRight,
  ShieldAlert,
  Clock,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Sliders,
  Terminal,
  Activity,
  Zap,
  Repeat
} from 'lucide-react';
import { ProcessManagerEngine } from '../../engine/processManagerEngine';
import { ProcessManagerSnapshot, PCBData, ProcessState } from '../../engine/processManagerTypes';
import { StateDiagramVisualizer } from './StateDiagramVisualizer';
import { QueuePanels } from './QueuePanels';
import { PCBDetailModal } from './PCBDetailModal';

export const ProcessManagerDashboard: React.FC = () => {
  const engineRef = useRef<ProcessManagerEngine>(new ProcessManagerEngine(1, 'RR', 2));
  const [snapshot, setSnapshot] = useState<ProcessManagerSnapshot>(() =>
    engineRef.current.getSnapshot()
  );

  // Inspector & filter
  const [selectedPCB, setSelectedPCB] = useState<PCBData | null>(null);
  const [stateFilter, setStateFilter] = useState<ProcessState | 'ALL'>('ALL');
  const [lastTrigger, setLastTrigger] = useState<string>('Initialization');

  // Playback
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [speed, setSpeed] = useState<number>(500);
  const timerRef = useRef<any>(null);

  // New process form
  const [newProcName, setNewProcName] = useState('P1');
  const [newProcBurst, setNewProcBurst] = useState(5);
  const [newProcPriority, setNewProcPriority] = useState(2);

  // Context Switch Overhead & Policy
  const [csOverhead, setCsOverhead] = useState<number>(1);
  const [policy, setPolicy] = useState<'FCFS' | 'RR' | 'PRIORITY' | 'SJF'>('RR');
  const [tq, setTq] = useState<number>(2);

  const syncSnapshot = (triggerName?: string) => {
    setSnapshot(engineRef.current.getSnapshot());
    if (triggerName) setLastTrigger(triggerName);
  };

  // Seed default processes on mount
  useEffect(() => {
    engineRef.current.createProcess('P1', 6, 2);
    engineRef.current.createProcess('P2', 4, 1);
    engineRef.current.createProcess('P3', 8, 3);
    engineRef.current.admitProcess(1);
    engineRef.current.admitProcess(2);
    engineRef.current.admitProcess(3);
    engineRef.current.dispatchProcess();
    syncSnapshot('Ready for Simulation');
  }, []);

  // Step
  const handleStep = () => {
    engineRef.current.step();
    syncSnapshot('Clock Tick (+1)');
  };

  // Play / Pause
  const handleTogglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        engineRef.current.step();
        setSnapshot(engineRef.current.getSnapshot());
      }, speed);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, speed]);

  // Reset
  const handleReset = () => {
    setIsPlaying(false);
    engineRef.current.reset();
    engineRef.current.createProcess('P1', 6, 2);
    engineRef.current.createProcess('P2', 4, 1);
    engineRef.current.createProcess('P3', 8, 3);
    engineRef.current.admitProcess(1);
    engineRef.current.admitProcess(2);
    engineRef.current.admitProcess(3);
    engineRef.current.dispatchProcess();
    syncSnapshot('Reset Simulation');
  };

  // Process operations
  const handleCreateProcess = () => {
    const pid = engineRef.current.createProcess(newProcName, newProcBurst, newProcPriority);
    setNewProcName(`P${pid + 1}`);
    syncSnapshot(`Created Process #${pid}`);
  };

  const handleAdmitAllNew = () => {
    snapshot.newQueue.forEach((pid) => engineRef.current.admitProcess(pid));
    syncSnapshot('Admitted All New Processes');
  };

  const handleDispatch = (pid?: number) => {
    engineRef.current.dispatchProcess(pid);
    syncSnapshot('Dispatched Process');
  };

  const handlePreempt = () => {
    engineRef.current.preemptProcess('Manual User Preemption');
    syncSnapshot('Preempted Running Process');
  };

  const handleBlock = (reason: string = 'Disk Read I/O (SI=1)') => {
    engineRef.current.blockProcess(reason, 3);
    syncSnapshot('Blocked on I/O');
  };

  const handleUnblock = (pid: number) => {
    engineRef.current.unblockProcess(pid);
    syncSnapshot(`Unblocked Process #${pid}`);
  };

  const handleTerminate = (pid?: number) => {
    engineRef.current.terminateProcess(pid, 'Manual User Termination');
    syncSnapshot('Terminated Process');
  };

  // Context Switch Overhead update
  const handleCsOverheadChange = (val: number) => {
    setCsOverhead(val);
    engineRef.current.setContextSwitchOverhead(val);
    syncSnapshot('Updated Context Switch Overhead');
  };

  // Policy update
  const handlePolicyChange = (newPolicy: 'FCFS' | 'RR' | 'PRIORITY' | 'SJF') => {
    setPolicy(newPolicy);
    engineRef.current.setSchedulingPolicy(newPolicy, tq);
    syncSnapshot(`Policy Changed to ${newPolicy}`);
  };

  const runningPCB = snapshot.allProcesses.find((p) => p.pid === snapshot.runningPid);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-400" />
              Interactive Process Management &amp; State Transition Simulator
            </h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-mono bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              Clock: t = {snapshot.currentTime}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Simulate complete process lifecycles: admission, ready queue scheduling, CPU dispatching, context switching, and I/O blocking.
          </p>
        </div>

        {/* Global Controls */}
        <div className="flex items-center gap-2">
          {/* Speed */}
          <div className="flex items-center gap-1.5 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800 text-xs">
            <span className="text-slate-400 text-[10px]">Speed:</span>
            <input
              type="range"
              min="100"
              max="1200"
              step="50"
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
              className="w-16 accent-indigo-500 h-1.5 cursor-pointer"
            />
            <span className="font-mono text-indigo-400 text-[10px] w-9 text-right">{speed}ms</span>
          </div>

          <button
            onClick={handleTogglePlay}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              isPlaying
                ? 'bg-amber-600 hover:bg-amber-500 text-white'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
            }`}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isPlaying ? 'Pause' : 'Play'}</span>
          </button>

          <button
            onClick={handleStep}
            disabled={isPlaying}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-all disabled:opacity-40"
          >
            <StepForward className="w-3.5 h-3.5" />
            <span>Step</span>
          </button>

          <button
            onClick={handleReset}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition-all"
            title="Reset Simulation"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* CPU State & Context Switching Banner */}
      <div className={`p-4 rounded-2xl border transition-all ${
        snapshot.isContextSwitching
          ? 'bg-amber-950/30 border-amber-500/50 shadow-lg shadow-amber-900/10'
          : snapshot.runningPid !== -1
          ? 'bg-blue-950/30 border-blue-500/40 shadow-lg shadow-blue-900/10'
          : 'bg-slate-900 border-slate-800'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono text-xs">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
              snapshot.isContextSwitching
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse'
                : snapshot.runningPid !== -1
                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                : 'bg-slate-800 text-slate-400'
            }`}>
              <Cpu className="w-5 h-5" />
            </div>

            <div>
              <div className="text-[10px] uppercase text-slate-400 font-sans font-semibold">
                CPU Hardware Core Status
              </div>
              <div className="text-base font-bold text-white flex items-center gap-2">
                {snapshot.isContextSwitching ? (
                  <span className="text-amber-400 flex items-center gap-1.5 font-sans">
                    <Repeat className="w-4 h-4 animate-spin" />
                    Context Switching ({snapshot.contextSwitchTimeRemaining}u remaining)
                  </span>
                ) : snapshot.runningPid !== -1 ? (
                  <span className="text-blue-400">
                    Executing {runningPCB?.name} (PID: {runningPCB?.pid})
                  </span>
                ) : (
                  <span className="text-slate-500">CPU IDLE (No process running)</span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-4 text-slate-400">
            <div>
              <span>Context Switches: </span>
              <strong className="text-indigo-400">{snapshot.totalContextSwitches}</strong>
            </div>
            <div>
              <span>CPU Busy: </span>
              <strong className="text-emerald-400">{snapshot.totalCpuBusyTime}u</strong>
            </div>
            <div>
              <span>CPU Idle: </span>
              <strong className="text-slate-300">{snapshot.totalCpuIdleTime}u</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Manual Action Bar & OS Configuration */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 text-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            <span className="font-semibold text-white">Manual OS State Triggers</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {snapshot.newQueue.length > 0 && (
              <button
                onClick={handleAdmitAllNew}
                className="px-2.5 py-1 rounded-lg bg-blue-600/30 text-blue-300 border border-blue-500/40 hover:bg-blue-600/40 font-medium font-sans"
              >
                Admit New ({snapshot.newQueue.length})
              </button>
            )}

            <button
              onClick={() => handleDispatch()}
              disabled={snapshot.readyQueue.length === 0}
              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium font-sans disabled:opacity-40"
            >
              Dispatch Next
            </button>

            <button
              onClick={() => handleBlock('Disk Read (SI=1)')}
              disabled={snapshot.runningPid === -1}
              className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-medium font-sans disabled:opacity-40"
            >
              Block (I/O Wait)
            </button>

            <button
              onClick={handlePreempt}
              disabled={snapshot.runningPid === -1}
              className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium font-sans disabled:opacity-40"
            >
              Preempt
            </button>

            <button
              onClick={() => handleTerminate()}
              disabled={snapshot.runningPid === -1}
              className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-medium font-sans disabled:opacity-40"
            >
              Terminate
            </button>
          </div>
        </div>

        {/* Configuration Row: CS Overhead & Policy */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono">
          <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between">
            <span className="text-slate-400 text-[11px]">Context Switch Overhead:</span>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min="0"
                max="5"
                value={csOverhead}
                onChange={(e) => handleCsOverheadChange(Math.max(0, Number(e.target.value)))}
                className="w-12 bg-slate-900 text-center rounded border border-slate-700 py-0.5 text-white font-bold"
              />
              <span className="text-slate-500 text-[10px]">ticks</span>
            </div>
          </div>

          <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between">
            <span className="text-slate-400 text-[11px]">Scheduler Policy:</span>
            <select
              value={policy}
              onChange={(e) => handlePolicyChange(e.target.value as any)}
              className="bg-slate-900 text-xs px-2 py-0.5 rounded border border-slate-700 text-white font-bold focus:outline-none"
            >
              <option value="RR">Round Robin (RR)</option>
              <option value="FCFS">First Come First Serve</option>
              <option value="PRIORITY">Priority</option>
              <option value="SJF">Shortest Job First</option>
            </select>
          </div>

          <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between">
            <span className="text-slate-400 text-[11px]">Time Quantum (RR):</span>
            <input
              type="number"
              min="1"
              max="10"
              value={tq}
              onChange={(e) => {
                const val = Math.max(1, Number(e.target.value));
                setTq(val);
                engineRef.current.setSchedulingPolicy(policy, val);
                syncSnapshot();
              }}
              className="w-12 bg-slate-900 text-center rounded border border-slate-700 py-0.5 text-white font-bold"
            />
          </div>
        </div>
      </div>

      {/* State Diagram */}
      <StateDiagramVisualizer
        allProcesses={snapshot.allProcesses}
        selectedStateFilter={stateFilter}
        onSelectStateFilter={setStateFilter}
        onInspectProcess={setSelectedPCB}
        lastTrigger={lastTrigger}
      />

      {/* Queue Panels (Ready & Waiting) */}
      <QueuePanels
        allProcesses={snapshot.allProcesses}
        readyQueueIds={snapshot.readyQueue}
        waitingQueueIds={snapshot.waitingQueue}
        newQueueIds={snapshot.newQueue}
        terminatedQueueIds={snapshot.terminatedQueue}
        runningPid={snapshot.runningPid}
        onInspectProcess={setSelectedPCB}
        onAdmitProcess={(pid) => {
          engineRef.current.admitProcess(pid);
          syncSnapshot();
        }}
        onUnblockProcess={handleUnblock}
        onTerminateProcess={handleTerminate}
        onDispatchProcess={handleDispatch}
      />

      {/* Process Table & Creator */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <span>Process Control Blocks (All Processes)</span>
            <span className="text-xs font-mono text-slate-400">
              ({snapshot.allProcesses.length} total)
            </span>
          </h3>

          {/* Quick Create Inline */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Name"
              value={newProcName}
              onChange={(e) => setNewProcName(e.target.value)}
              className="w-20 bg-slate-950 text-xs px-2 py-1 rounded border border-slate-800 text-white font-mono"
            />
            <input
              type="number"
              min="1"
              placeholder="Burst"
              value={newProcBurst}
              onChange={(e) => setNewProcBurst(Math.max(1, Number(e.target.value)))}
              className="w-16 bg-slate-950 text-xs px-2 py-1 rounded border border-slate-800 text-white font-mono"
              title="Burst Time"
            />
            <input
              type="number"
              min="0"
              placeholder="Priority"
              value={newProcPriority}
              onChange={(e) => setNewProcPriority(Math.max(0, Number(e.target.value)))}
              className="w-16 bg-slate-950 text-xs px-2 py-1 rounded border border-slate-800 text-white font-mono"
              title="Priority"
            />
            <button
              onClick={handleCreateProcess}
              className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium flex items-center gap-1 font-sans transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create</span>
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto bg-slate-950 rounded-xl border border-slate-800">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 bg-slate-900/60 text-left">
                <th className="py-2.5 px-3">PID</th>
                <th className="py-2.5 px-3">Name</th>
                <th className="py-2.5 px-3">State</th>
                <th className="py-2.5 px-3">Burst</th>
                <th className="py-2.5 px-3">Remaining</th>
                <th className="py-2.5 px-3">Priority</th>
                <th className="py-2.5 px-3">PC</th>
                <th className="py-2.5 px-3">IR</th>
                <th className="py-2.5 px-3">Context Switches</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {snapshot.allProcesses
                .filter((p) => stateFilter === 'ALL' || p.state === stateFilter)
                .map((pcb) => (
                  <tr key={pcb.pid} className="hover:bg-slate-900/40 text-slate-300">
                    <td className="py-2 px-3 font-bold text-white">#{pcb.pid}</td>
                    <td className="py-2 px-3 font-semibold text-slate-200">{pcb.name}</td>
                    <td className="py-2 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        pcb.state === 'RUNNING'
                          ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                          : pcb.state === 'READY'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : pcb.state === 'WAITING'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : pcb.state === 'NEW'
                          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                          : 'bg-slate-800 text-slate-400'
                      }`}>
                        {pcb.state}
                      </span>
                    </td>
                    <td className="py-2 px-3">{pcb.burstTime}u</td>
                    <td className="py-2 px-3 font-bold text-emerald-400">{pcb.remainingTime}u</td>
                    <td className="py-2 px-3">{pcb.priority}</td>
                    <td className="py-2 px-3 text-purple-400 font-bold">{pcb.registers.PC}</td>
                    <td className="py-2 px-3 text-blue-400">{pcb.registers.IR}</td>
                    <td className="py-2 px-3">{pcb.contextSwitches}</td>
                    <td className="py-2 px-3 text-right">
                      <button
                        onClick={() => setSelectedPCB(pcb)}
                        className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-sans transition-colors"
                      >
                        Inspect PCB
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* PCB Modal */}
      <PCBDetailModal pcb={selectedPCB} onClose={() => setSelectedPCB(null)} />
    </div>
  );
};
