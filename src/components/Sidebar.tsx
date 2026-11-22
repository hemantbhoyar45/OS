import React from 'react';
import {
  LayoutDashboard,
  Cpu,
  Layers,
  AlertTriangle,
  Terminal,
  Calculator,
  GraduationCap,
  Binary,
  Code2,
  Clock,
  Activity,
  CheckCircle2,
  XCircle,
  HelpCircle,
  LockKeyhole,
  HardDrive
} from 'lucide-react';
import { SimulationSnapshot } from '../engine/types';

export type TabId =
  | 'overview'
  | 'process'
  | 'scheduler'
  | 'simulator'
  | 'memory'
  | 'interrupts'
  | 'editor'
  | 'calculator'
  | 'study'
  | 'wasm'
  | 'deadlock'
  | 'disk';

interface SidebarProps {
  currentTab: TabId;
  onSelectTab: (tab: TabId) => void;
  snapshot: SimulationSnapshot;
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  snapshot,
  isOpen = true,
  onClose
}) => {
  const navItems = [
    { id: 'overview', label: 'System Overview', icon: LayoutDashboard },
    { id: 'process', label: 'Process Lifecycle & PCB', icon: Activity, badge: '5 States' },
    { id: 'scheduler', label: 'CPU Scheduling', icon: Clock, badge: '6 Algorithms' },
    { id: 'simulator', label: 'MOS VM Simulator', icon: Cpu, badge: `IC: ${snapshot.registers.IC}` },
    { id: 'memory', label: 'Memory & Paging', icon: Layers, badge: 'Fit & Paging' },
    { id: 'deadlock', label: 'Deadlock Management', icon: LockKeyhole, badge: 'Banker & Detect' },
    { id: 'disk', label: 'Disk Scheduling', icon: HardDrive, badge: '6 Algorithms' },
    { id: 'interrupts', label: 'Decision Table & IRQ', icon: AlertTriangle, hasAlert: snapshot.registers.SI > 0 || snapshot.registers.PI > 0 || snapshot.registers.TI > 0 },
    { id: 'editor', label: 'Job Editor & Output', icon: Terminal },
    { id: 'calculator', label: 'Address Translator', icon: Calculator },
    { id: 'study', label: 'Viva & Study Guide', icon: GraduationCap },
    { id: 'wasm', label: 'WebAssembly & C++', icon: Binary }
  ];

  return (
    <>
      {isOpen && (
        <button
          aria-label="Close navigation"
          onClick={onClose}
          className="fixed inset-0 top-16 z-30 bg-black/50 md:hidden"
        />
      )}
      <aside className={`${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} fixed md:static top-16 md:top-auto left-0 z-40 md:z-auto w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between shrink-0 h-[calc(100vh-4rem)] transition-transform duration-200`}>
      {/* Navigation Links */}
      <div className="p-3 space-y-1">
        <div className="px-3 py-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          Simulation Dashboard
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                onSelectTab(item.id as TabId);
                onClose?.();
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                isActive
                  ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon className={`w-4 h-4 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700/50">
                  {item.badge}
                </span>
              )}
              {item.hasAlert && (
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              )}
            </button>
          );
        })}
      </div>

      {/* Mini System Status Card */}
      <div className="p-3 space-y-3">
        <div className="bg-slate-950/80 rounded-xl p-3 border border-slate-800 text-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] text-slate-400 font-medium">Engine State</span>
            {snapshot.isTerminated ? (
              <span className="flex items-center gap-1 text-[11px] text-amber-400 font-medium">
                <XCircle className="w-3 h-3" /> Terminated
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                <CheckCircle2 className="w-3 h-3" /> Armed
              </span>
            )}
          </div>
          <div className="space-y-1.5 font-mono text-[11px]">
            <div className="flex justify-between text-slate-400">
              <span>Cycle:</span>
              <span className="text-white font-semibold">{snapshot.currentCycle}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>IR Opcode:</span>
              <span className="text-blue-400 font-bold">{snapshot.registers.IR || '----'}</span>
            </div>
            {snapshot.phase === 2 && (
              <>
                <div className="flex justify-between text-slate-400">
                  <span>PTR Frame:</span>
                  <span className="text-purple-400 font-semibold">{snapshot.registers.PTR}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>TTC / TTL:</span>
                  <span className={snapshot.pcb.TTC >= snapshot.pcb.TTL ? 'text-rose-400' : 'text-slate-300'}>
                    {snapshot.pcb.TTC} / {snapshot.pcb.TTL}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Source link */}
        <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-slate-400 text-[11px] px-1">
          <a
            href="https://github.com/hemantbhoyar45/OS"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 hover:text-slate-200 transition-colors"
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>GitHub Repository</span>
          </a>
          <span className="text-slate-500 font-mono">MIT</span>
        </div>
      </div>
      </aside>
    </>
  );
};
