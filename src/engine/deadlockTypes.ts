export interface SafetyStep {
  stepNumber: number;
  processIndex: number;
  workBefore: number[];
  workAfter: number[];
  finishBefore: boolean[];
  finishAfter: boolean[];
  selected: boolean;
  message: string;
}

export interface BankersResult {
  isSafe: boolean;
  state: 'SAFE' | 'UNSAFE';
  error: string;
  safeSequence: number[];
  need: number[][];
  steps: SafetyStep[];
}

export interface DetectionStep {
  stepNumber: number;
  processIndex: number;
  workBefore: number[];
  workAfter: number[];
  finishBefore: boolean[];
  finishAfter: boolean[];
  selected: boolean;
  message: string;
}

export interface DetectionResult {
  hasDeadlock: boolean;
  error: string;
  deadlockedProcesses: number[];
  steps: DetectionStep[];
}

export interface RequestResult {
  validRequest: boolean;
  granted: boolean;
  status: 'GRANTED' | 'DENIED' | 'INVALID';
  reason: string;
  availableAfter: number[];
  safeSequence: number[];
  allocationAfter: number[][];
  needAfter: number[][];
  steps: SafetyStep[];
}
