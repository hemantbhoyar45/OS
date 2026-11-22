#include <iostream>
#include <cassert>
#include "memory_manager.hpp"

void testContiguousAllocation() {
    std::cout << "[TEST] Running Contiguous Memory Allocation Test (First Fit, Best Fit, Worst Fit)..." << std::endl;
    // Classic textbook partitions: 100, 500, 200, 300, 600 KB
    std::vector<int> blocks = {100, 500, 200, 300, 600};
    std::vector<AllocationRequest> requests = {
        {1, "P1", 212},
        {2, "P2", 417},
        {3, "P3", 112},
        {4, "P4", 426}
    };

    // 1. First Fit
    auto ff = MemoryManager::simulateAllocation("First Fit", blocks, requests);
    // P1 (212) -> block 2 (500)
    // P2 (417) -> block 5 (600)
    // P3 (112) -> remaining in block 2 (288)
    // P4 (426) -> cannot allocate!
    assert(ff.successfulAllocations == 3);
    assert(ff.failedAllocations == 1);
    std::cout << "  ✓ First Fit completed. Success: " << ff.successfulAllocations << ", Failed: " << ff.failedAllocations << std::endl;

    // 2. Best Fit
    auto bf = MemoryManager::simulateAllocation("Best Fit", blocks, requests);
    // P1 (212) -> block 4 (300)
    // P2 (417) -> block 2 (500)
    // P3 (112) -> block 3 (200)
    // P4 (426) -> block 5 (600) -> ALL 4 ALLOCATED!
    assert(bf.successfulAllocations == 4);
    assert(bf.failedAllocations == 0);
    std::cout << "  ✓ Best Fit completed with 100% allocation success (4/4)." << std::endl;

    // 3. Worst Fit
    auto wf = MemoryManager::simulateAllocation("Worst Fit", blocks, requests);
    // P1 (212) -> block 5 (600) -> leaves 388
    // P2 (417) -> block 2 (500) -> leaves 83
    // P3 (112) -> remaining in block 5 (388) -> leaves 276
    // P4 (426) -> cannot allocate!
    assert(wf.successfulAllocations == 3);
    assert(wf.failedAllocations == 1);
    std::cout << "  ✓ Worst Fit completed. Success: " << wf.successfulAllocations << ", Failed: " << wf.failedAllocations << std::endl;
}

void testDeallocationAndCoalescing() {
    std::cout << "[TEST] Running Deallocation & Coalescing Test..." << std::endl;
    std::vector<int> blocks = {100, 200, 300};
    std::vector<AllocationRequest> requests = {
        {1, "P1", 80},  // fits in 100
        {2, "P2", 150}, // fits in 200
        {1, "P1", -1},  // deallocate P1
        {2, "P2", -1}   // deallocate P2
    };

    auto res = MemoryManager::simulateAllocation("First Fit", blocks, requests);
    assert(res.steps[2].success); // deallocate P1
    assert(res.steps[3].success); // deallocate P2
    // Coalescing should merge adjacent free blocks into one large block
    assert(res.finalBlocks.size() == 1);
    assert(res.finalBlocks[0].size == 600); // 100 + 200 + 300
    std::cout << "  ✓ Coalescing successfully merged adjacent free memory into 600 KB block." << std::endl;
}

void testPageReplacement() {
    std::cout << "[TEST] Running Page Replacement Test (FIFO, LRU, Optimal)..." << std::endl;
    // Standard Galvin / Silberschatz reference string
    std::vector<int> ref = {7, 0, 1, 2, 0, 3, 0, 4, 2, 3, 0, 3, 2, 1, 2, 0, 1, 7, 0, 1};
    int frames = 3;

    // 1. FIFO
    auto fifo = MemoryManager::simulateFIFO(ref, frames);
    assert(fifo.totalReferences == 20);
    assert(fifo.pageFaults == 15);
    assert(fifo.pageHits == 5);
    assert(fifo.hitRatio == 25.0);
    assert(fifo.faultRatio == 75.0);
    std::cout << "  ✓ FIFO: 15 Page Faults, 5 Hits (25% hit ratio)." << std::endl;

    // 2. LRU
    auto lru = MemoryManager::simulateLRU(ref, frames);
    assert(lru.pageFaults == 12);
    assert(lru.pageHits == 8);
    assert(lru.hitRatio == 40.0);
    assert(lru.faultRatio == 60.0);
    std::cout << "  ✓ LRU: 12 Page Faults, 8 Hits (40% hit ratio)." << std::endl;

    // 3. Optimal (Bélády's Algorithm)
    auto opt = MemoryManager::simulateOptimal(ref, frames);
    assert(opt.pageFaults == 9);
    assert(opt.pageHits == 11);
    assert(opt.hitRatio == 55.0);
    assert(opt.faultRatio == 45.0);
    std::cout << "  ✓ Optimal: 9 Page Faults, 11 Hits (55% hit ratio - proven minimum)." << std::endl;
}

int main() {
    std::cout << "========================================" << std::endl;
    std::cout << "  MEMORY MANAGER C++ UNIT TEST SUITE    " << std::endl;
    std::cout << "========================================" << std::endl;

    testContiguousAllocation();
    testDeallocationAndCoalescing();
    testPageReplacement();

    std::cout << "========================================" << std::endl;
    std::cout << "  ALL MEMORY MANAGER TESTS PASSED! ✓    " << std::endl;
    std::cout << "========================================" << std::endl;
    return 0;
}
