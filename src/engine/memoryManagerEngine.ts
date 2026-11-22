import {
  AllocationAlgorithmId,
  ReplacementAlgorithmId,
  MemoryBlock,
  AllocationRequest,
  AllocationStep,
  AllocationResult,
  PageRefStep,
  PageReplacementResult
} from './memoryManagerTypes';

function coalesceBlocks(blocks: MemoryBlock[]): MemoryBlock[] {
  if (blocks.length <= 1) return blocks;
  const merged: MemoryBlock[] = [blocks[0]];

  for (let i = 1; i < blocks.length; i++) {
    const prev = merged[merged.length - 1];
    const curr = blocks[i];
    if (!prev.isAllocated && !curr.isAllocated) {
      prev.size += curr.size;
    } else {
      merged.push({ ...curr });
    }
  }

  let currentAddr = 0;
  for (let i = 0; i < merged.length; i++) {
    merged[i].id = i + 1;
    merged[i].startAddress = currentAddr;
    currentAddr += merged[i].size;
  }
  return merged;
}

export class MemoryManagerEngine {
  // Contiguous Allocation
  public static simulateAllocation(
    algorithm: AllocationAlgorithmId,
    initialBlockSizes: number[],
    requests: AllocationRequest[]
  ): AllocationResult {
    let currentAddr = 0;
    const initialBlocks: MemoryBlock[] = initialBlockSizes.map((sz, idx) => {
      const b: MemoryBlock = {
        id: idx + 1,
        startAddress: currentAddr,
        size: sz,
        isAllocated: false,
        processId: -1,
        processName: 'Free',
        internalFragmentation: 0
      };
      currentAddr += sz;
      return b;
    });

    let currentBlocks: MemoryBlock[] = initialBlocks.map((b) => ({ ...b }));
    const steps: AllocationStep[] = [];
    let successful = 0;
    let failed = 0;

    for (let stepIdx = 0; stepIdx < requests.length; stepIdx++) {
      const req = requests[stepIdx];
      const step: AllocationStep = {
        stepNumber: stepIdx + 1,
        processId: req.processId,
        processName: req.processName,
        requestedSize: req.size,
        isAllocation: req.size > 0,
        success: false,
        allocatedBlockId: -1,
        allocatedAddress: -1,
        message: '',
        blocksAfter: []
      };

      if (req.size > 0) {
        let chosenIdx = -1;

        if (algorithm === 'First Fit') {
          for (let i = 0; i < currentBlocks.length; i++) {
            if (!currentBlocks[i].isAllocated && currentBlocks[i].size >= req.size) {
              chosenIdx = i;
              break;
            }
          }
        } else if (algorithm === 'Best Fit') {
          let minDiff = Infinity;
          for (let i = 0; i < currentBlocks.length; i++) {
            if (!currentBlocks[i].isAllocated && currentBlocks[i].size >= req.size) {
              const diff = currentBlocks[i].size - req.size;
              if (diff < minDiff) {
                minDiff = diff;
                chosenIdx = i;
              }
            }
          }
        } else if (algorithm === 'Worst Fit') {
          let maxDiff = -1;
          for (let i = 0; i < currentBlocks.length; i++) {
            if (!currentBlocks[i].isAllocated && currentBlocks[i].size >= req.size) {
              const diff = currentBlocks[i].size - req.size;
              if (diff > maxDiff) {
                maxDiff = diff;
                chosenIdx = i;
              }
            }
          }
        }

        if (chosenIdx !== -1) {
          step.success = true;
          step.allocatedBlockId = currentBlocks[chosenIdx].id;
          step.allocatedAddress = currentBlocks[chosenIdx].startAddress;
          successful++;

          const originalSize = currentBlocks[chosenIdx].size;
          const remainingHole = originalSize - req.size;

          currentBlocks[chosenIdx].isAllocated = true;
          currentBlocks[chosenIdx].processId = req.processId;
          currentBlocks[chosenIdx].processName = req.processName;
          currentBlocks[chosenIdx].size = req.size;

          if (remainingHole > 0) {
            const hole: MemoryBlock = {
              id: currentBlocks.length + 1,
              startAddress: currentBlocks[chosenIdx].startAddress + req.size,
              size: remainingHole,
              isAllocated: false,
              processId: -1,
              processName: 'Free',
              internalFragmentation: 0
            };
            currentBlocks.splice(chosenIdx + 1, 0, hole);
          }

          step.message = `Allocated ${req.size} KB to ${req.processName} at address ${step.allocatedAddress} (Block ${step.allocatedBlockId}).`;
        } else {
          step.success = false;
          failed++;
          step.message = `Failed to allocate ${req.size} KB for ${req.processName} (No free block with sufficient contiguous size).`;
        }
      } else {
        // Deallocation
        let found = false;
        for (let i = 0; i < currentBlocks.length; i++) {
          if (currentBlocks[i].isAllocated && currentBlocks[i].processId === req.processId) {
            currentBlocks[i].isAllocated = false;
            currentBlocks[i].processId = -1;
            currentBlocks[i].processName = 'Free';
            found = true;
            break;
          }
        }

        if (found) {
          currentBlocks = coalesceBlocks(currentBlocks);
          step.success = true;
          step.message = `Deallocated ${req.processName} and coalesced adjacent free blocks.`;
        } else {
          step.success = false;
          step.message = `Process ${req.processName} was not found in memory.`;
        }
      }

      step.blocksAfter = currentBlocks.map((b) => ({ ...b }));
      steps.push(step);
    }

    const totalMemory = initialBlockSizes.reduce((a, b) => a + b, 0);
    const allocatedMemory = currentBlocks.filter((b) => b.isAllocated).reduce((a, b) => a + b.size, 0);
    const freeMemory = totalMemory - allocatedMemory;

    return {
      algorithm,
      initialBlocks,
      finalBlocks: currentBlocks,
      steps,
      totalMemory,
      allocatedMemory,
      freeMemory,
      externalFragmentation: freeMemory,
      successfulAllocations: successful,
      failedAllocations: failed
    };
  }

