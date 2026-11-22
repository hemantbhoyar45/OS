export type ProcessState = 'NEW' | 'READY' | 'RUNNING' | 'WAITING' | 'TERMINATED';

export interface CPURegisters {
  IR: string; // 4-char instruction (e.g. "GD20", "LR30")
  R: string;  // 4-char accumulator
  PC: number; // Program Counter / Instruction Counter (0-99)
  C: boolean; // Comparison flag
  PTR: number;// Page Table Register frame
}

export interface PCBData {
  pid: number;
  name: string;
  state: ProcessState;
  priority: number;
  arrivalTime: number;
  burstTime: number;
  remainingTime: number;
  
  registers: CPURegisters;

  timeQuantumSlice: number;
  waitReason: string;
  ioRemainingTicks: number;

  ttl: number; // Total Time Limit
  tll: number; // Total Line Limit
  ttc: number; // Total Time Counter (CPU cycles consumed)
  llc: number; // Line Limit Counter
  contextSwitches: number;
  memoryBase: number;
  memoryLimit: number;
  allocatedFrames: number[];
}

export interface TransitionEvent {
  id: string;
  time: number;
  pid: number;
  processName: string;
  fromState: ProcessState;
  toState: ProcessState;
  trigger: string;
  details: string;
}

export interface ProcessManagerSnapshot {
  currentTime: number;
  runningPid: number; // -1 if idle or in context switch
  isContextSwitching: boolean;
  contextSwitchTimeRemaining: number;
  contextSwitchOverhead: number;
  schedulingPolicy: 'FCFS' | 'RR' | 'PRIORITY' | 'SJF';
  timeQuantum: number;

  allProcesses: PCBData[];
  readyQueue: number[];
  waitingQueue: number[];
  newQueue: number[];
  terminatedQueue: number[];

  recentEvents: TransitionEvent[];
  totalContextSwitches: number;
  totalCpuBusyTime: number;
  totalCpuIdleTime: number;
}
