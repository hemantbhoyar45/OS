import {
  ProcessInput,
  ProcessResult,
  GanttSegment,
  TimeStepState,
  TimeStepProcessState,
  ScheduleResult,
  SchedulerAlgorithmId
} from './schedulerTypes';

// Consolidate consecutive segments with same PID
function consolidateGantt(raw: GanttSegment[]): GanttSegment[] {
  if (raw.length === 0) return [];
  const clean: GanttSegment[] = [];
  for (const seg of raw) {
    if (seg.startTime >= seg.endTime) continue;
    if (clean.length > 0 && clean[clean.length - 1].pid === seg.pid && clean[clean.length - 1].endTime === seg.startTime) {
      clean[clean.length - 1].endTime = seg.endTime;
    } else {
      clean.push({ ...seg });
    }
  }
  return clean;
}

function finalizeScheduleResult(
  res: ScheduleResult,
  original: ProcessInput[],
  firstExec: Map<number, number>,
  completion: Map<number, number>
) {
  res.ganttChart = consolidateGantt(res.ganttChart);
  const n = original.length;
  if (n === 0) return;

  let totalTAT = 0;
  let totalWT = 0;
  let totalRT = 0;
  let maxCT = 0;
  let totalBusy = 0;

  for (const seg of res.ganttChart) {
    if (seg.pid !== -1) {
      totalBusy += (seg.endTime - seg.startTime);
    }
  }

  res.processResults = [];
  for (const p of original) {
    const ct = completion.get(p.pid) ?? p.arrivalTime;
    const tat = ct - p.arrivalTime;
    const wt = tat - p.burstTime;
    const fe = firstExec.get(p.pid) ?? p.arrivalTime;
    const rt = fe - p.arrivalTime;

    totalTAT += tat;
    totalWT += wt;
    totalRT += rt;
    if (ct > maxCT) maxCT = ct;

    res.processResults.push({
      pid: p.pid,
      name: p.name,
      arrivalTime: p.arrivalTime,
      burstTime: p.burstTime,
      priority: p.priority,
      completionTime: ct,
      turnaroundTime: tat,
      waitingTime: wt,
      responseTime: rt
    });
  }

  res.totalTime = maxCT;
  res.idleTime = Math.max(0, maxCT - totalBusy);
  res.avgTurnaroundTime = Number((totalTAT / n).toFixed(2));
  res.avgWaitingTime = Number((totalWT / n).toFixed(2));
  res.avgResponseTime = Number((totalRT / n).toFixed(2));
  res.cpuUtilization = maxCT > 0 ? Number(((totalBusy / maxCT) * 100).toFixed(1)) : 0;
  res.throughput = maxCT > 0 ? Number((n / maxCT).toFixed(3)) : 0;
}

