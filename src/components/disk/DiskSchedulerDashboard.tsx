import React, { useEffect, useMemo, useRef, useState } from 'react';
import { HardDrive, Pause, Play, RotateCcw, StepForward, TrendingUp } from 'lucide-react';
import { DiskSchedulerEngine } from '../../engine/diskSchedulerEngine';
import { DiskAlgorithmId, DiskDirection, DiskScheduleResult } from '../../engine/diskSchedulerTypes';

const ALGORITHMS: { id: DiskAlgorithmId; name: string }[] = [
  { id: 'fcfs', name: 'FCFS' },
  { id: 'sstf', name: 'SSTF' },
  { id: 'scan', name: 'SCAN' },
  { id: 'cscan', name: 'C-SCAN' },
  { id: 'look', name: 'LOOK' },
  { id: 'clook', name: 'C-LOOK' }
];

export const DiskSchedulerDashboard: React.FC = () => {
  const [requestText, setRequestText] = useState('98,183,37,122,14,124,65,67');
  const [headText, setHeadText] = useState('53');
  const [minText, setMinText] = useState('0');
  const [maxText, setMaxText] = useState('199');
  const [direction, setDirection] = useState<DiskDirection>('UP');
  const [algorithm, setAlgorithm] = useState<DiskAlgorithmId>('scan');
  const [stepIndex, setStepIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(500);
  const timerRef = useRef<any>(null);

  const requests = useMemo(() =>
    requestText.split(/[\s,]+/).filter(Boolean).map(Number).filter(Number.isFinite),
  [requestText]);
  const head = Number(headText);
  const min = Number(minText);
  const max = Number(maxText);

  const allResults = useMemo(
    () => DiskSchedulerEngine.compareAll(requests, head, min, max, direction),
    [requests, head, min, max, direction]
  );
  const result: DiskScheduleResult = allResults.find((item) => item.algorithmId === algorithm) ?? allResults[0];

  useEffect(() => {
    setStepIndex(0);
    setPlaying(false);
  }, [requestText, headText, minText, maxText, direction, algorithm]);

  useEffect(() => {
    if (!playing) return;
    timerRef.current = setInterval(() => {
      setStepIndex((current) => {
        if (current >= result.steps.length - 1) {
          setPlaying(false);
          return current;
        }
        return current + 1;
      });
    }, speed);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [playing, speed, result.steps.length]);

  const graphSteps = result.steps.slice(0, stepIndex + 1);
  const graphWidth = 760;
  const graphHeight = 300;
  const padX = 52;
  const padY = 30;
  const graphPositions = [head, ...graphSteps.map((step) => step.toPosition)];
  const scaleX = (index: number) => padX + (graphPositions.length <= 1 ? 0 : index * (graphWidth - padX * 2) / (graphPositions.length - 1));
  const scaleY = (position: number) => padY + ((max - position) / Math.max(1, max - min)) * (graphHeight - padY * 2);
  const points = graphPositions.map((position, index) =>
    `${scaleX(index)},${scaleY(position)}`
  );

  const currentPosition = graphSteps.length
    ? graphSteps[graphSteps.length - 1].toPosition
    : head;

  return (
    <div className="min-h-full pb-12">
      <div className="bg-slate-900 border-b border-slate-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-600/15 text-cyan-400 border border-cyan-500/30">
            <HardDrive className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Disk Scheduling Simulator</h1>
            <p className="text-xs text-slate-400 mt-0.5">FCFS, SSTF, SCAN, C-SCAN, LOOK, and C-LOOK.</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        <div className="grid lg:grid-cols-[1fr_1.4fr] gap-6">
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 space-y-4">
            <div className="text-sm font-semibold">Disk Configuration</div>
            <label className="block text-xs text-slate-400">
              Request queue
              <input value={requestText} onChange={(event) => setRequestText(event.target.value)}
                className="mt-2 w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2.5 font-mono text-slate-100" />
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                ['Initial head', headText, setHeadText],
                ['Minimum cylinder', minText, setMinText],
                ['Maximum cylinder', maxText, setMaxText]
              ].map(([label, value, setter]) => (
                <label key={String(label)} className="text-xs text-slate-400">
                  {String(label)}
                  <input type="number" value={String(value)}
                    onChange={(event) => (setter as React.Dispatch<React.SetStateAction<string>>)(event.target.value)}
                    className="mt-2 w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 font-mono text-slate-100" />
                </label>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-xs text-slate-400">
                Initial direction
                <select value={direction} onChange={(event) => setDirection(event.target.value as DiskDirection)}
                  className="mt-2 w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2">
                  <option value="UP">UP / Increasing</option>
                  <option value="DOWN">DOWN / Decreasing</option>
                </select>
              </label>
              <label className="text-xs text-slate-400">
                Animation speed
                <input type="range" min={100} max={1200} step={100} value={speed}
                  onChange={(event) => setSpeed(Number(event.target.value))}
                  className="mt-3 w-full" />
              </label>
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-semibold">{result.algorithm}</div>
              <div className="text-xs font-mono text-cyan-400">Current head: {currentPosition}</div>
            </div>
            <div className="overflow-x-auto">
              <svg viewBox={`0 0 ${graphWidth} ${graphHeight}`} className="w-full min-w-[620px] h-[300px]">
                {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                  const y = padY + ratio * (graphHeight - padY * 2);
                  const position = Math.round(max - ratio * (max - min));
                  return (
                    <g key={ratio}>
                      <line x1={padX} x2={graphWidth - padX} y1={y} y2={y} stroke="#1e293b" />
                      <text x={8} y={y + 4} fill="#64748b" fontSize="10">{position}</text>
                    </g>
                  );
                })}
                {points.length > 1 && (
                  <polyline fill="none" stroke="#22d3ee" strokeWidth="3"
                    points={points.join(' ')} />
                )}
                {graphPositions.map((position, index) => (
                  <circle key={index}
                    cx={scaleX(index)} cy={scaleY(position)}
                    r={index === graphPositions.length - 1 ? 7 : 4}
                    fill={index === graphPositions.length - 1 ? '#22d3ee' : '#0f172a'}
                    stroke="#22d3ee" />
                ))}
                {points.length === 0 && (
                  <text x={graphWidth / 2} y={graphHeight / 2} textAnchor="middle" fill="#64748b" fontSize="12">
                    Press play or step forward
                  </text>
                )}
              </svg>
            </div>
            <div className="flex items-center gap-2 mt-3">
              <button onClick={() => setPlaying((value) => !value)} disabled={!result.steps.length}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-cyan-600 text-xs font-semibold disabled:opacity-40">
                {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                {playing ? 'Pause' : 'Play'}
              </button>
              <button onClick={() => setStepIndex((value) => Math.min(value + 1, result.steps.length - 1))}
                disabled={stepIndex >= result.steps.length - 1}
                className="p-2 rounded-lg border border-slate-700 text-slate-300 disabled:opacity-40">
                <StepForward className="w-4 h-4" />
              </button>
              <button onClick={() => { setPlaying(false); setStepIndex(0); }} className="p-2 rounded-lg border border-slate-700 text-slate-300">
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {ALGORITHMS.map((item) => (
            <button key={item.id} onClick={() => setAlgorithm(item.id)}
              className={`px-3 py-2 rounded-lg border text-xs font-semibold ${algorithm === item.id
                ? 'border-cyan-500 bg-cyan-600/15 text-cyan-300'
                : 'border-slate-700 bg-slate-900 text-slate-400'}`}>
              {item.name}
            </button>
          ))}
        </div>

        <div className="grid lg:grid-cols-[1fr_1fr] gap-6">
          <div className="rounded-xl border border-slate-800 overflow-hidden">
            <div className="px-4 py-3 bg-slate-900 text-sm font-semibold">Servicing Steps</div>
            <div className="max-h-72 overflow-auto divide-y divide-slate-800/70">
              {result.steps.map((step, index) => (
                <div key={step.stepNumber}
                  className={`px-4 py-3 text-xs flex items-center justify-between ${index <= stepIndex ? 'opacity-100' : 'opacity-35'}`}>
                  <div>
                    <span className="font-mono text-cyan-400">Step {step.stepNumber + 1}</span>
                    <span className="ml-3 text-slate-300">{step.fromPosition} → {step.toPosition}</span>
                  </div>
                  <div className="font-mono text-slate-400">
                    seek {step.seekDistance} | cumulative {step.cumulativeMovement}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 overflow-hidden">
            <div className="px-4 py-3 bg-slate-900 flex items-center gap-2 text-sm font-semibold">
              <TrendingUp className="w-4 h-4 text-cyan-400" /> Algorithm Comparison
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-950 text-slate-500">
                  <tr><th className="px-3 py-2 text-left">Algorithm</th><th className="px-3 py-2">Movement</th><th className="px-3 py-2">Avg Seek</th></tr>
                </thead>
                <tbody>
                  {allResults.map((item) => (
                    <tr key={item.algorithmId} className="border-t border-slate-800">
                      <td className="px-3 py-2 font-semibold text-slate-300">{item.algorithm}</td>
                      <td className="px-3 py-2 text-center font-mono">{item.totalHeadMovement}</td>
                      <td className="px-3 py-2 text-center font-mono">{item.averageSeekDistance}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 p-4">
          <div className="text-xs text-slate-400 mb-2">Servicing Order</div>
          <div className="flex flex-wrap items-center gap-2">
            {result.servicingOrder.map((cylinder, index) => (
              <React.Fragment key={`${cylinder}-${index}`}>
                <span className="px-2.5 py-1 rounded-lg bg-cyan-600/15 border border-cyan-500/30 text-cyan-300 font-mono text-xs">{cylinder}</span>
                {index < result.servicingOrder.length - 1 && <span className="text-slate-600">→</span>}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
