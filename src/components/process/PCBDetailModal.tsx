import React from 'react';
import { PCBData } from '../../engine/processManagerTypes';
import { Cpu, Layers, Clock, ShieldCheck, X, HardDrive } from 'lucide-react';

interface PCBDetailModalProps {
  pcb: PCBData | null;
  onClose: () => void;
}

export const PCBDetailModal: React.FC<PCBDetailModalProps> = ({ pcb, onClose }) => {
  if (!pcb) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5 text-xs font-mono">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 font-bold">
              #{pcb.pid}
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-sans flex items-center gap-2">
                Process Control Block (PCB)
                <span className="text-xs px-2 py-0.5 rounded-full font-mono bg-blue-500/10 text-blue-400 border border-blue-500/30">
                  {pcb.name}
                </span>
              </h3>
              <p className="text-[11px] text-slate-400 font-sans">
                Operating System Process Descriptor & Hardware Registers
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* State and Identification */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-400 block uppercase">Current State</span>
            <span className="text-sm font-bold text-emerald-400 font-mono">{pcb.state}</span>
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-400 block uppercase">Priority</span>
            <span className="text-sm font-bold text-white font-mono">{pcb.priority}</span>
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-400 block uppercase">Arrival Time</span>
            <span className="text-sm font-bold text-white font-mono">{pcb.arrivalTime}</span>
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-400 block uppercase">Burst Time</span>
            <span className="text-sm font-bold text-white font-mono">{pcb.burstTime}u</span>
          </div>
        </div>

        {/* CPU Registers Snapshot */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-[11px] font-semibold uppercase">
            <span className="flex items-center gap-1.5 text-white">
              <Cpu className="w-3.5 h-3.5 text-blue-400" />
              Saved CPU Registers
            </span>
            <span>MOS Hardware</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
            <div className="p-2 rounded bg-slate-900 border border-slate-800 text-center">
              <span className="text-[10px] text-slate-500 block">IR</span>
              <span className="text-blue-400 font-bold">{pcb.registers.IR || '----'}</span>
            </div>
            <div className="p-2 rounded bg-slate-900 border border-slate-800 text-center">
              <span className="text-[10px] text-slate-500 block">R</span>
              <span className="text-emerald-400 font-bold">"{pcb.registers.R.trim() || 'EMPTY'}"</span>
            </div>
            <div className="p-2 rounded bg-slate-900 border border-slate-800 text-center">
              <span className="text-[10px] text-slate-500 block">PC / IC</span>
              <span className="text-purple-400 font-bold">{pcb.registers.PC}</span>
            </div>
            <div className="p-2 rounded bg-slate-900 border border-slate-800 text-center">
              <span className="text-[10px] text-slate-500 block">C Flag</span>
              <span className="text-cyan-400 font-bold">{pcb.registers.C ? 'TRUE' : 'FALSE'}</span>
            </div>
            <div className="p-2 rounded bg-slate-900 border border-slate-800 text-center">
              <span className="text-[10px] text-slate-500 block">PTR Frame</span>
              <span className="text-amber-400 font-bold">{pcb.registers.PTR}</span>
            </div>
          </div>
        </div>

        {/* Accounting & Limits */}
        <div className="grid grid-cols-2 gap-3 text-slate-300">
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1.5">
            <span className="text-[10px] uppercase text-slate-500 block font-semibold">Accounting & Limits</span>
            <div className="flex justify-between">
              <span className="text-slate-400">Time Consumed (TTC):</span>
              <span className="text-white font-bold">{pcb.ttc} / {pcb.ttl}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Line Limit (LLC):</span>
              <span className="text-white font-bold">{pcb.llc} / {pcb.tll}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Context Switches:</span>
              <span className="text-indigo-400 font-bold">{pcb.contextSwitches}</span>
            </div>
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1.5">
            <span className="text-[10px] uppercase text-slate-500 block font-semibold">I/O & Memory Info</span>
            <div className="flex justify-between">
              <span className="text-slate-400">Wait Reason:</span>
              <span className="text-amber-400 font-bold truncate max-w-[140px]">{pcb.waitReason}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">I/O Ticks Left:</span>
              <span className="text-white font-bold">{pcb.ioRemainingTicks}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Allocated Frame:</span>
              <span className="text-purple-400 font-bold">Frame #{pcb.registers.PTR}</span>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-sans text-xs transition-colors"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
