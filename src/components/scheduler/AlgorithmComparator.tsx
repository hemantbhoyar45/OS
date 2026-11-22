import React from 'react';
import { ScheduleResult, SchedulerAlgorithmId } from '../../engine/schedulerTypes';
import { GanttChart } from './GanttChart';
import { Award, Zap, CheckCircle2, TrendingUp } from 'lucide-react';

interface AlgorithmComparatorProps {
  results: ScheduleResult[];
  onSelectAlgorithm: (algoId: SchedulerAlgorithmId) => void;
}

export const AlgorithmComparator: React.FC<AlgorithmComparatorProps> = ({
  results,
  onSelectAlgorithm
}) => {
  if (results.length === 0) return null;

  // Find optimal algorithm for Average Waiting Time
  const minWaitTime = Math.min(...results.map((r) => r.avgWaitingTime));
  const minTAT = Math.min(...results.map((r) => r.avgTurnaroundTime));
  const maxTotalTime = Math.max(...results.map((r) => r.totalTime));

  return (
    <div className="space-y-6">
      {/* Benchmark Summary Cards */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-400" />
            All 6 Algorithms Benchmark Matrix
          </h3>
          <span className="text-xs text-slate-400">Same process workload evaluated side-by-side</span>
        </div>

        <div className="overflow-x-auto bg-slate-950 rounded-xl border border-slate-800">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 bg-slate-900/60 text-left">
                <th className="py-2.5 px-3">Algorithm</th>
                <th className="py-2.5 px-3 text-emerald-400">Avg Waiting Time (WT)</th>
                <th className="py-2.5 px-3 text-blue-400">Avg Turnaround Time (TAT)</th>
                <th className="py-2.5 px-3 text-purple-400">Avg Response Time (RT)</th>
                <th className="py-2.5 px-3 text-cyan-400">CPU Utilization</th>
                <th className="py-2.5 px-3">Total Time</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {results.map((res) => {
                const isOptimalWT = res.avgWaitingTime === minWaitTime;
                const isOptimalTAT = res.avgTurnaroundTime === minTAT;

                return (
                  <tr
                    key={res.algorithmId}
                    className={`hover:bg-slate-900/40 transition-colors ${
                      isOptimalWT ? 'bg-emerald-950/20' : ''
                    }`}
                  >
                    <td className="py-2.5 px-3 font-semibold text-white flex items-center gap-1.5">
                      {isOptimalWT && (
                        <span className="w-2 h-2 rounded-full bg-emerald-400" title="Optimal Waiting Time" />
                      )}
                      <span>{res.algorithm}</span>
                    </td>
                    <td className="py-2.5 px-3 font-bold text-emerald-400">
                      {res.avgWaitingTime}
                      {isOptimalWT && (
                        <span className="ml-1.5 text-[10px] px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-sans">
                          Best
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-blue-400">
                      {res.avgTurnaroundTime}
                      {isOptimalTAT && (
                        <span className="ml-1.5 text-[10px] px-1 py-0.2 rounded bg-blue-500/20 text-blue-300 font-sans">
                          Best
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-purple-400">{res.avgResponseTime}</td>
                    <td className="py-2.5 px-3 text-cyan-400">{res.cpuUtilization}%</td>
                    <td className="py-2.5 px-3 text-slate-300">{res.totalTime} units</td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => onSelectAlgorithm(res.algorithmId)}
                        className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-blue-400 hover:text-blue-300 text-xs font-sans font-medium transition-all"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Side-by-Side Gantt Charts */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-5">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-cyan-400" />
          Comparative Gantt Timelines (Normalized Time Scale)
        </h3>

        <div className="space-y-4">
          {results.map((res) => (
            <div key={res.algorithmId} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="font-semibold text-slate-200">{res.algorithm}</span>
                <span className="text-slate-400">
                  Avg WT: <strong className="text-emerald-400">{res.avgWaitingTime}</strong> | Avg TAT: <strong className="text-blue-400">{res.avgTurnaroundTime}</strong>
                </span>
              </div>
              <GanttChart
                segments={res.ganttChart}
                totalTime={maxTotalTime}
                isInteractive={false}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
