import React, { useState } from 'react';
import {
  Layers,
  Search,
  Filter,
  Eye,
  Info,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { SimulationSnapshot, MemoryWord } from '../engine/types';

interface MemoryVisualizerProps {
  snapshot: SimulationSnapshot;
}

export const MemoryVisualizer: React.FC<MemoryVisualizerProps> = ({ snapshot }) => {
  const [selectedWord, setSelectedWord] = useState<MemoryWord | null>(null);
  const [filterFrame, setFilterFrame] = useState<number | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const isPhase2 = snapshot.phase === 2;
  const numBlocks = isPhase2 ? 30 : 10;
  const wordsPerBlock = 10;

  // Filter memory
  const filteredMemory = snapshot.memory.filter((w) => {
    if (filterFrame !== 'all' && w.frame !== filterFrame) return false;
    if (searchQuery.trim().length > 0) {
      const matchAddr = String(w.address).includes(searchQuery);
      const matchContent = w.content.toLowerCase().includes(searchQuery.toLowerCase());
      return matchAddr || matchContent;
    }
    return true;
  });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-400" />
              Physical Memory Visualizer
            </h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-mono bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              {isPhase2 ? '300 Words (30 Blocks x 10 Words)' : '100 Words (Sequential M[100][4])'}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time inspection of hardware words, page table blocks, and allocated program data.
          </p>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-purple-600/80 border border-purple-400" />
            <span className="text-slate-300">Page Table (PTR)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-blue-600/80 border border-blue-400" />
            <span className="text-slate-300">Program Code</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-emerald-600/80 border border-emerald-400" />
            <span className="text-slate-300">Data Buffer</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-slate-950 border border-slate-800" />
            <span className="text-slate-400">Free Word</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 max-w-sm">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search address or word content..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 text-xs rounded-xl pl-9 pr-3 py-2 border border-slate-800 text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
            />
          </div>
        </div>

        {isPhase2 && (
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs text-slate-400">Filter Frame:</span>
            <select
              value={filterFrame}
              onChange={(e) =>
                setFilterFrame(e.target.value === 'all' ? 'all' : Number(e.target.value))
              }
              className="bg-slate-950 text-xs rounded-xl px-3 py-1.5 border border-slate-800 text-slate-300 focus:outline-none font-mono"
            >
              <option value="all">All 30 Frames</option>
              {Array.from({ length: 30 }).map((_, f) => (
                <option key={f} value={f}>
                  Frame {f} (RA {f * 10} - {f * 10 + 9})
                  {f === snapshot.registers.PTR ? ' [PTR]' : ''}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Grid of Blocks / Words */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {Array.from({ length: isPhase2 ? (filterFrame === 'all' ? 30 : 1) : 10 }).map((_, blockIdx) => {
          const actualBlock = filterFrame === 'all' ? blockIdx : filterFrame;
          const isPTR = isPhase2 && actualBlock === snapshot.registers.PTR;
          const blockWords = snapshot.memory.slice(actualBlock * 10, (actualBlock + 1) * 10);
          const hasContent = blockWords.some(w => w.content.trim().length > 0);

          return (
            <div
              key={actualBlock}
              className={`rounded-2xl border p-4 transition-all ${
                isPTR
                  ? 'bg-purple-950/20 border-purple-500/40 shadow-lg shadow-purple-900/10'
                  : hasContent
                  ? 'bg-slate-900/90 border-slate-800'
                  : 'bg-slate-950/50 border-slate-900'
              }`}
            >
              <div className="flex items-center justify-between mb-3 border-b border-slate-800/80 pb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-white">
                    {isPhase2 ? `Frame ${actualBlock}` : `Block ${actualBlock}`}
                  </span>
                  {isPTR && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      PAGE TABLE
                    </span>
                  )}
                </div>
                <span className="text-[11px] font-mono text-slate-500">
                  RA {actualBlock * 10} - {actualBlock * 10 + 9}
                </span>
              </div>

              {/* Words inside this block */}
              <div className="space-y-1">
                {blockWords.map((word) => {
                  const isWordPTR = isPhase2 && word.frame === snapshot.registers.PTR;
                  const isSelected = selectedWord?.address === word.address;
                  const isTrimmedEmpty = word.content.trim().length === 0;

                  let cellColor = 'bg-slate-950 text-slate-500 border-slate-800/60';
                  if (isWordPTR) {
                    cellColor = 'bg-purple-900/30 text-purple-300 border-purple-500/40 font-bold';
                  } else if (word.type === 'code' && !isTrimmedEmpty) {
                    cellColor = 'bg-blue-900/30 text-blue-300 border-blue-500/40 font-bold';
                  } else if (word.type === 'data' && !isTrimmedEmpty) {
                    cellColor = 'bg-emerald-900/30 text-emerald-300 border-emerald-500/40 font-bold';
                  }

                  return (
                    <button
                      key={word.address}
                      onClick={() => setSelectedWord(word)}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-xs font-mono transition-all text-left ${cellColor} ${
                        isSelected ? 'ring-2 ring-blue-500 border-blue-400' : 'hover:border-slate-700'
                      }`}
                    >
                      <span className="text-slate-500 text-[11px]">
                        [{String(word.address).padStart(3, '0')}]
                      </span>

                      <div className="flex items-center gap-1 font-bold">
                        {Array.from(word.content).map((c, i) => (
                          <span
                            key={i}
                            className={`w-4 text-center ${
                              c === ' ' ? 'text-slate-600' : ''
                            }`}
                          >
                            {c === ' ' ? '·' : c}
                          </span>
                        ))}
                      </div>

                      <span className="text-[10px] text-slate-500">
                        off:{word.offset}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Word Inspector Modal / Drawer */}
      {selectedWord && (
        <div className="fixed bottom-4 right-4 bg-slate-900 border border-slate-700 rounded-2xl p-4 shadow-2xl z-50 max-w-sm w-full space-y-3 font-mono text-xs">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="font-bold text-white flex items-center gap-1.5 font-sans">
              <Eye className="w-4 h-4 text-blue-400" /> Word Inspector
            </span>
            <button
              onClick={() => setSelectedWord(null)}
              className="text-slate-400 hover:text-white text-sm"
            >
              ✕
            </button>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-400">Physical Address (RA):</span>
              <span className="text-blue-400 font-bold">{selectedWord.address}</span>
            </div>
            {isPhase2 && (
              <>
                <div className="flex justify-between">
                  <span className="text-slate-400">Frame Number:</span>
                  <span className="text-purple-400 font-bold">{selectedWord.frame}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Block Offset:</span>
                  <span className="text-slate-200 font-bold">{selectedWord.offset}</span>
                </div>
              </>
            )}
            <div className="flex justify-between items-center pt-1 border-t border-slate-800">
              <span className="text-slate-400">Raw 4 Bytes:</span>
              <div className="flex gap-1">
                {Array.from(selectedWord.content).map((c, i) => (
                  <span
                    key={i}
                    className="w-6 h-6 rounded bg-slate-950 border border-slate-800 text-center flex items-center justify-center font-bold text-white"
                  >
                    {c === ' ' ? '·' : c}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
