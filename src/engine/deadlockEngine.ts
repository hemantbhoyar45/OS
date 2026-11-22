import {
  BankersResult,
  DetectionResult,
  RequestResult,
  SafetyStep
} from './deadlockTypes';

export class DeadlockEngine {
  public static validate(
    allocation: number[][],
    maximum: number[][],
    available: number[],
    request?: number[][]
  ): string {
    if (!allocation.length || !maximum.length) return 'At least one process is required.';
    if (allocation.length !== maximum.length) return 'Allocation and maximum matrices must have equal process counts.';
    if (!available.length) return 'Available resource vector is required.';
    for (let i = 0; i < allocation.length; i++) {
      if (allocation[i].length !== available.length || maximum[i].length !== available.length)
        return 'All matrix rows must have exactly the number of resource types.';
      for (let j = 0; j < available.length; j++) {
        if (allocation[i][j] < 0 || maximum[i][j] < 0)
          return 'Matrix values cannot be negative.';
        if (allocation[i][j] > maximum[i][j])
          return 'Allocation cannot exceed maximum demand.';
      }
    }
    if (available.some((value) => value < 0)) return 'Available resources cannot be negative.';
    if (request) {
      if (request.length !== allocation.length) return 'Request matrix row count must match process count.';
      for (const row of request) {
        if (row.length !== available.length) return 'Request matrix columns must match resource types.';
        if (row.some((value) => value < 0)) return 'Request values cannot be negative.';
      }
    }
    return '';
  }

  public static calculateNeed(allocation: number[][], maximum: number[][]): number[][] {
    return maximum.map((row, i) => row.map((value, j) => value - allocation[i][j]));
  }

  public static runBankers(
    allocation: number[][],
    maximum: number[][],
    available: number[]
  ): BankersResult {
    const error = this.validate(allocation, maximum, available);
    const need = error ? [] : this.calculateNeed(allocation, maximum);
    if (error) return { isSafe: false, state: 'UNSAFE', error, need, safeSequence: [], steps: [] };

    const work = [...available];
    const finish = allocation.map(() => false);
    const safeSequence: number[] = [];
    const steps: SafetyStep[] = [];
    let stepNumber = 1;

    while (safeSequence.length < allocation.length) {
      let found = false;
      for (let i = 0; i < allocation.length; i++) {
        if (finish[i]) continue;
        const selected = need[i].every((value, j) => value <= work[j]);
        const finishBefore = [...finish];
        const workBefore = [...work];
        if (selected) {
          for (let j = 0; j < work.length; j++) work[j] += allocation[i][j];
          finish[i] = true;
          safeSequence.push(i);
          found = true;
          steps.push({
            stepNumber: stepNumber++, processIndex: i, workBefore, workAfter: [...work],
            finishBefore, finishAfter: [...finish], selected,
            message: `P${i} satisfies Need <= Work; release its allocation.`
          });
        } else {
          steps.push({
            stepNumber: stepNumber++, processIndex: i, workBefore, workAfter: [...work],
            finishBefore, finishAfter: [...finish], selected,
            message: `P${i} is skipped because Need cannot be satisfied.`
          });
        }
        if (selected) break;
      }
      if (!found) break;
    }
    const isSafe = safeSequence.length === allocation.length;
    return { isSafe, state: isSafe ? 'SAFE' : 'UNSAFE', error: '', need, safeSequence, steps };
  }

  public static requestResources(
    processIndex: number,
    request: number[],
    allocation: number[][],
    maximum: number[][],
    available: number[]
  ): RequestResult {
    const invalid: RequestResult = {
      validRequest: false, granted: false, status: 'INVALID', reason: '',
      availableAfter: [...available], safeSequence: [], allocationAfter: allocation,
      needAfter: [], steps: []
    };
    const error = this.validate(allocation, maximum, available);
    if (error) return { ...invalid, reason: error };
    if (processIndex < 0 || processIndex >= allocation.length)
      return { ...invalid, reason: 'Requested process index is out of range.' };
    if (request.length !== available.length)
      return { ...invalid, reason: 'Request vector must contain exactly the number of resource types.' };

    const need = this.calculateNeed(allocation, maximum);
    if (request.some((value, j) => value > need[processIndex][j]))
      return { ...invalid, validRequest: true, status: 'DENIED', reason: `Request exceeds P${processIndex}'s remaining maximum need.`, needAfter: need };
    if (request.some((value, j) => value > available[j]))
      return { ...invalid, validRequest: true, status: 'DENIED', reason: 'Request exceeds currently available resources.', needAfter: need };

    const nextAvailable = [...available];
    const nextAllocation = allocation.map((row) => [...row]);
    const nextNeed = need.map((row) => [...row]);
    for (let j = 0; j < request.length; j++) {
      nextAvailable[j] -= request[j];
      nextAllocation[processIndex][j] += request[j];
      nextNeed[processIndex][j] -= request[j];
    }
    const safety = this.runBankers(nextAllocation, maximum, nextAvailable);
    if (safety.isSafe) {
      return {
        validRequest: true, granted: true, status: 'GRANTED',
        reason: 'The state remains safe after granting the request.',
        availableAfter: nextAvailable, safeSequence: safety.safeSequence,
        allocationAfter: nextAllocation, needAfter: nextNeed, steps: safety.steps
      };
    }
    return {
      validRequest: true, granted: false, status: 'DENIED',
      reason: 'Granting the request would produce an unsafe state.',
      availableAfter: nextAvailable, safeSequence: [], allocationAfter: nextAllocation,
      needAfter: nextNeed, steps: safety.steps
    };
  }

  public static detectDeadlock(
    allocation: number[][],
    request: number[][],
    available: number[]
  ): DetectionResult {
    const error = this.validate(allocation, allocation, available, request);
    if (error) return { hasDeadlock: false, error, deadlockedProcesses: [], steps: [] };
    const work = [...available];
    const finish = allocation.map(() => false);
    const steps: DetectionResult['steps'] = [];
    let stepNumber = 1;
    while (true) {
      let found = false;
      for (let i = 0; i < allocation.length; i++) {
        if (finish[i]) continue;
        const selected = request[i].every((value, j) => value <= work[j]);
        const finishBefore = [...finish];
        const workBefore = [...work];
        if (selected) {
          for (let j = 0; j < work.length; j++) work[j] += allocation[i][j];
          finish[i] = true;
          found = true;
        }
        steps.push({
          stepNumber: stepNumber++, processIndex: i, workBefore, workAfter: [...work],
          finishBefore, finishAfter: [...finish], selected,
          message: selected
            ? `P${i} can complete; release its allocation.`
            : `P${i} cannot complete with the current Work.`
        });
        if (selected) break;
      }
      if (!found) break;
    }
    const deadlockedProcesses = finish.map((done, i) => done ? -1 : i).filter((i) => i >= 0);
    return { hasDeadlock: deadlockedProcesses.length > 0, error: '', deadlockedProcesses, steps };
  }
}
