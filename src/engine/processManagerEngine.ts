import {
  ProcessState,
  PCBData,
  TransitionEvent,
  ProcessManagerSnapshot
} from './processManagerTypes';

export class ProcessManagerEngine {
  private currentTime: number = 0;
  private nextPid: number = 1;
  private runningPid: number = -1;
  private isContextSwitching: boolean = false;
  private contextSwitchTimeRemaining: number = 0;
  private contextSwitchOverhead: number = 1;
  private schedulingPolicy: 'FCFS' | 'RR' | 'PRIORITY' | 'SJF' = 'RR';
  private timeQuantum: number = 2;
  private lowerIsHigherPriority: boolean = true;

  private processes: Map<number, PCBData> = new Map();
  private newQueue: number[] = [];
  private readyQueue: number[] = [];
  private waitingQueue: number[] = [];
  private terminatedQueue: number[] = [];
  private eventLog: TransitionEvent[] = [];

  private totalContextSwitches: number = 0;
  private totalCpuBusyTime: number = 0;
  private totalCpuIdleTime: number = 0;

  constructor(csOverhead: number = 1, policy: 'FCFS' | 'RR' | 'PRIORITY' | 'SJF' = 'RR', tq: number = 2) {
    this.contextSwitchOverhead = csOverhead;
    this.schedulingPolicy = policy;
    this.timeQuantum = tq;
    this.reset();
  }

  public reset() {
    this.currentTime = 0;
    this.nextPid = 1;
    this.runningPid = -1;
    this.isContextSwitching = false;
    this.contextSwitchTimeRemaining = 0;
    this.totalContextSwitches = 0;
    this.totalCpuBusyTime = 0;
    this.totalCpuIdleTime = 0;

    this.processes.clear();
    this.newQueue = [];
    this.readyQueue = [];
    this.waitingQueue = [];
    this.terminatedQueue = [];
    this.eventLog = [];
  }

  public setContextSwitchOverhead(overhead: number) {
    this.contextSwitchOverhead = Math.max(0, overhead);
  }

  public setSchedulingPolicy(policy: 'FCFS' | 'RR' | 'PRIORITY' | 'SJF', tq: number = 2, lowerIsHigher: boolean = true) {
    this.schedulingPolicy = policy;
    this.timeQuantum = Math.max(1, tq);
    this.lowerIsHigherPriority = lowerIsHigher;
    this.sortReadyQueue();
  }

  public isValidTransition(from: ProcessState, to: ProcessState): boolean {
    if (from === to) return false;
    switch (from) {
      case 'NEW':
        return to === 'READY' || to === 'TERMINATED';
      case 'READY':
        return to === 'RUNNING' || to === 'TERMINATED';
      case 'RUNNING':
        return to === 'READY' || to === 'WAITING' || to === 'TERMINATED';
      case 'WAITING':
        return to === 'READY' || to === 'TERMINATED';
      case 'TERMINATED':
        return false;
      default:
        return false;
    }
  }

  private logEvent(pid: number, from: ProcessState, to: ProcessState, trigger: string, details: string) {
    const pcb = this.processes.get(pid);
    const ev: TransitionEvent = {
      id: Math.random().toString(36).substring(2, 9),
      time: this.currentTime,
      pid,
      processName: pcb ? pcb.name : `P${pid}`,
      fromState: from,
      toState: to,
      trigger,
      details
    };
    this.eventLog.push(ev);
    if (this.eventLog.length > 200) this.eventLog.shift();
  }

  private sortReadyQueue() {
    if (this.readyQueue.length <= 1) return;

    if (this.schedulingPolicy === 'PRIORITY') {
      this.readyQueue.sort((a, b) => {
        const pA = this.processes.get(a)?.priority ?? 0;
        const pB = this.processes.get(b)?.priority ?? 0;
        if (pA !== pB) {
          return this.lowerIsHigherPriority ? pA - pB : pB - pA;
        }
        return (this.processes.get(a)?.arrivalTime ?? 0) - (this.processes.get(b)?.arrivalTime ?? 0);
      });
    } else if (this.schedulingPolicy === 'SJF') {
      this.readyQueue.sort((a, b) => {
        const rA = this.processes.get(a)?.remainingTime ?? 0;
        const rB = this.processes.get(b)?.remainingTime ?? 0;
        if (rA !== rB) return rA - rB;
        return (this.processes.get(a)?.arrivalTime ?? 0) - (this.processes.get(b)?.arrivalTime ?? 0);
      });
    }
    // FCFS and RR use FIFO
  }

