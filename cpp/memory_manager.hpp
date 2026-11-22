#ifndef MEMORY_MANAGER_HPP
#define MEMORY_MANAGER_HPP

#include <string>
#include <vector>
#include <map>
#include <algorithm>
#include <sstream>
#include <iomanip>
#include <climits>

// ==========================================
// Contiguous Memory Allocation Structures
// ==========================================
struct MemoryBlock {
    int id;
    int startAddress;
    int size;
    bool isAllocated;
    int processId; // -1 if free
    std::string processName;
    int internalFragmentation; // If fixed partitions used
};

struct AllocationRequest {
    int processId;
    std::string processName;
    int size;
};

struct AllocationStep {
    int stepNumber;
    int processId;
    std::string processName;
    int requestedSize;
    bool isAllocation; // true = allocate, false = deallocate
    bool success;
    int allocatedBlockId;
    int allocatedAddress;
    std::string message;
    std::vector<MemoryBlock> blocksAfter;
};

struct AllocationResult {
    std::string algorithm; // "First Fit", "Best Fit", "Worst Fit"
    std::vector<MemoryBlock> initialBlocks;
    std::vector<MemoryBlock> finalBlocks;
    std::vector<AllocationStep> steps;
    int totalMemory;
    int allocatedMemory;
    int freeMemory;
    int externalFragmentation;
    int successfulAllocations;
    int failedAllocations;
};

// ==========================================
// Page Replacement Structures
// ==========================================
struct PageRefStep {
    int stepIndex;
    int pageNumber;
    bool isHit;
    int victimPage; // -1 if no replacement or hit
    std::vector<int> frames; // Current pages in frames (-1 for empty)
    std::string action;
};

struct PageReplacementResult {
    std::string algorithm; // "FIFO", "LRU", "Optimal"
    int frameCount;
    std::vector<int> referenceString;
    std::vector<PageRefStep> steps;
    int totalReferences;
    int pageHits;
    int pageFaults;
    double hitRatio;       // percentage
    double faultRatio;     // percentage
};

class MemoryManager {
public:
    // Contiguous Allocation
    static AllocationResult simulateAllocation(
        const std::string& algorithm,
        const std::vector<int>& initialBlockSizes,
        const std::vector<AllocationRequest>& requests
    );

    // Page Replacement
    static PageReplacementResult simulateFIFO(const std::vector<int>& refString, int frameCount);
    static PageReplacementResult simulateLRU(const std::vector<int>& refString, int frameCount);
    static PageReplacementResult simulateOptimal(const std::vector<int>& refString, int frameCount);

    static std::vector<PageReplacementResult> compareAllReplacement(
        const std::vector<int>& refString,
        int frameCount
    );

    static std::vector<AllocationResult> compareAllAllocation(
        const std::vector<int>& initialBlockSizes,
        const std::vector<AllocationRequest>& requests
    );

    // Serialization
    static std::string allocationResultToJson(const AllocationResult& res);
    static std::string replacementResultToJson(const PageReplacementResult& res);
};

#endif // MEMORY_MANAGER_HPP
