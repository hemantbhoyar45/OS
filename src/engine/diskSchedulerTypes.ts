export type DiskAlgorithmId = 'fcfs' | 'sstf' | 'scan' | 'cscan' | 'look' | 'clook';
export type DiskDirection = 'UP' | 'DOWN';

export interface DiskStep {
  stepNumber: number;
  fromPosition: number;
  toPosition: number;
  seekDistance: number;
  cumulativeMovement: number;
  type: 'request' | 'boundary' | 'circular_jump';
}

export interface DiskScheduleResult {
  algorithm: string;
  algorithmId: DiskAlgorithmId;
  servicingOrder: number[];
  steps: DiskStep[];
  initialHead: number;
  cylinderMin: number;
  cylinderMax: number;
  totalHeadMovement: number;
  averageSeekDistance: number;
}
