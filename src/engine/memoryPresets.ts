import { AllocationPreset, ReplacementPreset } from './memoryManagerTypes';

export const ALLOCATION_PRESETS: AllocationPreset[] = [
  {
    id: 'silberschatz_allocation',
    name: 'OS Textbook Standard Partitions (5 Blocks)',
    description: 'Classic textbook benchmark with blocks of 100, 500, 200, 300, 600 KB. Best Fit succeeds on all 4 requests, while First Fit and Worst Fit fail on P4 (426 KB).',
    blocks: [100, 500, 200, 300, 600],
    requests: [
      { processId: 1, processName: 'P1', size: 212 },
      { processId: 2, processName: 'P2', size: 417 },
      { processId: 3, processName: 'P3', size: 112 },
      { processId: 4, processName: 'P4', size: 426 }
    ]
  },
  {
    id: 'fragmentation_coalescing',
    name: 'Dynamic Allocation & Coalescing Demo',
    description: 'Demonstrates allocating multiple processes and then deallocating adjacent blocks to test automatic free block coalescing.',
    blocks: [150, 350, 250, 450],
    requests: [
      { processId: 1, processName: 'P1', size: 100 },
      { processId: 2, processName: 'P2', size: 200 },
      { processId: 3, processName: 'P3', size: 300 },
      { processId: 2, processName: 'P2 (Deallocate)', size: -1 },
      { processId: 1, processName: 'P1 (Deallocate)', size: -1 },
      { processId: 4, processName: 'P4 (Large)', size: 400 }
    ]
  },
  {
    id: 'severe_fragmentation',
    name: 'Severe External Fragmentation Case',
    description: 'Demonstrates when plenty of total free memory exists, but individual holes are too small, causing allocation failures.',
    blocks: [50, 50, 50, 50, 50, 50],
    requests: [
      { processId: 1, processName: 'P1', size: 40 },
      { processId: 2, processName: 'P2', size: 40 },
      { processId: 3, processName: 'P3', size: 40 },
      { processId: 4, processName: 'P4 (Demands 80KB)', size: 80 }
    ]
  }
];

export const REPLACEMENT_PRESETS: ReplacementPreset[] = [
  {
    id: 'galvin_standard',
    name: 'Silberschatz / Galvin Standard Reference String',
    description: 'The standard 20-reference string (3 frames). FIFO yields 15 faults, LRU yields 12 faults, and Optimal yields 9 faults.',
    frameCount: 3,
    referenceString: [7, 0, 1, 2, 0, 3, 0, 4, 2, 3, 0, 3, 2, 1, 2, 0, 1, 7, 0, 1]
  },
  {
    id: 'beladys_anomaly',
    name: "Bélády's Anomaly Demonstration (FIFO)",
    description: "Famous reference string where increasing frame count from 3 to 4 causes FIFO to experience MORE page faults (9 faults with 3 frames vs 10 faults with 4 frames!).",
    frameCount: 3,
    referenceString: [1, 2, 3, 4, 1, 2, 5, 1, 2, 3, 4, 5]
  },
  {
    id: 'high_locality',
    name: 'High Locality of Reference (High Hit Rate)',
    description: 'Simulates a program working within a small loop / working set of pages (0, 1, 2), demonstrating how LRU maintains a high hit ratio.',
    frameCount: 3,
    referenceString: [0, 1, 2, 0, 1, 2, 3, 0, 1, 2, 0, 1, 2, 4, 0, 1, 2]
  },
  {
    id: 'four_frames_benchmark',
    name: 'Expanded Memory (4 Frames Benchmark)',
    description: 'Compares the standard reference string evaluated with 4 frames instead of 3, observing reduced page faults.',
    frameCount: 4,
    referenceString: [7, 0, 1, 2, 0, 3, 0, 4, 2, 3, 0, 3, 2, 1, 2, 0, 1, 7, 0, 1]
  }
];
