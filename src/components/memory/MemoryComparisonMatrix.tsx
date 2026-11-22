import React, { useState, useMemo } from 'react';
import {
  Layers,
  Award,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Cpu,
  BarChart2,
  Info,
  RefreshCw,
  Sparkles,
  Zap,
  ArrowRight
} from 'lucide-react';
import { MemoryManagerEngine } from '../../engine/memoryManagerEngine';
import {
  ALLOCATION_PRESETS,
  REPLACEMENT_PRESETS
} from '../../engine/memoryPresets';
import { AllocationRequest } from '../../engine/memoryManagerTypes';

export const MemoryComparisonMatrix: React.FC = () => {
  const [activeComparison, setActiveComparison] = useState<'replacement' | 'allocation'>('replacement');

  // Page Replacement comparison state
  const [replacementPresetId, setReplacementPresetId] = useState<string>(REPLACEMENT_PRESETS[0].id);
  const [refStringInput, setRefStringInput] = useState<string>(
    REPLACEMENT_PRESETS[0].referenceString.join(', ')
  );
  const [frameCount, setFrameCount] = useState<number>(REPLACEMENT_PRESETS[0].frameCount);

  // Parse reference string
  const parsedRefString = useMemo(() => {
    return refStringInput
      .split(/[,\s]+/)
      .map(s => parseInt(s.trim(), 10))
      .filter(n => !isNaN(n) && n >= 0);
  }, [refStringInput]);

  // Run Replacement comparison
  const replacementResults = useMemo(() => {
    if (parsedRefString.length === 0 || frameCount <= 0) return [];
    return MemoryManagerEngine.compareAllReplacement(parsedRefString, frameCount);
  }, [parsedRefString, frameCount]);

  // Find optimal algorithm (min faults)
  const minFaults = useMemo(() => {
    if (replacementResults.length === 0) return 0;
    return Math.min(...replacementResults.map(r => r.pageFaults));
  }, [replacementResults]);

  // Contiguous Allocation comparison state
  const [allocationPresetId, setAllocationPresetId] = useState<string>(ALLOCATION_PRESETS[0].id);
  const [blocksInput, setBlocksInput] = useState<string>(
    ALLOCATION_PRESETS[0].blocks.join(', ')
  );
  const [requestsInput, setRequestsInput] = useState<string>(
    ALLOCATION_PRESETS[0].requests
      .map(r => `${r.processName}:${r.size}`)
      .join(', ')
  );

  // Parse contiguous blocks
  const parsedBlocks = useMemo(() => {
    return blocksInput
      .split(/[,\s]+/)
      .map(s => parseInt(s.trim(), 10))
      .filter(n => !isNaN(n) && n > 0);
  }, [blocksInput]);

  // Parse contiguous requests
  const parsedRequests = useMemo(() => {
    const tokens = requestsInput.split(/[,\s]+/);
    const reqs: AllocationRequest[] = [];
    let pidCounter = 1;

    for (const t of tokens) {
      if (!t.trim()) continue;
      if (t.includes(':')) {
        const [name, szStr] = t.split(':');
        const sz = parseInt(szStr, 10);
        if (!isNaN(sz)) {
          reqs.push({
            processId: pidCounter++,
            processName: name.trim() || `P${pidCounter}`,
            size: sz
          });
        }
      } else {
        const sz = parseInt(t, 10);
        if (!isNaN(sz)) {
          reqs.push({
            processId: pidCounter++,
            processName: `P${pidCounter - 1}`,
            size: sz
          });
        }
      }
    }
    return reqs;
  }, [requestsInput]);

  // Run Allocation comparison
  const allocationResults = useMemo(() => {
    if (parsedBlocks.length === 0 || parsedRequests.length === 0) return [];
    return MemoryManagerEngine.compareAllAllocation(parsedBlocks, parsedRequests);
  }, [parsedBlocks, parsedRequests]);

  // Max successful allocations
  const maxAllocations = useMemo(() => {
    if (allocationResults.length === 0) return 0;
    return Math.max(...allocationResults.map(r => r.successfulAllocations));
  }, [allocationResults]);

  // Handle Replacement Preset Select
  const handleSelectReplacementPreset = (presetId: string) => {
    setReplacementPresetId(presetId);
    const p = REPLACEMENT_PRESETS.find(x => x.id === presetId);
    if (p) {
      setRefStringInput(p.referenceString.join(', '));
      setFrameCount(p.frameCount);
    }
  };

  // Handle Allocation Preset Select
  const handleSelectAllocationPreset = (presetId: string) => {
    setAllocationPresetId(presetId);
    const p = ALLOCATION_PRESETS.find(x => x.id === presetId);
    if (p) {
      setBlocksInput(p.blocks.join(', '));
      setRequestsInput(p.requests.map(r => `${r.processName}:${r.size}`).join(', '));
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <BarChart2 className="w-6 h-6 text-indigo-400" />
              Memory & Paging Algorithm Comparison Matrix
            </h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-mono bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              Side-by-Side Benchmarks
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Compare First Fit, Best Fit, and Worst Fit contiguous placement, and evaluate FIFO, LRU, and Optimal page replacement against identical workloads.
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveComparison('replacement')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeComparison === 'replacement'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Page Replacement (FIFO / LRU / OPT)
          </button>
          <button
            onClick={() => setActiveComparison('allocation')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeComparison === 'allocation'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Contiguous Allocation (Fit Algorithms)
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 1: PAGE REPLACEMENT COMPARISON */}
      {/* ========================================================================= */}
      {activeComparison === 'replacement' && (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Workload Presets:
                </span>
                <select
                  value={replacementPresetId}
                  onChange={(e) => handleSelectReplacementPreset(e.target.value)}
                  className="bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-2 font-medium focus:outline-none focus:border-indigo-500"
                >
                  {REPLACEMENT_PRESETS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-3">
                <label className="text-xs text-slate-400 font-medium">Physical Frames:</label>
                <div className="flex items-center gap-1.5">
                  {[2, 3, 4, 5].map((cnt) => (
                    <button
                      key={cnt}
                      onClick={() => setFrameCount(cnt)}
                      className={`px-2.5 py-1 text-xs rounded-lg font-mono font-bold transition-all ${
                        frameCount === cnt
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                      }`}
                    >
                      {cnt}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-slate-400 font-mono">Reference String (comma-separated):</label>
              <input
                type="text"
                value={refStringInput}
                onChange={(e) => setRefStringInput(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-slate-200 font-mono text-xs rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-indigo-500"
                placeholder="e.g. 7, 0, 1, 2, 0, 3, 0, 4, 2, 3, 0, 3, 2, 1, 2, 0, 1, 7, 0, 1"
              />
            </div>
          </div>

          {/* Side-by-Side Comparison Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {replacementResults.map((result) => {
              const isOptimal = result.pageFaults === minFaults;
              const isOptAlgo = result.algorithm === 'Optimal';

              return (
                <div
                  key={result.algorithm}
                  className={`relative rounded-2xl p-5 border transition-all ${
                    isOptimal
                      ? 'bg-slate-900 border-indigo-500/50 shadow-lg shadow-indigo-950/30'
                      : 'bg-slate-900/60 border-slate-800'
                  }`}
                >
                  {isOptimal && (
                    <div className="absolute top-4 right-4 flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      <Award className="w-3 h-3 text-indigo-400" /> Lowest Faults
                    </div>
                  )}

                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      {result.algorithm === 'FIFO' && 'First-In First-Out (FIFO)'}
                      {result.algorithm === 'LRU' && 'Least Recently Used (LRU)'}
                      {result.algorithm === 'Optimal' && "Optimal Algorithm (Bélády's MIN)"}
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      {result.algorithm === 'FIFO' && 'Evicts the oldest page brought into memory.'}
                      {result.algorithm === 'LRU' && 'Evicts the page not accessed for the longest time.'}
                      {result.algorithm === 'Optimal' && 'Evicts the page not needed for the longest future time.'}
                    </p>
                  </div>

                  {/* Main Faults & Hits Stats */}
                  <div className="grid grid-cols-2 gap-3 my-4">
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80">
                      <span className="text-[10px] font-mono uppercase text-slate-400 block">Page Faults</span>
                      <div className="flex items-baseline gap-2 mt-1">
                        <span className={`text-2xl font-mono font-bold ${isOptimal ? 'text-indigo-400' : 'text-rose-400'}`}>
                          {result.pageFaults}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          ({result.faultRatio}%)
                        </span>
                      </div>
                    </div>

                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80">
                      <span className="text-[10px] font-mono uppercase text-slate-400 block">Page Hits</span>
                      <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-2xl font-mono font-bold text-emerald-400">
                          {result.pageHits}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          ({result.hitRatio}%)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar of Hit Ratio */}
                  <div className="space-y-1.5 mb-4">
                    <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                      <span>Hit Ratio Efficiency</span>
                      <span className="text-emerald-400 font-semibold">{result.hitRatio}%</span>
                    </div>
                    <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                      <div
                        className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                        style={{ width: `${result.hitRatio}%` }}
                      />
                    </div>
                  </div>

                  {/* Theoretical Notes */}
                  <div className="pt-3 border-t border-slate-800/80 text-[11px] space-y-1 text-slate-400">
                    <div className="flex justify-between">
                      <span>Stack Algorithm:</span>
                      <span className={result.algorithm === 'FIFO' ? 'text-amber-400' : 'text-emerald-400 font-semibold'}>
                        {result.algorithm === 'FIFO' ? 'No (Bélády Anomaly Risk)' : 'Yes (No Anomaly)'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Implementation Cost:</span>
                      <span className="text-slate-300 font-mono">
                        {result.algorithm === 'FIFO' && 'Low (Queue O(1))'}
                        {result.algorithm === 'LRU' && 'High (Timestamp/Stack)'}
                        {result.algorithm === 'Optimal' && 'Impossible in Real-Time'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Matrix Step-by-Step Trace Comparison Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-400" />
                Step-by-Step Decision Trace Comparison ({parsedRefString.length} References)
              </h3>
              <div className="flex items-center gap-4 text-xs font-mono">
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" /> Page Hit
                </span>
                <span className="flex items-center gap-1.5 text-rose-400">
                  <span className="w-2 h-2 rounded-full bg-rose-400" /> Page Fault
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-950/80 text-slate-400 font-mono border-b border-slate-800">
                    <th className="py-2.5 px-3 w-12 text-center">#</th>
                    <th className="py-2.5 px-3 w-16 text-center">Ref</th>
                    <th className="py-2.5 px-4 text-left border-l border-slate-800/60" colSpan={2}>
                      First-In First-Out (FIFO)
                    </th>
                    <th className="py-2.5 px-4 text-left border-l border-slate-800/60" colSpan={2}>
                      Least Recently Used (LRU)
                    </th>
                    <th className="py-2.5 px-4 text-left border-l border-slate-800/60" colSpan={2}>
                      Optimal Algorithm (OPT)
                    </th>
                  </tr>
                  <tr className="bg-slate-950/40 text-[11px] text-slate-500 font-mono border-b border-slate-800">
                    <th colSpan={2} />
                    <th className="py-1 px-4 border-l border-slate-800/60">Frames State</th>
                    <th className="py-1 px-3">Result</th>
                    <th className="py-1 px-4 border-l border-slate-800/60">Frames State</th>
                    <th className="py-1 px-3">Result</th>
                    <th className="py-1 px-4 border-l border-slate-800/60">Frames State</th>
                    <th className="py-1 px-3">Result</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {parsedRefString.map((ref, idx) => {
                    const fifoStep = replacementResults[0]?.steps[idx];
                    const lruStep = replacementResults[1]?.steps[idx];
                    const optStep = replacementResults[2]?.steps[idx];

                    return (
                      <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-2 px-3 text-center text-slate-500">{idx + 1}</td>
                        <td className="py-2 px-3 text-center font-bold text-white bg-slate-950/40">
                          {ref}
                        </td>

                        {/* FIFO column */}
                        <td className="py-2 px-4 border-l border-slate-800/60 text-slate-300">
                          [{fifoStep?.frames.map(f => f === -1 ? '-' : f).join(', ')}]
                        </td>
                        <td className="py-2 px-3">
                          {fifoStep?.isHit ? (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">
                              HIT
                            </span>
                          ) : (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 font-bold border border-rose-500/20">
                              FAULT {fifoStep?.victimPage !== -1 ? `(-${fifoStep?.victimPage})` : ''}
                            </span>
                          )}
                        </td>

                        {/* LRU column */}
                        <td className="py-2 px-4 border-l border-slate-800/60 text-slate-300">
                          [{lruStep?.frames.map(f => f === -1 ? '-' : f).join(', ')}]
                        </td>
                        <td className="py-2 px-3">
                          {lruStep?.isHit ? (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">
                              HIT
                            </span>
                          ) : (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 font-bold border border-rose-500/20">
                              FAULT {lruStep?.victimPage !== -1 ? `(-${lruStep?.victimPage})` : ''}
                            </span>
                          )}
                        </td>

                        {/* OPT column */}
                        <td className="py-2 px-4 border-l border-slate-800/60 text-slate-300">
                          [{optStep?.frames.map(f => f === -1 ? '-' : f).join(', ')}]
                        </td>
                        <td className="py-2 px-3">
                          {optStep?.isHit ? (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">
                              HIT
                            </span>
                          ) : (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 font-bold border border-indigo-500/20">
                              FAULT {optStep?.victimPage !== -1 ? `(-${optStep?.victimPage})` : ''}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 2: CONTIGUOUS ALLOCATION COMPARISON */}
      {/* ========================================================================= */}
      {activeComparison === 'allocation' && (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Partition Presets:
                </span>
                <select
                  value={allocationPresetId}
                  onChange={(e) => handleSelectAllocationPreset(e.target.value)}
                  className="bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-2 font-medium focus:outline-none focus:border-indigo-500"
                >
                  {ALLOCATION_PRESETS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs text-slate-400 font-mono">
                  Initial Partition Sizes in KB (comma-separated):
                </label>
                <input
                  type="text"
                  value={blocksInput}
                  onChange={(e) => setBlocksInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 font-mono text-xs rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-indigo-500"
                  placeholder="e.g. 100, 500, 200, 300, 600"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-slate-400 font-mono">
                  Process Requests (Name:Size or Size, comma-separated):
                </label>
                <input
                  type="text"
                  value={requestsInput}
                  onChange={(e) => setRequestsInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 font-mono text-xs rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-indigo-500"
                  placeholder="e.g. P1:212, P2:417, P3:112, P4:426"
                />
              </div>
            </div>
          </div>

          {/* Allocation Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {allocationResults.map((result) => {
              const isBest = result.successfulAllocations === maxAllocations;

              return (
                <div
                  key={result.algorithm}
                  className={`relative rounded-2xl p-5 border transition-all ${
                    isBest
                      ? 'bg-slate-900 border-indigo-500/50 shadow-lg shadow-indigo-950/30'
                      : 'bg-slate-900/60 border-slate-800'
                  }`}
                >
                  {isBest && (
                    <div className="absolute top-4 right-4 flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      <Award className="w-3 h-3 text-indigo-400" /> Max Placements
                    </div>
                  )}

                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-white">
                      {result.algorithm}
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      {result.algorithm === 'First Fit' && 'Allocates the first hole that is big enough.'}
                      {result.algorithm === 'Best Fit' && 'Allocates the smallest hole that is big enough.'}
                      {result.algorithm === 'Worst Fit' && 'Allocates the largest hole available.'}
                    </p>
                  </div>

                  {/* Main Placement Stats */}
                  <div className="grid grid-cols-2 gap-3 my-4">
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80">
                      <span className="text-[10px] font-mono uppercase text-slate-400 block">Succeeded</span>
                      <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-2xl font-mono font-bold text-emerald-400">
                          {result.successfulAllocations}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          / {parsedRequests.filter(r => r.size > 0).length} reqs
                        </span>
                      </div>
                    </div>

                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80">
                      <span className="text-[10px] font-mono uppercase text-slate-400 block">Failed</span>
                      <div className="flex items-baseline gap-2 mt-1">
                        <span className={`text-2xl font-mono font-bold ${result.failedAllocations > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                          {result.failedAllocations}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          blocked
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Fragmentation & Memory Metrics */}
                  <div className="space-y-2 py-3 border-y border-slate-800/80 text-xs font-mono">
                    <div className="flex justify-between text-slate-400">
                      <span>External Fragmentation:</span>
                      <span className={result.externalFragmentation > 0 ? 'text-amber-400 font-semibold' : 'text-slate-300'}>
                        {result.externalFragmentation} KB
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Remaining Free Memory:</span>
                      <span className="text-white font-semibold">{result.totalFreeMemory} KB</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Search Overhead:</span>
                      <span className="text-indigo-300">
                        {result.algorithm === 'First Fit' && 'Fastest O(1) - O(N)'}
                        {result.algorithm === 'Best Fit' && 'Searches entire list O(N)'}
                        {result.algorithm === 'Worst Fit' && 'Searches entire list O(N)'}
                      </span>
                    </div>
                  </div>

                  {/* Mini Final Layout Bar */}
                  <div className="mt-4 space-y-1.5">
                    <span className="text-[10px] font-mono uppercase text-slate-400 block">
                      Final Memory Layout ({result.finalBlocks.length} Partitions):
                    </span>
                    <div className="flex h-5 w-full rounded-lg overflow-hidden border border-slate-700/60 bg-slate-950">
                      {result.finalBlocks.map((b) => {
                        const widthPct = Math.max(5, (b.size / result.totalMemory) * 100);
                        return (
                          <div
                            key={b.id}
                            className={`h-full flex items-center justify-center text-[9px] font-mono font-bold truncate transition-all ${
                              b.isAllocated
                                ? 'bg-indigo-600/80 text-white border-r border-indigo-400/30'
                                : 'bg-slate-800 text-slate-400 border-r border-slate-700/50'
                            }`}
                            style={{ width: `${widthPct}%` }}
                            title={`Block ${b.id}: ${b.isAllocated ? b.processName : 'Free'} (${b.size} KB)`}
                          >
                            {b.isAllocated ? b.processName : 'F'}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Allocation Decisions Matrix Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-400" />
                Allocation Decisions Comparison Matrix
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-950/80 text-slate-400 font-mono border-b border-slate-800">
                    <th className="py-2.5 px-3 w-12 text-center">Step</th>
                    <th className="py-2.5 px-3 w-28">Request</th>
                    <th className="py-2.5 px-4 text-left border-l border-slate-800/60">First Fit Decision</th>
                    <th className="py-2.5 px-4 text-left border-l border-slate-800/60">Best Fit Decision</th>
                    <th className="py-2.5 px-4 text-left border-l border-slate-800/60">Worst Fit Decision</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {parsedRequests.map((req, idx) => {
                    const ffStep = allocationResults[0]?.steps[idx];
                    const bfStep = allocationResults[1]?.steps[idx];
                    const wfStep = allocationResults[2]?.steps[idx];

                    return (
                      <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-2 px-3 text-center text-slate-500">{idx + 1}</td>
                        <td className="py-2 px-3 font-semibold text-white">
                          {req.processName} ({req.size > 0 ? `${req.size} KB` : 'Dealloc'})
                        </td>

                        {/* First Fit */}
                        <td className="py-2 px-4 border-l border-slate-800/60">
                          {ffStep?.success ? (
                            <span className="text-emerald-400 text-xs flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                              Allocated @ Block {ffStep.allocatedBlockId} (Addr {ffStep.allocatedAddress})
                            </span>
                          ) : (
                            <span className="text-rose-400 text-xs flex items-center gap-1.5">
                              <XCircle className="w-3.5 h-3.5 text-rose-400" />
                              FAILED: No hole &gt;= {req.size} KB
                            </span>
                          )}
                        </td>

                        {/* Best Fit */}
                        <td className="py-2 px-4 border-l border-slate-800/60">
                          {bfStep?.success ? (
                            <span className="text-emerald-400 text-xs flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                              Allocated @ Block {bfStep.allocatedBlockId} (Addr {bfStep.allocatedAddress})
                            </span>
                          ) : (
                            <span className="text-rose-400 text-xs flex items-center gap-1.5">
                              <XCircle className="w-3.5 h-3.5 text-rose-400" />
                              FAILED: No hole &gt;= {req.size} KB
                            </span>
                          )}
                        </td>

                        {/* Worst Fit */}
                        <td className="py-2 px-4 border-l border-slate-800/60">
                          {wfStep?.success ? (
                            <span className="text-emerald-400 text-xs flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                              Allocated @ Block {wfStep.allocatedBlockId} (Addr {wfStep.allocatedAddress})
                            </span>
                          ) : (
                            <span className="text-rose-400 text-xs flex items-center gap-1.5">
                              <XCircle className="w-3.5 h-3.5 text-rose-400" />
                              FAILED: No hole &gt;= {req.size} KB
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
