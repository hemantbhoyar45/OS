#include "memory_manager.hpp"
#include <queue>
#include <set>

// Coalesce adjacent free blocks in memory
static void coalesceBlocks(std::vector<MemoryBlock>& blocks) {
    if (blocks.size() <= 1) return;
    std::vector<MemoryBlock> merged;
    merged.push_back(blocks[0]);

    for (size_t i = 1; i < blocks.size(); ++i) {
        auto& prev = merged.back();
        auto& curr = blocks[i];
        if (!prev.isAllocated && !curr.isAllocated) {
            prev.size += curr.size;
        } else {
            merged.push_back(curr);
        }
    }
    blocks = merged;

    // Re-index IDs and addresses
    int currentAddr = 0;
    for (size_t i = 0; i < blocks.size(); ++i) {
        blocks[i].id = (int)i + 1;
        blocks[i].startAddress = currentAddr;
        currentAddr += blocks[i].size;
    }
}

AllocationResult MemoryManager::simulateAllocation(
    const std::string& algorithm,
    const std::vector<int>& initialBlockSizes,
    const std::vector<AllocationRequest>& requests
) {
    AllocationResult res;
    res.algorithm = algorithm;
    res.totalMemory = 0;
    res.successfulAllocations = 0;
    res.failedAllocations = 0;

    int addr = 0;
    int bId = 1;
    for (int sz : initialBlockSizes) {
        MemoryBlock b;
        b.id = bId++;
        b.startAddress = addr;
        b.size = sz;
        b.isAllocated = false;
        b.processId = -1;
        b.processName = "Free";
        b.internalFragmentation = 0;
        res.initialBlocks.push_back(b);
        addr += sz;
        res.totalMemory += sz;
    }

    std::vector<MemoryBlock> currentBlocks = res.initialBlocks;
    int stepNum = 1;

    for (const auto& req : requests) {
        AllocationStep step;
        step.stepNumber = stepNum++;
        step.processId = req.processId;
        step.processName = req.processName;
        step.requestedSize = req.size;
        step.isAllocation = (req.size > 0);
        step.success = false;
        step.allocatedBlockId = -1;
        step.allocatedAddress = -1;

        if (req.size > 0) {
            // Allocation request
            int chosenIdx = -1;

            if (algorithm == "First Fit") {
                for (size_t i = 0; i < currentBlocks.size(); ++i) {
                    if (!currentBlocks[i].isAllocated && currentBlocks[i].size >= req.size) {
                        chosenIdx = (int)i;
                        break;
                    }
                }
            } else if (algorithm == "Best Fit") {
                int minDiff = INT_MAX;
                for (size_t i = 0; i < currentBlocks.size(); ++i) {
                    if (!currentBlocks[i].isAllocated && currentBlocks[i].size >= req.size) {
                        int diff = currentBlocks[i].size - req.size;
                        if (diff < minDiff) {
                            minDiff = diff;
                            chosenIdx = (int)i;
                        }
                    }
                }
            } else if (algorithm == "Worst Fit") {
                int maxDiff = -1;
                for (size_t i = 0; i < currentBlocks.size(); ++i) {
                    if (!currentBlocks[i].isAllocated && currentBlocks[i].size >= req.size) {
                        int diff = currentBlocks[i].size - req.size;
                        if (diff > maxDiff) {
                            maxDiff = diff;
                            chosenIdx = (int)i;
                        }
                    }
                }
            }

            if (chosenIdx != -1) {
                step.success = true;
                step.allocatedBlockId = currentBlocks[chosenIdx].id;
                step.allocatedAddress = currentBlocks[chosenIdx].startAddress;
                res.successfulAllocations++;

                int originalSize = currentBlocks[chosenIdx].size;
                int remainingHole = originalSize - req.size;

                currentBlocks[chosenIdx].isAllocated = true;
                currentBlocks[chosenIdx].processId = req.processId;
                currentBlocks[chosenIdx].processName = req.processName;
                currentBlocks[chosenIdx].size = req.size;

                if (remainingHole > 0) {
                    MemoryBlock hole;
                    hole.id = (int)currentBlocks.size() + 1;
                    hole.startAddress = currentBlocks[chosenIdx].startAddress + req.size;
                    hole.size = remainingHole;
                    hole.isAllocated = false;
                    hole.processId = -1;
                    hole.processName = "Free";
                    hole.internalFragmentation = 0;
                    currentBlocks.insert(currentBlocks.begin() + chosenIdx + 1, hole);
                }

                step.message = "Allocated " + std::to_string(req.size) + " KB to " + req.processName +
                               " at address " + std::to_string(step.allocatedAddress) + " (Block " +
                               std::to_string(step.allocatedBlockId) + ").";
            } else {
                step.success = false;
                res.failedAllocations++;
                step.message = "Failed to allocate " + std::to_string(req.size) + " KB for " + req.processName +
                               " (No suitable free block found).";
            }
        } else {
            // Deallocation request
            bool found = false;
            for (size_t i = 0; i < currentBlocks.size(); ++i) {
                if (currentBlocks[i].isAllocated && currentBlocks[i].processId == req.processId) {
                    currentBlocks[i].isAllocated = false;
                    currentBlocks[i].processId = -1;
                    currentBlocks[i].processName = "Free";
                    found = true;
                    break;
                }
            }

            if (found) {
                coalesceBlocks(currentBlocks);
                step.success = true;
                step.message = "Deallocated " + req.processName + " and coalesced adjacent free blocks.";
            } else {
                step.success = false;
                step.message = "Process " + req.processName + " was not found in memory.";
            }
        }

        step.blocksAfter = currentBlocks;
        res.steps.push_back(step);
    }

    res.finalBlocks = currentBlocks;
    res.allocatedMemory = 0;
    res.freeMemory = 0;
    for (const auto& b : res.finalBlocks) {
        if (b.isAllocated) res.allocatedMemory += b.size;
        else res.freeMemory += b.size;
    }
    res.externalFragmentation = res.freeMemory; // Free memory that may be fragmented

    return res;
}

