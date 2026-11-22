import React, { useState, useEffect, useRef } from 'react';
import {
  Cpu,
  Play,
  Pause,
  RotateCcw,
  StepForward,
  StepBack,
  Sliders,
  TrendingUp,
  Award,
  Terminal,
  Layers,
  Sparkles,
  HelpCircle,
  Binary
} from 'lucide-react';
import {
  ProcessInput,
  SchedulerAlgorithmId,
  ScheduleResult
} from '../../engine/schedulerTypes';
import { SCHEDULER_PRESETS } from '../../engine/schedulerPresets';
import { CPUSchedulerEngine } from '../../engine/cpuSchedulerEngine';
import { GanttChart } from './GanttChart';
import { ReadyQueueVisualizer } from './ReadyQueueVisualizer';
import { ProcessResultTable } from './ProcessResultTable';
import { ProcessInputTable } from './ProcessInputTable';
import { AlgorithmComparator } from './AlgorithmComparator';

export const SchedulerDashboard: React.FC = () => {
  // Active View
  const [activeView, setActiveView] = useState<'single' | 'compare' | 'wasm_test'>('single');

  // Workload state
  const defaultPreset = SCHEDULER_PRESETS[0];
  const [selectedPresetId, setSelectedPresetId] = useState<string>(defaultPreset.id);
  const [processes, setProcesses] = useState<ProcessInput[]>(defaultPreset.processes);
  const [timeQuantum, setTimeQuantum] = useState<number>(defaultPreset.timeQuantum);
  const [lowerIsHigherPriority, setLowerIsHigherPriority] = useState<boolean>(
    defaultPreset.lowerIsHigherPriority
  );
  const [selectedAlgorithm, setSelectedAlgorithm] = useState<SchedulerAlgorithmId>('fcfs');

  // Calculated Results
  const [scheduleResult, setScheduleResult] = useState<ScheduleResult>(() =>
    CPUSchedulerEngine.runAlgorithm(
      selectedAlgorithm,
      processes,
      timeQuantum,
      lowerIsHigherPriority
    )
  );

  const [allResults, setAllResults] = useState<ScheduleResult[]>(() =>
    CPUSchedulerEngine.compareAll(processes, timeQuantum, lowerIsHigherPriority)
  );

  // Playback / Step-by-Step state
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [speed, setSpeed] = useState<number>(400); // ms per step
  const timerRef = useRef<any>(null);

  // Re-run schedule whenever inputs or algorithm change
  useEffect(() => {
    const res = CPUSchedulerEngine.runAlgorithm(
      selectedAlgorithm,
      processes,
      timeQuantum,
      lowerIsHigherPriority
    );
    setScheduleResult(res);

    const comp = CPUSchedulerEngine.compareAll(
      processes,
      timeQuantum,
      lowerIsHigherPriority
    );
    setAllResults(comp);

    // Reset step index
    setCurrentStepIndex(0);
    if (isPlaying) setIsPlaying(false);
  }, [processes, selectedAlgorithm, timeQuantum, lowerIsHigherPriority]);

  // Handle Preset Select
  const handleSelectPreset = (presetId: string) => {
    const preset = SCHEDULER_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setSelectedPresetId(preset.id);
    setProcesses(preset.processes);
    setTimeQuantum(preset.timeQuantum);
    setLowerIsHigherPriority(preset.lowerIsHigherPriority);
  };

  // Step Controls
  const handleStepForward = () => {
    if (currentStepIndex < scheduleResult.timelineSteps.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      setIsPlaying(false);
    }
  };

  const handleStepBackward = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  const handleResetPlayback = () => {
    setIsPlaying(false);
    setCurrentStepIndex(0);
  };

  const handleTogglePlay = () => {
    if (isPlaying) {
      setIsPlaying(false);
    } else {
      if (currentStepIndex >= scheduleResult.timelineSteps.length - 1) {
        setCurrentStepIndex(0);
      }
      setIsPlaying(true);
    }
  };

  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        setCurrentStepIndex((prev) => {
          if (prev < scheduleResult.timelineSteps.length - 1) {
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
  }, [isPlaying, speed, scheduleResult.timelineSteps.length]);

  const currentStep = scheduleResult.timelineSteps[currentStepIndex];
  const currentTime = currentStep?.time ?? 0;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner & View Switcher */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Cpu className="w-5 h-5 text-indigo-400" />
              CPU Scheduling Simulator &amp; Benchmarking Platform
            </h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-mono bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              C++ Engine &amp; WebAssembly
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Simulate FCFS, SJF, SRTF, Round Robin, and Priority scheduling with interactive Gantt timelines and live ready queue inspection.
          </p>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => setActiveView('single')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeView === 'single'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Algorithm Visualizer
          </button>
          <button
            onClick={() => setActiveView('compare')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
              activeView === 'compare'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            Comparison Matrix
          </button>
        </div>
      </div>

      {/* Process Input Configuration Panel */}
      <ProcessInputTable
        processes={processes}
        onProcessesChange={setProcesses}
        timeQuantum={timeQuantum}
        onTimeQuantumChange={setTimeQuantum}
        lowerIsHigherPriority={lowerIsHigherPriority}
        onTogglePriorityConvention={setLowerIsHigherPriority}
        selectedAlgorithm={selectedAlgorithm}
        onSelectAlgorithm={setSelectedAlgorithm}
        selectedPresetId={selectedPresetId}
        onSelectPreset={handleSelectPreset}
      />

      {/* VIEW 1: Single Algorithm Visualizer */}
      {activeView === 'single' && (
        <div className="space-y-6">
          {/* Gantt Chart & Step Controls */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <span>Interactive Gantt Chart</span>
                  <span className="text-xs font-mono text-blue-400">
                    ({scheduleResult.algorithm})
                  </span>
                </h3>
                <span className="text-xs text-slate-400">
                  Total Time: {scheduleResult.totalTime} units | Time Step: {currentTime}
                </span>
              </div>

              {/* Step Controls */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800 text-xs">
                  <span className="text-slate-400 text-[11px]">Speed:</span>
                  <input
                    type="range"
                    min="100"
                    max="1000"
                    step="50"
                    value={speed}
                    onChange={(e) => setSpeed(Number(e.target.value))}
                    className="w-16 accent-indigo-500 h-1.5 cursor-pointer"
                  />
                  <span className="font-mono text-indigo-400 text-[10px] w-9 text-right">{speed}ms</span>
                </div>

                <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
                  <button
                    onClick={handleStepBackward}
                    disabled={currentStepIndex === 0}
                    className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 rounded hover:bg-slate-800"
                    title="Step backward"
                  >
                    <StepBack className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={handleTogglePlay}
                    className={`px-3 py-1 rounded-md text-xs font-medium flex items-center gap-1 transition-all ${
                      isPlaying
                        ? 'bg-amber-600 hover:bg-amber-500 text-white'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    }`}
                  >
                    {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    <span>{isPlaying ? 'Pause' : 'Play'}</span>
                  </button>

                  <button
                    onClick={handleStepForward}
                    disabled={currentStepIndex >= scheduleResult.timelineSteps.length - 1}
                    className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 rounded hover:bg-slate-800"
                    title="Step forward"
                  >
                    <StepForward className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={handleResetPlayback}
                    className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800"
                    title="Reset to t=0"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Gantt Chart Component */}
            <GanttChart
              segments={scheduleResult.ganttChart}
              totalTime={scheduleResult.totalTime}
              currentTime={currentTime}
            />

            {/* Timeline Scrub Slider */}
            <div className="flex items-center gap-3 pt-2 border-t border-slate-800/80">
              <span className="text-[11px] font-mono text-slate-400 whitespace-nowrap">
                Scrubber: t = {currentTime}
              </span>
              <input
                type="range"
                min="0"
                max={Math.max(0, scheduleResult.timelineSteps.length - 1)}
                value={currentStepIndex}
                onChange={(e) => {
                  setIsPlaying(false);
                  setCurrentStepIndex(Number(e.target.value));
                }}
                className="flex-1 accent-indigo-500 cursor-pointer h-1.5"
              />
              <span className="text-[11px] font-mono text-slate-500 whitespace-nowrap">
                max t = {scheduleResult.totalTime}
              </span>
            </div>
          </div>

          {/* Ready Queue & CPU Status */}
          <ReadyQueueVisualizer currentStep={currentStep} />

          {/* Results Table & Performance Metrics */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-white">
              Process Performance Metrics &amp; Calculations
            </h3>
            <ProcessResultTable result={scheduleResult} />
          </div>
        </div>
      )}

      {/* VIEW 2: Comparison Matrix */}
      {activeView === 'compare' && (
        <AlgorithmComparator
          results={allResults}
          onSelectAlgorithm={(algoId) => {
            setSelectedAlgorithm(algoId);
            setActiveView('single');
          }}
        />
      )}
    </div>
  );
};
