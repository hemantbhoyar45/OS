export type SchedulerAlgorithmId =
  | 'fcfs'
  | 'sjf'
  | 'srtf'
  | 'rr'
  | 'priority_np'
  | 'priority_p';

export interface ProcessInput {
  pid: number;
  name: string;
  arrivalTime: number;
  burstTime: number;
  priority: number;
}

export interface ProcessResult {
  pid: number;
  name: string;
  arrivalTime: number;
  burstTime: number;
  priority: number;
  completionTime: number;
  turnaroundTime: number; // CT - AT
  waitingTime: number;    // TAT - BT
  responseTime: number;   // firstExecutionTime - AT
}

export interface GanttSegment {
  pid: number; // -1 for IDLE
  processName: string;
  startTime: number;
  endTime: number;
}

export interface TimeStepProcessState {
  pid: number;
  name: string;
  remainingBurst: number;
  state: 0 | 1 | 2 | 3; // 0=Not Arrived, 1=Ready, 2=Running, 3=Completed
}

export interface TimeStepState {
  time: number;
  runningPid: number; // -1 if idle
  runningName: string;
  readyQueuePids: number[];
  processStates: TimeStepProcessState[];
  log: string;
}

export interface ScheduleResult {
  algorithm: string;
  algorithmId: SchedulerAlgorithmId;
  processResults: ProcessResult[];
  ganttChart: GanttSegment[];
  timelineSteps: TimeStepState[];
  avgTurnaroundTime: number;
  avgWaitingTime: number;
  avgResponseTime: number;
  cpuUtilization: number; // Percentage
  throughput: number;     // processes per time unit
  totalTime: number;
  idleTime: number;
}

export interface PresetWorkload {
  id: string;
  name: string;
  description: string;
  timeQuantum: number;
  lowerIsHigherPriority: boolean;
  processes: ProcessInput[];
}