// ==========================================
// Page Replacement Algorithms
// ==========================================
PageReplacementResult MemoryManager::simulateFIFO(const std::vector<int>& refString, int frameCount) {
    PageReplacementResult res;
    res.algorithm = "FIFO (First-In, First-Out)";
    res.frameCount = frameCount;
    res.referenceString = refString;
    res.totalReferences = (int)refString.size();
    res.pageHits = 0;
    res.pageFaults = 0;

    std::vector<int> frames(frameCount, -1);
    std::queue<int> fifoQueue;

    for (size_t i = 0; i < refString.size(); ++i) {
        int page = refString[i];
        PageRefStep step;
        step.stepIndex = (int)i;
        step.pageNumber = page;
        step.victimPage = -1;

        // Check if page in frames
        bool hit = false;
        for (int f : frames) {
            if (f == page) {
                hit = true;
                break;
            }
        }

        if (hit) {
            res.pageHits++;
            step.isHit = true;
            step.action = "Page Hit: Page " + std::to_string(page) + " already in memory.";
        } else {
            res.pageFaults++;
            step.isHit = false;

            // Check if empty frame available
            int emptyIdx = -1;
            for (int fIdx = 0; fIdx < frameCount; ++fIdx) {
                if (frames[fIdx] == -1) {
                    emptyIdx = fIdx;
                    break;
                }
            }

            if (emptyIdx != -1) {
                frames[emptyIdx] = page;
                fifoQueue.push(page);
                step.action = "Page Fault: Loaded into empty frame " + std::to_string(emptyIdx) + ".";
            } else {
                int victim = fifoQueue.front();
                fifoQueue.pop();
                step.victimPage = victim;

                for (int fIdx = 0; fIdx < frameCount; ++fIdx) {
                    if (frames[fIdx] == victim) {
                        frames[fIdx] = page;
                        break;
                    }
                }
                fifoQueue.push(page);
                step.action = "Page Fault: Replaced victim Page " + std::to_string(victim) + " (FIFO order).";
            }
        }

        step.frames = frames;
        res.steps.push_back(step);
    }

    res.hitRatio = res.totalReferences > 0 ? ((double)res.pageHits / res.totalReferences) * 100.0 : 0.0;
    res.faultRatio = res.totalReferences > 0 ? ((double)res.pageFaults / res.totalReferences) * 100.0 : 0.0;
    return res;
}

