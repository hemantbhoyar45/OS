import { DiskAlgorithmId, DiskDirection, DiskScheduleResult, DiskStep } from './diskSchedulerTypes';

export class DiskSchedulerEngine {
  private static makeResult(
    algorithm: string,
    algorithmId: DiskAlgorithmId,
    requests: number[],
    initialHead: number,
    cylinderMin: number,
    cylinderMax: number
  ): DiskScheduleResult {
    return {
      algorithm, algorithmId, servicingOrder: [], steps: [],
      initialHead, cylinderMin, cylinderMax,
      totalHeadMovement: 0, averageSeekDistance: 0
    };
  }

  private static valid(requests: number[], head: number, min: number, max: number): boolean {
    return head >= min && head <= max && requests.every((value) => Number.isInteger(value) && value >= min && value <= max);
  }

  private static addStep(result: DiskScheduleResult, from: number, to: number, type: DiskStep['type']) {
    const seekDistance = Math.abs(to - from);
    result.steps.push({
      stepNumber: result.steps.length,
      fromPosition: from,
      toPosition: to,
      seekDistance,
      cumulativeMovement: result.totalHeadMovement + seekDistance,
      type
    });
    result.totalHeadMovement += seekDistance;
  }

  private static finalize(result: DiskScheduleResult) {
    result.averageSeekDistance = result.servicingOrder.length
      ? Number((result.totalHeadMovement / result.servicingOrder.length).toFixed(2))
      : 0;
  }

  public static simulateFCFS(requests: number[], head: number, min: number, max: number): DiskScheduleResult {
    const result = this.makeResult('FCFS', 'fcfs', requests, head, min, max);
    if (!this.valid(requests, head, min, max)) return result;
    for (const cylinder of requests) {
      this.addStep(result, head, cylinder, 'request');
      head = cylinder;
      result.servicingOrder.push(cylinder);
    }
    this.finalize(result);
    return result;
  }

  public static simulateSSTF(requests: number[], head: number, min: number, max: number): DiskScheduleResult {
    const result = this.makeResult('SSTF', 'sstf', requests, head, min, max);
    if (!this.valid(requests, head, min, max)) return result;
    const remaining = [...requests];
    while (remaining.length) {
      let bestIndex = 0;
      for (let i = 1; i < remaining.length; i++) {
        if (Math.abs(remaining[i] - head) < Math.abs(remaining[bestIndex] - head)) bestIndex = i;
      }
      const cylinder = remaining[bestIndex];
      this.addStep(result, head, cylinder, 'request');
      head = cylinder;
      result.servicingOrder.push(cylinder);
      remaining.splice(bestIndex, 1);
    }
    this.finalize(result);
    return result;
  }

  public static simulateSCAN(requests: number[], head: number, min: number, max: number, direction: DiskDirection): DiskScheduleResult {
    const result = this.makeResult('SCAN', 'scan', requests, head, min, max);
    if (!this.valid(requests, head, min, max)) return result;
    const lower = requests.filter((value) => value < head).sort((a, b) => a - b);
    const higher = requests.filter((value) => value > head).sort((a, b) => a - b);
    if (direction === 'UP') {
      for (const cylinder of higher) { this.addStep(result, head, cylinder, 'request'); head = cylinder; result.servicingOrder.push(cylinder); }
      if (higher.length && head !== max) { this.addStep(result, head, max, 'boundary'); head = max; }
      for (let i = lower.length - 1; i >= 0; i--) { this.addStep(result, head, lower[i], 'request'); head = lower[i]; result.servicingOrder.push(lower[i]); }
    } else {
      for (let i = lower.length - 1; i >= 0; i--) { this.addStep(result, head, lower[i], 'request'); head = lower[i]; result.servicingOrder.push(lower[i]); }
      if (lower.length && head !== min) { this.addStep(result, head, min, 'boundary'); head = min; }
      for (const cylinder of higher) { this.addStep(result, head, cylinder, 'request'); head = cylinder; result.servicingOrder.push(cylinder); }
    }
    this.finalize(result);
    return result;
  }