  public createProcess(name?: string, burstTime: number = 4, priority: number = 2, arrivalTime: number = 0): number {
    const pid = this.nextPid++;
    const pcb: PCBData = {
      pid,
      name: name && name.trim().length > 0 ? name : `P${pid}`,
      state: 'NEW',
      priority,
      arrivalTime: arrivalTime >= 0 ? arrivalTime : this.currentTime,
      burstTime: Math.max(1, burstTime),
      remainingTime: Math.max(1, burstTime),
      registers: {
        IR: 'GD10',
        R: '    ',
        PC: 0,
        C: false,
        PTR: pid % 30
      },
      timeQuantumSlice: 0,
      waitReason: 'None',
      ioRemainingTicks: 0,
      ttl: 15,
      tll: 5,
      ttc: 0,
      llc: 0,
      contextSwitches: 0,
      memoryBase: (pid - 1) * 10,
      memoryLimit: 10,
      allocatedFrames: [pid % 30]
    };

    this.processes.set(pid, pcb);
    this.newQueue.push(pid);
    this.logEvent(pid, 'NEW', 'NEW', 'Create', `Initialized ${pcb.name} (Burst: ${pcb.burstTime}, Priority: ${pcb.priority})`);
    return pid;
  }

  public admitProcess(pid: number): boolean {
    const pcb = this.processes.get(pid);
    if (!pcb || !this.isValidTransition(pcb.state, 'READY')) return false;

    this.newQueue = this.newQueue.filter((id) => id !== pid);
    const oldState = pcb.state;
    pcb.state = 'READY';
    this.readyQueue.push(pid);
    this.sortReadyQueue();

    this.logEvent(pid, oldState, 'READY', 'Admit', `${pcb.name} admitted to Ready Queue.`);
    return true;
  }

  public dispatchProcess(pid?: number): boolean {
    if (this.readyQueue.length === 0 && (pid === undefined || pid === -1)) return false;

    const targetPid = pid !== undefined && pid !== -1 ? pid : this.readyQueue[0];
    const pcb = this.processes.get(targetPid);
    if (!pcb || !this.isValidTransition(pcb.state, 'RUNNING')) return false;

    // If another process is currently running, preempt it
    if (this.runningPid !== -1 && this.runningPid !== targetPid) {
      this.preemptProcess('Context Switch Preemption');
    }

    this.readyQueue = this.readyQueue.filter((id) => id !== targetPid);
    const oldState = pcb.state;
    pcb.state = 'RUNNING';
    pcb.timeQuantumSlice = 0;
    pcb.contextSwitches++;
    this.totalContextSwitches++;
    this.runningPid = targetPid;

    if (this.contextSwitchOverhead > 0) {
      this.isContextSwitching = true;
      this.contextSwitchTimeRemaining = this.contextSwitchOverhead;
    }

    this.logEvent(targetPid, oldState, 'RUNNING', 'Dispatch', `Dispatched ${pcb.name} to CPU core.`);
    return true;
  }

  public preemptProcess(reason: string = 'Preempted / Time Slice'): boolean {
    if (this.runningPid === -1) return false;
    const pcb = this.processes.get(this.runningPid);
    if (!pcb || !this.isValidTransition(pcb.state, 'READY')) return false;

    const oldState = pcb.state;
    pcb.state = 'READY';
    pcb.timeQuantumSlice = 0;
    this.readyQueue.push(this.runningPid);
    this.sortReadyQueue();

    const prevPid = this.runningPid;
    this.runningPid = -1;

    this.logEvent(prevPid, oldState, 'READY', 'Preempt', `${pcb.name} preempted: ${reason}.`);
    return true;
  }

  public blockProcess(reason: string = 'Disk Read I/O (SI=1)', ioDuration: number = 3): boolean {
    if (this.runningPid === -1) return false;
    const pcb = this.processes.get(this.runningPid);
    if (!pcb || !this.isValidTransition(pcb.state, 'WAITING')) return false;

    const oldState = pcb.state;
    pcb.state = 'WAITING';
    pcb.waitReason = reason;
    pcb.ioRemainingTicks = Math.max(1, ioDuration);

    this.waitingQueue.push(this.runningPid);
    const prevPid = this.runningPid;
    this.runningPid = -1;

    this.logEvent(prevPid, oldState, 'WAITING', 'I/O Request', `${pcb.name} blocked on ${reason} (${ioDuration} ticks).`);
    return true;
  }