PageReplacementResult MemoryManager::simulateLRU(const std::vector<int>& refString, int frameCount) {
    PageReplacementResult res;
    res.algorithm = "LRU (Least Recently Used)";
    res.frameCount = frameCount;
    res.referenceString = refString;
    res.totalReferences = (int)refString.size();
    res.pageHits = 0;
    res.pageFaults = 0;

    std::vector<int> frames(frameCount, -1);
    std::map<int, int> lastUsed; // page -> last step index

    for (size_t i = 0; i < refString.size(); ++i) {
        int page = refString[i];
        PageRefStep step;
        step.stepIndex = (int)i;
        step.pageNumber = page;
        step.victimPage = -1;

        bool hit = false;
        for (int f : frames) {
            if (f == page) {
                hit = true;
                break;
            }
        }

        if (hit) {
            res.pageHits++;
            step.isHit = true;
            lastUsed[page] = (int)i;
            step.action = "Page Hit: Page " + std::to_string(page) + " accessed. Updated LRU timestamp.";
        } else {
            res.pageFaults++;
            step.isHit = false;

            int emptyIdx = -1;
            for (int fIdx = 0; fIdx < frameCount; ++fIdx) {
                if (frames[fIdx] == -1) {
                    emptyIdx = fIdx;
                    break;
                }
            }

            if (emptyIdx != -1) {
                frames[emptyIdx] = page;
                lastUsed[page] = (int)i;
                step.action = "Page Fault: Loaded into empty frame " + std::to_string(emptyIdx) + ".";
            } else {
                // Find least recently used page
                int lruPage = -1;
                int oldestTime = INT_MAX;

                for (int f : frames) {
                    int t = lastUsed.count(f) ? lastUsed[f] : -1;
                    if (t < oldestTime) {
                        oldestTime = t;
                        lruPage = f;
                    }
                }

                step.victimPage = lruPage;
                for (int fIdx = 0; fIdx < frameCount; ++fIdx) {
                    if (frames[fIdx] == lruPage) {
                        frames[fIdx] = page;
                        break;
                    }
                }
                lastUsed[page] = (int)i;
                step.action = "Page Fault: Replaced Page " + std::to_string(lruPage) + " (Least Recently Used).";
            }
        }

        step.frames = frames;
        res.steps.push_back(step);
    }

    res.hitRatio = res.totalReferences > 0 ? ((double)res.pageHits / res.totalReferences) * 100.0 : 0.0;
    res.faultRatio = res.totalReferences > 0 ? ((double)res.pageFaults / res.totalReferences) * 100.0 : 0.0;
    return res;
}

PageReplacementResult MemoryManager::simulateOptimal(const std::vector<int>& refString, int frameCount) {
    PageReplacementResult res;
    res.algorithm = "Optimal (Bélády's Algorithm)";
    res.frameCount = frameCount;
    res.referenceString = refString;
    res.totalReferences = (int)refString.size();
    res.pageHits = 0;
    res.pageFaults = 0;

    std::vector<int> frames(frameCount, -1);

    for (size_t i = 0; i < refString.size(); ++i) {
        int page = refString[i];
        PageRefStep step;
        step.stepIndex = (int)i;
        step.pageNumber = page;
        step.victimPage = -1;

        bool hit = false;
        for (int f : frames) {
            if (f == page) {
                hit = true;
                break;
            }
        }

        if (hit) {
            res.pageHits++;
            step.isHit = true;
            step.action = "Page Hit: Page " + std::to_string(page) + " already in memory.";
        } else {
            res.pageFaults++;
            step.isHit = false;

            int emptyIdx = -1;
            for (int fIdx = 0; fIdx < frameCount; ++fIdx) {
                if (frames[fIdx] == -1) {
                    emptyIdx = fIdx;
                    break;
                }
            }

            if (emptyIdx != -1) {
                frames[emptyIdx] = page;
                step.action = "Page Fault: Loaded into empty frame " + std::to_string(emptyIdx) + ".";
            } else {
                // Find page not used for the longest time in the future
                int victimPage = -1;
                int furthestDist = -1;

                for (int f : frames) {
                    int nextUse = INT_MAX;
                    for (size_t j = i + 1; j < refString.size(); ++j) {
                        if (refString[j] == f) {
                            nextUse = (int)j;
                            break;
                        }
                    }

                    if (nextUse > furthestDist) {
                        furthestDist = nextUse;
                        victimPage = f;
                    }
                }

                step.victimPage = victimPage;
                for (int fIdx = 0; fIdx < frameCount; ++fIdx) {
                    if (frames[fIdx] == victimPage) {
                        frames[fIdx] = page;
                        break;
                    }
                }
                step.action = "Page Fault: Replaced Page " + std::to_string(victimPage) +
                              (furthestDist == INT_MAX ? " (Not referenced again)." : " (Furthest in future reference).");
            }
        }

        step.frames = frames;
        res.steps.push_back(step);
    }

    res.hitRatio = res.totalReferences > 0 ? ((double)res.pageHits / res.totalReferences) * 100.0 : 0.0;
    res.faultRatio = res.totalReferences > 0 ? ((double)res.pageFaults / res.totalReferences) * 100.0 : 0.0;
    return res;
}