export class CPUSchedulerEngine {
  // 1. FCFS
  public static scheduleFCFS(processes: ProcessInput[]): ScheduleResult {
    const res: ScheduleResult = {
      algorithm: 'First Come First Serve (FCFS)',
      algorithmId: 'fcfs',
      processResults: [],
      ganttChart: [],
      timelineSteps: [],
      avgTurnaroundTime: 0,
      avgWaitingTime: 0,
      avgResponseTime: 0,
      cpuUtilization: 0,
      throughput: 0,
      totalTime: 0,
      idleTime: 0
    };
    if (processes.length === 0) return res;

    const procs = [...processes].sort((a, b) => {
      if (a.arrivalTime !== b.arrivalTime) return a.arrivalTime - b.arrivalTime;
      return a.pid - b.pid;
    });

    const firstExec = new Map<number, number>();
    const completion = new Map<number, number>();
    let currentTime = 0;

    for (const p of procs) {
      if (currentTime < p.arrivalTime) {
        res.ganttChart.push({ pid: -1, processName: 'IDLE', startTime: currentTime, endTime: p.arrivalTime });
        currentTime = p.arrivalTime;
      }
      firstExec.set(p.pid, currentTime);
      const startTime = currentTime;
      const endTime = startTime + p.burstTime;
      res.ganttChart.push({ pid: p.pid, processName: p.name, startTime, endTime });
      currentTime = endTime;
      completion.set(p.pid, currentTime);
    }

    const maxT = currentTime;
    for (let t = 0; t <= maxT; t++) {
      const step: TimeStepState = {
        time: t,
        runningPid: -1,
        runningName: 'IDLE',
        readyQueuePids: [],
        processStates: [],
        log: ''
      };

      for (const seg of res.ganttChart) {
        if (t >= seg.startTime && t < seg.endTime) {
          step.runningPid = seg.pid;
          step.runningName = seg.processName;
          break;
        }
      }

      for (const p of procs) {
        const ct = completion.get(p.pid) ?? 0;
        const fe = firstExec.get(p.pid) ?? 0;
        let state: 0 | 1 | 2 | 3 = 0;
        let remBurst = p.burstTime;

        if (t < p.arrivalTime) {
          state = 0;
        } else if (t >= ct) {
          state = 3;
          remBurst = 0;
        } else if (p.pid === step.runningPid) {
          state = 2;
          remBurst = Math.max(0, p.burstTime - (t - fe));
        } else {
          state = 1;
          step.readyQueuePids.push(p.pid);
        }

        step.processStates.push({
          pid: p.pid,
          name: p.name,
          remainingBurst: remBurst,
          state
        });
      }

      if (step.runningPid !== -1) {
        step.log = `Time ${t}: ${step.runningName} is executing.`;
      } else if (t < maxT) {
        step.log = `Time ${t}: CPU is IDLE.`;
      } else {
        step.log = `Time ${t}: All processes completed.`;
      }

      res.timelineSteps.push(step);
    }

    finalizeScheduleResult(res, processes, firstExec, completion);
    return res;
  }

  // 2. SJF (Non-preemptive)
  public static scheduleSJF(processes: ProcessInput[]): ScheduleResult {
    const res: ScheduleResult = {
      algorithm: 'Shortest Job First (SJF Non-preemptive)',
      algorithmId: 'sjf',
      processResults: [],
      ganttChart: [],
      timelineSteps: [],
      avgTurnaroundTime: 0,
      avgWaitingTime: 0,
      avgResponseTime: 0,
      cpuUtilization: 0,
      throughput: 0,
      totalTime: 0,
      idleTime: 0
    };
    if (processes.length === 0) return res;

    const n = processes.length;
    const completed = new Array(n).fill(false);
    const firstExec = new Map<number, number>();
    const completion = new Map<number, number>();
    let completedCount = 0;
    let currentTime = 0;

    while (completedCount < n) {
      let bestIdx = -1;
      let minBurst = Infinity;

      for (let i = 0; i < n; i++) {
        if (!completed[i] && processes[i].arrivalTime <= currentTime) {
          if (processes[i].burstTime < minBurst) {
            minBurst = processes[i].burstTime;
            bestIdx = i;
          } else if (processes[i].burstTime === minBurst) {
            if (
              bestIdx === -1 ||
              processes[i].arrivalTime < processes[bestIdx].arrivalTime ||
              (processes[i].arrivalTime === processes[bestIdx].arrivalTime && processes[i].pid < processes[bestIdx].pid)
            ) {
              bestIdx = i;
            }
          }
        }
      }

      if (bestIdx === -1) {
        let nextArrival = Infinity;
        for (let i = 0; i < n; i++) {
          if (!completed[i] && processes[i].arrivalTime > currentTime) {
            if (processes[i].arrivalTime < nextArrival) nextArrival = processes[i].arrivalTime;
          }
        }
        if (nextArrival !== Infinity) {
          res.ganttChart.push({ pid: -1, processName: 'IDLE', startTime: currentTime, endTime: nextArrival });
          currentTime = nextArrival;
        } else {
          break;
        }
      } else {
        const p = processes[bestIdx];
        firstExec.set(p.pid, currentTime);
        const startTime = currentTime;
        const endTime = startTime + p.burstTime;
        res.ganttChart.push({ pid: p.pid, processName: p.name, startTime, endTime });
        currentTime = endTime;
        completion.set(p.pid, currentTime);
        completed[bestIdx] = true;
        completedCount++;
      }
    }

    const maxT = currentTime;
    for (let t = 0; t <= maxT; t++) {
      const step: TimeStepState = {
        time: t,
        runningPid: -1,
        runningName: 'IDLE',
        readyQueuePids: [],
        processStates: [],
        log: ''
      };

      for (const seg of res.ganttChart) {
        if (t >= seg.startTime && t < seg.endTime) {
          step.runningPid = seg.pid;
          step.runningName = seg.processName;
          break;
        }
      }

      for (const p of processes) {
        const ct = completion.get(p.pid) ?? 0;
        const fe = firstExec.get(p.pid) ?? 0;
        let state: 0 | 1 | 2 | 3 = 0;
        let remBurst = p.burstTime;

        if (t < p.arrivalTime) {
          state = 0;
        } else if (t >= ct) {
          state = 3;
          remBurst = 0;
        } else if (p.pid === step.runningPid) {
          state = 2;
          remBurst = Math.max(0, p.burstTime - (t - fe));
        } else {
          state = 1;
          step.readyQueuePids.push(p.pid);
        }

        step.processStates.push({ pid: p.pid, name: p.name, remainingBurst: remBurst, state });
      }

      if (step.runningPid !== -1) {
        step.log = `Time ${t}: ${step.runningName} executing (SJF Non-preemptive).`;
      } else if (t < maxT) {
        step.log = `Time ${t}: CPU is IDLE.`;
      } else {
        step.log = `Time ${t}: All processes finished.`;
      }
      res.timelineSteps.push(step);
    }

    finalizeScheduleResult(res, processes, firstExec, completion);
    return res;
  }

