import { describe, expect, it } from 'vitest';
import { DiskSchedulerEngine } from './diskSchedulerEngine';
import { DeadlockEngine } from './deadlockEngine';
import { CPUSchedulerEngine } from './cpuSchedulerEngine';
import { MemoryManagerEngine } from './memoryManagerEngine';

describe('integrated OS engine smoke tests', () => {
  it('returns the same disk result on repeated runs', () => {
    const requests = [98, 183, 37, 122, 14, 124, 65, 67];
    const first = DiskSchedulerEngine.compareAll(requests, 53, 0, 199, 'UP');
    const second = DiskSchedulerEngine.compareAll(requests, 53, 0, 199, 'UP');
    expect(first).toEqual(second);
    expect(first).toHaveLength(6);
  });

  it('distinguishes a safe state from a confirmed deadlock', () => {
    const allocation = [[0, 1, 0], [2, 0, 0], [3, 0, 2], [2, 1, 1], [0, 0, 2]];
    const maximum = [[7, 5, 3], [3, 2, 2], [9, 0, 2], [2, 2, 2], [4, 3, 3]];
    const available = [3, 3, 2];
    const safe = DeadlockEngine.runBankers(allocation, maximum, available);
    expect(safe.isSafe).toBe(true);
    expect(safe.safeSequence).toHaveLength(5);

    const deadlock = DeadlockEngine.detectDeadlock([[1, 0], [0, 1]], [[1, 0], [0, 1]], [0, 0]);
    expect(deadlock.hasDeadlock).toBe(true);
  });

  it('produces deterministic FCFS and FIFO output', () => {
    const cpu = CPUSchedulerEngine.scheduleFCFS([
      { pid: 1, name: 'P1', arrivalTime: 0, burstTime: 5, priority: 1 },
      { pid: 2, name: 'P2', arrivalTime: 1, burstTime: 3, priority: 2 }
    ]);
    expect(cpu.processResults[0].turnaroundTime).toBe(5);

    const fifo = MemoryManagerEngine.simulateFIFO([7, 0, 1, 2, 0, 3], 3);
    expect(fifo.pageFaults).toBe(5);
  });
});