  public unblockProcess(pid: number): boolean {
    const pcb = this.processes.get(pid);
    if (!pcb || !this.isValidTransition(pcb.state, 'READY')) return false;

    this.waitingQueue = this.waitingQueue.filter((id) => id !== pid);
    const oldState = pcb.state;
    pcb.state = 'READY';
    pcb.waitReason = 'None';
    pcb.ioRemainingTicks = 0;

    this.readyQueue.push(pid);
    this.sortReadyQueue();

    this.logEvent(pid, oldState, 'READY', 'I/O Complete', `I/O completed for ${pcb.name}. Re-entered Ready Queue.`);
    return true;
  }

  public terminateProcess(pid?: number, reason: string = 'Normal Exit (H)'): boolean {
    const target = pid !== undefined && pid !== -1 ? pid : this.runningPid;
    if (target === -1) return false;
    const pcb = this.processes.get(target);
    if (!pcb || !this.isValidTransition(pcb.state, 'TERMINATED')) return false;

    if (target === this.runningPid) {
      this.runningPid = -1;
    }
    this.newQueue = this.newQueue.filter((id) => id !== target);
    this.readyQueue = this.readyQueue.filter((id) => id !== target);
    this.waitingQueue = this.waitingQueue.filter((id) => id !== target);

    const oldState = pcb.state;
    pcb.state = 'TERMINATED';
    pcb.remainingTime = 0;
    this.terminatedQueue.push(target);

    this.logEvent(target, oldState, 'TERMINATED', 'Exit', `${pcb.name} terminated: ${reason}.`);
    return true;
  }

  public step(): boolean {
    this.currentTime++;

    // 1. Decrement waiting queue I/O ticks
    const toUnblock: number[] = [];
    for (const pid of this.waitingQueue) {
      const pcb = this.processes.get(pid);
      if (pcb) {
        pcb.ioRemainingTicks--;
        if (pcb.ioRemainingTicks <= 0) {
          toUnblock.push(pid);
        }
      }
    }
    for (const pid of toUnblock) {
      this.unblockProcess(pid);
    }

    // 2. Context switch overhead
    if (this.isContextSwitching) {
      this.contextSwitchTimeRemaining--;
      this.totalCpuBusyTime++;
      if (this.contextSwitchTimeRemaining <= 0) {
        this.isContextSwitching = false;
      }
      return true;
    }

    // 3. CPU Execution
    if (this.runningPid !== -1 && this.processes.has(this.runningPid)) {
      const pcb = this.processes.get(this.runningPid)!;
      pcb.remainingTime--;
      pcb.ttc++;
      pcb.timeQuantumSlice++;
      pcb.registers.PC = (pcb.registers.PC + 1) % 100;
      this.totalCpuBusyTime++;

      if (pcb.ttc % 2 === 0) pcb.registers.IR = 'LR20';
      else pcb.registers.IR = 'PD30';

      // Completion check
      if (pcb.remainingTime <= 0) {
        this.terminateProcess(this.runningPid, 'Burst Execution Completed');
        if (this.readyQueue.length > 0) {
          this.dispatchProcess();
        }
      } else if (this.schedulingPolicy === 'RR' && pcb.timeQuantumSlice >= this.timeQuantum) {
        this.preemptProcess(`Time Quantum (${this.timeQuantum}) Expired`);
        if (this.readyQueue.length > 0) {
          this.dispatchProcess();
        }
      }
    } else {
      this.totalCpuIdleTime++;
      if (this.readyQueue.length > 0) {
        this.dispatchProcess();
      }
    }

    return true;
  }

  public getSnapshot(): ProcessManagerSnapshot {
    return {
      currentTime: this.currentTime,
      runningPid: this.runningPid,
      isContextSwitching: this.isContextSwitching,
      contextSwitchTimeRemaining: this.contextSwitchTimeRemaining,
      contextSwitchOverhead: this.contextSwitchOverhead,
      schedulingPolicy: this.schedulingPolicy,
      timeQuantum: this.timeQuantum,
      allProcesses: Array.from(this.processes.values()).map((p) => ({ ...p, registers: { ...p.registers } })),
      readyQueue: [...this.readyQueue],
      waitingQueue: [...this.waitingQueue],
      newQueue: [...this.newQueue],
      terminatedQueue: [...this.terminatedQueue],
      recentEvents: [...this.eventLog],
      totalContextSwitches: this.totalContextSwitches,
      totalCpuBusyTime: this.totalCpuBusyTime,
      totalCpuIdleTime: this.totalCpuIdleTime
    };
  }
}
