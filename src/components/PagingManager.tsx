import React, { useState } from 'react';
import {
  Calculator,
  Layers,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { SimulationSnapshot } from '../engine/types';

interface PagingManagerProps {
  snapshot: SimulationSnapshot;
}

export const PagingManager: React.FC<PagingManagerProps> = ({ snapshot }) => {
  const [testVA, setTestVA] = useState<number>(20);

  const isPhase2 = snapshot.phase === 2;

  // Calculation for test VA
  const calcPageNum = Math.floor(testVA / 10);
  const calcOffset = testVA % 10;
  const calcPTEAddress = snapshot.registers.PTR * 10 + calcPageNum;

  // Lookup in current snapshot page table
  const pteEntry = snapshot.pageTable.find(p => p.page === calcPageNum);
  const isPageFault = !pteEntry || !pteEntry.isAllocated;
  const calcRealAddress = pteEntry && pteEntry.frame !== null ? pteEntry.frame * 10 + calcOffset : null;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Calculator className="w-5 h-5 text-cyan-400" />
              Paging System & MMU Address Translator
            </h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              PTR: Frame {snapshot.registers.PTR}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Explore page table entries and test the step-by-step Virtual Address (VA) to Real Address (RA) hardware calculation.
          </p>
        </div>
      </div>

      {!isPhase2 ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 text-center space-y-3">
          <Layers className="w-10 h-10 text-slate-500 mx-auto" />
          <h3 className="text-sm font-semibold text-white">Paging is Disabled in Phase 1</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Phase 1 operates sequentially with direct physical memory addressing (00-99).
            Switch to <strong>Phase 2</strong> in the top navbar to unlock paging, PTR frame tables, and MMU address translation.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Col: Live Page Table (5 cols) */}
          <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-purple-400" />
                Page Table (Stored at Frame {snapshot.registers.PTR})
              </h3>
              <span className="text-[11px] font-mono text-slate-400">
                Addr: {snapshot.registers.PTR * 10} - {snapshot.registers.PTR * 10 + 9}
              </span>
            </div>

            <div className="space-y-1.5 font-mono text-xs">
              <div className="grid grid-cols-12 gap-2 text-[10px] text-slate-400 uppercase font-semibold px-2 py-1">
                <span className="col-span-2">Page #</span>
                <span className="col-span-3">Raw PTE</span>
                <span className="col-span-4">Allocated Frame</span>
                <span className="col-span-3 text-right">Status</span>
              </div>

              {snapshot.pageTable.map((pte) => {
                const isSelected = pte.page === calcPageNum;
                return (
                  <div
                    key={pte.page}
                    onClick={() => setTestVA(pte.page * 10)}
                    className={`grid grid-cols-12 gap-2 items-center p-2 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-cyan-950/40 border-cyan-500/50 text-cyan-300'
                        : pte.isAllocated
                        ? 'bg-slate-950 border-slate-800/80 text-slate-200 hover:border-slate-700'
                        : 'bg-slate-950/40 border-slate-900 text-slate-600'
                    }`}
                  >
                    <span className="col-span-2 font-bold">P{pte.page}</span>
                    <span className="col-span-3 font-mono bg-slate-900 px-1 py-0.5 rounded text-center">
                      '{pte.rawPte}'
                    </span>
                    <span className="col-span-4 font-semibold text-indigo-400">
                      {pte.frame !== null ? `Frame ${pte.frame} (RA ${pte.frame * 10})` : 'None (*)'}
                    </span>
                    <span className="col-span-3 text-right">
                      {pte.isAllocated ? (
                        <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                          Active
                        </span>
                      ) : (
                        <span className="text-[10px] text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20">
                          Fault (*)
                        </span>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Col: Interactive MMU Calculator (7 cols) */}
          <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Calculator className="w-4 h-4 text-cyan-400" />
                Interactive Address Translation Calculator
              </h3>
              <span className="text-xs text-slate-400">Algorithm: ADDRESSMAP(VA)</span>
            </div>

            {/* Input Slider / Box */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
              <label className="text-xs text-slate-400 block">
                Enter any 2-digit Virtual Address (00 to 99) or use quick presets:
              </label>

              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="0"
                  max="99"
                  value={testVA}
                  onChange={(e) => setTestVA(Math.min(99, Math.max(0, Number(e.target.value))))}
                  className="w-24 bg-slate-900 text-lg font-bold text-center font-mono rounded-xl border border-slate-700 py-2 text-cyan-400 focus:outline-none focus:border-cyan-500"
                />
                <input
                  type="range"
                  min="0"
                  max="99"
                  value={testVA}
                  onChange={(e) => setTestVA(Number(e.target.value))}
                  className="flex-1 accent-cyan-400 cursor-pointer h-2"
                />
              </div>

              <div className="flex flex-wrap gap-1.5 pt-1">
                {[10, 20, 30, 40, 50, 0, 99].map((va) => (
                  <button
                    key={va}
                    onClick={() => setTestVA(va)}
                    className="px-2 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded text-[11px] font-mono border border-slate-800"
                  >
                    VA={String(va).padStart(2, '0')}
                  </button>
                ))}
              </div>
            </div>

            {/* Step-by-Step Translation Walkthrough */}
            <div className="space-y-3 font-mono text-xs">
              {/* Step 1 & 2 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase">Step 1: Page Number</span>
                  <div className="text-sm font-bold text-blue-400">
                    pageNum = VA / 10 = {calcPageNum}
                  </div>
                  <p className="text-[10px] text-slate-400 font-sans">
                    Identifies which row in the Page Table to inspect (Page {calcPageNum}).
                  </p>
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase">Step 2: Offset</span>
                  <div className="text-sm font-bold text-indigo-400">
                    offset = VA % 10 = {calcOffset}
                  </div>
                  <p className="text-[10px] text-slate-400 font-sans">
                    Word displacement (0-9) inside the targeted 10-word frame.
                  </p>
                </div>
              </div>

              {/* Step 3: PTE Lookup */}
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2">
                <span className="text-[10px] text-slate-400 uppercase">Step 3: Page Table Lookup</span>
                <div className="text-sm font-bold text-purple-400">
                  Address = PTR * 10 + pageNum = ({snapshot.registers.PTR} * 10) + {calcPageNum} = {calcPTEAddress}
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-slate-400">Fetched PTE:</span>
                  <span className="font-bold text-white px-2 py-0.5 rounded bg-slate-900 border border-slate-700">
                    '{pteEntry?.rawPte || '****'}'
                  </span>
                  {isPageFault ? (
                    <span className="text-rose-400 text-xs font-sans flex items-center gap-1 font-bold">
                      <AlertTriangle className="w-3.5 h-3.5" /> Page Fault (PI=3)
                    </span>
                  ) : (
                    <span className="text-emerald-400 text-xs font-sans flex items-center gap-1 font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Allocated in Frame {pteEntry?.frame}
                    </span>
                  )}
                </div>
              </div>

              {/* Final Real Address Result */}
              <div className={`p-4 rounded-xl border ${
                isPageFault
                  ? 'bg-rose-950/20 border-rose-500/40 text-rose-300'
                  : 'bg-emerald-950/20 border-emerald-500/40 text-emerald-300'
              }`}>
                <span className="text-[10px] uppercase font-bold tracking-wider block mb-1">
                  {isPageFault ? 'Translation Result: Page Fault Interruption' : 'Step 4: Physical Address (RA)'}
                </span>

                {isPageFault ? (
                  <div className="space-y-1 font-sans text-xs">
                    <p className="font-bold text-rose-200">
                      Cannot resolve Real Address for Virtual Address {testVA}.
                    </p>
                    <p className="text-slate-300 text-[11px]">
                      If triggered by a <strong>GD</strong> (Get Data) or <strong>SR</strong> (Store Reg) instruction:
                      MOS triggers <em>Demand Paging</em>, allocates a free frame, updates this PTE, and rolls back IC.
                      Otherwise (e.g. <strong>LR</strong>, <strong>CR</strong>, <strong>PD</strong>), triggers an <strong>Invalid Page Fault (Terminate 6)</strong>!
                    </p>
                  </div>
                ) : (
                  <div>
                    <div className="text-lg font-bold font-mono text-emerald-400">
                      RA = (frame * 10) + offset = ({pteEntry?.frame} * 10) + {calcOffset} = {calcRealAddress}
                    </div>
                    <p className="text-[11px] text-slate-300 font-sans mt-1">
                      CPU successfully maps virtual address <span className="font-mono font-bold text-cyan-300">VA {testVA}</span> to physical memory word <span className="font-mono font-bold text-emerald-300">M[{calcRealAddress}]</span>.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
