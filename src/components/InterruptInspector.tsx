import React from 'react';
import {
  AlertTriangle,
  ShieldAlert,
  HelpCircle,
  CheckCircle2,
  XCircle,
  ArrowRight
} from 'lucide-react';
import { SimulationSnapshot } from '../engine/types';

interface InterruptInspectorProps {
  snapshot: SimulationSnapshot;
}

export const InterruptInspector: React.FC<InterruptInspectorProps> = ({ snapshot }) => {
  const isPhase2 = snapshot.phase === 2;

  const decisionTableData = [
    {
      ti: 0,
      si: 1,
      pi: 0,
      action: 'READ()',
      description: 'Fetch next input data card into memory at mapped address. Resets SI=0.'
    },
    {
      ti: 0,
      si: 2,
      pi: 0,
      action: 'WRITE()',
      description: 'Write 10 words from mapped address to output file. Increments LLC. If LLC > TLL -> Terminate(2).'
    },
    {
      ti: 0,
      si: 3,
      pi: 0,
      action: 'TERMINATE(0)',
      description: 'Normal termination (Halt). Emits "NO ERROR" in final job report.'
    },
    {
      ti: 0,
      si: 0,
      pi: 1,
      action: 'TERMINATE(4)',
      description: 'Operation Code Error. Instruction opcode was not one of [LR, SR, CR, BT, GD, PD, H].'
    },
    {
      ti: 0,
      si: 0,
      pi: 2,
      action: 'TERMINATE(5)',
      description: 'Operand Error. Address was not 2 numeric digits or outside 00-99 bounds.'
    },
    {
      ti: 0,
      si: 0,
      pi: 3,
      action: 'Demand Paging OR TERMINATE(6)',
      description: 'Page Fault. If instruction is GD or SR: Valid page fault -> Allocate frame, update PTE, decrement IC to re-execute. If other: Invalid Page Fault -> Terminate(6).'
    },
    {
      ti: 2,
      si: 1,
      pi: 0,
      action: 'TERMINATE(3)',
      description: 'Time Limit Exceeded before Read could complete.'
    },
    {
      ti: 2,
      si: 2,
      pi: 0,
      action: 'WRITE() then TERMINATE(3)',
      description: 'Writes last output line before terminating due to Time Limit Exceeded.'
    },
    {
      ti: 2,
      si: 3,
      pi: 0,
      action: 'TERMINATE(0)',
      description: 'Job finished on exact cycle time expired. Terminate normally.'
    },
    {
      ti: 2,
      si: 0,
      pi: 1,
      action: 'TERMINATE(3, 4)',
      description: 'Dual Error: Time Limit Exceeded + Operation Code Error.'
    },
    {
      ti: 2,
      si: 0,
      pi: 2,
      action: 'TERMINATE(3, 5)',
      description: 'Dual Error: Time Limit Exceeded + Operand Error.'
    },
    {
      ti: 2,
      si: 0,
      pi: 3,
      action: 'TERMINATE(3)',
      description: 'Time Limit Exceeded overrides Page Fault.'
    }
  ];

  const errorCodes = [
    { code: 0, name: 'NO ERROR', desc: 'Program halted normally via H instruction.' },
    { code: 1, name: 'OUT OF DATA', desc: 'Attempted to read beyond data cards or encountered premature $END.' },
    { code: 2, name: 'LINE LIMIT EXCEEDED', desc: 'Job output lines (LLC) exceeded the configured TLL limit.' },
    { code: 3, name: 'TIME LIMIT EXCEEDED', desc: 'Job execution time (TTC) reached or exceeded configured TTL limit.' },
    { code: 4, name: 'OPERATION CODE ERROR', desc: 'Encountered unrecognized 2-character opcode in IR.' },
    { code: 5, name: 'OPERAND ERROR', desc: 'Operand is not valid 2-digit number or outside memory bounds.' },
    { code: 6, name: 'INVALID PAGE FAULT', desc: 'Attempted to read/write from unallocated virtual page without GD/SR.' }
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              Master Operating Subroutine (MOS) Decision Table
            </h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-mono bg-amber-500/10 text-amber-400 border border-amber-500/20">
              Interrupt Handler
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Visual inspection of the exact decision table used by <code>os_phase2.cpp</code> to resolve hardware interrupts.
          </p>
        </div>

        {/* Live status */}
        <div className="flex items-center gap-3 font-mono text-xs">
          <div className={`px-3 py-1.5 rounded-xl border ${
            snapshot.registers.SI > 0 ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-slate-950 text-slate-400 border-slate-800'
          }`}>
            SI: {snapshot.registers.SI}
          </div>
          <div className={`px-3 py-1.5 rounded-xl border ${
            snapshot.registers.PI > 0 ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' : 'bg-slate-950 text-slate-400 border-slate-800'
          }`}>
            PI: {snapshot.registers.PI}
          </div>
          <div className={`px-3 py-1.5 rounded-xl border ${
            snapshot.registers.TI > 0 ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' : 'bg-slate-950 text-slate-400 border-slate-800'
          }`}>
            TI: {snapshot.registers.TI}
          </div>
        </div>
      </div>

      {/* Decision Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            Interrupt Decision Matrix (TI × SI × PI)
          </h3>
          <span className="text-xs text-slate-400">Evaluated on every CPU step</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-left">
                <th className="py-2.5 px-3">TI (Timer)</th>
                <th className="py-2.5 px-3">SI (Supervisor)</th>
                <th className="py-2.5 px-3">PI (Program)</th>
                <th className="py-2.5 px-3">Subroutine Action</th>
                <th className="py-2.5 px-3 font-sans">Behavior & Specification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {decisionTableData.map((row, idx) => {
                const isCurrentMatch =
                  snapshot.registers.TI === row.ti &&
                  (row.si === 0 || snapshot.registers.SI === row.si) &&
                  (row.pi === 0 || snapshot.registers.PI === row.pi) &&
                  (snapshot.registers.SI > 0 || snapshot.registers.PI > 0 || snapshot.registers.TI > 0);

                return (
                  <tr
                    key={idx}
                    className={`transition-colors ${
                      isCurrentMatch
                        ? 'bg-amber-500/20 text-amber-300 font-bold'
                        : 'hover:bg-slate-800/40 text-slate-300'
                    }`}
                  >
                    <td className="py-2.5 px-3">
                      <span className={`px-1.5 py-0.5 rounded ${row.ti === 2 ? 'bg-rose-500/20 text-rose-300' : 'text-slate-400'}`}>
                        TI={row.ti}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={row.si > 0 ? 'text-amber-400 font-bold' : 'text-slate-500'}>
                        {row.si > 0 ? `SI=${row.si}` : '-'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={row.pi > 0 ? 'text-rose-400 font-bold' : 'text-slate-500'}>
                        {row.pi > 0 ? `PI=${row.pi}` : '-'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-bold text-cyan-300">
                      {row.action}
                    </td>
                    <td className="py-2.5 px-3 font-sans text-slate-300 text-[11px]">
                      {row.description}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Error Codes Reference */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-blue-400" />
          MOS Error Messages & Codes Specification
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
          {errorCodes.map((err) => (
            <div key={err.code} className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-amber-400">Code {err.code}</span>
                <span className="text-[10px] uppercase font-bold text-slate-500 font-mono">
                  EM={err.code}
                </span>
              </div>
              <div className="font-semibold text-white">{err.name}</div>
              <p className="text-[11px] text-slate-400 leading-relaxed font-sans">{err.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