  // 3. SRTF (Preemptive SJF)
  public static scheduleSRTF(processes: ProcessInput[]): ScheduleResult {
    const res: ScheduleResult = {
      algorithm: 'Shortest Remaining Time First (SRTF Preemptive)',
      algorithmId: 'srtf',
      processResults: [],
      ganttChart: [],
      timelineSteps: [],
      avgTurnaroundTime: 0,
      avgWaitingTime: 0,
      avgResponseTime: 0,
      cpuUtilization: 0,
      throughput: 0,
      totalTime: 0,
      idleTime: 0
    };
    if (processes.length === 0) return res;

    const n = processes.length;
    const remBurst = processes.map((p) => p.burstTime);
    const firstExec = new Map<number, number>();
    const completion = new Map<number, number>();
    let completedCount = 0;
    let t = 0;
    const unitSegments: GanttSegment[] = [];

    while (completedCount < n && t < 1000) {
      let bestIdx = -1;
      let minRem = Infinity;

      for (let i = 0; i < n; i++) {
        if (remBurst[i] > 0 && processes[i].arrivalTime <= t) {
          if (remBurst[i] < minRem) {
            minRem = remBurst[i];
            bestIdx = i;
          } else if (remBurst[i] === minRem) {
            if (
              bestIdx === -1 ||
              processes[i].arrivalTime < processes[bestIdx].arrivalTime ||
              (processes[i].arrivalTime === processes[bestIdx].arrivalTime && processes[i].pid < processes[bestIdx].pid)
            ) {
              bestIdx = i;
            }
          }
        }
      }

      const step: TimeStepState = {
        time: t,
        runningPid: -1,
        runningName: 'IDLE',
        readyQueuePids: [],
        processStates: [],
        log: ''
      };

      if (bestIdx === -1) {
        unitSegments.push({ pid: -1, processName: 'IDLE', startTime: t, endTime: t + 1 });
        step.runningPid = -1;
        step.runningName = 'IDLE';
        step.log = `Time ${t}: CPU is IDLE (No process arrived yet).`;
      } else {
        if (!firstExec.has(processes[bestIdx].pid)) {
          firstExec.set(processes[bestIdx].pid, t);
        }
        unitSegments.push({
          pid: processes[bestIdx].pid,
          processName: processes[bestIdx].name,
          startTime: t,
          endTime: t + 1
        });
        step.runningPid = processes[bestIdx].pid;
        step.runningName = processes[bestIdx].name;

        remBurst[bestIdx]--;
        if (remBurst[bestIdx] === 0) {
          completion.set(processes[bestIdx].pid, t + 1);
          completedCount++;
        }
        step.log = `Time ${t}: ${step.runningName} executing (Remaining Burst: ${remBurst[bestIdx]}).`;
      }

      for (let i = 0; i < n; i++) {
        let state: 0 | 1 | 2 | 3 = 0;
        if (t < processes[i].arrivalTime) {
          state = 0;
        } else if (remBurst[i] === 0 && (completion.get(processes[i].pid) ?? Infinity) <= t) {
          state = 3;
        } else if (i === bestIdx) {
          state = 2;
        } else {
          state = 1;
          step.readyQueuePids.push(processes[i].pid);
        }
        step.processStates.push({
          pid: processes[i].pid,
          name: processes[i].name,
          remainingBurst: remBurst[i],
          state
        });
      }

      res.timelineSteps.push(step);
      t++;
    }

    res.ganttChart = consolidateGantt(unitSegments);
    finalizeScheduleResult(res, processes, firstExec, completion);
    return res;
  }

