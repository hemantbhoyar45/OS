import React, { useRef, useEffect } from 'react';
import {
  Cpu,
  ArrowRight,
  RotateCcw,
  Play,
  Pause,
  StepForward,
  Terminal,
  Activity,
  Layers,
  ShieldAlert,
  Clock,
  Sparkles
} from 'lucide-react';
import { SimulationSnapshot } from '../engine/types';

interface InteractiveSimulatorProps {
  snapshot: SimulationSnapshot;
  isRunning: boolean;
  onTogglePlay: () => void;
  onStep: () => void;
  onReset: () => void;
}

export const InteractiveSimulator: React.FC<InteractiveSimulatorProps> = ({
  snapshot,
  isRunning,
  onTogglePlay,
  onStep,
  onReset
}) => {
  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [snapshot.logs]);

  const isPhase2 = snapshot.phase === 2;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner with Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Cpu className="w-5 h-5 text-blue-400" />
              Instruction Cycle & Live CPU Simulation
            </h2>
            <span className="text-xs px-2 py-0.5 rounded-full font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20">
              Cycle #{snapshot.currentCycle}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Observe the Fetch-Decode-Translate-Execute pipeline in real-time.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onTogglePlay}
            disabled={snapshot.isTerminated}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg transition-all ${
              isRunning
                ? 'bg-amber-600 hover:bg-amber-500 text-white'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-40 disabled:cursor-not-allowed'
            }`}
          >
            {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            <span>{isRunning ? 'Pause CPU' : 'Start Execution'}</span>
          </button>

          <button
            onClick={onStep}
            disabled={isRunning || snapshot.isTerminated}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-2 border border-slate-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <StepForward className="w-4 h-4" />
            <span>Single Step</span>
          </button>

          <button
            onClick={onReset}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition-all"
            title="Reset CPU"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* CPU Pipeline Visualizer */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-400" />
          CPU Pipeline Stages
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {/* Step 1: Fetch */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <span className="text-[10px] uppercase font-mono font-bold text-blue-400">1. Fetch</span>
            <div className="font-mono text-sm text-white">
              IC: <span className="text-purple-400 font-bold">{String(snapshot.registers.IC).padStart(2, '0')}</span>
            </div>
            <p className="text-[11px] text-slate-400">
              {isPhase2 ? `Maps IC to RA via Page Table (PTR=${snapshot.registers.PTR})` : 'Fetches from M[IC]'}
            </p>
          </div>

          {/* Step 2: Decode */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <span className="text-[10px] uppercase font-mono font-bold text-indigo-400">2. Decode</span>
            <div className="font-mono text-sm text-white">
              Op: <span className="text-indigo-400 font-bold">{snapshot.lastDecodedOpcode || 'None'}</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Validates opcode in [LR, SR, CR, BT, GD, PD, H]
            </p>
          </div>

          {/* Step 3: Address Translate */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <span className="text-[10px] uppercase font-mono font-bold text-cyan-400">3. Translate</span>
            <div className="font-mono text-sm text-white">
              VA: <span className="text-cyan-400 font-bold">{snapshot.lastOperandVA !== undefined ? snapshot.lastOperandVA : '--'}</span>
              {snapshot.lastOperandRA !== undefined && (
                <span className="text-slate-400 text-xs"> → RA:{snapshot.lastOperandRA}</span>
              )}
            </div>
            <p className="text-[11px] text-slate-400">
              {isPhase2 ? 'MMU checks PTE: valid or page fault' : 'Direct mapping (VA = RA)'}
            </p>
          </div>

          {/* Step 4: Execute */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <span className="text-[10px] uppercase font-mono font-bold text-emerald-400">4. Execute</span>
            <div className="font-mono text-sm text-white truncate">
              IR: <span className="text-emerald-400 font-bold">{snapshot.registers.IR || '----'}</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Manipulates R, Memory, or triggers I/O
            </p>
          </div>

          {/* Step 5: Interrupt Check */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <span className="text-[10px] uppercase font-mono font-bold text-amber-400">5. Interrupt Check</span>
            <div className="font-mono text-sm text-white">
              SI:{snapshot.registers.SI} PI:{snapshot.registers.PI} TI:{snapshot.registers.TI}
            </div>
            <p className="text-[11px] text-slate-400">
              Consults MOS Decision Table if flag set
            </p>
          </div>
        </div>
      </div>

      {/* Main Split: Register Inspector + Execution Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Col: Registers & PCB (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Hardware Registers */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-white flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-blue-400" />
                Hardware Registers
              </span>
              <span className="text-[11px] font-mono text-slate-400">4-byte Words</span>
            </h3>

            <div className="space-y-3 font-mono text-xs">
              {/* IR */}
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Instruction Register (IR)</span>
                  <div className="flex gap-1 mt-1">
                    {Array.from(snapshot.registers.IR.padEnd(4, ' ')).map((ch, idx) => (
                      <span
                        key={idx}
                        className="w-7 h-7 flex items-center justify-center rounded bg-slate-900 border border-slate-700 text-blue-400 font-bold"
                      >
                        {ch === ' ' ? '·' : ch}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400">Opcode / Operand</span>
                  <div className="text-xs font-bold text-blue-400">
                    {snapshot.registers.IR.substring(0, 2)} / {snapshot.registers.IR.substring(2, 4)}
                  </div>
                </div>
              </div>

              {/* R */}
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">General Register (R)</span>
                  <div className="flex gap-1 mt-1">
                    {Array.from(snapshot.registers.R.padEnd(4, ' ')).map((ch, idx) => (
                      <span
                        key={idx}
                        className="w-7 h-7 flex items-center justify-center rounded bg-slate-900 border border-slate-700 text-emerald-400 font-bold"
                      >
                        {ch === ' ' ? '·' : ch}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400">Accumulator / Reg</span>
                  <div className="text-xs font-bold text-emerald-400">
                    "{snapshot.registers.R.trim() || 'EMPTY'}"
                  </div>
                </div>
              </div>

              {/* IC, C, PTR */}
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
                  <span className="text-slate-400 block text-[10px] uppercase">IC</span>
                  <span className="text-lg font-bold text-purple-400 font-mono">
                    {String(snapshot.registers.IC).padStart(2, '0')}
                  </span>
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
                  <span className="text-slate-400 block text-[10px] uppercase">C Flag</span>
                  <span className={`text-lg font-bold font-mono ${snapshot.registers.C ? 'text-cyan-400' : 'text-slate-600'}`}>
                    {snapshot.registers.C ? 'TRUE' : 'FALSE'}
                  </span>
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
                  <span className="text-slate-400 block text-[10px] uppercase">PTR Frame</span>
                  <span className="text-lg font-bold text-indigo-400 font-mono">
                    {isPhase2 ? snapshot.registers.PTR : 'N/A'}
                  </span>
                </div>
              </div>

              {/* Interrupts */}
              <div className="grid grid-cols-3 gap-2">
                <div className={`p-3 rounded-xl border text-center ${
                  snapshot.registers.SI > 0 ? 'bg-amber-500/10 border-amber-500/30' : 'bg-slate-950 border-slate-800'
                }`}>
                  <span className="text-slate-400 block text-[10px] uppercase">SI</span>
                  <span className={`text-base font-bold font-mono ${
                    snapshot.registers.SI > 0 ? 'text-amber-400' : 'text-slate-500'
                  }`}>
                    {snapshot.registers.SI}
                  </span>
                </div>

                <div className={`p-3 rounded-xl border text-center ${
                  snapshot.registers.PI > 0 ? 'bg-rose-500/10 border-rose-500/30' : 'bg-slate-950 border-slate-800'
                }`}>
                  <span className="text-slate-400 block text-[10px] uppercase">PI</span>
                  <span className={`text-base font-bold font-mono ${
                    snapshot.registers.PI > 0 ? 'text-rose-400' : 'text-slate-500'
                  }`}>
                    {snapshot.registers.PI}
                  </span>
                </div>

                <div className={`p-3 rounded-xl border text-center ${
                  snapshot.registers.TI > 0 ? 'bg-rose-500/10 border-rose-500/30' : 'bg-slate-950 border-slate-800'
                }`}>
                  <span className="text-slate-400 block text-[10px] uppercase">TI</span>
                  <span className={`text-base font-bold font-mono ${
                    snapshot.registers.TI > 0 ? 'text-rose-400' : 'text-slate-500'
                  }`}>
                    {snapshot.registers.TI}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* PCB Panel (Phase 2) */}
          {isPhase2 && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 font-mono text-xs">
              <h3 className="text-sm font-semibold text-white flex items-center justify-between font-sans">
                <span className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-indigo-400" />
                  Process Control Block (PCB)
                </span>
                <span className="text-slate-400 text-xs">Job #{snapshot.pcb.jobID}</span>
              </h3>

              <div className="grid grid-cols-2 gap-2 text-slate-300">
                <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                  <span className="text-slate-400 text-[10px] block">Total Time Limit (TTL)</span>
                  <span className="text-white font-bold">{snapshot.pcb.TTL} instructions</span>
                </div>
                <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                  <span className="text-slate-400 text-[10px] block">Time Counter (TTC)</span>
                  <span className={`font-bold ${snapshot.pcb.TTC >= snapshot.pcb.TTL ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {snapshot.pcb.TTC} units
                  </span>
                </div>
                <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                  <span className="text-slate-400 text-[10px] block">Total Line Limit (TLL)</span>
                  <span className="text-white font-bold">{snapshot.pcb.TLL} lines</span>
                </div>
                <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                  <span className="text-slate-400 text-[10px] block">Line Counter (LLC)</span>
                  <span className={`font-bold ${snapshot.pcb.LLC > snapshot.pcb.TLL ? 'text-rose-400' : 'text-cyan-400'}`}>
                    {snapshot.pcb.LLC} written
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Col: Live Execution Logs (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-400" />
              Live Simulation Event Trace
            </h3>
            <span className="text-xs text-slate-400 font-mono">
              {snapshot.logs.length} events logged
            </span>
          </div>

          <div
            ref={logContainerRef}
            className="flex-1 bg-slate-950 rounded-xl p-4 font-mono text-xs border border-slate-800 overflow-y-auto max-h-[460px] space-y-1.5"
          >
            {snapshot.logs.length === 0 ? (
              <div className="text-slate-500 text-center py-10 italic">
                No events recorded. Click "Start Execution" or "Single Step".
              </div>
            ) : (
              snapshot.logs.map((log) => {
                const badgeColor =
                  log.level === 'error'
                    ? 'text-rose-400 bg-rose-500/10 border-rose-500/20'
                    : log.level === 'warn'
                    ? 'text-amber-400 bg-amber-500/10 border-amber-500/20'
                    : log.level === 'success'
                    ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                    : 'text-blue-400 bg-blue-500/10 border-blue-500/20';

                return (
                  <div key={log.id} className="flex items-start gap-2 py-0.5 hover:bg-slate-900/60 rounded px-1">
                    <span className="text-slate-500 text-[10px] shrink-0">{log.timestamp}</span>
                    <span className={`px-1.5 py-0.2 rounded text-[10px] font-semibold border shrink-0 ${badgeColor}`}>
                      {log.category}
                    </span>
                    <span className="text-slate-200 break-words leading-relaxed">{log.message}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