  public static simulateCSCAN(requests: number[], head: number, min: number, max: number, direction: DiskDirection): DiskScheduleResult {
    const result = this.makeResult('C-SCAN', 'cscan', requests, head, min, max);
    if (!this.valid(requests, head, min, max)) return result;
    const lower = requests.filter((value) => value < head).sort((a, b) => a - b);
    const higher = requests.filter((value) => value > head).sort((a, b) => a - b);
    if (direction === 'UP') {
      for (const cylinder of higher) { this.addStep(result, head, cylinder, 'request'); head = cylinder; result.servicingOrder.push(cylinder); }
      if (higher.length && head !== max) { this.addStep(result, head, max, 'boundary'); head = max; }
      if (lower.length) {
        this.addStep(result, head, min, 'circular_jump'); head = min;
        for (const cylinder of lower) { this.addStep(result, head, cylinder, 'request'); head = cylinder; result.servicingOrder.push(cylinder); }
      }
    } else {
      for (let i = lower.length - 1; i >= 0; i--) { this.addStep(result, head, lower[i], 'request'); head = lower[i]; result.servicingOrder.push(lower[i]); }
      if (lower.length && head !== min) { this.addStep(result, head, min, 'boundary'); head = min; }
      if (higher.length) {
        this.addStep(result, head, max, 'circular_jump'); head = max;
        for (let i = higher.length - 1; i >= 0; i--) { this.addStep(result, head, higher[i], 'request'); head = higher[i]; result.servicingOrder.push(higher[i]); }
      }
    }
    this.finalize(result);
    return result;
  }

  public static simulateLOOK(requests: number[], head: number, min: number, max: number, direction: DiskDirection): DiskScheduleResult {
    const result = this.makeResult('LOOK', 'look', requests, head, min, max);
    if (!this.valid(requests, head, min, max)) return result;
    const lower = requests.filter((value) => value < head).sort((a, b) => a - b);
    const higher = requests.filter((value) => value > head).sort((a, b) => a - b);
    if (direction === 'UP') {
      for (const cylinder of higher) { this.addStep(result, head, cylinder, 'request'); head = cylinder; result.servicingOrder.push(cylinder); }
      for (let i = lower.length - 1; i >= 0; i--) { this.addStep(result, head, lower[i], 'request'); head = lower[i]; result.servicingOrder.push(lower[i]); }
    } else {
      for (let i = lower.length - 1; i >= 0; i--) { this.addStep(result, head, lower[i], 'request'); head = lower[i]; result.servicingOrder.push(lower[i]); }
      for (const cylinder of higher) { this.addStep(result, head, cylinder, 'request'); head = cylinder; result.servicingOrder.push(cylinder); }
    }
    this.finalize(result);
    return result;
  }

  public static simulateCLOOK(requests: number[], head: number, min: number, max: number, direction: DiskDirection): DiskScheduleResult {
    const result = this.makeResult('C-LOOK', 'clook', requests, head, min, max);
    if (!this.valid(requests, head, min, max)) return result;
    const lower = requests.filter((value) => value < head).sort((a, b) => a - b);
    const higher = requests.filter((value) => value > head).sort((a, b) => a - b);
    if (direction === 'UP') {
      for (const cylinder of higher) { this.addStep(result, head, cylinder, 'request'); head = cylinder; result.servicingOrder.push(cylinder); }
      if (higher.length && lower.length) {
        this.addStep(result, head, lower[0], 'circular_jump'); head = lower[0]; result.servicingOrder.push(lower[0]);
        for (let i = 1; i < lower.length; i++) { this.addStep(result, head, lower[i], 'request'); head = lower[i]; result.servicingOrder.push(lower[i]); }
      }
    } else {
      for (let i = lower.length - 1; i >= 0; i--) { this.addStep(result, head, lower[i], 'request'); head = lower[i]; result.servicingOrder.push(lower[i]); }
      if (lower.length && higher.length) {
        const top = higher[higher.length - 1];
        this.addStep(result, head, top, 'circular_jump'); head = top; result.servicingOrder.push(top);
        for (let i = higher.length - 2; i >= 0; i--) { this.addStep(result, head, higher[i], 'request'); head = higher[i]; result.servicingOrder.push(higher[i]); }
      }
    }
    this.finalize(result);
    return result;
  }

  public static compareAll(requests: number[], head: number, min: number, max: number, direction: DiskDirection): DiskScheduleResult[] {
    return [
      this.simulateFCFS(requests, head, min, max),
      this.simulateSSTF(requests, head, min, max),
      this.simulateSCAN(requests, head, min, max, direction),
      this.simulateCSCAN(requests, head, min, max, direction),
      this.simulateLOOK(requests, head, min, max, direction),
      this.simulateCLOOK(requests, head, min, max, direction)
    ];
  }
}