  // 4. Round Robin (RR)
  public static scheduleRR(processes: ProcessInput[], timeQuantum: number = 2): ScheduleResult {
    const tq = Math.max(1, timeQuantum);
    const res: ScheduleResult = {
      algorithm: `Round Robin (RR, TQ=${tq})`,
      algorithmId: 'rr',
      processResults: [],
      ganttChart: [],
      timelineSteps: [],
      avgTurnaroundTime: 0,
      avgWaitingTime: 0,
      avgResponseTime: 0,
      cpuUtilization: 0,
      throughput: 0,
      totalTime: 0,
      idleTime: 0
    };
    if (processes.length === 0) return res;

    const procs = [...processes].sort((a, b) => {
      if (a.arrivalTime !== b.arrivalTime) return a.arrivalTime - b.arrivalTime;
      return a.pid - b.pid;
    });

    const n = procs.length;
    const remBurst = procs.map((p) => p.burstTime);
    const inQueueOrDone = new Array(n).fill(false);
    const firstExec = new Map<number, number>();
    const completion = new Map<number, number>();

    const readyQ: number[] = [];
    let currentTime = 0;
    let completedCount = 0;

    const pushArrived = (upToTime: number) => {
      for (let i = 0; i < n; i++) {
        if (!inQueueOrDone[i] && procs[i].arrivalTime <= upToTime) {
          readyQ.push(i);
          inQueueOrDone[i] = true;
        }
      }
    };

    pushArrived(currentTime);

    while (completedCount < n && currentTime < 1000) {
      if (readyQ.length === 0) {
        let nextArrival = Infinity;
        for (let i = 0; i < n; i++) {
          if (!inQueueOrDone[i] && procs[i].arrivalTime > currentTime) {
            if (procs[i].arrivalTime < nextArrival) nextArrival = procs[i].arrivalTime;
          }
        }
        if (nextArrival !== Infinity) {
          res.ganttChart.push({ pid: -1, processName: 'IDLE', startTime: currentTime, endTime: nextArrival });
          currentTime = nextArrival;
          pushArrived(currentTime);
        } else {
          break;
        }
        continue;
      }

      const currIdx = readyQ.shift()!;
      if (!firstExec.has(procs[currIdx].pid)) {
        firstExec.set(procs[currIdx].pid, currentTime);
      }

      const slice = Math.min(tq, remBurst[currIdx]);
      const startTime = currentTime;
      const endTime = startTime + slice;
      res.ganttChart.push({
        pid: procs[currIdx].pid,
        processName: procs[currIdx].name,
        startTime,
        endTime
      });

      currentTime = endTime;
      remBurst[currIdx] -= slice;

      // Arriving processes during execution slice added before re-queuing
      pushArrived(currentTime);

      if (remBurst[currIdx] > 0) {
        readyQ.push(currIdx);
      } else {
        completion.set(procs[currIdx].pid, currentTime);
        completedCount++;
      }
    }

    const maxT = currentTime;
    for (let t = 0; t <= maxT; t++) {
      const step: TimeStepState = {
        time: t,
        runningPid: -1,
        runningName: 'IDLE',
        readyQueuePids: [],
        processStates: [],
        log: ''
      };

      for (const seg of res.ganttChart) {
        if (t >= seg.startTime && t < seg.endTime) {
          step.runningPid = seg.pid;
          step.runningName = seg.processName;
          break;
        }
      }

      for (const p of procs) {
        const ct = completion.get(p.pid) ?? 0;
        const fe = firstExec.get(p.pid) ?? 0;
        let state: 0 | 1 | 2 | 3 = 0;
        let rb = p.burstTime;

        if (t < p.arrivalTime) {
          state = 0;
        } else if (t >= ct) {
          state = 3;
          rb = 0;
        } else if (p.pid === step.runningPid) {
          state = 2;
          rb = Math.max(0, p.burstTime - (t - fe));
        } else {
          state = 1;
          step.readyQueuePids.push(p.pid);
        }
        step.processStates.push({ pid: p.pid, name: p.name, remainingBurst: rb, state });
      }

      if (step.runningPid !== -1) {
        step.log = `Time ${t}: ${step.runningName} executing under Round Robin.`;
      } else if (t < maxT) {
        step.log = `Time ${t}: CPU is IDLE.`;
      } else {
        step.log = `Time ${t}: All processes finished.`;
      }
      res.timelineSteps.push(step);
    }

    finalizeScheduleResult(res, processes, firstExec, completion);
    return res;
  }

