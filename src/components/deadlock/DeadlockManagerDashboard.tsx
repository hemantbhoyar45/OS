import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
  Table2,
  XCircle
} from 'lucide-react';
import { DeadlockEngine } from '../../engine/deadlockEngine';
import { BankersResult, DetectionResult, RequestResult } from '../../engine/deadlockTypes';

type Preset = {
  name: string;
  allocation: number[][];
  maximum: number[][];
  available: number[];
  request: number[][];
};

const PRESETS: Preset[] = [
  {
    name: 'Safe state',
    allocation: [[0, 1, 0], [2, 0, 0], [3, 0, 2], [2, 1, 1], [0, 0, 2]],
    maximum: [[7, 5, 3], [3, 2, 2], [9, 0, 2], [2, 2, 2], [4, 3, 3]],
    available: [3, 3, 2],
    request: [[0, 0, 0], [1, 0, 2], [0, 0, 0], [0, 0, 0], [0, 0, 0]]
  },
  {
    name: 'Unsafe, not yet deadlocked',
    allocation: [[2, 1, 0], [1, 1, 1], [1, 0, 1]],
    maximum: [[4, 2, 1], [3, 2, 2], [2, 2, 2]],
    available: [0, 0, 1],
    request: [[1, 1, 0], [2, 0, 0], [1, 1, 0]]
  },
  {
    name: 'Confirmed deadlock',
    allocation: [[1, 0], [0, 1]],
    maximum: [[2, 1], [1, 2]],
    available: [0, 0],
    request: [[1, 0], [0, 1]]
  }
];

function parseMatrix(text: string): number[][] {
  if (!text.trim()) return [];
  return text.trim().split(/[;\n]+/).map(row =>
    row.split(/[\s,]+/).filter(Boolean).map(value => Number(value))
  );
}

function parseVector(text: string): number[] {
  if (!text.trim()) return [];
  return text.split(/[\s,]+/).filter(Boolean).map(Number);
}