std::vector<PageReplacementResult> MemoryManager::compareAllReplacement(
    const std::vector<int>& refString,
    int frameCount
) {
    std::vector<PageReplacementResult> results;
    results.push_back(simulateFIFO(refString, frameCount));
    results.push_back(simulateLRU(refString, frameCount));
    results.push_back(simulateOptimal(refString, frameCount));
    return results;
}

std::vector<AllocationResult> MemoryManager::compareAllAllocation(
    const std::vector<int>& initialBlockSizes,
    const std::vector<AllocationRequest>& requests
) {
    std::vector<AllocationResult> results;
    results.push_back(simulateAllocation("First Fit", initialBlockSizes, requests));
    results.push_back(simulateAllocation("Best Fit", initialBlockSizes, requests));
    results.push_back(simulateAllocation("Worst Fit", initialBlockSizes, requests));
    return results;
}

std::string MemoryManager::replacementResultToJson(const PageReplacementResult& res) {
    std::ostringstream ss;
    ss << std::fixed << std::setprecision(2);
    ss << "{";
    ss << "\"algorithm\":\"" << res.algorithm << "\",";
    ss << "\"frameCount\":" << res.frameCount << ",";
    ss << "\"totalReferences\":" << res.totalReferences << ",";
    ss << "\"pageHits\":" << res.pageHits << ",";
    ss << "\"pageFaults\":" << res.pageFaults << ",";
    ss << "\"hitRatio\":" << res.hitRatio << ",";
    ss << "\"faultRatio\":" << res.faultRatio << ",";

    ss << "\"referenceString\":[";
    for (size_t i = 0; i < res.referenceString.size(); ++i) {
        if (i > 0) ss << ",";
        ss << res.referenceString[i];
    }
    ss << "],";

    ss << "\"steps\":[";
    for (size_t i = 0; i < res.steps.size(); ++i) {
        const auto& st = res.steps[i];
        if (i > 0) ss << ",";
        ss << "{"
           << "\"stepIndex\":" << st.stepIndex << ","
           << "\"pageNumber\":" << st.pageNumber << ","
           << "\"isHit\":" << (st.isHit ? "true" : "false") << ","
           << "\"victimPage\":" << st.victimPage << ","
           << "\"action\":\"" << st.action << "\","
           << "\"frames\":[";
        for (size_t j = 0; j < st.frames.size(); ++j) {
            if (j > 0) ss << ",";
            ss << st.frames[j];
        }
        ss << "]}";
    }
    ss << "]}";

    return ss.str();
}

std::string MemoryManager::allocationResultToJson(const AllocationResult& res) {
    std::ostringstream ss;
    ss << "{";
    ss << "\"algorithm\":\"" << res.algorithm << "\",";
    ss << "\"totalMemory\":" << res.totalMemory << ",";
    ss << "\"allocatedMemory\":" << res.allocatedMemory << ",";
    ss << "\"freeMemory\":" << res.freeMemory << ",";
    ss << "\"externalFragmentation\":" << res.externalFragmentation << ",";
    ss << "\"successfulAllocations\":" << res.successfulAllocations << ",";
    ss << "\"failedAllocations\":" << res.failedAllocations << "}";
    return ss.str();
}