  // 5. Priority Scheduling (Non-preemptive)
  public static schedulePriorityNonPreemptive(
    processes: ProcessInput[],
    lowerIsHigher: boolean = true
  ): ScheduleResult {
    const res: ScheduleResult = {
      algorithm: 'Priority Scheduling (Non-preemptive)',
      algorithmId: 'priority_np',
      processResults: [],
      ganttChart: [],
      timelineSteps: [],
      avgTurnaroundTime: 0,
      avgWaitingTime: 0,
      avgResponseTime: 0,
      cpuUtilization: 0,
      throughput: 0,
      totalTime: 0,
      idleTime: 0
    };
    if (processes.length === 0) return res;

    const n = processes.length;
    const completed = new Array(n).fill(false);
    const firstExec = new Map<number, number>();
    const completion = new Map<number, number>();
    let completedCount = 0;
    let currentTime = 0;

    const isHigher = (p1: number, p2: number) => (lowerIsHigher ? p1 < p2 : p1 > p2);

    while (completedCount < n) {
      let bestIdx = -1;

      for (let i = 0; i < n; i++) {
        if (!completed[i] && processes[i].arrivalTime <= currentTime) {
          if (bestIdx === -1) {
            bestIdx = i;
          } else if (isHigher(processes[i].priority, processes[bestIdx].priority)) {
            bestIdx = i;
          } else if (processes[i].priority === processes[bestIdx].priority) {
            if (
              processes[i].arrivalTime < processes[bestIdx].arrivalTime ||
              (processes[i].arrivalTime === processes[bestIdx].arrivalTime && processes[i].pid < processes[bestIdx].pid)
            ) {
              bestIdx = i;
            }
          }
        }
      }

      if (bestIdx === -1) {
        let nextArrival = Infinity;
        for (let i = 0; i < n; i++) {
          if (!completed[i] && processes[i].arrivalTime > currentTime) {
            if (processes[i].arrivalTime < nextArrival) nextArrival = processes[i].arrivalTime;
          }
        }
        if (nextArrival !== Infinity) {
          res.ganttChart.push({ pid: -1, processName: 'IDLE', startTime: currentTime, endTime: nextArrival });
          currentTime = nextArrival;
        } else {
          break;
        }
      } else {
        const p = processes[bestIdx];
        firstExec.set(p.pid, currentTime);
        const startTime = currentTime;
        const endTime = startTime + p.burstTime;
        res.ganttChart.push({ pid: p.pid, processName: p.name, startTime, endTime });
        currentTime = endTime;
        completion.set(p.pid, currentTime);
        completed[bestIdx] = true;
        completedCount++;
      }
    }

    const maxT = currentTime;
    for (let t = 0; t <= maxT; t++) {
      const step: TimeStepState = {
        time: t,
        runningPid: -1,
        runningName: 'IDLE',
        readyQueuePids: [],
        processStates: [],
        log: ''
      };

      for (const seg of res.ganttChart) {
        if (t >= seg.startTime && t < seg.endTime) {
          step.runningPid = seg.pid;
          step.runningName = seg.processName;
          break;
        }
      }

      for (const p of processes) {
        const ct = completion.get(p.pid) ?? 0;
        const fe = firstExec.get(p.pid) ?? 0;
        let state: 0 | 1 | 2 | 3 = 0;
        let rb = p.burstTime;

        if (t < p.arrivalTime) {
          state = 0;
        } else if (t >= ct) {
          state = 3;
          rb = 0;
        } else if (p.pid === step.runningPid) {
          state = 2;
          rb = Math.max(0, p.burstTime - (t - fe));
        } else {
          state = 1;
          step.readyQueuePids.push(p.pid);
        }
        step.processStates.push({ pid: p.pid, name: p.name, remainingBurst: rb, state });
      }

      if (step.runningPid !== -1) {
        step.log = `Time ${t}: ${step.runningName} running (Priority Non-preemptive).`;
      } else if (t < maxT) {
        step.log = `Time ${t}: CPU is IDLE.`;
      } else {
        step.log = `Time ${t}: All processes finished.`;
      }
      res.timelineSteps.push(step);
    }

    finalizeScheduleResult(res, processes, firstExec, completion);
    return res;
  }