  // FIFO
  public static simulateFIFO(refString: number[], frameCount: number): PageReplacementResult {
    const frames = new Array(frameCount).fill(-1);
    const queue: number[] = [];
    const steps: PageRefStep[] = [];
    let hits = 0;
    let faults = 0;

    for (let i = 0; i < refString.length; i++) {
      const page = refString[i];
      let isHit = frames.includes(page);
      let victimPage = -1;
      let action = '';

      if (isHit) {
        hits++;
        action = `Page Hit: Page ${page} already in memory.`;
      } else {
        faults++;
        const emptyIdx = frames.indexOf(-1);
        if (emptyIdx !== -1) {
          frames[emptyIdx] = page;
          queue.push(page);
          action = `Page Fault: Loaded into empty frame ${emptyIdx}.`;
        } else {
          victimPage = queue.shift()!;
          const victimIdx = frames.indexOf(victimPage);
          frames[victimIdx] = page;
          queue.push(page);
          action = `Page Fault: Replaced victim Page ${victimPage} (FIFO order).`;
        }
      }

      steps.push({
        stepIndex: i,
        pageNumber: page,
        isHit,
        victimPage,
        frames: [...frames],
        action
      });
    }

    const total = refString.length;
    return {
      algorithm: 'FIFO',
      frameCount,
      referenceString: refString,
      steps,
      totalReferences: total,
      pageHits: hits,
      pageFaults: faults,
      hitRatio: total > 0 ? Number(((hits / total) * 100).toFixed(1)) : 0,
      faultRatio: total > 0 ? Number(((faults / total) * 100).toFixed(1)) : 0
    };
  }

