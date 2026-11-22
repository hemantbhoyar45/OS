import React, { useState, useEffect, useRef } from 'react';
import {
  ReplacementAlgorithmId,
  PageReplacementResult,
  ReplacementPreset
} from '../../engine/memoryManagerTypes';
import { REPLACEMENT_PRESETS } from '../../engine/memoryPresets';
import { MemoryManagerEngine } from '../../engine/memoryManagerEngine';
import {
  Play,
  Pause,
  RotateCcw,
  StepForward,
  Layers,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Award
} from 'lucide-react';

interface PageReplacementVisualizerProps {
  algorithm: ReplacementAlgorithmId;
  onSelectAlgorithm: (algo: ReplacementAlgorithmId) => void;
}

export const PageReplacementVisualizer: React.FC<PageReplacementVisualizerProps> = ({
  algorithm,
  onSelectAlgorithm
}) => {
  const defaultPreset = REPLACEMENT_PRESETS[0];
  const [selectedPresetId, setSelectedPresetId] = useState<string>(defaultPreset.id);
  const [refString, setRefString] = useState<number[]>(defaultPreset.referenceString);
  const [frameCount, setFrameCount] = useState<number>(defaultPreset.frameCount);

  // Playback state
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [speed, setSpeed] = useState<number>(400);
  const timerRef = useRef<any>(null);

  // Simulate
  const result: PageReplacementResult =
    algorithm === 'FIFO'
      ? MemoryManagerEngine.simulateFIFO(refString, frameCount)
      : algorithm === 'LRU'
      ? MemoryManagerEngine.simulateLRU(refString, frameCount)
      : MemoryManagerEngine.simulateOptimal(refString, frameCount);

  const handleSelectPreset = (presetId: string) => {
    const p = REPLACEMENT_PRESETS.find((pr) => pr.id === presetId);
    if (!p) return;
    setSelectedPresetId(p.id);
    setRefString(p.referenceString);
    setFrameCount(p.frameCount);
    setCurrentStepIndex(0);
    setIsPlaying(false);
  };

  const handleStep = () => {
    if (currentStepIndex < result.steps.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      setIsPlaying(false);
    }
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentStepIndex(0);
  };

  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        setCurrentStepIndex((prev) => {
          if (prev < result.steps.length - 1) {
            return prev + 1;
          } else {
            setIsPlaying(false);
            return prev;
          }
        });
      }, speed);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, speed, result.steps.length]);

  const currentStep = result.steps[currentStepIndex];

  return (
    <div className="space-y-6">
      {/* Top Header & Preset Config */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-purple-400" />
            <h3 className="text-sm font-semibold text-white">
              Page Replacement Algorithm Simulator ({result.algorithm})
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
              {REPLACEMENT_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Algorithm Tabs & Frame Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            {(['FIFO', 'LRU', 'Optimal'] as ReplacementAlgorithmId[]).map((algo) => (
              <button
                key={algo}
                onClick={() => {
                  onSelectAlgorithm(algo);
                  setCurrentStepIndex(0);
                }}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                  algorithm === algo
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {algo}
              </button>
            ))}
          </div>

          {/* Frame count selector & Playback */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded-xl border border-slate-800 text-xs font-mono">
              <span className="text-slate-400">Frames:</span>
              <select
                value={frameCount}
                onChange={(e) => {
                  setFrameCount(Number(e.target.value));
                  setCurrentStepIndex(0);
                }}
                className="bg-slate-900 text-white rounded px-2 py-0.5 border border-slate-700"
              >
                {[3, 4, 5, 6].map((num) => (
                  <option key={num} value={num}>
                    {num} Frames
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className={`px-3 py-1 rounded-lg text-xs font-medium flex items-center gap-1 ${
                  isPlaying ? 'bg-amber-600 text-white' : 'bg-emerald-600 text-white'
                }`}
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{isPlaying ? 'Pause' : 'Play'}</span>
              </button>

              <button
                onClick={handleStep}
                disabled={currentStepIndex >= result.steps.length - 1}
                className="p-1.5 rounded-lg text-slate-300 hover:text-white disabled:opacity-30"
                title="Single Step"
              >
                <StepForward className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={handleReset}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white"
                title="Reset"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Reference String Badges with Current Step Pointer */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-mono text-slate-400">
            Page Reference String ({refString.length} references):
          </span>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 pt-1 font-mono text-xs">
            {refString.map((pNum, idx) => {
              const isCurrent = idx === currentStepIndex;
              const hasPassed = idx <= currentStepIndex;
              const stepData = result.steps[idx];

              return (
                <div
                  key={idx}
                  onClick={() => {
                    setIsPlaying(false);
                    setCurrentStepIndex(idx);
                  }}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold shrink-0 cursor-pointer transition-all border ${
                    isCurrent
                      ? 'ring-2 ring-purple-400 bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                      : hasPassed
                      ? stepData?.isHit
                        ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/40'
                        : 'bg-rose-950/40 text-rose-400 border-rose-500/40'
                      : 'bg-slate-950 text-slate-500 border-slate-800'
                  }`}
                  title={`Ref #${idx + 1}: Page ${pNum}`}
                >
                  {pNum}
                </div>
              );
            })}
          </div>
        </div>

        {/* Current Step Action Message */}
        {currentStep && (
          <div className={`p-3 rounded-xl border flex items-center gap-2 text-xs font-mono ${
            currentStep.isHit
              ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
              : 'bg-rose-950/30 border-rose-500/40 text-rose-300'
          }`}>
            {currentStep.isHit ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
            )}
            <span>
              Reference #{currentStep.stepIndex + 1} (Page {currentStep.pageNumber}): {currentStep.action}
            </span>
          </div>
        )}
      </div>

      {/* Frame Table Visual Matrix */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-white flex items-center justify-between">
          <span>Page Frame Contents Matrix Over Time</span>
          <span className="text-xs font-mono text-slate-400">
            {frameCount} Physical Frames Allocated
          </span>
        </h3>

        <div className="overflow-x-auto bg-slate-950 rounded-xl border border-slate-800 p-3">
          <div className="space-y-2 min-w-max">
            {/* Headers: Ref Index */}
            <div className="flex items-center gap-2 font-mono text-xs text-slate-400 pb-1 border-b border-slate-800">
              <span className="w-20 font-bold">Ref Page:</span>
              {refString.map((p, i) => (
                <span
                  key={i}
                  className={`w-9 text-center font-bold ${
                    i === currentStepIndex ? 'text-purple-400' : 'text-slate-300'
                  }`}
                >
                  {p}
                </span>
              ))}
            </div>

            {/* Frame Rows */}
            {Array.from({ length: frameCount }).map((_, fIdx) => (
              <div key={fIdx} className="flex items-center gap-2 font-mono text-xs">
                <span className="w-20 text-slate-500">Frame {fIdx}:</span>
                {result.steps.map((st, i) => {
                  const val = st.frames[fIdx];
                  const isCurrentCol = i === currentStepIndex;
                  return (
                    <div
                      key={i}
                      className={`w-9 h-8 rounded-lg flex items-center justify-center font-bold border ${
                        val === -1
                          ? 'bg-slate-900/40 text-slate-600 border-slate-850'
                          : isCurrentCol
                          ? 'bg-purple-950/60 border-purple-500 text-purple-300 ring-1 ring-purple-400'
                          : 'bg-slate-900 text-slate-200 border-slate-800'
                      }`}
                    >
                      {val === -1 ? '·' : val}
                    </div>
                  );
                })}
              </div>
            ))}

            {/* Hit / Fault Status Row */}
            <div className="flex items-center gap-2 font-mono text-xs pt-2 border-t border-slate-800">
              <span className="w-20 font-bold text-slate-400">Result:</span>
              {result.steps.map((st, i) => (
                <span
                  key={i}
                  className={`w-9 text-center font-bold ${
                    st.isHit ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {st.isHit ? 'H' : 'F'}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <span className="text-[10px] uppercase text-slate-400 font-mono block">Total References</span>
          <span className="text-xl font-bold font-mono text-white">{result.totalReferences}</span>
          <span className="text-[10px] text-slate-500 block">Memory Accesses</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <span className="text-[10px] uppercase text-slate-400 font-mono block">Page Hits</span>
          <span className="text-xl font-bold font-mono text-emerald-400">{result.pageHits}</span>
          <span className="text-[10px] text-slate-500 block">Hit Ratio: {result.hitRatio}%</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <span className="text-[10px] uppercase text-slate-400 font-mono block">Page Faults</span>
          <span className="text-xl font-bold font-mono text-rose-400">{result.pageFaults}</span>
          <span className="text-[10px] text-slate-500 block">Fault Ratio: {result.faultRatio}%</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <span className="text-[10px] uppercase text-slate-400 font-mono block">Efficiency Rating</span>
          <span className="text-xl font-bold font-mono text-purple-400">
            {result.algorithm === 'Optimal' ? 'Theoretical Best' : `${result.hitRatio}%`}
          </span>
          <span className="text-[10px] text-slate-500 block">Relative to Optimal</span>
        </div>
      </div>
    </div>
  );
};
