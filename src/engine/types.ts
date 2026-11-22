export type PhaseMode = 1 | 2;

export interface Registers {
  IR: string;     // Instruction Register (4 chars)
  R: string;      // General Purpose Register (4 chars)
  IC: number;     // Instruction Counter (0-99)
  C: boolean;     // Comparison Flag (true/false)
  SI: number;     // Supervisor Interrupt (0, 1=Read, 2=Write, 3=Halt)
  PI: number;     // Program Interrupt (0, 1=Opcode, 2=Operand, 3=Page Fault)
  TI: number;     // Timer Interrupt (0, 2=Time Limit)
  PTR: number;    // Page Table Register (points to frame 0-29 in Phase 2)
  terminateFlag: boolean;
}

export interface PCB {
  jobID: number;
  TTL: number;    // Total Time Limit
  TLL: number;    // Total Line Limit
  TTC: number;    // Total Time Counter
  LLC: number;    // Line Limit Counter
}

export interface MemoryWord {
  address: number;
  content: string; // 4 characters
  type?: 'free' | 'code' | 'data' | 'pagetable';
  frame?: number;
  offset?: number;
  isHighlighted?: boolean;
}

export interface PageTableEntry {
  page: number;
  frame: number | null; // null if '*' (Page Fault)
  rawPte: string;
  isAllocated: boolean;
}

export interface AddressTranslationResult {
  va: number;
  pageNum: number;
  offset: number;
  pteAddress: number;
  frame: number | null;
  ra: number | null;
  pi: number;
  isFault: boolean;
  reason: string;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  category: 'SYSTEM' | 'LOADER' | 'CPU' | 'MEMORY' | 'PAGING' | 'INTERRUPT' | 'IO';
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
}

export interface PresetJob {
  id: string;
  name: string;
  phase: PhaseMode;
  description: string;
  expectedOutcome: string;
  code: string;
}

export interface SimulationSnapshot {
  phase: PhaseMode;
  registers: Registers;
  pcb: PCB;
  memory: MemoryWord[];
  pageTable: PageTableEntry[];
  output: string;
  logs: LogEntry[];
  currentCycle: number;
  lastDecodedOpcode?: string;
  lastOperandVA?: number;
  lastOperandRA?: number;
  lastTranslation?: AddressTranslationResult;
  isTerminated: boolean;
  terminationReason?: string;
}