  // 6. Priority Scheduling (Preemptive)
  public static schedulePriorityPreemptive(
    processes: ProcessInput[],
    lowerIsHigher: boolean = true
  ): ScheduleResult {
    const res: ScheduleResult = {
      algorithm: 'Priority Scheduling (Preemptive)',
      algorithmId: 'priority_p',
      processResults: [],
      ganttChart: [],
      timelineSteps: [],
      avgTurnaroundTime: 0,
      avgWaitingTime: 0,
      avgResponseTime: 0,
      cpuUtilization: 0,
      throughput: 0,
      totalTime: 0,
      idleTime: 0
    };
    if (processes.length === 0) return res;

    const n = processes.length;
    const remBurst = processes.map((p) => p.burstTime);
    const firstExec = new Map<number, number>();
    const completion = new Map<number, number>();
    let completedCount = 0;
    let t = 0;
    const unitSegments: GanttSegment[] = [];

    const isHigher = (p1: number, p2: number) => (lowerIsHigher ? p1 < p2 : p1 > p2);

    while (completedCount < n && t < 1000) {
      let bestIdx = -1;

      for (let i = 0; i < n; i++) {
        if (remBurst[i] > 0 && processes[i].arrivalTime <= t) {
          if (bestIdx === -1) {
            bestIdx = i;
          } else if (isHigher(processes[i].priority, processes[bestIdx].priority)) {
            bestIdx = i;
          } else if (processes[i].priority === processes[bestIdx].priority) {
            if (
              processes[i].arrivalTime < processes[bestIdx].arrivalTime ||
              (processes[i].arrivalTime === processes[bestIdx].arrivalTime && remBurst[i] < remBurst[bestIdx]) ||
              (processes[i].arrivalTime === processes[bestIdx].arrivalTime && remBurst[i] === remBurst[bestIdx] && processes[i].pid < processes[bestIdx].pid)
            ) {
              bestIdx = i;
            }
          }
        }
      }

      const step: TimeStepState = {
        time: t,
        runningPid: -1,
        runningName: 'IDLE',
        readyQueuePids: [],
        processStates: [],
        log: ''
      };

      if (bestIdx === -1) {
        unitSegments.push({ pid: -1, processName: 'IDLE', startTime: t, endTime: t + 1 });
        step.runningPid = -1;
        step.runningName = 'IDLE';
        step.log = `Time ${t}: CPU IDLE.`;
      } else {
        if (!firstExec.has(processes[bestIdx].pid)) {
          firstExec.set(processes[bestIdx].pid, t);
        }
        unitSegments.push({
          pid: processes[bestIdx].pid,
          processName: processes[bestIdx].name,
          startTime: t,
          endTime: t + 1
        });
        step.runningPid = processes[bestIdx].pid;
        step.runningName = processes[bestIdx].name;

        remBurst[bestIdx]--;
        if (remBurst[bestIdx] === 0) {
          completion.set(processes[bestIdx].pid, t + 1);
          completedCount++;
        }
        step.log = `Time ${t}: ${step.runningName} executing (Priority: ${processes[bestIdx].priority}, Remaining: ${remBurst[bestIdx]}).`;
      }

      for (let i = 0; i < n; i++) {
        let state: 0 | 1 | 2 | 3 = 0;
        if (t < processes[i].arrivalTime) {
          state = 0;
        } else if (remBurst[i] === 0 && (completion.get(processes[i].pid) ?? Infinity) <= t) {
          state = 3;
        } else if (i === bestIdx) {
          state = 2;
        } else {
          state = 1;
          step.readyQueuePids.push(processes[i].pid);
        }
        step.processStates.push({
          pid: processes[i].pid,
          name: processes[i].name,
          remainingBurst: remBurst[i],
          state
        });
      }

      res.timelineSteps.push(step);
      t++;
    }

    res.ganttChart = consolidateGantt(unitSegments);
    finalizeScheduleResult(res, processes, firstExec, completion);
    return res;
  }

