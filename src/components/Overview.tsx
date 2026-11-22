import React from 'react';
import {
  Cpu,
  Layers,
  Clock,
  FileText,
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  Zap,
  ArrowRight,
  ShieldAlert,
  Server,
  Activity,
  HardDrive,
  LockKeyhole,
  Binary
} from 'lucide-react';
import { SimulationSnapshot } from '../engine/types';

interface OverviewProps {
  snapshot: SimulationSnapshot;
  onNavigateTab: (tabId: any) => void;
}

export const Overview: React.FC<OverviewProps> = ({ snapshot, onNavigateTab }) => {
  const isPhase2 = snapshot.phase === 2;

  // Calculate memory occupancy
  const allocatedWords = snapshot.memory.filter(m => m.type !== 'free').length;
  const totalWords = snapshot.memory.length;
  const memPct = Math.round((allocatedWords / totalWords) * 100);

  const ttcPct = snapshot.pcb.TTL > 0
    ? Math.min(100, Math.round((snapshot.pcb.TTC / snapshot.pcb.TTL) * 100))
    : 0;

  const llcPct = snapshot.pcb.TLL > 0
    ? Math.min(100, Math.round((snapshot.pcb.LLC / snapshot.pcb.TLL) * 100))
    : 0;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-900/40 via-indigo-900/30 to-purple-900/20 border border-blue-500/20 p-6">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                ACTIVE MODE: {isPhase2 ? 'PHASE 2 (MULTIPROGRAMMED PAGING)' : 'PHASE 1 (SEQUENTIAL BATCH)'}
              </span>
              {snapshot.isTerminated && (
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  JOB TERMINATED
                </span>
              )}
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">
              Multiprogramming Operating System (MOS)
            </h2>
            <p className="text-xs md:text-sm text-slate-300 mt-1 max-w-2xl">
              Interactive educational visualizer simulating low-level hardware registers, memory paging,
              virtual-to-physical address translation, and master mode interrupt decision tables.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => onNavigateTab('process')}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg shadow-emerald-600/25 transition-all"
            >
              <Activity className="w-4 h-4" />
              <span>Process Lifecycle</span>
            </button>
            <button
              onClick={() => onNavigateTab('scheduler')}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg shadow-indigo-600/25 transition-all"
            >
              <Clock className="w-4 h-4" />
              <span>CPU Scheduler</span>
            </button>
            <button
              onClick={() => onNavigateTab('memory')}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg shadow-purple-600/25 transition-all"
            >
              <Layers className="w-4 h-4" />
              <span>Memory & Paging</span>
            </button>
            <button
              onClick={() => onNavigateTab('simulator')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg shadow-blue-600/25 transition-all"
            >
              <Cpu className="w-4 h-4" />
              <span>MOS VM</span>
            </button>
            <button
              onClick={() => onNavigateTab('study')}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-2 border border-slate-700 transition-all"
            >
              <HelpCircle className="w-4 h-4" />
              <span>Study Guide</span>
            </button>
          </div>
        </div>
      </div>

      {/* Integrated Module Directory */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { tab: 'scheduler', icon: Clock, title: 'CPU Scheduling', text: 'FCFS, SJF, SRTF, RR & priority', color: 'text-indigo-400' },
          { tab: 'process', icon: Activity, title: 'Process Management', text: 'Lifecycle, PCB & scheduling queues', color: 'text-emerald-400' },
          { tab: 'memory', icon: Layers, title: 'Memory & Paging', text: 'Fit, replacement & virtual memory', color: 'text-purple-400' },
          { tab: 'deadlock', icon: LockKeyhole, title: 'Deadlock Management', text: 'Banker safety & request detection', color: 'text-rose-400' },
          { tab: 'disk', icon: HardDrive, title: 'Disk Scheduling', text: 'FCFS, SSTF, SCAN, LOOK & circular variants', color: 'text-cyan-400' },
          { tab: 'simulator', icon: Cpu, title: 'MOS Job Execution', text: 'Fetch/decode/execute & interrupts', color: 'text-blue-400' },
          { tab: 'interrupts', icon: AlertTriangle, title: 'Interrupt Inspector', text: 'SI, PI, TI & MOS decision matrix', color: 'text-amber-400' },
          { tab: 'study', icon: Binary, title: 'Study & Architecture', text: 'Viva guide & WebAssembly diagnostics', color: 'text-slate-300' }
        ].map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.tab}
              onClick={() => onNavigateTab(item.tab)}
              className="group text-left bg-slate-900 border border-slate-800 rounded-2xl p-4 hover:border-blue-500/50 hover:bg-slate-900/90 transition-all"
            >
              <div className="flex items-start justify-between gap-3">
                <div className={`p-2 rounded-lg bg-slate-950 border border-slate-800 ${item.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-blue-400 transition-colors" />
              </div>
              <div className="mt-3 text-sm font-semibold text-white">{item.title}</div>
              <div className="mt-1 text-[11px] leading-relaxed text-slate-400">{item.text}</div>
            </button>
          );
        })}
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Job ID & Status */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-blue-400" /> Current Job
            </span>
            <span className="font-mono text-white font-bold">
              #{String(snapshot.pcb.jobID).padStart(4, '0')}
            </span>
          </div>
          <div className="text-xl font-bold text-white font-mono">
            {snapshot.isTerminated ? (
              <span className="text-amber-400 text-base flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                {snapshot.terminationReason || 'Terminated'}
              </span>
            ) : (
              <span className="text-emerald-400 text-base flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 shrink-0" />
                Executing (Cycle {snapshot.currentCycle})
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-400">
            {isPhase2 ? 'Managed via PCB & Page Table' : 'Sequential execution in Memory'}
          </p>
        </div>

        {/* Card 2: Memory Allocation */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-400" /> Memory Occupancy
            </span>
            <span className="font-mono text-white font-bold">{memPct}%</span>
          </div>
          <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
            <div
              className="bg-indigo-500 h-full rounded-full transition-all duration-300"
              style={{ width: `${memPct}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] text-slate-400 font-mono">
            <span>{allocatedWords} allocated</span>
            <span>{totalWords} total words</span>
          </div>
        </div>

        {/* Card 3: Time Counter (TTC / TTL) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-400" /> Time Limit (TTC / TTL)
            </span>
            <span className="font-mono text-white font-bold">{ttcPct}%</span>
          </div>
          <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                ttcPct >= 100 ? 'bg-rose-500' : ttcPct > 75 ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${ttcPct}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] text-slate-400 font-mono">
            <span>TTC: {snapshot.pcb.TTC}</span>
            <span>TTL: {snapshot.pcb.TTL}</span>
          </div>
        </div>

        {/* Card 4: Line Limit (LLC / TLL) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-cyan-400" /> Line Limit (LLC / TLL)
            </span>
            <span className="font-mono text-white font-bold">{llcPct}%</span>
          </div>
          <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                llcPct >= 100 ? 'bg-rose-500' : 'bg-cyan-500'
              }`}
              style={{ width: `${llcPct}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] text-slate-400 font-mono">
            <span>LLC: {snapshot.pcb.LLC}</span>
            <span>TLL: {snapshot.pcb.TLL}</span>
          </div>
        </div>
      </div>

      {/* Main Feature Highlight Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Architectural Deep Dive */}
        <div className="lg:col-span-2 space-y-6">
          {/* Hardware & Register Status */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Cpu className="w-4 h-4 text-blue-400" />
                Live Register Bank Status
              </h3>
              <button
                onClick={() => onNavigateTab('simulator')}
                className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
              >
                Open Simulator <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block uppercase font-mono">Instruction (IR)</span>
                <span className="text-base font-bold font-mono text-blue-400">
                  {snapshot.registers.IR || '[EMPTY]'}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">Opcode + Operand</span>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block uppercase font-mono">General Reg (R)</span>
                <span className="text-base font-bold font-mono text-emerald-400">
                  {snapshot.registers.R || '[EMPTY]'}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">4-byte buffer</span>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block uppercase font-mono">Program Counter (IC)</span>
                <span className="text-base font-bold font-mono text-purple-400">
                  {String(snapshot.registers.IC).padStart(2, '0')}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">Next Instruction</span>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block uppercase font-mono">Compare Flag (C)</span>
                <span className={`text-base font-bold font-mono ${snapshot.registers.C ? 'text-cyan-400' : 'text-slate-500'}`}>
                  {snapshot.registers.C ? 'TRUE (1)' : 'FALSE (0)'}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">Branch condition</span>
              </div>
            </div>

            {isPhase2 && (
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-800/80">
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block uppercase font-mono">Page Table (PTR)</span>
                  <span className="text-base font-bold font-mono text-indigo-400">
                    Frame {snapshot.registers.PTR}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">RA: {snapshot.registers.PTR * 10}</span>
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block uppercase font-mono">Supervisor (SI)</span>
                  <span className={`text-base font-bold font-mono ${snapshot.registers.SI > 0 ? 'text-amber-400' : 'text-slate-500'}`}>
                    {snapshot.registers.SI === 0 ? '0 (None)' : snapshot.registers.SI === 1 ? '1 (Read)' : snapshot.registers.SI === 2 ? '2 (Write)' : '3 (Halt)'}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">System calls</span>
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block uppercase font-mono">Program (PI)</span>
                  <span className={`text-base font-bold font-mono ${snapshot.registers.PI > 0 ? 'text-rose-400' : 'text-slate-500'}`}>
                    {snapshot.registers.PI === 0 ? '0 (None)' : snapshot.registers.PI === 1 ? '1 (Opcode)' : snapshot.registers.PI === 2 ? '2 (Operand)' : '3 (Page Fault)'}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">Trap / Exceptions</span>
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block uppercase font-mono">Timer (TI)</span>
                  <span className={`text-base font-bold font-mono ${snapshot.registers.TI > 0 ? 'text-rose-400' : 'text-slate-500'}`}>
                    {snapshot.registers.TI === 2 ? '2 (Time Exceeded)' : '0 (OK)'}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">Hardware clock</span>
                </div>
              </div>
            )}
          </div>

          {/* Phase Comparison Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              Phase 1 vs Phase 2 Architectural Comparison
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <div className="font-semibold text-blue-400 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-400" />
                  Phase 1 (Basic Job Processing)
                </div>
                <ul className="space-y-1.5 text-slate-300">
                  <li>• <strong>Sequential Loading:</strong> Direct 1-to-1 mapping into M[100][4].</li>
                  <li>• <strong>No Time/Line Limits:</strong> Jobs can run indefinitely.</li>
                  <li>• <strong>Single Interrupt:</strong> Only Supervisor Interrupt (SI 1=Read, 2=Write, 3=Halt).</li>
                  <li>• <strong>Simple VM:</strong> No address translation, contiguous memory layout.</li>
                </ul>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <div className="font-semibold text-indigo-400 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-indigo-400" />
                  Phase 2 (Paging & Multiprogramming)
                </div>
                <ul className="space-y-1.5 text-slate-300">
                  <li>• <strong>Paging System:</strong> 300 words divided into 30 non-contiguous blocks of 10 words.</li>
                  <li>• <strong>Virtual Address Mapping:</strong> VA (00-99) translated to RA via Page Table (PTR).</li>
                  <li>• <strong>Demand Paging:</strong> Valid page fault on GD/SR dynamically allocates frame & resumes.</li>
                  <li>• <strong>Full Interrupt Matrix:</strong> SI (1,2,3), PI (1,2,3), and TI (0,2) decision table.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: Quick Tools & Instruction Reference */}
        <div className="space-y-6">
          {/* Quick Address Translator Preview */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                Address Translation
              </h3>
              <button
                onClick={() => onNavigateTab('calculator')}
                className="text-xs text-cyan-400 hover:text-cyan-300"
              >
                Open Calculator →
              </button>
            </div>
            <p className="text-xs text-slate-400">
              In Phase 2, instructions refer to Virtual Addresses (0-99). The MMU maps them:
            </p>
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono text-xs space-y-1 text-slate-300">
              <div className="text-blue-400 font-semibold">pageNum = VA / 10</div>
              <div className="text-blue-400 font-semibold">offset = VA % 10</div>
              <div className="text-purple-400 font-semibold">PTE = Memory[PTR * 10 + pageNum]</div>
              <div className="text-emerald-400 font-semibold">RA = (frame * 10) + offset</div>
            </div>
          </div>

          {/* Instruction Set Quick Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-400" />
              MOS Instruction Set
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950 border border-slate-800">
                <span className="font-mono font-bold text-blue-400">GDXX</span>
                <span className="text-slate-300">Get Data into memory address XX</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950 border border-slate-800">
                <span className="font-mono font-bold text-blue-400">PDXX</span>
                <span className="text-slate-300">Put Data from memory to output</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950 border border-slate-800">
                <span className="font-mono font-bold text-blue-400">LRXX</span>
                <span className="text-slate-300">Load word at XX into Register R</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950 border border-slate-800">
                <span className="font-mono font-bold text-blue-400">SRXX</span>
                <span className="text-slate-300">Store word from R into address XX</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950 border border-slate-800">
                <span className="font-mono font-bold text-blue-400">CRXX</span>
                <span className="text-slate-300">Compare R with memory XX (sets C)</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950 border border-slate-800">
                <span className="font-mono font-bold text-blue-400">BTXX</span>
                <span className="text-slate-300">Branch to XX if C flag is true</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950 border border-slate-800">
                <span className="font-mono font-bold text-rose-400">H</span>
                <span className="text-slate-300">Halt program execution (SI=3)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