const MatrixTable: React.FC<{
  title: string;
  matrix: number[][];
  resourceNames: string[];
}> = ({ title, matrix, resourceNames }) => (
  <div className="rounded-xl border border-slate-800 overflow-hidden">
    <div className="px-4 py-2 bg-slate-900 text-xs font-semibold text-slate-300">{title}</div>
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead className="bg-slate-950 text-slate-500">
          <tr>
            <th className="px-3 py-2 text-left">Process</th>
            {resourceNames.map((name, i) => <th key={i} className="px-3 py-2">{name}</th>)}
          </tr>
        </thead>
        <tbody>
          {matrix.map((row, i) => (
            <tr key={i} className="border-t border-slate-800/70">
              <td className="px-3 py-2 font-mono text-blue-400">P{i}</td>
              {row.map((value, j) => <td key={j} className="px-3 py-2 text-center font-mono">{value}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

export const DeadlockManagerDashboard: React.FC = () => {
  const [allocationText, setAllocationText] = useState(PRESETS[0].allocation.map(r => r.join(',')).join('\n'));
  const [maximumText, setMaximumText] = useState(PRESETS[0].maximum.map(r => r.join(',')).join('\n'));
  const [availableText, setAvailableText] = useState(PRESETS[0].available.join(','));
  const [requestText, setRequestText] = useState(PRESETS[0].request.map(r => r.join(',')).join('\n'));
  const [resourceCount, setResourceCount] = useState(3);
  const [selectedProcess, setSelectedProcess] = useState(1);
  const [requestResult, setRequestResult] = useState<RequestResult | null>(null);

  const allocation = useMemo(() => parseMatrix(allocationText), [allocationText]);
  const maximum = useMemo(() => parseMatrix(maximumText), [maximumText]);
  const available = useMemo(() => parseVector(availableText), [availableText]);
  const request = useMemo(() => parseMatrix(requestText), [requestText]);
  const bankers = useMemo(
    () => DeadlockEngine.runBankers(allocation, maximum, available),
    [allocation, maximum, available]
  );
  const detection = useMemo(
    () => DeadlockEngine.detectDeadlock(allocation, request, available),
    [allocation, request, available]
  );
  const resourceNames = Array.from({ length: resourceCount }, (_, i) => `R${i}`);

  const applyPreset = (preset: Preset) => {
    setAllocationText(preset.allocation.map(r => r.join(',')).join('\n'));
    setMaximumText(preset.maximum.map(r => r.join(',')).join('\n'));
    setAvailableText(preset.available.join(','));
    setRequestText(preset.request.map(r => r.join(',')).join('\n'));
    setResourceCount(preset.available.length);
    setSelectedProcess(Math.min(1, preset.allocation.length - 1));
    setRequestResult(null);
  };

  const handleRequest = () => {
    const row = request[selectedProcess] ?? available.map(() => 0);
    setRequestResult(DeadlockEngine.requestResources(selectedProcess, row, allocation, maximum, available));
  };

  return (
    <div className="min-h-full pb-12">
      <div className="bg-slate-900 border-b border-slate-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-rose-600/15 text-rose-400 border border-rose-500/30"><LockKeyhole className="w-6 h-6" /></div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white">Deadlock Management Simulator</h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">C++ & WASM</span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">Banker's avoidance and resource-allocation-graph-style deadlock detection.</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        <div className="flex flex-wrap gap-2">
          {PRESETS.map(preset => (
            <button key={preset.name} onClick={() => applyPreset(preset)}
              className="px-3 py-2 rounded-lg border border-slate-700 bg-slate-900 text-xs text-slate-300 hover:border-blue-500">
              {preset.name}
            </button>
          ))}
        </div>

        <div className="grid lg:grid-cols-[1.15fr_1fr] gap-6">
          <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/50 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold"><Table2 className="w-4 h-4 text-blue-400" /> Input Matrices</div>
            <div className="grid md:grid-cols-2 gap-4">
              {[
                ['Allocation', allocationText, setAllocationText],
                ['Maximum Demand', maximumText, setMaximumText],
                ['Request Matrix', requestText, setRequestText]
              ].map(([title, value, setter]) => (
                <label key={String(title)} className="text-xs text-slate-400">
                  {String(title)} <span className="text-slate-600">(one process per line)</span>
                  <textarea value={String(value)} onChange={e => (setter as React.Dispatch<React.SetStateAction<string>>)(e.target.value)}
                    className="mt-2 w-full h-28 rounded-lg bg-slate-950 border border-slate-700 p-3 font-mono text-slate-200 text-xs" />
                </label>
              ))}
              <label className="text-xs text-slate-400">
                Available Resources
                <input value={availableText} onChange={e => setAvailableText(e.target.value)}
                  className="mt-2 w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-3 font-mono text-slate-200 text-xs" />
              </label>
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <label className="text-xs text-slate-400">
                Resource types
                <input type="number" min={1} max={8} value={resourceCount}
                  onChange={e => setResourceCount(Math.max(1, Number(e.target.value)))}
                  className="ml-2 w-16 rounded border border-slate-700 bg-slate-950 px-2 py-1 font-mono" />
              </label>
              <label className="text-xs text-slate-400">
                Grant request for
                <select value={selectedProcess} onChange={e => setSelectedProcess(Number(e.target.value))}
                  className="ml-2 rounded border border-slate-700 bg-slate-950 px-2 py-1">
                  {allocation.map((_, i) => <option key={i} value={i}>P{i}</option>)}
                </select>
              </label>
              <button onClick={handleRequest} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 text-xs font-semibold">
                <RefreshCw className="w-3.5 h-3.5" /> Evaluate Request
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <div className={`rounded-xl border p-4 ${bankers.isSafe ? 'border-emerald-700/60 bg-emerald-950/20' : 'border-amber-700/60 bg-amber-950/20'}`}>
              <div className="flex items-center gap-2">
                {bankers.isSafe ? <ShieldCheck className="w-5 h-5 text-emerald-400" /> : <AlertTriangle className="w-5 h-5 text-amber-400" />}
                <div>
                  <div className="text-sm font-bold">{bankers.isSafe ? 'SAFE STATE' : 'UNSAFE STATE'}</div>
                  <div className="text-xs text-slate-400">{bankers.error || (bankers.isSafe ? `Safe sequence: ${bankers.safeSequence.map(i => `P${i}`).join(' -> ')}` : 'No complete safe sequence exists. This is not automatically a confirmed deadlock.')}</div>
                </div>
              </div>
            </div>

            <div className={`rounded-xl border p-4 ${detection.hasDeadlock ? 'border-rose-700/60 bg-rose-950/20' : 'border-slate-700 bg-slate-900/50'}`}>
              <div className="flex items-center gap-2">
                {detection.hasDeadlock ? <XCircle className="w-5 h-5 text-rose-400" /> : <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                <div>
                  <div className="text-sm font-bold">{detection.error ? 'DETECTION INPUT ERROR' : detection.hasDeadlock ? 'CONFIRMED DEADLOCK' : 'NO DEADLOCK DETECTED'}</div>
                  <div className="text-xs text-slate-400">
                    {detection.error || (detection.hasDeadlock ? `Deadlocked processes: ${detection.deadlockedProcesses.map(i => `P${i}`).join(', ')}` : 'Detection algorithm found no blocked processes.')}
                  </div>
                </div>
              </div>
            </div>

            {requestResult && (
              <div className={`rounded-xl border p-4 ${requestResult.granted ? 'border-emerald-700/60 bg-emerald-950/20' : 'border-rose-700/60 bg-rose-950/20'}`}>
                <div className="text-sm font-bold">{requestResult.status}: P{selectedProcess}</div>
                <div className="text-xs text-slate-400 mt-1">{requestResult.reason}</div>
                {requestResult.safeSequence.length > 0 && (
                  <div className="text-xs text-emerald-400 mt-2 font-mono">{requestResult.safeSequence.map(i => `P${i}`).join(' -> ')}</div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <MatrixTable title="Allocation" matrix={allocation} resourceNames={resourceNames} />
          <MatrixTable title="Maximum Demand" matrix={maximum} resourceNames={resourceNames} />
          <MatrixTable title="Need (Maximum - Allocation)" matrix={bankers.need} resourceNames={resourceNames} />
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <div className="rounded-xl border border-slate-800 overflow-hidden">
            <div className="px-4 py-3 bg-slate-900 text-sm font-semibold">Banker's Safety Iterations</div>
            <div className="max-h-72 overflow-auto divide-y divide-slate-800/70">
              {bankers.steps.map(step => (
                <div key={step.stepNumber} className="px-4 py-3 text-xs">
                  <div className="flex justify-between">
                    <span className="font-mono text-blue-400">Step {step.stepNumber}: P{step.processIndex}</span>
                    <span className={step.selected ? 'text-emerald-400' : 'text-slate-500'}>{step.selected ? 'Selected' : 'Skip'}</span>
                  </div>
                  <div className="mt-1 text-slate-400">{step.message}</div>
                  <div className="mt-1 font-mono text-[11px] text-slate-500">Work: [{step.workBefore.join(', ')}] → [{step.workAfter.join(', ')}]</div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 overflow-hidden">
            <div className="px-4 py-3 bg-slate-900 text-sm font-semibold">Deadlock Detection Iterations</div>
            <div className="max-h-72 overflow-auto divide-y divide-slate-800/70">
              {detection.steps.map(step => (
                <div key={step.stepNumber} className="px-4 py-3 text-xs">
                  <div className="flex justify-between">
                    <span className="font-mono text-blue-400">Step {step.stepNumber}: P{step.processIndex}</span>
                    <span className={step.selected ? 'text-emerald-400' : 'text-slate-500'}>{step.selected ? 'Completes' : 'Blocked'}</span>
                  </div>
                  <div className="mt-1 text-slate-400">{step.message}</div>
                  <div className="mt-1 font-mono text-[11px] text-slate-500">Work: [{step.workBefore.join(', ')}] → [{step.workAfter.join(', ')}]</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
