import React from 'react';
import { ProcessResult, ScheduleResult } from '../../engine/schedulerTypes';
import { Clock, Zap, CheckCircle2, Activity } from 'lucide-react';

interface ProcessResultTableProps {
  result: ScheduleResult;
}

export const ProcessResultTable: React.FC<ProcessResultTableProps> = ({ result }) => {
  return (
    <div className="space-y-4">
      {/* Metric KPI Chips */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
          <span className="text-[10px] uppercase text-slate-400 font-mono block">Avg Turnaround</span>
          <span className="text-base font-bold font-mono text-blue-400">
            {result.avgTurnaroundTime}
          </span>
          <span className="text-[10px] text-slate-500 block">TAT = CT - AT</span>
        </div>

        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
          <span className="text-[10px] uppercase text-slate-400 font-mono block">Avg Waiting Time</span>
          <span className="text-base font-bold font-mono text-emerald-400">
            {result.avgWaitingTime}
          </span>
          <span className="text-[10px] text-slate-500 block">WT = TAT - BT</span>
        </div>

        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
          <span className="text-[10px] uppercase text-slate-400 font-mono block">Avg Response Time</span>
          <span className="text-base font-bold font-mono text-purple-400">
            {result.avgResponseTime}
          </span>
          <span className="text-[10px] text-slate-500 block">RT = FirstCPU - AT</span>
        </div>

        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
          <span className="text-[10px] uppercase text-slate-400 font-mono block">CPU Utilization</span>
          <span className="text-base font-bold font-mono text-cyan-400">
            {result.cpuUtilization}%
          </span>
          <span className="text-[10px] text-slate-500 block">Busy / Total Time</span>
        </div>

        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
          <span className="text-[10px] uppercase text-slate-400 font-mono block">Total Time</span>
          <span className="text-base font-bold font-mono text-amber-400">
            {result.totalTime} units
          </span>
          <span className="text-[10px] text-slate-500 block">Idle: {result.idleTime} units</span>
        </div>

        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
          <span className="text-[10px] uppercase text-slate-400 font-mono block">Throughput</span>
          <span className="text-base font-bold font-mono text-white">
            {result.throughput}
          </span>
          <span className="text-[10px] text-slate-500 block">procs / time unit</span>
        </div>
      </div>

      {/* Main Process Execution Table */}
      <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-x-auto">
        <table className="w-full text-xs font-mono">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400 bg-slate-900/60 text-left">
              <th className="py-2.5 px-3">PID</th>
              <th className="py-2.5 px-3">Process Name</th>
              <th className="py-2.5 px-3">Arrival Time (AT)</th>
              <th className="py-2.5 px-3">Burst Time (BT)</th>
              <th className="py-2.5 px-3">Priority</th>
              <th className="py-2.5 px-3 text-blue-400">Completion Time (CT)</th>
              <th className="py-2.5 px-3 text-emerald-400">Turnaround Time (TAT)</th>
              <th className="py-2.5 px-3 text-amber-400">Waiting Time (WT)</th>
              <th className="py-2.5 px-3 text-purple-400">Response Time (RT)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {result.processResults.map((pr) => (
              <tr key={pr.pid} className="hover:bg-slate-900/40 text-slate-300 transition-colors">
                <td className="py-2 px-3 font-bold text-white">P{pr.pid}</td>
                <td className="py-2 px-3 font-semibold text-slate-200">{pr.name}</td>
                <td className="py-2 px-3">{pr.arrivalTime}</td>
                <td className="py-2 px-3">{pr.burstTime}</td>
                <td className="py-2 px-3">{pr.priority}</td>
                <td className="py-2 px-3 font-bold text-blue-300">{pr.completionTime}</td>
                <td className="py-2 px-3 font-bold text-emerald-300">{pr.turnaroundTime}</td>
                <td className="py-2 px-3 font-bold text-amber-300">{pr.waitingTime}</td>
                <td className="py-2 px-3 font-bold text-purple-300">{pr.responseTime}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
