export type AllocationAlgorithmId = 'First Fit' | 'Best Fit' | 'Worst Fit';
export type ReplacementAlgorithmId = 'FIFO' | 'LRU' | 'Optimal';

// Contiguous Memory Allocation
export interface MemoryBlock {
  id: number;
  startAddress: number;
  size: number;
  isAllocated: boolean;
  processId: number; // -1 if free
  processName: string;
  internalFragmentation: number;
}

export interface AllocationRequest {
  processId: number;
  processName: string;
  size: number; // >0 allocate, <0 deallocate
}

export interface AllocationStep {
  stepNumber: number;
  processId: number;
  processName: string;
  requestedSize: number;
  isAllocation: boolean;
  success: boolean;
  allocatedBlockId: number;
  allocatedAddress: number;
  message: string;
  blocksAfter: MemoryBlock[];
}

export interface AllocationResult {
  algorithm: AllocationAlgorithmId;
  initialBlocks: MemoryBlock[];
  finalBlocks: MemoryBlock[];
  steps: AllocationStep[];
  totalMemory: number;
  allocatedMemory: number;
  freeMemory: number;
  externalFragmentation: number;
  successfulAllocations: number;
  failedAllocations: number;
}

// Page Replacement
export interface PageRefStep {
  stepIndex: number;
  pageNumber: number;
  isHit: boolean;
  victimPage: number; // -1 if hit or empty frame
  frames: number[];   // Array of page numbers (-1 for empty)
  action: string;
}

export interface PageReplacementResult {
  algorithm: ReplacementAlgorithmId;
  frameCount: number;
  referenceString: number[];
  steps: PageRefStep[];
  totalReferences: number;
  pageHits: number;
  pageFaults: number;
  hitRatio: number;   // percentage 0 - 100
  faultRatio: number; // percentage 0 - 100
}

export interface AllocationPreset {
  id: string;
  name: string;
  description: string;
  blocks: number[];
  requests: AllocationRequest[];
}

export interface ReplacementPreset {
  id: string;
  name: string;
  description: string;
  frameCount: number;
  referenceString: number[];
}