  // Run selected algorithm
  public static runAlgorithm(
    algoId: SchedulerAlgorithmId,
    processes: ProcessInput[],
    timeQuantum: number = 2,
    lowerIsHigher: boolean = true
  ): ScheduleResult {
    switch (algoId) {
      case 'fcfs':
        return this.scheduleFCFS(processes);
      case 'sjf':
        return this.scheduleSJF(processes);
      case 'srtf':
        return this.scheduleSRTF(processes);
      case 'rr':
        return this.scheduleRR(processes, timeQuantum);
      case 'priority_np':
        return this.schedulePriorityNonPreemptive(processes, lowerIsHigher);
      case 'priority_p':
        return this.schedulePriorityPreemptive(processes, lowerIsHigher);
      default:
        return this.scheduleFCFS(processes);
    }
  }

  // Compare all 6 algorithms
  public static compareAll(
    processes: ProcessInput[],
    timeQuantum: number = 2,
    lowerIsHigher: boolean = true
  ): ScheduleResult[] {
    return [
      this.scheduleFCFS(processes),
      this.scheduleSJF(processes),
      this.scheduleSRTF(processes),
      this.scheduleRR(processes, timeQuantum),
      this.schedulePriorityNonPreemptive(processes, lowerIsHigher),
      this.schedulePriorityPreemptive(processes, lowerIsHigher)
    ];
  }
}
