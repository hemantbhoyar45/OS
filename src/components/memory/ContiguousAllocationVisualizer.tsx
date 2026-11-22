import React, { useState } from 'react';
import {
  AllocationResult,
  AllocationAlgorithmId,
  AllocationPreset
} from '../../engine/memoryManagerTypes';
import { ALLOCATION_PRESETS } from '../../engine/memoryPresets';
import { MemoryManagerEngine } from '../../engine/memoryManagerEngine';
import { Layers, CheckCircle2, XCircle, ArrowRight, RotateCcw, Sparkles } from 'lucide-react';

interface ContiguousAllocationVisualizerProps {
  algorithm: AllocationAlgorithmId;
  onSelectAlgorithm: (algo: AllocationAlgorithmId) => void;
}

export const ContiguousAllocationVisualizer: React.FC<ContiguousAllocationVisualizerProps> = ({
  algorithm,
  onSelectAlgorithm
}) => {
  const defaultPreset = ALLOCATION_PRESETS[0];
  const [selectedPresetId, setSelectedPresetId] = useState<string>(defaultPreset.id);
  const [blocks, setBlocks] = useState<number[]>(defaultPreset.blocks);
  const [requests, setRequests] = useState(defaultPreset.requests);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);

  // Compute allocation result
  const result: AllocationResult = MemoryManagerEngine.simulateAllocation(algorithm, blocks, requests);

  const handleSelectPreset = (presetId: string) => {
    const p = ALLOCATION_PRESETS.find((pr) => pr.id === presetId);
    if (!p) return;
    setSelectedPresetId(p.id);
    setBlocks(p.blocks);
    setRequests(p.requests);
    setCurrentStepIndex(0);
  };

  const currentStep = result.steps[currentStepIndex];
  const activeBlocks = currentStep ? currentStep.blocksAfter : result.initialBlocks;

  return (
    <div className="space-y-6">
      {/* Configuration & Preset Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-400" />
            <h3 className="text-sm font-semibold text-white">
              Contiguous Memory Allocation &amp; Coalescing Simulator
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Preset:
            </span>
            <select
              value={selectedPresetId}
              onChange={(e) => handleSelectPreset(e.target.value)}
              className="bg-slate-950 text-xs rounded-xl px-3 py-1.5 border border-slate-800 text-slate-200 focus:outline-none font-mono"
            >
              {ALLOCATION_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Algorithm Buttons & Step Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            {(['First Fit', 'Best Fit', 'Worst Fit'] as AllocationAlgorithmId[]).map((algo) => (
              <button
                key={algo}
                onClick={() => onSelectAlgorithm(algo)}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                  algorithm === algo
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {algo}
              </button>
            ))}
          </div>

          {/* Stepper */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentStepIndex((prev) => Math.max(0, prev - 1))}
              disabled={currentStepIndex === 0}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs disabled:opacity-30"
            >
              Previous
            </button>
            <span className="text-xs font-mono text-slate-300">
              Step {currentStepIndex + 1} of {result.steps.length}
            </span>
            <button
              onClick={() => setCurrentStepIndex((prev) => Math.min(result.steps.length - 1, prev + 1))}
              disabled={currentStepIndex >= result.steps.length - 1}
              className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs disabled:opacity-30 font-medium"
            >
              Next Step
            </button>
            <button
              onClick={() => setCurrentStepIndex(0)}
              className="p-1 rounded-lg text-slate-400 hover:text-white"
              title="Reset"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Current Step Description Message */}
        {currentStep && (
          <div className={`p-3 rounded-xl border flex items-center gap-2 text-xs font-mono ${
            currentStep.success
              ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
              : 'bg-rose-950/30 border-rose-500/40 text-rose-300'
          }`}>
            {currentStep.success ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <XCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{currentStep.message}</span>
          </div>
        )}
      </div>

      {/* Memory Partition Layout Visualization */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">Physical Memory Space Partitioning</h3>
          <span className="text-xs font-mono text-slate-400">Total: {result.totalMemory} KB</span>
        </div>

        {/* Visual Memory Strip */}
        <div className="w-full h-20 bg-slate-950 rounded-xl border border-slate-800 flex overflow-hidden shadow-inner">
          {activeBlocks.map((b) => {
            const widthPct = (b.size / result.totalMemory) * 100;
            return (
              <div
                key={b.id}
                style={{ width: `${widthPct}%` }}
                className={`h-full border-r flex flex-col items-center justify-center p-1 relative group cursor-pointer transition-all ${
                  b.isAllocated
                    ? 'bg-blue-600/30 border-blue-500/60 text-blue-300'
                    : 'bg-slate-900/60 border-slate-800 text-slate-500'
                }`}
                title={`Block ${b.id}: [${b.startAddress} to ${b.startAddress + b.size}] - ${b.size} KB (${
                  b.isAllocated ? b.processName : 'Free Hole'
                })`}
              >
                <span className="text-xs font-mono font-bold truncate max-w-full">
                  {b.isAllocated ? b.processName : 'Free'}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {b.size} KB
                </span>
                <span className="text-[9px] text-slate-500 font-mono">
                  addr:{b.startAddress}
                </span>
              </div>
            );
          })}
        </div>

        {/* Memory Blocks Detail Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 pt-2">
          {activeBlocks.map((b) => (
            <div
              key={b.id}
              className={`p-3 rounded-xl border font-mono text-xs ${
                b.isAllocated
                  ? 'bg-slate-950 border-blue-500/40 text-blue-300'
                  : 'bg-slate-950/60 border-slate-800 text-slate-400'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-white">Block #{b.id}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded font-sans font-semibold ${
                  b.isAllocated ? 'bg-blue-500/20 text-blue-300' : 'bg-slate-900 text-slate-500'
                }`}>
                  {b.isAllocated ? b.processName : 'FREE'}
                </span>
              </div>
              <div className="text-slate-400">Size: <strong className="text-white">{b.size} KB</strong></div>
              <div className="text-slate-500 text-[10px]">Range: {b.startAddress} - {b.startAddress + b.size}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <span className="text-[10px] uppercase text-slate-400 font-mono block">Allocated Memory</span>
          <span className="text-lg font-bold font-mono text-blue-400">{result.allocatedMemory} KB</span>
          <span className="text-[10px] text-slate-500 block">Active Processes</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <span className="text-[10px] uppercase text-slate-400 font-mono block">Free Memory</span>
          <span className="text-lg font-bold font-mono text-emerald-400">{result.freeMemory} KB</span>
          <span className="text-[10px] text-slate-500 block">Available Space</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <span className="text-[10px] uppercase text-slate-400 font-mono block">Success Rate</span>
          <span className="text-lg font-bold font-mono text-white">
            {result.successfulAllocations} / {result.steps.length}
          </span>
          <span className="text-[10px] text-slate-500 block">
            {Math.round((result.successfulAllocations / (result.steps.length || 1)) * 100)}% Fulfilled
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <span className="text-[10px] uppercase text-slate-400 font-mono block">External Fragmentation</span>
          <span className="text-lg font-bold font-mono text-amber-400">{result.externalFragmentation} KB</span>
          <span className="text-[10px] text-slate-500 block">Non-contiguous Holes</span>
        </div>
      </div>
    </div>
  );
};
