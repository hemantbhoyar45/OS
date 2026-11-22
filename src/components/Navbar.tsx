import React from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  StepForward,
  FastForward,
  Cpu,
  Layers,
  Sparkles,
  Menu
} from 'lucide-react';
import { PhaseMode } from '../engine/types';
import { PRESET_JOBS } from '../engine/presets';

interface NavbarProps {
  phase: PhaseMode;
  onPhaseChange: (phase: PhaseMode) => void;
  isRunning: boolean;
  onTogglePlay: () => void;
  onStep: () => void;
  onReset: () => void;
  onRunAll: () => void;
  speed: number;
  onSpeedChange: (speed: number) => void;
  selectedPresetId: string;
  onSelectPreset: (presetId: string) => void;
  isTerminated: boolean;
  onMenuToggle?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  phase,
  onPhaseChange,
  isRunning,
  onTogglePlay,
  onStep,
  onReset,
  onRunAll,
  speed,
  onSpeedChange,
  selectedPresetId,
  onSelectPreset,
  isTerminated,
  onMenuToggle
}) => {
  return (
    <header className="h-16 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 flex items-center justify-between sticky top-0 z-40">
      {/* Brand & Mode Toggle */}
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuToggle}
          className="md:hidden p-2 rounded-lg border border-slate-700 text-slate-300"
          aria-label="Open navigation"
        >
          <Menu className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Cpu className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-white flex items-center gap-2">
              MOS Simulator
              <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                v2.0
              </span>
            </h1>
            <p className="text-[11px] text-slate-400">Multiprogramming OS Platform</p>
          </div>
        </div>

        {/* Phase Toggle */}
        <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => onPhaseChange(1)}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
              phase === 1
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Phase 1 (Batch)
          </button>
          <button
            onClick={() => onPhaseChange(2)}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 ${
              phase === 2
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Phase 2 (Paging & Interrupts)
          </button>
        </div>
      </div>

      {/* Preset Selector */}
      <div className="hidden lg:flex items-center gap-2">
        <span className="text-xs text-slate-400 flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          Preset:
        </span>
        <select
          value={selectedPresetId}
          onChange={(e) => onSelectPreset(e.target.value)}
          className="bg-slate-950 text-slate-200 text-xs rounded-lg px-3 py-1.5 border border-slate-700/80 focus:outline-none focus:border-blue-500 max-w-xs truncate"
        >
          {PRESET_JOBS.map((job) => (
            <option key={job.id} value={job.id}>
              {job.name}
            </option>
          ))}
        </select>
      </div>

      {/* Execution Controls */}
      <div className="flex items-center gap-3">
        {/* Speed slider */}
        <div className="hidden sm:flex items-center gap-2 bg-slate-950/80 px-2.5 py-1 rounded-lg border border-slate-800">
          <span className="text-[11px] text-slate-400">Delay:</span>
          <input
            type="range"
            min="50"
            max="1200"
            step="50"
            value={speed}
            onChange={(e) => onSpeedChange(Number(e.target.value))}
            className="w-16 accent-blue-500 cursor-pointer h-1.5"
            title={`${speed}ms delay`}
          />
          <span className="text-[11px] text-blue-400 font-mono w-10 text-right">{speed}ms</span>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800">
          <button
            onClick={onTogglePlay}
            disabled={isTerminated}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              isRunning
                ? 'bg-amber-600 hover:bg-amber-500 text-white'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-50 disabled:cursor-not-allowed'
            }`}
            title={isRunning ? 'Pause execution' : 'Run step-by-step'}
          >
            {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isRunning ? 'Pause' : 'Run'}</span>
          </button>

          <button
            onClick={onStep}
            disabled={isRunning || isTerminated}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            title="Execute single CPU step"
          >
            <StepForward className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Step</span>
          </button>

          <button
            onClick={onRunAll}
            disabled={isRunning || isTerminated}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium bg-slate-800 hover:bg-slate-700 text-cyan-300 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            title="Run complete job to finish"
          >
            <FastForward className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Run All</span>
          </button>

          <button
            onClick={onReset}
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-all"
            title="Reset CPU and reload input"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