  // LRU
  public static simulateLRU(refString: number[], frameCount: number): PageReplacementResult {
    const frames = new Array(frameCount).fill(-1);
    const lastUsed = new Map<number, number>();
    const steps: PageRefStep[] = [];
    let hits = 0;
    let faults = 0;

    for (let i = 0; i < refString.length; i++) {
      const page = refString[i];
      const isHit = frames.includes(page);
      let victimPage = -1;
      let action = '';

      if (isHit) {
        hits++;
        lastUsed.set(page, i);
        action = `Page Hit: Page ${page} accessed. Updated LRU access timestamp.`;
      } else {
        faults++;
        const emptyIdx = frames.indexOf(-1);
        if (emptyIdx !== -1) {
          frames[emptyIdx] = page;
          lastUsed.set(page, i);
          action = `Page Fault: Loaded into empty frame ${emptyIdx}.`;
        } else {
          // Find page with minimum lastUsed timestamp
          let lruPage = -1;
          let oldestTime = Infinity;

          for (const f of frames) {
            const t = lastUsed.get(f) ?? -1;
            if (t < oldestTime) {
              oldestTime = t;
              lruPage = f;
            }
          }

          victimPage = lruPage;
          const victimIdx = frames.indexOf(lruPage);
          frames[victimIdx] = page;
          lastUsed.set(page, i);
          action = `Page Fault: Replaced Page ${lruPage} (Least Recently Used).`;
        }
      }

      steps.push({
        stepIndex: i,
        pageNumber: page,
        isHit,
        victimPage,
        frames: [...frames],
        action
      });
    }

    const total = refString.length;
    return {
      algorithm: 'LRU',
      frameCount,
      referenceString: refString,
      steps,
      totalReferences: total,
      pageHits: hits,
      pageFaults: faults,
      hitRatio: total > 0 ? Number(((hits / total) * 100).toFixed(1)) : 0,
      faultRatio: total > 0 ? Number(((faults / total) * 100).toFixed(1)) : 0
    };
  }

  // Optimal
  public static simulateOptimal(refString: number[], frameCount: number): PageReplacementResult {
    const frames = new Array(frameCount).fill(-1);
    const steps: PageRefStep[] = [];
    let hits = 0;
    let faults = 0;

    for (let i = 0; i < refString.length; i++) {
      const page = refString[i];
      const isHit = frames.includes(page);
      let victimPage = -1;
      let action = '';

      if (isHit) {
        hits++;
        action = `Page Hit: Page ${page} already in memory.`;
      } else {
        faults++;
        const emptyIdx = frames.indexOf(-1);
        if (emptyIdx !== -1) {
          frames[emptyIdx] = page;
          action = `Page Fault: Loaded into empty frame ${emptyIdx}.`;
        } else {
          // Look ahead to find page not used for the longest time
          let furthestDist = -1;
          victimPage = -1;

          for (const f of frames) {
            let nextUse = Infinity;
            for (let j = i + 1; j < refString.length; j++) {
              if (refString[j] === f) {
                nextUse = j;
                break;
              }
            }
            if (nextUse > furthestDist) {
              furthestDist = nextUse;
              victimPage = f;
            }
          }

          const victimIdx = frames.indexOf(victimPage);
          frames[victimIdx] = page;
          action = `Page Fault: Replaced Page ${victimPage} (${
            furthestDist === Infinity ? 'Not referenced again' : 'Furthest in future'
          }).`;
        }
      }

      steps.push({
        stepIndex: i,
        pageNumber: page,
        isHit,
        victimPage,
        frames: [...frames],
        action
      });
    }

    const total = refString.length;
    return {
      algorithm: 'Optimal',
      frameCount,
      referenceString: refString,
      steps,
      totalReferences: total,
      pageHits: hits,
      pageFaults: faults,
      hitRatio: total > 0 ? Number(((hits / total) * 100).toFixed(1)) : 0,
      faultRatio: total > 0 ? Number(((faults / total) * 100).toFixed(1)) : 0
    };
  }

  // Compare All Replacement
  public static compareAllReplacement(refString: number[], frameCount: number): PageReplacementResult[] {
    return [
      this.simulateFIFO(refString, frameCount),
      this.simulateLRU(refString, frameCount),
      this.simulateOptimal(refString, frameCount)
    ];
  }

  // Compare All Allocation
  public static compareAllAllocation(
    initialBlockSizes: number[],
    requests: AllocationRequest[]
  ): AllocationResult[] {
    return [
      this.simulateAllocation('First Fit', initialBlockSizes, requests),
      this.simulateAllocation('Best Fit', initialBlockSizes, requests),
      this.simulateAllocation('Worst Fit', initialBlockSizes, requests)
    ];
  }
}
