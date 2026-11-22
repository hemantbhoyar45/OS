#include "../cpp/memory_manager.hpp"

#ifdef __EMSCRIPTEN__
#include <emscripten/bind.h>

using namespace emscripten;

EMSCRIPTEN_BINDINGS(MemoryManagerModule) {
    value_object<MemoryBlock>("MemoryBlock")
        .field("id", &MemoryBlock::id)
        .field("startAddress", &MemoryBlock::startAddress)
        .field("size", &MemoryBlock::size)
        .field("isAllocated", &MemoryBlock::isAllocated)
        .field("processId", &MemoryBlock::processId)
        .field("processName", &MemoryBlock::processName)
        .field("internalFragmentation", &MemoryBlock::internalFragmentation);

    value_object<AllocationRequest>("AllocationRequest")
        .field("processId", &AllocationRequest::processId)
        .field("processName", &AllocationRequest::processName)
        .field("size", &AllocationRequest::size);

    value_object<AllocationStep>("AllocationStep")
        .field("stepNumber", &AllocationStep::stepNumber)
        .field("processId", &AllocationStep::processId)
        .field("processName", &AllocationStep::processName)
        .field("requestedSize", &AllocationStep::requestedSize)
        .field("isAllocation", &AllocationStep::isAllocation)
        .field("success", &AllocationStep::success)
        .field("allocatedBlockId", &AllocationStep::allocatedBlockId)
        .field("allocatedAddress", &AllocationStep::allocatedAddress)
        .field("message", &AllocationStep::message)
        .field("blocksAfter", &AllocationStep::blocksAfter);

    register_vector<MemoryBlock>("VectorMemoryBlock");
    register_vector<AllocationRequest>("VectorAllocationRequest");
    register_vector<AllocationStep>("VectorAllocationStep");

    value_object<AllocationResult>("AllocationResult")
        .field("algorithm", &AllocationResult::algorithm)
        .field("initialBlocks", &AllocationResult::initialBlocks)
        .field("finalBlocks", &AllocationResult::finalBlocks)
        .field("steps", &AllocationResult::steps)
        .field("totalMemory", &AllocationResult::totalMemory)
        .field("allocatedMemory", &AllocationResult::allocatedMemory)
        .field("freeMemory", &AllocationResult::freeMemory)
        .field("externalFragmentation", &AllocationResult::externalFragmentation)
        .field("successfulAllocations", &AllocationResult::successfulAllocations)
        .field("failedAllocations", &AllocationResult::failedAllocations);

    register_vector<AllocationResult>("VectorAllocationResult");

    value_object<PageRefStep>("PageRefStep")
        .field("stepIndex", &PageRefStep::stepIndex)
        .field("pageNumber", &PageRefStep::pageNumber)
        .field("isHit", &PageRefStep::isHit)
        .field("victimPage", &PageRefStep::victimPage)
        .field("frames", &PageRefStep::frames)
        .field("action", &PageRefStep::action);

    register_vector<PageRefStep>("VectorPageRefStep");

    value_object<PageReplacementResult>("PageReplacementResult")
        .field("algorithm", &PageReplacementResult::algorithm)
        .field("frameCount", &PageReplacementResult::frameCount)
        .field("referenceString", &PageReplacementResult::referenceString)
        .field("steps", &PageReplacementResult::steps)
        .field("totalReferences", &PageReplacementResult::totalReferences)
        .field("pageHits", &PageReplacementResult::pageHits)
        .field("pageFaults", &PageReplacementResult::pageFaults)
        .field("hitRatio", &PageReplacementResult::hitRatio)
        .field("faultRatio", &PageReplacementResult::faultRatio);

    register_vector<PageReplacementResult>("VectorPageReplacementResult");

    class_<MemoryManager>("MemoryManager")
        .class_function("simulateAllocation", &MemoryManager::simulateAllocation)
        .class_function("simulateFIFO", &MemoryManager::simulateFIFO)
        .class_function("simulateLRU", &MemoryManager::simulateLRU)
        .class_function("simulateOptimal", &MemoryManager::simulateOptimal)
        .class_function("compareAllReplacement", &MemoryManager::compareAllReplacement)
        .class_function("compareAllAllocation", &MemoryManager::compareAllAllocation)
        .class_function("allocationResultToJson", &MemoryManager::allocationResultToJson)
        .class_function("replacementResultToJson", &MemoryManager::replacementResultToJson);
}
#endif
