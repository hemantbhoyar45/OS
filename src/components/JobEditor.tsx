import React, { useState } from 'react';
import {
  Terminal,
  Play,
  RotateCcw,
  Copy,
  Check,
  Download,
  Upload,
  Sparkles,
  FileText
} from 'lucide-react';
import { SimulationSnapshot } from '../engine/types';
import { PRESET_JOBS } from '../engine/presets';

interface JobEditorProps {
  snapshot: SimulationSnapshot;
  inputCode: string;
  onCodeChange: (newCode: string) => void;
  onLoadAndRun: () => void;
  onReset: () => void;
  onSelectPreset: (presetId: string) => void;
  selectedPresetId: string;
}

export const JobEditor: React.FC<JobEditorProps> = ({
  snapshot,
  inputCode,
  onCodeChange,
  onLoadAndRun,
  onReset,
  onSelectPreset,
  selectedPresetId
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopyOutput = () => {
    navigator.clipboard.writeText(snapshot.output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const currentPreset = PRESET_JOBS.find(p => p.id === selectedPresetId);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Terminal className="w-5 h-5 text-emerald-400" />
              Job Editor & Output Console
            </h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              input.txt ⇄ output.txt
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Author custom control cards, instructions, and data lines. Verify real output formatted identically to <code>output.txt</code>.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onLoadAndRun}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg shadow-emerald-600/25 transition-all"
          >
            <Play className="w-4 h-4" />
            <span>Load & Run All</span>
          </button>
          <button
            onClick={onReset}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Preset Details Banner */}
      {currentPreset && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 text-xs space-y-1.5">
          <div className="flex items-center gap-2 font-semibold text-white">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Preset: {currentPreset.name}</span>
          </div>
          <p className="text-slate-300 text-[11px] leading-relaxed">
            {currentPreset.description}
          </p>
          <div className="text-[11px] text-amber-300 font-mono pt-1">
            Expected: {currentPreset.expectedOutcome}
          </div>
        </div>
      )}

      {/* Split Editor / Console */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Input Editor */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-400" />
              <h3 className="text-sm font-semibold text-white font-mono">input.txt (Job Cards)</h3>
            </div>
            <div className="text-[11px] text-slate-400 font-mono">
              $AMJ → Code → $DTA → Data → $END
            </div>
          </div>

          <textarea
            value={inputCode}
            onChange={(e) => onCodeChange(e.target.value)}
            rows={16}
            className="w-full bg-slate-950 text-slate-100 font-mono text-xs rounded-xl p-4 border border-slate-800 focus:outline-none focus:border-blue-500 leading-relaxed resize-none selection:bg-blue-600/30"
            placeholder="$AMJ000100150003&#10;GD10GD20PD10H&#10;$DTA&#10;HELLO&#10;$END0001"
            spellCheck={false}
          />

          <div className="text-[11px] text-slate-400 space-y-1">
            <div>• <strong className="text-slate-300">$AMJ:</strong> 4-digit Job ID + 4-digit TTL (Time Limit) + 4-digit TLL (Line Limit)</div>
            <div>• <strong className="text-slate-300">Instructions:</strong> 4-char words (GDXX, PDXX, LRXX, SRXX, CRXX, BTXX, H)</div>
            <div>• <strong className="text-slate-300">$DTA &amp; $END:</strong> Data section marker and job boundary</div>
          </div>
        </div>

        {/* Right: Output Console */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-semibold text-white font-mono">output.txt (Simulation Output)</h3>
            </div>

            <button
              onClick={handleCopyOutput}
              disabled={!snapshot.output}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-all disabled:opacity-30"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied!' : 'Copy'}</span>
            </button>
          </div>

          <div className="relative flex-1">
            <pre className="w-full h-80 bg-slate-950 text-emerald-400 font-mono text-xs rounded-xl p-4 border border-slate-800 overflow-y-auto whitespace-pre-wrap leading-relaxed">
              {snapshot.output || (
                <span className="text-slate-600 italic">
                  [No output generated yet. Run the job to inspect output.txt contents]
                </span>
              )}
            </pre>
          </div>

          {snapshot.isTerminated && (
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs font-mono flex items-center justify-between">
              <span className="text-slate-400">Final Job Status:</span>
              <span className="text-amber-400 font-bold">
                {snapshot.terminationReason || 'Terminated'}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
