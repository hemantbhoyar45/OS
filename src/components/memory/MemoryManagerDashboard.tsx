import React, { useState } from 'react';
import {
  Layers,
  BarChart2,
  Cpu,
  Calculator,
  Binary,
  CheckCircle2,
  HardDrive,
  RefreshCw,
  Sparkles,
  Zap,
  Info
} from 'lucide-react';
import { PageReplacementVisualizer } from './PageReplacementVisualizer';
import { ContiguousAllocationVisualizer } from './ContiguousAllocationVisualizer';
import { MemoryComparisonMatrix } from './MemoryComparisonMatrix';
import { MemoryVisualizer } from '../MemoryVisualizer';
import { PagingManager } from '../PagingManager';
import { SimulationSnapshot } from '../../engine/types';

export type MemoryTabId = 'replacement' | 'allocation' | 'comparison' | 'mos_paging';

interface MemoryManagerDashboardProps {
  snapshot?: SimulationSnapshot;
}

export const MemoryManagerDashboard: React.FC<MemoryManagerDashboardProps> = ({ snapshot }) => {
  const [activeTab, setActiveTab] = useState<MemoryTabId>('replacement');

  return (
    <div className="min-h-full pb-12 space-y-6">
      {/* Top Navigation Banner */}
      <div className="bg-slate-900 border-b border-slate-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-600/15 text-indigo-400 border border-indigo-500/30">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-white tracking-tight">
                  Memory Management & Paging Simulator
                </h1>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  C++ & WASM Engine
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Contiguous Allocation (First / Best / Worst Fit), Page Replacement (FIFO / LRU / Optimal), and Phase 2 MOS Hardware Paging.
              </p>
            </div>
          </div>

          {/* Module Navigation Tabs */}
          <div className="flex flex-wrap bg-slate-950 p-1.5 rounded-xl border border-slate-800 gap-1">
            <button
              onClick={() => setActiveTab('replacement')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'replacement'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>Page Replacement</span>
            </button>

            <button
              onClick={() => setActiveTab('allocation')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'allocation'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <HardDrive className="w-3.5 h-3.5" />
              <span>Contiguous Allocation</span>
            </button>

            <button
              onClick={() => setActiveTab('comparison')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'comparison'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span>Comparison Matrix</span>
            </button>

            {snapshot && (
              <button
                onClick={() => setActiveTab('mos_paging')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'mos_paging'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Calculator className="w-3.5 h-3.5" />
                <span>MOS VM Paging & PTR</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Tab Views */}
      <div className="space-y-6">
        {activeTab === 'replacement' && <PageReplacementVisualizer />}
        {activeTab === 'allocation' && <ContiguousAllocationVisualizer />}
        {activeTab === 'comparison' && <MemoryComparisonMatrix />}
        {activeTab === 'mos_paging' && snapshot && (
          <div className="space-y-6">
            <PagingManager snapshot={snapshot} />
            <MemoryVisualizer snapshot={snapshot} />
          </div>
        )}
      </div>
    </div>
  );
};
